const CACHE_NAME = "calendrier-hors-ligne-v1";

const FILES = [
"./",
"./index.html",
"./manifest.json"
];

self.addEventListener("install", event => {
event.waitUntil(
caches.open(CACHE_NAME).then(cache =>
cache.addAll(FILES)
)
);
self.skipWaiting();
});

self.addEventListener("activate", event => {
event.waitUntil(
caches.keys().then(keys =>
Promise.all(
keys
.filter(key => key !== CACHE_NAME)
.map(key => caches.delete(key))
)
)
);
self.clients.claim();
});

self.addEventListener("fetch", event => {
if (event.request.method !== "GET") return;

event.respondWith(
caches.match(event.request).then(cached => {
if (cached) return cached;

```
  return fetch(event.request).catch(() =>
    caches.match("./index.html")
  );
})
```

);
});
