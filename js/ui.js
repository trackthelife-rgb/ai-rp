// ═══════════════════════════════════════════
// ui.js — DOM helpers & User Auth UI (no modules)
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

  // ── Lightbox Gallery with Left / Right Navigation ──
  lightboxItems: [],
  lightboxIndex: 0,
  _lightboxBound: false,

  openLightbox(itemsOrSrc, labelOrIndex = 0) {
    const lb = document.getElementById('lightbox');
    if (!lb) return;
    this.initLightbox();

    if (Array.isArray(itemsOrSrc)) {
      this.lightboxItems = itemsOrSrc;
      this.lightboxIndex = typeof labelOrIndex === 'number' ? labelOrIndex : 0;
    } else {
      // If single src passed, collect all images in the active conversation
      const allImgs = Array.from(document.querySelectorAll('.msg-img-item')).map(item => ({
        url: item.dataset.fullUrl || item.querySelector('img')?.src || '',
        label: item.dataset.label || item.querySelector('img')?.alt || ''
      })).filter(i => !!i.url);

      const targetUrl = (itemsOrSrc || '').replace('/236x/', '/736x/').replace('/474x/', '/736x/');
      const idx = allImgs.findIndex(i => i.url === targetUrl || i.url === itemsOrSrc);

      if (allImgs.length > 0 && idx !== -1) {
        this.lightboxItems = allImgs;
        this.lightboxIndex = idx;
      } else {
        this.lightboxItems = [{ url: targetUrl || itemsOrSrc, label: typeof labelOrIndex === 'string' ? labelOrIndex : '' }];
        this.lightboxIndex = 0;
      }
    }

    this.updateLightbox();
    lb.classList.add('open');
  },

  updateLightbox() {
    const lb = document.getElementById('lightbox');
    if (!lb || this.lightboxItems.length === 0) return;

    if (this.lightboxIndex < 0) this.lightboxIndex = 0;
    if (this.lightboxIndex >= this.lightboxItems.length) this.lightboxIndex = this.lightboxItems.length - 1;

    const item = this.lightboxItems[this.lightboxIndex];
    const imgEl = document.getElementById('lightbox-img');
    const labelEl = document.getElementById('lightbox-label');
    const counterEl = document.getElementById('lightbox-counter');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');

    if (imgEl && item) {
      // Force high-res 736px if pinimg
      const hd = (item.url || '').replace('/236x/', '/736x/').replace('/474x/', '/736x/');
      imgEl.src = hd;
      imgEl.alt = item.label || 'Roleplay Image Preview';
    }
    if (labelEl) labelEl.textContent = item?.label || '';
    if (counterEl) {
      counterEl.textContent = `${this.lightboxIndex + 1} / ${this.lightboxItems.length}`;
      counterEl.style.display = this.lightboxItems.length > 1 ? 'inline-block' : 'none';
    }

    if (prevBtn) prevBtn.style.display = this.lightboxItems.length > 1 ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = this.lightboxItems.length > 1 ? 'flex' : 'none';
  },

  lightboxNext() {
    if (this.lightboxItems.length <= 1) return;
    this.lightboxIndex = (this.lightboxIndex + 1) % this.lightboxItems.length;
    this.updateLightbox();
  },

  lightboxPrev() {
    if (this.lightboxItems.length <= 1) return;
    this.lightboxIndex = (this.lightboxIndex - 1 + this.lightboxItems.length) % this.lightboxItems.length;
    this.updateLightbox();
  },

  closeLightbox() {
    const lb = document.getElementById('lightbox');
    if (lb) lb.classList.remove('open');
  },

  initLightbox() {
    if (this._lightboxBound) return;
    this._lightboxBound = true;

    const lb = document.getElementById('lightbox');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    const closeBtn = document.getElementById('lightbox-close');

    prevBtn?.addEventListener('click', (e) => { e.stopPropagation(); this.lightboxPrev(); });
    nextBtn?.addEventListener('click', (e) => { e.stopPropagation(); this.lightboxNext(); });
    closeBtn?.addEventListener('click', (e) => { e.stopPropagation(); this.closeLightbox(); });

    lb?.addEventListener('click', (e) => {
      // Click outside content box closes lightbox
      if (e.target === lb || e.target.classList.contains('lightbox-content')) {
        this.closeLightbox();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (!lb || !lb.classList.contains('open')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); this.lightboxNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); this.lightboxPrev(); }
      else if (e.key === 'Escape') { e.preventDefault(); this.closeLightbox(); }
    });
  },

  openDrawer() {
    document.getElementById('edit-drawer-overlay')?.classList.add('open');
    document.getElementById('edit-drawer')?.classList.add('open');
  },

  closeDrawer() {
    document.getElementById('edit-drawer-overlay')?.classList.remove('open');
    document.getElementById('edit-drawer')?.classList.remove('open');
  },

  // ── Auth Modal & User Widget ─────────────
  renderUserWidget() {
    const widget = document.getElementById('user-widget');
    if (!widget) return;
    const user = window.Storage.getCurrentUser();

    if (user) {
      widget.innerHTML = `
        <div class="user-pill" title="${this.escHtml(user.email)}">
          <div class="user-pill-avatar">${this.initials(user.name || user.email)}</div>
          <span class="user-pill-name">${this.escHtml(user.name || user.email.split('@')[0])}</span>
          <button type="button" class="btn-logout" id="btn-user-logout" title="Sign Out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      `;
      document.getElementById('btn-user-logout')?.addEventListener('click', (e) => {
        e.stopPropagation();
        window.Storage.logout();
        this.renderUserWidget();
        this.toast('Signed out successfully 👋', 'info');
        window.App.handleRoute();
      });
    } else {
      widget.innerHTML = `
        <button class="btn btn-primary btn-sm btn-signin-top" id="btn-top-signin">
          🔑 Sign In
        </button>
      `;
      document.getElementById('btn-top-signin')?.addEventListener('click', () => {
        this.openAuthModal('login');
      });
    }
  },

  openAuthModal(mode = 'login') {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    this.setAuthMode(mode);
    this.openModal('auth-modal');
    setTimeout(() => {
      document.getElementById('auth-input-email')?.focus();
    }, 150);
  },

  setAuthMode(mode) {
    const isSignup = (mode === 'signup');
    document.getElementById('auth-tab-login')?.classList.toggle('active', !isSignup);
    document.getElementById('auth-tab-signup')?.classList.toggle('active', isSignup);
    document.getElementById('group-auth-name').style.display = isSignup ? 'block' : 'none';
    document.getElementById('auth-modal-title').textContent = isSignup ? 'Create Account' : 'Sign In to Roleplay AI';
    document.getElementById('btn-auth-submit').textContent = isSignup ? 'Create Account & Continue →' : 'Sign In →';
    document.getElementById('auth-switch-note').innerHTML = isSignup
      ? `Already have an account? <a href="javascript:void(0)" id="link-switch-auth">Sign in here</a>`
      : `Don't have an account yet? <a href="javascript:void(0)" id="link-switch-auth">Sign up for free</a>`;

    document.getElementById('link-switch-auth')?.addEventListener('click', () => {
      this.setAuthMode(isSignup ? 'login' : 'signup');
    });
  },

  autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 180) + 'px';
  },

  formatDate(iso) {
    if (!iso) return 'just now';
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
