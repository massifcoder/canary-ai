"""SQLite models for Canary — transactions, merchants, trust scores, bypass attempts."""
from __future__ import annotations

import sqlite3
import json
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "canary.db"


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            user_query TEXT NOT NULL,
            product_name TEXT,
            product_price REAL,
            currency TEXT DEFAULT 'USD',
            merchant_domain TEXT,
            merchant_url TEXT,
            trust_score INTEGER,
            trust_breakdown TEXT,
            assumption_results TEXT,
            verdict TEXT NOT NULL CHECK(verdict IN ('APPROVED', 'BLOCKED', 'AWAITING_USER', 'USER_APPROVED', 'USER_CANCELLED', 'CANCELLED', 'PENDING')),
            verdict_reason TEXT,
            paypal_order_id TEXT,
            canary_enabled INTEGER NOT NULL DEFAULT 1,
            bypass_attempted INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS merchants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT NOT NULL UNIQUE,
            first_seen TEXT NOT NULL DEFAULT (datetime('now')),
            last_checked TEXT NOT NULL DEFAULT (datetime('now')),
            domain_age_days INTEGER,
            ssl_valid INTEGER,
            ssl_issuer TEXT,
            avg_trust_score REAL,
            total_transactions INTEGER DEFAULT 0,
            total_blocked INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS bypass_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            transaction_id INTEGER REFERENCES transactions(id),
            action_attempted TEXT NOT NULL,
            reason_blocked TEXT NOT NULL
        );
    """)
    conn.commit()
    conn.close()


@dataclass
class Transaction:
    user_query: str
    verdict: str
    product_name: str | None = None
    product_price: float | None = None
    currency: str = "USD"
    merchant_domain: str | None = None
    merchant_url: str | None = None
    trust_score: int | None = None
    trust_breakdown: dict | None = None
    assumption_results: dict | None = None
    verdict_reason: str | None = None
    paypal_order_id: str | None = None
    canary_enabled: bool = True
    bypass_attempted: bool = False


def save_transaction(tx: Transaction) -> int:
    conn = get_db()
    cursor = conn.execute(
        """INSERT INTO transactions
        (user_query, product_name, product_price, currency, merchant_domain,
         merchant_url, trust_score, trust_breakdown, assumption_results,
         verdict, verdict_reason, paypal_order_id, canary_enabled, bypass_attempted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            tx.user_query,
            tx.product_name,
            tx.product_price,
            tx.currency,
            tx.merchant_domain,
            tx.merchant_url,
            tx.trust_score,
            json.dumps(tx.trust_breakdown) if tx.trust_breakdown else None,
            json.dumps(tx.assumption_results) if tx.assumption_results else None,
            tx.verdict,
            tx.verdict_reason,
            tx.paypal_order_id,
            1 if tx.canary_enabled else 0,
            1 if tx.bypass_attempted else 0,
        ),
    )
    tx_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return tx_id


def save_bypass_attempt(transaction_id: int, action: str, reason: str) -> int:
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO bypass_attempts (transaction_id, action_attempted, reason_blocked) VALUES (?, ?, ?)",
        (transaction_id, action, reason),
    )
    bypass_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return bypass_id


def upsert_merchant(domain: str, domain_age_days: int | None, ssl_valid: bool, ssl_issuer: str | None, trust_score: int):
    conn = get_db()
    conn.execute(
        """INSERT INTO merchants (domain, domain_age_days, ssl_valid, ssl_issuer, avg_trust_score, total_transactions, total_blocked)
        VALUES (?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(domain) DO UPDATE SET
            last_checked = datetime('now'),
            domain_age_days = excluded.domain_age_days,
            ssl_valid = excluded.ssl_valid,
            ssl_issuer = excluded.ssl_issuer,
            avg_trust_score = (avg_trust_score * total_transactions + excluded.avg_trust_score) / (total_transactions + 1),
            total_transactions = total_transactions + 1,
            total_blocked = total_blocked + excluded.total_blocked""",
        (domain, domain_age_days, 1 if ssl_valid else 0, ssl_issuer, trust_score, 1 if trust_score < 30 else 0),
    )
    conn.commit()
    conn.close()


def get_all_transactions() -> list[dict]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM transactions ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_merchants() -> list[dict]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM merchants ORDER BY last_checked DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_bypass_attempts() -> list[dict]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM bypass_attempts ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_dashboard_stats() -> dict:
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
    blocked = conn.execute("SELECT COUNT(*) FROM transactions WHERE verdict = 'BLOCKED'").fetchone()[0]
    approved = conn.execute("SELECT COUNT(*) FROM transactions WHERE verdict = 'APPROVED'").fetchone()[0]
    bypasses = conn.execute("SELECT COUNT(*) FROM bypass_attempts").fetchone()[0]
    avg_score = conn.execute("SELECT AVG(trust_score) FROM transactions WHERE trust_score IS NOT NULL").fetchone()[0]
    conn.close()
    return {
        "total_transactions": total,
        "blocked": blocked,
        "approved": approved,
        "bypass_attempts": bypasses,
        "avg_trust_score": round(avg_score, 1) if avg_score else 0,
        "block_rate": round(blocked / total * 100, 1) if total > 0 else 0,
    }
