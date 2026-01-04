import { el, card, carouselRow } from "../ui.js";
import { store } from "../store.js";
import { listScenarios, getScenarioById } from "../registry.js";
import { createSimulation, applyAction, buildDebrief, computePhysiologyLabel } from "../engine.js";

function badge(text) {
  return el("span", { class: "badge", style: "border-color:rgba(229,9,20,.35);color:rgba(245,245,247,.92)" }, [text]);
}
function difficultyPill(d) {
  const map = { facil: "FÁCIL", media: "MÉDIA", dificil: "DIFÍCIL" };
  return badge(map[d] || "—");
}

export default async function Simulation() {
  const scenarios = listScenarios();

  const root = el("div", {}, [
    el("h2", { style: "margin:8px 0 10px 0", text: "Simulação" }),
    el("p", {
      style: "color:rgba(245,245,247,.72);margin-top:0",
      text: "Hub estilo Netflix + START + inventário + hazards + SBAR automático."
    }),
    el("div", { class: "hr" })
  ]);

  if (!scenarios.length) {
    root.appendChild(card({ title: "Sem cenários", subtitle: "O pacote ativo não possui cenários." }));
    return root;
  }

  // Filtro por tag
  const allTags = Array.from(new Set(scenarios.flatMap((s) => (s.meta?.tags || []).slice(0, 6)))).sort((a, b) => a.localeCompare(b));
  const filterRow = el("div", { style: "display:flex;gap:10px;overflow-x:auto;padding-bottom:6px" });
  const filterState = { tag: "Todos" };

  function renderFilters() {
    filterRow.innerHTML = "";
    ["Todos", ...allTags].forEach((t) => {
      const b = el("button", { class: `bottomBtn ${filterState.tag === t ? "active" : ""}`, style: "min-width:120px" }, [t]);
      b.addEventListener("click", () => { filterState.tag = t; renderHub(); });
      filterRow.appendChild(b);
    });
  }

  root.appendChild(filterRow);
  renderFilters();

  const hubWrap = el("div");
  const playerWrap = el("div");
  root.appendChild(hubWrap);
  root.appendChild(playerWrap);

  function renderHub() {
    hubWrap.innerHTML = "";
    playerWrap.innerHTML = "";

    const filtered = filterState.tag === "Todos"
      ? scenarios
      : scenarios.filter((s) => (s.meta?.tags || []).includes(filterState.tag));

    const byDiff = {
      facil: filtered.filter((s) => s.meta?.difficulty === "facil"),
      media: filtered.filter((s) => s.meta?.difficulty === "media"),
      dificil: filtered.filter((s) => s.meta?.difficulty === "dificil"),
      outros: filtered.filter((s) => !s.meta?.difficulty)
    };

    const makeCards = (arr) =>
      arr.map((s) => {
        const prog = store.getProgress()?.completedScenarios?.[s.id];
        const best = prog ? `\n\nMelhor: ${prog.bestScore} | Críticos: ${prog.bestCriticalMistakes}` : "";
        const tags = (s.meta?.tags || []).slice(0, 3).join(" • ");
        return card({
          title: s.title,
          subtitle: `${s.brief}\n\nTags: ${tags || "—"}\nTempo estimado: ${s.meta?.estimatedMin || "—"} min${best}`,
          rightEl: difficultyPill(s.meta?.difficulty),
          onClick: () => renderPlayer(s.id)
        });
      });

    const rows = [];
    if (byDiff.media.length) rows.push(carouselRow("Em destaque (Média)", makeCards(byDiff.media)));
    if (byDiff.facil.length) rows.push(carouselRow("Treino (Fácil)", makeCards(byDiff.facil)));
    if (byDiff.dificil.length) rows.push(carouselRow("Avançado (Difícil)", makeCards(byDiff.dificil)));
    if (byDiff.outros.length) rows.push(carouselRow("Outros", makeCards(byDiff.outros)));
    rows.forEach((r) => hubWrap.appendChild(r));
  }

  function renderPlayer(scenarioId) {
    hubWrap.innerHTML = "";
    playerWrap.innerHTML = "";

    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
      playerWrap.appendChild(card({ title: "Cenário não encontrado", subtitle: "ID inválido." }));
      return;
    }

    const seed = Date.now();
    let state = createSimulation(scenario, seed);

    const top = el("div", { style: "display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap" }, [
      el("div", { class: "badge" }, ["Realista profissional • Determinístico • Offline-first"]),
      el("button", { class: "btnPrimary", text: "Voltar ao Hub", onClick: () => renderHub() })
    ]);

    const headerCard = card({
      title: scenario.title,
      subtitle:
        `${scenario.brief}\n\nEstado: ${state.view.phase}\nTempo: ${state.view.timeSec}s\nVítima focada: ${state.focusLabel}\nEstado clínico: ${computePhysiologyLabel(state)}`
    });

    const actionsWrap = el("div", { style: "display:grid;gap:10px" });

    const hazardsCard = card({ title: "Perigos de Cena", subtitle: "—" });
    const inventoryCard = card({ title: "Recursos (Inventário)", subtitle: "—" });
    const patientsCard = card({ title: "Vítimas / START", subtitle: "—" });
    const debriefCard = card({ title: "Debrief (AAA v3)", subtitle: "—" });
    const timelineCard = card({ title: "Timeline", subtitle: "Sem ações ainda." });
    const sbarCard = card({ title: "SBAR (Handover)", subtitle: "Será gerado ao encerrar (ação de handover)." });

    const resetBtn = el("button", { class: "btnPrimary", text: "Reiniciar" });
    resetBtn.addEventListener("click", () => { state = createSimulation(scenario, seed); renderAll(); });

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
          if (state.view.phase === "Debrief") {
            store.recordScenarioResult(scenario.id, state.score, state.criticalMistakes);
          }
        });

        actionsWrap.appendChild(btn);
      }
    }

    function renderHazards() {
      const lines = (state.hazards || []).map((h) =>
        `${h.label}\n• Severidade: ${h.severity}\n• Status: ${h.mitigated ? "MITIGADO" : "ATIVO"}`
      );
      hazardsCard.querySelector(".cardSub").textContent = lines.length ? lines.join("\n\n") : "Sem riscos cadastrados.";
    }

    function renderInventory() {
      const items = Object.values(state.inventory || {});
      const lines = items.map((i) => `${i.label}: ${i.qty}`);
      inventoryCard.querySelector(".cardSub").textContent = lines.length ? lines.join("\n") : "Sem inventário.";
    }

    function renderPatients() {
      const lines = state.patients.map((p) => {
        const b = p.bleedingMassive ? "SIM" : "NÃO";
        const alive = p.alive ? "VIVO" : "PCR/ÓBITO";
        const focus = p.id === state.focusPatientId ? " (FOCO)" : "";
        return `${p.label}${focus}\n• START: ${p.triageTag}\n• Condição: ${p.condition}\n• Shock Index: ${p.shockIndex.toFixed(2)}\n• Hemorragia massiva: ${b}\n• Status: ${alive}`;
      });
      patientsCard.querySelector(".cardSub").textContent = lines.join("\n\n");
    }

    function renderDebrief() {
      const deb = buildDebrief(state, scenario);
      const prog = store.getProgress()?.completedScenarios?.[scenario.id];

      const missedC = deb.missedCritical.length ? deb.missedCritical.join(", ") : "Nenhum";
      const missedN = deb.missedNonCritical.length ? deb.missedNonCritical.join(", ") : "Nenhum";

      const bestLine = prog
        ? `\n\nMelhor salvo:\n• Best Score: ${prog.bestScore}\n• Menor críticos: ${prog.bestCriticalMistakes}\n• Última vez: ${prog.lastPlayedAt}`
        : "";

      debriefCard.querySelector(".cardSub").textContent =
        `Último evento: ${state.lastEvent}\n\nScore: ${deb.score}\nErros críticos: ${deb.criticalMistakes}\n\nPenalidades:\n• Sem reavaliar: ${deb.reassessPenalties}\n• Hazards ativos: ${deb.hazardPenalties}\n\nObrigatórios não feitos:\n• Críticos: ${missedC}\n• Não-críticos: ${missedN}\n\nEstado clínico final: ${computePhysiologyLabel(state)}${bestLine}`;
    }

    function renderTimeline() {
      if (!state.events.length) {
        timelineCard.querySelector(".cardSub").textContent = "Sem ações ainda.";
        return;
      }
      const lines = state.events.slice(-16).map((ev, idx) => {
        const s = ev.deltaScore >= 0 ? `+${ev.deltaScore}` : `${ev.deltaScore}`;
        const c = ev.deltaCritical ? ` • CRÍTICO +${ev.deltaCritical}` : "";
        const p = ev.patientId ? ` • ${ev.patientId}` : "";
        const phys = ev.phys ? ` • ${ev.phys}` : "";
        return `${idx + 1}. t=${ev.t}s • ${ev.phase} • ${ev.label} • score ${s}${c}${p}${phys}`;
      });
      timelineCard.querySelector(".cardSub").textContent = lines.join("\n");
    }

    function renderSBAR() {
      sbarCard.querySelector(".cardSub").textContent = state.sbarText
        ? state.sbarText
        : "Será gerado ao encerrar (ação de handover).";
    }

    function renderHeader() {
      headerCard.querySelector(".cardTitle").textContent = scenario.title;
      headerCard.querySelector(".cardSub").textContent =
        `${scenario.brief}\n\nEstado: ${state.view.phase}\nTempo: ${state.view.timeSec}s\nVítima focada: ${state.focusLabel}\nEstado clínico: ${computePhysiologyLabel(state)}`;
    }

    function renderAll() {
      renderHeader();
      renderActions();
      renderHazards();
      renderInventory();
      renderPatients();
      renderDebrief();
      renderTimeline();
      renderSBAR();
    }

    const resetRow = el("div", { style: "display:flex;justify-content:flex-end;margin-top:10px" }, [resetBtn]);

    playerWrap.appendChild(top);
    playerWrap.appendChild(el("div", { style: "height:10px" }));
    playerWrap.appendChild(headerCard);
    playerWrap.appendChild(actionsWrap);
    playerWrap.appendChild(el("div", { style: "margin-top:12px;display:grid;gap:12px" }, [
      hazardsCard,
      inventoryCard,
      patientsCard,
      debriefCard,
      timelineCard,
      sbarCard,
      resetRow
    ]));

    renderAll();
  }

  renderHub();
  return root;
}