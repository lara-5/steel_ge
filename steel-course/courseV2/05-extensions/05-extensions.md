# Chrome Extensions & Customization

## Why Use Extensions

Browser extensions can do things the Steel API doesn't natively provide: dismiss cookie consent banners, inject custom UI, modify page behavior before your automation code sees the page.

`blockAds: true` at session creation handles ad blocking without an extension. For everything else — cookie banners, custom page modifications, specific filtering — you need to upload and attach an extension.

Extensions are uploaded once and referenced by ID in any session.

---

## Uploading Extensions

Extensions must be a `.crx` file or a zip of the unpacked extension folder.

```js
import fs from 'fs';

const extensionFile = fs.readFileSync('./my-extension.zip');
const extension = await client.extensions.create(
  new Blob([extensionFile]),
  { filename: 'my-extension.zip' }
);
console.log('Extension ID:', extension.id);
// Save extension.id — you'll use it in every session
```

Build a simple test extension (see `code_snippets/sample-extension/`) to verify the upload flow without needing a real extension.

---

## Managing the Extension Library

```js
// List all uploaded extensions
const { extensions } = await client.extensions.list();

// Get a specific extension
const ext = await client.extensions.retrieve(extensionId);

// Update (replace with new version)
await client.extensions.update(extensionId, newZipBlob, { filename: 'updated.zip' });

// Delete one
await client.extensions.delete(extensionId);

// Delete all
await client.extensions.deleteAll();
```

---

## Attaching Extensions to Sessions

```js
const session = await client.sessions.create({
  timeout: 90000,
  extensionIds: [extensionId],  // one or more extension IDs
  blockAds: true,               // combine with built-in ad blocking
});
```

Each session gets its own isolated extension instance. Extensions activate as soon as the session starts. Take a screenshot right after navigation to verify the extension is running.

---

## Project: Session Factory

### Goal

Demonstrate the before/after difference an extension makes. The script runs the same URL twice — once without any extension, once with one attached — and takes a screenshot of each. The comparison makes it obvious whether the extension is actually running and doing what you expect (e.g., a cookie banner was dismissed, a UI element was hidden).

The "factory" part of the name: the script is structured so you can easily add more session variants (different extension combinations, different stealth configs) and compare any number of configurations against the same URL.

### How to run

```bash
npm install
cp .env.example .env
# open .env and set STEEL_API_KEY=st-...
```

Optionally, add an extension ID to `.env`:

```
EXTENSION_ID=ext_abc123
```

If you don't have an extension uploaded yet, see [code_snippets/sample-extension/](./code_snippets/sample-extension/) for a minimal test extension you can zip and upload first. Then:

```bash
node session-factory.js
```

### Uploading the sample extension (optional)

1. Zip the `sample-extension/` folder into `sample-extension.zip`
2. Upload it:

```js
import fs from 'fs';
import Steel from 'steel-sdk';
const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY });
const ext = await client.extensions.create(
  new Blob([fs.readFileSync('./sample-extension.zip')]),
  { filename: 'sample-extension.zip' }
);
console.log('Extension ID:', ext.id); // paste this into EXTENSION_ID in .env
```

### What the script does

1. **Session 1 (no extension)**: Creates a session with just `blockAds: true`, navigates to `TARGET_URL` (default: `https://www.bbc.com`), and takes a screenshot
2. Scans `document.body.innerText` for cookie-related keywords (`"accept"`, `"consent"`, `"cookie"`) to detect whether a cookie banner is visible
3. **Session 2 (with extension)**: Creates a second session with `extensionIds: [EXTENSION_ID]`, navigates to the same URL, screenshots again
4. Prints a comparison of cookie banner detection in both sessions

### Expected output

```
Target: https://www.bbc.com
Extension ID: ext_abc123

[without-extension] Session: ses_111...
  Live view: https://viewer.steel.dev/...
  Cookie banner detected: true
[without-extension] Screenshot: screenshots/without-extension.png

[with-extension] Session: ses_222...
  Live view: https://viewer.steel.dev/...
  Cookie banner detected: false
[with-extension] Screenshot: screenshots/with-extension.png

=== Comparison ===
Without extension — cookie banner: true
With extension    — cookie banner: false

Check screenshots/ to see the visual difference.
```

### Common errors

**Both sessions show the same result** — either the extension isn't doing anything to this specific site, or `EXTENSION_ID` isn't set and both runs use the same config. Open the screenshots to confirm what the browser actually saw.

**Extension upload fails** — make sure the file is a valid `.crx` or zip of an unpacked folder, and that `manifest_version: 3` is used (MV2 is deprecated in modern Chrome).
