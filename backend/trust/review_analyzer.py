"""Review authenticity analysis via Claude LLM."""
from __future__ import annotations

import json
from dataclasses import dataclass
import anthropic


@dataclass
class ReviewReport:
    authenticity_score: int
    red_flags: list[str]
    review_date_clustering: bool
    language_diversity: str
    sentiment_distribution: str
    reasoning: str
    error: str | None = None


def analyze_reviews(api_key: str, merchant_name: str, reviews_text: str, model: str = "claude-haiku-5-5") -> ReviewReport:
    """Use LLM to analyze review authenticity. Returns structured report."""
    if not reviews_text or reviews_text.strip() == "":
        return ReviewReport(
            authenticity_score=0,
            red_flags=["No reviews found"],
            review_date_clustering=False,
            language_diversity="none",
            sentiment_distribution="none",
            reasoning="No reviews available for analysis.",
        )

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=model,
            max_tokens=600,
            thinking={"type": "disabled"},
            messages=[{
                "role": "user",
                "content": f"""Analyze these merchant reviews for authenticity. Return ONLY valid JSON, no markdown fences, no other text.

Reviews for "{merchant_name}":
{reviews_text}

Return this exact JSON structure:
{{"authenticity_score": <0-100>, "red_flags": [<list of specific issues>], "review_date_clustering": <true or false>, "language_diversity": "<low or medium or high>", "sentiment_distribution": "<natural or suspiciously_positive or suspiciously_negative>", "reasoning": "<one sentence>"}}""",
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
        return ReviewReport(
            authenticity_score=data.get("authenticity_score", 0),
            red_flags=data.get("red_flags", []),
            review_date_clustering=data.get("review_date_clustering", False),
            language_diversity=data.get("language_diversity", "unknown"),
            sentiment_distribution=data.get("sentiment_distribution", "unknown"),
            reasoning=data.get("reasoning", ""),
        )
    except Exception as e:
        return ReviewReport(
            authenticity_score=0,
            red_flags=[f"Analysis failed: {str(e)}"],
            review_date_clustering=False,
            language_diversity="unknown",
            sentiment_distribution="unknown",
            reasoning="Review analysis encountered an error.",
            error=str(e),
        )
