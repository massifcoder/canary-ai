"""Trust Scorer — combines all 5 trust signals into one weighted score."""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from .domain_checker import analyze_domain, DomainReport
from .price_checker import analyze_price, PriceReport
from .review_analyzer import analyze_reviews, ReviewReport


WEIGHTS = {
    "domain_age": 0.20,
    "ssl": 0.15,
    "price": 0.25,
    "reviews": 0.20,
    "registry": 0.20,
}


@dataclass
class TrustReport:
    domain: str
    trust_score: int
    verdict: str
    domain_report: DomainReport
    price_report: PriceReport
    review_report: ReviewReport
    registry_score: int
    breakdown: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "domain": self.domain,
            "trust_score": self.trust_score,
            "verdict": self.verdict,
            "breakdown": self.breakdown,
            "domain_age_days": self.domain_report.domain_age_days,
            "ssl_valid": self.domain_report.ssl_valid,
            "ssl_issuer": self.domain_report.ssl_issuer,
            "offered_price": self.price_report.offered_price,
            "market_avg": self.price_report.market_avg,
            "price_deviation_pct": self.price_report.price_deviation_pct,
            "review_authenticity": self.review_report.authenticity_score,
            "review_red_flags": self.review_report.red_flags,
            "registry_score": self.registry_score,
        }


def score_registry(domain: str) -> int:
    """Business registry check. For now, heuristic-based.
    In production, this would call a real registry API."""
    known_registrars = ["markmonitor", "godaddy", "namecheap", "cloudflare", "google"]
    suspicious_tlds = [".shop", ".xyz", ".click", ".buzz", ".top", ".icu", ".gq", ".ml", ".tk"]

    score = 50
    tld = "." + domain.rsplit(".", 1)[-1] if "." in domain else ""
    if tld in suspicious_tlds:
        score -= 30
    domain_parts = domain.split(".")
    if len(domain_parts[0]) > 20:
        score -= 20
    if any(word in domain.lower() for word in ["deal", "cheap", "discount", "outlet", "sale", "free"]):
        score -= 20
    return max(0, min(100, score))


def compute_trust_score(
    merchant_domain: str,
    product_query: str,
    offered_price: float,
    reviews_text: str,
    channel3_api_key: str,
    anthropic_api_key: str,
    on_step: callable = None,
) -> TrustReport:
    """Run all 5 trust signals and combine into a weighted score.

    on_step callback: called with (step_name, step_data) for real-time UI updates.
    """
    def emit(step: str, data: dict):
        if on_step:
            on_step(step, data)

    # 1. Domain analysis (WHOIS + SSL)
    emit("domain_check_start", {"domain": merchant_domain})
    domain_report = analyze_domain(merchant_domain)
    emit("domain_check_done", {
        "domain_age_days": domain_report.domain_age_days,
        "domain_age_score": domain_report.domain_age_score,
        "ssl_valid": domain_report.ssl_valid,
        "ssl_issuer": domain_report.ssl_issuer,
        "ssl_score": domain_report.ssl_score,
    })

    # 2. Price comparison (Channel3)
    emit("price_check_start", {"product": product_query, "offered_price": offered_price})
    price_report = analyze_price(channel3_api_key, product_query, offered_price)
    emit("price_check_done", {
        "market_avg": price_report.market_avg,
        "price_deviation_pct": price_report.price_deviation_pct,
        "price_score": price_report.price_score,
        "sources_count": len(price_report.sources),
    })

    # 3. Review analysis (Claude LLM)
    emit("review_analysis_start", {"merchant": merchant_domain})
    review_report = analyze_reviews(anthropic_api_key, merchant_domain, reviews_text)
    emit("review_analysis_done", {
        "authenticity_score": review_report.authenticity_score,
        "red_flags": review_report.red_flags,
        "reasoning": review_report.reasoning,
    })

    # 4. Business registry check
    emit("registry_check_start", {"domain": merchant_domain})
    registry = score_registry(merchant_domain)
    emit("registry_check_done", {"registry_score": registry})

    # 5. Combine weighted score
    breakdown = {
        "domain_age": domain_report.domain_age_score,
        "ssl": domain_report.ssl_score,
        "price": price_report.price_score,
        "reviews": review_report.authenticity_score,
        "registry": registry,
    }

    trust_score = round(sum(
        breakdown[signal] * weight
        for signal, weight in WEIGHTS.items()
    ))

    if trust_score > 60:
        verdict = "APPROVED"
    elif trust_score < 30:
        verdict = "BLOCKED"
    else:
        verdict = "AWAITING_USER"

    emit("trust_score_calculated", {
        "trust_score": trust_score,
        "breakdown": breakdown,
        "verdict": verdict,
    })

    return TrustReport(
        domain=merchant_domain,
        trust_score=trust_score,
        verdict=verdict,
        domain_report=domain_report,
        price_report=price_report,
        review_report=review_report,
        registry_score=registry,
        breakdown=breakdown,
    )
