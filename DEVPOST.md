# Devpost Submission — Canary

## Project Name
Canary

## Tagline
Your canary for agentic commerce.

## About

### Inspiration
AI shopping agents optimize for price — that's their job. But without a trust layer, they'll happily buy from a 3-day-old domain selling AirPods at 64% off market price. The payment goes through. The money is gone. No human ever verified if the merchant was real.

We asked: what if every agentic payment had a canary?

### What it does
Canary is a multi-agent trust verification system that sits between an AI shopping agent and PayPal checkout. When an AI agent wants to buy something:

1. **Shopper Agent** finds the cheapest option (intentionally naive — optimizes for price only)
2. **Guardian Agent** challenges every claim with 5 real-time trust signals:
   - **Domain age** via WHOIS (new domains = risky)
   - **SSL certificate** validation (self-signed = suspicious)
   - **Price analysis** via Channel3 API (too cheap = bait)
   - **Review authenticity** via Claude LLM (fake review pattern detection)
   - **Business registry** check (TLD heuristics + domain patterns)
3. A weighted **Trust Score** (0–100) determines: APPROVED, BLOCKED, or ASK USER
4. A **Bypass Monitor** (state machine) catches the agent if it tries to skip Guardian and call `create_order` directly

The adversarial two-agent design means the system doesn't just verify — it challenges. Guardian treats Shopper's claims as assumptions to be proven, not facts to be accepted.

### How we built it
- **Backend**: Python + FastAPI with SSE streaming for real-time event delivery
- **Agents**: Two adversarial agents (Shopper + Guardian) coordinated by an Orchestrator
- **Payments**: PayPal Agent Toolkit (Orders API v2, sandbox mode)
- **Site Browsing**: Kernel SDK cloud browsers — agents browse real websites, not cached data
- **Price Data**: Channel3 API (100M+ products) for market price comparison
- **AI Intelligence**: Anthropic Claude (Haiku) for review analysis and assumption verification
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + Framer Motion for the demo UI
- **Analytics**: AG Grid-powered dashboard for transaction history and trust analytics
- **Database**: SQLite (WAL mode) for transactions, merchants, and bypass attempts

### Challenges we ran into
- **PayPal Agent Toolkit** had an undocumented import path change (`shared.context` → `shared.configuration`) that took debugging to find
- **Stale React closures** — `useCallback` captured old state, so the canary toggle didn't work in auto-start mode. Fixed with explicit parameter overrides
- **Agent bypass detection** — designing a state machine that catches an AI agent trying to circumvent user consent without false positives required careful state tracking
- **Real-time streaming** — bridging synchronous agent execution with async SSE required an asyncio.Queue event bridge pattern

### Accomplishments we're proud of
- The adversarial agent design actually works — Guardian catches scams that Shopper happily approves
- The bypass monitor catches unauthorized PayPal API calls with zero false positives
- The split-screen demo makes the "with vs without" contrast visceral — you watch the scam go through, then watch Canary block it
- Real trust signals from real APIs — no mocked data, no hardcoded scores

### What we learned
- Trust in agentic commerce isn't just about verifying merchants — it's about verifying your own agent's assumptions
- The adversarial multi-agent pattern (one agent challenges another) produces better outcomes than a single agent trying to be both smart and safe
- Price anomaly detection needs market data (Channel3) to be meaningful — "cheap" is relative

### What's next for Canary
- User consent flow for the AWAITING_USER gray zone (30–60 trust score)
- Merchant reputation memory — trust scores that improve over time with successful transactions
- Multi-agent marketplace where different Guardian strategies compete
- Browser-based evidence collection (screenshots of red flags via Kernel)
- Production PayPal integration (live mode, not sandbox)

## Built With
- python
- fastapi
- nextjs
- typescript
- tailwindcss
- framer-motion
- ag-grid
- paypal-agent-toolkit
- anthropic-claude
- kernel-sdk
- channel3-api
- sqlite

## Try it out
- **GitHub**: https://github.com/massifcoder/canary-ai
- **Demo**: See video

## Prize Categories
- Best Overall
- Best Use of Agentic Commerce
- Most Impactful
- Best Use of PayPal + AI
- Best Demo Delivery
- Best Use of AG Grid (sponsor)
- Best Use of Channel3 (sponsor)
