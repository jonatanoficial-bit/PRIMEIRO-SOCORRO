import { el, card } from "../ui.js";
import { store } from "../store.js";

export default async function Study() {
  const pack = store.getActivePack();
  const root = el("div", {}, [
    el("h2", { style: "margin:8px 0 10px 0", text: "Estudo" }),
    el("p", { style: "color:rgba(245,245,247,.72);margin-top:0", text: "Biblioteca modular baseada em protocolos. (Base sólida para evoluir AAA)" }),
    el("div", { class: "hr" })
  ]);

  const list = pack?.protocols?.protocols || [];
  for (const pr of list) {
    root.appendChild(
      el("div", { style: "margin-bottom:12px" }, [
        card({
          title: pr.title,
          subtitle: `${pr.summary}\n\nPassos: ${pr.steps.length} • Escopo: ${pr.scope}`
        })
      ])
    );
  }

  return root;
}