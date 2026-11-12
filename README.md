# Canary

**Your canary for agentic commerce.**

Canary is a multi-agent trust verification system that protects PayPal payments in AI-powered shopping. When an AI agent wants to buy something, Canary's Guardian Agent challenges every assumption before money moves.

## The Problem

AI shopping agents optimize for price. They'll buy from `super-cheap-electronics.xyz` at 85% off -- no questions asked. Without trust verification, every autonomous purchase is a potential scam.

## How It Works

```
User: "Buy Sony WH-1000XM5 headphones"
         |
    +---------+
    | Shopper  | -- Finds cheapest option ($45.99 from scam site)
    |  Agent   | -- Makes claims: "legitimate retailer", "good deal"
    +----+----+
         |
    +----v----+
    | Guardian | -- Runs 5 trust signals (domain, SSL, price, reviews, registry)
    |  Agent   | -- Challenges every claim with evidence
    +----+----+ -- Verdict: APPROVED / BLOCKED / ASK USER
         |
    +----v----+
    | Bypass   | -- Catches the Shopper trying to skip Guardian
    | Monitor  | -- State machine blocks unauthorized PayPal calls
    +---------+
```

Two AI agents that don't trust each other. The Shopper optimizes for price (intentionally naive). The Guardian challenges every claim with real data. If the Shopper tries to bypass the Guardian and call PayPal directly -- caught and blocked.

## Trust Signals

| Signal | Weight | Source |
|--------|--------|--------|
| Domain Age | 20% | WHOIS lookup -- new domains are risky |
| SSL Certificate | 15% | Certificate validation -- self-signed or missing = red flag |
| Price Analysis | 25% | Channel3 API (100M+ products) -- too cheap = bait pricing |
| Review Authenticity | 20% | Claude AI -- detects fake review patterns |
| Business Registry | 20% | TLD heuristics + domain pattern analysis |

## Prerequisites

- Python 3.11+
- Node.js 18+
- API keys for: PayPal Sandbox, Anthropic Claude, Kernel SDK, Channel3

## Setup

```bash
# 1. Clone
git clone https://github.com/massifcoder/canary-ai
cd canary-ai

# 2. Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Frontend
cd frontend
npm install
cd ..

# 4. Configure API keys
cp cred.env.example cred.env
# Edit cred.env with your API keys (see section below)
```

### API Keys (cred.env)

```env
# PayPal Sandbox -- get from developer.paypal.com
CLIENT_ID=your_platform_client_id
CLIENT_SECRET=your_platform_client_secret
BUSINESS_CLIENT_ID=your_business_client_id
BUSINESS_SECRET_KEY=your_business_secret_key
SANDBOX_BUSINESS_EMAIL=sb-xxx@business.example.com
SANDBOX_EMAIL=sb-xxx@personal.example.com

# Anthropic Claude -- get from console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-xxx

# Kernel SDK -- get from onkernel.com
ONKERNEL_API_KEY=sk_xxx

# Channel3 -- get from channel3.ai
CHANNEL3_API_KEY=xxx
```

## Running

**Option A: Quick start (both servers)**
```bash
chmod +x start.sh
./start.sh
```

**Option B: Manual (two terminals)**
```bash
# Terminal 1 -- Backend
source .venv/bin/activate
python3 -m uvicorn backend.api:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 -- Frontend
cd frontend
npm run dev -- --port 3001
```

Then open:
- **Demo UI**: http://localhost:3001
- **Dashboard**: http://localhost:3001/dashboard
- **API Health**: http://localhost:8000/api/health

### Demo Modes

The UI has a DEMO/LIVE toggle:
- **DEMO mode** (default): Uses hardcoded sites for reproducible demonstrations -- a scam site (super-cheap-electronics.xyz, $45.99) and a legitimate site (amazon.com, $298)
- **LIVE mode**: Shopper Agent browses real websites via Kernel cloud browsers

Auto-start URLs:
- `http://localhost:3001/?auto=on` -- Auto-start with Canary protection
- `http://localhost:3001/?auto=off` -- Auto-start without protection (see the scam go through)

## Project Structure

