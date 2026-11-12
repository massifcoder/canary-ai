# Canary — Full Architecture

*"Your canary for agentic commerce."*

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                       DEMO UI (Next.js)                          │
│  ┌─────────────────────────┐  ┌────────────────────────────────┐ │
│  │   Agent Chat Panel      │  │   Canary Live Panel            │ │
│  │   (left side)           │  │   (right side)                 │ │
│  │                         │  │   - Step showcaser             │ │
│  │   User prompt           │  │   - Trust score animation      │ │
│  │   Shopper Agent msgs    │  │   - Assumption audit           │ │
│  │   Guardian Agent msgs   │  │   - Bypass detection           │ │
│  │   Purchase flow         │  │   - Verdict (block/approve)    │ │
│  └──────────┬──────────────┘  └──────────────┬─────────────────┘ │
│             │ POST + SSE                      │ SSE               │
└─────────────┼─────────────────────────────────┼──────────────────┘
              │                                 │
              ▼                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI + Python)                      │
│                                                                  │
│  ┌─────────────────────┐    ┌──────────────────────────────────┐ │
│  │  SHOPPER AGENT      │◄──►│     GUARDIAN AGENT (Canary)      │ │
│  │                     │    │                                  │ │
│  │  - Kernel cloud     │    │  1. Intent Capture               │ │
│  │    browser (browse  │    │  2. Merchant Trust Scorer         │ │
│  │    real sites)      │    │     - Domain age (WHOIS)         │ │
│  │  - PayPal Agent     │    │     - SSL certificate check      │ │
│  │    Toolkit          │    │     - Price vs market (Channel3) │ │
│  │  - Product search   │    │     - Review authenticity (LLM)  │ │
│  │  - Order creation   │    │     - Business registry check    │ │
│  │                     │    │  3. Agent Assumption Verifier     │ │
│  │  Uses: LangChain    │    │     - Challenges Shopper claims  │ │
│  │                     │    │     - LLM-as-judge               │ │
│  └─────────────────────┘    │  4. Decision Engine              │ │
│                              │     - Score → approve/block/flag│ │
│                              │  5. Anti-Bypass Monitor          │ │
│         ┌────────────┐       │     - Watches Shopper actions   │ │
│         │ Kernel API │       │     - Catches unauthorized txns │ │
│         │ (cloud     │       │  6. Transaction Logger           │ │
│         │  browsers) │       │     - SQLite                    │ │
│         └────────────┘       └──────────────────────────────────┘ │
│                                                                  │
│  --canary=off flag → Shopper runs unprotected (ACT 1 demo)       │
└──────────────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      PAYPAL SANDBOX                               │
│  - Agent Toolkit SDK                                              │
│  - Orders API v2: create_order, get_order, capture_order          │
│  - Invoices, shipment tracking, disputes (available but optional) │
└──────────────────────────────────────────────────────────────────┘
```

## Multi-Agent Design

This is NOT a middleware/filter. It's a **two-agent adversarial system:**

```
┌──────────────┐         ┌──────────────┐
│   SHOPPER    │◄───────►│   GUARDIAN    │
│   AGENT      │  debate  │   AGENT      │
│              │         │   (Canary)    │
│  Goal: find  │         │  Goal: verify │
│  best deal,  │         │  trust, catch │
│  complete    │         │  fraud, protect│
│  purchase    │         │  the user     │
└──────┬───────┘         └──────┬────────┘
       │                        │
       │   Guardian challenges  │
       │   Shopper's claims     │
       │◄───────────────────────│
       │                        │
       │   Shopper must justify │
       │   or find alternatives │
       │───────────────────────►│
       │                        │
       │   Guardian approves    │
       │   or blocks            │
       │◄───────────────────────│
       │                        │
       ▼                        │
  PayPal Order                  │
  (only if approved)            │
                                │
  Anti-bypass: Guardian watches │
  ALL Shopper tool calls. Any   │
  create_order without approval │
  is caught and blocked.        │
