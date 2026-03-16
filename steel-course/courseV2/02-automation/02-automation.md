# Browser Automation & AI Agents

## Connecting an Automation Framework

Steel sessions use CDP (Chrome DevTools Protocol) as the bridge between your automation framework and the cloud browser. Playwright, Puppeteer, and Selenium all support it.

This course uses Playwright. For Puppeteer and Selenium, see [code_snippets/](./code_snippets/).

### Playwright (Node.js)

```js
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(
  `wss://connect.steel.dev?apiKey=${STEEL_API_KEY}&sessionId=${session.id}`
);
const context = browser.contexts()[0];
const page = context.pages()[0];
```

---

## Session Configuration for Agent Workflows

These parameters matter more for agents than for simple scraping:

```js
const session = await client.sessions.create({
  timeout: 600000,                      // max 10 min; agents take longer
  dimensions: { width: 1280, height: 720 }, // must match what you tell the LLM
  blockAds: true,                       // cleaner screenshots
  deviceConfig: { device: 'mobile' },  // optional; simpler DOM, easier for agents
});
console.log('Live view:', session.sessionViewerUrl);
```

`dimensions` is important for agent loops: the LLM reasons about pixel coordinates, so the viewport size you set must match the size you tell the model.

---

## The Computer Use API

`POST /v1/sessions/{id}/computer` executes browser actions directly on the session.

### Available actions

| Action | Key parameters |
|---|---|
| `take_screenshot` | — |
| `move_mouse` | `x`, `y` |
| `click_mouse` | `x`, `y`, `button`, `clickCount` |
| `press_key` | `key` (e.g. `Return`, `Escape`, `Control+l`) |
| `type_text` | `text` |
| `scroll` | `x`, `y`, `direction`, `scrollCount` |
| `drag_mouse` | `startX`, `startY`, `endX`, `endY` |
| `wait` | `duration` |

```js
// Screenshot — returns base64 PNG
const result = await client.sessions.computer(session.id, {
  action: 'take_screenshot',
});
// result.screenshot — base64 encoded PNG

// Click
await client.sessions.computer(session.id, {
  action: 'click_mouse',
  x: 640, y: 360,
});

// Type
await client.sessions.computer(session.id, {
  action: 'type_text',
  text: 'search query',
});

