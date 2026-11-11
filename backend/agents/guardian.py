"""Guardian Agent — analyzes trust signals and challenges the Shopper Agent's claims."""
from __future__ import annotations

from dataclasses import dataclass, field

from backend.trust.scorer import compute_trust_score, TrustReport
from backend.safety.assumption_verifier import verify_assumptions, AssumptionReport
from backend.safety.bypass_monitor import BypassMonitor


@dataclass
class GuardianVerdict:
    trust_report: TrustReport
    assumption_report: AssumptionReport
    verdict: str  # APPROVED, BLOCKED, AWAITING_USER
    reasoning: str
    messages: list[dict] = field(default_factory=list)

    def add_message(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})

    def to_dict(self) -> dict:
        return {
            "verdict": self.verdict,
            "reasoning": self.reasoning,
            "trust_score": self.trust_report.trust_score,
            "trust_breakdown": self.trust_report.breakdown,
            "assumption_recommendation": self.assumption_report.recommendation,
            "assumption_claims": [
                {"claim": c.claim, "verdict": c.verdict, "risk_level": c.risk_level}
                for c in self.assumption_report.claims
            ],
        }


class GuardianAgent:
    """Analyzes merchant trust and challenges the Shopper Agent's assumptions."""

    def __init__(
        self,
        channel3_api_key: str,
        anthropic_api_key: str,
        bypass_monitor: BypassMonitor,
    ):
        self.channel3_api_key = channel3_api_key
        self.anthropic_api_key = anthropic_api_key
        self.bypass_monitor = bypass_monitor

    def analyze(
        self,
        merchant_domain: str,
        product_query: str,
        offered_price: float,
        reviews_text: str,
        shopper_claims: list[str],
        on_step: callable = None,
    ) -> GuardianVerdict:
        """Run full Guardian analysis: trust scoring + assumption verification."""
        messages: list[dict] = []

        def add_msg(content: str):
            messages.append({"role": "guardian", "content": content})

        add_msg(f"Investigating merchant: {merchant_domain}")

        # Phase 1: Trust scoring (5 signals)
        add_msg("Running trust analysis...")
        trust_report = compute_trust_score(
            merchant_domain=merchant_domain,
            product_query=product_query,
            offered_price=offered_price,
            reviews_text=reviews_text,
            channel3_api_key=self.channel3_api_key,
            anthropic_api_key=self.anthropic_api_key,
            on_step=on_step,
        )
        add_msg(
            f"Trust Score: {trust_report.trust_score}/100 "
            f"(domain_age={trust_report.breakdown['domain_age']}, "
            f"ssl={trust_report.breakdown['ssl']}, "
            f"price={trust_report.breakdown['price']}, "
            f"reviews={trust_report.breakdown['reviews']}, "
            f"registry={trust_report.breakdown['registry']})"
        )

        # Phase 2: Challenge the Shopper's claims
        add_msg("Challenging Shopper Agent's assumptions...")
        evidence = {
            "domain_age_days": trust_report.domain_report.domain_age_days,
            "ssl_valid": trust_report.domain_report.ssl_valid,
            "ssl_issuer": trust_report.domain_report.ssl_issuer,
            "ssl_self_signed": trust_report.domain_report.ssl_self_signed,
            "market_avg_price": trust_report.price_report.market_avg,
            "price_deviation_pct": trust_report.price_report.price_deviation_pct,
            "review_authenticity": trust_report.review_report.authenticity_score,
            "review_red_flags": trust_report.review_report.red_flags,
            "registry_score": trust_report.registry_score,
            "overall_trust_score": trust_report.trust_score,
        }

        assumption_report = verify_assumptions(
            api_key=self.anthropic_api_key,
            agent_claims=shopper_claims,
            evidence=evidence,
        )

        for claim_v in assumption_report.claims:
            icon = {"verified": "✓", "unverified": "?", "false": "✗"}.get(claim_v.verdict, "?")
            add_msg(f"  [{icon}] {claim_v.claim} → {claim_v.verdict} ({claim_v.risk_level})")

        # Phase 3: Determine verdict
        verdict = self._determine_verdict(trust_report, assumption_report)
        reasoning = self._build_reasoning(trust_report, assumption_report, verdict)
        add_msg(f"Verdict: {verdict} — {reasoning}")

        # Update bypass monitor
        self.bypass_monitor.set_guardian_verdict(verdict)

        result = GuardianVerdict(
            trust_report=trust_report,
            assumption_report=assumption_report,
            verdict=verdict,
            reasoning=reasoning,
            messages=messages,
        )
        return result

    def _determine_verdict(self, trust: TrustReport, assumptions: AssumptionReport) -> str:
        """Combine trust score verdict with assumption verification."""
        if trust.verdict == "BLOCKED" or assumptions.recommendation == "block":
            return "BLOCKED"
        if trust.verdict == "APPROVED" and assumptions.recommendation == "approve":
            return "APPROVED"
        return "AWAITING_USER"

    def _build_reasoning(
        self, trust: TrustReport, assumptions: AssumptionReport, verdict: str
    ) -> str:
        if verdict == "BLOCKED":
            issues = []
            if trust.trust_score < 30:
                issues.append(f"trust score critically low ({trust.trust_score}/100)")
            if assumptions.recommendation == "block":
                issues.append(f"assumption check: {assumptions.reasoning}")
            return "Transaction blocked: " + "; ".join(issues) if issues else "Blocked by Guardian"

        if verdict == "APPROVED":
            return (
                f"Merchant verified — trust score {trust.trust_score}/100, "
                f"all claims verified. Safe to proceed."
            )

        # AWAITING_USER
        concerns = []
        if trust.trust_score <= 60:
            concerns.append(f"moderate trust score ({trust.trust_score}/100)")
        for c in assumptions.claims:
            if c.verdict in ("unverified", "false"):
                concerns.append(f"unverified claim: {c.claim}")
        return "Needs user review: " + "; ".join(concerns) if concerns else "Needs user confirmation"
