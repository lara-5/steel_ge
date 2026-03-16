# Stealth — Agent Reference

## Session Stealth Params

```js
const session = await client.sessions.create({
  stealthConfig: {},                    // fingerprint normalization (verify fields at API ref)
  blockAds: true,                       // block ad networks + tracking scripts
  deviceConfig: { device: 'mobile' },  // optional mobile mode
  useProxy: true,                       // managed residential proxies (paid plans)
  proxyCountry: 'US',                  // ISO alpha-2 country code
  proxyUrl: 'http://user:pass@host:port', // BYOP — overrides managed proxy
  solveCaptcha: true,                  // auto CAPTCHA solving (paid plans, not Hobby)
  stealthConfig: { autoCaptchaSolving: false }, // disable auto-solve for manual control
});
```

## Proxy Notes

- `useProxy: true` → Steel managed residential proxy (US default)
- `proxyCountry` → ISO 3166-1 alpha-2 (narrower = smaller pool = faster IP flagging)
- `proxyUrl` → BYOP, no Steel cost
- Billing: per GB, paid plans only → [docs.steel.dev/overview/pricinglimits](https://docs.steel.dev/overview/pricinglimits)

## CAPTCHA API

```js
// Status
await client.sessions.captchas.status(session.id);

// Solve (auto-trigger)
await client.sessions.captchas.solve(session.id);

// Image CAPTCHA
await client.sessions.captchas.solveImage(session.id, {
  imageXPath: '//img[@id="captcha-image"]',
  inputXPath: '//input[@id="captcha-input"]',
});
```

Supported types (verify): `recaptchaV2`, `recaptchaV3`, `turnstile`, `image_to_text`

## Bandwidth Reduction

```js
// Block images in Playwright session
await page.route('**/*.{png,jpg,jpeg,gif,webp,svg}', route => route.abort());

// Prefer markdown over html for Quick Actions + proxy
await client.scrape({ url, format: ['markdown'], useProxy: true });
```

## Progressive Stealth (4 levels)

```js
const LEVELS = [
  { level: 1, options: {} },
  { level: 2, options: { stealthConfig: {} } },
  { level: 3, options: { stealthConfig: {}, useProxy: true } },
  { level: 4, options: { stealthConfig: {}, useProxy: true, solveCaptcha: true } },
];
```

## Best Practices

1. Baseline first (no stealth) — find minimum required level
2. Country-level proxy targeting before more specific
3. Retry before assuming blocked
4. CAPTCHA solving is not 100% — always handle failure
