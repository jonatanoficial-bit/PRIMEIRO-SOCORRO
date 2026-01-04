import { el, card } from "../ui.js";

export default async function NotFound() {
  return el("div", {}, [
    el("h2", { text: "Não encontrado" }),
    card({ title: "Rota inválida", subtitle: "Use o menu para navegar." })
  ]);
}