// Offline support: network first, cached copy when the Kindle can't be reached.
// Browsers only run this over HTTPS (e.g. `tailscale serve`) or localhost.
const CACHE = "ku-remote-v2";
const SHELL = ["/", "/app.js", "/app.css", "/manifest.webmanifest", "/icons/64.png", "/icons/180.png", "/icons/192.png"];
const CDN = "https://cdnjs.cloudflare.com";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  let key;
  if (req.mode === "navigate" && url.origin === location.origin && url.pathname === "/") key = "/";
  else if (url.origin === location.origin && SHELL.includes(url.pathname)) key = url.pathname;
  else if (url.origin === CDN) key = req; // pdf.js
  else return; // API calls and the hosted website always go to the network.

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(key, copy));
        }
        return res;
      })
      .catch(() => caches.match(key).then((hit) => hit || Promise.reject(new Error("offline"))))
  );
});
