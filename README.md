# 🐤 Canary

**Your canary for agentic commerce.**

Canary is a multi-agent trust verification system that protects PayPal payments in AI-powered shopping. When an AI agent wants to buy something, Canary's Guardian Agent challenges every assumption before money moves.

## The Problem

AI shopping agents optimize for price. They'll happily buy from `super-cheap-electronics.xyz` at 85% off — no questions asked. Without trust verification, every autonomous purchase is a potential scam.

## How It Works

```
User: "Buy Sony WH-1000XM5 headphones"
         │
    ┌────▼────┐
    │ Shopper  │ ── Finds cheapest option ($45.99 from scam site)
    │  Agent   │ ── Makes claims: "legitimate retailer", "good deal"
    └────┬────┘
         │
    ┌────▼────┐
    │ Guardian │ ── Runs 5 trust signals (domain, SSL, price, reviews, registry)
    │  Agent   │ ── Challenges every claim with evidence
    └────┬────┘ ── Verdict: APPROVED / BLOCKED / ASK USER
         │
    ┌────▼────┐
    │ Bypass   │ ── Catches the Shopper trying to skip Guardian
    │ Monitor  │ ── State machine blocks unauthorized PayPal calls
    └─────────┘
```

## Trust Signals

| Signal | Weight | How |
|--------|--------|-----|
| Domain Age | 20% | WHOIS lookup — new domains are risky |
| SSL Certificate | 15% | Valid CA vs self-signed vs missing |
| Price Analysis | 25% | Channel3 market comparison — too cheap = suspicious |
| Review Analysis | 20% | Claude LLM detects fake review patterns |
| Business Registry | 20% | TLD heuristics + domain pattern analysis |

## Quick Start

```bash
# Clone and setup
git clone https://github.com/massifcoder/canary-ai
cd canary-ai

# Backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp cred.env.example cred.env  # Add your API keys

# Frontend
cd frontend && npm install && cd ..

# Run
./start.sh
# Open http://localhost:3001
```

## Demo URLs

- `http://localhost:3001` — Main demo UI
- `http://localhost:3001/?auto=on` — Auto-start with Canary protection
- `http://localhost:3001/?auto=off` — Auto-start without protection (see the scam go through)
- `http://localhost:3001/dashboard` — Analytics dashboard

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, SSE streaming
- **AI**: Claude (Haiku) for review analysis + assumption verification
- **Payments**: PayPal Agent Toolkit (Orders API v2, sandbox)
- **Browsing**: Kernel SDK (cloud browsers for real site verification)
- **Data**: Channel3 API (100M+ product price comparison)
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion
- **Database**: SQLite (WAL mode)

## Architecture

Two-agent adversarial system:
- **Shopper Agent**: Optimizes for price (intentionally naive)
- **Guardian Agent**: Challenges claims with 5 trust signals + LLM-as-judge
- **Bypass Monitor**: State machine that catches unauthorized PayPal API calls

## Sponsor Integrations

- **PayPal Agent Toolkit**: Orders API for sandbox payments
- **Anthropic Claude**: LLM review analysis + assumption verification
- **Kernel SDK**: Cloud browsers for real site browsing
- **Channel3 API**: Market price comparison data

## License

MIT
