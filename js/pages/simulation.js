import { el, card } from "../ui.js";
import { store } from "../store.js";
import { listScenarios, getScenarioById } from "../registry.js";
import { createSimulation, applyAction, buildDebrief } from "../engine.js";

export default async function Simulation() {
  const scenarios = listScenarios();

  const root = el("div", {}, [
    el("h2", { style: "margin:8px 0 10px 0", text: "Simulação" }),
    el("p", {
      style: "color:rgba(245,245,247,.72);margin-top:0",
      text: "Simulação determinística com máquina de estados + Debrief AAA v1 (timeline e falhas)."
    }),
    el("div", { class: "hr" })
  ]);

  if (!scenarios.length) {
    root.appendChild(card({ title: "Sem cenários", subtitle: "O pacote ativo não possui cenários." }));
    return root;
  }

  // UI: seletor simples de cenário (AAA depois vira carrossel)
  const select = el("select", {
    style:
      "width:100%;padding:12px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:rgba(245,245,247,.95);margin-bottom:12px"
  });

  scenarios.forEach((s, i) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${i + 1}. ${s.title}`;
    select.appendChild(opt);
  });

  root.appendChild(select);

  let activeScenario = getScenarioById(select.value) || scenarios[0];

  const seed = Date.now(); // determinístico por sessão
  let state = createSimulation(activeScenario, seed);

  const headerCard = card({
    title: activeScenario.title,
    subtitle:
      `${activeScenario.brief}\n\nEstado: ${state.view.phase}\nTempo: ${state.view.timeSec}s\nPaciente: ${state.view.patientLabel}`
  });

  const actionsWrap = el("div", { style: "display:grid;gap:10px" });

  const debriefCard = card({
    title: "Debrief (AAA v1)",
    subtitle: "—"
  });

  const timelineCard = card({
    title: "Timeline",
    subtitle: "Sem ações ainda."
  });

  const resetBtn = el("button", { class: "btnPrimary", text: "Reiniciar" });

  function renderActions() {
    actionsWrap.innerHTML = "";
    for (const a of state.view.actions) {
      const btn = el("button", { class: `btnAction ${a.severity === "critical" ? "critical" : ""}` }, [
        el("div", { class: "aTitle", text: a.label }),
        el("div", { class: "aHint", text: a.hint })
      ]);

      btn.addEventListener("click", () => {
        state = applyAction(state, activeScenario, a.id);
        renderAll();

        // se entrou em Debrief, registra melhor resultado
        if (state.view.phase === "Debrief") {
          store.recordScenarioResult(activeScenario.id, state.score, state.criticalMistakes);
        }
      });

      actionsWrap.appendChild(btn);
    }
  }

  function renderDebrief() {
    const deb = buildDebrief(state, activeScenario);
    const prog = store.getProgress()?.completedScenarios?.[activeScenario.id];

    const missedC = deb.missedCritical.length ? deb.missedCritical.join(", ") : "Nenhum";
    const missedN = deb.missedNonCritical.length ? deb.missedNonCritical.join(", ") : "Nenhum";

    const bestLine = prog
      ? `\n\nMelhor registro salvo:\n• Best Score: ${prog.bestScore}\n• Menor erros críticos: ${prog.bestCriticalMistakes}\n• Última vez: ${prog.lastPlayedAt}`
      : "";

    debriefCard.querySelector(".cardSub").textContent =
      `Último evento: ${state.lastEvent}\n\nScore: ${deb.score}\nErros críticos: ${deb.criticalMistakes}\n\nObrigatórios não feitos:\n• Críticos: ${missedC}\n• Não-críticos: ${missedN}${bestLine}`;
  }

  function renderTimeline() {
    if (!state.events.length) {
      timelineCard.querySelector(".cardSub").textContent = "Sem ações ainda.";
      return;
    }
    const lines = state.events.slice(-12).map((ev, idx) => {
      const s = ev.deltaScore >= 0 ? `+${ev.deltaScore}` : `${ev.deltaScore}`;
      const c = ev.deltaCritical ? ` • CRÍTICO +${ev.deltaCritical}` : "";
      return `${idx + 1}. t=${ev.t}s • ${ev.phase} • ${ev.label} • score ${s}${c}`;
    });
    timelineCard.querySelector(".cardSub").textContent = lines.join("\n");
  }

  function renderHeader() {
    headerCard.querySelector(".cardTitle").textContent = activeScenario.title;
    headerCard.querySelector(".cardSub").textContent =
      `${activeScenario.brief}\n\nEstado: ${state.view.phase}\nTempo: ${state.view.timeSec}s\nPaciente: ${state.view.patientLabel}`;
  }

  function renderAll() {
    renderHeader();
    renderActions();
    renderDebrief();
    renderTimeline();
  }

  resetBtn.addEventListener("click", () => {
    state = createSimulation(activeScenario, seed);
    renderAll();
  });

  select.addEventListener("change", () => {
    activeScenario = getScenarioById(select.value) || scenarios[0];
    state = createSimulation(activeScenario, seed);
    renderAll();
  });

  const resetRow = el("div", { style: "display:flex;justify-content:flex-end;margin-top:10px" }, [resetBtn]);

  root.appendChild(headerCard);
  root.appendChild(actionsWrap);
  root.appendChild(el("div", { style: "margin-top:12px;display:grid;gap:12px" }, [debriefCard, timelineCard, resetRow]));

  renderAll();
  return root;
}