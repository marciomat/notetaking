/// <reference lib="webworker" />

const CACHE_NAME = "notetaking-v1";

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
];

// Install event - precache essential assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Precaching app shell");
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Skip cross-origin requests (except for fonts/assets we might need)
  if (url.origin !== self.location.origin) {
    // For cross-origin, try network first, no caching
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Cache-first strategy for static assets
      if (cachedResponse) {
        // Return cached version and update cache in background
        event.waitUntil(
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseToCache);
                });
              }
            })
            .catch(() => {
              // Network failed, but we have cache - that's fine
            })
        );
        return cachedResponse;
      }

      // No cache - try network
      return fetch(request)
        .then((networkResponse) => {
          // Don't cache non-successful responses
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          // Clone the response before caching
          const responseToCache = networkResponse.clone();

          // Cache successful responses
          caches.open(CACHE_NAME).then((cache) => {
            // Cache HTML, JS, CSS, and other static assets
            const contentType = networkResponse.headers.get("content-type") || "";
            if (
              request.url.endsWith(".html") ||
              request.url.endsWith(".js") ||
              request.url.endsWith(".css") ||
              request.url.endsWith(".wasm") ||
              request.url.endsWith(".json") ||
              request.url.endsWith(".png") ||
              request.url.endsWith(".svg") ||
              request.url.endsWith(".ico") ||
              request.url.endsWith(".woff") ||
              request.url.endsWith(".woff2") ||
              contentType.includes("text/html") ||
              contentType.includes("application/javascript") ||
              contentType.includes("text/css") ||
              contentType.includes("application/wasm") ||
              contentType.includes("application/json") ||
              contentType.includes("image/") ||
              contentType.includes("font/") ||
              request.url === self.location.origin + "/" ||
              request.url.includes("/_next/")
            ) {
              cache.put(request, responseToCache);
            }
          });

          return networkResponse;
        })
        .catch((error) => {
          console.log("[SW] Fetch failed, returning offline page:", error);

          // For navigation requests, return cached index
          if (request.mode === "navigate") {
            return caches.match("/");
          }

          // For other requests, just fail
          throw error;
        });
    })
  );
});

// Handle messages from the app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

console.log("[SW] Service Worker loaded");
