// content.js — runs on every page after DOM is ready
// This minimal extension logs a message to the console.
// Replace this logic with real behavior (e.g., dismissing cookie banners).

console.log('[Steel Test Extension] Running on:', window.location.href);

// Example: dismiss a simple cookie consent banner by clicking its accept button
// Uncomment and adapt selectors to match your target site:
//
// const acceptBtn = document.querySelector(
//   '[aria-label*="accept"], button[id*="accept"], button[class*="accept-cookie"]'
// );
// if (acceptBtn) {
//   acceptBtn.click();
//   console.log('[Steel Test Extension] Cookie banner dismissed');
// }
