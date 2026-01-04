export const store = {
  _packs: [],
  _activePackId: null,

  setPacks(packs) {
    this._packs = packs;
    if (!this._activePackId && packs.length) {
      this._activePackId = packs[0].manifest.id;
    }
  },

  getPacks() {
    return this._packs;
  },

  getActivePack() {
    return this._packs.find((p) => p.manifest.id === this._activePackId) || this._packs[0] || null;
  },

  setActivePack(id) {
    this._activePackId = id;
  }
};