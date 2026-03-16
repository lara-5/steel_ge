# Authentication & Persistent Logins

## The Auth Problem

Automating login is error-prone. Credentials are sensitive. Session state is ephemeral — every new session starts fresh, with no memory of previous logins.

Steel has three approaches to handle this. Use whichever fits your situation:

| Approach | When to use |
|---|---|
| Manual login + context extraction | First login, when you need to capture the initial auth cookies |
| Credentials API | When you want Steel to inject credentials automatically, without your agent ever seeing the password |
| Persistent Profiles | When you want a browser identity that survives across sessions — log in once, never again |

---

## Manual Login + Context Extraction

The simplest approach: use Playwright to log into a site, then extract the auth cookies.

```js
// Session 1: log in, extract context
const session = await client.sessions.create({ timeout: 120000 });
const browser = await chromium.connectOverCDP(/* ... */);
const page = browser.contexts()[0].pages()[0];

await page.goto('https://example.com/login');
await page.fill('input[type=email]', 'your@email.com');
await page.fill('input[type=password]', 'yourpassword');
await page.click('button[type=submit]');
await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });

// Extract auth context (cookies, localStorage, sessionStorage)
const authContext = await client.sessions.context(session.id);
fs.writeFileSync('context.json', JSON.stringify(authContext, null, 2));
await client.sessions.release(session.id);

// Session 2: inject saved cookies
const session2 = await client.sessions.create({ timeout: 120000 });
const browser2 = await chromium.connectOverCDP(/* ... */);
const ctx2 = browser2.contexts()[0];
await ctx2.addCookies(authContext.cookies ?? []);
// Now navigate to the protected page — auth cookies are already set
```

`GET /v1/sessions/{id}/context` returns:
- `cookies` — session tokens, auth cookies (what most sites need)
- `localStorage` — some apps store JWTs here
- `sessionStorage` — per-session values

---

## Credentials API

The Credentials API stores credentials on Steel's servers. When the session hits a matching login page, Steel injects credentials into the form automatically. Your code never sees the password.

```js
// Store credentials (once)
await client.credentials.create({
  url: 'https://example.com',
  fields: {
    username: 'your@email.com',
    password: 'yourpassword',
  },
});

// Create a session — credentials inject automatically when the login page appears
const session = await client.sessions.create({ timeout: 120000 });
```

The injection happens automatically when the page is fully loaded and interactive. See code_snippets for CRUD operations on stored credentials.

> [!IMPORTANT]
> **Node.js SDK Status:** As of `steel-sdk` v0.1.0, the `credentials` API is not yet available as a first-class property on the client. To manage credentials while using the SDK, use the [REST API directly](https://docs.steel.dev/api-reference/credentials/create) or stay tuned for a future SDK update.

**Security model:** credentials are never exposed to the agent, logs, or page JavaScript. They live only in Steel's secure storage and are injected at the network level.


---

## Persistent Profiles

A Profile is a browser identity that persists across sessions. It stores cookies, localStorage, extensions, and fingerprint. Log in once — every subsequent session picks up with valid auth already in place.

```js
// First run: create session with persistProfile: true
const session = await client.sessions.create({
  timeout: 120000,
  persistProfile: true,  // save the session state as a profile on release
});
// ... login, do work ...
await client.sessions.release(session.id);

// session.profileId contains the new profile's ID — save it
fs.appendFileSync('.env', `\nSTEEL_PROFILE_ID=${session.profileId}`);

// Subsequent runs: load the profile
const session2 = await client.sessions.create({
  profileId: savedProfileId,
  persistProfile: true,  // keep updating on release
});
// Login page won't appear — the profile already has auth cookies
```

Profile limits:
- 300 MB max size
- Auto-deleted after 30 days of inactivity
- Status can be `active` or `FAILED` (if the post-session upload failed)

---

## Project: Persistent Login Workflow

### Goal

Solve the most common auth problem in browser automation: logging in once and never doing it again. The script checks on startup whether a Steel profile already exists. If it does, it loads the profile (which carries the browser's cookies and localStorage), skips the login form entirely, and goes straight to the protected page. If it doesn't, it logs in manually with Playwright, creates a profile, and saves its ID to `.env` for next time.

This is the pattern you'd use for any agent that needs to work on behalf of a logged-in user repeatedly.

### How to run

```bash
npm install
cp .env.example .env
```

Open `.env` and fill in your target site's details:

```
STEEL_API_KEY=st-...
LOGIN_URL=https://example.com/login
PROTECTED_URL=https://example.com/dashboard
SITE_EMAIL=your@email.com
SITE_PASSWORD=yourpassword
```

Leave `STEEL_PROFILE_ID` empty on the first run.

```bash
node persistent-login.js
```

### What the script does

**First run (no profile):**
1. Creates a session with `persistProfile: true`
2. Connects Playwright, navigates to `LOGIN_URL`
3. Fills in the email and password fields and clicks submit
4. Waits for the URL to change away from `/login` (confirms successful auth)
5. Calls `sessions.context(session.id)` to see how many cookies were captured
6. Navigates to `PROTECTED_URL` and checks the URL — if it redirects back to login, throws an error
7. On release, Steel saves the browser state as a new profile
8. Writes `STEEL_PROFILE_ID=...` into `.env`

**Subsequent runs (profile exists):**
1. Creates a session with `profileId: ... , persistProfile: true`
2. Connects Playwright — the session already has the auth cookies loaded
3. Navigates to `PROTECTED_URL` directly — no login form appears
4. Confirms successful access, releases the session (which updates the profile)

### Expected output

**First run:**
```
Session: ses_abc123
Live view: https://viewer.steel.dev/...

Logging in manually...
Login successful. URL: https://example.com/dashboard
Auth context: 8 cookies
Accessed protected page: Dashboard | Example
Session released. Profile updated.
Profile ID saved: prof_abc123
```

**Subsequent runs:**
```
Using profile: prof_abc123
Session: ses_xyz789
Live view: https://viewer.steel.dev/...

Profile loaded — skipping login.
Accessed protected page: Dashboard | Example
Session released. Profile updated.
```

### Adapting the selectors

The login step uses generic attribute selectors (`input[type=email]`, `input[type=password]`, `button[type=submit]`). If those don't match your target site's HTML, update the `loginManually()` function with site-specific selectors.

### Common errors

**Redirected to login page on second run** — the auth cookies in the profile have expired, or the site invalidated the session. Delete `STEEL_PROFILE_ID` from `.env` to force a fresh login and create a new profile.

**Login step doesn't submit** — the `button[type=submit]` selector didn't match. Open the session viewer during the first run, inspect the submit button, and update the selector in `loginManually()`.
