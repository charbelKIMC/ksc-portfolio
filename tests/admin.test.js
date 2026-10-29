// API d'administration : lecture, création, modification, suppression, ordre, validation et protection.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { useQuery } from '../lib/db.js';
import { loadFallback, loadSchema, seed } from '../db/seed.js';
import { createSession } from '../lib/auth.js';
import { getContent } from '../lib/content.js';
import handler from '../api/admin/[resource].js';

let cookie, query;

before(async () => {
  process.env.ADMIN_EMAIL = 'admin@example.com';
  process.env.ADMIN_PASSWORD_HASH = 'inutile-ici';
  process.env.JWT_SECRET = 'secret-de-test-uniquement-0123456789';
  const db = new PGlite();
  query = async (text, params) => (await db.query(text, params)).rows;
  for (const statement of await loadSchema()) await query(statement);
  await seed(query, await loadFallback());
  useQuery(query);
  cookie = `ck_admin=${await createSession()}`;
});

async function call(resource, { method = 'GET', id, body, auth = true } = {}) {
  const req = {
    method, body,
    query: { resource, ...(id !== undefined && { id: String(id) }) },
    headers: { host: 'localhost:3000', origin: 'http://localhost:3000', cookie: auth ? cookie : '' }
  };
  const res = {
    statusCode: 200, headers: {}, data: undefined,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; }
  };
  await handler(req, res);
  return res;
}

test('sans connexion : 401', async () => {
  assert.equal((await call('projects', { auth: false })).statusCode, 401);
});

test('ressource inconnue : 404', async () => {
  assert.equal((await call('users')).statusCode, 404);
});

test('profil : lecture puis modification, visible dans /api/content', async () => {
  const { data: profile } = await call('profile');
  assert.equal(profile.lastName, 'Kinkpe');
  const res = await call('profile', { method: 'PUT', body: { ...profile, statusText: 'en poste', available: false } });
  assert.equal(res.statusCode, 200);
  const content = await getContent(query);
  assert.equal(content.profile.statusText, 'en poste');
  assert.equal(content.profile.available, false);
});

test('projet : création avec galerie, modification, brouillon masqué, suppression', async () => {
  const body = {
    slug: 'nouveau-projet', title: 'Nouveau projet', cats: ['Web', ''], stack: ['Node.js'],
    steps: [{ title: 'Étape', text: 'Texte' }], facts: [{ label: 'Type', value: 'Test' }],
    gallery: [{ src: 'img/a.webp', caption: 'A' }, { src: 'https://exemple.com/b.png', caption: 'B', logo: true }],
    featured: true, published: true
  };
  const created = await call('projects', { method: 'POST', body });
  assert.equal(created.statusCode, 201);
  assert.deepEqual(created.data.cats, ['Web']);   // lignes vides retirées
  assert.deepEqual(created.data.gallery.map(g => g.src), ['img/a.webp', 'https://exemple.com/b.png']);
  assert.equal(created.data.position, 5);         // ajouté à la fin

  const id = created.data.id;
  const updated = await call('projects', { method: 'PUT', id, body: { ...body, title: 'Renommé', published: false, gallery: [{ src: 'img/c.webp', caption: '' }] } });
  assert.equal(updated.data.title, 'Renommé');
  assert.deepEqual(updated.data.gallery, [{ src: 'img/c.webp', caption: '', logo: false }]);
  assert.ok(!(await getContent(query)).projects.some(p => p.id === 'nouveau-projet'));

  assert.equal((await call('projects', { method: 'DELETE', id })).statusCode, 200);
  assert.equal((await call('projects', { id })).statusCode, 404);
  const [{ n }] = await query('select count(*)::int as n from project_images where project_id = $1', [id]);
  assert.equal(n, 0);
});

test('projet : adresse déjà prise → 409, champs invalides → 400 avec détail', async () => {
  const dup = await call('projects', { method: 'POST', body: { slug: 'claimora', title: 'Doublon' } });
  assert.equal(dup.statusCode, 409);
  const bad = await call('projects', { method: 'POST', body: { slug: 'Avec Espaces', title: '', demo: 'http://pas-https.com' } });
  assert.equal(bad.statusCode, 400);
  assert.deepEqual(Object.keys(bad.data.fields).sort(), ['demo', 'slug', 'title']);
});

test('expérience : mois, durée et contrôle des dates', async () => {
  const ok = await call('experiences', { method: 'POST', body: { role: 'Dev', company: 'ACME', start: '2026-11', end: '', months: '2' } });
  assert.equal(ok.statusCode, 201);
  assert.equal(ok.data.start, '2026-11');
  assert.equal(ok.data.end, null);
  assert.equal(ok.data.months, 2);
  const list = (await call('experiences')).data;
  assert.equal(list[0].id, ok.data.id);           // la plus récente en premier
  const bad = await call('experiences', { method: 'POST', body: { role: 'Dev', company: 'ACME', start: '2026-05', end: '2026-01', months: 1 } });
  assert.equal(bad.statusCode, 400);
  assert.ok(bad.data.fields.end);
});

test('compétences : groupe avec sa liste, puis nouvel ordre des groupes', async () => {
  const { data: groups } = await call('skills');
  const front = groups.find(g => g.name === 'Front-end');
  const res = await call('skills', { method: 'PUT', id: front.id, body: { name: 'Front-end', kind: 'tech', skills: ['HTML', 'Svelte', ''] } });
  assert.deepEqual(res.data.skills, ['HTML', 'Svelte']);
  const reversed = groups.map(g => g.id).reverse();
  const { data: reordered } = await call('skills', { method: 'PATCH', body: { order: reversed } });
  assert.deepEqual(reordered.map(g => g.id), reversed);
  assert.equal((await getContent(query)).skillGroups[0].name, groups.at(-1).name);
});

test('liens de contact : https, mailto ou tel seulement', async () => {
  assert.equal((await call('socials', { method: 'POST', body: { label: 'X', url: 'https://x.com/charbel' } })).statusCode, 201);
  assert.equal((await call('socials', { method: 'POST', body: { label: 'Piège', url: 'javascript:alert(1)' } })).statusCode, 400);
});
