export function createSimulation(scenario, seed) {
  const state = {
    scenarioId: scenario.id,
    seed,
    phaseIndex: 0,
    timeSec: 0,
    score: 0,
    criticalMistakes: 0,
    doneActions: new Set(),
    lastEvent: "Simulação iniciada.",
    events: [] // timeline: { t, phase, actionId, label, deltaScore, deltaCritical }
  };
  return attachView(scenario, state);
}

function attachView(scenario, state) {
  const phaseObj = scenario.phases[state.phaseIndex] || null;
  const phase = phaseObj?.phase || "Debrief";
  const actions = phaseObj?.actions || [];
  return {
    ...state,
    view: {
      phase,
      timeSec: state.timeSec,
      patientLabel: "Paciente 01",
      actions
    }
  };
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
    if (beforePos <= nextPos && !doneActions.has(rule.actionId)) {
      missing.push(rule);
    }
  }
  return missing;
}

export function applyAction(state, scenario, actionId) {
  const currentPhase = scenario.phases[state.phaseIndex]?.phase || "Debrief";
  const currentActions = scenario.phases[state.phaseIndex]?.actions || [];
  const action = findAction(currentActions, actionId);

  if (!action) {
    return attachView(scenario, { ...state, lastEvent: `Ação inválida no estado atual: ${actionId}` });
  }

  const nextDone = new Set(state.doneActions);
  const repeated = nextDone.has(action.id);
  nextDone.add(action.id);

  let deltaScore = action.severity === "critical" ? 15 : 5;
  if (repeated) deltaScore -= 3;

  let score = state.score + deltaScore;
  let criticalMistakes = state.criticalMistakes;
  let deltaCritical = 0;

  const nextTime = state.timeSec + (action.timeCostSec || 0);
  let nextPhaseIndex = advancePhaseIfNeeded(scenario, state.phaseIndex, nextDone);

  // Se avançou, penaliza regras obrigatórias não feitas
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

  const newEvent = {
    t: nextTime,
    phase: currentPhase,
    actionId: action.id,
    label: action.label,
    deltaScore,
    deltaCritical
  };

  const base = {
    ...state,
    doneActions: nextDone,
    timeSec: nextTime,
    phaseIndex: nextPhaseIndex,
    score,
    criticalMistakes,
    lastEvent: `Executou: ${action.label} (fase: ${currentPhase})`,
    events: state.events.concat([newEvent])
  };

  if (nextPhaseIndex >= scenario.phases.length) {
    return {
      ...base,
      view: { phase: "Debrief", timeSec: nextTime, patientLabel: "Paciente 01", actions: [] }
    };
  }

  return attachView(scenario, base);
}

/**
 * Debrief estruturado (AAA v1)
 */
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
    timeline: state.events.slice(),
    missedCritical,
    missedNonCritical
  };
}