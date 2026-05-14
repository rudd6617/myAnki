// Service Worker: cache-static-only shell.
// Bump CACHE_VERSION whenever the cache strategy itself changes; Vite's hashed
// asset URLs already invalidate per-asset.

const CACHE_VERSION = "myanki-v1";

self.addEventListener("install", (event) => {
  // Activate this SW immediately on first install.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Never cache API or media — server is the source of truth.
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/media/")) return;
  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;

  event.respondWith(staleWhileRevalidate(req));
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    })
    .catch(() => cached);
  return cached || networkPromise;
}
