// file-pipeline.js
// Subcourse 6 — Files project
//
// Navigates to a page, triggers a file download, saves it locally,
// takes verification screenshots, and writes metadata.json.

import { STEEL_API_KEY, DOWNLOAD_PAGE_URL } from './config.js';
import Steel from 'steel-sdk';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const client = new Steel({ steelAPIKey: STEEL_API_KEY });
fs.mkdirSync('downloads', { recursive: true });
fs.mkdirSync('screenshots', { recursive: true });

const metadata = {
  sessionId: null,
  sessionViewerUrl: null,
  startedAt: new Date().toISOString(),
  downloads: [],
  screenshots: [],
  errors: [],
};

async function main() {
  let session;
  try {
    session = await client.sessions.create({ timeout: 120000 });
    metadata.sessionId = session.id;
    metadata.sessionViewerUrl = session.sessionViewerUrl;

    console.log(`Session: ${session.id}`);
    console.log(`Live view: ${session.sessionViewerUrl}`);

    const browser = await chromium.connectOverCDP(
      `wss://connect.steel.dev?apiKey=${STEEL_API_KEY}&sessionId=${session.id}`
    );
    const page = browser.contexts()[0].pages()[0];

    await page.goto(DOWNLOAD_PAGE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // Screenshot before download
    const prePath = `screenshots/before-download-${Date.now()}.png`;
    fs.writeFileSync(prePath, await page.screenshot({ fullPage: false }));
    metadata.screenshots.push({ stage: 'before-download', path: prePath });
    console.log(`Screenshot (before): ${prePath}`);

    // Trigger download — listener must be registered BEFORE the click
    console.log('Waiting for download...');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      // Fallback: synthetic CSV download if no real button exists on the target page
      // Replace this evaluate() with page.click('#real-download-btn') for a real target
      page.evaluate(() => {
        const link = document.createElement('a');
        link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('id,name,value\n1,test,hello\n2,demo,world');
        link.download = 'sample-data.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }),
    ]);

    const filename = download.suggestedFilename() || `download-${Date.now()}.csv`;
    const downloadPath = path.join('downloads', filename);
    const tempPath = await download.path();
    fs.copyFileSync(tempPath, downloadPath);
    const fileBuffer = fs.readFileSync(downloadPath);

    console.log(`Downloaded: ${filename} (${fileBuffer.length} bytes)`);
    metadata.downloads.push({
      filename,
      path: downloadPath,
      sizeBytes: fileBuffer.length,
      downloadedAt: new Date().toISOString(),
    });

    // Screenshot after download
    const postPath = `screenshots/after-download-${Date.now()}.png`;
    fs.writeFileSync(postPath, await page.screenshot({ fullPage: false }));
    metadata.screenshots.push({ stage: 'after-download', path: postPath });

    await browser.close();
  } catch (err) {
    console.error('Error:', err.message);
    metadata.errors.push({ message: err.message, timestamp: new Date().toISOString() });
  } finally {
    if (session) {
      await client.sessions.release(session.id);
      console.log('Session released. Session files auto-promoted to global storage.');
    }
  }

  metadata.completedAt = new Date().toISOString();
  fs.writeFileSync('metadata.json', JSON.stringify(metadata, null, 2));

  console.log('\nPipeline complete:');
  console.log(`  downloads/    — ${metadata.downloads.length} file(s)`);
  console.log(`  screenshots/  — ${metadata.screenshots.length} screenshot(s)`);
  console.log(`  metadata.json`);
}

main();
