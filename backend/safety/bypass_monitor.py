"""Bypass Monitor — catches the Shopper Agent attempting unauthorized PayPal calls."""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class AgentState(Enum):
    IDLE = "idle"
    AWAITING_GUARDIAN = "awaiting_guardian"
    AWAITING_USER = "awaiting_user"
    APPROVED = "approved"
    BLOCKED = "blocked"


@dataclass
class BypassAttempt:
    action: str
    reason: str
    agent_state: str


class BypassMonitor:
    """Monitors Shopper Agent actions and blocks unauthorized PayPal API calls.

    The monitor tracks the current state of the transaction flow:
    - After Guardian says "ask the user" → state = AWAITING_USER
    - Only after user explicitly says "yes" → state = APPROVED
    - Any create_order call when state != APPROVED → BYPASS DETECTED
    """

    def __init__(self):
        self.state = AgentState.IDLE
        self.user_consent: bool = False
        self.bypass_attempts: list[BypassAttempt] = []
        self.guardian_verdict: str | None = None

    def set_guardian_verdict(self, verdict: str):
        """Called when Guardian Agent makes its decision."""
        self.guardian_verdict = verdict
        if verdict == "APPROVED":
            self.state = AgentState.APPROVED
        elif verdict == "BLOCKED":
            self.state = AgentState.BLOCKED
        elif verdict == "AWAITING_USER":
            self.state = AgentState.AWAITING_USER
            self.user_consent = False

    def set_user_consent(self, consented: bool):
        """Called when user explicitly approves or denies."""
        self.user_consent = consented
        if consented and self.state == AgentState.AWAITING_USER:
            self.state = AgentState.APPROVED

    def check_action(self, action: str) -> tuple[bool, str | None]:
        """Check if an agent action is allowed. Returns (allowed, reason_if_blocked).

        Called before every PayPal API call the Shopper Agent tries to make.
        """
        paypal_actions = {"create_order", "capture_order"}

        if action not in paypal_actions:
            return True, None

        if self.state == AgentState.APPROVED:
            return True, None

        if self.state == AgentState.BLOCKED:
            reason = "Transaction was blocked by Guardian Agent. Trust score too low."
            self.bypass_attempts.append(BypassAttempt(action, reason, self.state.value))
            return False, reason

        if self.state == AgentState.AWAITING_USER:
            if not self.user_consent:
                reason = "No user consent obtained. Agent must ask user before proceeding."
                self.bypass_attempts.append(BypassAttempt(action, reason, self.state.value))
                return False, reason
            return True, None

        if self.state == AgentState.AWAITING_GUARDIAN:
            reason = "Guardian Agent has not completed trust analysis yet."
            self.bypass_attempts.append(BypassAttempt(action, reason, self.state.value))
            return False, reason

        if self.state == AgentState.IDLE:
            reason = "No trust analysis has been performed. Cannot proceed without Guardian review."
            self.bypass_attempts.append(BypassAttempt(action, reason, self.state.value))
            return False, reason

        return False, "Unknown state"

    def reset(self):
        """Reset for a new transaction."""
        self.state = AgentState.IDLE
        self.user_consent = False
        self.guardian_verdict = None

    def get_bypass_count(self) -> int:
        return len(self.bypass_attempts)

    def get_bypass_log(self) -> list[dict]:
        return [
            {"action": b.action, "reason": b.reason, "agent_state": b.agent_state}
            for b in self.bypass_attempts
        ]
