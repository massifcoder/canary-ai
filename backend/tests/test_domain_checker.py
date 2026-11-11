"""Test domain checker — WHOIS + SSL on real domains."""
import sys
sys.path.insert(0, "/Users/kernel/Lab/hackathon/paypal/backend")

from trust.domain_checker import analyze_domain

# Test 1: Well-known trusted domain
print("=== TEST 1: amazon.com (trusted, old, valid SSL) ===")
r1 = analyze_domain("amazon.com")
print(f"  Domain age: {r1.domain_age_days} days")
print(f"  Created: {r1.creation_date}")
print(f"  Registrar: {r1.registrar}")
print(f"  SSL valid: {r1.ssl_valid}")
print(f"  SSL issuer: {r1.ssl_issuer}")
print(f"  SSL self-signed: {r1.ssl_self_signed}")
print(f"  Domain age score: {r1.domain_age_score}/100")
print(f"  SSL score: {r1.ssl_score}/100")
if r1.error:
    print(f"  Errors: {r1.error}")

# Test 2: Another known domain
print("\n=== TEST 2: ebay.com ===")
r2 = analyze_domain("ebay.com")
print(f"  Domain age: {r2.domain_age_days} days")
print(f"  Domain age score: {r2.domain_age_score}/100")
print(f"  SSL score: {r2.ssl_score}/100")
if r2.error:
    print(f"  Errors: {r2.error}")

# Test 3: A domain that likely doesn't exist (simulating scam site)
print("\n=== TEST 3: electrodeals-outlet.shop (fake/nonexistent) ===")
r3 = analyze_domain("electrodeals-outlet.shop")
print(f"  Domain age: {r3.domain_age_days} days")
print(f"  SSL valid: {r3.ssl_valid}")
print(f"  Domain age score: {r3.domain_age_score}/100")
print(f"  SSL score: {r3.ssl_score}/100")
if r3.error:
    print(f"  Errors: {r3.error}")

# Test 4: 6ave.com (from Channel3 results — small retailer)
print("\n=== TEST 4: 6ave.com (small retailer from Channel3) ===")
r4 = analyze_domain("6ave.com")
print(f"  Domain age: {r4.domain_age_days} days")
print(f"  Created: {r4.creation_date}")
print(f"  SSL valid: {r4.ssl_valid}")
print(f"  SSL issuer: {r4.ssl_issuer}")
print(f"  Domain age score: {r4.domain_age_score}/100")
print(f"  SSL score: {r4.ssl_score}/100")
if r4.error:
    print(f"  Errors: {r4.error}")

print("\n=== ALL DOMAIN CHECKER TESTS DONE ===")
