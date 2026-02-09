/* ================================
   CGA PWA SERVICE WORKER
   ================================ */

const CACHE_NAME = "cga-pwa-v1"; 
// 🔴 HER GÜNCELLEMEDE v1 → v2 → v3 DEĞİŞTİR

const CORE_FILES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo.png"
];

// 🔹 INSTALL
self.addEventListener("install", (event) => {
  console.log("[SW] Install başladı");
  self.skipWaiting(); // yeni SW anında aktif
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_FILES);
    })
  );
});

// 🔹 ACTIVATE
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Eski cache silindi:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim(); // açık sekmeleri devral
});

// 🔹 FETCH
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // canlı cevap geldiyse cache güncelle
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => {
        // offline ise cache’ten ver
        return caches.match(event.request);
      })
  );
});
