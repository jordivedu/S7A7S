const CACHE_NAME = 's7a7s-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // El fetch és obligatori per a la instal·lació PWA
  event.respondWith(fetch(event.request));
});
