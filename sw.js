// Service worker de Tumble Dog (issue #105).
// Clásico (sin módulos) y con rutas RELATIVAS: el juego se despliega en una
// subcarpeta de GitHub Pages (/tumble-dog/), así que todo se resuelve contra la
// carpeta donde está este fichero, que es también el ámbito que se registra.
//
// Estrategia:
//  · «core» (index.html, manifest, iconos): se revalida al instalar.
//  · resto del mismo origen (src/*.js, assets/**): cache-first con revalidación
//    en segundo plano, para arrancar rápido y poder jugar sin conexión.
//  · navegación: red primero y cache como respaldo (así un despliegue nuevo se
//    ve en cuanto hay internet y el juego viejo sigue arrancando sin él).
const VERSION = 'tumbledog-v1'; // cambiar al publicar: las cachés viejas se borran
const CORE = ['./', './index.html', './manifest.webmanifest', './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/apple-touch-icon.png'];

const coreCache = () => caches.open(`${VERSION}-core`);
const assetCache = () => caches.open(`${VERSION}-assets`);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await coreCache();
    for (const rel of CORE) {
      try { await cache.add(new Request(rel, { cache: 'reload' })); } catch { /* si falta algo, se sirve por red */ }
    }
  })().catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.indexOf(VERSION) !== 0).map((k) => caches.delete(k)));
  })().catch(() => {}));
  self.clients.claim();
});

function isNavigation(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.destination === 'document');
}

async function store(cacheName, request, response) {
  if (!response || !response.ok || (response.type && response.type !== 'basic')) return;
  try { const cache = await caches.open(cacheName); await cache.put(request, response); } catch { /* caché llena o respuesta no guardable */ }
}

async function respond(request) {
  const cache = await caches.open(isNavigation(request) ? `${VERSION}-core` : `${VERSION}-assets`);
  const hit = await cache.match(request, { ignoreSearch: !isNavigation(request) });
  if (isNavigation(request)) {
    try {
      const fresh = await fetch(request, { cache: 'no-store' });
      await store(`${VERSION}-core`, request, fresh.clone());
      return fresh;
    } catch {
      if (hit) return hit;
      const fallback = await cache.match('./index.html');
      if (fallback) return fallback;
      throw new Error('sin conexión y sin caché');
    }
  }
  if (!hit) {
    const fresh = await fetch(request);
    await store(`${VERSION}-assets`, request, fresh.clone());
    return fresh;
  }
  // Se responde de la caché y, de fondo, se actualiza para la próxima visita.
  fetch(request).then((fresh) => store(`${VERSION}-assets`, request, fresh.clone())).catch(() => {});
  return hit;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!request || request.method !== 'GET') return;
  let url;
  try { url = new URL(request.url); } catch { return; }
  if (url.origin !== self.location.origin) return; // fuentes de Google: que las cachee el navegador
  event.respondWith(respond(request).catch(() => fetch(request)));
});
