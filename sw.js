/**
 * Service worker de Tumble Dog (T12): cache-first para jugar offline en local.
 * El repo es privado y no hay despliegue web; esto solo sirve en localhost/127.0.0.1.
 */
const CACHE = 'tumble-dog-v1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/main.js',
  './src/loop.js',
  './src/input.js',
  './src/physics.js',
  './src/config.js',
  './src/player.js',
  './src/background.js',
  './src/enemy.js',
  './src/enemies.js',
  './src/ball.js',
  './src/assets.js',
  './src/audio.js',
  './assets/personajes/don-presi-hoja-poses.png',
  './assets/enemigos/portavoz-airada-poses.png',
  './assets/enemigos/portavoz-airada-derrotada.png',
  './assets/enemigos/tertuliano-poses.png',
  './assets/enemigos/tertuliano-derrotada.png',
  './assets/enemigos/tertuliano-bulos.png',
  './assets/enemigos/asesor-misterioso-poses.png',
  './assets/enemigos/asesor-misterioso-derrotada.png',
  './assets/enemigos/influencer-bulero-poses.png',
  './assets/enemigos/influencer-bulero-derrotada.png',
  './assets/enemigos/influencer-ringlight.png',
  './assets/escenario/moncloa-fondo.png',
  './assets/ui/retrato-don-presi.png',
  './assets/ui/retrato-portavoz-airada.png',
  './assets/ui/retrato-tertuliano.png',
  './assets/ui/retrato-asesor-misterioso.png',
  './assets/ui/retrato-influencer-bulero.png',
  './assets/ui/efecto-estrellas-aturdido.png',
  './assets/ui/efecto-polvo-aplastado.png',
  './assets/ui/flecha-tutorial.png',
  './assets/ui/onomatopeya-crac.png',
  './assets/ui/icon-192.png',
  './assets/ui/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
