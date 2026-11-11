"""Test Kernel SDK — launch cloud browser, navigate to a real site, extract content."""
import sys
sys.path.insert(0, "/Users/kernel/Lab/hackathon/paypal")

from dotenv import dotenv_values
from kernel import Kernel

env = dotenv_values("/Users/kernel/Lab/hackathon/paypal/cred.env")

client = Kernel(api_key=env["ONKERNEL_API_KEY"])

print("=== TEST 1: Create Browser ===")
browser = client.browsers.create()
print(f"Session ID: {browser.session_id}")
print(f"Status: {browser.status}")

print("\n=== TEST 2: Navigate to a real commerce site and extract info ===")
try:
    response = client.browsers.playwright.execute(
        id=browser.session_id,
        code="""
          await page.goto('https://www.amazon.com/dp/B0D1XD1ZV3', { waitUntil: 'domcontentloaded', timeout: 15000 });
          const title = await page.title();
          const url = page.url();

          // Try to get product title and price
          let productTitle = '';
          let price = '';
          try {
            productTitle = await page.locator('#productTitle').innerText();
          } catch(e) { productTitle = 'not found'; }
          try {
            price = await page.locator('.a-price .a-offscreen').first().innerText();
          } catch(e) { price = 'not found'; }

          return JSON.stringify({ title, url, productTitle: productTitle.trim(), price });
        """,
    )
    print(f"Result: {response.result}")
except Exception as e:
    print(f"Error: {e}")

print("\n=== TEST 3: Check SSL and page metadata ===")
try:
    response2 = client.browsers.playwright.execute(
        id=browser.session_id,
        code="""
          await page.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded', timeout: 10000 });
          const url = page.url();
          const isHttps = url.startsWith('https');
          const title = await page.title();
          return JSON.stringify({ url, isHttps, title });
        """,
    )
    print(f"Result: {response2.result}")
except Exception as e:
    print(f"Error: {e}")

print("\n=== TEST 4: Cleanup — delete browser ===")
try:
    client.browsers.delete_by_id(browser.session_id)
    print("Browser deleted successfully")
except Exception as e:
    print(f"Delete error: {e}")

print("\n=== ALL KERNEL TESTS DONE ===")
