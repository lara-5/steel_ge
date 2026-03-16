# Chrome Extensions — Agent Reference

## Upload Extension

```js
const extensionFile = fs.readFileSync('./extension.zip');
const extension = await client.extensions.create(
  new Blob([extensionFile]),
  { filename: 'extension.zip' }
);
// extension.id — save this
```

## Extension CRUD

```js
const { extensions } = await client.extensions.list();
const ext = await client.extensions.retrieve(id);
await client.extensions.update(id, newZipBlob, { filename: 'new.zip' });
await client.extensions.delete(id);
await client.extensions.deleteAll();
```

## Attach to Session

```js
const session = await client.sessions.create({
  timeout: 90000,
  extensionIds: [extensionId],  // array of IDs
  blockAds: true,               // combine with built-in ad blocking
});
```

## Verify Extension is Running

```js
await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle').catch(() => {});
const screenshot = await page.screenshot({ fullPage: false });
// Visual confirmation: compare with/without extension screenshot
```

## Session Factory Pattern

```js
// Without extension
const session1 = await client.sessions.create({ timeout: 90000, blockAds: true });

// With extension
const session2 = await client.sessions.create({
  timeout: 90000,
  blockAds: true,
  extensionIds: [extensionId],
});
```

## Notes

- Each session gets its own isolated extension instance
- Extension activates at session start, before any navigation
- File format: `.crx` or zip of unpacked extension directory
