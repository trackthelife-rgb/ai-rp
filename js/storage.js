// ═══════════════════════════════════════════
// storage.js — LocalStorage CRUD (no modules)
// ═══════════════════════════════════════════

const STORAGE_KEY  = 'rp_ai_roleplays';
const SETTINGS_KEY = 'rp_ai_settings';

window.Storage = {
  getAll() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  },
  get(id) {
    return this.getAll().find(r => r.id === id) || null;
  },
  save(roleplay) {
    const all = this.getAll();
    const idx = all.findIndex(r => r.id === roleplay.id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...roleplay, updatedAt: new Date().toISOString() };
    } else {
      all.unshift({ ...roleplay, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return roleplay;
  },
  delete(id) {
    const all = this.getAll().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },
  addMessage(rpId, message) {
    const rp = this.get(rpId);
    if (!rp) return;
    rp.messages = rp.messages || [];
    rp.messages.push({ ...message, id: crypto.randomUUID(), timestamp: new Date().toISOString() });
    this.save(rp);
    return rp;
  },
  updateCharacters(rpId, characters) {
    const rp = this.get(rpId);
    if (!rp) return;
    rp.characters = characters;
    this.save(rp);
    return rp;
  },
  getSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return {
        aiProvider: s.aiProvider || (s.openrouterKey ? 'openrouter' : (s.ollamaModel ? 'ollama' : 'openrouter')),
        openrouterKey: s.openrouterKey || '',
        openrouterModel: (s.openrouterModel && s.openrouterModel !== 'nousresearch/hermes-3-llama-3.1-8b') ? s.openrouterModel : 'gryphe/mythomax-l2-13b',
        ollamaUrl: s.ollamaUrl || 'http://localhost:11434',
        ollamaModel: s.ollamaModel || 'dolphin-phi',
        cseKey: s.cseKey || '',
        cseId: s.cseId || '',
        ...s
      };
    }
    catch { return {}; }
  },
  saveSettings(settings) {
    const current = this.getSettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
  },
  hasApiKeys() {
    const s = this.getSettings();
    if (s.aiProvider === 'openrouter') {
      return !!(s.openrouterKey && s.openrouterKey.trim().length > 0);
    }
    return true; // Ollama runs locally
  }
};
