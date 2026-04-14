// Service Worker for KCCC 2026 Flag Football Playbook
// Network-first with cache fallback — fresh on every load when online,
// offline-capable as a fallback. Bump CACHE_NAME to force old caches to clear.
const CACHE_NAME = 'playbook-v2';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Network-first: try fresh from network; fall back to cache if offline.
  // Update the cache with fresh responses so the offline fallback stays current.
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if(resp && resp.ok && e.request.method === 'GET'){
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, copy)).catch(()=>{});
        }
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
