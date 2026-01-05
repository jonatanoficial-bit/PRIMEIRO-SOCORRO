import { el, card } from "../ui.js";
import { store } from "../store.js";

export default async function Home() {
  const active = store.getActivePack();
  const version = active?.manifest?.version || "—";

  const hero = el("section", { class: "hero" }, [
    el("div", { class: "heroInner" }, [
      el("div", { class: "heroTag", text: "AAA Base • Offline-first • Pacotes versionados" }),
      el("h1", { class: "heroTitle", text: "Treino realista de Primeiros Socorros (Brasil/SP • 2026)" }),
      el("p", {
        class: "heroSub",
        text: "Estudo + simulação determinística. Conteúdo entra por pacotes leves (Micro-DLC), sem quebrar o app."
      }),

      el("div", { class: "heroGrid" }, [
        el("div", { class: "heroMini" }, [
          el("div", { class: "heroMiniTitle", text: version }),
          el("div", { class: "heroMiniSub", text: "Pacote ativo" })
        ]),
        el("div", { class: "heroMini" }, [
          el("div", { class: "heroMiniTitle", text: "Determinístico" }),
          el("div", { class: "heroMiniSub", text: "Replay de decisões" })
        ]),
        el("div", { class: "heroMini" }, [
          el("div", { class: "heroMiniTitle", text: "Netflix-like" }),
          el("div", { class: "heroMiniSub", text: "Carrosséis e cards" })
        ])
      ])
    ])
  ]);

  const startTitle = el("div", { class: "sectionTitle", text: "Começar agora" });

  const startGrid = el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:12px" }, [
    card({
      title: "Estudo — Protocolos",
      subtitle: "XABCDE, SBV e primeiros socorros (módulos).",
      onClick: () => (location.hash = "#/study")
    }),
    card({
      title: "Simulação — Cenários",
      subtitle: "Treine decisões sob pressão com feedback técnico.",
      onClick: () => (location.hash = "#/simulation")
    }),
    card({
      title: "Carreira",
      subtitle: "Perfil + nível + XP + Pack Builder (criar conteúdo no celular).",
      onClick: () => (location.hash = "#/career")
    }),
    card({
      title: "Pacotes (DLC)",
      subtitle: "Ative conteúdos sem atualizar o app.",
      onClick: () => (location.hash = "#/packs")
    })
  ]);

  // No mobile, 2 colunas pode ficar apertado dependendo do aparelho:
  // CSS já cuida por largura (mas aqui garantimos com min-width)
  startGrid.style.gridTemplateColumns = "1fr";
  startGrid.style.gap = "12px";
  // Em telas maiores vira 2 colunas:
  startGrid.className = "homeGrid";

  const highlightsTitle = el("div", { class: "sectionTitle", text: "Destaques do pacote" });

  const highlightsGrid = el("div", { class: "homeGrid", style: "display:grid;gap:12px" }, [
    card({ title: "XABCDE (Trauma)", subtitle: "Controle de hemorragia antes de via aérea." }),
    card({ title: "Engasgo", subtitle: "Conduta por faixa etária." })
  ]);

  const root = el("div", {}, [
    hero,
    startTitle,
    startGrid,
    highlightsTitle,
    highlightsGrid
  ]);

  return root;
}