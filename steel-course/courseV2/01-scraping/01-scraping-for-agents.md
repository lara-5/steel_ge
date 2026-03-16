# Web Scraping — Agent Reference

## Quick Actions

```js
const client = new Steel({ steelAPIKey: STEEL_API_KEY });

// Scrape
const result = await client.scrape({
  url: 'https://example.com',
  format: ['markdown'],       // 'html' | 'cleaned_html' | 'markdown'
  delay: 0,                   // ms before extract
  useProxy: false,
  headers: {},
  screenshot: false,
  pdf: false,
});
// results are in result.content:
// result.content.markdown | result.content.cleaned_html | result.content.html

// Screenshot
const shot = await client.screenshot({ url, fullPage: true });

// PDF
const pdf = await client.pdf({ url });
```

## Session Scraping

```js
const session = await client.sessions.create({
  timeout: 300000,
  useProxy: true,         // optional
  proxyCountry: 'US',     // optional
  blockAds: true,         // optional
});
const browser = await chromium.connectOverCDP(
  `wss://connect.steel.dev?apiKey=${STEEL_API_KEY}&sessionId=${session.id}`
);
const context = browser.contexts()[0];
const page = context.pages()[0];
```

### Wait strategies

```js
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForLoadState('networkidle').catch(() => {});
await page.waitForSelector('.target-element', { timeout: 5000 });
```

### Extract content

```js
const { title, content } = await page.evaluate(() => ({
  title: document.title,
  content: (document.querySelector('article, main, [role="main"]') 
    || document.body).innerText.trim(),
}));
```

### Screenshot in session

```js
const buf = await page.screenshot({ fullPage: false });
fs.writeFileSync('shot.png', buf);
```

### Intercept images (bandwidth reduction)

```js
await page.route('**/*.{png,jpg,jpeg,gif,webp,svg}', route => route.abort());
```

## Pagination Pattern

```js
for (const url of urls) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    // extract...
  } catch (err) {
    // log and continue
  }
  await new Promise(r => setTimeout(r, 1000));
}
```

## Cleanup

```js
await browser.close();
await client.sessions.release(session.id);
```

## Token reduction note

`cleaned_html` / `markdown` vs `html`: up to 80% smaller. Prefer for LLM input.
