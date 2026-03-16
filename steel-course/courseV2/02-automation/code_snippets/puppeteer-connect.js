// puppeteer-connect.js — code_snippets
// Connect Puppeteer to a Steel session via CDP.
// Run: node puppeteer-connect.js

import puppeteer from 'puppeteer';
import Steel from 'steel-sdk';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY });

async function main() {
  let session;
  try {
    session = await client.sessions.create({ timeout: 60000 });
    console.log('Live view:', session.sessionViewerUrl);

    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${session.id}`,
    });

    const pages = await browser.pages();
    const page = pages[0] ?? await browser.newPage();

    await page.goto('https://steel.dev');
    console.log('Title:', await page.title());

    await browser.disconnect();
  } finally {
    if (session) await client.sessions.release(session.id);
  }
}

main().catch(console.error);
