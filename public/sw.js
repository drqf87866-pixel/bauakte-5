var CACHE = 'bauakte-v3';
var PRECACHE_URLS = [
  '/app.css',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-icon-180.png',
  '/icons/apple-icon-152.png',
  '/offline.html',
];
var SWR_URLS = ['/app.css', '/manifest.json'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  var path = url.pathname;

  if (SWR_URLS.indexOf(path) !== -1) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  var isStatic = PRECACHE_URLS.indexOf(path) !== -1;
  if (isStatic) {
    event.respondWith(caches.match(request));
    return;
  }

  if (path.startsWith('/r2/')) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithHtmlCache(request));
    return;
  }

  event.respondWith(networkFirstWithCache(request));
});

function networkFirstWithCache(request) {
  return caches.open(CACHE).then(function (cache) {
    return fetch(request)
      .then(function (response) {
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(function () {
        return caches.match(request);
      });
  });
}

function staleWhileRevalidate(request) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var network = fetch(request)
        .then(function (response) {
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(function () {
          return cached || Response.error();
        });
      return cached || network;
    });
  });
}

function networkFirstWithHtmlCache(request) {
  return caches.open(CACHE).then(function (cache) {
    return fetch(request)
      .then(function (response) {
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(function () {
        return caches.match(request).then(function (cached) {
          if (cached) return cached;
          return caches.match('/offline.html').then(function (offline) {
            return offline || new Response(
              '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Keine Verbindung</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fef2f2;color:#1e293b;text-align:center;padding:2rem}h1{font-size:1.5rem;color:#b91c1c}p{color:#64748b}</style></head><body><div><h1>Keine Verbindung</h1><p>Bitte überprüfe deine Internetverbindung.</p></div></body></html>',
              { headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
            );
          });
        });
      });
  });
}
