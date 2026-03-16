# Observability, Debugging & Production Ops

## Session Monitoring

```js
// List all sessions with optional status filter
const { sessions } = await client.sessions.list({ status: 'live' });

// Get a specific session's metadata
const session = await client.sessions.retrieve(sessionId);
// session.status, session.createdAt, session.updatedAt, session.region, session.duration
```

---

## Live Debugging

Every session has a viewer URL. Print it as soon as the session is created so you can watch the agent in real time:

```js
console.log('Live view:', session.sessionViewerUrl);
```

### Embed in your own UI

```html
<iframe
  src="{debugUrl}?interactive=true&showControls=true"
  width="1280"
  height="720"
/>
```

Set `interactive=true` to allow human takeover mid-run.

### Live details

```js
const details = await client.sessions.liveDetails(session.id);
// Returns real-time metadata about the running session
```

### HLS stream

`GET /v1/sessions/{id}/hls` — stream URL for live video of the session.

### Agent Logs

Visible in the Steel dashboard: timeline of every click, navigate, type, and scroll action your agent takes.

---

## Session Recording and Replay

Sessions are recorded automatically. Access replays from the Steel dashboard or embed them:

```html
<!-- Past session replay (different embed type than live stream) -->
<iframe src="{debugUrl}" width="1280" height="720" />
```

Data retention varies by plan. Check current limits at [docs.steel.dev/overview/pricinglimits](https://docs.steel.dev/overview/pricinglimits).

---

## Multi-Region Deployments

```js
const session = await client.sessions.create({
  region: 'us-east-1',  // check available regions at docs.steel.dev
  namespace: 'my-project', // group sessions for organizational purposes
});
```

Region affects latency (sessions start faster when client and session are in the same region) and geo-restrictions. Region failover pattern:

```js
async function createSessionWithFailover(options) {
  for (const region of ['us-east-1', 'eu-west-1']) {
    try {
      return await client.sessions.create({ ...options, region });
    } catch (err) {
      console.warn(`Region ${region} failed: ${err.message}`);
    }
  }
  throw new Error('All regions failed');
}
```

---

## Concurrency & Scaling

Concurrency limits vary by plan — see [docs.steel.dev/overview/pricinglimits](https://docs.steel.dev/overview/pricinglimits) for current values.

### Session pool pattern

```js
async function runConcurrent(tasks, maxConcurrent) {
  const results = [];
  for (let i = 0; i < tasks.length; i += maxConcurrent) {
    const batch = tasks.slice(i, i + maxConcurrent);
    const batchResults = await Promise.allSettled(batch.map(task => runSession(task)));
    results.push(...batchResults);
  }
  return results;
}
```

### Bulk session release

```js
await client.sessions.releaseAll(); // release all active sessions
```

### Graceful shutdown

```js
const activeSessions = new Set();

process.on('SIGINT', async () => {
  console.log('Cleaning up...');
  await Promise.allSettled([...activeSessions].map(id => client.sessions.release(id)));
  process.exit(0);
});
```

Always register cleanup handlers before starting any sessions.

---

## Retry with Exponential Backoff

```js
async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 1000 } = {}) {
  let lastErr;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < maxAttempts) {
        await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, i - 1)));
      }
    }
  }
  throw lastErr;
}

// Usage
const session = await withRetry(() => client.sessions.create({ timeout: 120000 }));
```

---

## JWT Verification

Steel signs webhook and event payloads with a JWT. Verify the signature with Steel's public key set:

```
GET /.well-known/jwks.json
```

Use a standard JWT library (e.g. `jose`) to verify payloads against the returned public keys.

---

## Project: Monitored Session Runner

### Goal

Provide a production-ready wrapper around the Steel session lifecycle that you can drop into any larger system. The three things that most production automations need — and that most demos don't include — are: structured logs that a log aggregator can parse, retry logic so transient failures don't fail the whole job, and guaranteed session cleanup even when the process crashes or is interrupted.

`monitored-runner.js` exports a `runSession()` function you can import and use directly, or you can run the file as a standalone demo.

### How to run

```bash
npm install
cp .env.example .env
# open .env and set STEEL_API_KEY=st-...
node monitored-runner.js
```

The demo runs 3 sessions sequentially, navigates each to `https://steel.dev`, and prints the page title from each.

### Using it as a library

Import `runSession` and pass a task function:

```js
import { runSession } from './monitored-runner.js';

const { status, result } = await runSession(async (session, page) => {
  await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
  const title = await page.title();
  return { title };
}, {
  blockAds: true,       // any sessions.create() options here
  useProxy: true,
});

console.log(status, result); // 'success' { title: 'Example Domain' }
```

The function handles session creation (with retry), Playwright connection, cleanup in `finally`, and audit logging — your task function only needs to do the actual work.

### What the script does

1. **Registers process signal handlers** (`SIGINT`, `SIGTERM`, `uncaughtException`) — whichever way the process exits, all tracked sessions are released before the process dies
2. **Creates a session with retry** (up to 3 attempts, exponential backoff: 1s, 2s) — covers transient API errors at session creation time
3. **Adds the session to a global registry** so signal handlers can release it
4. **Connects Playwright** and passes both `session` and `page` to your task function
5. **On success or failure**: appends one JSON line to `session-audit.log` with `sessionId`, `status`, `durationMs`, `viewerUrl`, and timestamp
6. **Releases the session** in `finally` — runs even if the task throws
7. **Removes the session from the registry** so the signal handler doesn't try to double-release it

### Expected output

All log lines are JSON (structured for log aggregators):

```
{"level":"INFO","ts":"...","msg":"Starting monitored session runner demo..."}
{"level":"INFO","ts":"...","msg":"Session started","sessionId":"ses_111","viewerUrl":"https://..."}
{"level":"INFO","ts":"...","msg":"Page title","sessionId":"ses_111","title":"Steel — Headless Browser API"}
{"level":"INFO","ts":"...","msg":"Session released","sessionId":"ses_111"}
{"level":"INFO","ts":"...","msg":"Run complete","status":"success","durationMs":3421}
... (repeated 2 more times)
{"level":"INFO","ts":"...","msg":"Summary","total":3,"succeeded":3,"failed":0}

Audit log: session-audit.log
```

`session-audit.log` has one JSON line per session — useful for offline analysis, billing reconciliation, or debugging failed runs.

### Extending the runner

The runner is intentionally minimal. Common extensions:

- **Concurrency**: wrap `runSession` calls in `Promise.allSettled` with a batch size equal to your plan's concurrent session limit
- **Metrics**: emit timing data (`durationMs`) to Datadog, Prometheus, or any metrics sink inside the `finally` block
- **Dead letter queue**: on `status === 'error'`, push the failed task to a retry queue instead of logging and moving on
