const CACHE = "aps-cache-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/router.js",
  "./js/ui.js",
  "./js/store.js",
  "./js/engine.js",
  "./js/packs.js",
  "./js/registry.js",
  "./js/signature.js",
  "./js/pages/home.js",
  "./js/pages/career.js",
  "./js/pages/study.js",
  "./js/pages/simulation.js",
  "./js/pages/packsPage.js",
  "./js/pages/notfound.js",
  "./content-packs/pack-xabcde-sbv-v1/manifest.json",
  "./content-packs/pack-xabcde-sbv-v1/protocols.json",
  "./content-packs/pack-xabcde-sbv-v1/scenarios.json",
  "./content-packs/pack-xabcde-sbv-v1/references.json",
  "./manifest.webmanifest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))))
    )
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});