// ═══════════════════════════════════════════════════════
// api/pinterest.js — Vercel Serverless Function for Pinterest Search
// Multi-engine search (Bing Images + DuckDuckGo fallback)
// High-res Pinterest photos directly from i.pinimg.com
// ═══════════════════════════════════════════════════════

const url = require('url');

const cache = new Map();

async function searchPinterest(actress, bodyPart) {
  const cacheKey = `${actress.toLowerCase().trim()}_${bodyPart.toLowerCase().trim()}`;
  if (cache.has(cacheKey)) {
    const list = cache.get(cacheKey);
    return pickRandom(list, 2);
  }

  // 1. Primary: Bing Image search (reliable on cloud serverless / AWS datacenter IPs)
  try {
    const query = `${actress} ${bodyPart} pinterest`;
    const res = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&FORM=HDRSC2`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (res.ok) {
      const html = await res.text();
      const matches = [...html.matchAll(/m="?\{([^"]+)\}"?/g)];
      const results = [];
      for (const match of matches) {
        try {
          const raw = '{' + match[1].replace(/&quot;/g, '"') + '}';
          const obj = JSON.parse(raw);
          if (obj.murl) {
            const cleanUrl = (obj.murl || '').replace('/236x/', '/736x/').replace('/474x/', '/736x/');
            results.push({
              url: cleanUrl,
              thumb: cleanUrl,
              title: obj.desc || `${actress} ${bodyPart}`,
              source: obj.purl || ''
            });
          }
        } catch (_) {}
      }

      const pinOnly = results.filter(r => r.url.includes('pinimg.com') || r.source.includes('pinterest.com'));
      const finalItems = pinOnly.length > 0 ? pinOnly : results;

      if (finalItems.length > 0) {
        cache.set(cacheKey, finalItems);
        return pickRandom(finalItems, 2);
      }
    }
  } catch (err) {
    console.error('Bing search error:', err.message);
  }

  // 2. Secondary fallback: DuckDuckGo
  try {
    const ddgQuery = `${actress} ${bodyPart} site:pinterest.com`;
    const res = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(ddgQuery)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    const match = html.match(/vqd=([0-9-]+)/);
    if (match) {
      const vqd = match[1];
      const imgRes = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(ddgQuery)}&vqd=${vqd}&f=,,,`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://duckduckgo.com/'
        }
      });
      const data = await imgRes.json();
      const results = (data.results || []).map(r => ({
        url: r.image,
        thumb: r.thumbnail || r.image,
        title: r.title || `${actress} ${bodyPart}`,
        source: r.url
      })).filter(r => r.url && r.url.startsWith('http'));

      if (results.length > 0) {
        cache.set(cacheKey, results);
        return pickRandom(results, 2);
      }
    }
  } catch (err) {
    console.error('DuckDuckGo search error:', err.message);
  }

  return [];
}

function pickRandom(arr, count = 1) {
  if (!arr || arr.length === 0) return [];
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    if (res.status) return res.status(204).end();
    res.writeHead(204);
    return res.end();
  }

  let query = req.query;
  if (!query) {
    const parsed = url.parse(req.url, true);
    query = parsed.query || {};
  }

  const actress  = String(query.actress || '').trim();
  const bodyPart = String(query.part || '').trim();

  if (!actress || !bodyPart) {
    const payload = { ok: false, error: 'Missing actress or part parameter' };
    if (res.status) return res.status(400).json(payload);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(payload));
  }

  const images = await searchPinterest(actress, bodyPart);
  const payload = { ok: true, actress, bodyPart, images };

  if (res.status) {
    return res.status(200).json(payload);
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(payload));
  }
};
