const CACHE = "aps-cache-v42";

const ASSETS = [
  "./",
  "./index.html?v=42",
  "./css/styles.css?v=42",
  "./js/app.js?v=42",
  "./js/router.js?v=42",
  "./js/ui.js?v=42",
  "./js/store.js?v=42",
  "./js/engine.js?v=42",
  "./js/packs.js?v=42",
  "./js/registry.js?v=42",
  "./js/signature.js?v=42",
  "./js/pages/home.js?v=42",
  "./js/pages/career.js?v=42",
  "./js/pages/study.js?v=42",
  "./js/pages/simulation.js?v=42",
  "./js/pages/packsPage.js?v=42",
  "./js/pages/notfound.js?v=42",
  "./content-packs/pack-xabcde-sbv-v1/manifest.json?v=42",
  "./content-packs/pack-xabcde-sbv-v1/protocols.json?v=42",
  "./content-packs/pack-xabcde-sbv-v1/scenarios.json?v=42",
  "./content-packs/pack-xabcde-sbv-v1/references.json?v=42",
  "./manifest.webmanifest?v=42"
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
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});