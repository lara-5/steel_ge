# Web Scraping & Data Extraction

## Quick Actions — One-Shot Scraping

For a single URL with no login requirement, use Quick Actions. No session overhead.

```js
import { STEEL_API_KEY } from './config.js';
import Steel from 'steel-sdk';

const client = new Steel({ steelAPIKey: STEEL_API_KEY });

const result = await client.scrape({
  url: 'https://example.com/article',
  format: ['markdown'],  // 'html' | 'cleaned_html' | 'markdown'
});

console.log(result.content.markdown);
```

**Format comparison:**
- `html` — raw HTML, largest, includes all tags
- `cleaned_html` — stripped of nav, ads, scripts; still HTML structure
- `markdown` — plain text with basic formatting, smallest, best for LLMs

Use `markdown` or `cleaned_html` when you're feeding content to an LLM — up to 80% smaller than raw HTML.

Other Quick Action parameters:

```js
await client.scrape({
  url: 'https://example.com',
  format: ['markdown'],
  delay: 2000,        // wait 2s before extracting (for deferred loads)
  useProxy: true,     // route through residential proxy
  headers: { 'Accept-Language': 'en-US' },
});
```

### Screenshots and PDFs

```js
// Full-page screenshot
const shot = await client.screenshot({ url: 'https://example.com', fullPage: true });

// PDF snapshot
const pdf = await client.pdf({ url: 'https://example.com' });
```

### When Quick Actions aren't enough

Quick Actions run once and return. They can't handle:
- JavaScript-rendered content that loads after the initial HTML
- Login-gated pages
- Multi-step navigation or pagination

For those, use sessions.

---

## Session-Based Scraping

Sessions persist browser state across multiple pages. Connect Playwright to a session and scrape exactly as if it were a local browser.

```js
import { chromium } from 'playwright';

const session = await client.sessions.create({ timeout: 300000 });
const browser = await chromium.connectOverCDP(
  `wss://connect.steel.dev?apiKey=${STEEL_API_KEY}&sessionId=${session.id}`
);
const context = browser.contexts()[0];
const page = context.pages()[0];
```

### Waiting for JavaScript-rendered content

```js
await page.goto(url, { waitUntil: 'domcontentloaded' });

// Wait until network quiets down (SPAs finishing their requests)
await page.waitForLoadState('networkidle').catch(() => {});

// Wait for a specific element to appear
await page.waitForSelector('.article-content', { timeout: 5000 });
```

Use `domcontentloaded` first — it's faster. Add `networkidle` only when you know a page has deferred content that matters.

### Extracting content

```js
// Run JavaScript in the browser context
const { title, content } = await page.evaluate(() => {
  const el = document.querySelector('article, main, [role="main"]');
  return {
    title: document.title,
    content: el ? el.innerText.trim() : document.body.innerText.trim(),
  };
});
```

### Screenshots during a session

```js
const buf = await page.screenshot({ fullPage: false });
fs.writeFileSync(`screenshots/${slug}.png`, buf);
```

Take screenshots before extraction as verification — you can see exactly what the browser saw.

---

## Multi-Page Scraping

Sessions maintain state (cookies, localStorage) across pages. Reuse one session across multiple URLs in the same run.

```js
const session = await client.sessions.create({ timeout: 600000 });
const browser = await chromium.connectOverCDP(/* ... */);
const page = browser.contexts()[0].pages()[0];

for (const url of urls) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    // extract...
  } catch (err) {
    console.error(`Failed: ${url} — ${err.message}`);
    // skip and continue
  }
  await new Promise(r => setTimeout(r, 1000)); // polite delay
}

await browser.close();
await client.sessions.release(session.id);
```

One session per batch is cheaper and faster than a new session per URL. The tradeoff: a crashed page can affect the session state.

---

## Proxy-Assisted Scraping

Some sites block datacenter IPs before any content loads. Add a residential proxy at session creation:

```js
const session = await client.sessions.create({
  useProxy: true,
  proxyCountry: 'US',   // ISO 3166 alpha-2; omit for default
  timeout: 300000,
});
```

Or on a Quick Action:

```js
await client.scrape({ url, format: ['markdown'], useProxy: true });
```

Proxy usage is billed per GB on paid plans. Establish a baseline without proxy first — many sites don't need it.

---

## Project: Article Scraper

### Goal

Build a practical multi-URL content scraper — the kind you'd use as a data collection step before feeding content to an LLM or building a search index. The project shows how to reuse a single session across many pages (keeping costs low), capture screenshots for verification, and record structured metadata about each result.

### How to run

```bash
npm install
cp .env.example .env
# open .env and set STEEL_API_KEY=st-...
```

Open `urls.js` and replace the default Wikipedia URLs with your actual target URLs, then:

```bash
node article-scraper.js
```

### What the script does

1. **Creates one session** for the entire batch — cheaper than one session per URL
2. **Connects Playwright** to the session via CDP
3. **Iterates through each URL** in `urls.js`:
   - Navigates to the URL (`domcontentloaded` + `networkidle` wait)
   - Takes a screenshot before extracting content — you can verify what the browser saw
   - Extracts `title` and the main content element (`article`, `main`, or `body` fallback) via `page.evaluate()`
   - Calculates how much tokens were saved vs raw HTML
   - Logs a status line per URL with content length and reduction percentage
   - Waits 1 second between pages (polite rate limiting)
4. **Releases the session**
5. **Writes two output files**: `articles.json` and `run-summary.json`

### Expected output

```
Session: https://viewer.steel.dev/...

[1/3] https://en.wikipedia.org/wiki/Web_scraping
  ✓ 42,310 chars, ~78% reduction
[2/3] https://en.wikipedia.org/wiki/Headless_browser
  ✓ 18,240 chars, ~72% reduction
[3/3] https://en.wikipedia.org/wiki/Browser_automation
  ✓ 21,050 chars, ~75% reduction

Session released.
Saved: articles.json (3 results, 0 errors)
Avg token reduction: ~75% | Time: 24s
```

`screenshots/` will have one PNG per URL. `articles.json` contains one object per URL with `title`, `content`, `screenshotPath`, `rawLength`, `contentLength`, `tokenReductionPct`, and `scrapedAt`.

### Customization tips

- Swap the `page.evaluate()` selector for a site-specific one if the generic `article/main` fallback picks up the wrong element
- Add `useProxy: true` to `sessions.create()` if the target site blocks datacenter IPs
- Increase the 1-second delay between pages if the site rate-limits aggressively

### Common errors

**`✗` lines in output** — a URL timed out or threw. The scraper continues to the next URL and records the error in `articles.json`. Check `error.message` on the failed entry.

**Content is too short or picks up navigation/footer** — the site uses a non-standard content container. Open the screenshot and inspect the element in DevTools to find the right selector.
