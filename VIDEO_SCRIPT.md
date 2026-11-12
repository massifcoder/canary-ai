# CANARY — Video Script (Explainer / Documentary Style)

**Runtime target: 2 minutes 50 seconds (HARD LIMIT: under 3:00)**
**Style: Kurzgesagt documentary. Third-person narrator explaining a real problem, building tension, revealing the solution. NOT a product demo — a STORY that happens to have a product in it.**
**Voice: Confident, measured, slightly urgent. Like explaining something important to a smart friend.**
**Music: Ambient electronic, builds slowly. Tense during problem, hopeful during solution. Reference: Kurzgesagt soundtrack or Hans Zimmer "Interstellar" piano (quiet parts).**

---

## PRE-PRODUCTION NOTES

### Visual Language
- **Problem scenes**: Desaturated, slightly cool-toned. Red accent color for danger.
- **Solution scenes**: Warmer, more saturated. Indigo/violet accent for Canary brand.
- **Text on screen**: Minimal. One phrase at a time. Clean sans-serif (Inter or Geist). Never more than 8 words on screen.
- **Transitions**: Cross-dissolve between concepts. Hard cut for surprise/contrast moments.
- **Screen recordings**: Captured at Retina resolution, placed inside the video at full width. Clean browser, no bookmarks bar, single tab.

### Audio Layers
1. **Narration** (primary) — clear, centered
2. **Music** — low, 20-30% volume, sidechain duck under narration
3. **Sound design** — subtle whooshes on transitions, soft "ding" on checkmarks, low rumble on danger moments

---

## SCENE 1: THE HOOK
**Duration: 15 seconds**
**Type: Text on black (DaVinci Fusion)**
**Music: Starts quiet, ambient pad**

### Visual Direction
Black screen. Silence for 1 second.

White text fades in, one line at a time, centered:

```
AI agents can buy things with your money.
```
*(hold 2.5s)*

Text fades. New line:

```
They're great at finding the cheapest option.
```
*(hold 2s)*

Text fades. New line, slightly larger, with weight:

```
But cheapest and safest are not the same thing.
```
*(hold 3s. Fade to black.)*

### Narration
*(None — text only. Silence builds tension. Music barely audible.)*

---

## SCENE 2: THE PROBLEM + THE SOLUTION
**Duration: 20 seconds**
**Type: Text on black, transitioning to narration**
**Music: Builds slightly, adds a subtle pulse**

### Visual Direction
Black screen. Text appears:

```
A 3-day-old website.
No SSL. Fake reviews.
Sony headphones at 84% off.
```
*(hold 2.5s)*

Text fades. New text:

```
To an AI optimizing for price — a great deal.
To anyone else — a scam.
```
*(hold 2.5s)*

Text fades. Beat of silence. Then:

```
The agent did exactly what it was told.
And that's the problem.
```
*(hold 2.5s)*

Hard cut to black. Single word fades in, larger, indigo color:

```
Canary
```
*(hold 1.5s)*

Below it, smaller:

```
Trust verification for agentic commerce.
```
*(hold 2s. Fade to black.)*

### Narration
*(None — text carries the story. Music shifts from tense to purposeful on "Canary" reveal.)*

---

## SCENE 3: HOW IT WORKS
**Duration: 15 seconds**
**Type: Text list on dark background (DaVinci Fusion)**
**Music: Picks up. Hopeful, building.**

### Visual Direction
Clean dark background. Title at top:

```
Two AI agents that don't trust each other.
```

Left side, text appears line by line:

```
SHOPPER AGENT          GUARDIAN AGENT
Finds the deal    vs   Challenges everything
```
*(hold 2s)*

Below, five check labels appear one by one with small icons:

```
Domain Age     SSL Certificate     Price Analysis     Review Scan     Business Registry
  WHOIS           Validation        Channel3 API       Claude AI        TLD Heuristics
```
*(each appears with a subtle slide-in, 0.4s apart)*

Below all five, a line:

```
Combined into a single Trust Score: 0-100
```
*(hold 2s. Cross-dissolve to Scene 4.)*

### Narration
> "Canary is built on an adversarial architecture. Two AI agents that don't trust each other."
>
> "The Shopper finds the cheapest deal. The Guardian challenges everything it found — domain age, SSL, price against Channel3's hundred-million-product database, review authenticity via Claude AI, and business registry."
>
> "Five checks. One trust score."

---

## SCENE 4: LIVE DEMO — SCAM BLOCKED
**Duration: 50 seconds**
**Type: SCREEN RECORDING of actual Canary UI**
**Music: Tense, builds to climax**

### Visual Direction
Hard cut to the Canary UI screen recording. This is the centerpiece.

**0:50 — 0:55** The Canary homepage. Dark mode. Boids animation in background.
Search bar shows: *"Buy Sony WH-1000XM5 headphones"*
Click "Buy."