```
canary-ai/
|-- backend/
|   |-- api.py                         # FastAPI app, SSE streaming endpoints
|   |-- agents/
|   |   |-- shopper.py                 # Shopper Agent -- finds products, browses sites
|   |   |-- guardian.py                # Guardian Agent -- trust analysis, claim verification
|   |   |-- orchestrator.py            # Coordinates Shopper <-> Guardian debate
|   |-- trust/
|   |   |-- scorer.py                  # Weighted trust score engine (0-100)
|   |   |-- domain_checker.py          # WHOIS lookup + SSL certificate validation
|   |   |-- price_checker.py           # Channel3 API market price comparison
|   |   |-- review_analyzer.py         # Claude LLM fake review detection
|   |   |-- expectation_analyzer.py    # Product-user expectation matching
|   |-- safety/
|   |   |-- assumption_verifier.py     # LLM-as-judge for agent claims
|   |   |-- bypass_monitor.py          # State machine catching unauthorized PayPal calls
|   |-- db/
|   |   |-- models.py                  # SQLite models: transactions, merchants, bypass_attempts
|   |-- tests/                         # Integration tests for each component
|-- frontend/
|   |-- app/
|   |   |-- page.tsx                   # Main demo UI -- split-screen agent chat + trust panel
|   |   |-- dashboard/page.tsx         # Analytics dashboard with AG Grid
|   |   |-- ThreeBackground.tsx        # Boids flocking animation (Canvas 2D)
|   |   |-- globals.css                # Theme system (dark/light) with CSS variables
|   |   |-- layout.tsx                 # Root layout with theme initialization
|-- start.sh                           # Quick start script (both servers)
|-- cred.env.example                   # Template for API keys
|-- requirements.txt                   # Python dependencies
|-- ARCHITECTURE.md                    # Detailed architecture and data flow docs
```

## Architecture

### Adversarial Multi-Agent Design

This is not a middleware or filter. It's a two-agent adversarial system where the Guardian treats every Shopper claim as an assumption to be proven, not a fact to be accepted.

**Shopper Agent**: Browses real websites via Kernel cloud browsers. Finds products, compares prices, attempts PayPal checkout. Intentionally optimizes only for price.

**Guardian Agent**: Intercepts before payment. Runs 5 real-time trust checks. Challenges the Shopper's claims using LLM-as-judge. Produces a trust score (0-100).

**Bypass Monitor**: State machine that watches all Shopper actions. If the Shopper tries to call PayPal's `create_order` without Guardian approval -- caught and blocked. This protects users from their own agent.

### Decision Thresholds

| Trust Score | Verdict | Action |
|-------------|---------|--------|
| 60-100 | APPROVED | PayPal order created |
| 30-59 | ASK USER | User sees concerns, chooses to approve or find alternatives |
| 0-29 | BLOCKED | Transaction stopped, Shopper told to find alternatives |

### Real-Time Streaming

Backend streams events via SSE (Server-Sent Events) so the frontend shows each trust check as it happens -- domain lookup, SSL validation, price comparison, review analysis -- all in real time.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Python 3.11+, FastAPI, SSE streaming |
| AI Agents | Claude API (Haiku) + LangChain |
| Payments | PayPal Agent Toolkit (Orders API v2, sandbox) |
| Web Browsing | Kernel SDK (cloud browsers for real site verification) |
| Price Data | Channel3 API (100M+ product price comparison) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Animations | Framer Motion, Canvas 2D boids flocking |
| Dashboard | AG Grid (transaction history + analytics) |
| Database | SQLite (WAL mode) |

## Sponsor Integrations

- **PayPal Agent Toolkit**: Orders API v2 for sandbox payments (`create_order`, `capture_order`)
- **Anthropic Claude**: Powers Guardian Agent intelligence -- review analysis, assumption verification, expectation matching
- **Kernel SDK**: Cloud browsers that let the Shopper Agent browse real websites (not cached/scraped data)
- **Channel3 API**: Market price database (100M+ products) for price anomaly detection
- **AG Grid**: Dashboard transaction table with sorting, filtering, and color-coded verdicts

## License

MIT
