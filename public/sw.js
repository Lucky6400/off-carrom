/* Off Carrom service worker.
   - pages (and anything not hashed): network first, so a new deploy shows up on the next load when online; the cache is the offline fallback
   - hashed build files in /assets/: cache first (they never change)
   Bump CACHE to drop everything cached by older versions. */
const CACHE = 'off-carrom-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './favicon-48.png', './brand/arcadoff-logo.png', './brand/arcadoff-logo-white.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
const store = (req, res) => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; };
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const page = req.mode === 'navigate' || req.destination === 'document';
  if (url.pathname.includes('/assets/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => store(req, res))));
  } else {
    e.respondWith(fetch(req).then((res) => store(req, res)).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (page ? caches.match('./index.html') : Response.error()))));
  }
});
