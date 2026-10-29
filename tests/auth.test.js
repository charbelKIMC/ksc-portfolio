// Connexion admin : identifiants, cookie de session, blocage après 5 échecs, origine, déconnexion.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { PGlite } from '@electric-sql/pglite';
import { useQuery } from '../lib/db.js';
import { loadSchema } from '../db/seed.js';
import { requireAdmin, MAX_ATTEMPTS } from '../lib/auth.js';
import handler from '../api/auth.js';

const PASSWORD = 'un-mot-de-passe-de-test';

before(async () => {
  process.env.ADMIN_EMAIL = 'admin@example.com';
  process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash(PASSWORD, 4);
  process.env.JWT_SECRET = 'secret-de-test-uniquement-0123456789';
  const db = new PGlite();
  const query = async (text, params) => (await db.query(text, params)).rows;
  for (const statement of await loadSchema()) await query(statement);
  useQuery(query);
});

// Requête et réponse au format des fonctions Vercel
async function call({ method = 'GET', body, cookie = '', origin = 'http://localhost:3000', ip = '1.1.1.1' } = {}) {
  const req = { method, body, headers: { host: 'localhost:3000', origin, cookie, 'x-real-ip': ip } };
  const res = {
    statusCode: 200, headers: {}, data: undefined,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; }
  };
  await handler(req, res);
  return res;
}
const cookieOf = res => res.headers['set-cookie'].split(';')[0];

test('bons identifiants : cookie de session HttpOnly, puis GET confirme la connexion', async () => {
  const res = await call({ method: 'POST', body: { email: ' Admin@Example.com ', password: PASSWORD } });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['set-cookie'], /HttpOnly; Secure; SameSite=Strict; Max-Age=28800/);
  const me = await call({ cookie: cookieOf(res) });
  assert.equal(me.data.authenticated, true);
  assert.equal(me.data.email, 'admin@example.com');
});

test('mauvais mot de passe ou mauvais e-mail : 401 sans cookie', async () => {
  for (const body of [{ email: 'admin@example.com', password: 'faux' }, { email: 'autre@example.com', password: PASSWORD }]) {
    const res = await call({ method: 'POST', body, ip: '2.2.2.2' });
    assert.equal(res.statusCode, 401);
    assert.equal(res.headers['set-cookie'], undefined);
  }
});

test(`blocage après ${MAX_ATTEMPTS} échecs, même avec le bon mot de passe`, async () => {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await call({ method: 'POST', body: { email: 'admin@example.com', password: 'faux' }, ip: '3.3.3.3' });
  }
  const res = await call({ method: 'POST', body: { email: 'admin@example.com', password: PASSWORD }, ip: '3.3.3.3' });
  assert.equal(res.statusCode, 429);
  assert.ok(Number(res.headers['retry-after']) > 0);
  // Une autre adresse n'est pas bloquée
  assert.equal((await call({ method: 'POST', body: { email: 'admin@example.com', password: PASSWORD }, ip: '4.4.4.4' })).statusCode, 200);
});

test('connexion envoyée depuis un autre site : refusée', async () => {
  const res = await call({ method: 'POST', body: { email: 'admin@example.com', password: PASSWORD }, origin: 'https://pirate.example' });
  assert.equal(res.statusCode, 403);
});

test('cookie falsifié ou absent : non connecté, et requireAdmin répond 401', async () => {
  assert.equal((await call({ cookie: 'ck_admin=abc.def.ghi' })).data.authenticated, false);
  const res = { status(code) { this.statusCode = code; return this; }, json() { return this; } };
  const session = await requireAdmin({ method: 'GET', headers: { host: 'localhost:3000', cookie: '' } }, res);
  assert.equal(session, null);
  assert.equal(res.statusCode, 401);
});

test('déconnexion : le cookie est effacé', async () => {
  const res = await call({ method: 'DELETE' });
  assert.match(res.headers['set-cookie'], /^ck_admin=; .*Max-Age=0/);
});
