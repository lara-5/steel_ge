// stealth-scraper.js
// Subcourse 4 — Stealth project
//
// Runs the same URL through 4 stealth levels.
// Reports success, HTTP status, CAPTCHA detection, and timing at each level.
//
// Levels 3 and 4 require a paid Steel plan.

import { STEEL_API_KEY, TARGET_URL } from './config.js';
import Steel from 'steel-sdk';
import { chromium } from 'playwright';

const client = new Steel({ steelAPIKey: STEEL_API_KEY });

const STEALTH_LEVELS = [
  { level: 1, label: 'No stealth (datacenter IP)', options: {} },
  { level: 2, label: 'Stealth config (fingerprint normalization)', options: { stealthConfig: {} } },
  { level: 3, label: 'Stealth + residential proxy', options: { stealthConfig: {}, useProxy: true } },
  { level: 4, label: 'Full stack (stealth + proxy + CAPTCHA solve)', options: { stealthConfig: {}, useProxy: true, solveCaptcha: true } },
];

async function scrapeWithLevel({ level, label, options }) {
  const startTime = Date.now();
  let session;
  const result = {
    level, label,
    success: false,
    httpStatus: null,
    captchaDetected: false,
    contentExtracted: false,
    error: null,
    durationMs: null,
  };

  try {
    session = await client.sessions.create({ timeout: 120000, ...options });

    const browser = await chromium.connectOverCDP(
      `wss://connect.steel.dev?apiKey=${STEEL_API_KEY}&sessionId=${session.id}`
    );
    const page = browser.contexts()[0].pages()[0];

    page.on('response', response => {
      if (response.url() === TARGET_URL || response.url().startsWith(TARGET_URL)) {
        result.httpStatus = response.status();
      }
    });

    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});

    const content = await page.evaluate(() => document.body.innerText);
    result.captchaDetected = ['captcha', 'verify you are human', 'prove you are not a robot']
      .some(phrase => content.toLowerCase().includes(phrase));

    result.contentExtracted = content.length > 200 && !result.captchaDetected;
    result.success = result.contentExtracted;

    await browser.close();
  } catch (err) {
    result.error = err.message;
  } finally {
    if (session) await client.sessions.release(session.id);
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

async function main() {
  console.log(`Target: ${TARGET_URL}`);
  console.log(`Running ${STEALTH_LEVELS.length} stealth levels...\n`);

  const results = [];

  for (const levelConfig of STEALTH_LEVELS) {
    console.log(`[Level ${levelConfig.level}] ${levelConfig.label}...`);
    const result = await scrapeWithLevel(levelConfig);

    const icon = result.success ? '✓' : '✗';
    const captcha = result.captchaDetected ? ' [CAPTCHA]' : '';
    console.log(`  ${icon} Success: ${result.success}${captcha} | HTTP: ${result.httpStatus ?? 'unknown'} | ${result.durationMs}ms`);
    if (result.error) console.log(`  Error: ${result.error}`);

    results.push(result);
    if (result.success) {
      console.log(`  → Level ${levelConfig.level} is sufficient.\n`);
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n=== Results ===');
  console.log('Level | Label                                    | Success | HTTP | CAPTCHA | Time');
  console.log('------|------------------------------------------|---------|------|---------|-----');
  for (const r of results) {
    const s = r.success ? 'YES' : 'NO ';
    const c = r.captchaDetected ? 'YES' : 'NO ';
    const h = String(r.httpStatus ?? 'N/A').padEnd(4);
    const l = r.label.padEnd(40);
    console.log(`  ${r.level}   | ${l} | ${s}     | ${h} | ${c}   | ${r.durationMs}ms`);
  }

  const successLevel = results.find(r => r.success);
  if (successLevel) {
    console.log(`\nMinimum level needed: Level ${successLevel.level} — "${successLevel.label}"`);
  } else {
    console.log('\nNo level succeeded. The site may require methods beyond the current stack.');
  }
}

main();
