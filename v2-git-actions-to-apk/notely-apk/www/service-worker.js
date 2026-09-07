self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('notely-v1').then((cache) => {
      return cache.addAll([
        '/testings/',
        '/testings/index.html',
        '/testings/manifest.json',
        '/testings/icon-192.png',
        '/testings/icon-512.png'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});