// config.js
import dotenv from 'dotenv';
dotenv.config();

export const STEEL_API_KEY = process.env.STEEL_API_KEY;

// Get a free key at https://aistudio.google.com (no credit card required)
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Task: pass as CLI arg or set in .env
export const AGENT_TASK = process.argv[2]
  || process.env.AGENT_TASK
  || 'Find the homepage of steel.dev and summarize what Steel does in one sentence.';

// Viewport — must match what you tell the LLM
export const WIDTH = 1280;
export const HEIGHT = 720;

export const MAX_ITERATIONS = 50;

if (!STEEL_API_KEY) {
  console.error('Error: STEEL_API_KEY is not set.');
  process.exit(1);
}
if (!GOOGLE_API_KEY) {
  console.error('Error: GOOGLE_API_KEY is not set. Get one free at https://aistudio.google.com');
  process.exit(1);
}
