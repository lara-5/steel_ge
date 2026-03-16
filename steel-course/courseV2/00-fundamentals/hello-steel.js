// hello-steel.js
// Subcourse 0 — Fundamentals project
//
// Demonstrates the full Steel session lifecycle:
// 1. Create session
// 2. Connect Playwright via CDP
// 3. Navigate + screenshot
// 4. Inspect session status
// 5. Run Quick Action scrape on the same URL
// 6. Release session

import { STEEL_API_KEY } from './config.js';
import Steel from 'steel-sdk';
import { chromium } from 'playwright';
import fs from 'fs';

const client = new Steel({ steelAPIKey: STEEL_API_KEY });
const TARGET_URL = 'https://steel.dev';

async function main() {
  let session;
  try {
    // 1. Create session
    session = await client.sessions.create({ timeout: 120000 });
    console.log(`Session: ${session.id}`);
    console.log(`Live view: ${session.sessionViewerUrl}`);

    // 2. Connect Playwright via CDP
    const browser = await chromium.connectOverCDP(
      `wss://connect.steel.dev?apiKey=${STEEL_API_KEY}&sessionId=${session.id}`
    );
    const context = browser.contexts()[0];
    const page = context.pages()[0];

    // 3. Navigate and screenshot
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
    console.log(`Title: ${await page.title()}`);

    const screenshot = await page.screenshot({ fullPage: false });
    fs.writeFileSync('steel-screenshot.png', screenshot);
    console.log('Screenshot saved: steel-screenshot.png');

    await browser.close();

    // 4. Inspect session status
    const details = await client.sessions.retrieve(session.id);
    console.log(`Session status: ${details.status}`);

    // 5. Quick Action — scrape same URL, compare markdown output
    console.log('\n--- Quick Action scrape ---');
    const scrapeResult = await client.scrape({
      url: TARGET_URL,
      format: ['markdown'],
    });
    if (scrapeResult.content?.markdown) {
      console.log(scrapeResult.content.markdown.slice(0, 500) + '...');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    // 6. Always release
    if (session) {
      await client.sessions.release(session.id);
      console.log('Session released.');
    }
  }
}

main();