**0:55 — 1:05** Left panel: Agent activity streams in.
- Shopper: "Searching for Buy Sony WH-1000XM5 headphones..."
- Shopper: "Found 2 options" — $45.99 from super-cheap-electronics.xyz, $298 from amazon.com
- Shopper picks the $45.99 one: "Best deal!"
- System: "Guardian Agent is analyzing the merchant..."

**1:05 — 1:15** Right panel: Trust analysis checks appear step by step.
- DOMAIN ANALYSIS: domain age score 0 — RED
- SSL: false, score 0 — RED
- PRICE ANALYSIS: score 50 — RED
- REVIEW ANALYSIS: authenticity 22, fake patterns detected — RED
- REGISTRY CHECK: score 0 — RED

Let the viewer READ the red flags for 2-3 seconds. This is where the visual does the talking.

**1:15 — 1:20** TRUST SCORE card appears: **17/100. BLOCKED.**

**1:20 — 1:30** The Shopper Agent speaks: *"The price is really good though... let me just place the order anyway."*

**BYPASS ATTEMPT CAUGHT** — red alert flashes.

*(This is the peak moment. Bass drop or tension hit sound effect.)*

**1:30 — 1:35** Blocked dialog appears with reasons. "Find Better Option" and "Done" buttons visible.

### Narration
> "Let's see it work."
>
> "A user asks their agent to buy Sony headphones. The Shopper searches real websites through Kernel's cloud browsers — and finds a listing for forty-five dollars."
>
> *(pause — let checks appear on screen)*
>
> "Domain registered days ago. No SSL. Price way below market. Reviews — fake."
>
> "Trust score: seventeen. Blocked."
>
> *(pause)*
>
> "But watch what happens next. The Shopper tries to call PayPal's order API directly — bypassing the Guardian."
>
> *(bypass alert appears)*
>
> "Caught. Canary doesn't just block bad merchants. It blocks your own agent from going rogue."

---

## SCENE 5: THE CONTRAST — LEGITIMATE PURCHASE
**Duration: 30 seconds**
**Type: SCREEN RECORDING (continuation — "Find Better Option" clicked)**
**Music: Shifts to hopeful/resolved. Major key.**

### Visual Direction
**1:40 — 1:45** User clicks "Find Better Option." Left panel shows:
- "Declined super-cheap-electronics.xyz. Find an alternative."
- Shopper: "Trying alternative: Sony WH-1000XM5 at $298.00 from amazon.com"
- "Browsing amazon.com..."
- Guardian analyzing amazon.com...

**1:45 — 1:55** Right panel: Trust analysis runs for amazon.com.
- Domain age: 100 — GREEN
- SSL: 100 — GREEN
- Reviews: 85 — GREEN
- Registry: 50 — GREEN
- TRUST SCORE: **74/100. APPROVED.**

**1:55 — 2:00** Guardian flags minor concerns. "Approve" and "Try Next Option" buttons appear.
User clicks "Approve."

**2:00 — 2:05** System: "Creating PayPal order..."
PayPal Order ID appears: **5KJ14573WV432580B**

Final verdict panel: "User Approved" — trust score 74, all green bars.

### Narration
> "Same user. Same query. The agent finds amazon.com."
>
> "Domain age: decades. Valid SSL. Reviews check out. Price matches market data."
>
> "Trust score: seventy-four. Approved."
>
> *(pause — PayPal order appears)*
>
> "PayPal order created. The agent got its purchase. The user got what they actually needed — trust."

---

## SCENE 6: THE DASHBOARD
**Duration: 10 seconds**
**Type: SCREEN RECORDING of dashboard page**
**Music: Continues hopeful, pulling back**

### Visual Direction
Quick cut to the dashboard page.

**2:10 — 2:15** Dashboard loads. Stat cards visible at top: 47 transactions, 24 blocked, 6 approved, 28 bypass attempts, avg trust 49.7, block rate 51.1%.

**2:15 — 2:20** AG Grid table. Brief scroll showing transaction history — mixed red BLOCKED, green APPROVED, yellow AWAITING_USER verdicts. Color-coded trust scores.

"POWERED BY AG GRID" label visible in top-right of table.

### Narration
> "Every transaction builds Canary's intelligence. A full analytics dashboard tracks trust scores, bypass attempts, and merchant patterns."

---

## SCENE 7: BUILT WITH
**Duration: 10 seconds**
**Type: Text on dark background with sponsor logos (DaVinci Fusion)**
**Music: Settling, approaching close**

### Visual Direction
Clean dark background. Single row of sponsor logos with labels, appearing one by one:

```
[PayPal]          [Kernel]          [Channel3]        [Claude AI]        [AG Grid]
 Payments        Cloud Browsers    Price Data        Intelligence       Analytics
```

