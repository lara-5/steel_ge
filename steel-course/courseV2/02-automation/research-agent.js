// research-agent.js
// Subcourse 2 — Automation project
//
// Gemini-powered browser agent using the Steel Computer Use API.
// Get a free GOOGLE_API_KEY at https://aistudio.google.com (no credit card).
// For Claude/OpenAI versions see:
//   https://github.com/steel-dev/steel-cookbook/tree/main/examples/steel-claude-computer-use-node-starter
//   https://github.com/steel-dev/steel-cookbook/tree/main/examples/steel-oai-computer-use-node-starter

import { STEEL_API_KEY, GOOGLE_API_KEY, AGENT_TASK, WIDTH, HEIGHT, MAX_ITERATIONS } from './config.js';
import Steel from 'steel-sdk';
import { chromium } from 'playwright';
import { GoogleGenerativeAI } from '@google/generative-ai';

const client = new Steel({ steelAPIKey: STEEL_API_KEY });
const genai = new GoogleGenerativeAI(GOOGLE_API_KEY);

// Session config — dimensions must match what we tell the LLM
const SESSION_OPTIONS = {
  timeout: 600000,
  dimensions: { width: WIDTH, height: HEIGHT },
  blockAds: true,
};

// Computer Use API helpers
async function takeScreenshot(sessionId) {
  const result = await client.sessions.computer(sessionId, { action: 'take_screenshot' });
  return result.screenshot; // base64 PNG
}

async function executeAction(sessionId, action) {
  const { name, ...params } = action;
  await client.sessions.computer(sessionId, { action: name, ...params });
}

// Tool declarations — what actions the LLM can call
const BROWSER_TOOLS = [
  {
    name: 'click_mouse',
    description: 'Click at (x, y) on the screen',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X pixel coordinate' },
        y: { type: 'number', description: 'Y pixel coordinate' },
      },
      required: ['x', 'y'],
    },
  },
  {
    name: 'type_text',
    description: 'Type text into the focused element',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to type' },
      },
      required: ['text'],
    },
  },
  {
    name: 'press_key',
    description: 'Press a keyboard key (e.g. Return, Escape, Control+l)',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Key name' },
      },
      required: ['key'],
    },
  },
  {
    name: 'scroll',
    description: 'Scroll the page',
    parameters: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['up', 'down'] },
        scrollCount: { type: 'number', description: 'Number of scroll steps' },
      },
      required: ['direction'],
    },
  },
  {
    name: 'done',
    description: 'Call this when the task is complete, providing the final answer',
    parameters: {
      type: 'object',
      properties: {
        result: { type: 'string', description: 'The final answer or result' },
      },
      required: ['result'],
    },
  },
];

async function runAgentLoop(task, sessionId) {
  // Verify model name: https://ai.google.dev/gemini-api/docs/models/gemini
  const model = genai.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: `You control a ${WIDTH}x${HEIGHT} browser. Complete the task using browser tools. Call 'done' with your result when finished.`,
    tools: [{ functionDeclarations: BROWSER_TOOLS }],
  });

  const chat = model.startChat();
  await chat.sendMessage(`Task: ${task}`);

  let iteration = 0;
  let lastActionStr = null;
  let repeatCount = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`\n[${iteration}/${MAX_ITERATIONS}] Taking screenshot...`);

    const screenshot = await takeScreenshot(sessionId);

    const response = await chat.sendMessage([
      { text: 'Current browser state:' },
      { inlineData: { data: screenshot, mimeType: 'image/png' } },
      { text: 'Next action? If task is complete, call done.' },
    ]);

    const parts = response.response.candidates?.[0]?.content?.parts ?? [];
    const functionCallPart = parts.find(p => p.functionCall);

    if (!functionCallPart) {
      const textPart = parts.find(p => p.text);
      console.log('Agent finished (no function call):', textPart?.text ?? '—');
      return textPart?.text ?? 'No explicit result.';
    }

    const call = functionCallPart.functionCall;
    console.log(`  Action: ${call.name}`, call.args);

    if (call.name === 'done') {
      console.log('Done:', call.args.result);
      return call.args.result;
    }

    // Repetition detection
    const actionStr = JSON.stringify(call);
    if (actionStr === lastActionStr) {
      if (++repeatCount >= 3) {
        console.log('Agent stuck (3 repeated actions) — stopping.');
        return 'Agent stopped: repeated actions. Check session viewer.';
      }
    } else {
      repeatCount = 0;
      lastActionStr = actionStr;
    }

    await executeAction(sessionId, { name: call.name, ...call.args });

    // Feed back result so model knows action was taken
    await chat.sendMessage([{
      functionResponse: { name: call.name, response: { status: 'action executed' } },
    }]);
  }

  return `Reached max iterations (${MAX_ITERATIONS}).`;
}

async function main() {
  let session;
  try {
    console.log(`Task: ${AGENT_TASK}\n`);

    session = await client.sessions.create(SESSION_OPTIONS);
    console.log(`Session: ${session.id}`);
    console.log(`Live view: ${session.sessionViewerUrl}\n`);

    const browser = await chromium.connectOverCDP(
      `wss://connect.steel.dev?apiKey=${STEEL_API_KEY}&sessionId=${session.id}`
    );
    const page = browser.contexts()[0].pages()[0];

    // Navigate to a start page before the agent loop
    await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });

    console.log(`Starting agent loop (max ${MAX_ITERATIONS} iterations)...`);
    const result = await runAgentLoop(AGENT_TASK, session.id);

    console.log('\n--- Result ---');
    console.log(result);

    // Extract session context after agent finishes
    const sessionContext = await client.sessions.context(session.id);
    console.log(`\nSession cookies: ${sessionContext.cookies?.length ?? 0}`);

    await browser.close();
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (session) {
      await client.sessions.release(session.id);
      console.log('Session released.');
    }
  }
}

main();
