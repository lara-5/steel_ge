## 1. What You're Building

A **modular, use-case-driven course** split into 8 subcourses. Each subcourse:

- Is **self-contained** (one goal, one project, one publishable series)
- Has **3–6 units** (one article/lesson each)
- Ends in a **working project** a learner can keep and extend
- Can be read **standalone or sequentially**

The full course is also a coherent path from zero to production browser automation.

---

## 2. Tone — The Big Decision

### The tension

Steel's brand voice is **"senior engineer who ships, refuses to hand-wave, a little sharp."**
A tutorial/course voice is usually **"patient teacher, step-by-step, no assumptions."**

These are not the same. You need to decide where on the spectrum you sit — and stay there consistently.

### Recommended position: **"Peer who's done this before"**

Not a beginner hand-holder. Not a brand doc.
A developer who has already solved this, is showing you how they did it, and respects your time.

This means:

- **No "In this tutorial, we will learn..."** — just start doing the thing
- **Explain the why**, not just the what ("We use `cleaned_html` here because raw HTML bloats your LLM context 3–5x")
- **Acknowledge the rough edges** ("This works until the site detects you — we fix that in Subcourse 4")
- **Short sentences. Active voice. Concrete examples.**
- **Light dry humor allowed** when it names a real pain ("Yes, another SPA that renders nothing without JS. Welcome.")
- Contractions are fine — "you'll", "we're", "it's"
- No exclamation points for emphasis. Let the demo speak.

### Tone rules by content type

| Content type | Tone |
|---|---|
| Article intro (hook) | Sharp, problem-first. Name what sucks before you fix it. |
| Conceptual explanation | Precise. Use analogies only if they're genuinely shorter. |
| Code walkthrough | Neutral and exact. Let code comments carry personality. |
| "What's next" teasers | Slightly forward-leaning — hint at the problem without overselling. |
| Error handling sections | Direct and calm. No drama, no hand-waving. |
| Project recap | Grounded. What you built, what it's actually good for. |

### What to avoid

- "Amazing", "powerful", "seamlessly", "game-changer"
- Rhetorical questions as section headers ("But what IS a session?")
- Excessive bolding — if everything is bold, nothing is
- Filler transitions ("Now that we've learned X, let's move on to Y")

---

## 3. The Entry Point — Helping Users Find Their Subcourse

Before the course content, you need **one landing artifact** that routes people to the right subcourse. This can be a README, a website page, or both.

### The routing mechanism

A short **decision flow**, not a wall of text:

```
What are you trying to do?

→ Extract content from a webpage (scraping, markdown, screenshots)
    → Subcourse 1: Web Scraping & Data Extraction

→ Build an agent that clicks, types, and navigates
    → Subcourse 2: Browser Automation & AI Agents

→ Automate something that requires login
    → Subcourse 3: Authentication & Persistent Logins

→ Getting blocked or rate-limited
    → Subcourse 4: Stealth, Proxies & Anti-Bot Bypass

→ Need custom browser behavior (extensions, ad blocking)
    → Subcourse 5: Chrome Extensions & Customization

→ Working with file downloads or uploads in a browser workflow
    → Subcourse 6: File Management & Session Artifacts

→ Moving an existing automation to production
    → Subcourse 7: Observability, Debugging & Production Ops

→ None of the above / starting from zero
    → Start with Subcourse 0, then pick from the list above
```

This goes in:
- The repo root `README.md`
- The first section of any "start here" article
- Optionally: a lightweight HTML page if you publish to a site

### Prerequisite signaling

Every subcourse article/README should have a clear top-of-page block:

```
Prerequisites: Subcourse 0 (Fundamentals)
Time: ~2 hours
Project: [project name]
```

---

## 4. Article Structure (Per Unit)

Each unit = one article. Articles follow this structure — not rigidly, but consistently enough that readers know what to expect.

### Template

