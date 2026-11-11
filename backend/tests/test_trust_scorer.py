"""Test full Trust Scorer — scam site vs legit site."""
import sys
sys.path.insert(0, "/Users/kernel/Lab/hackathon/paypal/backend")

from dotenv import dotenv_values
from trust.scorer import compute_trust_score

env = dotenv_values("/Users/kernel/Lab/hackathon/paypal/cred.env")

def on_step(step: str, data: dict):
    print(f"  [{step}] {data}")

# Test 1: Scam site
print("=" * 60)
print("TEST 1: SCAM SITE — electrodeals-outlet.shop, AirPods $89")
print("=" * 60)

fake_reviews = """
1. "Amazing product! Best price ever!" - John D. (Nov 10, 2026)
2. "Great deal, fast shipping!" - Sarah M. (Nov 10, 2026)
3. "Incredible value, highly recommend!" - Mike R. (Nov 10, 2026)
4. "Best store I have ever used!" - Lisa K. (Nov 9, 2026)
5. "Five stars, would buy again!" - Tom B. (Nov 9, 2026)
"""

scam_report = compute_trust_score(
    merchant_domain="electrodeals-outlet.shop",
    product_query="Apple AirPods Pro",
    offered_price=89.00,
    reviews_text=fake_reviews,
    channel3_api_key=env["CHANNEL3_API_KEY"],
    anthropic_api_key=env["ANTHROPIC_API_KEY"],
    on_step=on_step,
)

print(f"\n  TRUST SCORE: {scam_report.trust_score}/100")
print(f"  VERDICT: {scam_report.verdict}")
print(f"  Breakdown: {scam_report.breakdown}")

# Test 2: Legit site
print("\n" + "=" * 60)
print("TEST 2: LEGIT SITE — 6ave.com, AirPods $258")
print("=" * 60)

legit_reviews = """
1. "Good price, arrived in 3 days. Packaging was fine but not Apple retail." - Mark T. (Oct 15, 2026)
2. "Bought for my wife, she loves them. 6ave has been reliable for years." - Jennifer L. (Sep 22, 2026)
3. "Price was $10 less than Best Buy. Legit product, authorized dealer." - David W. (Aug 3, 2026)
4. "Decent experience. Shipping took a week which was slower than expected." - Amy R. (Jul 18, 2026)
5. "3 stars - product was fine but customer service was slow to respond." - Chris P. (Jun 5, 2026)
"""

legit_report = compute_trust_score(
    merchant_domain="6ave.com",
    product_query="Apple AirPods Pro",
    offered_price=258.00,
    reviews_text=legit_reviews,
    channel3_api_key=env["CHANNEL3_API_KEY"],
    anthropic_api_key=env["ANTHROPIC_API_KEY"],
    on_step=on_step,
)

print(f"\n  TRUST SCORE: {legit_report.trust_score}/100")
print(f"  VERDICT: {legit_report.verdict}")
print(f"  Breakdown: {legit_report.breakdown}")

print("\n" + "=" * 60)
print("COMPARISON")
print("=" * 60)
print(f"  Scam:  {scam_report.trust_score}/100 → {scam_report.verdict}")
print(f"  Legit: {legit_report.trust_score}/100 → {legit_report.verdict}")
