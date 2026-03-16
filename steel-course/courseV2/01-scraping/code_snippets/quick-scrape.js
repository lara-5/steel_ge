// quick-scrape.js — code_snippets
// Standalone example: Quick Action scrape with format comparison
// Run: node quick-scrape.js
// Shows html vs cleaned_html vs markdown output sizes for the same URL.

import Steel from 'steel-sdk';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY });
const URL = 'https://en.wikipedia.org/wiki/Web_scraping';

async function main() {
  const result = await client.scrape({
    url: URL,
    format: ['html', 'cleaned_html', 'markdown'],
  });

  console.log('Result keys:', Object.keys(result));
  console.log('Format size comparison:');
  console.log(`  html:         ${result.content?.html?.length.toLocaleString()} chars`);
  console.log(`  cleaned_html: ${result.content?.cleaned_html?.length.toLocaleString()} chars`);
  console.log(`  markdown:     ${result.content?.markdown?.length.toLocaleString()} chars`);

  if (result.content?.markdown) {
    console.log('\nMarkdown preview (first 300 chars):');
    console.log(result.content.markdown.slice(0, 300));
  }
}

main().catch(console.error);
