/* Puntr service worker. Cache static assets only; never cache private or live data. */
const CACHE_PREFIX = "puntr-pwa";
const CACHE_VERSION = "v1";
const STATIC_CACHE = CACHE_PREFIX + "-static-" + CACHE_VERSION;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/puntr-icon-192.png", "/puntr-icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/") || url.pathname.startsWith("/functions/") || url.pathname.startsWith("/rest/") || url.pathname.startsWith("/storage/") || url.pathname.startsWith("/realtime/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || new Response("<!doctype html><html lang='en'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Puntr offline</title><body style='margin:0;background:#000;color:#fff;font:16px sans-serif;display:grid;min-height:100vh;place-items:center;text-align:center'><main><h1>You're offline.</h1><p>Reconnect to refresh live sports information.</p><a style='color:#4ade80' href='/'>Try again</a></main></body></html>", {headers:{"Content-Type":"text/html; charset=utf-8"}})));
    return;
  }
  const isStaticAsset = url.pathname.startsWith("/assets/") || /\.(?:png|jpg|jpeg|webp|svg|woff2?|ttf|ico)$/.test(url.pathname) || url.pathname === "/manifest.webmanifest";
  if (!isStaticAsset) return;
  event.respondWith(caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      if (response.ok && (response.type === "basic" || response.type === "cors")) {
        const copy = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    });
  }));
});
