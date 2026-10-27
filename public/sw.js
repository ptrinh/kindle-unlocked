// Offline support for the main site: network first, cached copy when offline.
const CACHE = "ku-v1";
const SHELL = ["/", "/app.css", "/app.js", "/icon.svg", "/data/models.json", "/data/jailbreaks.json"];
const LIVE = ["/api/jailbreaks"];
const FONTS = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

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
  else if (url.origin === location.origin && (SHELL.includes(url.pathname) || LIVE.includes(url.pathname))) key = url.pathname;
  else if (FONTS.includes(url.origin)) key = req;
  else return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok || res.type === "opaque") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(key, copy));
        }
        return res;
      })
      .catch(() => caches.match(key).then((hit) => hit || Promise.reject(new Error("offline"))))
  );
});
