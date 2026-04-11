// VocabMaster Service Worker v2 — minimal, no precaching
const CACHE_NAME = 'vocabmaster-v2';

// Install — skip precaching to avoid broken cache
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate — clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Fetch — only cache static assets (js/css/images), never API or HTML
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip: non-GET, API calls, HTML navigation, chrome extensions
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.protocol === 'chrome-extension:' ||
    event.request.mode === 'navigate'
  ) {
    return;
  }

  // Only cache static assets (.js, .css, images, fonts)
  const isStaticAsset = /\.(js|css|png|jpg|svg|woff2?|ttf|ico)$/i.test(url.pathname);
  if (!isStaticAsset) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      })
    )
  );
});
