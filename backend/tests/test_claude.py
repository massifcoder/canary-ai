"""Test Claude API — structured output for review analysis and assumption verification."""
import json
import sys
sys.path.insert(0, "/Users/kernel/Lab/hackathon/paypal")
from dotenv import dotenv_values
import anthropic

env = dotenv_values("/Users/kernel/Lab/hackathon/paypal/cred.env")
client = anthropic.Anthropic(api_key=env["ANTHROPIC_API_KEY"])

print("=== TEST 1: Review Authenticity Analysis ===")
fake_reviews = """
Reviews for "ElectroDeals Outlet":
1. "Amazing product! Best price ever!" - John D. (Posted: Nov 10, 2026)
2. "Great deal, fast shipping!" - Sarah M. (Posted: Nov 10, 2026)
3. "Incredible value, highly recommend!" - Mike R. (Posted: Nov 10, 2026)
4. "Best store I've ever used!" - Lisa K. (Posted: Nov 9, 2026)
5. "Five stars, would buy again!" - Tom B. (Posted: Nov 9, 2026)
"""

response1 = client.messages.create(
    model="claude-haiku-5-5",
    max_tokens=500,
    messages=[{
        "role": "user",
        "content": f"""Analyze these merchant reviews for authenticity. Return JSON only, no other text.

{fake_reviews}

Return this exact JSON structure:
{{
  "authenticity_score": <0-100>,
  "red_flags": [<list of specific issues>],
  "review_date_clustering": <true/false>,
  "language_diversity": <"low"|"medium"|"high">,
  "sentiment_distribution": <"natural"|"suspiciously_positive"|"suspiciously_negative">,
  "reasoning": "<one sentence>"
}}"""
    }],
)
print(response1.content[0].text)

print("\n=== TEST 2: Agent Assumption Verification ===")
response2 = client.messages.create(
    model="claude-haiku-5-5",
    max_tokens=500,
    messages=[{
        "role": "user",
        "content": """An AI shopping agent made these claims about a purchase. Verify each claim against the evidence. Return JSON only.

Agent claims:
1. "This is a legitimate retailer"
2. "The price of $89 for AirPods Pro is a good deal"
3. "The product matches what the user requested"

Evidence:
- Domain: electrodeals-outlet.shop (registered 3 days ago)
- SSL: No certificate
- Market price for AirPods Pro: $249 (from Channel3 data)
- Reviews: 5 reviews, all posted in last 2 days, all 5-star
- Business registry: No registration found

Return this exact JSON structure:
{
  "claims": [
    {
      "claim": "<the claim>",
      "verdict": "verified" | "unverified" | "false",
      "evidence": "<specific evidence for/against>",
      "risk_level": "low" | "medium" | "high" | "critical"
    }
  ],
  "overall_risk": "low" | "medium" | "high" | "critical",
  "recommendation": "approve" | "flag" | "block",
  "reasoning": "<one sentence>"
}"""
    }],
)
print(response2.content[0].text)

print("\n=== ALL CLAUDE TESTS DONE ===")
