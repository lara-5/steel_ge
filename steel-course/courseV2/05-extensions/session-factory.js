// session-factory.js
// Subcourse 5 — Extensions project
//
// Creates two sessions: one without extension, one with.
// Navigates both to the same target URL and screenshots both.
// Compares cookie banner presence between the two.

import { STEEL_API_KEY, EXTENSION_ID, TARGET_URL } from './config.js';
import Steel from 'steel-sdk';
import { chromium } from 'playwright';
import fs from 'fs';

const client = new Steel({ steelAPIKey: STEEL_API_KEY });
fs.mkdirSync('screenshots', { recursive: true });

async function runSession(label, extraOptions = {}) {
  let session;
  try {
    session = await client.sessions.create({
      timeout: 90000,
      blockAds: true,
      ...extraOptions,
    });
    console.log(`[${label}] Session: ${session.id}`);
    console.log(`[${label}] Live view: ${session.sessionViewerUrl}`);

    const browser = await chromium.connectOverCDP(
      `wss://connect.steel.dev?apiKey=${STEEL_API_KEY}&sessionId=${session.id}`
    );
    const page = browser.contexts()[0].pages()[0];

    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const shotPath = `screenshots/${label.replace(/\s+/g, '-').toLowerCase()}.png`;
    fs.writeFileSync(shotPath, await page.screenshot({ fullPage: false }));
    console.log(`[${label}] Screenshot: ${shotPath}`);

    const { hasBanner } = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return {
        hasBanner: text.includes('cookie') && (
          text.includes('accept') || text.includes('consent') || text.includes('agree')
        ),
      };
    });

    console.log(`[${label}] Cookie banner detected: ${hasBanner}`);
    await browser.close();
    return { label, screenshotPath: shotPath, bannerDetected: hasBanner };
  } catch (err) {
    console.error(`[${label}] Error: ${err.message}`);
    return { label, error: err.message };
  } finally {
    if (session) await client.sessions.release(session.id);
  }
}

async function main() {
  console.log(`Target: ${TARGET_URL}`);
  console.log(`Extension ID: ${EXTENSION_ID || 'not configured'}\n`);

  const without = await runSession('without-extension', {});
  await new Promise(r => setTimeout(r, 2000));

  const with_ = await runSession(
    'with-extension',
    EXTENSION_ID ? { extensionIds: [EXTENSION_ID] } : {}
  );

  console.log('\n=== Comparison ===');
  console.log(`Without extension — cookie banner: ${without.bannerDetected ?? 'error'}`);
  console.log(`With extension    — cookie banner: ${with_.bannerDetected ?? 'error'}`);
  console.log('\nCheck screenshots/ to see the visual difference.');

  if (!EXTENSION_ID) {
    console.log('\n[!] No EXTENSION_ID set. Both runs used the same config.');
    console.log('    Upload an extension and add its ID to .env to see the effect.');
  }
}

main();
