# Steel.dev Happy Path: Automate Web Reading in Minutes

## What You're About to Build

This guide walks through automating a real browser workflow in minutes.

Instead of manually opening a browser and copying data from a page like example.com, you’ll run the same workflow inside a dedicated cloud browser session. The session behaves exactly like Chrome on your machine, except it runs in Steel’s infrastructure and is fully controlled through code.

Steel provides programmable browser sessions designed for agents and automation. Sessions start in under a second, can run for hours, and execute web workflows reliably in production environments.

We’ll build it step by step.

---

## Step 1: Get Your Steel API Key

Before writing any code, you need access to Steel’s cloud browser sessions. Access is granted through an API key, which authenticates requests to the Steel control plane and authorizes session creation.

1. Go to [steel.dev](https://steel.dev) and sign up for an account
2. Navigate to your dashboard
3. Find your **API key**, it looks something like `sk_live_abc123...`
4. Copy it somewhere safe 

---

## Step 2: Set Up Your Project

Create a new project and install dependencies:

```bash
mkdir steel-automation
cd steel-automation
npm init -y
npm install steel-sdk puppeteer-core dotenv
```

**What you just installed:**
- **steel-sdk**: Creates and manages cloud browser sessions
- **puppeteer-core**: Controls the browser (clicks, types, extracts data)
- **dotenv**: Loads environment variables from .env file

---

## Step 3: Store Your API Key

Create a `.env` file in your project root to keep your API key out of your code for security:

```
STEEL_API_KEY=your_api_key_here
```

---

## Step 4: Write the Automation Script

Create `scrape.js`. The complete code is in the Appendix. We'll walk through that code and break down each part so you understand exactly what's happening.

### **The Setup**
```javascript
require('dotenv').config();
const Steel = require('steel-sdk');
const puppeteer = require('puppeteer-core');
const steel = new Steel({ steelAPIKey: process.env.STEEL_API_KEY });
```

This initializes the Steel client using your API key. The `steel` object is your interface for creating and managing browser sessions.

---

### **Starting a Session**
```javascript
const session = await steel.sessions.create();
```

This call provisions a new isolated browser session in Steel’s cloud. Each session runs a real Chrome instance and returns a unique `session.id`. All subsequent commands are scoped to that session.

Sessions are independent, which means you can run multiple workflows concurrently without state collisions.

### **Connecting Puppeteer to Your Cloud Browser**
```javascript
const browser = await puppeteer.connect({
  browserWSEndpoint: `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${session.id}`
});
```
Puppeteer connects directly to the Steel session over WebSocket. The connection string includes your API key for authentication and the session ID to route commands to the correct browser instance.

Once connected, you’re controlling a real cloud browser as if it were running locally.

---

### **Opening a Page and Navigating**
```javascript
const page = await browser.newPage();
await page.goto('https://example.com');
```

You are now controlling the browser session. `newPage()` opens a fresh tab, and `goto()` tells it to load example.com just like clicking the address bar and hitting Enter.

**Why Steel:** Many modern websites block non-browser traffic or return incomplete responses to HTTP clients. Steel runs a full browser session, so your automation executes exactly as a real user would, including JavaScript rendering, authentication flows, and dynamic content.

---

### **Extracting Data**
```javascript
const pageData = await page.evaluate(() => {
  return {
    h1: document.querySelector('h1')?.textContent,
    paragraph: document.querySelector('p')?.textContent,
    allLinks: Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent,
      href: a.href
    }))
  };
});
```

This executes JavaScript inside the browser context to extract structured data. `page.evaluate()` runs JavaScript **inside the browser page** — just like opening your browser's console and typing code there.

You're using standard web APIs:
- `document.querySelector('h1')` - Find the first `<h1>` tag
- `document.querySelectorAll('a')` - Find all `<a>` link tags
- `.textContent` - Get the visible text
- `.href` - Get the link URL

Steel works with the automation frameworks you already use. If you know Puppeteer, you already know how to run workflows on Steel. There’s no new execution model, just managed browser infrastructure behind it.

---

### **Closing the Session**
```javascript
await browser.close();
await steel.sessions.release(session.id);
```

This closes the Puppeteer connection and releases the browser session.

Steel bills based on session time. Always release sessions when your workflow completes to ensure proper resource cleanup and cost control.

**Pro tip:** Not sure if you have sessions running? Check your [Steel dashboard](https://app.steel.dev/sessions) to view all active sessions.

---

## Step 5: Run Your Automation

Execute the script:

```bash
node scrape.js
```

Example output:

```
Starting a Steel browser session...
Session created: ses_abc123xyz
Navigating to example.com...
Page loaded!
Reading page content...
Data extracted:
{
  "h1": "Example Domain",
  "paragraph": "This domain is for use in illustrative examples...",
  "allLinks": [
    { "text": "More information...", "href": "https://www.iana.org/domains/example" }
  ]
}
Closing the session...
Done! Session closed.
```

You just executed a browser workflow inside a managed cloud session without provisioning infrastructure or maintaining browser fleets.

That’s the core Steel pattern: create a session, connect, run automation, release.

---

## What's Next?

This example demonstrates the core session lifecycle. In production, Steel extends this execution model with:

- Managed residential proxy routing and fingerprint controls
- Built-in CAPTCHA handling (reCAPTCHA, Turnstile)
- Long-lived sessions (up to 24 hours) with persisted state
- Live session viewers and replayable traces for debugging and verification
- Structured and markdown extraction for LLM-driven workflows
- Horizontal scaling across thousands of concurrent sessions

The primitive stays the same: create → connect → execute → release. Steel handles the execution layer.

You can find more examples in [Steel's Cookbook](https://github.com/steel-dev/steel-cookbook).

---

## The Bottom Line

Steel replaces custom browser infrastructure with a managed execution layer built for agents.

You get isolated sessions, state management, observability, anti-bot handling, and long-running workflows without operating browsers yourself.

Humans use Chrome. Agents use Steel.

---

## Need Help?

- [Steel Documentation](https://docs.steel.dev)
- [Discord Community](https://discord.com/invite/steeldivision)

---

## Appendix: Complete Code

```javascript
require('dotenv').config();
const Steel = require('steel-sdk');
const puppeteer = require('puppeteer-core');

// Initialize Steel with your API key
const steel = new Steel({ steelAPIKey: process.env.STEEL_API_KEY });

async function scrapeExample() {
  // Step 1: Request a browser session from Steel
  console.log('Starting a Steel browser session...');
  const session = await steel.sessions.create();
  console.log(`Session created: ${session.id}`);

  // Step 2: Connect Puppeteer to your cloud browser
  console.log('Connecting to the browser...');
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${session.id}`
  });

  // Step 3: Open a new page and navigate
  console.log('Navigating to example.com...');
  const page = await browser.newPage();
  await page.goto('https://example.com');
  console.log('Page loaded!');

  // Step 4: Extract the information we want
  console.log('Reading page content...');
  const pageData = await page.evaluate(() => {
    return {
      h1: document.querySelector('h1')?.textContent,
      paragraph: document.querySelector('p')?.textContent,
      allLinks: Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.textContent,
        href: a.href
      }))
    };
  });

  console.log('Data extracted:');
  console.log(JSON.stringify(pageData, null, 2));

  // Step 5: Clean up - close everything
  console.log('Closing the browser and session...');
  await browser.close();
  await steel.sessions.release(session.id);
  console.log('Done! Session closed.');

  return pageData;
}

// Run the automation
scrapeExample()
  .then(data => {
    console.log('\nSuccess! Here\'s what we got:');
    console.log(data);
  })
  .catch(error => {
    console.error('Something went wrong:', error.message);
  });
```
