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

        If sites are provided, uses those directly (demo mode).
        Otherwise, does real web search via Kernel cloud browser.
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
        return self._web_search(query)

    def _web_search(self, query: str) -> list[ProductListing]:
        """Search for real products via Kernel cloud browser using Google search.
        Extracts product text from the page body and parses merchant + price."""
        import re as _re
        try:
            browser = self.kernel.browsers.create(timeout_seconds=90)
            sid = browser.session_id

            search_url = f"https://www.google.com/search?q={query.replace(' ', '+')}"
            result = self.kernel.browsers.playwright.execute(
                sid,
                code=f'''
                    await page.goto("{search_url}", {{ waitUntil: "domcontentloaded", timeout: 25000 }});
                    await page.waitForTimeout(3000);
                    const bodyText = await page.locator("body").innerText({{ timeout: 5000 }});
                    return bodyText.substring(0, 4000);
                ''',
            )

            self.kernel.browsers.delete_by_id(sid)
            body = result.result

            listings = []
            lines = [l.strip() for l in body.split("\n") if l.strip()]
            skip_words = {"free", "sale", "sponsored", "buy", "add to", "shop", "more", "tools",
                          "all", "shopping", "images", "news", "videos", "short", "search",
                          "sign in", "accessibility", "skip to", "ai mode", "new york"}
            i = 0
            while i < len(lines):
                line = lines[i]
                price_match = _re.match(r'^\$(\d{1,4}(?:,\d{3})*(?:\.\d{1,2})?)$', line)
                if price_match:
                    price = float(price_match.group(1).replace(",", ""))
                    name = query
                    merchant = ""
                    for j in range(i - 1, max(i - 5, -1), -1):
                        prev = lines[j]
                        if len(prev) > 20 and "$" not in prev and prev.lower() not in skip_words:
                            name = prev[:120]
                            break
                    for j in range(i + 1, min(i + 4, len(lines))):
                        nxt = lines[j]
                        if nxt.startswith("$") or nxt.startswith("(") or nxt.lower().startswith("free"):
                            continue
                        if 1 < len(nxt) < 30 and "$" not in nxt and nxt.lower() not in skip_words:
                            merchant = nxt.split("(")[0].strip()
                            break
                    if merchant:
                        domain_map = {
                            "best buy": "bestbuy.com", "b&h": "bhphotovideo.com",
                            "b&h photo": "bhphotovideo.com", "b&h photo-video-audio": "bhphotovideo.com",
                            "target": "target.com", "wal-mart": "walmart.com",
                        }
                        ml = merchant.lower()
                        raw = ml.replace(" ", "").replace("'", "")
                        domain = domain_map.get(ml, raw if "." in raw else raw + ".com")
                        listings.append(ProductListing(
                            name=name,
                            price=price,
                            currency="USD",
                            merchant_domain=domain,
                            merchant_url=f"https://{domain}",
                            description=f"Found via Google — {merchant}",
                        ))
                i += 1

            seen = set()
            unique = []
            for l in listings:
                if l.merchant_domain not in seen:
                    seen.add(l.merchant_domain)
                    unique.append(l)
            return unique[:8]

        except Exception as e:
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
        priced = [l for l in listings if l.price > 0]
        if priced:
            return min(priced, key=lambda x: x.price)
        return listings[0]

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

        # Browse the actual site to get real product description
        if selected.merchant_url and not selected.merchant_url.startswith("https://super-cheap"):
            result.add_message("shopper", f"Browsing {selected.merchant_domain} for product details...")
            site_data = self.browse_site(selected.merchant_url)
            if "error" not in site_data:
                body = site_data.get("bodySnippet", "")
                if body and len(body) > 50:
                    selected.description = body[:2000]
                    selected.reviews_text = body[:1000]
                    result.add_message("shopper", f"Extracted product details from {selected.merchant_domain} ({site_data.get('bodyLength', 0)} chars)")
                else:
                    result.add_message("shopper", f"Site loaded but minimal content found")
            else:
                result.add_message("shopper", f"Could not browse site: {site_data.get('error', 'unknown')[:80]}")

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
