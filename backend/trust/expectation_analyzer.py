"""Product Expectation vs Reality analysis via Claude LLM.

Compares what the user likely expects when they search for a product
vs what the merchant is actually selling based on the product description.
Catches bait-and-switch: "RC drone" that's actually a 5cm toy, "gaming laptop"
that's a refurbished Chromebook, etc.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
import anthropic


@dataclass
class ExpectationReport:
    match_score: int  # 0-100: how well the product matches user expectations
    user_expects: str  # what a reasonable buyer would expect
    product_reality: str  # what the product actually is based on description
    mismatches: list[str]  # specific expectation vs reality gaps
    reasoning: str
    error: str | None = None

    def to_dict(self) -> dict:
        return {
            "match_score": self.match_score,
            "user_expects": self.user_expects,
            "product_reality": self.product_reality,
            "mismatches": self.mismatches,
            "reasoning": self.reasoning,
        }


def analyze_expectation(
    api_key: str,
    user_query: str,
    product_name: str,
    product_description: str,
    product_price: float,
    model: str = "claude-haiku-5-5",
) -> ExpectationReport:
    """Use LLM to compare user expectations vs actual product."""
    if not product_description or len(product_description.strip()) < 10:
        return ExpectationReport(
            match_score=50,
            user_expects="Unknown — no description to analyze",
            product_reality="Unknown — no description available",
            mismatches=["No product description available to verify"],
            reasoning="Cannot verify product expectations without a description.",
        )

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=model,
            max_tokens=800,
            thinking={"type": "disabled"},
            messages=[{
                "role": "user",
                "content": f"""A user asked an AI shopping agent: "{user_query}"

The agent found this product at ${product_price:.2f}:
Name: {product_name}
Description: {product_description[:2000]}

Analyze whether this product matches what a reasonable buyer would expect.
Look for: misleading dimensions (toy vs real product), missing key features,
knockoff indicators, bait-and-switch signals, vague specs hiding low quality,
"mini" or "toy" versions sold as the real thing.

Return ONLY valid JSON, no markdown fences:
{{"match_score": <0-100, how well it matches expectations>, "user_expects": "<what a buyer searching this would reasonably expect, 1 sentence>", "product_reality": "<what this product actually is based on the description, 1 sentence>", "mismatches": [<list of specific expectation vs reality gaps, empty if good match>], "reasoning": "<1-2 sentences explaining the score>"}}""",
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
        return ExpectationReport(
            match_score=data.get("match_score", 50),
            user_expects=data.get("user_expects", ""),
            product_reality=data.get("product_reality", ""),
            mismatches=data.get("mismatches", []),
            reasoning=data.get("reasoning", ""),
        )
    except Exception as e:
        return ExpectationReport(
            match_score=50,
            user_expects="Analysis failed",
            product_reality="Analysis failed",
            mismatches=[],
            reasoning=f"Expectation analysis encountered an error: {e}",
            error=str(e),
        )