```
## [Unit Title]

[1–3 sentence hook. Name the problem this solves or the thing that's broken without it.]

### What you'll build
[One sentence. Concrete output, not abstract skill.]

### [Section: The concept]
[Explanation. Short. Why before how. One analogy max.]

### [Section: The code]
[Walkthrough. Inline comments. Don't explain in prose what the code already says.]

### [Section: What just happened]
[Optional — only if the concept needs reinforcing after seeing it in code.]

### [Section: Edge cases / common errors]
[At least one. This is what separates a good tutorial from a useless one.]

---
[Teaser for next unit — 2–3 sentences max. Name the next problem, don't describe the solution.]
```

### Length guidelines

- **Concept-heavy units:** 800–1,200 words + code
- **Code-heavy units:** 500–800 words + code (let code carry weight)
- **Project units (final unit of subcourse):** 1,000–1,500 words — this is the capstone

Do not pad. If a unit is 600 words and complete, it's 600 words.

---

## 5. Project Design (Per Subcourse)

Each subcourse ends with **one working project**. The project is introduced in unit 1 ("by the end of this subcourse, you'll have built X"), developed incrementally across units, and completed in the final unit.

### Project principles

- **Real enough to be useful** — not a toy, but not so complex it becomes the point
- **Extensible** — the reader should be able to see how to take it further
- **Runnable in <5 minutes** after cloning the repo
- **One file or one folder** — don't make project setup a unit of its own


### Project ideas per subcourse

| # | Project | Units |
|---|---|---|
| 0 — Fundamentals | A script that creates a session, navigates to a URL, takes a screenshot, and releases the session. The "hello world" of Steel. | 1. What is Steel · 2. Setup & auth · 3. Your first session · 4. Debug viewer · 5. Quick Actions vs Sessions |
| 1 — Scraping | A multi-page scraper that extracts article content from a site, converts to markdown, and saves to local JSON. Includes a screenshot verification step. | 1. Quick scrape · 2. JS-rendered content · 3. Session scraping · 4. Proxy-assisted scraping · 5. Screenshots & PDFs · 6. Scraping pipeline |
| 2 — Automation | A browser agent loop: take a screenshot → send to a vision model → parse the action → execute via Computer Use API → repeat until goal met. | 1. Connecting automation library · 2. Session config for agents · 3. Computer Use API · 4. Agent loop · 5. Live session management · 6. Session context |
| 3 — Auth | A credential-persisted login workflow: log in once, save session context, resume authenticated sessions across multiple runs without re-logging in. | 1. The auth problem · 2. Login & extract context · 3. Resuming logged-in sessions · 4. Credentials API · 5. Auto-submit & injection · 6. Persistent profiles |
| 4 — Stealth | A scraper that progressively applies stealth layers (proxy → fingerprinting → CAPTCHA solving) and shows the difference in success rate. | 1. Why bots get blocked · 2. Stealth config · 3. Using proxies · 4. CAPTCHA handling · 5. Bandwidth optimization · 6. Device emulation |
| 5 — Extensions | A session factory that loads a custom extension (e.g., cookie consent dismisser) and demonstrates behavior before/after. | 1. Why extensions in automation · 2. Uploading extensions · 3. Managing the library · 4. Attaching to sessions · 5. blockAds option |
| 6 — Files | A workflow that navigates to a page, triggers a file download, retrieves it via the Files API, and stores it globally for use in a follow-up session. | 1. File storage scopes · 2. Session file operations · 3. Global file operations · 4. Practical workflows |
| 7 — Production | A monitored session runner with: retry logic, region failover, event stream logging, and a replay viewer embed. | 1. Session lifecycle & monitoring · 2. Live debugging · 3. Session recording & replay · 4. Multi-region deployments · 5. Concurrency & scaling · 6. JWT verification & security |

### APIs per subcourse

