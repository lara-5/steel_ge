# Fundamentals — Agent Reference

## Steel Overview

- Headless browser API for AI agents. Cloud-managed, no Docker.
- CDP-based: your automation framework (Playwright/Puppeteer/Selenium) connects to a running browser via WebSocket.
- Steel Cloud (managed) vs Steel Browser (self-hosted open-source, same API).
- Pricing: [docs.steel.dev/overview/pricinglimits](https://docs.steel.dev/overview/pricinglimits)

## SDK Setup

```bash
npm install steel-sdk dotenv playwright
```

```js
// config.js
import dotenv from 'dotenv';
dotenv.config();
export const STEEL_API_KEY = process.env.STEEL_API_KEY;
if (!STEEL_API_KEY) throw new Error('STEEL_API_KEY is not set.');
```

## Session Lifecycle

### Create session
```js
const client = new Steel({ steelAPIKey: STEEL_API_KEY });
const session = await client.sessions.create({
  timeout: 120000,        // session timeout in ms
  blockAds: true,         // optional
  useProxy: true,         // optional, paid plans only
  proxyCountry: 'US',     // optional ISO alpha-2
  stealthConfig: {},      // optional fingerprint normalization
  solveCaptcha: true,     // optional, paid plans only
  dimensions: { width: 1280, height: 720 }, // optional viewport
  deviceConfig: { device: 'mobile' },       // optional mobile mode
  extensionIds: ['ext-id'],                 // optional
  profileId: 'prof-id',                    // optional
  persistProfile: true,                    // optional
  region: 'us-east-1',                     // optional
  namespace: 'my-namespace',               // optional
});
// session.id, session.sessionViewerUrl, session.debugUrl
```

### Connect Playwright via CDP
```js
import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP(
  `wss://connect.steel.dev?apiKey=${STEEL_API_KEY}&sessionId=${session.id}`
);
const context = browser.contexts()[0];
const page = context.pages()[0];
```

### Navigate and screenshot
```js
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle').catch(() => {});
const buf = await page.screenshot({ fullPage: false });
fs.writeFileSync('shot.png', buf);
```

### Inspect session status
```js
const details = await client.sessions.retrieve(session.id);
// details.status: 'live' | 'released' | 'timed_out'
```

### Release session
```js
await client.sessions.release(session.id);       // single
await client.sessions.releaseAll();               // bulk
```

### List sessions
```js
const { sessions } = await client.sessions.list({ status: 'live' });
```

## Quick Actions (no session)

```js
// Scrape
const result = await client.scrape({
  url: 'https://example.com',
  format: ['markdown'],     // 'html' | 'cleaned_html' | 'markdown'
  screenshot: false,
  pdf: false,
  delay: 0,                 // ms to wait before extract
  useProxy: false,
  headers: {},
});
// result.markdown | result.cleanedHtml | result.html

// Screenshot
const shot = await client.screenshot({ url, fullPage: true });

// PDF
const pdf = await client.pdf({ url });
```

## Session Debug / Embed

- Live view: `session.sessionViewerUrl`
- Embed iframe: `session.debugUrl?interactive=true&showControls=true`
- HLS stream: `GET /v1/sessions/{id}/hls`
- Live details: `await client.sessions.liveDetails(session.id)`
- Event stream: `GET /v1/sessions/{id}/events`
- Agent logs: timeline in session viewer dashboard

## Error Guards (always use)

```js
try {
  session = await client.sessions.create(...);
  // ... work ...
} catch (err) {
  console.error(err.message);
} finally {
  if (session) await client.sessions.release(session.id);
}
```
