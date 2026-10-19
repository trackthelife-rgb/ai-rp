// ═══════════════════════════════════════════
// views/setup.js (no modules)
// ═══════════════════════════════════════════

window.SetupView = {
  MAX_CHARS: 8,
  currentStep: 1,
  charCount: 1,
  editingRpId: null,
  navigate: null,

  render(navigate, rpId) {
    this.navigate    = navigate;
    this.editingRpId = rpId || null;
    this.currentStep = 1;
    this.charCount   = 1;

    const existing = rpId ? window.Storage.get(rpId) : null;
    document.getElementById('setup-title').textContent = existing ? 'Edit Roleplay' : 'New Roleplay';

    if (existing) {
      this.charCount = existing.characters?.length || 1;
      document.getElementById('input-plot').value     = existing.plot || '';
      document.getElementById('input-rp-title').value = existing.title || '';
    } else {
      document.getElementById('input-plot').value     = '';
      document.getElementById('input-rp-title').value = '';
      this.charCount = 1;
    }

    this.updateCountDisplay();
    this.renderCharCards(existing?.characters);
    this.renderReview();
    this.showStep(1);
    this.bindEvents(navigate, existing);
  },

  showStep(step) {
    this.currentStep = step;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.querySelectorAll('.setup-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.setup-step').forEach((s, i) => {
      s.classList.remove('active', 'done');
      if (i + 1 === step) s.classList.add('active');
      if (i + 1 < step)  s.classList.add('done');
    });
    document.getElementById(`setup-panel-${step}`)?.classList.add('active');
    this.updateNavButtons();
  },

  updateNavButtons() {
    const prevBtn   = document.getElementById('setup-prev');
    const nextBtn   = document.getElementById('setup-next');
    const createBtn = document.getElementById('setup-create');
    prevBtn.style.display   = this.currentStep > 1 ? 'inline-flex' : 'none';
    nextBtn.style.display   = this.currentStep < 3 ? 'inline-flex' : 'none';
    createBtn.style.display = this.currentStep === 3 ? 'inline-flex' : 'none';
  },

  updateCountDisplay() {
    document.getElementById('char-count-display').textContent = this.charCount;
    document.getElementById('char-count-decrement').disabled = this.charCount <= 1;
    document.getElementById('char-count-increment').disabled = this.charCount >= this.MAX_CHARS;
  },

  renderCharCards(existingChars) {
    const container = document.getElementById('char-cards-container');
    container.innerHTML = '';
    const esc = window.UI.escHtml.bind(window.UI);

    for (let i = 0; i < this.charCount; i++) {
      const c = existingChars?.[i];
      const card = document.createElement('div');
      card.className = 'char-card';
      card.dataset.index = i;
      card.innerHTML = `
        <div class="char-card-header">
          <div class="char-avatar" id="char-avatar-${i}">${c ? window.UI.initials(c.name) : (i+1)}</div>
          <div><h4>Character ${i+1}</h4><div class="text-muted" style="font-size:.8rem">Female character</div></div>
        </div>
        <div class="field-group">
          <label class="field-label">Character Name</label>
          <input type="text" id="char-name-${i}" placeholder="e.g. Priya" value="${esc(c?.name || '')}">
        </div>
        <div class="field-group">
          <label class="field-label">Actress Name (for Pinterest image search)</label>
          <input type="text" id="char-actress-${i}" placeholder="e.g. Deepika Padukone" value="${esc(c?.actressName || '')}">
          <div class="actress-suggestions">
            <span style="font-size:0.7rem;color:var(--text-faint);margin-right:0.2rem">Quick Pick:</span>
            ${['Keerthy Suresh', 'Samantha', 'Nayanthara', 'Sreeleela', 'Rashmika', 'Pooja Hegde', 'Deepika Padukone', 'Tamannaah'].map(name => `
              <button type="button" class="actress-chip" data-name="${name}" data-idx="${i}">+ ${name}</button>
            `).join('')}
          </div>
        </div>
        <div class="field-group" style="margin-bottom:0">
          <label class="field-label">Personality / Character Arc</label>
          <textarea id="char-arc-${i}" rows="3" placeholder="e.g. Strong, mysterious queen who hides her vulnerability...">${esc(c?.arc || '')}</textarea>
        </div>
      `;
      container.appendChild(card);

      card.querySelectorAll('.actress-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const actressInput = card.querySelector(`#char-actress-${btn.dataset.idx}`);
          if (actressInput) {
            actressInput.value = btn.dataset.name;
            actressInput.focus();
            window.UI.toast(`Selected ${btn.dataset.name} 🎬`, 'info', 1800);
          }
        });
      });

      const nameInput = card.querySelector(`#char-name-${i}`);
      const avatar    = card.querySelector(`#char-avatar-${i}`);
      nameInput.addEventListener('input', () => {
        avatar.textContent = nameInput.value.trim() ? window.UI.initials(nameInput.value) : (i+1);
      });
    }
  },

  collectCharacters() {
    const chars = [];
    for (let i = 0; i < this.charCount; i++) {
      chars.push({
        id: `c${i}`, gender: 'female',
        name:        document.getElementById(`char-name-${i}`)?.value.trim() || `Character ${i+1}`,
        actressName: document.getElementById(`char-actress-${i}`)?.value.trim() || '',
        arc:         document.getElementById(`char-arc-${i}`)?.value.trim() || '',
      });
    }
    return chars;
  },

  renderReview() {
    const esc = window.UI.escHtml.bind(window.UI);
    const plot  = document.getElementById('input-plot')?.value.trim() || '';
    const title = document.getElementById('input-rp-title')?.value.trim() || '';
    const chars = this.collectCharacters();

    document.getElementById('review-title').textContent = title || '(No title)';
    document.getElementById('review-plot').textContent  = plot || '(No plot)';
    document.getElementById('review-chars').innerHTML   = chars.map(c => `
      <div class="review-char">
        <div class="char-avatar">${window.UI.initials(c.name)}</div>
        <div class="review-char-info">
          <strong>${esc(c.name)}</strong>
          <span>${esc(c.arc || 'No arc defined')}</span>
        </div>
        <span class="actress-tag">🎬 ${esc(c.actressName || 'No actress')}</span>
      </div>
    `).join('');
  },

  validateStep(step) {
    if (step === 1) {
      const title = document.getElementById('input-rp-title')?.value.trim();
      const plot  = document.getElementById('input-plot')?.value.trim();
      if (!title) { window.UI.toast('Please enter a title for the roleplay', 'error'); return false; }
      if (!plot || plot.length < 20) { window.UI.toast('Please write a more detailed plot (min 20 characters)', 'error'); return false; }
    }
    if (step === 2) {
      for (let i = 0; i < this.charCount; i++) {
        const name    = document.getElementById(`char-name-${i}`)?.value.trim();
        const actress = document.getElementById(`char-actress-${i}`)?.value.trim();
        if (!name)    { window.UI.toast(`Enter a name for Character ${i+1}`, 'error'); return false; }
        if (!actress) { window.UI.toast(`Enter an actress name for Character ${i+1}`, 'error'); return false; }
      }
    }
    return true;
  },

  bindEvents(navigate, existing) {
    // Replace buttons to remove old listeners
    const replaceBtn = id => {
      const old = document.getElementById(id);
      const clone = old.cloneNode(true);
      old.parentNode.replaceChild(clone, old);
      return clone;
    };

    replaceBtn('char-count-decrement').onclick = () => {
      if (this.charCount > 1) { this.charCount--; this.updateCountDisplay(); this.renderCharCards(); }
    };
    replaceBtn('char-count-increment').onclick = () => {
      if (this.charCount < this.MAX_CHARS) { this.charCount++; this.updateCountDisplay(); this.renderCharCards(); }
    };
    replaceBtn('setup-prev').onclick = () => this.showStep(this.currentStep - 1);
    replaceBtn('setup-next').onclick = () => {
      if (!this.validateStep(this.currentStep)) return;
      if (this.currentStep === 2) this.renderReview();
      this.showStep(this.currentStep + 1);
    };
    replaceBtn('setup-create').onclick = () => {
      if (!this.validateStep(this.currentStep)) return;
      const id = this.editingRpId || crypto.randomUUID();
      const rp = {
        id,
        title:      document.getElementById('input-rp-title').value.trim(),
        plot:       document.getElementById('input-plot').value.trim(),
        characters: this.collectCharacters(),
        messages:   existing?.messages || [],
      };
      window.Storage.save(rp);
      window.UI.toast(this.editingRpId ? 'Roleplay updated!' : 'Roleplay created! 🎭', 'success');
      navigate(`#play/${id}`);
    };
  }
};
