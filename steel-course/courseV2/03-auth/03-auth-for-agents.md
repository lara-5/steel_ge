# Authentication — Agent Reference

## Approach Decision

1. `STEEL_PROFILE_ID` set → load profile, skip login
2. No profile, credentials stored → Credentials API auto-inject
3. Fallback → manual Playwright login + context extract

## Manual Login + Context Extract

```js
// Login
await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle').catch(() => {});
await page.fill('input[type=email]', process.env.SITE_EMAIL);
await page.fill('input[type=password]', process.env.SITE_PASSWORD);
await page.click('button[type=submit]');
await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

// Extract context
const authContext = await client.sessions.context(session.id);
// authContext.cookies[], authContext.localStorage{}, authContext.sessionStorage{}

// Inject cookies into next session
await browser2.contexts()[0].addCookies(authContext.cookies ?? []);
```

## Credentials API

```js
// Store (once)
await client.credentials.create({
  url: 'https://example.com',
  fields: { username: 'user@email.com', password: 'pass' },
});

// List
const { credentials } = await client.credentials.list();

// Update
await client.credentials.update(id, { fields: { password: 'newpass' } });

// Delete
await client.credentials.delete(id);
```

Injection is automatic when session hits matching URL. Beta — verify at [docs.steel.dev/overview/credentials-api/overview](https://docs.steel.dev/overview/credentials-api/overview).

## Persistent Profiles

```js
// Create profile from session (on release)
const session = await client.sessions.create({
  timeout: 120000,
  persistProfile: true,
});
// After release → session.profileId

// Reuse profile
const session2 = await client.sessions.create({
  profileId: savedProfileId,
  persistProfile: true,  // update on release
});

// Profile CRUD
await client.profiles.create({ userAgent: '...', userDataDir: zipBuffer });
const { profiles } = await client.profiles.list();
await client.profiles.retrieve(profileId);
await client.profiles.update(profileId, { userAgent: '...' });
```

Limits: 300 MB max, 30-day inactivity deletion. States: `active` | `FAILED`.

## Save Profile ID

```js
function saveProfileId(profileId) {
  const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf-8') : '';
  if (env.includes('STEEL_PROFILE_ID=')) {
    fs.writeFileSync('.env', env.replace(/STEEL_PROFILE_ID=.*/m, `STEEL_PROFILE_ID=${profileId}`));
  } else {
    fs.appendFileSync('.env', `\nSTEEL_PROFILE_ID=${profileId}`);
  }
}
```
