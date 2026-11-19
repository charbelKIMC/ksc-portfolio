// Statistiques de visite et journal des connexions : enregistrement, filtres et tableau de bord.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import bcrypt from 'bcryptjs';
import { PGlite } from '@electric-sql/pglite';
import { useQuery } from '../lib/db.js';
import { loadSchema } from '../db/seed.js';
import { createSession } from '../lib/auth.js';
import { deviceOf, referrerOf } from '../lib/stats.js';
import track from '../api/track.js';
import auth from '../api/auth.js';
import admin from '../api/admin/[resource].js';

const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
let query;

before(async () => {
  process.env.ADMIN_EMAIL = 'admin@example.com';
  process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash('bon-mot-de-passe', 4);
  process.env.JWT_SECRET = 'secret-de-test-uniquement-0123456789';
  const db = new PGlite();
  query = async (text, params) => (await db.query(text, params)).rows;
  for (const statement of await loadSchema()) await query(statement);
  useQuery(query);
});

const response = () => ({
  statusCode: 200, headers: {}, data: undefined,
  setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
  status(code) { this.statusCode = code; return this; },
  json(d) { this.data = d; return this; },
  end() { return this; }
});
const headers = (ua, ip = '10.0.0.1', extra = {}) => ({ host: 'charbelkinkpe.com', origin: 'https://charbelkinkpe.com', 'user-agent': ua, 'x-real-ip': ip, ...extra });

async function view(body, ua = CHROME_WIN, ip, extra) {
  const req = Readable.from([JSON.stringify(body)]);
  Object.assign(req, { method: 'POST', headers: headers(ua, ip, extra), query: {} });
  const res = response();
  await track(req, res);
  return res;
}
const count = async () => (await query('select count(*)::int as n from page_views'))[0].n;

test('appareil et provenance', () => {
  assert.equal(deviceOf(CHROME_WIN), 'desktop');
  assert.equal(deviceOf(IPHONE), 'mobile');
  assert.equal(referrerOf('https://www.linkedin.com/feed/', 'charbelkinkpe.com'), 'linkedin.com');
  assert.equal(referrerOf('https://charbelkinkpe.com/projets/soko', 'charbelkinkpe.com'), null);
  assert.equal(referrerOf('', 'charbelkinkpe.com'), null);
});

test('une page vue est enregistrée sans IP ni identifiant lisible', async () => {
  const res = await view({ path: '/projets/claimora', referrer: 'https://www.google.com/' }, IPHONE, '41.1.2.3', { 'x-vercel-ip-country': 'bj' });
  assert.equal(res.statusCode, 204);
  const [row] = await query('select * from page_views order by id desc limit 1');
  assert.equal(row.path, '/projets/claimora');
  assert.equal(row.referrer, 'google.com');
  assert.equal(row.country, 'BJ');
  assert.equal(row.device, 'mobile');
  assert.match(row.visitor, /^[0-9a-f]{16}$/);
  assert.ok(!JSON.stringify(row).includes('41.1.2.3'));
});

test('robots, pages inconnues et autres sites : ignorés, réponse 204 quand même', async () => {
  const before = await count();
  assert.equal((await view({ path: '/' }, 'Googlebot/2.1 (+http://www.google.com/bot.html)')).statusCode, 204);
  assert.equal((await view({ path: '/admin' })).statusCode, 204);
  assert.equal((await view({ path: '/<script>' })).statusCode, 204);
  assert.equal((await view({ path: '/' }, CHROME_WIN, '10.0.0.9', { origin: 'https://pirate.example' })).statusCode, 204);
  assert.equal(await count(), before);
});

test('connexions réussies et ratées journalisées, affichées dans le tableau de bord admin', async () => {
  const login = async password => {
    const res = response();
    await auth({ method: 'POST', body: { email: 'admin@example.com', password }, headers: headers(CHROME_WIN, '10.0.0.7') }, res);
    return res.statusCode;
  };
  assert.equal(await login('faux'), 401);
  assert.equal(await login('bon-mot-de-passe'), 200);

  await view({ path: '/' }, CHROME_WIN, '10.0.0.2');
  await view({ path: '/' }, CHROME_WIN, '10.0.0.2');          // même visiteur, même jour
  await view({ path: '/tous-les-projets' }, IPHONE, '10.0.0.3');

  const anonymous = response();
  await admin({ method: 'GET', query: { resource: 'activity' }, headers: { host: 'charbelkinkpe.com', cookie: '' } }, anonymous);
  assert.equal(anonymous.statusCode, 401);

  const res = response();
  const cookie = `ck_admin=${await createSession()}`;
  await admin({ method: 'GET', query: { resource: 'activity', days: '7' }, headers: { host: 'charbelkinkpe.com', cookie } }, res);
  assert.equal(res.statusCode, 200);
  const a = res.data;
  assert.equal(a.days, 7);
  assert.equal(a.visits.series.length, 7);
  assert.equal(a.visits.views, 4);
  assert.equal(a.visits.visitors, 3);
  assert.equal(a.visits.series.at(-1).views, 4);
  assert.equal(a.visits.pages[0].name, '/');
  assert.equal(a.logins.length, 1);
  assert.equal(a.logins[0].ip, '10.0.0.7');
  assert.equal(a.failures.count, 1);
});
