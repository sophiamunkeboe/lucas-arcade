/* Lucas's Arcade - service worker: keeps every file on the phone so the arcade works offline.
   When you change or add files: add them to FILES and bump VERSION. */
const VERSION = 'lucas-arcade-v13';
// Note: Poker Table also needs internet to talk to its game server; its page and art are cached here so it can
// open offline and show a friendly "Poker needs internet" message.
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/arcade.css',
  './js/storage.js',
  './js/sfx.js',
  './js/music.js',
  './js/prizes.js',
  './js/avatars.js',
  './js/games.js',
  './js/arcade.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/avatars/bella.png',
  './icons/avatars/marley.png',
  './games/pop-the-dog/index.html',
  './games/pop-the-dog/style.css',
  './games/pop-the-dog/dogs.js',
  './games/pop-the-dog/gorda.js',
  './games/pop-the-dog/game.js',
  './games/pop-the-dog/thumb.png',
  './games/fetch-frenzy/index.html',
  './games/fetch-frenzy/style.css',
  './games/fetch-frenzy/runners.js',
  './games/fetch-frenzy/scenes.js',
  './games/fetch-frenzy/game.js',
  './games/fetch-frenzy/thumb.png',
  './games/smash-room/index.html',
  './games/smash-room/style.css',
  './games/smash-room/smash.css',
  './games/smash-room/draw.js',
  './games/smash-room/game.js',
  './games/smash-room/thumb.png',
  './games/cards/cards.js',
  './games/cards/cards.css',
  './games/cards/casino.js',
  './games/cards/casino.css',
  './games/blackjack/index.html',
  './games/blackjack/style.css',
  './games/blackjack/game.js',
  './games/blackjack/thumb.png',
  './games/poker/index.html',
  './games/poker/style.css',
  './games/poker/game.js',
  './games/poker/engine.js',
  './games/poker/bots.js',
  './games/poker/local.js',
  './games/poker/thumb.png',
  './games/miko/fonts/LuckiestGuy.woff2',
  './games/miko/index.html',
  './games/miko/js/audio.js',
  './games/miko/js/controller.js',
  './games/miko/js/fur.js',
  './games/miko/js/fx.js',
  './games/miko/js/house.js',
  './games/miko/js/input.js',
  './games/miko/js/main.js',
  './games/miko/js/miko.js',
  './games/miko/js/physics.js',
  './games/miko/js/textures.js',
  './games/miko/js/zoomies.js',
  './games/miko/miko.css',
  './games/miko/vendor/cannon/cannon-es.js',
  './games/miko/vendor/three/addons/environments/RoomEnvironment.js',
  './games/miko/vendor/three/addons/geometries/RoundedBoxGeometry.js',
  './games/miko/vendor/three/addons/postprocessing/BokehPass.js',
  './games/miko/vendor/three/addons/postprocessing/EffectComposer.js',
  './games/miko/vendor/three/addons/postprocessing/MaskPass.js',
  './games/miko/vendor/three/addons/postprocessing/OutputPass.js',
  './games/miko/vendor/three/addons/postprocessing/Pass.js',
  './games/miko/vendor/three/addons/postprocessing/RenderPass.js',
  './games/miko/vendor/three/addons/postprocessing/ShaderPass.js',
  './games/miko/vendor/three/addons/postprocessing/UnrealBloomPass.js',
  './games/miko/vendor/three/addons/shaders/BokehShader.js',
  './games/miko/vendor/three/addons/shaders/CopyShader.js',
  './games/miko/vendor/three/addons/shaders/LuminosityHighPassShader.js',
  './games/miko/vendor/three/addons/shaders/OutputShader.js',
  './games/miko/vendor/three/addons/utils/BufferGeometryUtils.js',
  './games/miko/vendor/three/build/three.core.js',
  './games/miko/vendor/three/build/three.module.js',
  './games/miko/thumb.png',
  './games/lucas-hoops/index.html',
  './games/lucas-hoops/style.css',
  './games/lucas-hoops/game.js',
  './games/lucas-hoops/pixel.woff2',
  './games/lucas-hoops/thumb.png',
  './js/vendor/supabase.js',
  './art/neon/aer-on.webp',
  './art/neon/aer-off.webp',
  './art/neon/munkeboe-on.webp',
  './art/neon/munkeboe-off.webp',
  './art/neon/sel-on.webp',
  './art/neon/sel-off.webp',
  './art/neon/taylor-on.webp',
  './art/neon/taylor-off.webp',
  './art/neon/thankq-on.webp',
  './art/neon/thankq-off.webp',
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
