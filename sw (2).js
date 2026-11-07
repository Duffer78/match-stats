// Keeps the app opening on the touchline even with no signal.
const CACHE = 'match-stats-v1';
const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
const PRECACHE = [
  './',
  './index.html',
  SDK + 'firebase-app-compat.js',
  SDK + 'firebase-auth-compat.js',
  SDK + 'firebase-firestore-compat.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Firebase SDK files: cache first (versioned, never change)
  if (url.href.startsWith(SDK)) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }))
    );
    return;
  }

  // The app itself: network first so updates show, cached copy when offline
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
    );
  }
  // Everything else (the Firestore database itself) is left alone.
});
