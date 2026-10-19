// ═══════════════════════════════════════════
// imageSearch.js — Body-part detector + Actress image search
// ═══════════════════════════════════════════

window.ImageSearch = {
  BODY_PARTS: [
    'face', 'eyes', 'lips', 'lip', 'neck', 'shoulder', 'shoulders',
    'waist', 'hip', 'hips', 'navel', 'belly', 'back',
    'cheeks', 'cheek', 'nose', 'expressions', 'expression', 'arms',
    'arm', 'armpits', 'armpit', 'thigh', 'thighs', 'leg', 'legs',
    'collarbone', 'cleavage', 'boobs', 'nipples', 'melons',
    'throat', 'navel', 'ass', 'panty', 'butt',
    'curves', 'curve', 'bellybutton', 'mouth', 'tongue', 'spine', 'stomach',
    'backneck', 'backhip'
  ],

  actressCache: {},

  detectBodyParts(text) {
    if (!text) return [];
    const regex = new RegExp(`\\b(${this.BODY_PARTS.join('|')})\\b`, 'gi');
    const matches = text.match(regex) || [];
    const unique = [...new Set(matches.map(m => m.toLowerCase()))];
    const map = {
      hips: 'hip', lips: 'lip', eyes: 'eye', hands: 'hand',
      legs: 'leg', arms: 'arm', thighs: 'thigh', knees: 'knee',
      shoulders: 'shoulder', cheeks: 'cheek', ears: 'ear',
      fingers: 'finger', eyebrows: 'eyebrow', eyelashes: 'lashes',
      eyelash: 'lashes', dimples: 'dimple', ankles: 'ankle',
      toes: 'toe', palms: 'palm', curves: 'curves', bellybutton: 'navel',
      naabhi: 'navel', stomach: 'belly', midriff: 'navel', bosom: 'cleavage'
    };
    return [...new Set(unique.map(m => map[m] || m))];
  },

  // Query Pinterest helper server with automatic cloud fallback
  async searchPinterestServer(actress, bodyPart) {
    const params = `actress=${encodeURIComponent(actress)}&part=${encodeURIComponent(bodyPart)}`;
    const endpoints = [];

    // 1. Relative endpoint when hosted on HTTP/HTTPS
    if (window.location.protocol.startsWith('http')) {
      endpoints.push(`/api/pinterest?${params}`);
    }
    // 2. Local helper server if running
    endpoints.push(`http://localhost:3333/api/pinterest?${params}`);
    // 3. Live 24/7 Vercel cloud server (ensures file:/// always works!)
    endpoints.push(`https://ai-rp-taupe.vercel.app/api/pinterest?${params}`);

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          if (data && data.images && data.images.length > 0) {
            return data.images.map(img => {
              const rawUrl = img.url || '';
              const hdUrl = rawUrl.includes('pinimg.com')
                ? rawUrl.replace('/236x/', '/736x/').replace('/474x/', '/736x/')
                : rawUrl;
              return {
                url: hdUrl,
                thumb: img.thumb || rawUrl,
                title: img.title || `${actress} ${bodyPart}`
              };
            });
          }
        }
      } catch (_) {
        // try next endpoint in list
      }
    }
    return [];
  },

  detectPartsForCharacter(text, charName, allParts) {
    if (!text || !charName || allParts.length <= 1) return allParts;
    const lower = text.toLowerCase();
    const nameIdx = lower.indexOf(charName.toLowerCase());
    if (nameIdx === -1) return allParts;

    const start = Math.max(0, nameIdx - 30);
    const end = Math.min(lower.length, nameIdx + 120);
    const windowText = lower.substring(start, end);

    const localParts = allParts.filter(p => windowText.includes(p));
    return localParts.length > 0 ? localParts : allParts;
  },

  // Strictly search Pinterest for each active female character in the scene
  async searchForMessage(text, characters) {
    const femaleChars = (characters || []).filter(c => (c.actressName || c.name) && c.gender !== 'male');
    if (femaleChars.length === 0) {
      console.warn('[ImageSearch] No characters found to search images for');
      return [];
    }

    const lower = (text || '').toLowerCase();
    const mentioned = femaleChars.filter(c => lower.includes(c.name.toLowerCase()));
    const targetChars = mentioned.length > 0 ? mentioned : femaleChars;

    const allParts = this.detectBodyParts(text);
    console.log('[ImageSearch] Target chars:', targetChars.map(c => c.name), 'Detected parts:', allParts);
    const results = [];

    for (const char of targetChars) {
      const actress = (char.actressName || char.name || '').trim();
      const charParts = this.detectPartsForCharacter(text, char.name, allParts);
      let found = false;

      // 1. Try detected body parts from user's message
      for (const part of charParts) {
        const images = await this.searchPinterestServer(actress, part);
        if (images && images.length > 0) {
          const randomImg = images[Math.floor(Math.random() * images.length)];
          results.push({
            character: char.name,
            actressName: actress,
            bodyPart: part,
            images: [randomImg]
          });
          found = true;
        }
      }

      // 2. If no body part was mentioned or no Pinterest result, guarantee an actress picture
      if (!found) {
        const fallbacks = ['saree', 'photoshoot', 'photo'];
        for (const queryPart of fallbacks) {
          const images = await this.searchPinterestServer(actress, queryPart);
          if (images && images.length > 0) {
            const randomImg = images[Math.floor(Math.random() * images.length)];
            results.push({
              character: char.name,
              actressName: actress,
              bodyPart: queryPart,
              images: [randomImg]
            });
            break;
          }
        }
      }
    }

    return results;
  }
};
