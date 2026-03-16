// config.js
import dotenv from 'dotenv';
dotenv.config();

export const STEEL_API_KEY = process.env.STEEL_API_KEY;
export const PROFILE_ID = process.env.STEEL_PROFILE_ID || null;

// Update these to your target site
export const LOGIN_URL = process.env.LOGIN_URL || 'https://example.com/login';
export const PROTECTED_URL = process.env.PROTECTED_URL || 'https://example.com/dashboard';

if (!STEEL_API_KEY) {
  console.error('Error: STEEL_API_KEY is not set.');
  process.exit(1);
}
