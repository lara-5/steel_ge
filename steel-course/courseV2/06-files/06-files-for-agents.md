# File Management — Agent Reference

## Session Files

```js
// Upload
await client.sessions.files.upload(session.id, new Blob([fsBuffer]), { filename: 'file.csv' });

// List
const { files } = await client.sessions.files.list(session.id);

// Download (by path)
const data = await client.sessions.files.download(session.id, 'file.csv');

// Delete one
await client.sessions.files.delete(session.id, 'file.csv');

// Delete all
await client.sessions.files.deleteAll(session.id);

// Download all as ZIP
const zip = await client.sessions.files.downloadZip(session.id);
fs.writeFileSync('session.zip', Buffer.from(await zip.arrayBuffer()));
```

## Global Files

```js
// Upload
await client.files.upload(new Blob([fsBuffer]), { filename: 'file.csv' });

// List
const { files } = await client.files.list();

// Download
const data = await client.files.download('file.csv');

// Delete
await client.files.delete('file.csv');
```

## Auto-Promotion

Session files are automatically promoted to global storage when `sessions.release()` is called.

## Browser Download Pattern

```js
// Set up listener BEFORE triggering
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 30000 }),
  page.click('#download-btn'),
]);

const path = await download.path();
fs.copyFileSync(path, `downloads/${download.suggestedFilename()}`);
```

## File Form Upload (Playwright)

```js
// Simple file input
await page.setInputFiles('input[type=file]', './localfile.csv');
```
