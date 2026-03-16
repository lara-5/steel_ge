// config.js
import dotenv from 'dotenv';
dotenv.config();

export const STEEL_API_KEY = process.env.STEEL_API_KEY;

if (!STEEL_API_KEY) {
  console.error('Error: STEEL_API_KEY is not set.');
  process.exit(1);
}
