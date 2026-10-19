// ═══════════════════════════════════════════
// storage.js — User Auth & Local Database CRUD
// ═══════════════════════════════════════════

const STORAGE_KEY  = 'rp_ai_roleplays';
const SETTINGS_KEY = 'rp_ai_settings';
const USERS_KEY    = 'rp_ai_users_db';
const SESSION_KEY  = 'rp_ai_current_session';

window.Storage = {
  // ── Authentication & User DB ─────────────
  getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
    catch { return []; }
  },

  getCurrentUser() {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      if (!session) return null;
      return JSON.parse(session);
    } catch { return null; }
  },

  isLoggedIn() {
    return !!this.getCurrentUser();
  },

  signUp(email, password, name = '') {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass  = String(password || '').trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address');
    }
    if (!cleanPass || cleanPass.length < 4) {
      throw new Error('Password must be at least 4 characters');
    }

    const users = this.getUsers();
    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('An account with this email already exists. Please sign in.');
    }

    const user = {
      id: crypto.randomUUID(),
      email: cleanEmail,
      password: cleanPass,
      name: (name || cleanEmail.split('@')[0]).trim(),
      createdAt: new Date().toISOString()
    };

    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    // Save active session (hide password from session)
    const sessionUser = { id: user.id, email: user.email, name: user.name };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

    // Auto-assign any legacy roleplays without userId to this first user
    this._claimUnassignedRoleplays(user.id);

    return sessionUser;
  },

  login(email, password) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass  = String(password || '').trim();
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      throw new Error('No account found with this email. Please sign up first.');
    }
    if (user.password !== cleanPass) {
      throw new Error('Incorrect password. Please try again.');
    }

    const sessionUser = { id: user.id, email: user.email, name: user.name };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

    // Auto-claim any unassigned roleplays
    this._claimUnassignedRoleplays(user.id);

    return sessionUser;
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
  },

  _claimUnassignedRoleplays(userId) {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      let changed = false;
      all.forEach(rp => {
        if (!rp.userId) {
          rp.userId = userId;
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      }
    } catch (_) {}
  },

  // ── Roleplays Storage (Scoped per user) ──
  getAll() {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const user = this.getCurrentUser();
      if (!user) {
        // Return unassigned roleplays if not logged in
        return all.filter(r => !r.userId);
      }
      // Return roleplays belonging to current user
      return all.filter(r => r.userId === user.id || !r.userId);
    }
    catch { return []; }
  },

  get(id) {
    return this.getAll().find(r => r.id === id) || null;
  },

  save(roleplay) {
    const user = this.getCurrentUser();
    let all = [];
    try { all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { all = []; }

    const idx = all.findIndex(r => r.id === roleplay.id);
    const rpData = {
      ...roleplay,
      userId: roleplay.userId || user?.id || null,
      updatedAt: new Date().toISOString()
    };

    if (idx >= 0) {
      all[idx] = { ...all[idx], ...rpData };
    } else {
      all.unshift({ ...rpData, createdAt: new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return roleplay;
  },

  delete(id) {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const filtered = all.filter(r => r.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (_) {}
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

  // ── Settings ──────────────────────────────
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
