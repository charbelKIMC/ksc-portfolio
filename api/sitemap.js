// GET /sitemap.xml (réécrit vers /api/sitemap dans vercel.json) : plan du site pour les moteurs de recherche,
// avec l'accueil, la page « Tous les projets » et une page par projet publié.
import { query } from '../lib/db.js';

const SITE = 'https://charbelkinkpe.com';
const day = d => new Date(d).toISOString().slice(0, 10);

export default async function handler(req, res) {
  let projects = [];
  try {
    projects = await query('select slug, updated_at from projects where published order by position, id');
  } catch (err) {
    console.error('api/sitemap', err);   // base injoignable : on publie au moins les pages fixes
  }
  const latest = projects.length ? day(Math.max(...projects.map(p => new Date(p.updated_at)))) : day(Date.now());
  const urls = [
    { loc: `${SITE}/`, lastmod: latest },
    { loc: `${SITE}/tous-les-projets`, lastmod: latest },
    ...projects.map(p => ({ loc: `${SITE}/projets/${encodeURIComponent(p.slug)}`, lastmod: day(p.updated_at) }))
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.statusCode = 200;
  res.end(xml);
}
