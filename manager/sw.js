const CACHE_NAME = 'warp-manager-v23';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// 1. INSTALL: Force this new SW to become the "waiting" worker immediately
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Don't wait for the user to close the tab
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ACTIVATE: The moment this SW becomes active, delete ALL other caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Tell the browser to let this SW take control of all open tabs immediately
      return self.clients.claim();
    })
  );
});

// 3. FETCH: The "Network First" Strategy for HTML
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // If the request is for the main HTML page (navigation), try Network first!
  // This ensures we always get the latest version if online.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // If offline, fall back to cache
          return caches.match('./index.html');
        })
    );
    return;
  }

  // For everything else (images, styles, js), try Cache first, then Network
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
    })
  );
});