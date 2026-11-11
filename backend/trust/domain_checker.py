"""Domain trust analysis — WHOIS age + SSL certificate verification."""
from __future__ import annotations

import ssl
import socket
import whois
from datetime import datetime, timezone
from dataclasses import dataclass


@dataclass
class DomainReport:
    domain: str
    domain_age_days: int | None
    creation_date: str | None
    registrar: str | None
    ssl_valid: bool
    ssl_issuer: str | None
    ssl_expiry: str | None
    ssl_self_signed: bool
    domain_age_score: int
    ssl_score: int
    error: str | None = None


def check_domain_age(domain: str) -> dict:
    """WHOIS lookup for domain registration date and age."""
    try:
        w = whois.whois(domain)
        creation = w.creation_date
        if isinstance(creation, list):
            creation = creation[0]
        if creation is None:
            return {"domain_age_days": None, "creation_date": None, "registrar": w.registrar, "error": None}

        if creation.tzinfo is None:
            creation = creation.replace(tzinfo=timezone.utc)
        age_days = (datetime.now(timezone.utc) - creation).days
        return {
            "domain_age_days": age_days,
            "creation_date": creation.isoformat(),
            "registrar": w.registrar,
            "error": None,
        }
    except Exception as e:
        return {"domain_age_days": None, "creation_date": None, "registrar": None, "error": str(e)}


def check_ssl(domain: str, port: int = 443, timeout: float = 5.0) -> dict:
    """Check SSL certificate validity, issuer, and expiry."""
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((domain, port), timeout=timeout) as sock:
            with ctx.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()
                issuer_parts = dict(x[0] for x in cert.get("issuer", ()))
                issuer = issuer_parts.get("organizationName", "Unknown")
                subject_parts = dict(x[0] for x in cert.get("subject", ()))
                cn = subject_parts.get("commonName", "")
                not_after = cert.get("notAfter", "")
                self_signed = issuer == cn or issuer == subject_parts.get("organizationName", "")
                return {
                    "ssl_valid": True,
                    "ssl_issuer": issuer,
                    "ssl_expiry": not_after,
                    "ssl_self_signed": self_signed,
                    "error": None,
                }
    except ssl.SSLCertVerificationError as e:
        return {"ssl_valid": False, "ssl_issuer": None, "ssl_expiry": None, "ssl_self_signed": False, "error": f"SSL verification failed: {e}"}
    except (socket.timeout, socket.gaierror, ConnectionRefusedError, OSError) as e:
        return {"ssl_valid": False, "ssl_issuer": None, "ssl_expiry": None, "ssl_self_signed": False, "error": f"Connection failed: {e}"}


def score_domain_age(age_days: int | None) -> int:
    """Score domain age 0-100 per trust formula."""
    if age_days is None:
        return 0
    if age_days < 7:
        return 0
    if age_days < 30:
        return 20
    if age_days < 365:
        return 60
    if age_days < 1825:
        return 90
    return 100


def score_ssl(ssl_valid: bool, ssl_self_signed: bool) -> int:
    """Score SSL certificate 0-100 per trust formula."""
    if not ssl_valid:
        return 0
    if ssl_self_signed:
        return 30
    return 100


def analyze_domain(domain: str) -> DomainReport:
    """Full domain analysis — WHOIS + SSL combined into a report."""
    age_info = check_domain_age(domain)
    ssl_info = check_ssl(domain)

    age_score = score_domain_age(age_info["domain_age_days"])
    ssl_sc = score_ssl(ssl_info["ssl_valid"], ssl_info["ssl_self_signed"])

    errors = []
    if age_info["error"]:
        errors.append(f"WHOIS: {age_info['error']}")
    if ssl_info["error"]:
        errors.append(f"SSL: {ssl_info['error']}")

    return DomainReport(
        domain=domain,
        domain_age_days=age_info["domain_age_days"],
        creation_date=age_info["creation_date"],
        registrar=age_info["registrar"],
        ssl_valid=ssl_info["ssl_valid"],
        ssl_issuer=ssl_info["ssl_issuer"],
        ssl_expiry=ssl_info["ssl_expiry"],
        ssl_self_signed=ssl_info["ssl_self_signed"],
        domain_age_score=age_score,
        ssl_score=ssl_sc,
        error="; ".join(errors) if errors else None,
    )
