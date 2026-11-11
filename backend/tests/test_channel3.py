"""Test Channel3 API — product search, pricing data, market comparison."""
import json
import sys
import requests
sys.path.insert(0, "/Users/kernel/Lab/hackathon/paypal")
from dotenv import dotenv_values

env = dotenv_values("/Users/kernel/Lab/hackathon/paypal/cred.env")
API_KEY = env["CHANNEL3_API_KEY"]
BASE_URL = "https://api.trychannel3.com/v1"

print("=== TEST 1: Search for AirPods Pro ===")
r1 = requests.post(
    f"{BASE_URL}/search",
    headers={"x-api-key": API_KEY, "Content-Type": "application/json"},
    json={"query": "AirPods Pro"},
)
data1 = r1.json()
products = data1.get("products", [])
print(f"Found {len(products)} products")

if products:
    p = products[0]
    print(f"  Top result: {p.get('title')}")
    print(f"  Brand: {p.get('brands', [{}])[0].get('name', 'N/A')}")

    # Check for pricing in offers
    offers = p.get("offers", [])
    print(f"  Offers count: {len(offers)}")
    if offers:
        for o in offers[:3]:
            print(f"    - {o.get('merchant', {}).get('name', 'Unknown')}: ${o.get('price', 'N/A')} {o.get('currency', '')}")
            print(f"      URL: {o.get('url', 'N/A')[:80]}")

print("\n=== TEST 2: Search for a specific product with pricing ===")
r2 = requests.post(
    f"{BASE_URL}/search",
    headers={"x-api-key": API_KEY, "Content-Type": "application/json"},
    json={"query": "Nike Air Max 90", "country": "US"},
)
data2 = r2.json()
products2 = data2.get("products", [])
print(f"Found {len(products2)} products")
if products2:
    p2 = products2[0]
    print(f"  Top result: {p2.get('title')}")
    offers2 = p2.get("offers", [])
    print(f"  Offers: {len(offers2)}")
    if offers2:
        prices = [o.get("price") for o in offers2 if o.get("price")]
        if prices:
            print(f"  Price range: ${min(prices)} - ${max(prices)}")
            print(f"  Average: ${sum(prices)/len(prices):.2f}")

print("\n=== TEST 3: Check response structure for trust scoring ===")
if products:
    p = products[0]
    print("Available fields in product:")
    print(f"  Keys: {list(p.keys())}")
    if p.get("offers"):
        o = p["offers"][0]
        print("Available fields in offer:")
        print(f"  Keys: {list(o.keys())}")
        print(f"  Merchant keys: {list(o.get('merchant', {}).keys())}")

print("\n=== ALL CHANNEL3 TESTS DONE ===")
