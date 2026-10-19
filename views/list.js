// ═══════════════════════════════════════════
// views/list.js — Saved Roleplays with Search Filter
// ═══════════════════════════════════════════

window.ListView = {
  navigate: null,

  render(navigate) {
    this.navigate = navigate;
    const container   = document.getElementById('rp-grid');
    const emptyState  = document.getElementById('rp-empty');
    const searchInput = document.getElementById('input-search-stories');
    const roleplays   = window.Storage.getAll();

    const renderFiltered = (filterText = '') => {
      const q = filterText.toLowerCase().trim();
      const filtered = roleplays.filter(rp => {
        if (!q) return true;
        const inTitle = (rp.title || '').toLowerCase().includes(q);
        const inPlot  = (rp.plot || '').toLowerCase().includes(q);
        const inChars = (rp.characters || []).some(c =>
          (c.name || '').toLowerCase().includes(q) || (c.actressName || '').toLowerCase().includes(q)
        );
        return inTitle || inPlot || inChars;
      });

      if (filtered.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        if (roleplays.length > 0) {
          emptyState.querySelector('h3').textContent = 'No matching stories';
          emptyState.querySelector('p').textContent = `No stories found matching "${filterText}". Try another search.`;
        } else {
          emptyState.querySelector('h3').textContent = 'No roleplays yet';
          emptyState.querySelector('p').textContent = 'Create your first story to get started.';
        }
        return;
      }

      emptyState.style.display = 'none';
      container.innerHTML = filtered.map(rp => this.cardHTML(rp)).join('');

      container.querySelectorAll('[data-card-id]').forEach(card => {
        card.addEventListener('click', () => {
          window.scrollTo(0, 0);
          navigate(`#play/${card.dataset.cardId}`);
        });
      });
      container.querySelectorAll('.rp-card-play').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          window.scrollTo(0, 0);
          navigate(`#play/${btn.dataset.id}`);
        });
      });
      container.querySelectorAll('.rp-card-edit').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          window.scrollTo(0, 0);
          navigate(`#setup/${btn.dataset.id}`);
        });
      });
      container.querySelectorAll('.rp-card-delete').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          if (confirm(`Delete "${btn.dataset.title}"? This cannot be undone.`)) {
            window.Storage.delete(btn.dataset.id);
            window.UI.toast('Roleplay deleted', 'success');
            this.render(navigate);
          }
        });
      });
    };

    if (searchInput) {
      searchInput.value = '';
      searchInput.oninput = (e) => renderFiltered(e.target.value);
    }

    renderFiltered('');
  },

  cardHTML(rp) {
    const esc = window.UI.escHtml.bind(window.UI);
    const msgCount = (rp.messages || []).length;
    const chars = (rp.characters || []).slice(0, 3)
      .map(c => `<span class="rp-tag">👤 ${esc(c.name)} <small style="opacity:0.7">(${esc(c.actressName)})</small></span>`).join('');

    return `
    <div class="rp-card" data-card-id="${rp.id}">
      <div class="rp-card-header-bar">
        <div class="rp-card-title">${esc(rp.title || 'Untitled Story')}</div>
        <span class="rp-card-date">${window.UI.formatDate(rp.updatedAt)}</span>
      </div>
      <div class="rp-card-plot">${esc(rp.plot || 'No plot set.')}</div>
      <div class="rp-card-meta">
        ${chars}
        <span class="rp-tag rp-tag-count">💬 ${msgCount} msgs</span>
      </div>
      <div class="rp-card-actions">
        <button class="btn btn-primary btn-sm rp-card-play" data-id="${rp.id}">▶ Continue Story</button>
        <button class="btn btn-ghost btn-sm rp-card-edit" data-id="${rp.id}">✏ Edit</button>
        <button class="btn btn-danger btn-sm rp-card-delete" data-id="${rp.id}" data-title="${esc(rp.title || 'Untitled')}" title="Delete">🗑</button>
      </div>
    </div>`;
  }
};
