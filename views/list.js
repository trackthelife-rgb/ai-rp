// ═══════════════════════════════════════════
// views/list.js (no modules)
// ═══════════════════════════════════════════

window.ListView = {
  navigate: null,

  render(navigate) {
    this.navigate = navigate;
    const container  = document.getElementById('rp-grid');
    const emptyState = document.getElementById('rp-empty');
    const roleplays  = window.Storage.getAll();

    if (roleplays.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';
    container.innerHTML = roleplays.map(rp => this.cardHTML(rp)).join('');

    container.querySelectorAll('[data-card-id]').forEach(card => {
      card.addEventListener('click', () => navigate(`#play/${card.dataset.cardId}`));
    });
    container.querySelectorAll('.rp-card-play').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); navigate(`#play/${btn.dataset.id}`); });
    });
    container.querySelectorAll('.rp-card-edit').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); navigate(`#setup/${btn.dataset.id}`); });
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
  },

  cardHTML(rp) {
    const esc = window.UI.escHtml.bind(window.UI);
    const msgCount = (rp.messages || []).length;
    const chars = (rp.characters || []).slice(0, 3)
      .map(c => `<span class="rp-tag">👤 ${esc(c.name)}</span>`).join('');

    return `
    <div class="rp-card" data-card-id="${rp.id}">
      <div class="rp-card-title">${esc(rp.title || 'Untitled Story')}</div>
      <div class="rp-card-plot">${esc(rp.plot || 'No plot set.')}</div>
      <div class="rp-card-meta">
        ${chars}
        <span class="rp-tag">💬 ${msgCount}</span>
        <span class="rp-card-date">${window.UI.formatDate(rp.updatedAt)}</span>
      </div>
      <div class="rp-card-actions">
        <button class="btn btn-primary btn-sm rp-card-play" data-id="${rp.id}">▶ Continue</button>
        <button class="btn btn-ghost btn-sm rp-card-edit" data-id="${rp.id}">✏ Edit</button>
        <button class="btn btn-danger btn-sm rp-card-delete" data-id="${rp.id}" data-title="${esc(rp.title || 'Untitled')}">🗑</button>
      </div>
    </div>`;
  }
};
