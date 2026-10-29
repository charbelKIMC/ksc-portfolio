// Serveur local : sert public/ et les fonctions de api/ comme Vercel, sans compte Vercel.
//   npm run dev          → avec DATABASE_URL (fichier .env) : lit ta base Neon
//                          sans DATABASE_URL : base en mémoire remplie avec public/js/data.js
import { createServer } from 'node:http';
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { useQuery } from '../lib/db.js';

const PORT = Number(process.env.PORT) || 3000;
const ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const API = fileURLToPath(new URL('../api/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8' };

if (process.env.DATABASE_URL) {
  console.log('Base : Neon (DATABASE_URL)');
} else {
  const { PGlite } = await import('@electric-sql/pglite');
  const { loadFallback, loadSchema, seed } = await import('../db/seed.js');
  const db = new PGlite();
  const query = async (text, params) => (await db.query(text, params)).rows;
  for (const statement of await loadSchema()) await query(statement);
  await seed(query, await loadFallback());
  useQuery(query);
  console.log('Base : en mémoire (pas de DATABASE_URL)');
}
if (!process.env.ADMIN_PASSWORD_HASH) console.log('Compte admin absent : lance « npm run admin:password » pour pouvoir te connecter.');

// Ajoute à req/res ce que Vercel fournit : req.query, req.body (JSON), res.status(), res.json()
// Les autres corps (fichiers envoyés) restent à lire dans le flux de la requête, comme sur Vercel.
async function vercelize(req, res, url) {
  req.query = Object.fromEntries(url.searchParams);
  if ((req.headers['content-type'] || '').includes('application/json')) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    req.body = raw ? JSON.parse(raw) : undefined;
  }
  res.status = code => { res.statusCode = code; return res; };
  res.json = data => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
    return res;
  };
}

// api/admin/projects → api/admin/projects.js, sinon api/admin/[resource].js avec { resource: 'projects' }
async function findFunction(name) {
  const exact = join(API, `${name}.js`);
  if (await stat(exact).catch(() => null)) return { file: exact, params: {} };
  const parts = name.split('/');
  const last = parts.pop();
  const dir = join(API, ...parts);
  const dynamic = (await readdir(dir).catch(() => [])).find(f => /^\[\w+\]\.js$/.test(f));
  if (!dynamic) throw Object.assign(new Error('introuvable'), { code: 'ENOENT' });
  return { file: join(dir, dynamic), params: { [dynamic.slice(1, -4)]: last } };
}

async function serveFile(path, res) {
  let file = normalize(join(ROOT, path));
  if (!file.startsWith(normalize(ROOT))) throw Object.assign(new Error('interdit'), { code: 'ENOENT' });
  if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');
  else if (!extname(file)) file += '.html';   // cleanUrls, comme dans vercel.json
  const body = await readFile(file);
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(body);
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = decodeURIComponent(url.pathname);
  try {
    if (path.startsWith('/api/')) {
      const name = path.slice(5).replace(/\/$/, '');
      if (!/^[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(name)) throw Object.assign(new Error('introuvable'), { code: 'ENOENT' });
      const { file, params } = await findFunction(name);
      const { default: handler } = await import(pathToFileURL(file).href);
      await vercelize(req, res, url);
      Object.assign(req.query, params);
      return await handler(req, res);
    }
    await serveFile(path, res);
  } catch (err) {
    if (res.headersSent) return res.end();
    res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(err.code === 'ENOENT' ? 'Introuvable' : String(err));
  }
}).listen(PORT, () => console.log(`Portfolio : http://localhost:${PORT}   Admin : http://localhost:${PORT}/admin`));
