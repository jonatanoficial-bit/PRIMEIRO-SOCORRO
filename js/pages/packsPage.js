import { el, card } from "../ui.js";
import { store } from "../store.js";

export default async function PacksPage() {
  const packs = store.getPacks();
  const active = store.getActivePack();

  const root = el("div", {}, [
    el("h2", { style: "margin:8px 0 10px 0", text: "Pacotes de Conteúdo (Micro-DLC)" }),
    el("p", {
      style: "color:rgba(245,245,247,.72);margin-top:0",
      text: "Pacote ativo é salvo no dispositivo. Em AAA: CDN + assinatura + rollback + cache."
    }),
    el("div", { class: "hr" })
  ]);

  packs.forEach((p) => {
    const isActive = active && p.manifest.id === active.manifest.id;
    root.appendChild(
      el("div", { style: "margin-bottom:12px" }, [
        card({
          title: `${p.manifest.name} • v${p.manifest.version}`,
          subtitle: `Compatível: engine >= ${p.manifest.minEngineVersion}\nPublisher: ${p.manifest.publisher}`,
          rightEl: el("span", {
            class: "badge",
            style: "border-color:rgba(229,9,20,.35);color:rgba(245,245,247,.9)",
            text: isActive ? "ATIVO" : "ATIVAR"
          }),
          onClick: () => {
            store.setActivePack(p.manifest.id);
            location.hash = "#/packs";
          }
        })
      ])
    );
  });

  return root;
}