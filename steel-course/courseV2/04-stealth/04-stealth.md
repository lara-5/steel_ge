# Stealth, Proxies & Anti-Bot Bypass

## Why Bots Get Blocked

Bot detection operates at three levels:

**Layer 1: IP reputation** — Datacenter IPs (AWS, GCP, Azure) are flagged by most protection services before any browser fingerprinting happens. Countermeasure: `useProxy: true`.

**Layer 2: Browser fingerprint** — Headless browsers leak signals: `navigator.webdriver = true`, missing fonts and plugins, inconsistent timing. Countermeasure: `stealthConfig`.

**Layer 3: Behavioral patterns** — Regular, metronomic automation patterns differ from human browsing. Countermeasure: mobile mode (simpler flows), realistic wait patterns.

Steel's prevention-first approach: fingerprinting and stealth config often prevent CAPTCHAs from appearing at all. Prevention is cheaper than solving.

---

## Stealth Configuration

All stealth parameters are set at session creation.

```js
const session = await client.sessions.create({
  stealthConfig: {},        // enables fingerprint normalization
  blockAds: true,           // blocks ad/tracking networks, cleaner pages
  deviceConfig: { device: 'mobile' }, // optional; simpler DOM, lower detection surface
});
```

> **Note:** The exact fields within `stealthConfig` may evolve — verify at [docs.steel.dev/api-reference](https://docs.steel.dev/api-reference).

What `stealthConfig` does: normalizes User-Agent, removes the `navigator.webdriver` flag, adds realistic Canvas and WebGL fingerprints, aligns timing with real browsers.

`blockAds` is not strictly a stealth feature, but cleaner pages mean fewer false clicks and less noise in screenshots. Use it by default in agent workflows.

Mobile mode reduces detection surface: genuinely mobile User-Agents, simpler DOM structure, fewer JS APIs for fingerprinting.

---

## Proxies

### Managed residential proxies

```js
const session = await client.sessions.create({
  useProxy: true,
  proxyCountry: 'US',  // ISO 3166 alpha-2; default is US
});
```

Steel's residential proxy network draws from hundreds of millions of IP addresses from legitimate consumer connections, rotating automatically per session.

Geographic targeting: start country-level, add specificity only if needed. Smaller pools mean more IP reuse, which accelerates detection on sites that track IPs.

```js
// UK residential
await client.sessions.create({ useProxy: true, proxyCountry: 'GB' });
```

### Bring Your Own Proxy (BYOP)

```js
await client.sessions.create({
  proxyUrl: 'http://username:password@proxy.example.com:8080',
});
```

Use for: existing proxy contracts, specific compliance requirements. Works with Steel Cloud and self-hosted.

### Proxy billing

Proxy usage is billed per GB on paid plans only. Check current rates at [docs.steel.dev/overview/pricinglimits](https://docs.steel.dev/overview/pricinglimits).

Best practices:
1. Establish a baseline without proxy first — many sites don't need it
2. Start with country-level targeting
3. Retry on failure before assuming you're blocked
4. Contact support for persistent failures after retries and region changes

---

## CAPTCHA Handling

```js
const session = await client.sessions.create({
  solveCaptcha: true,
});
```

When a supported CAPTCHA is detected, Steel sends it to a solving service and injects the solution. Your code doesn't need to do anything special.

Supported types (verify at [docs.steel.dev/overview/captchas-api/overview](https://docs.steel.dev/overview/captchas-api/overview)):
- `recaptchaV2`, `recaptchaV3`, `turnstile`, `image_to_text`

Plan restriction: CAPTCHA solving is not available on the free Hobby plan.

### Manual control

```js
// Check if a CAPTCHA is currently blocking the session
const status = await client.sessions.captchas.status(session.id);

// Trigger a solve manually
await client.sessions.captchas.solve(session.id);
```

### Image CAPTCHAs

```js
await client.sessions.captchas.solveImage(session.id, {
  imageXPath: '//img[@id="captcha-image"]',
  inputXPath: '//input[@id="captcha-input"]',
});
```

### Disable auto-solve

```js
const session = await client.sessions.create({
  stealthConfig: { autoCaptchaSolving: false },
});
// Now call captchas.solve() yourself when you detect a CAPTCHA
```

---

## Bandwidth Optimization

Proxy bandwidth is billed by the GB. Reduce it before scaling.

**`blockAds: true`** — blocks ad networks and large media files; 20-40% reduction on ad-heavy sites.

**Smart format extraction** — `markdown` output is significantly smaller than raw HTML:

```js
await client.scrape({ url, format: ['markdown'], useProxy: true });
```

**Image blocking in Playwright sessions:**

```js
await page.route('**/*.{png,jpg,jpeg,gif,webp,svg}', route => route.abort());
```

Use this when you're extracting text content and don't need visual verification. Note: some sites use image loading as part of their JS rendering pipeline.

**`delay` parameter** — only use when you know a page has deferred content you need. Every millisecond holds the proxy connection open.

---

## Project: Progressive Stealth Scraper

### Goal

Find the minimum stealth configuration needed to successfully scrape a given target URL. Instead of guessing which combination of proxy, fingerprint normalization, and CAPTCHA solving is required, the script systematically tests 4 levels from bare minimum to full stack and tells you exactly where the site starts letting you through.

This is useful for any new scraping target: run the progression once, find the minimum level, and use only that in production (less overhead, lower cost).

### How to run

```bash
npm install
cp .env.example .env
# open .env and set STEEL_API_KEY=st-...
```

By default the target is `https://bot.sannysoft.com` — a public bot detection test page. To test your own target, set `TARGET_URL` in `.env`:

```
TARGET_URL=https://example.com/protected-page
```

```bash
node stealth-scraper.js
```

> **Note:** Levels 3 and 4 require a paid Steel plan (proxy and CAPTCHA solving are not included in the free Hobby plan).

### What the script does

For each of the 4 stealth levels, the script:

1. Creates a new session with the level's options
2. Connects Playwright and navigates to `TARGET_URL`
3. Intercepts HTTP responses to capture the actual HTTP status code
4. Reads `document.body.innerText` and checks for CAPTCHA keywords (`"captcha"`, `"verify you are human"`, `"prove you are not a robot"`)
5. Marks the attempt as successful if content is over 200 characters and no CAPTCHA was detected
6. Releases the session
7. Waits 2 seconds before the next level

The 4 levels:

| Level | What's enabled |
|---|---|
| 1 | Nothing — bare datacenter IP |
| 2 | `stealthConfig` — fingerprint normalization only |
| 3 | `stealthConfig` + `useProxy: true` — residential IP |
| 4 | `stealthConfig` + `useProxy: true` + `solveCaptcha: true` — full stack |

### Expected output

```
Target: https://bot.sannysoft.com
Running 4 stealth levels...

[Level 1] No stealth (datacenter IP)...
  ✓ Success: true | HTTP: 200 | 1842ms
  → Level 1 is sufficient.

[Level 2] Stealth config (fingerprint normalization)...
  ✓ Success: true | HTTP: 200 | 2103ms

[Level 3] Stealth + residential proxy...
  ✓ Success: true | HTTP: 200 | 3250ms

[Level 4] Full stack (stealth + proxy + CAPTCHA solve)...
  ✓ Success: true | HTTP: 200 | 4100ms

=== Results ===
Level | Label                                    | Success | HTTP | CAPTCHA | Time
------|------------------------------------------|---------|------|---------|-----
  1   | No stealth (datacenter IP)               | YES     | 200  | NO   | 1842ms
  2   | Stealth config (fingerprint normalization)| YES     | 200  | NO   | 2103ms
  3   | Stealth + residential proxy              | YES     | 200  | NO   | 3250ms
  4   | Full stack (stealth + proxy + CAPTCHA)   | YES     | 200  | NO   | 4100ms

Minimum level needed: Level 1 — "No stealth (datacenter IP)"
```

On a site with real bot protection, Level 1 would show `NO` and the script would keep trying until one level succeeds.

### Common errors

**All levels fail** — the site may use JavaScript-based detection that isn't covered by the current detection check in the script. In that case, inspect the screenshots manually and look at what content was extracted.

**Level 3/4 returns `CAPTCHA solving not available on Hobby plan`** — upgrade your plan or skip those levels by commenting them out of `STEALTH_LEVELS`.
