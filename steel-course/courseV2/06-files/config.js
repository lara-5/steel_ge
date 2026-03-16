// config.js
import dotenv from 'dotenv';
dotenv.config();

export const STEEL_API_KEY = process.env.STEEL_API_KEY;

// The page that will trigger a file download
export const DOWNLOAD_PAGE_URL = process.env.DOWNLOAD_PAGE_URL || 'https://example.com';

if (!STEEL_API_KEY) {
  console.error('Error: STEEL_API_KEY is not set.');
  process.exit(1);
}
