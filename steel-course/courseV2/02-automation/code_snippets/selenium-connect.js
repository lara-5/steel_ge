// selenium-connect.js — code_snippets
// Connect Selenium to a Steel session via Remote WebDriver.
// Run: node selenium-connect.js
// Requires: npm install selenium-webdriver

import { Builder } from 'selenium-webdriver';
import Steel from 'steel-sdk';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY });

async function main() {
  let session;
  try {
    session = await client.sessions.create({ timeout: 60000 });
    console.log('Live view:', session.sessionViewerUrl);

    // Steel provides a WebDriver-compatible endpoint
    // Verify the current endpoint format at https://docs.steel.dev/overview/guides/selenium
    const driver = await new Builder()
      .usingServer(`https://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${session.id}`)
      .forBrowser('chrome')
      .build();

    await driver.get('https://steel.dev');
    console.log('Title:', await driver.getTitle());

    await driver.quit();
  } finally {
    if (session) await client.sessions.release(session.id);
  }
}

main().catch(console.error);
