const LS_KEY = "APS_STATE_V2";

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

function defaultCareer() {
  return {
    profile: {
      name: "Jogador",
      role: "bombeiro_civil" // bombeiro_civil | socorrista | enfermagem | estudante
    },
    xp: 0,
    level: 1,
    rank: "Recruta",
    unlocked: {
      seasons: ["s1"],
      episodes: { "s1": ["e1"] }
    }
  };
}

function xpToNext(level) {
  // curva leve (AAA depois ajusta)
  return 120 + (level - 1) * 80;
}

function rankForLevel(level) {
  if (level >= 12) return "Veterano";
  if (level >= 8) return "Profissional";
  if (level >= 4) return "Operacional";
  return "Recruta";
}

export const store = {
  _packs: [],
  _activePackId: null,

  _progress: {
    completedScenarios: {} // { [scenarioId]: { bestScore, bestCriticalMistakes, lastPlayedAt } }
  },

  _career: defaultCareer(),

  _userPacks: {
    // packs criados no editor (salvos local)
    // { [packId]: { manifest, protocols, scenarios, references, signature } }
    items: {}
  },

  hydrate() {
    const s = loadState();
    if (typeof s.activePackId === "string") this._activePackId = s.activePackId;
    if (s.progress && typeof s.progress === "object") this._progress = s.progress;
    if (s.career && typeof s.career === "object") this._career = s.career;
    if (s.userPacks && typeof s.userPacks === "object") this._userPacks = s.userPacks;
  },

  persist() {
    saveState({
      activePackId: this._activePackId,
      progress: this._progress,
      career: this._career,
      userPacks: this._userPacks
    });
  },

  setPacks(packs) {
    // incorpora packs do editor + packs locais do repo
    const userPacks = Object.values(this._userPacks.items || {}).map((p) => ({
      manifest: p.manifest,
      protocols: p.protocols,
      scenarios: p.scenarios,
      references: p.references,
      signature: p.signature,
      __source: "user"
    }));

    this._packs = userPacks.concat(packs.map((p) => ({ ...p, __source: "repo" })));

    if (!this._activePackId && this._packs.length) {
      this._activePackId = this._packs[0].manifest.id;
    }

    if (this._activePackId && !this._packs.find((p) => p.manifest.id === this._activePackId)) {
      this._activePackId = this._packs[0]?.manifest?.id || null;
    }

    this.persist();
  },

  getPacks() { return this._packs; },

  getActivePack() {
    return this._packs.find((p) => p.manifest.id === this._activePackId) || this._packs[0] || null;
  },

  setActivePack(id) { this._activePackId = id; this.persist(); },

  // PROGRESSO
  getProgress() { return this._progress; },

  recordScenarioResult(scenarioId, score, criticalMistakes) {
    const prev = this._progress.completedScenarios[scenarioId];
    const bestScore = prev ? Math.max(prev.bestScore, score) : score;
    const bestCriticalMistakes = prev ? Math.min(prev.bestCriticalMistakes, criticalMistakes) : criticalMistakes;

    this._progress.completedScenarios[scenarioId] = {
      bestScore,
      bestCriticalMistakes,
      lastPlayedAt: new Date().toISOString()
    };

    // Carreira: XP por resultado (determinístico)
    const xpGain = Math.max(10, Math.min(90, Math.floor(bestScore / 4) - criticalMistakes * 6));
    this.addXP(xpGain);

    this.persist();
    return xpGain;
  },

  // CARREIRA
  getCareer() { return this._career; },

  setProfile({ name, role }) {
    if (typeof name === "string" && name.trim()) this._career.profile.name = name.trim();
    if (typeof role === "string") this._career.profile.role = role;
    this.persist();
  },

  addXP(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;

    let xp = this._career.xp + amount;
    let level = this._career.level;

    while (xp >= xpToNext(level)) {
      xp -= xpToNext(level);
      level += 1;
    }

    this._career.xp = xp;
    this._career.level = level;
    this._career.rank = rankForLevel(level);
    this.persist();
  },

  // PACK BUILDER
  saveUserPack(packObj) {
    const id = packObj?.manifest?.id;
    if (!id) return false;
    this._userPacks.items[id] = packObj;
    this.persist();
    return true;
  },

  deleteUserPack(packId) {
    if (this._userPacks.items[packId]) {
      delete this._userPacks.items[packId];
      this.persist();
      return true;
    }
    return false;
  },

  listUserPacks() {
    return Object.values(this._userPacks.items || {});
  }
};