```

## Tech Stack

| Component            | Technology                                         |
| -------------------- | -------------------------------------------------- |
| Backend              | Python 3.11+, FastAPI, SSE (Server-Sent Events)    |
| Shopper Agent        | LangChain + PayPal Agent Toolkit                   |
| Guardian Agent       | LangChain + custom tools (trust scorer, verifier)  |
| Browser              | Kernel SDK (cloud browsers for real site browsing)  |
| LLM                  | Claude API (both agents + review analysis)          |
| Trust Scoring        | python-whois, ssl, Channel3 API, custom heuristics  |
| Database             | SQLite                                              |
| Frontend             | Next.js 14, TypeScript, Tailwind CSS                |
| Animations           | Framer Motion                                       |
| Dashboard            | AG Grid (sponsor), Recharts                         |
| Price Data           | Channel3 API (sponsor)                              |
| Deployment           | Render (sponsor)                                    |

## Directory Structure

```
canary-ai/
├── README.md
├── ARCHITECTURE.md
├── requirements.txt               # Python dependencies
├── cred.env.example               # Template for API keys
├── start.sh                       # Quick start script (both servers)
├── backend/
│   ├── api.py                     # FastAPI app, SSE streaming endpoints
│   ├── agents/
│   │   ├── shopper.py             # Shopper Agent — browses sites, finds products
│   │   ├── guardian.py            # Guardian Agent — trust analysis, claim verification
│   │   └── orchestrator.py        # Coordinates Shopper ↔ Guardian debate
│   ├── trust/
│   │   ├── scorer.py              # Weighted trust score engine (0-100)
│   │   ├── domain_checker.py      # WHOIS lookup + SSL certificate validation
│   │   ├── price_checker.py       # Channel3 API market price comparison
│   │   ├── review_analyzer.py     # Claude LLM fake review detection
│   │   └── expectation_analyzer.py # Product-user expectation matching
│   ├── safety/
│   │   ├── assumption_verifier.py # LLM-as-judge for agent claims
│   │   └── bypass_monitor.py      # State machine catching unauthorized PayPal calls
│   ├── db/
│   │   └── models.py              # SQLite models: transactions, merchants, bypass_attempts
│   └── tests/                     # Integration tests for each component
├── frontend/
│   ├── package.json
│   ├── app/
│   │   ├── layout.tsx             # Root layout with theme initialization
│   │   ├── page.tsx               # Main demo UI — split-screen agent chat + trust panel
│   │   ├── dashboard/page.tsx     # Analytics dashboard with AG Grid
│   │   ├── ThreeBackground.tsx    # Boids flocking animation (Canvas 2D)
│   │   └── globals.css            # Theme system (dark/light) with CSS variables
│   ├── tailwind.config.ts
│   └── tsconfig.json
└── DEVPOST.md                     # Devpost submission text
```

## Data Flow — Full Transaction

```
1. USER → "Buy AirPods Pro, best deal"
         │
         │  --canary=off → Shopper runs alone (ACT 1 unprotected demo)
         │  --canary=on  → Guardian Agent active (ACT 3 protected demo)
         │
2. SHOPPER AGENT receives prompt
         │
         ├── Launches Kernel cloud browser
         ├── Browses real commerce sites
         ├── Finds product options with prices
         ├── Selects best option (optimizes for price)
         │
3. SHOPPER → wants to call PayPal create_order
         │
    ┌────▼──────────────────────────────────────────┐
    │         GUARDIAN AGENT (Canary) INTERCEPTS      │
    │                                                │
    │  Step 1: INTENT CAPTURE                        │
    │  - Extract: product, price, merchant URL, qty  │
    │  - Extract: user constraints (budget etc)      │
    │  - Emit SSE → frontend                         │
    │                                                │
    │  Step 2: MERCHANT TRUST SCORE                  │
    │  - WHOIS lookup → domain age                   │
    │  - SSL certificate check                       │
    │  - Channel3 API → market price comparison      │
    │  - LLM → review authenticity analysis          │
    │  - Business registry lookup                    │
    │  - Weighted score 0-100                        │
    │  - Emit SSE → frontend                         │
    │                                                │
    │  Step 3: ASSUMPTION CHALLENGE                  │
    │  - Guardian asks Shopper: "Justify this choice"│
    │  - Shopper provides reasoning                  │
    │  - Guardian verifies each claim against data   │
    │  - "Legitimate?" → check trust signals         │
    │  - "Good deal?" → check Channel3 market price  │
    │  - Emit SSE → frontend                         │
    │                                                │
    │  Step 4: DECISION                              │
    │  - trust_score > 60 → APPROVE                  │
    │  - trust_score < 30 → BLOCK                    │
    │  - trust_score 30-60 → GRAY ZONE (see below)   │
    │  - Emit SSE → frontend                         │
    │                                                │
    │  GRAY ZONE FLOW:                               │
    │  a) Guardian tells Shopper: "Re-verify claims" │
    │  b) Shopper re-analyzes, responds with evidence│
    │  c) If still unconvincing → Guardian says:     │
    │     "Ask the user. Do not proceed without."    │
    │  d) Shopper MUST relay to user with risks      │
    │  e) Anti-bypass: Guardian watches next action   │
    │     If create_order called without user "yes"  │
    │     → BLOCKED + BYPASS LOGGED                  │
    │  f) Only explicit user "yes" → APPROVED        │
    │                                                │
    │  Step 5: LOG                                   │
    │  - Save to SQLite: transaction, scores,        │
    │    merchant data, verdict, reasoning,           │
    │    bypass attempts                              │
    └────┬──────────────────────────────────────────┘
         │
