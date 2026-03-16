// config.js
import dotenv from 'dotenv';
dotenv.config();

export const STEEL_API_KEY = process.env.STEEL_API_KEY;

// Optional: set after uploading an extension via POST /v1/extensions
export const EXTENSION_ID = process.env.EXTENSION_ID || null;

// Target URL to test the extension on
export const TARGET_URL = process.env.TARGET_URL || 'https://www.bbc.com';

if (!STEEL_API_KEY) {
  console.error('Error: STEEL_API_KEY is not set.');
  process.exit(1);
}
