// Bolita · service worker (funciona sin internet). Sube la versión al actualizar la app.
const V = 'bolita-v1';
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const CORE = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.all(CORE.map(u => c.add(u).catch(() => {})));
    // 1) copia local opcional: vendor/three.min.js  2) si no existe, la descarga del CDN
    try { const r = await fetch('./three.min.js'); if (r.ok && (r.headers.get('content-type') || '').includes('javascript')) await c.put(CDN, r); } catch (_) {}
    try { if (!(await c.match(CDN))) { const r = await fetch(CDN, { mode: 'cors' }); if (r.ok) await c.put(CDN, r); } } catch (_) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (r.url === CDN) {
    e.respondWith(caches.match(CDN).then(m => m || fetch(r).then(x => { const cl = x.clone(); caches.open(V).then(c => c.put(CDN, cl)); return x; })));
    return;
  }
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(x => { const cl = x.clone(); caches.open(V).then(c => c.put('./index.html', cl)); return x; }).catch(() => caches.match('./index.html')));
    return;
  }
  if (u.origin === location.origin || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(r).then(m => {
      const n = fetch(r).then(x => { if (x.ok) { const cl = x.clone(); caches.open(V).then(c => c.put(r, cl)); } return x; }).catch(() => m);
      return m || n;
    }));
  }
});
