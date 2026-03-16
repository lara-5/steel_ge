# Production Ops — Agent Reference

## Session Monitoring

```js
// List sessions
const { sessions } = await client.sessions.list({ status: 'live' });

// Get single session status
const s = await client.sessions.retrieve(sessionId);
// s.status | s.createdAt | s.updatedAt | s.region | s.duration

// Live details (real-time)
const details = await client.sessions.liveDetails(sessionId);

// Event stream: GET /v1/sessions/{id}/events
// HLS stream:   GET /v1/sessions/{id}/hls
```

## Session Viewer Embed

```html
<!-- Live (interactive) -->
<iframe src="{debugUrl}?interactive=true&showControls=true" />

<!-- Replay (past session) -->
<iframe src="{debugUrl}" />
```

## Session Create with Region

```js
const session = await client.sessions.create({
  region: 'us-east-1',     // check available regions in docs
  namespace: 'project-x',  // grouping
  timeout: 120000,
});
```

## Failover

```js
async function createWithFailover(options, regions = ['us-east-1', 'eu-west-1']) {
  for (const region of regions) {
    try { return await client.sessions.create({ ...options, region }); }
    catch { /* try next */ }
  }
  throw new Error('All regions failed');
}
```

## Bulk Release

```js
await client.sessions.releaseAll();
```

## Graceful Shutdown

```js
const activeSessions = new Set();
const cleanup = async () => {
  await Promise.allSettled([...activeSessions].map(id => client.sessions.release(id)));
};
process.on('SIGINT', async () => { await cleanup(); process.exit(0); });
process.on('SIGTERM', async () => { await cleanup(); process.exit(0); });
process.on('uncaughtException', async err => { console.error(err); await cleanup(); process.exit(1); });
```

## Retry with Exponential Backoff

```js
async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 1000 } = {}) {
  let lastErr;
  for (let i = 1; i <= maxAttempts; i++) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      if (i < maxAttempts) await new Promise(r => setTimeout(r, baseDelayMs * 2 ** (i - 1)));
    }
  }
  throw lastErr;
}
```

## Structured Logging

```js
const log = {
  info:  (msg, data = {}) => console.log(JSON.stringify({ level: 'INFO', ts: new Date().toISOString(), msg, ...data })),
  warn:  (msg, data = {}) => console.warn(JSON.stringify({ level: 'WARN', ts: new Date().toISOString(), msg, ...data })),
  error: (msg, data = {}) => console.error(JSON.stringify({ level: 'ERROR', ts: new Date().toISOString(), msg, ...data })),
};
```

## Audit Log

```js
fs.appendFileSync('session-audit.log',
  JSON.stringify({ sessionId, status, durationMs, replay: session.sessionViewerUrl, ts: new Date().toISOString() }) + '\n'
);
```

## JWT Verification

```
GET /.well-known/jwks.json   // Steel's public key set
```

Use `jose` or similar JWT library to verify event/webhook payloads.

## Concurrency Notes

- Concurrency limits vary by plan: [docs.steel.dev/overview/pricinglimits](https://docs.steel.dev/overview/pricinglimits)
- Session pool: batch tasks in chunks of `maxConcurrent`, use `Promise.allSettled`
- Data retention for replays varies by plan (same link)
