# Fundamentals

## What Is Steel

Steel is a headless browser API built for AI agents. The mental model: **Humans use Chrome, Agents use Steel.**

Real sites block plain HTTP requests, render content with JavaScript after the initial load, require login for anything useful, and change structure without warning. Steel runs a full browser in the cloud, connects your automation code to it via CDP (the Chrome DevTools Protocol), and handles the infrastructure so you don't have to.

### The five problems Steel addresses

1. **Dynamic content** — SPAs and lazy-loaded sites return placeholder HTML to a raw request. Steel runs a real browser and gives you the fully rendered page.
2. **Complex navigation** — Clicking, typing, handling modals, multi-step flows. Your automation framework controls the browser via CDP.
3. **Authentication** — Data behind login walls. Steel has a Credentials API and Profiles API for managing auth state.
4. **Infrastructure overhead** — Running a browser fleet yourself means cold starts, memory leaks, and scaling. Steel manages the fleet; you write automation code.
5. **No web API** — Many sites worth automating don't have one. Steel lets you treat any site like an API.

### Steel Cloud vs Steel Browser (self-hosted)

**Steel Cloud** (what this course uses) — fully managed. No Docker, no infra setup. Create sessions via API, connect your automation framework, use built-in stealth, CAPTCHA solving, and proxy network.

**Steel Browser** — self-hosted, open-source. Same CDP interface, you manage the deployment. Useful when data residency or compliance rules prevent cloud infrastructure.

### Pricing

Usage-based. Check current plan limits at [docs.steel.dev/overview/pricinglimits](https://docs.steel.dev/overview/pricinglimits).

---

## Setup

### API key

Go to [app.steel.dev](https://app.steel.dev) and sign up. Free plan includes 100 browser hours, no credit card required.

1. Settings → API Keys
2. Create a key
3. Save it to a `.env` file:

```
STEEL_API_KEY=st-...
```

### Install dependencies

```bash
npm install steel-sdk dotenv playwright
```

### Config pattern

Throughout this course, env vars are never read directly in feature code. Everything goes through `config.js`:

```js
// config.js
import dotenv from 'dotenv';
dotenv.config();

export const STEEL_API_KEY = process.env.STEEL_API_KEY;

if (!STEEL_API_KEY) {
  throw new Error('STEEL_API_KEY is not set. Add it to your .env file.');
}
```

Then in any script:

```js
import { STEEL_API_KEY } from './config.js';
```

---

## Your First Session

A Steel session is a fresh browser running in the cloud. You create it via API, connect your automation framework to it via CDP, do your work, then release it.

```js
import Steel from 'steel-sdk';
import { chromium } from 'playwright';

const client = new Steel({ steelAPIKey: STEEL_API_KEY });

// 1. Create a session
const session = await client.sessions.create({ timeout: 120000 });
console.log('Live view:', session.sessionViewerUrl);

// 2. Connect Playwright to the session via CDP
const browser = await chromium.connectOverCDP(
  `wss://connect.steel.dev?apiKey=${STEEL_API_KEY}&sessionId=${session.id}`
);

// Steel provides a default context and page — use those
const context = browser.contexts()[0];
const page = context.pages()[0];

// 3. Navigate and screenshot
await page.goto('https://steel.dev', { waitUntil: 'domcontentloaded' });
const screenshot = await page.screenshot();
fs.writeFileSync('screenshot.png', screenshot);

await browser.close();

// 4. Release the session (stops billing)
await client.sessions.release(session.id);
```

**Always release sessions.** Billing runs by the minute while a session is active.

### The session viewer

Every session has a `sessionViewerUrl`. Open it in your browser to watch the session live. Useful for debugging — you see exactly what your agent sees.

### Session lifecycle

Sessions go: `live` → `released` (or `timed out`). Timeout limits depend on your plan. Check current limits at [docs.steel.dev/overview/sessions-api/session-lifecycle](https://docs.steel.dev/overview/sessions-api/session-lifecycle).

---

## Quick Actions vs Sessions

For single-URL, no-login, no-multi-step work, use Quick Actions. They're faster and cheaper — no session overhead.

### Quick Actions

```js
// Scrape a URL — returns { content: { html, cleaned_html, markdown }, ... }
const result = await client.scrape({
  url: 'https://example.com',
  format: ['markdown'],   // markdown is smaller, better for LLMs
});

console.log(result.content.markdown);

// Screenshot
const shot = await client.screenshot({ url: 'https://example.com' });


// PDF
const pdf = await client.pdf({ url: 'https://example.com' });
```

`cleaned_html` and `markdown` strip navigation, ads, and boilerplate — up to 80% smaller than raw HTML. Use them when your goal is content, not page structure.

### The `delay` parameter

```js
await client.scrape({ url: '...', format: ['markdown'], delay: 2000 });
```

Waits N milliseconds before extracting. Use only when a page has deferred content you need — every millisecond of delay holds the connection open.

### When to use sessions instead

- Login required
- Multi-step navigation
- JavaScript-rendered content that Quick Actions can't wait for
- Maintaining state across multiple pages

---

## Project: Hello Steel

### Goal

Touch every part of the Steel session lifecycle in one short script: create, connect, navigate, screenshot, inspect, quick-scrape, and release. This is the "hello world" for Steel — run it once to verify your API key, SDK install, and Playwright connection all work before moving on to real tasks.

### How to run

```bash
npm install
cp .env.example .env
# open .env and set STEEL_API_KEY=st-...
node hello-steel.js
```

As soon as the session is created, a live viewer URL is printed to the console. Open it in a browser tab while the script runs to watch Playwright navigate the page in real time.

### What the script does

1. **Create session** — calls `sessions.create({ timeout: 120000 })`, prints the live viewer URL
2. **Connect via CDP** — `chromium.connectOverCDP(wss://...)`, reaches into the running browser
3. **Navigate + screenshot** — goes to `https://steel.dev`, captures a PNG, saves it to `steel-screenshot.png`
4. **Inspect status** — calls `sessions.retrieve(session.id)` and prints the current status (`live`)
5. **Quick Action scrape** — calls `client.scrape({ url, format: ['markdown'] })` on the same URL and prints the first 500 characters of extracted markdown. This shows the difference between browser-driven scraping and the lightweight one-shot API.
6. **Release** — calls `sessions.release(session.id)`. This stops billing and closes the browser.

### Expected output

```
Session: ses_abc123
Live view: https://viewer.steel.dev/...
Title: Steel — Headless Browser API
Screenshot saved: steel-screenshot.png
Session status: live

--- Quick Action scrape ---
# Steel — Headless Browser API
...
Session released.
```

### Common errors

**`STEEL_API_KEY is not set`** — `dotenv.config()` didn't run before the env var was read. `config.js` handles this — make sure you import it first.

**`Invalid API key`** — leading/trailing space in `.env`, or wrong value. API keys start with `st-`.

**Playwright `connectOverCDP` fails** — the session may have timed out or already been released. Sessions have a default timeout; if the script is paused mid-way, the session may expire before Playwright connects.
