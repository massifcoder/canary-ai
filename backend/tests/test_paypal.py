"""Test PayPal Agent Toolkit — create_order, get_order, capture_order in sandbox."""
import json
import sys
sys.path.insert(0, "/Users/kernel/Lab/hackathon/paypal")

from dotenv import dotenv_values
from paypal_agent_toolkit.shared.paypal_client import PayPalClient
from paypal_agent_toolkit.shared.configuration import Context
from paypal_agent_toolkit.shared.orders.tool_handlers import (
    create_order,
    get_order_details,
    capture_order,
)

env = dotenv_values("/Users/kernel/Lab/hackathon/paypal/cred.env")

client = PayPalClient(
    client_id=env["BUSINESS_CLIENT_ID"],
    secret=env["BUSINESS_SECRET_KEY"],
    context=Context(sandbox=True),
)

print("=== TEST 1: Create Order ===")
order_result = create_order(client, {
    "currency_code": "USD",
    "items": [
        {
            "name": "AirPods Pro",
            "quantity": 1,
            "item_cost": 229.00,
            "item_total": 229.00,
            "description": "Apple AirPods Pro 2nd Gen",
        }
    ],
})
order_data = json.loads(order_result)
print(json.dumps(order_data, indent=2))

order_id = order_data.get("id")
print(f"\nOrder ID: {order_id}")
print(f"Status: {order_data.get('status')}")

print("\n=== TEST 2: Get Order Details ===")
details_result = get_order_details(client, {"order_id": order_id})
details_data = json.loads(details_result)
print(f"Status: {details_data.get('status')}")
print(f"Raw status: {details_data.get('raw', {}).get('status')}")

print("\n=== TEST 3: Capture Order (expect failure — no buyer approval) ===")
try:
    capture_result = capture_order(client, {"order_id": order_id})
    capture_data = json.loads(capture_result)
    print(json.dumps(capture_data, indent=2))
except Exception as e:
    print(f"Expected error (no buyer approval): {e}")

print("\n=== ALL PAYPAL TESTS DONE ===")
