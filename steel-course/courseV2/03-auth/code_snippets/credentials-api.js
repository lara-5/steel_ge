// credentials-api.js — code_snippets
// Standalone example: Credentials API CRUD operations
// Run: node credentials-api.js
// Note: Credentials API is in beta. Verify behavior at:
//   https://docs.steel.dev/overview/credentials-api/overview

import Steel from 'steel-sdk';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY });

async function main() {
  // Store credentials
  const cred = await client.credential.create({
    url: 'https://example.com',
    fields: {
      username: 'demo@example.com',
      password: 'demo-password',
    },
  });
  console.log('Stored credential:', cred.id);

  // List stored credentials
  const { credentials } = await client.credential.list();
  console.log('Credentials on account:', credentials.length);

  // Update credential
  await client.credential.update(cred.id, {
    fields: { password: 'new-password' },
  });
  console.log('Credential updated.');

  // Delete credential
  await client.credential.delete(cred.id);
  console.log('Credential deleted.');

  // --- Using credentials in a session ---
  // Create a session pointing at the site that matches the credential URL.
  // Steel will auto-inject the credentials when the login page is detected.
  const session = await client.sessions.create({
    timeout: 60000,
  });
  console.log('Session created:', session.id);
  // Credentials are injected automatically — no manual form-filling needed.
  await client.sessions.release(session.id);
  console.log('Session released.');
}

main().catch(console.error);
