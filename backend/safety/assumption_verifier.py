"""Assumption Verifier — LLM-as-judge that challenges the Shopper Agent's claims."""
from __future__ import annotations

import json
from dataclasses import dataclass
import anthropic


@dataclass
class ClaimVerification:
    claim: str
    verdict: str  # "verified", "unverified", "false"
    evidence: str
    risk_level: str  # "low", "medium", "high", "critical"


@dataclass
class AssumptionReport:
    claims: list[ClaimVerification]
    overall_risk: str
    recommendation: str  # "approve", "flag", "block"
    reasoning: str
    error: str | None = None

    def to_dict(self) -> dict:
        return {
            "claims": [
                {"claim": c.claim, "verdict": c.verdict, "evidence": c.evidence, "risk_level": c.risk_level}
                for c in self.claims
            ],
            "overall_risk": self.overall_risk,
            "recommendation": self.recommendation,
            "reasoning": self.reasoning,
        }


def verify_assumptions(
    api_key: str,
    agent_claims: list[str],
    evidence: dict,
    model: str = "claude-haiku-5-5",
) -> AssumptionReport:
    """Challenge the Shopper Agent's claims against collected evidence.

    Args:
        agent_claims: List of claims the shopper agent made (e.g., "This is a legitimate retailer")
        evidence: Dict of evidence from trust scoring (domain age, SSL, price data, reviews, etc.)
    """
    claims_text = "\n".join(f'{i+1}. "{c}"' for i, c in enumerate(agent_claims))
    evidence_text = "\n".join(f"- {k}: {v}" for k, v in evidence.items())

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=model,
            max_tokens=800,
            thinking={"type": "disabled"},
            messages=[{
                "role": "user",
                "content": f"""You are a Guardian Agent verifying a Shopping Agent's claims about a purchase. Be skeptical. Verify each claim against the evidence. Return ONLY valid JSON, no markdown fences.

Shopping Agent's claims:
{claims_text}

Evidence collected:
{evidence_text}

Return this JSON:
{{"claims": [{{"claim": "", "verdict": "verified|unverified|false", "evidence": "<specific evidence>", "risk_level": "low|medium|high|critical"}}], "overall_risk": "low|medium|high|critical", "recommendation": "approve|flag|block", "reasoning": "<one sentence>"}}""",
            }],
        )

        text = ""
        for block in response.content:
            if hasattr(block, "text"):
                text = block.text
                break

        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            text = text.rsplit("```", 1)[0]

        data = json.loads(text)
        claims = [
            ClaimVerification(
                claim=c["claim"],
                verdict=c["verdict"],
                evidence=c["evidence"],
                risk_level=c["risk_level"],
            )
            for c in data.get("claims", [])
        ]

        return AssumptionReport(
            claims=claims,
            overall_risk=data.get("overall_risk", "unknown"),
            recommendation=data.get("recommendation", "flag"),
            reasoning=data.get("reasoning", ""),
        )
    except Exception as e:
        return AssumptionReport(
            claims=[],
            overall_risk="high",
            recommendation="block",
            reasoning="Assumption verification failed — blocking as precaution.",
            error=str(e),
        )