// Press key
await client.sessions.computer(session.id, {
  action: 'press_key',
  key: 'Return',
});
```

**Computer Use vs Playwright:** if you know the selector, use Playwright — it's faster and more reliable. Use Computer Use when the LLM is deciding from a screenshot where to click.

---

## Building the Agent Loop

The core loop: take a screenshot, send it to a vision LLM, execute whatever action the model returns, repeat.

```
screenshot → LLM sees image → LLM returns action → execute action → repeat
```

This course uses `gemini-2.0-flash` (free at [aistudio.google.com](https://aistudio.google.com), no credit card). The same loop works with Claude or GPT-4o — see the Steel cookbook links below.

### Loop implementation

```js
while (iteration < MAX_ITERATIONS) {
  const screenshot = await takeScreenshot(session.id);
  const response = await chat.sendMessage([
    { text: 'Current browser state:' },
    { inlineData: { data: screenshot, mimeType: 'image/png' } },
    { text: 'What is your next action?' },
  ]);

  const call = getFunctionCall(response);
  if (!call || call.name === 'done') break;

  await executeAction(session.id, call);
  iteration++;
}
```

Three things required in every agent loop:

1. **Iteration cap** — without one, a stuck agent runs until the session times out
2. **Repetition detection** — if the model calls the same action 3 times in a row, it's stuck; break out
3. **`finally` block for session release** — agent loops die in unexpected places; release must be in `finally`

### Other LLM options

- Claude: [steel-claude-computer-use-node-starter](https://github.com/steel-dev/steel-cookbook/tree/main/examples/steel-claude-computer-use-node-starter)
- OpenAI: [steel-oai-computer-use-node-starter](https://github.com/steel-dev/steel-cookbook/tree/main/examples/steel-oai-computer-use-node-starter)

### Agent frameworks

For higher-level abstractions, agent frameworks wrap the loop for you:

**Browser-use (Python):**
```python
from browser_use import Agent, BrowserSession
session = BrowserSession(cdp_url=f"wss://connect.steel.dev?apiKey=...&sessionId=...")
agent = Agent(task="research task", llm=llm, browser_session=session)
await agent.run()
```

**Stagehand (TypeScript/Python):** connects via the same CDP URL pattern.

See [code_snippets/](./code_snippets/) for minimal connection examples.

---

## Session Context

After the agent finishes, extract what the session accumulated:

```js
const sessionContext = await client.sessions.context(session.id);
// sessionContext.cookies[]
// sessionContext.localStorage{}
// sessionContext.sessionStorage{}
```

Useful for: confirming the agent reached a logged-in state, persisting cookies for the next session.

---

## Project: Web Research Agent

### Goal

Build a vision-driven AI agent that can browse any website to complete a research task — exactly what you'd wire into a larger agentic workflow. The script uses Gemini to look at browser screenshots and decide what to click, type, and navigate next. The key concepts shown: the Computer Use API, the screenshot-decide-act loop, and how to prevent a stuck agent from running forever.

### Prerequisites

Get a free `GOOGLE_API_KEY` at [aistudio.google.com](https://aistudio.google.com) — no credit card required. `gemini-2.0-flash` is free up to roughly 1M tokens/day.

### How to run

```bash
npm install
cp .env.example .env
# open .env and set STEEL_API_KEY, GOOGLE_API_KEY
```

You can pass the task as a CLI argument:

```bash
node research-agent.js "What is the current price of Steel's Hobby plan?"
```

Or set `AGENT_TASK` in `.env` and run:

```bash
node research-agent.js
```

### What the script does

1. **Creates a session** with `dimensions: { width: 1280, height: 720 }` — the viewport size must match what you tell the LLM
2. **Prints the live viewer URL** — open it in a tab to watch the agent in action
3. **Connects Playwright** and navigates to `https://www.google.com` to give the agent a clean starting point
4. **Starts the agent loop** (up to 50 iterations):
   - Takes a screenshot from the running browser via the Computer Use API
   - Sends the screenshot to Gemini with a list of available tools (click, type, scroll, press key, done)
   - Gemini returns a tool call (e.g., `click_mouse` at a coordinate)
   - Executes that action on the session via the Computer Use API
   - Checks for repetition — if the model calls the same action 3× in a row it's stuck; the loop breaks
   - Calls `done` when the model signals the task is complete
5. **Prints the result** Gemini returned
6. **Extracts the session context** (cookies the agent accumulated) for inspection
7. **Releases the session**

### Expected output

```
Task: What is the current price of Steel's Hobby plan?
Session: ses_abc123
Live view: https://viewer.steel.dev/...

Starting agent loop (max 50 iterations)...

[1/50] Taking screenshot...
  Action: click_mouse { x: 640, y: 180 }
[2/50] Taking screenshot...
  Action: type_text { text: 'steel.dev pricing' }
...
Done: Steel's Hobby plan is free — 100 browsing hours included, no credit card required.

--- Result ---
Steel's Hobby plan is free — 100 browsing hours included, no credit card required.

Session cookies: 12
Session released.
```

### Common errors

**Blank or mostly-white first screenshot** — the `google.com` page didn't load before the loop started. The script waits on `domcontentloaded`; if this still happens, add a short `waitForLoadState('networkidle')` before starting the loop.

**Agent loops endlessly without progress** — the repetition guard will catch this after 3 repeated actions. If you need more fine-grained control, add more specific intent to the system prompt (e.g., "navigate to steel.dev and find the pricing page").

**`GOOGLE_API_KEY` error** — confirm the key is set in `.env` and that you copied `.env.example` first.

### Using a different LLM

The loop is LLM-agnostic. Drop-in starters for Claude and OpenAI:
- [steel-claude-computer-use-node-starter](https://github.com/steel-dev/steel-cookbook/tree/main/examples/steel-claude-computer-use-node-starter)
- [steel-oai-computer-use-node-starter](https://github.com/steel-dev/steel-cookbook/tree/main/examples/steel-oai-computer-use-node-starter)
