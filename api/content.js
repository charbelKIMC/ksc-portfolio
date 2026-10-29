// GET /api/content : tout le contenu public du portfolio en un seul appel.
import { query } from '../lib/db.js';
import { getContent } from '../lib/content.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  try {
    const content = await getContent(query);
    // Cache du CDN Vercel : une modification faite dans l'admin est visible en moins d'une minute.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
    return res.status(200).json(content);
  } catch (err) {
    console.error('api/content', err);
    // Le site affiche alors son contenu de secours (public/js/data.js).
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ error: 'Contenu indisponible' });
  }
}