| # | APIs Used |
|---|---|
| 0 — Fundamentals | `POST /v1/sessions` · `GET /v1/sessions/{id}` · `POST /v1/sessions/{id}/release` · `POST /v1/screenshot` |
| 1 — Scraping | `POST /v1/scrape` · `POST /v1/screenshot` · `POST /v1/pdf` · `POST /v1/sessions` · `POST /v1/sessions/{id}/release` |
| 2 — Automation | `POST /v1/sessions` · `GET /v1/sessions` · `GET /v1/sessions/{id}` · `GET /v1/sessions/{id}/context` · `GET /v1/sessions/{id}/live-details` · `POST /v1/sessions/{id}/release` · `POST /v1/sessions/{id}/computer` |
| 3 — Auth | `POST /v1/sessions` · `GET /v1/sessions/{id}/context` · `POST /v1/credentials` · `GET /v1/credentials` · `PUT /v1/credentials` · `DELETE /v1/credentials` · `POST /v1/profiles` · `GET /v1/profiles` · `GET /v1/profiles/{id}` · `PATCH /v1/profiles/{id}` |
| 4 — Stealth | `POST /v1/sessions` (with `useProxy`, `stealthConfig`, `solveCaptcha`, `deviceConfig`) · `POST /v1/scrape` · `GET /v1/sessions/{id}/captchas/status` · `POST /v1/sessions/{id}/captchas/solve` · `POST /v1/sessions/{id}/captchas/solve-image` |
| 5 — Extensions | `POST /v1/extensions` · `GET /v1/extensions` · `DELETE /v1/extensions` · `GET /v1/extensions/{id}` · `PUT /v1/extensions/{id}` · `DELETE /v1/extensions/{id}` · `POST /v1/sessions` (with `extensionIds`, `blockAds`) · `POST /v1/screenshot` |
| 6 — Files | `POST /v1/sessions/{id}/files` · `GET /v1/sessions/{id}/files` · `DELETE /v1/sessions/{id}/files` · `GET /v1/sessions/{id}/files/{path}` · `DELETE /v1/sessions/{id}/files/{path}` · `GET /v1/sessions/{id}/files.zip` · `POST /v1/files` · `GET /v1/files` · `GET /v1/files/{path}` · `DELETE /v1/files/{path}` |
| 7 — Production | `POST /v1/sessions` (with `region`, `concurrency`, `namespace`) · `GET /v1/sessions` · `GET /v1/sessions/{id}` · `GET /v1/sessions/{id}/events` · `GET /v1/sessions/{id}/hls` · `GET /v1/sessions/{id}/live-details` · `POST /v1/sessions/release` · `GET /.well-known/jwks.json` |


### Unit → Project progression

Each unit should leave the project one step more complete:

- **Unit 1:** Introduce the project goal, scaffold the repo structure
- **Unit 2–N-1:** Add one meaningful capability per unit
- **Final unit:** Wire everything together, discuss what to do next

The teaser at the end of each unit should reference the project ("In the next unit, we add proxy support — because this script fails on about 30% of requests without it").

---

## 6. Repo Structure

```
steel-course/
├── README.md                        ← Entry point + routing decision flow
├── CONTRIBUTING.md
├── .env.example                     ← Steel API key, proxy config, etc.
│
├── 00-fundamentals/
│   ├── README.md                    ← Subcourse overview, prereqs, project description
│   ├── 01-what-is-steel/
│   │   └── README.md               ← Unit article (or link to published article)
│   ├── 02-setup-and-auth/
│   │   ├── README.md
│   │   └── index.js (or .py)       ← Runnable code for the unit
│   ├── 03-first-session/
│   │   ├── README.md
│   │   └── first-session.js
│   ├── 04-debug-viewer/
│   │   └── README.md
│   ├── 05-quickactions-vs-sessions/
│   │   └── README.md
│   └── project/
│       ├── README.md               ← Project instructions
│       └── hello-steel.js          ← Complete project file
│
├── 01-scraping/
│   ├── README.md
│   ├── 01-quick-scrape/
│   ├── 02-js-rendered-content/
│   ├── 03-session-scraping/
│   ├── 04-proxy-scraping/
│   ├── 05-screenshots-pdfs/
│   ├── 06-scraping-pipeline/
│   └── project/
│       └── article-scraper.js
│
├── 02-automation/
│   └── ...
│
├── 03-auth/
│   └── ...
│
├── 04-stealth/
│   └── ...
│
├── 05-extensions/
│   └── ...
│
├── 06-files/
│   └── ...
│
├── 07-production/
│   └── ...
│
└── shared/
    ├── steel-client.js             ← Shared API client / session helpers
    └── utils.js                    ← Shared utilities (retry, logging, etc.)
```

### File naming conventions

