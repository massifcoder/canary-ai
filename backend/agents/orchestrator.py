"""Orchestrator — manages the Shopper ↔ Guardian debate loop."""
from __future__ import annotations

import json
from dataclasses import dataclass, field

from backend.agents.shopper import ShopperAgent, ShopperResult
from backend.agents.guardian import GuardianAgent, GuardianVerdict
from backend.safety.bypass_monitor import BypassMonitor
from backend.db.models import Transaction, save_transaction, save_bypass_attempt, upsert_merchant, update_transaction_verdict


@dataclass
class ConversationEvent:
    role: str  # "user", "shopper", "guardian", "system", "bypass_alert"
    content: str
    data: dict | None = None


@dataclass
class SessionResult:
    query: str
    events: list[ConversationEvent] = field(default_factory=list)
    shopper_result: ShopperResult | None = None
    guardian_verdict: GuardianVerdict | None = None
    final_verdict: str = "PENDING"
    order_id: str | None = None
    bypass_attempted: bool = False
    rejected_domains: list[str] = field(default_factory=list)
    tx_id: int | None = None

    def add_event(self, role: str, content: str, data: dict | None = None):
        self.events.append(ConversationEvent(role=role, content=content, data=data))


class Orchestrator:
    """Runs the full Canary flow: Shopper searches → Guardian challenges → verdict."""

    def __init__(
        self,
        shopper: ShopperAgent,
        guardian: GuardianAgent,
        bypass_monitor: BypassMonitor,
        canary_enabled: bool = True,
    ):
        self.shopper = shopper
        self.guardian = guardian
        self.bypass_monitor = bypass_monitor
        self.canary_enabled = canary_enabled

    def run(
        self,
        query: str,
        sites: list[dict] | None = None,
        on_event: callable = None,
    ) -> SessionResult:
        """Execute the full purchase flow.

        If canary_enabled=False (--canary=off), skips Guardian entirely —
        used in ACT 1 of the demo to show what happens without protection.
        """
        session = SessionResult(query=query)

        def emit(role: str, content: str, data: dict | None = None):
            session.add_event(role, content, data)
            if on_event:
                on_event(role, content, data)

        emit("user", query)

        # --- Phase 1: Shopper searches and picks a product ---
        emit("system", "Shopper Agent is searching...")
        shopper_result = self.shopper.run(query, sites)
        session.shopper_result = shopper_result

        for msg in shopper_result.messages:
            if msg["role"] == "shopper":
                emit("shopper", msg["content"])

        if not shopper_result.selected:
            emit("system", "No products found. Transaction cancelled.")
            session.final_verdict = "CANCELLED"
            return session

        selected = shopper_result.selected

        # --- Canary OFF: skip Guardian, go straight to order ---
        if not self.canary_enabled:
            emit("system", "⚠ Canary protection is OFF — no trust verification!")
            self.bypass_monitor.state = self.bypass_monitor.state.__class__("approved")
            order_id = self._create_order(selected, emit)
            session.order_id = order_id
            session.final_verdict = "APPROVED"
            self._save_to_db(session, selected, canary_enabled=False)
            return session

        # --- Phase 2: Guardian analyzes and challenges ---
        self.bypass_monitor.reset()
        self.bypass_monitor.state = self.bypass_monitor.state.__class__("awaiting_guardian")
        emit("system", "Guardian Agent is analyzing the merchant...")

        guardian_verdict = self.guardian.analyze(
            merchant_domain=selected.merchant_domain,
            product_query=query,
            offered_price=selected.price,
            reviews_text=selected.reviews_text,
            shopper_claims=shopper_result.claims,
            product_name=selected.name,
            product_description=selected.description,
            on_step=lambda step, data: emit("guardian", f"[{step}]", data),
        )
        session.guardian_verdict = guardian_verdict

        for msg in guardian_verdict.messages:
            emit("guardian", msg["content"])

        # --- Phase 3: Enforce verdict ---
        verdict = guardian_verdict.verdict
        session.final_verdict = verdict

        if verdict == "APPROVED":
            emit("guardian", "Transaction APPROVED. Creating PayPal order...")
            order_id = self._create_order(selected, emit)
            session.order_id = order_id

        elif verdict == "BLOCKED":
            emit("guardian", f"Transaction BLOCKED. {guardian_verdict.reasoning}")
            # Simulate the Shopper trying to bypass
            self._simulate_bypass_attempt(session, selected, emit)

        elif verdict == "AWAITING_USER":
            emit("guardian", f"Needs your review: {guardian_verdict.reasoning}")
            emit("system", "Waiting for user decision...")
            # The frontend will send user consent via a separate endpoint;
            # for now, the session pauses here. The API layer handles continuation.

        self._save_to_db(session, selected)
        return session

    def handle_user_consent(self, session: SessionResult, consented: bool, on_event: callable = None) -> SessionResult:
        """Called when the user makes a decision on a gray-zone transaction.

        If user denies, tries the next best listing that hasn't been rejected.
        Returns session with updated verdict — AWAITING_USER again if fallback
        is also in the gray zone, or a final verdict otherwise.
        """
        def emit(role: str, content: str, data: dict | None = None):
            session.add_event(role, content, data)
            if on_event:
                on_event(role, content, data)

        self.bypass_monitor.set_user_consent(consented)

        if consented:
            emit("user", "I want to proceed with this purchase.")
            emit("system", "User approved. Creating PayPal order...")
            selected = session.shopper_result.selected
            order_id = self._create_order(selected, emit)
            session.order_id = order_id
            session.final_verdict = "USER_APPROVED"
            if session.tx_id:
                update_transaction_verdict(session.tx_id, "USER_APPROVED", order_id)
            return session

        # User declined — update the original row, then try next option
        rejected = session.shopper_result.selected
        session.rejected_domains.append(rejected.merchant_domain)
        if session.tx_id:
            update_transaction_verdict(session.tx_id, "USER_CANCELLED")
        emit("user", f"Declined {rejected.merchant_domain}. Find an alternative.")

        # Find next viable listing
        candidates = [
            l for l in session.shopper_result.listings
            if l.merchant_domain not in session.rejected_domains
            and l.price > 0
        ]
        if not candidates:
            emit("system", "No more alternatives available. Transaction cancelled.")
            session.final_verdict = "USER_CANCELLED"
            return session

        # Pick next cheapest
        next_pick = min(candidates, key=lambda x: x.price)
        session.shopper_result.selected = next_pick
        emit("shopper", f"Trying alternative: {next_pick.name} at ${next_pick.price:.2f} from {next_pick.merchant_domain}")

        # Browse the new site for product details
        if next_pick.merchant_url and "super-cheap" not in next_pick.merchant_url:
            emit("shopper", f"Browsing {next_pick.merchant_domain}...")
            site_data = self.shopper.browse_site(next_pick.merchant_url)
            if "error" not in site_data:
                body = site_data.get("bodySnippet", "")
                if body and len(body) > 50:
                    next_pick.description = body[:2000]
                    next_pick.reviews_text = body[:1000]

        # Generate new claims
        claims = self.shopper.generate_claims(next_pick)
        session.shopper_result.claims = claims

        # Run Guardian on the new pick
        self.bypass_monitor.reset()
        self.bypass_monitor.state = self.bypass_monitor.state.__class__("awaiting_guardian")
        emit("system", f"Guardian Agent is analyzing {next_pick.merchant_domain}...")

        guardian_verdict = self.guardian.analyze(
            merchant_domain=next_pick.merchant_domain,
            product_query=session.query,
            offered_price=next_pick.price,
            reviews_text=next_pick.reviews_text,
            shopper_claims=claims,
            product_name=next_pick.name,
            product_description=next_pick.description,
            on_step=lambda step, data: emit("guardian", f"[{step}]", data),
        )
        session.guardian_verdict = guardian_verdict

        for msg in guardian_verdict.messages:
            emit("guardian", msg["content"])

        verdict = guardian_verdict.verdict
        session.final_verdict = verdict

        if verdict == "APPROVED":
            emit("guardian", "Transaction APPROVED. Creating PayPal order...")
            order_id = self._create_order(next_pick, emit)
            session.order_id = order_id
        elif verdict == "BLOCKED":
            emit("guardian", f"Transaction BLOCKED. {guardian_verdict.reasoning}")
            self._simulate_bypass_attempt(session, next_pick, emit)
        elif verdict == "AWAITING_USER":
            emit("guardian", f"Needs your review: {guardian_verdict.reasoning}")
            emit("system", "Waiting for user decision...")

        self._save_to_db(session, next_pick)
        return session

    def _create_order(self, selected, emit) -> str | None:
        """Create a PayPal order, gated by the bypass monitor."""
        allowed, reason = self.bypass_monitor.check_action("create_order")
        if not allowed:
            emit("bypass_alert", f"BYPASS BLOCKED: {reason}")
            return None

        try:
            order_id = self.shopper.create_paypal_order(selected)
            emit("system", f"PayPal order created: {order_id}")
            return order_id
        except Exception as e:
            emit("system", f"PayPal order failed: {e}")
            return None

    def _simulate_bypass_attempt(self, session: SessionResult, selected, emit):
        """For the demo: simulate the Shopper trying to create an order after being blocked."""
        emit("shopper", "The price is really good though... let me just place the order anyway.")
        allowed, reason = self.bypass_monitor.check_action("create_order")
        if not allowed:
            session.bypass_attempted = True
            emit("bypass_alert", f"🚨 BYPASS ATTEMPT CAUGHT: {reason}")

    def _save_to_db(self, session: SessionResult, selected, canary_enabled: bool = True):
        """Persist transaction to SQLite."""
        trust_score = None
        breakdown = None
        assumption_results = None
        verdict_reason = None

        if session.guardian_verdict:
            trust_score = session.guardian_verdict.trust_report.trust_score
            breakdown = session.guardian_verdict.trust_report.breakdown
            assumption_results = session.guardian_verdict.assumption_report.to_dict()
            if session.guardian_verdict.expectation_report:
                assumption_results["expectation"] = session.guardian_verdict.expectation_report.to_dict()
            verdict_reason = session.guardian_verdict.reasoning

        tx = Transaction(
            user_query=session.query,
            verdict=session.final_verdict,
            product_name=selected.name,
            product_price=selected.price,
            merchant_domain=selected.merchant_domain,
            merchant_url=selected.merchant_url,
            trust_score=trust_score,
            trust_breakdown=breakdown,
            assumption_results=assumption_results,
            verdict_reason=verdict_reason,
            paypal_order_id=session.order_id,
            canary_enabled=canary_enabled,
            bypass_attempted=session.bypass_attempted,
        )
        tx_id = save_transaction(tx)
        session.tx_id = tx_id

        if session.bypass_attempted:
            for attempt in self.bypass_monitor.bypass_attempts:
                save_bypass_attempt(tx_id, attempt.action, attempt.reason)

        if session.guardian_verdict:
            dr = session.guardian_verdict.trust_report.domain_report
            upsert_merchant(
                domain=selected.merchant_domain,
                domain_age_days=dr.domain_age_days,
                ssl_valid=dr.ssl_valid,
                ssl_issuer=dr.ssl_issuer,
                trust_score=trust_score,
            )
