// POST /api/track { path, referrer } : une page vue du site public (envoyée par navigator.sendBeacon).
// Répond toujours 204 : le visiteur ne voit jamais d'erreur liée aux statistiques.
import { sameOrigin } from '../lib/auth.js';
import { recordView } from '../lib/stats.js';

async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  let raw = typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  if (!raw) {
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 2000) return {};
    }
  }
  try { return JSON.parse(raw); } catch { return {}; }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST' && sameOrigin(req)) {
    try {
      await recordView(req, await readJson(req));
    } catch (err) {
      console.error('api/track', err);
    }
  }
  res.statusCode = 204;
  res.end();
}
