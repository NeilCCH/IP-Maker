// Service worker：預先快取全部檔案，離線可用；新版本等使用者按「更新」才切換，避免編輯到一半被重新整理。
const VERSION = 'brand-studio-2.1.0';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/main.js',
  './js/store.js',
  './js/util.js',
  './js/model.js',
  './js/brand.js',
  './js/copy.js',
  './js/draw.js',
  './js/line.js',
  './js/platforms.js',
  './js/prompt.js',
  './js/website.js',
  './js/export.js',
  './js/zip.js',
  './js/data/questions.js',
  './js/data/palettes.js',
  './js/data/designs.js',
  './js/views/common.js',
  './js/views/home.js',
  './js/views/profile.js',
  './js/views/design.js',
  './js/views/results.js',
  './js/views/advanced.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

// 快取優先（版本化快取保證一致性），找不到再走網路
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (hit) => hit || fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())),
    ),
  );
});
