// Engine AAA v3 (determinística, offline, extensível por content pack)
// - START triage (v1) multi-vítimas
// - Inventário/recursos com consumo
// - Hazards de cena com penalidade até mitigação
// - Reavaliação obrigatória no loop
// - SBAR automático (handover)

export function createSimulation(scenario, seed) {
  const patients = (scenario.patients || []).map((p) => ({
    id: p.id,
    label: p.label,
    conscious: !!p.initial?.conscious,
    breathing: !!p.initial?.breathing,
    pulse: !!p.initial?.pulse,
    bleedingMassive: !!p.initial?.bleedingMassive,
    shockIndex: typeof p.initial?.shockIndex === "number" ? p.initial.shockIndex : 0.8,
    condition: p.initial?.condition || "moderada",
    canWalk: !!p.initial?.canWalk,
    alive: true,
    lastReassessAt: 0,
    triageTag: "NÃO TRIADO" // VERDE/AMARELO/VERMELHO/PRETO
  }));

  const focusPatientId = patients[0]?.id || "p1";
  const focusLabel = patients.find((x) => x.id === focusPatientId)?.label || "Paciente";

  const inventory = {};
  for (const it of (scenario.inventory?.items || [])) {
    inventory[it.id] = { id: it.id, label: it.label, qty: it.qty };
  }

  const hazards = (scenario.environment?.hazards || []).map((h) => ({
    id: h.id,
    label: h.label,
    severity: h.severity || "baixo",
    mitigated: false,
    mitigationActionId: h.mitigationActionId || null
  }));

  const state = {
    scenarioId: scenario.id,
    seed,
    phaseIndex: 0,
    timeSec: 0,
    score: 0,
    criticalMistakes: 0,
    reassessPenalties: 0,
    hazardPenalties: 0,
    doneActions: new Set(),
    lastEvent: "Simulação iniciada.",
    events: [],
    patients,
    focusPatientId,
    focusLabel,
    inventory,
    hazards,
    sbarText: ""
  };

  return attachView(scenario, state);
}

function attachView(scenario, state) {
  const phaseObj = scenario.phases[state.phaseIndex] || null;
  const phase = phaseObj?.phase || "Debrief";
  const actions = phaseObj?.actions || [];

  const filteredActions = actions.filter((a) => {
    const p = getFocusedPatient(state);

    // Controle de hemorragia só faz sentido se sangramento massivo
    if (a.id === "a_x_bleed_control") return !!(p && p.alive && p.bleedingMassive);

    // Mitigação de hazard só aparece se existir e não mitigado
    if (a.id && a.id.startsWith("a_mitigate_")) {
      const hz = state.hazards.find((h) => h.mitigationActionId === a.id);
      return hz ? !hz.mitigated : true;
    }

    return true;
  });

  return {
    ...state,
    view: {
      phase,
      timeSec: state.timeSec,
      patientLabel: state.focusLabel,
      actions: filteredActions
    }
  };
}

function getFocusedPatient(state) {
  return state.patients.find((p) => p.id === state.focusPatientId) || null;
}

function phaseOrderIndex(phases, phaseName) {
  const idx = phases.findIndex((p) => p.phase === phaseName);
  return idx >= 0 ? idx : 9999;
}

function findAction(actions, id) {
  return actions.find((a) => a.id === id) || null;
}

function advancePhaseIfNeeded(scenario, phaseIndex, doneActions) {
  const actions = scenario.phases[phaseIndex]?.actions || [];
  if (!actions.length) return Math.min(phaseIndex + 1, scenario.phases.length);
  for (const a of actions) if (doneActions.has(a.id)) return Math.min(phaseIndex + 1, scenario.phases.length);
  return phaseIndex;
}

