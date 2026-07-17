// v2 — network-first for the app shell. Bump CACHE below whenever you want to force
// every installed client to pick up a fresh copy immediately.
const CACHE = 'fanpulse-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE).then(function(cache){ return cache.addAll(ASSETS); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Network-first for navigation/HTML so a redeploy is visible on next load —
// only serve the cached copy if the network request actually fails (offline).
// Everything else (icons, manifest) stays cache-first since those rarely change.
self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;

  var isNavigation = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').indexOf('text/html') !== -1;

  if(isNavigation){
    event.respondWith(
      fetch(event.request).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE).then(function(cache){ cache.put(event.request, copy); });
        return resp;
      }).catch(function(){
        return caches.match(event.request).then(function(cached){
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached){
      return cached || fetch(event.request).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE).then(function(cache){ cache.put(event.request, copy); });
        return resp;
      }).catch(function(){ return cached; });
    })
  );
});
