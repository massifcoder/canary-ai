"""Shopper Agent — browses sites via Kernel, finds products, initiates PayPal orders."""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from kernel import Kernel
from paypal_agent_toolkit.shared.paypal_client import PayPalClient
from paypal_agent_toolkit.shared.orders.tool_handlers import create_order


@dataclass
class ProductListing:
    name: str
    price: float
    currency: str
    merchant_domain: str
    merchant_url: str
    description: str = ""
    reviews_text: str = ""


@dataclass
class ShopperResult:
    query: str
    listings: list[ProductListing] = field(default_factory=list)
    selected: ProductListing | None = None
    claims: list[str] = field(default_factory=list)
    order_id: str | None = None
    messages: list[dict] = field(default_factory=list)

    def add_message(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})


class ShopperAgent:
    """Shopping agent that browses real sites and finds products."""

    def __init__(self, kernel_api_key: str, paypal_client: PayPalClient):
        self.kernel = Kernel(api_key=kernel_api_key)
        self.paypal = paypal_client
        self.browser_session = None

    def search_products(self, query: str, sites: list[dict] | None = None) -> list[ProductListing]:
        """Search for products across merchant sites.

        For the demo, we accept pre-configured sites (scam + legit) to ensure
        a reliable demo flow. In production, this would do real web search.

        sites: list of {"domain": ..., "url": ..., "name": ..., "price": ..., "reviews": ...}
        """
        if sites:
            return [
                ProductListing(
                    name=s.get("name", query),
                    price=s["price"],
                    currency=s.get("currency", "USD"),
                    merchant_domain=s["domain"],
                    merchant_url=s.get("url", f"https://{s['domain']}"),
                    description=s.get("description", ""),
                    reviews_text=s.get("reviews", ""),
                )
                for s in sites
            ]
        return []

    def browse_site(self, url: str) -> dict:
        """Browse a real site via Kernel cloud browser and extract page data."""
        try:
            browser = self.kernel.browsers.create(timeout_seconds=60)
            self.browser_session = browser.session_id

            response = self.kernel.browsers.playwright.execute(
                browser.session_id,
                code=f'''
                    await page.goto("{url}", {{ waitUntil: "domcontentloaded", timeout: 20000 }});
                    const title = await page.title();
                    const pageUrl = page.url();
                    let bodyText = "";
                    try {{ bodyText = await page.locator("body").innerText({{ timeout: 5000 }}); }} catch(e) {{}}
                    const isHttps = pageUrl.startsWith("https");
                    return JSON.stringify({{
                        title,
                        url: pageUrl,
                        isHttps,
                        bodySnippet: bodyText.substring(0, 2000),
                        bodyLength: bodyText.length
                    }});
                ''',
            )

            self.kernel.browsers.delete_by_id(browser.session_id)
            self.browser_session = None
            return json.loads(response.result)
        except Exception as e:
            if self.browser_session:
                try:
                    self.kernel.browsers.delete_by_id(self.browser_session)
                except Exception:
                    pass
                self.browser_session = None
            return {"error": str(e), "url": url}

    def select_best(self, listings: list[ProductListing]) -> ProductListing:
        """Select the best deal. The shopper optimizes for price (this is the flaw Canary catches)."""
        return min(listings, key=lambda x: x.price)

    def generate_claims(self, listing: ProductListing) -> list[str]:
        """Generate the shopper's assumptions/claims about the selected product."""
        return [
            f"The merchant at {listing.merchant_domain} is a legitimate retailer",
            f"The price of ${listing.price:.2f} for {listing.name} is a good deal",
            f"The product matches what the user requested",
        ]

    def create_paypal_order(self, listing: ProductListing) -> str:
        """Create a PayPal sandbox order for the selected product."""
        result = create_order(self.paypal, {
            "currency_code": "USD",
            "items": [{
                "name": listing.name,
                "quantity": 1,
                "item_cost": listing.price,
                "item_total": listing.price,
                "description": listing.description or f"{listing.name} from {listing.merchant_domain}",
            }],
        })
        data = json.loads(result)
        return data.get("id", "")

    def run(self, query: str, sites: list[dict] | None = None) -> ShopperResult:
        """Full shopping flow: search → select → generate claims."""
        result = ShopperResult(query=query)
        result.add_message("user", query)

        # Search
        result.add_message("shopper", f"Searching for: {query}...")
        listings = self.search_products(query, sites)
        result.listings = listings

        if not listings:
            result.add_message("shopper", "No products found.")
            return result

        result.add_message("shopper", f"Found {len(listings)} options:")
        for i, l in enumerate(listings):
            result.add_message("shopper", f"  {i+1}. {l.name} — ${l.price:.2f} from {l.merchant_domain}")

        # Select best (cheapest)
        selected = self.select_best(listings)
        result.selected = selected
        result.add_message("shopper", f"Best deal: {selected.name} at ${selected.price:.2f} from {selected.merchant_domain}")

        # Generate claims
        claims = self.generate_claims(selected)
        result.claims = claims
        result.add_message("shopper", "My assessment: " + "; ".join(claims))

        return result

    def cleanup(self):
        if self.browser_session:
            try:
                self.kernel.browsers.delete_by_id(self.browser_session)
            except Exception:
                pass
