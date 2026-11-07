// Match Stats service worker – lets the app open and run with no signal.
// When you upload a new version of the app, bump this number so phones pick it up.
const CACHE = 'match-stats-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App files: serve from the phone straight away, refresh in the background.
  if (url.origin === self.location.origin) {
    const key = req.mode === 'navigate' ? './index.html' : req;
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(key, { ignoreSearch: true });
      const net = fetch(req, { cache: 'no-cache' }).then(r => { if (r && r.ok) c.put(key, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // Firebase code library: keep a copy so the team database works offline.
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r && r.ok) c.put(req, r.clone());
      return r;
    }));
  }
  // Everything else (the database connection itself) goes straight to the network.
});
