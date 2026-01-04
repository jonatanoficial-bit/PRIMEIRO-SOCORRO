import { initRouter, navigateTo } from "./router.js";
import { setActiveNav } from "./ui.js";
import { loadLocalPacks } from "./packs.js";
import { store } from "./store.js";

async function main() {
  // Carrega packs locais (MVP). Depois vira CDN + cache.
  const packs = await loadLocalPacks();
  store.setPacks(packs);

  // Router
  initRouter({
    onRoute: async () => {
      setActiveNav();
    }
  });

  // Clique no brand volta pra home
  document.addEventListener("click", (e) => {
    const el = e.target?.closest?.("[data-link]");
    if (!el) return;
    const href = el.getAttribute("data-link");
    if (href) navigateTo(href);
  });

  // Service worker (offline básico)
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch {
      // silêncio: offline é bônus
    }
  }

  setActiveNav();
}

main();