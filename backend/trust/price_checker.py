"""Price comparison via Channel3 API — checks if a price is market-rate or bait."""
from __future__ import annotations

import requests
from dataclasses import dataclass


@dataclass
class PriceReport:
    product_query: str
    offered_price: float
    market_prices: list[float]
    market_avg: float | None
    market_min: float | None
    market_max: float | None
    price_deviation_pct: float | None
    price_score: int
    sources: list[dict]
    error: str | None = None


def search_market_price(api_key: str, product_query: str, country: str = "US") -> list[dict]:
    """Search Channel3 for product prices across retailers."""
    try:
        r = requests.post(
            "https://api.trychannel3.com/v1/search",
            headers={"x-api-key": api_key, "Content-Type": "application/json"},
            json={"query": product_query, "country": country},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        results = []
        for product in data.get("products", []):
            for offer in product.get("offers", []):
                price_obj = offer.get("price", {})
                price = price_obj.get("price") if isinstance(price_obj, dict) else price_obj
                if price and isinstance(price, (int, float)):
                    results.append({
                        "title": product.get("title", ""),
                        "price": float(price),
                        "domain": offer.get("domain", "unknown"),
                        "currency": price_obj.get("currency", "USD") if isinstance(price_obj, dict) else "USD",
                        "availability": offer.get("availability", "unknown"),
                    })
        return results
    except Exception as e:
        return []


def score_price(offered_price: float, market_avg: float | None) -> int:
    """Score price vs market average, 0-100."""
    if market_avg is None or market_avg == 0:
        return 50
    deviation = (market_avg - offered_price) / market_avg
    if deviation > 0.50:
        return 0
    if deviation > 0.30:
        return 30
    if deviation > 0.10:
        return 70
    if deviation >= -0.10:
        return 100
    return 80


def analyze_price(api_key: str, product_query: str, offered_price: float) -> PriceReport:
    """Full price analysis — search market, compare, score."""
    sources = search_market_price(api_key, product_query)
    prices = [s["price"] for s in sources]

    if not prices:
        return PriceReport(
            product_query=product_query,
            offered_price=offered_price,
            market_prices=[],
            market_avg=None,
            market_min=None,
            market_max=None,
            price_deviation_pct=None,
            price_score=50,
            sources=[],
            error="No market data found",
        )

    avg = sum(prices) / len(prices)
    deviation_pct = round((avg - offered_price) / avg * 100, 1)

    return PriceReport(
        product_query=product_query,
        offered_price=offered_price,
        market_prices=prices,
        market_avg=round(avg, 2),
        market_min=min(prices),
        market_max=max(prices),
        price_deviation_pct=deviation_pct,
        price_score=score_price(offered_price, avg),
        sources=sources,
    )
