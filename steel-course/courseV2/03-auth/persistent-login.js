// persistent-login.js
// Subcourse 3 — Auth project
//
// Decision logic:
//   STEEL_PROFILE_ID set → load profile, skip login
//   No profile → manual Playwright login + create profile
//
// Run: node persistent-login.js

import { STEEL_API_KEY, LOGIN_URL, PROTECTED_URL, PROFILE_ID } from './config.js';
import Steel from 'steel-sdk';
import { chromium } from 'playwright';
import fs from 'fs';

const client = new Steel({ steelAPIKey: STEEL_API_KEY });

function saveProfileId(profileId) {
  const envPath = '.env';
  const current = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  if (current.includes('STEEL_PROFILE_ID=')) {
    fs.writeFileSync(envPath, current.replace(/STEEL_PROFILE_ID=.*/m, `STEEL_PROFILE_ID=${profileId}`));
  } else {
    fs.appendFileSync(envPath, `\nSTEEL_PROFILE_ID=${profileId}`);
  }
  console.log(`Profile ID saved: ${profileId}`);
}

async function loginManually(page) {
  console.log('Logging in manually...');
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});

  // Update selectors to match your target site's login form
  await page.fill('input[type=email], #email, input[name=email]', process.env.SITE_EMAIL ?? '');
  await page.fill('input[type=password], #password, input[name=password]', process.env.SITE_PASSWORD ?? '');
  await page.click('button[type=submit]');

  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
  console.log('Login successful. URL:', page.url());
}

async function accessProtectedPage(page) {
  await page.goto(PROTECTED_URL, { waitUntil: 'domcontentloaded' });
  const currentUrl = page.url();

  if (currentUrl.includes('login') || currentUrl.includes('signin')) {
    throw new Error(`Redirected to login — auth did not work. URL: ${currentUrl}`);
  }

  const title = await page.title();
  console.log(`Accessed protected page: ${title}`);
  return title;
}

async function main() {
  let session;
  try {
    const sessionOptions = {
      timeout: 120000,
      persistProfile: true, // always update the profile on release
    };

    if (PROFILE_ID) {
      console.log(`Using profile: ${PROFILE_ID}`);
      sessionOptions.profileId = PROFILE_ID;
    }

    session = await client.sessions.create(sessionOptions);
    console.log(`Session: ${session.id}`);
    console.log(`Live view: ${session.sessionViewerUrl}\n`);

    const browser = await chromium.connectOverCDP(
      `wss://connect.steel.dev?apiKey=${STEEL_API_KEY}&sessionId=${session.id}`
    );
    const context = browser.contexts()[0];
    const page = context.pages()[0];

    if (!PROFILE_ID) {
      await loginManually(page);

      const authContext = await client.sessions.context(session.id);
      console.log(`Auth context: ${authContext.cookies?.length ?? 0} cookies`);
    } else {
      console.log('Profile loaded — skipping login.');
    }

    await accessProtectedPage(page);
    await browser.close();

    // Save new profile ID on first run
    if (!PROFILE_ID && session.profileId) {
      saveProfileId(session.profileId);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (session) {
      await client.sessions.release(session.id);
      console.log('Session released. Profile updated.');
    }
  }
}

main();
