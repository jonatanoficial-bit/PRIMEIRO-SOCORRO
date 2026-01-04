import Home from "./pages/home.js";
import Career from "./pages/career.js";
import Study from "./pages/study.js";
import Simulation from "./pages/simulation.js";
import PacksPage from "./pages/packsPage.js";
import NotFound from "./pages/notfound.js";

const routes = {
  "/": Home,
  "/career": Career,
  "/study": Study,
  "/simulation": Simulation,
  "/packs": PacksPage
};

let onRouteHook = null;

export function navigateTo(hash) {
  window.location.hash = hash;
}

function currentPath() {
  const h = window.location.hash || "#/";
  const path = h.replace(/^#/, "");
  return path.startsWith("/") ? path : `/${path}`;
}

async function render() {
  const app = document.getElementById("app");
  const path = currentPath();
  const Page = routes[path] || NotFound;
  app.innerHTML = "";
  app.appendChild(await Page());
  if (onRouteHook) await onRouteHook();
}

export function initRouter(opts = {}) {
  onRouteHook = opts.onRoute || null;
  window.addEventListener("hashchange", render);
  render();
}