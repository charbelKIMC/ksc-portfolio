// Sitemap : accueil, « Tous les projets » et une page par projet publié ; les brouillons n'y figurent pas.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { useQuery } from '../lib/db.js';
import { loadFallback, loadSchema, seed } from '../db/seed.js';
import handler from '../api/sitemap.js';

let query;

before(async () => {
  const db = new PGlite();
  query = async (text, params) => (await db.query(text, params)).rows;
  for (const statement of await loadSchema()) await query(statement);
  await seed(query, await loadFallback());
  useQuery(query);
});

async function get() {
  const res = { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b; } };
  await handler({ method: 'GET', headers: {}, query: {} }, res);
  return res;
}

test('liste les pages fixes et un lien par projet publié', async () => {
  const res = await get();
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /application\/xml/);
  const locs = [...res.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const slugs = (await loadFallback()).projects.map(p => p.id);
  assert.deepEqual(locs, [
    'https://charbelkinkpe.com/',
    'https://charbelkinkpe.com/tous-les-projets',
    ...slugs.map(s => `https://charbelkinkpe.com/projets/${s}`)
  ]);
  assert.match(res.body, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
});

test('un projet en brouillon n\'apparaît pas', async () => {
  await query("update projects set published = false where slug = 'soko'");
  const res = await get();
  assert.ok(!res.body.includes('/projets/soko'));
  await query("update projects set published = true where slug = 'soko'");
});
