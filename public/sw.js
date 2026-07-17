// Minimal service worker: enables PWA install; all requests hit the network
// (no caching — the app must always reflect live event config).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
