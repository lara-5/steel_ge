// monitored-runner.js
// Subcourse 7 — Production project
//
// Production-grade session runner with:
// - Structured JSON logging
// - Retry with exponential backoff on session creation
// - Graceful SIGINT/SIGTERM cleanup
// - Session audit log (session-audit.log)
// - Run summary
//
// Usage as library: import { runSession } and pass a task function.
// Usage as demo:    node monitored-runner.js

import { STEEL_API_KEY } from './config.js';
import Steel from 'steel-sdk';
import { chromium } from 'playwright';
import fs from 'fs';

const client = new Steel({ steelAPIKey: STEEL_API_KEY });

// Track all active sessions for cleanup
const activeSessions = new Set();

// Structured logger — outputs JSON lines
const log = {
  info:  (msg, data = {}) => console.log(JSON.stringify({ level: 'INFO',  ts: new Date().toISOString(), msg, ...data })),
  warn:  (msg, data = {}) => console.warn(JSON.stringify({ level: 'WARN',  ts: new Date().toISOString(), msg, ...data })),
  error: (msg, data = {}) => console.error(JSON.stringify({ level: 'ERROR', ts: new Date().toISOString(), msg, ...data })),
};

// Append one JSON line per session to the audit log
function auditLog(entry) {
  fs.appendFileSync('session-audit.log', JSON.stringify(entry) + '\n');
}

async function safeRelease(sessionId) {
  try {
    await client.sessions.release(sessionId);
    log.info('Session released', { sessionId });
  } catch (err) {
    log.error('Release failed', { sessionId, error: err.message });
  }
  activeSessions.delete(sessionId);
}

async function cleanupAll() {
  if (activeSessions.size === 0) return;
  log.info(`Cleaning up ${activeSessions.size} active session(s)...`);
  await Promise.allSettled([...activeSessions].map(id => safeRelease(id)));
}

// Graceful shutdown
process.on('SIGINT',  async () => { log.info('SIGINT'); await cleanupAll(); process.exit(0); });
process.on('SIGTERM', async () => { log.info('SIGTERM'); await cleanupAll(); process.exit(0); });
process.on('uncaughtException', async err => { log.error('Uncaught', { error: err.message }); await cleanupAll(); process.exit(1); });

// Retry with exponential backoff
async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 1000, label = '' } = {}) {
  let lastErr;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, i - 1);
        log.warn(`Retry ${i}/${maxAttempts} — ${label}`, { delay, error: err.message });
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

/**
 * Run a task in a monitored Steel session.
 * @param {(session: object, page: object) => Promise<any>} taskFn
 * @param {object} options - passed to sessions.create()
 */
export async function runSession(taskFn, options = {}) {
  const startTime = Date.now();
  let session;
  let result;
  let status = 'error';

  try {
    session = await withRetry(
      () => client.sessions.create({ timeout: 120000, ...options }),
      { maxAttempts: 3, label: 'session create' }
    );

    activeSessions.add(session.id);
    log.info('Session started', { sessionId: session.id, viewerUrl: session.sessionViewerUrl });

    const browser = await chromium.connectOverCDP(
      `wss://connect.steel.dev?apiKey=${STEEL_API_KEY}&sessionId=${session.id}`
    );
    const page = browser.contexts()[0].pages()[0];

    result = await taskFn(session, page);
    status = 'success';

    await browser.close();
  } catch (err) {
    log.error('Task failed', { sessionId: session?.id, error: err.message });
  } finally {
    const durationMs = Date.now() - startTime;
    if (session) {
      auditLog({
        sessionId: session.id,
        status,
        durationMs,
        viewerUrl: session.sessionViewerUrl,
        ts: new Date().toISOString(),
      });
      await safeRelease(session.id);
    }
    log.info('Run complete', { status, durationMs });
  }

  return { status, result };
}

// Demo: run 3 sessions and print a summary
async function main() {
  log.info('Starting monitored session runner demo...');

  const outcomes = [];
  const RUNS = 3;

  for (let i = 0; i < RUNS; i++) {
    const run = await runSession(async (session, page) => {
      await page.goto('https://steel.dev', { waitUntil: 'domcontentloaded' });
      const title = await page.title();
      log.info('Page title', { sessionId: session.id, title });
      return { title };
    });
    outcomes.push(run);
  }

  const succeeded = outcomes.filter(r => r.status === 'success').length;
  const failed = outcomes.filter(r => r.status === 'error').length;
  log.info('Summary', { total: RUNS, succeeded, failed });

  console.log(`\nAudit log: session-audit.log`);
}

main();
