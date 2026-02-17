# Steel.dev Happy Path: Automate Web Reading in Minutes

## What You're About to Build

Imagine you need to check example.com every day to grab some information. Maybe it's pricing data, product availability, or news updates. Instead of manually opening your browser, navigating to the page, and copy-pasting data, you're going to automate this entire process with **Steel**.

**Steel is your browser in the cloud.** It spins up a real Chrome instance, controlled by your code, that can visit websites, click buttons, fill forms, and extract data just like you would manually. The difference? It runs 24/7, never gets tired, and takes milliseconds instead of minutes.

Let's build this step by step.

---

## Step 1: Get Your Steel API Key

Before writing any code, you need access to Steel's cloud browsers.

1. Go to [steel.dev](https://steel.dev) and sign up for an account
2. Navigate to your dashboard
3. Find your **API key**, it looks something like `sk_live_abc123...`
4. Copy it somewhere safe (you'll need it in a moment)

**Why Steel needs this:** Your API key is how Steel knows it's you making requests. It's like a password that lets you spin up browsers in their cloud.

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

Create a `.env` file in your project root:

```
STEEL_API_KEY=your_api_key_here
```

**Why:** Keep your API key out of your code for security.

---

## Step 4: Write the Automation Script

Create a file called `scrape.js`:

```javascript
require('dotenv').config();
const Steel = require('steel-sdk');
const puppeteer = require('puppeteer-core');

// Initialize Steel with your API key
const steel = new Steel({ steelAPIKey: process.env.STEEL_API_KEY });

async function scrapeExample() {
  // Step 1: Request a browser session from Steel
  console.log('🚀 Starting a Steel browser session...');
  const session = await steel.sessions.create();
  console.log(`✅ Session created: ${session.id}`);

  // Step 2: Connect Puppeteer to your cloud browser
  console.log('🔌 Connecting to the browser...');
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${session.id}`
  });

  // Step 3: Open a new page and navigate
  console.log('🌐 Navigating to example.com...');
  const page = await browser.newPage();
  await page.goto('https://example.com');
  console.log('✅ Page loaded!');

  // Step 4: Extract the information we want
  console.log('📖 Reading page content...');
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

  console.log('📊 Data extracted:');
  console.log(JSON.stringify(pageData, null, 2));

  // Step 5: Clean up - close everything
  console.log('🧹 Closing the browser and session...');
  await browser.close();
  await steel.sessions.release(session.id);
  console.log('✅ Done! Session closed.');

  return pageData;
}

// Run the automation
scrapeExample()
  .then(data => {
    console.log('\n🎉 Success! Here\'s what we got:');
    console.log(data);
  })
  .catch(error => {
    console.error('❌ Something went wrong:', error.message);
  });
```

---

## Understanding What This Code Does

Let's break down each part so you understand exactly what's happening:

### **The Setup**
```javascript
require('dotenv').config();
const Steel = require('steel-sdk');
const puppeteer = require('puppeteer-core');
const steel = new Steel({ steelAPIKey: process.env.STEEL_API_KEY });
```

This is your connection handshake with Steel. You're loading your secret API key and creating a `steel` object that can spin up cloud browsers. The `puppeteer` library is what you'll use to actually control those browsers.

---

### **Starting a Session**
```javascript
const session = await steel.sessions.create();
```

**This is where the magic happens.** Steel spins up a real Chrome browser in their cloud just for you. It's like calling a taxi: you request it, and within seconds, a fresh browser is ready and waiting for your commands.

The `session.id` is your unique identifier for this browser. Multiple people can use Steel at once, and this ID makes sure your commands go to *your* browser, not someone else's.

### **Connecting Puppeteer to Your Cloud Browser**
```javascript
const browser = await puppeteer.connect({
  browserWSEndpoint: `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${session.id}`
});
```

This is where Puppeteer connects to your Steel browser via WebSocket. The URL includes:
- **wss://connect.steel.dev** - Steel's WebSocket gateway
- **apiKey** - Your authentication
- **sessionId** - Which specific browser to connect to

Think of it like dialing into a video conference - you need the meeting link (connect.steel.dev), your credentials (apiKey), and the specific room number (sessionId).

---

### **Opening a Page and Navigating**
```javascript
const page = await browser.newPage();
await page.goto('https://example.com');
```

Now you're actually controlling the browser. `newPage()` opens a fresh tab, and `goto()` tells it to load example.com just like clicking the address bar and hitting Enter.

**Why Steel is perfect here:** Traditional scraping tools send simple HTTP requests, which many modern websites block or return incomplete data. Steel uses a *real browser*, so the website sees a normal visitor, not a bot.

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

This is where you grab the information you need. `page.evaluate()` runs JavaScript **inside the browser page** — just like opening your browser's console and typing code there.

You're using standard web APIs:
- `document.querySelector('h1')` - Find the first `<h1>` tag
- `document.querySelectorAll('a')` - Find all `<a>` link tags
- `.textContent` - Get the visible text
- `.href` - Get the link URL

**The beauty of Steel + Puppeteer:** You use the exact same JavaScript you'd write in a browser console. No special syntax, no learning curve — if you know basic web development, you already know how to scrape with Steel.

---

### **Closing the Session**
```javascript
await browser.close();
await steel.sessions.release(session.id);
```

This shuts down your Puppeteer connection and releases your cloud browser. **Important:** Steel charges based on session time, so always close your sessions when you're done. 

`browser.close()` disconnects Puppeteer, and `steel.sessions.release()` tells Steel "I'm done with this browser, you can shut it down." Think of it like hanging up a phone call — leaving it running wastes resources (and money).

**💡 Pro tip:** Not sure if you have sessions running? Check your [Steel dashboard](https://app.steel.dev/sessions) to view all active sessions.

---

## Step 5: Run Your Automation

Execute the script:

```bash
node scrape.js
```

You'll see output like this:

```
🚀 Starting a Steel browser session...
✅ Session created: ses_abc123xyz
🌐 Navigating to example.com...
✅ Page loaded!
📖 Reading page content...
📊 Data extracted:
{
  "h1": "Example Domain",
  "paragraph": "This domain is for use in illustrative examples...",
  "allLinks": [
    { "text": "More information...", "href": "https://www.iana.org/domains/example" }
  ]
}
🧹 Closing the session...
✅ Done! Session closed.
```

**Congratulations!** You just automated a web task that would take a human 10-15 seconds, and your code did it in under 3 seconds.

---

## What's Next?

Now that you've mastered the happy path, here's what Steel can do beyond basic scraping:

- **Beat bot detection** with residential proxies across millions of IPs
- **Auto-solve CAPTCHAs** (reCAPTCHA, Cloudflare Turnstile) without manual intervention
- **Persist login sessions** with cookies and localStorage across multiple runs
- **Debug live** with real-time session viewers showing exactly what your browser sees
- **Extract LLM-ready data** with automatic markdown conversion (80% fewer tokens)
- **Scale to thousands** of concurrent sessions without managing infrastructure

**The foundation is the same:** create session → connect Puppeteer → automate → close session.

You can find more examples in [Steel's Cookbook](https://github.com/steel-dev/steel-cookbook).

---

## The Bottom Line

Steel turns browser automation from a multi-day DevOps project into a 10-minute coding task. You get enterprise-grade browser infrastructure without managing a single server.

**Your code stays simple. Steel handles the complexity.**

That's the Steel.dev promise — and you just experienced it firsthand.

---

## Need Help?

- 📚 [Steel Documentation](https://docs.steel.dev)
- 💬 [Discord Community](https://discord.com/invite/steeldivision)

Now go automate something awesome! 🚀