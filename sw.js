/* ============================================================
   Re-Late · Service Worker
   Plataforma de Marketing Solidario · Aragón
   Autoría: Miguel Ángel Layunta López
   ============================================================ */

const VERSION = 'relate-v1.0.0';
const CACHE   = 'relate-' + VERSION;

/* Archivos propios de la aplicación */
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/logo.svg',
  './icons/grafico-corazon.svg'
];

/* Librerías externas (CDN) */
const CDN = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js'
];

/* ---------- INSTALACIÓN ---------- */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(APP_SHELL.map(url =>
      cache.add(url).catch(() => { /* se ignora si falta algún archivo */ })
    ));
    await Promise.all(CDN.map(url =>
      cache.add(new Request(url, { mode: 'cors' })).catch(() => {})
    ));
    self.skipWaiting();
  })());
});

/* ---------- ACTIVACIÓN ---------- */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(
      claves.filter(k => k !== CACHE).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

/* ---------- ESTRATEGIAS DE RED ---------- */
self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  /* Navegación: red primero, caché como respaldo (permite trabajar sin conexión) */
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const respuesta = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', respuesta.clone());
        return respuesta;
      } catch (e) {
        const cache = await caches.open(CACHE);
        return (await cache.match('./index.html'))
            || (await cache.match('./'))
            || new Response('<h1>Sin conexión</h1><p>Vuelve a intentarlo cuando recuperes la red.</p>', {
                 status: 503,
                 headers: { 'Content-Type': 'text/html; charset=utf-8' }
               });
      }
    })());
    return;
  }

  /* Resto de recursos: caché primero con actualización en segundo plano */
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const enCache = await cache.match(req);

    const desdeRed = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        cache.put(req, res.clone());
      }
      return res;
    }).catch(() => null);

    return enCache || (await desdeRed) || new Response('', { status: 504 });
  })());
});

/* ---------- MENSAJES ---------- */
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
  if (event.data === 'limpiarCache') {
    caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
  }
});
