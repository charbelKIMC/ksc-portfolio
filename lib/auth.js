// Connexion à l'espace admin : un seul compte, défini par les variables d'environnement
//   ADMIN_EMAIL, ADMIN_PASSWORD_HASH (bcrypt) et JWT_SECRET  →  npm run admin:password
// La session est un jeton signé (JWT) rangé dans un cookie HttpOnly : le JavaScript de la page ne peut pas le lire.
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { timingSafeEqual } from 'node:crypto';
import { query } from './db.js';

export const COOKIE = 'ck_admin';
export const SESSION_HOURS = 8;
export const MAX_ATTEMPTS = 5;      // essais ratés autorisés…
export const WINDOW_MINUTES = 15;   // …par adresse IP sur cette durée

function config() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD_HASH, JWT_SECRET } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH || !JWT_SECRET) {
    throw new Error('Variables ADMIN_EMAIL, ADMIN_PASSWORD_HASH ou JWT_SECRET manquantes : lancer « npm run admin:password ».');
  }
  return { email: ADMIN_EMAIL.trim().toLowerCase(), hash: ADMIN_PASSWORD_HASH, secret: new TextEncoder().encode(JWT_SECRET) };
}

const sameText = (a, b) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function checkCredentials(email, password) {
  const c = config();
  // Le mot de passe est toujours vérifié, même si l'e-mail est faux : même durée de réponse dans les deux cas.
  const passwordOk = await bcrypt.compare(String(password), c.hash);
  return sameText(String(email).trim().toLowerCase(), c.email) && passwordOk;
}

export function createSession() {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(config().email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(config().secret);
}

export function sessionCookie(token) {
  const value = token ?? '';
  const maxAge = token ? SESSION_HOURS * 3600 : 0;
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function readCookie(req, name) {
  const pair = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}

// Renvoie la session (e-mail, expiration) si le cookie est valide, sinon null.
export async function getSession(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, config().secret, { algorithms: ['HS256'] });
    return payload.role === 'admin' ? { email: payload.sub, expiresAt: payload.exp * 1000 } : null;
  } catch {
    return null;
  }
}

// Bloque les requêtes qui modifient des données envoyées depuis un autre site.
export function sameOrigin(req) {
  if (['GET', 'HEAD'].includes(req.method)) return true;
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

// À appeler en tête de chaque route /api/admin/* : renvoie la session, ou répond 401/403 et renvoie null.
export async function requireAdmin(req, res) {
  if (!sameOrigin(req)) {
    res.status(403).json({ error: 'Origine refusée' });
    return null;
  }
  const session = await getSession(req);
  if (!session) {
    res.status(401).json({ error: 'Connexion requise' });
    return null;
  }
  return session;
}

export function clientIp(req) {
  return String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'inconnue')
    .split(',')[0].trim();
}

// Anti-force brute : nombre de minutes à attendre, ou 0 si l'IP peut encore essayer.
export async function lockedMinutes(ip) {
  const [row] = await query(
    `select count(*)::int as n, min(created_at) as first from login_attempts
     where ip = $1 and created_at > now() - make_interval(mins => $2)`,
    [ip, WINDOW_MINUTES]
  );
  if (row.n < MAX_ATTEMPTS) return 0;
  const unlock = new Date(row.first).getTime() + WINDOW_MINUTES * 60_000;
  return Math.max(1, Math.ceil((unlock - Date.now()) / 60_000));
}

export async function recordFailure(ip) {
  await query('insert into login_attempts (ip) values ($1)', [ip]);
  await query("delete from login_attempts where created_at < now() - interval '1 day'");
}

export async function clearFailures(ip) {
  await query('delete from login_attempts where ip = $1', [ip]);
}