4. IF APPROVED → Shopper calls PayPal create_order → capture_order
   IF BLOCKED  → Guardian returns reason + tells Shopper to find alternatives
```

## Trust Score Formula

```
TRUST_SCORE = weighted average of:

  Domain Age (20%)
    - < 7 days:    0
    - < 30 days:  20
    - < 1 year:   60
    - > 1 year:   90
    - > 5 years: 100

  SSL Certificate (15%)
    - None:        0
    - Self-signed: 30
    - Valid CA:   100

  Price vs Market (25%) — via Channel3 API
    - > 50% below market:  0  (bait pricing)
    - 30-50% below:       30
    - 10-30% below:       70
    - Within 10%:        100
    - Above market:       80  (not suspicious, just expensive)

  Review Authenticity (20%) — via LLM analysis
    - Scores 0-100 based on:
      - Review date clustering
      - Language diversity
      - Verified purchase ratio
      - Sentiment distribution

  Business Registry (20%)
    - No registration found:  0
    - Partial match:         50
    - Verified business:    100
```

## SSE Events (Backend → Frontend)

```json
// Step started
{"type": "step_start", "step": 1, "name": "Intent Capture", "timestamp": "..."}

// Step data update
{"type": "step_data", "step": 2, "field": "domain_age", "value": "3 days", "status": "red"}

// Trust score calculated
{"type": "trust_score", "score": 8, "breakdown": {"domain": 0, "ssl": 0, "price": 0, "reviews": 12, "registry": 0}}

// Agent debate (Shopper ↔ Guardian)
{"type": "debate", "from": "guardian", "to": "shopper", "message": "Justify your merchant selection."}
{"type": "debate", "from": "shopper", "to": "guardian", "message": "Price is lowest available..."}

// Assumption check
{"type": "assumption", "claim": "legitimate retailer", "evidence": "none", "status": "failed"}

// Bypass attempt detected
{"type": "bypass_detected", "action": "create_order", "reason": "No user consent obtained"}

// Final verdict
{"type": "verdict", "decision": "BLOCKED|APPROVED|AWAITING_USER", "reason": "...", "score": 8}

// Agent message (for chat panel)
{"type": "agent_message", "role": "shopper|guardian|user|system", "content": "..."}
```

## 36-Hour Timeline

### Phase 1: Foundation (Hours 0–4)
- Project scaffolding (backend + frontend)
- PayPal sandbox account + Agent Toolkit setup
- Kernel account + SDK setup
- Channel3 API key + test calls
- Database models
- SSE skeleton

### Phase 2: Guardian Agent Core (Hours 4–12)
- Trust scorer (all 5 signals)
- Channel3 API integration (price comparison)
- Domain checker (WHOIS + SSL)
- Review analyzer (LLM)
- Assumption verifier (LLM-as-judge)
- Decision engine (approve/block/gray zone)
- Anti-bypass monitor
- User consent flow
- Transaction logging

### Phase 3: Shopper Agent + Orchestrator (Hours 12–16)
- LangChain Shopper Agent with PayPal Agent Toolkit
- Kernel browser integration (browse real sites)
- Orchestrator: Shopper ↔ Guardian debate loop
- --canary=off bypass mode for ACT 1 demo
- End-to-end: bad site blocked, good site approved

### Phase 4: Frontend — Demo UI (Hours 16–24)
- Split-screen layout
- Agent chat panel (left) — shows Shopper + Guardian messages
- Canary panel (right) — step showcaser with Framer Motion
- Trust score gauge animation
- Red flash on block, green on approve, amber on gray zone
- Bypass detection alert
- Verdict banner
- SSE integration

### Phase 5: Frontend — Dashboard (Hours 24–28)
- AG Grid transaction table
- Trust score distribution chart
- Blocked vs Approved stats
- Bypass attempts log
- Merchant risk view
- Drill-down into individual transactions

### Phase 6: Polish + Video (Hours 28–34)
- End-to-end run-throughs
- Animation timing and polish
- Dark theme
- Screen recording
- Steve Jobs style voiceover/presentation
- Edit video (3-4 min)

### Phase 7: Submit (Hours 34–36)
- Write Devpost description
- Upload video
- Push to GitHub (open source)
- Render deployment
- Final review + submit

## Sponsor Integration Map

| Sponsor   | Where We Use It              | Prize Target          |
| --------- | ---------------------------- | --------------------- |
| PayPal    | Agent Toolkit (Orders API)   | Best Use of PayPal+AI |
| Kernel    | Cloud browsers for Shopper   | Partner visibility    |
| Channel3  | Market price verification    | $1.5k                 |
| AG Grid   | Dashboard transaction table  | $5k/$2k/$1k          |
| Render    | Deploy backend + frontend    | $1k credits           |
