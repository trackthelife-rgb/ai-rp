// ═══════════════════════════════════════════
// storage.js — Firebase Cloud Sync & Local Storage CRUD
// Real-time synchronization across all devices
// ═══════════════════════════════════════════

const STORAGE_KEY  = 'rp_ai_roleplays';
const SETTINGS_KEY = 'rp_ai_settings';
const USERS_KEY    = 'rp_ai_users_db';
const SESSION_KEY  = 'rp_ai_current_session';

// ── Firebase Configuration ───────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCbGv78OTKhAbSTAsO-FF8VoAqJ6pPE64U",
  authDomain: "aii-r-fda63.firebaseapp.com",
  projectId: "aii-r-fda63",
  storageBucket: "aii-r-fda63.firebasestorage.app",
  messagingSenderId: "203768897564",
  appId: "1:203768897564:web:ab419e3ee22fc56e1c7fd9",
  measurementId: "G-5JXFEJ8YF8"
};

let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;

try {
  if (typeof firebase !== 'undefined') {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseAuth = firebase.auth();
    firestoreDb = firebase.firestore();
  }
} catch (e) {
  console.warn('[Firebase] Init error:', e);
}

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

  async signUp(email, password, name = '') {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass  = String(password || '').trim();
    const cleanName  = (name || cleanEmail.split('@')[0]).trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address');
    }
    if (!cleanPass || cleanPass.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // 1. Firebase Cloud Authentication
    if (firebaseAuth) {
      try {
        const cred = await firebaseAuth.createUserWithEmailAndPassword(cleanEmail, cleanPass);
        if (cleanName && cred.user) {
          await cred.user.updateProfile({ displayName: cleanName }).catch(() => {});
        }

        const sessionUser = {
          id: cred.user.uid,
          email: cred.user.email,
          name: cleanName
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
        this._claimUnassignedRoleplays(sessionUser.id);

        // Upload any pre-existing local roleplays to Firestore
        await this.uploadLocalToCloud(sessionUser.id);
        return sessionUser;
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          throw new Error('An account with this email already exists. Please sign in instead.');
        } else if (err.code === 'auth/weak-password') {
          throw new Error('Password should be at least 6 characters.');
        } else if (err.code === 'auth/invalid-email') {
          throw new Error('Invalid email address format.');
        }
        throw new Error(err.message || 'Firebase sign up failed.');
      }
    }

    // 2. Offline Local Storage Fallback
    const users = this.getUsers();
    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('An account with this email already exists.');
    }
    const user = {
      id: crypto.randomUUID(),
      email: cleanEmail,
      password: cleanPass,
      name: cleanName,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const sessionUser = { id: user.id, email: user.email, name: user.name };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    this._claimUnassignedRoleplays(user.id);
    return sessionUser;
  },

  async login(email, password) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass  = String(password || '').trim();

    if (!cleanEmail || !cleanPass) {
      throw new Error('Please enter both email and password.');
    }

    // 1. Firebase Cloud Authentication
    if (firebaseAuth) {
      try {
        const cred = await firebaseAuth.signInWithEmailAndPassword(cleanEmail, cleanPass);
        const sessionUser = {
          id: cred.user.uid,
          email: cred.user.email,
          name: cred.user.displayName || cred.user.email.split('@')[0]
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
        this._claimUnassignedRoleplays(sessionUser.id);

        // Synchronize cloud roleplays onto this device
        await this.syncFromCloud();
        return sessionUser;
      } catch (err) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          throw new Error('Incorrect email or password. Please try again.');
        } else if (err.code === 'auth/invalid-email') {
          throw new Error('Invalid email format.');
        }
        throw new Error(err.message || 'Sign in failed.');
      }
    }

    // 2. Offline Local Storage Fallback
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user || user.password !== cleanPass) {
      throw new Error('Incorrect email or password.');
    }
    const sessionUser = { id: user.id, email: user.email, name: user.name };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    this._claimUnassignedRoleplays(user.id);
    return sessionUser;
  },

  async logout() {
    localStorage.removeItem(SESSION_KEY);
    if (firebaseAuth) {
      try { await firebaseAuth.signOut(); } catch (_) {}
    }
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

  // ── Cloud Sync with Firebase Firestore ────
  async syncFromCloud() {
    const user = this.getCurrentUser();
    if (!user || !firestoreDb) return;

    try {
      const snap = await firestoreDb.collection('users').doc(user.id).collection('roleplays').get();
      if (!snap.empty) {
        const cloudRps = [];
        snap.forEach(doc => cloudRps.push(doc.data()));

        let localAll = [];
        try { localAll = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { localAll = []; }

        // Merge cloud stories into local storage
        cloudRps.forEach(cloudItem => {
          const idx = localAll.findIndex(l => l.id === cloudItem.id);
          if (idx >= 0) {
            const localTime = new Date(localAll[idx].updatedAt || 0).getTime();
            const cloudTime = new Date(cloudItem.updatedAt || 0).getTime();
            if (cloudTime >= localTime) {
              localAll[idx] = cloudItem;
            }
          } else {
            localAll.push(cloudItem);
          }
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(localAll));
      }
    } catch (err) {
      console.warn('[Firebase] Firestore sync error:', err);
    }
  },

  async uploadLocalToCloud(userId) {
    if (!firestoreDb || !userId) return;
    try {
      const rps = this.getAll();
      for (const rp of rps) {
        await firestoreDb.collection('users').doc(userId).collection('roleplays').doc(rp.id).set({
          ...rp,
          userId: userId,
          updatedAt: rp.updatedAt || new Date().toISOString()
        }, { merge: true });
      }
    } catch (err) {
      console.warn('[Firebase] Upload local to cloud failed:', err);
    }
  },

  // ── Roleplays Storage (Scoped per user) ──
  getAll() {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const user = this.getCurrentUser();
      if (!user) {
        return all.filter(r => !r.userId);
      }
      return all.filter(r => r.userId === user.id || !r.userId);
    } catch {
      return [];
    }
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

    // Async write to Firestore in cloud for multi-device sync
    if (firestoreDb && user) {
      firestoreDb.collection('users').doc(user.id).collection('roleplays').doc(rpData.id)
        .set(rpData, { merge: true })
        .catch(err => console.warn('[Firebase] Save to cloud failed:', err));
    }

    return roleplay;
  },

  delete(id) {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const filtered = all.filter(r => r.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (_) {}

    const user = this.getCurrentUser();
    if (firestoreDb && user) {
      firestoreDb.collection('users').doc(user.id).collection('roleplays').doc(id)
        .delete()
        .catch(err => console.warn('[Firebase] Delete from cloud failed:', err));
    }
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
    } catch {
      return {};
    }
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

// ── Real-Time Firebase Auth State Listener ─
if (firebaseAuth) {
  firebaseAuth.onAuthStateChanged(async (user) => {
    if (user) {
      const sessionUser = {
        id: user.uid,
        email: user.email,
        name: user.displayName || user.email.split('@')[0]
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      await window.Storage.syncFromCloud();
      window.UI?.renderUserWidget();
      if (window.App && window.App.currentView === 'list') {
        window.ListView?.render(p => window.App.navigate(p));
      }
    } else {
      localStorage.removeItem(SESSION_KEY);
      window.UI?.renderUserWidget();
    }
  });
}
