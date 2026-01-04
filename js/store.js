const LS_KEY = "APS_STATE_V1";

function safeParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function loadState() {
  const raw = localStorage.getItem(LS_KEY);
  const data = safeParse(raw || "");
  return data && typeof data === "object" ? data : {};
}

function saveState(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export const store = {
  _packs: [],
  _activePackId: null,
  _progress: {
    completedScenarios: {}, // { [scenarioId]: { bestScore, bestCriticalMistakes, lastPlayedAt } }
  },

  hydrate() {
    const s = loadState();
    if (typeof s.activePackId === "string") this._activePackId = s.activePackId;
    if (s.progress && typeof s.progress === "object") this._progress = s.progress;
  },

  persist() {
    saveState({
      activePackId: this._activePackId,
      progress: this._progress
    });
  },

  setPacks(packs) {
    this._packs = packs;

    // se não existe pack ativo ainda, seleciona o primeiro
    if (!this._activePackId && packs.length) {
      this._activePackId = packs[0].manifest.id;
    }

    // se o pack ativo não existe mais, volta pro primeiro
    if (this._activePackId && !packs.find((p) => p.manifest.id === this._activePackId)) {
      this._activePackId = packs[0]?.manifest?.id || null;
    }

    this.persist();
  },

  getPacks() {
    return this._packs;
  },

  getActivePack() {
    return this._packs.find((p) => p.manifest.id === this._activePackId) || this._packs[0] || null;
  },

  setActivePack(id) {
    this._activePackId = id;
    this.persist();
  },

  getProgress() {
    return this._progress;
  },

  recordScenarioResult(scenarioId, score, criticalMistakes) {
    const prev = this._progress.completedScenarios[scenarioId];
    const bestScore = prev ? Math.max(prev.bestScore, score) : score;
    const bestCriticalMistakes = prev
      ? Math.min(prev.bestCriticalMistakes, criticalMistakes)
      : criticalMistakes;

    this._progress.completedScenarios[scenarioId] = {
      bestScore,
      bestCriticalMistakes,
      lastPlayedAt: new Date().toISOString()
    };

    this.persist();
  }
};