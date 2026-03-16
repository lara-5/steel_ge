# Browser Automation & AI Agents — Agent Reference

## Session Config for Agents

```js
const session = await client.sessions.create({
  timeout: 600000,
  dimensions: { width: 1280, height: 720 }, // MUST match what you tell the LLM
  blockAds: true,
  deviceConfig: { device: 'mobile' }, // optional
});
// session.id, session.sessionViewerUrl
```

## CDP Connect (Playwright)

```js
const browser = await chromium.connectOverCDP(
  `wss://connect.steel.dev?apiKey=${STEEL_API_KEY}&sessionId=${session.id}`
);
const context = browser.contexts()[0];
const page = context.pages()[0];
```

## Computer Use API

Endpoint: `POST /v1/sessions/{id}/computer`

SDK: `await client.sessions.computer(session.id, { action, ...params })`

### Actions

| Action | Params |
|---|---|
| `take_screenshot` | — |
| `move_mouse` | `x`, `y` |
| `click_mouse` | `x`, `y`, `button` (left/right/middle), `clickCount` |
| `press_key` | `key` |
| `type_text` | `text` |
| `scroll` | `x`, `y`, `direction` (up/down/left/right), `scrollCount` |
| `drag_mouse` | `startX`, `startY`, `endX`, `endY` |
| `wait` | `duration` (ms) |

```js
// Screenshot → base64 PNG
const { screenshot } = await client.sessions.computer(session.id, { action: 'take_screenshot' });

// Click
await client.sessions.computer(session.id, { action: 'click_mouse', x: 500, y: 300 });

// Type
await client.sessions.computer(session.id, { action: 'type_text', text: 'hello' });

// Key press — common: Return, Escape, Control+l, Tab
await client.sessions.computer(session.id, { action: 'press_key', key: 'Return' });

// Scroll
await client.sessions.computer(session.id, { action: 'scroll', direction: 'down', scrollCount: 3 });
```

## Agent Loop Pattern (Gemini example)

```js
const model = genai.getGenerativeModel({
  model: 'gemini-2.0-flash',
  systemInstruction: `You control a ${WIDTH}x${HEIGHT} browser. Call 'done' when task is complete.`,
  tools: [{ functionDeclarations: BROWSER_TOOLS }],
});
const chat = model.startChat();
await chat.sendMessage(`Task: ${task}`);

let iteration = 0, lastActionStr = null, repeatCount = 0;

while (iteration < MAX_ITERATIONS) {
  iteration++;
  const { screenshot } = await client.sessions.computer(sessionId, { action: 'take_screenshot' });

  const response = await chat.sendMessage([
    { text: 'Current browser state:' },
    { inlineData: { data: screenshot, mimeType: 'image/png' } },
    { text: 'Next action?' },
  ]);

  const call = response.response.candidates?.[0]?.content?.parts
    ?.find(p => p.functionCall)?.functionCall;
  if (!call) break;
  if (call.name === 'done') return call.args.result;

  // Repetition detection
  const actionStr = JSON.stringify(call);
  if (actionStr === lastActionStr) { if (++repeatCount >= 3) break; }
  else { repeatCount = 0; lastActionStr = actionStr; }

  await client.sessions.computer(sessionId, { action: call.name, ...call.args });
  await chat.sendMessage([{ functionResponse: { name: call.name, response: { status: 'ok' } } }]);
}
```

## Session Context (post-agent)

```js
const ctx = await client.sessions.context(session.id);
// ctx.cookies[], ctx.localStorage{}, ctx.sessionStorage{}
```

## Live Details

```js
const details = await client.sessions.liveDetails(session.id);
```

## Cleanup (always in finally)

```js
} finally {
  if (session) await client.sessions.release(session.id);
}
```
