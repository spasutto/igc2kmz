//self.importScripts('data/games.js');

// Files to cache
const currentVersion = 'v1.0.5.4';
const cacheName = 'igc2kmz-' + currentVersion;
const appShellFiles = [
  '/igc2kmz/',
  '/igc2kmz/igc2kmz.html',
  '/igc2kmz/dist/igc2kmz.min.js',
  '/igc2kmz/assets/googleearth-32.png',
  '/igc2kmz/assets/googleearth-64.png',
  '/igc2kmz/assets/googleearth-128.png',
  '/igc2kmz/assets/googleearth-256.png',
  '/igc2kmz/assets/googleearth-512.png',
];
// const gamesImages = [];
// for (let i = 0; i < games.length; i++) {
//   gamesImages.push(`data/img/${games[i].slug}.jpg`);
// }
const contentToCache = appShellFiles;//.concat(gamesImages);

// Installing Service Worker
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
  e.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    console.log('[Service Worker] Caching all: app shell and content');
    await cache.addAll(contentToCache);
  })());
});

// Fetching content using Service Worker
self.addEventListener('fetch', (e) => {
    // Cache http and https only, skip unsupported chrome-extension:// and file://...
    if (!(
       e.request.url.startsWith('http:') || e.request.url.startsWith('https:')
    )) {
        return;
    }

  e.respondWith((async () => {
    const r = await caches.match(e.request);
    console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
    if (r) return r;
    const response = await fetch(e.request);
    const cache = await caches.open(cacheName);
    console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
    cache.put(e.request, response.clone());
    return response;
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key === cacheName) {
            return;
          }
          return caches.delete(key);
        })
      );
    })
  );
});
