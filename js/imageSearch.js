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

  // Helper to determine the correct Pinterest API endpoint
  getPinterestEndpoint(actress, bodyPart) {
    const params = `actress=${encodeURIComponent(actress)}&part=${encodeURIComponent(bodyPart)}`;
    // If running on a live web server (https://... or http://... like Vercel)
    if (window.location.protocol.startsWith('http')) {
      return `/api/pinterest?${params}`;
    }
    // Fallback when opened directly as file:/// in browser
    return `http://localhost:3333/api/pinterest?${params}`;
  },

  // Query Pinterest helper server (real Pinterest photos)
  async searchPinterestServer(actress, bodyPart) {
    try {
      const endpoint = this.getPinterestEndpoint(actress, bodyPart);
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.images || []).map(img => ({
        url: img.url,
        thumb: img.thumb || img.url,
        title: img.title
      }));
    } catch (_) {
      return [];
    }
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
    const femaleChars = (characters || []).filter(c => c.gender === 'female' && c.actressName);
    if (femaleChars.length === 0) return [];

    const lower = (text || '').toLowerCase();
    const mentioned = femaleChars.filter(c => lower.includes(c.name.toLowerCase()));
    const targetChars = mentioned.length > 0 ? mentioned : femaleChars;

    const allParts = this.detectBodyParts(text);
    const results = [];

    for (const char of targetChars) {
      const actress = char.actressName.trim();
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
          break; // 1 picture per character
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
