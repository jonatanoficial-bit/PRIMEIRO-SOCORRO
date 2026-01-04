export function createSimulation(scenario, seed) {
  const state = {
    scenarioId: scenario.id,
    seed,
    phaseIndex: 0,
    timeSec: 0,
    score: 0,
    criticalMistakes: 0,
    doneActions: new Set(),
    lastEvent: "Simulação iniciada."
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

  let score = state.score + (action.severity === "critical" ? 15 : 5);
  if (repeated) score -= 3;

  const nextTime = state.timeSec + (action.timeCostSec || 0);
  let nextPhaseIndex = advancePhaseIfNeeded(scenario, state.phaseIndex, nextDone);

  let criticalMistakes = state.criticalMistakes;

  if (nextPhaseIndex !== state.phaseIndex) {
    const nextPhase = scenario.phases[nextPhaseIndex]?.phase || "Debrief";
    const nextPhasePos = phaseOrderIndex(scenario.phases, nextPhase);
    for (const rule of scenario.rules?.mustDoBefore || []) {
      const beforePos = phaseOrderIndex(scenario.phases, rule.beforePhase);
      if (beforePos <= nextPhasePos && !nextDone.has(rule.actionId)) {
        if (rule.criticalIfMissed) criticalMistakes += 1;
        score -= rule.criticalIfMissed ? 25 : 10;
      }
    }
  }

  const base = {
    ...state,
    doneActions: nextDone,
    timeSec: nextTime,
    phaseIndex: nextPhaseIndex,
    score,
    criticalMistakes,
    lastEvent: `Executou: ${action.label} (fase: ${currentPhase})`
  };

  if (nextPhaseIndex >= scenario.phases.length) {
    return {
      ...base,
      view: { phase: "Debrief", timeSec: nextTime, patientLabel: "Paciente 01", actions: [] }
    };
  }

  return attachView(scenario, base);
}