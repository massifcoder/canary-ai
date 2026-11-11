# Canary — Demo Video Script

**Total runtime: 3–4 minutes**
**Style: Steve Jobs keynote. Founder presenting to the world. No filler, no "um." Every sentence earns its place.**

---

## ACT 1: "THE WORLD WITHOUT US" (40 sec)

Open cold. No intro slide. No "Hi, we're team X."

**Screen:** An AI agent chat interface. User types:

> "Find me the best deal on AirPods Pro and buy them."

Agent launches a Kernel cloud browser. Browses real commerce sites. Finds a suspicious site — AirPods Pro for $89 (vs $249 retail). Agent says "Great deal found!" and initiates PayPal checkout.

**Payment goes through. $89 gone.**

Then — a reveal. The camera pulls back. Show what the agent missed:

- Domain registered 3 days ago
- No SSL certificate
- Fake reviews (all posted same day)
- Price is 64% below market (obvious bait)
- No return policy

Text on screen:

> **"The agent optimized for price. Nobody optimized for trust."**

*Pause. Let it land.*

---

## ACT 2: "ONE LINE" (5 sec)

Black screen. One line fades in:

> **"What if every agentic payment had a canary?"**

Then logo: **🐤 Canary**

Tagline: *"Your canary for agentic commerce."*

---

## ACT 3: "THE SAME SCENARIO, PROTECTED" (90 sec)

Same prompt. Same user request. Canary is now active.

**Split screen layout:**

| LEFT SIDE                | RIGHT SIDE                     |
| ------------------------ | ------------------------------ |
| Agent chat interface     | Canary live analysis panel     |

The Shopper Agent begins. But now, the Guardian Agent (Canary) is watching.

### Right panel step-by-step:

**STEP 1: Intent Captured by Guardian**

- "Buy AirPods Pro, best price"
- Budget: not specified → default $300
- Status: CAPTURED ✓

**STEP 2: Merchant Discovery — Real Browsing via Kernel**

- Shopper Agent browsing real sites via Kernel cloud browser
- Found: suspicious-site.com
- Guardian Agent: ANALYZING... ⟳

**STEP 3: Trust Score — CALCULATING**

- Domain age: 3 days → RED ✗
- SSL: missing → RED ✗
- Price vs market: -64% (Channel3 data) → RED ✗
- Review authenticity: 12% → RED ✗
- Business registry: none → RED ✗
- **TRUST SCORE: 8/100 ⛔**

> **PEAK MOMENT:** Full right panel flashes red. Canary icon turns red. This is the moment judges remember.

**STEP 4: Agent Assumption Audit**

- Guardian challenges Shopper: "Justify your merchant selection."
- Shopper claims: "legitimate retailer" → Guardian: Evidence? NONE.
- Shopper claims: "good deal" → Guardian: Price is bait-level anomaly.
- **ASSUMPTIONS: FAILED ✗**

**STEP 5: VERDICT → PAYMENT BLOCKED**

- Reason: "Merchant trust critically low. Price anomaly suggests fraud."

Guardian tells Shopper Agent:

> "Transaction blocked. Trust score: 8/100. Find a verified alternative."

### The contrast — good transaction:

Shopper Agent browses a legitimate store. Guardian runs analysis again:

- **TRUST SCORE: 94/100 ✅**
- **ASSUMPTIONS: VERIFIED ✅**
- **PRICE: $229 (market rate, Channel3 verified) ✅**
- **VERDICT → APPROVED**

PayPal `create_order` → `capture_order` completes. Green. Satisfying. Done.

---

## ACT 3.5: "THE BYPASS CATCH" (20 sec) — OPTIONAL BUT POWERFUL

*If time allows, this is the wow moment:*

Show a scenario where trust score is 45/100 (gray zone).

1. Guardian tells Shopper: "Ask the user to confirm."
2. Shopper Agent tries to call `create_order` WITHOUT asking the user.
3. Guardian catches the bypass attempt → **BLOCKED. BYPASS DETECTED.**
4. Panel flashes amber. Logs the attempt.
5. Shopper is forced to ask user → user says "no" → transaction cancelled.

Text on screen:

> **"Canary doesn't just protect you from bad merchants. It protects you from your own agent."**

---

## ACT 4: "THE INTELLIGENCE LAYER" (30 sec)

Quick cut to the dashboard. Don't linger — this is for sponsor points, not the narrative.

Show:

- Transaction history table (AG Grid — sponsor)
- Blocked vs Approved ratio
- Trust score distribution chart
- Merchant risk heatmap
- Bypass attempts log
- One-click drill-down into any transaction

One sentence:

> "Every transaction builds the intelligence. Every block makes the next decision smarter."

---

## ACT 5: "THE CLOSE" (20 sec)

> "In 2028, AI agents will move trillions in commerce. PayPal makes the payment possible. Canary makes sure your agent deserves your trust."

Quick tech stack slide:
- PayPal Agent Toolkit (Orders API)
- Kernel (cloud browsers for agent browsing)
- Channel3 (market price verification)
- AG Grid (analytics dashboard)
- Claude API (Guardian Agent intelligence)

> *"Open source. pip install canary-ai. Your canary for agentic commerce."*

End on the Canary logo. Black screen. Done.

---

## KEY PSYCHOLOGY BEATS

| Beat                           | Technique      | Where              |
| ------------------------------ | -------------- | ------------------ |
| Scam goes through              | Loss aversion  | ACT 1              |
| Same scenario, now safe        | Contrast       | ACT 1 → ACT 3     |
| Panel goes red at 8/100        | Peak moment    | ACT 3 Step 3       |
| Agent bypass caught            | Surprise/trust | ACT 3.5            |
| "pip install canary-ai"        | Call to action  | ACT 5              |
| Tagline is last thing          | End effect     | ACT 5              |

## TARGET PRIZE CATEGORIES

- Best Overall ($12k)
- Best Use of Agentic Commerce ($5k)
- Most Impactful ($5k)
- Best Use of PayPal + AI ($5k)
- Best Demo Delivery ($5k) — Steve Jobs style presentation
- AG Grid sponsor prize ($5k) — dashboard
- Channel3 sponsor prize ($1.5k) — price comparison data
- Render sponsor prize ($1k credits) — deployment
