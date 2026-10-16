const CACHE_NAME = "calendrier-hors-ligne-v6";
const CACHE_PREFIX = "calendrier-hors-ligne-";
const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sync-config.js",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  const isSupabaseLibrary = requestUrl.origin === "https://cdn.jsdelivr.net"
    && requestUrl.pathname.startsWith("/npm/@supabase/supabase-js@");
  if (isSupabaseLibrary) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok || response.type === "opaque") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  if (requestUrl.origin !== self.location.origin) return;

  const isSyncConfig = requestUrl.pathname.endsWith("/sync-config.js");
  if (isSyncConfig) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).catch(() => {
        if (event.request.mode === "navigate") {
          return caches.match(new URL("./index.html", self.location).toString());
        }
        return Response.error();
      });
    })
  );
});
