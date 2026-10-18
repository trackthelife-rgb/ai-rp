// ═══════════════════════════════════════════
// app.js — SPA Router (no ES modules)
// ═══════════════════════════════════════════

window.App = {
  currentView: null,

  navigate(path) {
    location.hash = path;
  },

  parseRoute() {
    const hash  = location.hash || '#home';
    const parts = hash.slice(1).split('/');
    return { view: parts[0] || 'home', id: parts[1] };
  },

  handleRoute() {
    const { view, id } = this.parseRoute();

    if (this.currentView === 'play' && view !== 'play') {
      window.PlayView.cleanup();
    }

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    this.currentView = view;

    // Topbar back button
    const backBtn = document.getElementById('btn-back');
    if (backBtn) backBtn.style.display = (view !== 'home') ? 'inline-flex' : 'none';

    switch (view) {
      case 'home':
      case '':
        window.HomeView.render();
        document.getElementById('view-home').classList.add('active');
        break;
      case 'list':
        window.ListView.render(path => this.navigate(path));
        document.getElementById('view-list').classList.add('active');
        break;
      case 'setup':
        window.SetupView.render(path => this.navigate(path), id);
        document.getElementById('view-setup').classList.add('active');
        break;
      case 'play':
        if (!id) { this.navigate('#list'); return; }
        window.PlayView.render(path => this.navigate(path), id);
        document.getElementById('view-play').classList.add('active');
        break;
      default:
        this.navigate('#home');
    }
  },

  initSettings() {
    const switchProvider = (provider) => {
      document.getElementById('input-ai-provider').value = provider;
      document.querySelectorAll('.provider-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.provider === provider);
      });
      document.getElementById('panel-openrouter').style.display = (provider === 'openrouter') ? 'block' : 'none';
      document.getElementById('panel-ollama').style.display     = (provider === 'ollama') ? 'block' : 'none';
    };

    document.querySelectorAll('.provider-tab').forEach(tab => {
      tab.addEventListener('click', () => switchProvider(tab.dataset.provider));
    });

    // Eye toggle for API key
    document.getElementById('btn-toggle-key')?.addEventListener('click', () => {
      const input = document.getElementById('input-openrouter-key');
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      document.getElementById('btn-toggle-key').textContent = isPass ? '🔒' : '👁';
    });

    // OpenRouter custom model toggle
    const orSelect = document.getElementById('input-openrouter-model');
    orSelect?.addEventListener('change', () => {
      document.getElementById('group-openrouter-custom').style.display = (orSelect.value === 'custom') ? 'block' : 'none';
    });

    const populateOllamaModels = async (selectedModel) => {
      const url = document.getElementById('input-ollama-url').value.trim() || 'http://localhost:11434';
      const select = document.getElementById('input-ollama-model');
      try {
        const result = await window.AI.ping(url);
        if (result.ok && result.models.length > 0) {
          select.innerHTML = '';
          result.models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            let label = m;
            if (m.includes('dolphin-phi'))     label = `${m} ⚡ (Ultra Fast — Recommended on CPU)`;
            else if (m.includes('dolphin-mistral')) label = `${m} ⭐ (Uncensored 7B)`;
            else if (m.includes('llama'))       label = `${m} (Llama)`;
            opt.textContent = label;
            select.appendChild(opt);
          });
          const customOpt = document.createElement('option');
          customOpt.value = 'custom';
          customOpt.textContent = 'custom (type below)';
          select.appendChild(customOpt);

          const target = selectedModel || 'dolphin-phi';
          const match = Array.from(select.options).find(o => o.value === target || o.value.startsWith(target));
          if (match) select.value = match.value;
        }
      } catch (_) {}
    };

    const fillFields = () => {
      const s = window.Storage.getSettings();
      switchProvider(s.aiProvider || 'openrouter');

      // OpenRouter fields
      document.getElementById('input-openrouter-key').value = s.openrouterKey || '';
      let orModel = s.openrouterModel || 'gryphe/mythomax-l2-13b';
      if (orModel === 'nousresearch/hermes-3-llama-3.1-8b') orModel = 'gryphe/mythomax-l2-13b';
      const orOption = Array.from(orSelect.options).find(o => o.value === orModel);
      if (orOption) {
        orSelect.value = orModel;
        document.getElementById('group-openrouter-custom').style.display = 'none';
      } else {
        orSelect.value = 'custom';
        document.getElementById('input-openrouter-model-custom').value = orModel;
        document.getElementById('group-openrouter-custom').style.display = 'block';
      }

      // Ollama fields
      const currentModel = s.ollamaModel || 'dolphin-phi';
      document.getElementById('input-ollama-url').value   = s.ollamaUrl   || 'http://localhost:11434';
      document.getElementById('input-ollama-model').value = currentModel;
      populateOllamaModels(currentModel);

      // Images
      document.getElementById('input-cse-key').value      = s.cseKey      || '';
      document.getElementById('input-cse-id').value       = s.cseId       || '';
    };

    document.getElementById('btn-settings').addEventListener('click', () => {
      fillFields();
      window.UI.openModal('settings-modal');
    });

    // Test OpenRouter Key button
    document.getElementById('btn-test-openrouter').addEventListener('click', async () => {
      const btn = document.getElementById('btn-test-openrouter');
      const key = document.getElementById('input-openrouter-key').value.trim();
      if (!key) {
        window.UI.toast('Please enter your OpenRouter API key first', 'warning');
        document.getElementById('input-openrouter-key').focus();
        return;
      }
      btn.textContent = '⏳ Verifying…';
      btn.disabled = true;
      const res = await window.AI.pingOpenRouter(key);
      btn.disabled = false;
      if (res.ok) {
        const usage = res.data?.usage != null ? ` · Used: $${Number(res.data.usage).toFixed(2)}` : '';
        const limit = res.data?.limit != null ? ` · Limit: $${Number(res.data.limit).toFixed(2)}` : '';
        window.UI.toast(`✅ OpenRouter API key is active!${usage}${limit}`, 'success', 5000);
        btn.textContent = '✅ Key Valid';
      } else {
        window.UI.toast(`❌ Invalid OpenRouter Key: ${res.error}`, 'error', 6000);
        btn.textContent = '❌ Invalid Key';
      }
      setTimeout(() => { btn.textContent = '🔌 Test API Key & Credits'; }, 3000);
    });

    // Test Ollama button
    document.getElementById('btn-test-ollama').addEventListener('click', async () => {
      const btn = document.getElementById('btn-test-ollama');
      const url = document.getElementById('input-ollama-url').value.trim() || 'http://localhost:11434';
      btn.textContent = '⏳ Testing…';
      btn.disabled = true;
      const result = await window.AI.ping(url);
      btn.disabled = false;
      if (result.ok) {
        await populateOllamaModels(document.getElementById('input-ollama-model').value);
        window.UI.toast(`✅ Ollama connected! Models: ${result.models.join(', ')}`, 'success', 5000);
        btn.textContent = '✅ Connected';
      } else {
        window.UI.toast('❌ Cannot reach Ollama. Make sure Ollama is running', 'error', 6000);
        btn.textContent = '❌ Not found';
      }
      setTimeout(() => { btn.textContent = '🔌 Test Ollama Connection'; }, 3000);
    });

    // Form submit
    document.getElementById('settings-form').addEventListener('submit', e => {
      e.preventDefault();
      const provider = document.getElementById('input-ai-provider').value;

      // OpenRouter Model resolution
      const orSelectVal = orSelect.value;
      const orCustomVal = document.getElementById('input-openrouter-model-custom').value.trim();
      let finalOrModel = (orSelectVal === 'custom' && orCustomVal) ? orCustomVal : orSelectVal;
      if (finalOrModel === 'nousresearch/hermes-3-llama-3.1-8b' || !finalOrModel) finalOrModel = 'gryphe/mythomax-l2-13b';

      // Ollama Model resolution
      const olSelectVal = document.getElementById('input-ollama-model').value.trim();
      const olCustomVal = document.getElementById('input-ollama-model-custom').value.trim();
      const finalOlModel = (olSelectVal === 'custom' && olCustomVal) ? olCustomVal : (olSelectVal || 'dolphin-phi');

      window.Storage.saveSettings({
        aiProvider:      provider,
        openrouterKey:   document.getElementById('input-openrouter-key').value.trim(),
        openrouterModel: finalOrModel,
        ollamaUrl:       document.getElementById('input-ollama-url').value.trim() || 'http://localhost:11434',
        ollamaModel:     finalOlModel,
        cseKey:          document.getElementById('input-cse-key').value.trim(),
        cseId:           document.getElementById('input-cse-id').value.trim(),
      });

      window.UI.closeModal('settings-modal');
      const activeLabel = (provider === 'openrouter') ? `OpenRouter (${finalOrModel})` : `Ollama (${finalOlModel})`;
      window.UI.toast(`Settings saved! Active: ${activeLabel} 🚀`, 'success');
    });

    document.getElementById('settings-modal').addEventListener('click', e => {
      if (e.target === document.getElementById('settings-modal')) window.UI.closeModal('settings-modal');
    });
  },

  init() {
    // Topbar
    document.getElementById('btn-back').addEventListener('click', () => history.back());
    document.getElementById('topbar-logo').addEventListener('click', () => this.navigate('#home'));

    // Home buttons
    document.getElementById('btn-new-rp').addEventListener('click', () => this.navigate('#setup'));
    document.getElementById('btn-continue-rp').addEventListener('click', () => this.navigate('#list'));

    // Lightbox close
    document.getElementById('lightbox').addEventListener('click', () => {
      document.getElementById('lightbox').classList.remove('open');
    });

    // Drawer overlay
    document.getElementById('edit-drawer-overlay').addEventListener('click', () => window.UI.closeDrawer());

    // List page "new" button (re-navigates)
    document.getElementById('btn-list-new')?.addEventListener('click', () => this.navigate('#setup'));

    this.initSettings();

    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  }
};

document.addEventListener('DOMContentLoaded', () => window.App.init());
