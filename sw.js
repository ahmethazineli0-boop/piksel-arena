/* PİKSEL ARENA — çevrimdışı önbellek: ana ekrana eklenen oyun internetsiz açılır. */
const CACHE = 'piksel-arena-v3.2';
const FILES = [
  "./",
  "icon-192.png",
  "icon-512.png",
  "index.html",
  "js/audio.js",
  "js/characters.js",
  "js/local.js",
  "js/localworker.js",
  "js/main.js",
  "js/r3d/character.js",
  "js/r3d/fx.js",
  "js/r3d/pose.js",
  "js/r3d/stages.js",
  "js/render3d.js",
  "js/roomcore.js",
  "js/sim.js",
  "js/touch.js",
  "manifest.webmanifest",
  "style.css",
  "vendor/addons/environments/RoomEnvironment.js",
  "vendor/addons/geometries/RoundedBoxGeometry.js",
  "vendor/addons/postprocessing/EffectComposer.js",
  "vendor/addons/postprocessing/MaskPass.js",
  "vendor/addons/postprocessing/OutputPass.js",
  "vendor/addons/postprocessing/Pass.js",
  "vendor/addons/postprocessing/RenderPass.js",
  "vendor/addons/postprocessing/ShaderPass.js",
  "vendor/addons/postprocessing/UnrealBloomPass.js",
  "vendor/addons/shaders/CopyShader.js",
  "vendor/addons/shaders/LuminosityHighPassShader.js",
  "vendor/addons/shaders/OutputShader.js",
  "vendor/three.module.js"
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.endsWith('/__pa')) return;
  // önce önbellek, arka planda güncelle
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok && url.origin === location.origin) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