- **Folders:** `kebab-case`, numbered with zero-padding (`01-`, `02-`)
- **Code files:** descriptive, not `index.js` except for entry points
- **README.md:** every folder has one — this is the unit article or the subcourse overview
- **No `src/` nesting** — keep it flat and readable without an IDE

### Code language

Decide before you start: **one primary language, one secondary**.

Recommendation: **Node.js (JavaScript) primary, Python secondary**.

Reasoning:
- Steel's SDK targets both; Node is slightly more common in the scraping/agent space
- If you pick one and write clean code, readers can port it themselves
- Offering both adds maintenance burden — if you do it, use a `/python` subfolder per project

---

## 7. Publishing Structure (Articles)

If you publish articles (blog, dev.to, your own site), each unit maps to one article.

### Article metadata to define per piece

```
Title:        [Direct, problem-first. Not "Introduction to X"]
Subcourse:    [Which subcourse this belongs to]
Unit:         [Unit number within subcourse]
Series slug:  steel-scraping / steel-auth / steel-stealth / etc.
Tags:         steel, browser-automation, [use-case tag]
Prereqs:      [Link to Subcourse 0 or prior unit]
Repo link:    [Direct link to the unit folder in the repo]
```

### Title pattern

Not: "Getting Started with Steel Sessions"
Yes: "How to Scrape JavaScript-Rendered Pages with Steel" or "Steel Sessions: What They Are and Why They're Not Just a Browser"

Direct, specific, searchable. The title should tell a developer whether to click or not in 3 seconds.

### Cross-linking

- Every article links to: the unit's code folder, the previous unit, the next unit
- Every article has a "skip to the project" anchor for experienced readers
- Every subcourse's first article links to the routing decision flow

---

## 8. The "Teaser" Pattern

Every unit (except the final project unit) ends with a teaser for what's next. This is a craft choice — it should feel like a natural "what breaks next" reveal, not a marketing upsell.

### Formula

> **[Name the limitation of what you just built]** + **[Name the next unit's solution]** — no more.

### Examples

After Unit 1 (Quick Scrape):
> This works great for static sites. The moment a page renders its content with JavaScript, you'll get empty content or placeholder HTML. That's the next problem.

After Unit 3 (Session Scraping):
> The scraper works, but if you run it against a well-protected site, you'll start getting blocked within a few hundred requests. Proxies and stealth config are next.

After Unit 5 (Screenshots & PDFs):
> Now you can extract and verify. But right now each run starts fresh — no persistence, no login state, no way to pick up where you left off. That's what Subcourse 3 is for.

**Don't tease the solution in detail.** Name the problem. Let curiosity do the rest.

---

## 9. Decisions to Make Before Starting

These are the things you need to lock in before writing. Listed in order of urgency.

### High priority (decide now)

| - | Decision | Options | Recommendation |
|---|---|---|---|
| 1| Tone | Steel company brand tone / course tone / peer who's done this before(inbetween)  | Peer who's done this before(inbetween) |
| 2| Reuse happy path for 0th task | Yes / no | yes |
| 3| Primary code language | Node.js / Python / both | Node.js primary |
| 4| Publishing platform | Both site and Github / GitHub only | - |


---

## 10. What "Done" Looks Like Per Subcourse

Before calling a subcourse complete and publishing:

- [ ] Every unit has a working, runnable code example
- [ ] The project folder has a `README.md` with setup instructions and expected output
- [ ] `.env.example` is updated with any new keys/vars introduced
- [ ] The subcourse `README.md` links to all units and the project
- [ ] The root `README.md` decision flow links to this subcourse
- [ ] Every unit article has the prerequisite block at the top
- [ ] Every unit except the last has a teaser
- [ ] Code has been run against the actual Steel API (not mocked)
- [ ] At least one "common error" is documented per unit

---

## Summary: The Order to Build Things

1. Lock decisions from Section 9
2. Write Subcourse 0 fully (all units + project)
3. Write root `README.md` with routing flow (placeholder links for subcourses 1–7)
4. Publish Subcourse 0
5. Write Subcourse 1 (scraping — widest audience, most search traffic)
6. Continue sequentially or by demand signal
7. Build Subcourse 7 (production) last — it references patterns from all others