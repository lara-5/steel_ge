// config.js
import dotenv from 'dotenv';
dotenv.config();

export const STEEL_API_KEY = process.env.STEEL_API_KEY;

// Change this to a bot-protected site you want to test against
export const TARGET_URL = process.env.TARGET_URL || 'https://bot.sannysoft.com';

if (!STEEL_API_KEY) {
  console.error('Error: STEEL_API_KEY is not set.');
  process.exit(1);
}
