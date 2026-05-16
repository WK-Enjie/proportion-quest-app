/* ═══════════════════════════════════════════════════════
   ProPortion Quest — Service Worker
   Enables offline play & "Add to Home Screen"
═══════════════════════════════════════════════════════ */

const CACHE_NAME    = 'proportion-quest-v1';
const CACHE_ASSETS  = [
  './',
  './index.html',
  './css/main.css',
  './css/animations.css',
  './js/main.js',
  './js/gameState.js',
  './js/players.js',
  './js/questionEngine.js',
  './js/animations.js',
  './js/ui.js',
  './data/questions.js'
];

// ── INSTALL: cache all assets ──────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching assets...');
      return cache.addAll(CACHE_ASSETS);
    }).then(() => {
      console.log('[SW] All assets cached ✓');
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE: clean old caches ─────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ── FETCH: serve from cache, fallback to network ───
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache new successful requests
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Offline fallback
        return caches.match('./index.html');
      });
    })
  );
});