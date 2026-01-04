import { el, card, carouselRow } from "../ui.js";
import { store } from "../store.js";

export default async function Home() {
  const pack = store.getActivePack();
  const root = el("div", { class: "grid" });

  const hero = el("section", { class: "hero" }, [
    el("div", { class: "badge", text: "AAA Base • Offline-first • Pacotes versionados" }),
    el("h1", { class: "title", style: "margin-top:10px" , text: "Treino realista de Primeiros Socorros (Brasil/SP • 2026)" }),
    el("p", { class: "subtitle", text: "Estudo + simulação determinística. Conteúdo entra por pacotes leves (Micro-DLC), sem quebrar o app." }),
    el("div", { class: "kpi" }, [
      el("div", { class: "box" }, [ el("div", { class: "n", text: pack?.manifest?.version || "—" }), el("div", { class: "t", text: "Pacote ativo" }) ]),
      el("div", { class: "box" }, [ el("div", { class: "n", text: "Determinístico" }), el("div", { class: "t", text: "Replay de decisões" }) ]),
      el("div", { class: "box" }, [ el("div", { class: "n", text: "Netflix-like" }), el("div", { class: "t", text: "Carrosséis e cards" }) ])
    ])
  ]);

  const row1 = carouselRow("Começar agora", [
    card({ title: "Estudo — Protocolos", subtitle: "XABCDE, SBV e primeiros socorros (módulos).", onClick: () => (location.hash = "#/study") }),
    card({ title: "Simulação — Cenários", subtitle: "Treine decisões sob pressão com feedback técnico.", onClick: () => (location.hash = "#/simulation") }),
    card({ title: "Pacotes (DLC)", subtitle: "Ative conteúdos sem atualizar o app.", onClick: () => (location.hash = "#/packs") })
  ]);

  const row2 = carouselRow("Destaques do pacote", [
    card({ title: "XABCDE (Trauma)", subtitle: "Controle de hemorragia antes de via aérea." }),
    card({ title: "Engasgo", subtitle: "Conduta por faixa etária." })
  ]);

  root.appendChild(hero);
  root.appendChild(el("div", {}, [row1, row2]));
  return root;
}