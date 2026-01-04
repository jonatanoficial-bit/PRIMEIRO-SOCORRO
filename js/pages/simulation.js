import { el, card } from "../ui.js";
import { store } from "../store.js";
import { createSimulation, applyAction } from "../engine.js";

export default async function Simulation() {
  const pack = store.getActivePack();
  const scenario = pack?.scenarios?.scenarios?.[0];

  const root = el("div", {}, [
    el("h2", { style: "margin:8px 0 10px 0", text: "Simulação" }),
    el("p", { style: "color:rgba(245,245,247,.72);margin-top:0", text: "Cenário determinístico com máquina de estados. Evolui para AAA com fisiologia e replay." }),
    el("div", { class: "hr" })
  ]);

  if (!scenario) {
    root.appendChild(card({ title: "Sem cenário disponível", subtitle: "Nenhum cenário encontrado no pacote ativo." }));
    return root;
  }

  const seed = Date.now(); // determinístico por sessão (fixo enquanto a página existir)
  let state = createSimulation(scenario, seed);

  const headerCard = card({
    title: scenario.title,
    subtitle: `${scenario.brief}\n\nEstado: ${state.view.phase}\nTempo: ${state.view.timeSec}s\nPaciente: ${state.view.patientLabel}`
  });

  const actionsWrap = el("div", { style: "display:grid;gap:10px" });
  const debriefCard = card({
    title: "Debrief (MVP)",
    subtitle: `Último evento: ${state.lastEvent}\n\nScore: ${state.score}\nErros críticos: ${state.criticalMistakes}\n\nObs.: no AAA o Debrief terá timeline completa + referências.`
  });

  const resetBtn = el("button", { class: "btnPrimary", text: "Reiniciar" });
  resetBtn.addEventListener("click", () => {
    state = createSimulation(scenario, seed);
    renderAll();
  });

  const resetRow = el("div", { style: "display:flex;justify-content:flex-end;margin-top:10px" }, [resetBtn]);

  function renderActions() {
    actionsWrap.innerHTML = "";
    for (const a of state.view.actions) {
      const btn = el("button", { class: `btnAction ${a.severity === "critical" ? "critical" : ""}` }, [
        el("div", { class: "aTitle", text: a.label }),
        el("div", { class: "aHint", text: a.hint })
      ]);
      btn.addEventListener("click", () => {
        state = applyAction(state, scenario, a.id);
        renderAll();
      });
      actionsWrap.appendChild(btn);
    }
  }

  function renderAll() {
    headerCard.querySelector(".cardSub").textContent =
      `${scenario.brief}\n\nEstado: ${state.view.phase}\nTempo: ${state.view.timeSec}s\nPaciente: ${state.view.patientLabel}`;

    debriefCard.querySelector(".cardSub").textContent =
      `Último evento: ${state.lastEvent}\n\nScore: ${state.score}\nErros críticos: ${state.criticalMistakes}\n\nObs.: no AAA o Debrief terá timeline completa + referências.`;

    renderActions();
  }

  root.appendChild(headerCard);
  root.appendChild(actionsWrap);
  root.appendChild(el("div", { style: "margin-top:12px" }, [debriefCard, resetRow]));

  renderAll();
  return root;
}