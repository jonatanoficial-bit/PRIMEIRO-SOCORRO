import { el, card, carouselRow } from "../ui.js";
import { groupProtocolsByTag } from "../registry.js";

export default async function Study() {
  const rows = groupProtocolsByTag();

  const root = el("div", {}, [
    el("h2", { style: "margin:8px 0 10px 0", text: "Estudo" }),
    el("p", {
      style: "color:rgba(245,245,247,.72);margin-top:0",
      text: "Biblioteca estilo Netflix: protocolos organizados por categorias (tags)."
    }),
    el("div", { class: "hr" })
  ]);

  if (!rows.length) {
    root.appendChild(card({ title: "Sem conteúdo", subtitle: "O pacote ativo não possui protocolos." }));
    return root;
  }

  for (const row of rows) {
    const items = row.items.map((pr) =>
      card({
        title: pr.title,
        subtitle: `${pr.summary}\n\nPassos: ${pr.steps?.length || 0} • Escopo: ${pr.scope}`
      })
    );
    root.appendChild(carouselRow(row.tag, items));
  }

  return root;
}