// ═══════════════════════════════════════════════════════
// api/pinterest.js — Vercel Serverless Function for Pinterest Search
// Zero dependencies (uses native fetch in Node 18+)
// ═══════════════════════════════════════════════════════

const url = require('url');

const cache = new Map();

async function searchPinterest(actress, bodyPart) {
  const cacheKey = `${actress.toLowerCase().trim()}_${bodyPart.toLowerCase().trim()}`;
  if (cache.has(cacheKey)) {
    const list = cache.get(cacheKey);
    return pickRandom(list, 2);
  }

  const query = `${actress} ${bodyPart} site:pinterest.com`;
  try {
    const res = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    const match = html.match(/vqd=([0-9-]+)/);
    if (!match) return [];

    const vqd = match[1];
    const imgRes = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,`, {
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
  } catch (err) {
    console.error('Search error for:', query, err.message);
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
