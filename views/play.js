// ═══════════════════════════════════════════
// views/play.js (no modules)
// ═══════════════════════════════════════════

window.PlayView = {
  currentRp: null,
  isTyping: false,

  render(navigate, rpId) {
    const rp = window.Storage.get(rpId);
    if (!rp) { window.UI.toast('Roleplay not found', 'error'); navigate('#list'); return; }
    this.currentRp = rp;
    this.isTyping  = false;

    // Header
    document.getElementById('play-title').textContent = rp.title || 'Untitled Story';
    const strip = document.getElementById('play-chars-strip');
    strip.innerHTML = (rp.characters || []).map(c =>
      `<span class="play-char-badge">👤 ${window.UI.escHtml(c.name)} <span style="opacity:.6;font-size:.65rem">(${window.UI.escHtml(c.actressName)})</span></span>`
    ).join('');

    // Chat history
    const chatEl = document.getElementById('chat-messages');
    chatEl.innerHTML = '';
    if (!rp.messages || rp.messages.length === 0) {
      this.appendSystem(`The story begins... You are the male lead. ${(rp.characters || []).map(c => c.name).join(', ')} will respond to you.`);
    } else {
      rp.messages.forEach(m => this.renderMsg(m, false));
    }
    this.scrollBottom();

    // Drawer
    this.renderDrawer(rp);

    // Input — clone to remove old listeners
    const oldInput = document.getElementById('chat-input');
    const newInput = oldInput.cloneNode(true);
    newInput.value = '';
    newInput.style.height = 'auto';
    oldInput.parentNode.replaceChild(newInput, oldInput);

    const oldBtn = document.getElementById('send-btn');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);

    document.getElementById('chat-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
    });
    document.getElementById('chat-input').addEventListener('input', function() {
      window.UI.autoResize(this);
    });
    document.getElementById('send-btn').addEventListener('click', () => this.send());
  },

  cleanup() {
    this.currentRp = null;
    this.isTyping  = false;
  },

  // ── Render a single message ──────────────
  renderMsg(msg, animate = true) {
    if (msg.role === 'system') { this.appendSystem(msg.text, animate); return; }
    const chatEl = document.getElementById('chat-messages');
    const isUser = msg.role === 'user';
    const div    = document.createElement('div');
    div.className = `msg ${isUser ? 'msg-user' : 'msg-ai'}`;
    if (!animate) div.style.animation = 'none';

    const sender    = isUser ? 'You' : (msg.character || this.extractSpeaker(msg.text) || 'Character');
    const avatarTxt = isUser ? 'ME'  : window.UI.initials(sender);
    const time      = msg.timestamp ? window.UI.formatTime(msg.timestamp) : '';
    const actressTag = (!isUser && msg.actressName)
      ? `<span class="actress-tag" style="font-size:0.68rem;padding:0.12rem 0.5rem;margin-left:0.4rem;border-radius:99px;background:rgba(236,72,153,0.15);color:var(--accent);border:1px solid rgba(236,72,153,0.25)">🎬 ${window.UI.escHtml(msg.actressName)}</span>`
      : '';

    div.innerHTML = `
      <div class="msg-header">
        <div class="msg-avatar">${avatarTxt}</div>
        <span class="msg-sender">${window.UI.escHtml(sender)}</span>
        ${actressTag}
        <span class="msg-time">${time}</span>
      </div>
      <div class="msg-bubble">${this.formatText(msg.text)}</div>
      ${this.renderImages(msg.images)}
    `;

    div.querySelectorAll('.msg-img-item img').forEach(img => {
      img.addEventListener('click', () => window.UI.openLightbox(img.src, img.alt));
    });
    chatEl.appendChild(div);
  },

  renderImages(images) {
    if (!images || images.length === 0) return '';
    const esc = window.UI.escHtml.bind(window.UI);
    const items = images.flatMap(g =>
      (g.images || []).map(img => `
        <div class="msg-img-item">
          <img src="${esc(img.url)}" alt="${esc(g.actressName)} ${esc(g.bodyPart)}"
               title="Click to enlarge — ${esc(g.actressName)} (${esc(g.bodyPart)})"
               loading="lazy" onerror="this.parentElement.style.display='none'">
          <div class="msg-img-label">${esc(g.actressName)} · ${esc(g.bodyPart)}</div>
        </div>
      `)
    ).join('');

    if (!items) return '';
    return `<div class="msg-images">${items}</div>`;
  },

  appendSystem(text, animate = true) {
    const chatEl = document.getElementById('chat-messages');
    const el = document.createElement('div');
    el.className = 'msg msg-system';
    if (!animate) el.style.animation = 'none';
    el.innerHTML = `<div class="msg-bubble">✨ ${window.UI.escHtml(text)}</div>`;
    chatEl.appendChild(el);
  },

  showTyping() {
    const chatEl = document.getElementById('chat-messages');
    const el = document.createElement('div');
    el.id = 'typing-indicator';
    el.className = 'typing-indicator';
    el.innerHTML = `
      <div class="msg-avatar" style="width:24px;height:24px;font-size:.6rem">
        ${window.UI.initials(this.currentRp?.characters?.[0]?.name || '?')}
      </div>
      <div class="typing-dots">
        <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
      </div>
      <span style="font-size:.78rem;color:var(--text-faint)">writing…</span>
    `;
    chatEl.appendChild(el);
    this.scrollBottom();
  },

  hideTyping() {
    document.getElementById('typing-indicator')?.remove();
  },

  // ── Send message ─────────────────────────
  async send() {
    const input = document.getElementById('chat-input');
    const text  = input.value.trim();
    if (!text || this.isTyping) return;

    if (!window.Storage.hasApiKeys()) {
      window.UI.toast('Please enter your OpenRouter API key in ⚙ Settings', 'warning', 5000);
      window.UI.openModal('settings-modal');
      return;
    }

    this.isTyping = true;
    input.value   = '';
    input.style.height = 'auto';
    document.getElementById('send-btn').disabled = true;

    // Save + show user message
    const userMsg = { role: 'user', text, timestamp: new Date().toISOString() };
    window.Storage.addMessage(this.currentRp.id, userMsg);
    this.renderMsg(userMsg, true);
    this.scrollBottom();
    this.showTyping();

    // Kick off Pinterest search for each female character in the scene
    const pinterestPromise = window.ImageSearch.searchForMessage(text, this.currentRp.characters)
      .catch(e => {
        console.warn('Pinterest search error:', e);
        return [];
      });

    let liveBubble = null;
    let liveSender = null;
    let liveAvatar = null;

    const onChunk = (chunk, fullTextSoFar) => {
      this.hideTyping();
      if (!liveBubble) {
        const chatEl = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.id = 'streaming-ai-msg';
        div.className = 'msg msg-ai';
        div.innerHTML = `
          <div class="msg-header">
            <div class="msg-avatar" id="streaming-avatar">...</div>
            <span class="msg-sender" id="streaming-sender">Replying…</span>
            <span class="msg-time" style="color:var(--accent)">generating…</span>
          </div>
          <div class="msg-bubble" id="streaming-bubble"></div>
        `;
        chatEl.appendChild(div);
        liveBubble = div.querySelector('#streaming-bubble');
        liveSender = div.querySelector('#streaming-sender');
        liveAvatar = div.querySelector('#streaming-avatar');
      }

      const speaker = this.extractSpeaker(fullTextSoFar) || (this.currentRp?.characters?.[0]?.name || 'Characters');
      liveSender.textContent = speaker;
      liveAvatar.textContent = window.UI.initials(speaker);
      liveBubble.innerHTML   = this.formatText(fullTextSoFar);
      this.scrollBottom();
    };

    try {
      this.currentRp = window.Storage.get(this.currentRp.id);
      const aiText   = await window.AI.sendMessage(this.currentRp, text, onChunk);
      this.hideTyping();
      document.getElementById('streaming-ai-msg')?.remove();

      // Collect Pinterest images found for each character
      const allImageResults = await pinterestPromise;

      const femaleChars = (this.currentRp.characters || []).filter(c => (c.actressName || c.name) && c.gender !== 'male');
      const characterReplies = this.splitCharacterReplies(aiText, femaleChars);

      for (const rep of characterReplies) {
        // Map images belonging to this specific character/actress
        let repImages = allImageResults.filter(img =>
          img.character.toLowerCase() === rep.character.toLowerCase() ||
          img.actressName.toLowerCase() === rep.actressName.toLowerCase()
        );

        if (repImages.length === 0) {
          repImages = allImageResults;
        }

        const charMsg = {
          role: 'assistant',
          character: rep.character,
          actressName: rep.actressName,
          text: rep.text,
          images: repImages,
          timestamp: new Date().toISOString()
        };

        window.Storage.addMessage(this.currentRp.id, charMsg);
        this.renderMsg(charMsg, true);
      }

      this.currentRp = window.Storage.get(this.currentRp.id);

      if (allImageResults.length > 0) {
        const total = allImageResults.reduce((s, r) => s + (r.images?.length || 0), 0);
        window.UI.toast(`Found ${total} Pinterest photo${total !== 1 ? 's' : ''} 📸`, 'info', 2500);
      }

    } catch(err) {
      this.hideTyping();
      document.getElementById('streaming-ai-msg')?.remove();
      console.error(err);
      window.UI.toast(`Error: ${err.message}`, 'error', 7000);
    } finally {
      this.isTyping = false;
      document.getElementById('send-btn').disabled = false;
      document.getElementById('chat-input')?.focus();
      this.scrollBottom();
    }
  },

  // ── Edit characters drawer ───────────────
  renderDrawer(rp) {
    const container = document.getElementById('drawer-char-list');
    const esc = window.UI.escHtml.bind(window.UI);
    container.innerHTML = (rp.characters || []).map((c, i) => `
      <div class="char-card" style="margin-bottom:1rem">
        <div class="char-card-header">
          <div class="char-avatar">${window.UI.initials(c.name)}</div>
          <div>
            <h4>Character ${i+1}</h4>
            <div class="actress-tag" style="margin-top:.3rem">🎬 ${esc(c.actressName)}</div>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Character Name</label>
          <input type="text" id="drawer-name-${i}" value="${esc(c.name)}">
        </div>
        <div class="field-group">
          <label class="field-label">Actress Name</label>
          <input type="text" id="drawer-actress-${i}" value="${esc(c.actressName)}">
        </div>
        <div class="field-group" style="margin-bottom:0">
          <label class="field-label">Personality Arc</label>
          <textarea id="drawer-arc-${i}" rows="2">${esc(c.arc)}</textarea>
        </div>
      </div>
    `).join('');

    const saveBtn = document.getElementById('drawer-save-btn');
    const newSave = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSave, saveBtn);
    document.getElementById('drawer-save-btn').onclick = () => {
      const updated = (rp.characters || []).map((c, i) => ({
        ...c,
        name:        document.getElementById(`drawer-name-${i}`)?.value.trim() || c.name,
        actressName: document.getElementById(`drawer-actress-${i}`)?.value.trim() || c.actressName,
        arc:         document.getElementById(`drawer-arc-${i}`)?.value.trim() || c.arc,
      }));
      window.Storage.updateCharacters(rp.id, updated);
      this.currentRp = window.Storage.get(rp.id);

      const strip = document.getElementById('play-chars-strip');
      strip.innerHTML = updated.map(c =>
        `<span class="play-char-badge">👤 ${window.UI.escHtml(c.name)} <span style="opacity:.6;font-size:.65rem">(${window.UI.escHtml(c.actressName)})</span></span>`
      ).join('');

      window.UI.closeDrawer();
      window.UI.toast('Characters updated! ✅', 'success');
    };
  },

  // ── Helpers ──────────────────────────────
  splitCharacterReplies(aiText, femaleChars) {
    if (!femaleChars || femaleChars.length === 0) {
      return [{ character: 'Character', actressName: '', text: aiText }];
    }
    if (femaleChars.length === 1) {
      return [{
        character: femaleChars[0].name,
        actressName: femaleChars[0].actressName,
        text: aiText
      }];
    }

    const escapedNames = femaleChars.map(c => c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const namesRegexStr = escapedNames.join('|');
    // Match headers like **Name:** or **Name**: or Name: at line start
    const headerRegex = new RegExp(`(?:^|\\n)\\s*(?:\\*\\*)?(${namesRegexStr})(?:\\*\\*:|:\\*\\*|\\*\\*|:)\\s*`, 'gi');

    const splitPoints = [];
    let match;
    while ((match = headerRegex.exec(aiText)) !== null) {
      splitPoints.push({
        name: match[1],
        index: match.index,
        headerLength: match[0].length
      });
    }

    if (splitPoints.length >= 2) {
      const parts = [];
      for (let i = 0; i < splitPoints.length; i++) {
        const cur = splitPoints[i];
        const next = splitPoints[i + 1];
        const start = cur.index + cur.headerLength;
        const end = next ? next.index : aiText.length;
        const body = aiText.substring(start, end).trim();
        const charObj = femaleChars.find(c => c.name.toLowerCase() === cur.name.toLowerCase()) || { name: cur.name, actressName: '' };
        if (body) {
          parts.push({
            character: charObj.name,
            actressName: charObj.actressName,
            text: `**${charObj.name}:** ${body}`
          });
        }
      }
      if (parts.length > 0) return parts;
    }

    // Fallback if not multi-split
    const speaker = this.extractSpeaker(aiText) || femaleChars[0].name;
    const charObj = femaleChars.find(c => c.name.toLowerCase() === speaker.toLowerCase()) || femaleChars[0];
    return [{
      character: charObj.name,
      actressName: charObj.actressName,
      text: aiText
    }];
  },

  scrollBottom() {
    const el = document.getElementById('chat-messages');
    requestAnimationFrame(() => { if(el) el.scrollTop = el.scrollHeight; });
  },

  extractSpeaker(text) {
    const m = text?.match(/^\*\*([^*]+)\*\*:/);
    return m ? m[1] : null;
  },

  formatText(text) {
    if (!text) return '';
    let html = window.UI.escHtml(text);
    // Bold **Name:** speaker
    html = html.replace(/\*\*([^*]+)\*\*:/g, '<strong style="color:var(--accent)">$1:</strong>');
    // *italic actions*
    html = html.replace(/\*([^*\n]+)\*/g, '<em style="color:var(--text-muted)">$1</em>');
    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p style="margin-top:.75rem">').replace(/\n/g, '<br>');
    return `<p>${html}</p>`;
  }
};