function computeMissingRules(scenario, doneActions, nextPhaseName) {
  const missing = [];
  const nextPos = phaseOrderIndex(scenario.phases, nextPhaseName);
  for (const rule of scenario.rules?.mustDoBefore || []) {
    const beforePos = phaseOrderIndex(scenario.phases, rule.beforePhase);
    if (beforePos <= nextPos && !doneActions.has(rule.actionId)) missing.push(rule);
  }
  return missing;
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function degradePhysiology(state, deltaTimeSec) {
  for (const p of state.patients) {
    if (!p.alive) continue;

    const bleedFactor = p.bleedingMassive ? 0.02 : 0.005;
    p.shockIndex = clamp(p.shockIndex + bleedFactor * deltaTimeSec, 0.5, 2.5);

    if (p.shockIndex < 0.9) p.condition = "moderada";
    else if (p.shockIndex < 1.2) p.condition = "grave";
    else p.condition = "crítica";

    if (p.shockIndex >= 2.2) {
      p.conscious = false;
      p.pulse = false;
      p.breathing = false;
      p.alive = false;
      p.triageTag = "PRETO";
    }
  }
}

function needsReassessPenalty(state, scenario, actionId) {
  const phase = scenario.phases[state.phaseIndex]?.phase || "Debrief";
  if (phase !== "InterventionLoop") return false;

  if (actionId === "a_reassess") return false;
  if (actionId === "a_switch_p1" || actionId === "a_switch_p2") return false;

  const p = getFocusedPatient(state);
  if (!p || !p.alive) return false;

  return (state.timeSec - (p.lastReassessAt || 0)) > 25;
}

function applyHazardPenalty(state) {
  // Se houver hazard não mitigado, penaliza por “risco contínuo”
  const active = state.hazards.filter((h) => !h.mitigated);
  if (!active.length) return 0;

  // penalidade determinística por ação (leve, mas constante)
  let p = 0;
  for (const h of active) {
    if (h.severity === "alto") p += 6;
    else if (h.severity === "medio") p += 4;
    else p += 2;
  }
  state.hazardPenalties += 1;
  return p;
}

function switchPatient(state, targetId) {
  if (!state.patients.some((p) => p.id === targetId)) return;
  state.focusPatientId = targetId;
  state.focusLabel = state.patients.find((p) => p.id === targetId)?.label || state.focusLabel;
}

function consume(state, itemId, qty) {
  const it = state.inventory[itemId];
  if (!it) return false;
  if (it.qty < qty) return false;
  it.qty -= qty;
  return true;
}

function applySTART(state) {
  const p = getFocusedPatient(state);
  if (!p) return "NÃO TRIADO";
  if (!p.alive) { p.triageTag = "PRETO"; return p.triageTag; }

  // START simplificado determinístico (sem RR real, etc.)
  // 1) Pode andar? -> VERDE
  if (p.canWalk) { p.triageTag = "VERDE"; return p.triageTag; }

  // 2) Respira? se não -> PRETO (neste MVP)
  if (!p.breathing) { p.triageTag = "PRETO"; return p.triageTag; }

  // 3) Perfusão/choque (usa shockIndex como proxy)
  if (p.shockIndex >= 1.2 || p.bleedingMassive) { p.triageTag = "VERMELHO"; return p.triageTag; }

  // 4) Consciência
  if (!p.conscious) { p.triageTag = "VERMELHO"; return p.triageTag; }

  p.triageTag = "AMARELO";
  return p.triageTag;
}

function applyClinicalEffect(state, actionId) {
  const p = getFocusedPatient(state);
  if (!p) return;

  if (actionId === "a_put_gloves") {
    // consome 1 par de luvas
    consume(state, "luvas", 1);
  }

  if (actionId === "a_x_bleed_control") {
    // tenta usar gaze; se não tiver, ainda pode “pressão direta” mas com menos efeito
    const hasGaze = consume(state, "gaze", 1);

    // se precisar torniquete (hemorragia massiva + piora), tenta consumir
    // MVP: se sangramento massivo e SI >= 1.2, assume indicação de torniquete
    if (p.bleedingMassive && p.shockIndex >= 1.2) {
      consume(state, "torniquete", 1);
    }

    p.bleedingMassive = false;
    p.shockIndex = clamp(p.shockIndex - (hasGaze ? 0.25 : 0.15), 0.5, 2.5);
    if (p.alive) {
      p.condition = p.shockIndex < 0.9 ? "moderada" : (p.shockIndex < 1.2 ? "grave" : "crítica");
    }
  }

  if (actionId === "a_manage_hypothermia") {
    const ok = consume(state, "manta", 1);
    p.shockIndex = clamp(p.shockIndex - (ok ? 0.07 : 0.03), 0.5, 2.5);
  }

  if (actionId === "a_reassess") {
    p.lastReassessAt = state.timeSec;
  }

  if (actionId === "a_start_triage") {
    applySTART(state);
  }

  // hazard mitigation
  const hz = state.hazards.find((h) => h.mitigationActionId === actionId);
  if (hz) hz.mitigated = true;

  // SBAR
  if (actionId === "a_handover") {
    state.sbarText = buildSBAR(state);
  }
}

export function applyAction(state, scenario, actionId) {
  const currentPhase = scenario.phases[state.phaseIndex]?.phase || "Debrief";
  const currentActions = scenario.phases[state.phaseIndex]?.actions || [];
  const action = findAction(currentActions, actionId);
  if (!action) return attachView(scenario, { ...state, lastEvent: `Ação inválida: ${actionId}` });

  const nextTime = state.timeSec + (action.timeCostSec || 0);
  const deltaT = nextTime - state.timeSec;

  const nextDone = new Set(state.doneActions);
  const repeated = nextDone.has(action.id);
  nextDone.add(action.id);

  let deltaScore = action.severity === "critical" ? 15 : 5;
  if (repeated) deltaScore -= 3;

  let score = state.score + deltaScore;
  let criticalMistakes = state.criticalMistakes;
  let deltaCritical = 0;
  let reassessPenalties = state.reassessPenalties;

  // penalidade por hazard ativo
  const hazardPenalty = applyHazardPenalty(state);
  if (hazardPenalty) {
    score -= hazardPenalty;
    deltaScore -= hazardPenalty;
  }

  // penalidade por não reavaliar no loop
  if (needsReassessPenalty(state, scenario, actionId)) {
    reassessPenalties += 1;
    score -= 8;
    deltaScore -= 8;
  }

  const nextState = {
    ...state,
    timeSec: nextTime,
    doneActions: nextDone,
    score,
    criticalMistakes,
    reassessPenalties
  };

  // tempo corre -> fisiologia
  degradePhysiology(nextState, deltaT);

  // trocar paciente
  if (actionId === "a_switch_p1") switchPatient(nextState, "p1");
  if (actionId === "a_switch_p2") switchPatient(nextState, "p2");

  // aplica efeitos
  applyClinicalEffect(nextState, actionId);

  // avanço de fase
  let nextPhaseIndex = advancePhaseIfNeeded(scenario, state.phaseIndex, nextDone);

  // regras obrigatórias
  if (nextPhaseIndex !== state.phaseIndex) {
    const nextPhase = scenario.phases[nextPhaseIndex]?.phase || "Debrief";
    const missing = computeMissingRules(scenario, nextDone, nextPhase);
    for (const m of missing) {
      if (m.criticalIfMissed) {
        criticalMistakes += 1;
        deltaCritical += 1;
        score -= 25;
        deltaScore -= 25;
      } else {
        score -= 10;
        deltaScore -= 10;
      }
    }
  }

  // se alguém colapsou, marca crítico (educacional)
  const anyDead = nextState.patients.some((p) => !p.alive);
  if (anyDead) {
    score -= 12;
    deltaScore -= 12;
    criticalMistakes += 1;
    deltaCritical += 1;
  }

  nextState.phaseIndex = nextPhaseIndex;
  nextState.score = score;
  nextState.criticalMistakes = criticalMistakes;
  nextState.lastEvent = `Executou: ${action.label} (fase: ${currentPhase})`;

  const focus = getFocusedPatient(nextState);
  const phys = focus
    ? `${focus.condition} | SI=${focus.shockIndex.toFixed(2)} | bleed=${focus.bleedingMassive ? "SIM" : "NÃO"} | triage=${focus.triageTag}`
    : "";

  nextState.events = state.events.concat([{
    t: nextTime,
    phase: currentPhase,
    actionId: action.id,
    label: action.label,
    deltaScore,
    deltaCritical,
    patientId: nextState.focusPatientId,
    phys
  }]);

  if (nextPhaseIndex >= scenario.phases.length) {
    return {
      ...nextState,
      view: { phase: "Debrief", timeSec: nextTime, patientLabel: nextState.focusLabel, actions: [] }
    };
  }

  return attachView(scenario, nextState);
}

export function buildDebrief(state, scenario) {
  const done = state.doneActions || new Set();
  const required = scenario.rules?.mustDoBefore || [];

  const missedCritical = [];
  const missedNonCritical = [];

  for (const r of required) {
    if (!done.has(r.actionId)) {
      if (r.criticalIfMissed) missedCritical.push(r.actionId);
      else missedNonCritical.push(r.actionId);
    }
  }

  return {
    scenarioId: state.scenarioId,
    score: state.score,
    criticalMistakes: state.criticalMistakes,
    reassessPenalties: state.reassessPenalties,
    hazardPenalties: state.hazardPenalties,
    timeline: state.events.slice(),
    missedCritical,
    missedNonCritical
  };
}

export function computePhysiologyLabel(state) {
  const focus = state.patients.find((p) => p.id === state.focusPatientId);
  if (!focus) return "—";
  if (!focus.alive) return "PCR/ÓBITO (simulado)";
  const bleed = focus.bleedingMassive ? "Hemorragia massiva" : "Sem hemorragia massiva";
  return `${focus.condition.toUpperCase()} • ${bleed} • Shock Index ${focus.shockIndex.toFixed(2)} • START: ${focus.triageTag}`;
}

function buildSBAR(state) {
  // SBAR automático (texto pronto)
  const hazards = state.hazards.map((h) => `${h.label}: ${h.mitigated ? "mitigado" : "NÃO mitigado"}`).join("; ") || "Nenhum";
  const inv = Object.values(state.inventory).map((i) => `${i.label}: ${i.qty}`).join(" | ") || "—";

  const patients = state.patients.map((p) => {
    const status = p.alive ? "vivo" : "PCR/óbito";
    return `${p.label} • START: ${p.triageTag} • Cond: ${p.condition} • SI=${p.shockIndex.toFixed(2)} • Sangramento massivo: ${p.bleedingMassive ? "SIM" : "NÃO"} • Status: ${status}`;
  }).join("\n");

  const keyActions = state.events.slice(0, 12).map((e) => `t=${e.t}s: ${e.label} (${e.patientId})`).join("\n") || "—";

  return [
    "SBAR — HANDOVER (Gerado automaticamente)",
    "",
    "S — Situação:",
    "Duas vítimas em cenário de trauma com risco ambiental. Atendimento inicial realizado e suporte acionado (quando aplicado).",
    "",
    "B — Background:",
    `Riscos de cena: ${hazards}`,
    `Recursos restantes: ${inv}`,
    "",
    "A — Avaliação:",
    patients,
    "",
    "R — Recomendações:",
    "Manter monitorização, reavaliar periodicamente (XABCDE), priorizar VERMELHO, prevenir hipotermia e aguardar transporte/remoção conforme protocolo local.",
    "",
    "Resumo de ações (parcial):",
    keyActions
  ].join("\n");
}