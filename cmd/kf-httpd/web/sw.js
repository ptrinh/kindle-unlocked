// Keeps the app shell available offline (only used over HTTPS, e.g. `tailscale serve`).
const SHELL = "kf-remote-v1";
const FILES = ["/", "/app.js", "/app.css", "/manifest.webmanifest", "/icons/192.png"];

self.addEventListener("install", (e) => e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES))));
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
