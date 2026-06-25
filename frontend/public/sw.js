const CACHE_NAME = "attendance-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/src/main.jsx",
  "/src/App.jsx",
  "/src/index.css",
  "/src/pages/Login.jsx",
  "/src/pages/Dashboard.jsx",
  "/src/pages/Scanner.jsx",
  "/src/pages/Reports.jsx",
  "/src/services/api.js",
  "/src/services/offline.js",
  "/manifest.json",
  "/vite.svg"
];

// Install service worker and cache assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate service worker and clear old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Cache first, fall back to network strategy for cached assets
self.addEventListener("fetch", (e) => {
  // Only intercept HTTP/HTTPS (not chrome-extension or other protocols)
  if (!e.request.url.startsWith(self.location.origin)) return;

  // Don't intercept API calls (they are handled via Axios and localForage offline queue)
  if (e.request.url.includes("/api/")) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        // Cache new static resources dynamic caching if needed
        return networkResponse;
      });
    })
  );
});
