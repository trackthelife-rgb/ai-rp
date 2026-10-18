// ═══════════════════════════════════════════
// ui.js — DOM helpers (no modules)
// ═══════════════════════════════════════════

window.UI = {
  toast(msg, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  },

  openLightbox(src, label = '') {
    const lb = document.getElementById('lightbox');
    if (!lb) return;
    lb.querySelector('img').src = src;
    lb.querySelector('.lightbox-label').textContent = label;
    lb.classList.add('open');
  },

  openDrawer() {
    document.getElementById('edit-drawer-overlay')?.classList.add('open');
    document.getElementById('edit-drawer')?.classList.add('open');
  },

  closeDrawer() {
    document.getElementById('edit-drawer-overlay')?.classList.remove('open');
    document.getElementById('edit-drawer')?.classList.remove('open');
  },

  autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 180) + 'px';
  },

  formatDate(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  formatTime(iso) {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  },

  initials(name) {
    return String(name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  },

  escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
