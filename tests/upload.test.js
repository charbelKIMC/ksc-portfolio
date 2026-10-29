// Envoi de fichiers : connexion requise, types reconnus aux octets, taille maximale, stockage local en développement.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSession } from '../lib/auth.js';
import { MAX_BYTES, detectType } from '../lib/storage.js';
import handler from '../api/upload.js';

let cookie, dir;

// Début d'un vrai fichier WebP (RIFF….WEBP) suivi de données quelconques
const webp = Buffer.concat([Buffer.from('RIFF\x24\x00\x00\x00WEBPVP8 ', 'binary'), Buffer.alloc(64, 1)]);
const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64, 2)]);

before(async () => {
  process.env.ADMIN_EMAIL = 'admin@example.com';
  process.env.ADMIN_PASSWORD_HASH = 'inutile-ici';
  process.env.JWT_SECRET = 'secret-de-test-uniquement-0123456789';
  delete process.env.BLOB_READ_WRITE_TOKEN;
  dir = await mkdtemp(join(tmpdir(), 'portfolio-upload-'));
  process.env.LOCAL_UPLOAD_DIR = dir;
  cookie = `ck_admin=${await createSession()}`;
});

after(() => rm(dir, { recursive: true, force: true }));

async function send(body, { query = {}, auth = true, method = 'POST' } = {}) {
  const req = Readable.from([body]);
  Object.assign(req, {
    method,
    query: { name: 'Ma Photo Été.jpg', folder: 'projects', ...query },
    headers: { host: 'localhost:3000', origin: 'http://localhost:3000', cookie: auth ? cookie : '', 'content-length': String(body.length) }
  });
  const res = {
    statusCode: 200, headers: {}, data: undefined,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; }
  };
  await handler(req, res);
  return res;
}

test('type reconnu aux premiers octets, pas au nom', () => {
  assert.equal(detectType(webp).type, 'image/webp');
  assert.equal(detectType(pdf).type, 'application/pdf');
  assert.equal(detectType(Buffer.from('<svg onload="alert(1)"></svg>.........')), null);
});

test('sans connexion : 401', async () => {
  assert.equal((await send(webp, { auth: false })).statusCode, 401);
});

test('image WebP : enregistrée avec un nom propre et unique', async () => {
  const res = await send(webp);
  assert.equal(res.statusCode, 201);
  assert.match(res.data.url, /^uploads\/ma-photo-ete-[0-9a-f]{8}\.webp$/);
  const saved = await readFile(join(dir, res.data.url.slice('uploads/'.length)));
  assert.deepEqual(saved, webp);
});

test('PDF accepté, extension corrigée selon le contenu', async () => {
  const res = await send(pdf, { query: { name: 'cv.docx', folder: 'documents' } });
  assert.equal(res.statusCode, 201);
  assert.match(res.data.url, /^uploads\/cv-[0-9a-f]{8}\.pdf$/);
});

test('fichier non accepté : 415 ; vide : 400 ; trop lourd : 413', async () => {
  assert.equal((await send(Buffer.from('<html><script>alert(1)</script></html>'))).statusCode, 415);
  assert.equal((await send(Buffer.alloc(0))).statusCode, 400);
  assert.equal((await send(Buffer.concat([webp, Buffer.alloc(MAX_BYTES)]))).statusCode, 413);
});

test('autre méthode que POST : 405', async () => {
  assert.equal((await send(webp, { method: 'GET' })).statusCode, 405);
});
