// Vérifie le schéma, l'import et la lecture du contenu sur un PostgreSQL en mémoire (PGlite), sans compte Neon.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { loadFallback, loadSchema, seed } from '../db/seed.js';
import { getContent } from '../lib/content.js';

const withoutSeed = c => ({ ...c, projects: c.projects.map(({ seed, ...p }) => p) });

async function freshDb() {
  const db = new PGlite();
  const query = async (text, params) => (await db.query(text, params)).rows;
  for (const statement of await loadSchema()) await query(statement);
  return query;
}

test("le contenu relu depuis la base est identique au contenu importé", async () => {
  const query = await freshDb();
  const fallback = await loadFallback();
  await seed(query, fallback);
  // Passage par JSON : même forme que ce que reçoit le navigateur
  const content = JSON.parse(JSON.stringify(await getContent(query)));
  assert.deepEqual(withoutSeed(content), withoutSeed(JSON.parse(JSON.stringify(fallback))));
});

test('un projet non publié est masqué', async () => {
  const query = await freshDb();
  await seed(query, await loadFallback());
  await query("update projects set published = false where slug = 'soko'");
  const { projects } = await getContent(query);
  assert.equal(projects.length, 4);
  assert.ok(!projects.some(p => p.id === 'soko'));
});

test('une base sans profil renvoie une erreur claire', async () => {
  const query = await freshDb();
  await assert.rejects(getContent(query), /Profil absent/);
});
