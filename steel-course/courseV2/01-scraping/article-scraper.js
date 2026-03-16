// article-scraper.js
// Subcourse 1 — Scraping project
//
// Input:  list of URLs from urls.js
// Output: articles.json + screenshots/ + run-summary.json

import { STEEL_API_KEY } from './config.js';
import Steel from 'steel-sdk';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { URLS } from './urls.js';

const client = new Steel({ steelAPIKey: STEEL_API_KEY });

fs.mkdirSync('screenshots', { recursive: true });

function slugify(url) {
  try {
    const u = new URL(url);
    return (u.hostname + u.pathname)
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .slice(0, 60);
  } catch {
    return 'unknown';
  }
}

async function scrapeArticle(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});

  // Screenshot before extraction — captures what the browser actually showed
  const screenshot = await page.screenshot({ fullPage: false });
  const screenshotPath = path.join('screenshots', `${slugify(url)}-${Date.now()}.png`);
  fs.writeFileSync(screenshotPath, screenshot);

  const { title, rawLength, content } = await page.evaluate(() => {
    const rawHtml = document.documentElement.outerHTML;
    const el = document.querySelector('article, main, [role="main"], .content, .post-body');
    return {
      title: document.title,
      rawLength: rawHtml.length,
      content: el ? el.innerText.trim() : document.body.innerText.trim(),
    };
  });

  return {
    url,
    title,
    content,
    screenshotPath,
    rawLength,
    contentLength: content.length,
    tokenReductionPct: Math.round((1 - content.length / rawLength) * 100),
    scrapedAt: new Date().toISOString(),
  };
}

async function main() {
  const startTime = Date.now();
  const results = [];
  let session;

  try {
    session = await client.sessions.create({ timeout: 300000 });
    console.log(`Session: ${session.sessionViewerUrl}\n`);

    const browser = await chromium.connectOverCDP(
      `wss://connect.steel.dev?apiKey=${STEEL_API_KEY}&sessionId=${session.id}`
    );
    const context = browser.contexts()[0];
    const page = context.pages()[0];

    for (let i = 0; i < URLS.length; i++) {
      const url = URLS[i];
      console.log(`[${i + 1}/${URLS.length}] ${url}`);
      try {
        const result = await scrapeArticle(page, url);
        results.push({ status: 'ok', ...result });
        console.log(`  ✓ ${result.contentLength.toLocaleString()} chars, ~${result.tokenReductionPct}% reduction`);
      } catch (err) {
        console.error(`  ✗ ${err.message}`);
        results.push({ status: 'error', url, error: err.message, scrapedAt: new Date().toISOString() });
      }
      if (i < URLS.length - 1) await new Promise(r => setTimeout(r, 1000));
    }

    await browser.close();
  } catch (err) {
    console.error('Session error:', err.message);
  } finally {
    if (session) {
      await client.sessions.release(session.id);
      console.log('Session released.');
    }
  }

  fs.writeFileSync('articles.json', JSON.stringify(results, null, 2));

  const successful = results.filter(r => r.status === 'ok');
  const errors = results.filter(r => r.status === 'error');
  const avgContentLength = successful.length
    ? Math.round(successful.reduce((s, r) => s + r.contentLength, 0) / successful.length)
    : 0;
  const avgReduction = successful.length
    ? Math.round(successful.reduce((s, r) => s + r.tokenReductionPct, 0) / successful.length)
    : 0;
  const totalSecs = ((Date.now() - startTime) / 1000).toFixed(0);

  const summary = {
    total: results.length,
    successful: successful.length,
    errors: errors.length,
    avgContentLength,
    avgTokenReductionPct: avgReduction,
    totalSeconds: Number(totalSecs),
  };

  fs.writeFileSync('run-summary.json', JSON.stringify(summary, null, 2));

  console.log(`\nSaved: articles.json (${successful.length} results, ${errors.length} errors)`);
  console.log(`Avg token reduction: ~${avgReduction}% | Time: ${totalSecs}s`);
}

main();