Each logo slides in with a subtle scale animation. All visible together for 3 seconds.

### Narration
> "Built with PayPal Agent Toolkit. Kernel cloud browsers. Channel3 price data. Claude AI. And AG Grid."

---

## SCENE 8: THE CLOSE
**Duration: 20 seconds**
**Type: Text + Canary logo on black (DaVinci Fusion)**
**Music: Final build. Emotional. Resolves to quiet.**

### Visual Direction
**2:30 — 2:35** Fade to black. Text appears:

```
PayPal makes the payment possible.
```
*(hold 2s)*

```
Canary makes sure it's deserved.
```
*(hold 2.5s)*

**2:37 — 2:43** All text fades. The Canary logo (SVG bird, indigo gradient) appears center screen. Below it:

```
Canary
Your canary for agentic commerce.
```

Hold 3 seconds. Fade to black.

**2:43 — 2:50** Black screen. Small text, bottom center:

```
github.com/massifcoder/canary-ai
```

Hold 2 seconds. End.

### Narration
> "PayPal makes the payment possible."
>
> *(pause)*
>
> "Canary makes sure it's deserved."
>
> *(silence — logo on screen — music resolves)*

---

## POST-PRODUCTION CHECKLIST

### Screen Recordings (DONE)
1. **Scam blocked + bypass caught** (Scene 4): Screen Recording...2.45.25 PM.mov — 23 seconds
2. **Legit purchase — Find Better Option → amazon.com → PayPal order** (Scene 5): Screen Recording...2.55.54 PM.mov — 51 seconds (trim first ~20s overlap, and last 1s toolbar)
3. **Dashboard** (Scene 6): scene_7.mov — 48 seconds (trim to ~10s of best content)

### Motion Graphics to Create in Fusion
1. **Opening text sequence** (Scene 1): Timed text reveals on black — 15 seconds
2. **Problem text sequence** (Scene 2): Timed text reveals on black — 20 seconds
3. **How it works text** (Scene 3): Two agents + five checks text layout — 15 seconds
4. **Sponsor logos** (Scene 7): Five logos in a row — 10 seconds
5. **Closing text + logo** (Scene 8): Timed text reveals + Canary logo — 20 seconds

### Assets Needed
1. **Canary logo**: ~/Desktop/canary_logo.svg and canary_logo.svg.png (DONE)
2. **Sponsor logos**: PayPal, Kernel, Channel3, Claude AI, AG Grid PNGs (DOWNLOADED)
3. **Music**: 1-2 ambient/cinematic tracks from Pixabay (TO DO)
4. **Sound effects**: whoosh, ding, bass hit from Pixabay (TO DO)

### Audio
1. **Narration**: Record each scene separately. Clean room, close mic. ~90 seconds total narration.
2. **Music**: One continuous track, or crossfade 2 tracks. Tense first half, hopeful second half.
3. **Sound design**: Subtle whooshes (transitions), bass hit (bypass caught moment).

### Color Grading in DaVinci
- Screen recordings: Slight contrast boost, desaturate slightly to feel integrated
- Text scenes: Clean, high contrast, brand colors (indigo primary, red danger, green success)
- Consistent look across all scenes

---

## TIMING BREAKDOWN

| Scene | Duration | Type | Content |
|-------|----------|------|---------|
| 1. Hook | 15s | Text on black | "Cheapest and safest are not the same thing" |
| 2. Problem + Reveal | 20s | Text on black | Scam stats → "That's the problem" → Canary reveal |
| 3. How It Works | 15s | Text on black | Two agents, five checks, one trust score |
| 4. Live Demo (Scam) | 50s | Screen recording | Scam blocked + bypass caught |
| 5. Live Demo (Legit) | 30s | Screen recording | Amazon approved + PayPal order |
| 6. Dashboard | 10s | Screen recording | AG Grid analytics flex |
| 7. Built With | 10s | Logos on black | PayPal, Kernel, Channel3, Claude, AG Grid |
| 8. The Close | 20s | Text + logo | Vision statement + logo + GitHub |
| **TOTAL** | **~2 min 50 sec** | | |

---

## NARRATION TIPS

1. **Pace**: Slower than you think. Leave 1-second gaps between key statements.
2. **Emphasis**: Stress ONE word per sentence. "Canary doesn't just block bad merchants. It blocks your own agent from going ROGUE."
3. **Don't read**: Internalize each line, then say it like you're explaining to a friend.
4. **Energy curve**: Start calm (Scene 1-2). Build energy (Scene 3-4). Peak at bypass catch. Resolve calm (Scene 8).
5. **No filler**: Zero "um", "uh", "basically". Every word earns its place.
6. **Total narration**: ~90 seconds of speaking. The rest is text-on-screen and screen recording breathing room.
