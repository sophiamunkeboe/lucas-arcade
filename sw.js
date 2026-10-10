/* Lucas's Arcade - service worker: keeps every file on the phone so the arcade works offline.
   When you change or add files: add them to FILES and bump VERSION. */
const VERSION = 'lucas-arcade-v1';
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/arcade.css',
  './js/storage.js',
  './js/sfx.js',
  './js/prizes.js',
  './js/games.js',
  './js/arcade.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './games/pop-the-dog/index.html',
  './games/pop-the-dog/style.css',
  './games/pop-the-dog/dogs.js',
  './games/pop-the-dog/game.js',
  './games/pop-the-dog/thumb.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Cache first (fast + offline), then update the cache in the background.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      const net = fetch(e.request).then(res => {
        if (res && res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
