// ═══════════════════════════════════════════
// ai.js — Multi-provider AI (OpenRouter Cloud & Ollama Local)
// Supports real-time token streaming for all providers
// ═══════════════════════════════════════════

window.AI = {
  buildSystemPrompt(rp) {
    const femaleChars = (rp.characters || []).filter(c => (c.actressName || c.name) && c.gender !== 'male');
    const isMultiChar = femaleChars.length > 1;
    const charLines = femaleChars
      .map(c => `• ${c.name} (inspired by actress ${c.actressName}): ${c.arc}`)
      .join('\n');

    if (isMultiChar) {
      const namesList = femaleChars.map(c => c.name).join(' and ');
      const exampleBlocks = femaleChars.map((c, i) =>
        `**${c.name}:** *Actions and physical reactions in italics...* "Dialogue in quotes..."`
      ).join('\n\n');

      return `You are a talented romantic and adult roleplay writer. You are roleplaying as the female characters in this story:
${charLines}

Story / Plot:
${rp.plot}

CRITICAL MULTI-CHARACTER ROLEPLAY RULES:
1. The user plays the male character. You speak and act as the female characters (${namesList}). NEVER narrate or speak for the user.
2. When the user interacts with or mentions characters in the scene, each character present MUST reply SEPARATELY.
3. You MUST format each character's reply with their name in bold headers on separate blocks, separated by a blank line:
${exampleBlocks}
4. NEVER merge characters into one monologue or speak as only one character when multiple characters are in the scene. Each character gets their own distinct section with sensual actions in *italics* and dialogue in "quotes".
5. NEVER quote, repeat, or copy the user's message. Jump immediately into character actions and dialogue.
6. Write in rich, seductive, natural English. Describe emotions, touch, and physical reactions vividly for each character.
7. Stay in character always.`;
    }

    const primaryName = femaleChars[0]?.name || 'Heroine';
    return `You are a talented romantic and adult roleplay writer. You are roleplaying as the female character in this story:
${charLines}

Story / Plot:
${rp.plot}

STRICT ROLEPLAY RULES:
1. The user plays the male character. You ONLY speak and act as ${primaryName}. NEVER narrate or speak for the user.
2. NEVER quote, repeat, or copy the user's message. Jump immediately into ${primaryName}'s actions and dialogue.
3. Start your response directly with **${primaryName}:** followed by your actions in *italics* and dialogue in quotes.
Example:
**${primaryName}:** *She notices your eyes on her bare waist and offers a seductive smile, leaning slightly closer.* "Like what you see, or are you still waiting for the doctor?"
4. Write in rich, sensual, natural English. Describe emotions, touch, and physical reactions vividly.
5. Keep your response to 1–2 vivid, immersive paragraphs. Stay in character always.`;
  },

  buildHistory(messages) {
    return (messages || []).slice(-20).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));
  },

  async sendMessage(rp, userText, onChunk) {
    const s = window.Storage.getSettings();
    const provider = s.aiProvider || 'openrouter';

    if (provider === 'openrouter') {
      return await this.sendOpenRouter(rp, userText, onChunk);
    } else {
      return await this.sendOllama(rp, userText, onChunk);
    }
  },

  // ═════════════════════════════════════════
  // OPENROUTER (Cloud — Fast & Uncensored)
  // ═════════════════════════════════════════
  async sendOpenRouter(rp, userText, onChunk) {
    const s = window.Storage.getSettings();
    const key = (s.openrouterKey || '').trim();
    let model = s.openrouterModel || 'gryphe/mythomax-l2-13b';
    if (model === 'nousresearch/hermes-3-llama-3.1-8b') model = 'gryphe/mythomax-l2-13b';

    const messages = [
      { role: 'system', content: this.buildSystemPrompt(rp) },
      ...this.buildHistory(rp.messages),
      { role: 'user',   content: userText }
    ];

    const body = {
      model: model,
      messages: messages,
      stream: true,
      temperature: 0.85
    };

    let res;
    try {
      res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://roleplay-ai.local',
          'X-Title': 'Roleplay AI'
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      throw new Error('Cannot reach OpenRouter. Please check your internet connection.');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      const msg = err?.error?.message || `HTTP ${res.status}`;
      throw new Error(`OpenRouter error: ${msg}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') continue;
        try {
          const json = JSON.parse(dataStr);
          const chunk = json?.choices?.[0]?.delta?.content || '';
          if (chunk) {
            fullText += chunk;
            if (onChunk) onChunk(chunk, fullText);
          }
        } catch (_) {}
      }
    }

    if (!fullText.trim()) throw new Error('Received empty response from OpenRouter.');
    return fullText;
  },

  async pingOpenRouter(key) {
    if (!key) return { ok: false, error: 'Please enter an API key' };
    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${key.trim()}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, error: err?.error?.message || `Error ${res.status}` };
      }
      const data = await res.json();
      return { ok: true, data: data.data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  // ═════════════════════════════════════════
  // OLLAMA (Local PC)
  // ═════════════════════════════════════════
  async sendOllama(rp, userText, onChunk) {
    const s = window.Storage.getSettings();
    const ollamaUrl = (s.ollamaUrl || 'http://localhost:11434').replace(/\/$/, '');
    const model     = s.ollamaModel || 'dolphin-phi';

    const messages = [
      { role: 'system', content: this.buildSystemPrompt(rp) },
      ...this.buildHistory(rp.messages),
      { role: 'user',   content: userText }
    ];

    const body = {
      model: model,
      messages: messages,
      stream: true,
      options: {
        temperature: 0.85,
        num_predict: 250,
        num_ctx: 2048,
        num_thread: 6,
        repeat_penalty: 1.25,
        top_p: 0.9,
      }
    };

    let res;
    try {
      res = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) {
      throw new Error('Cannot reach Ollama. Make sure Ollama is running on your PC.');
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Ollama error (${res.status}): ${errText || 'Make sure the model is installed.'}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          const chunk = json?.message?.content || '';
          if (chunk) {
            fullText += chunk;
            if (onChunk) onChunk(chunk, fullText);
          }
        } catch (_) {}
      }
    }

    if (buffer.trim()) {
      try {
        const json = JSON.parse(buffer);
        const chunk = json?.message?.content || '';
        if (chunk) {
          fullText += chunk;
          if (onChunk) onChunk(chunk, fullText);
        }
      } catch (_) {}
    }

    if (!fullText.trim()) throw new Error('Empty response from Ollama.');
    return fullText;
  },

  async ping(ollamaUrl) {
    try {
      const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return { ok: false, status: res.status, models: [] };
      const data = await res.json();
      const models = (data.models || []).map(m => m.name);
      return { ok: true, models };
    } catch (err) {
      return { ok: false, error: err.message, models: [] };
    }
  }
};
