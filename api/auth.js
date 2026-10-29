// /api/auth
//   GET    → { authenticated, email, expiresAt } : suis-je connecté ?
//   POST   → { email, password } : connexion (cookie de session)
//   DELETE → déconnexion
import {
  checkCredentials, clearFailures, clientIp, createSession, getSession,
  lockedMinutes, recordFailure, sameOrigin, sessionCookie, SESSION_HOURS
} from '../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const session = await getSession(req);
      return res.status(200).json(session ? { authenticated: true, ...session } : { authenticated: false });
    }

    if (!sameOrigin(req)) return res.status(403).json({ error: 'Origine refusée' });

    if (req.method === 'DELETE') {
      res.setHeader('Set-Cookie', sessionCookie(null));
      return res.status(200).json({ authenticated: false });
    }

    if (req.method === 'POST') {
      const ip = clientIp(req);
      const wait = await lockedMinutes(ip);
      if (wait) {
        res.setHeader('Retry-After', String(wait * 60));
        return res.status(429).json({ error: `Trop de tentatives. Réessaie dans ${wait} min.` });
      }
      const { email, password } = req.body || {};
      if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        return res.status(400).json({ error: 'E-mail et mot de passe requis.' });
      }
      if (!(await checkCredentials(email, password))) {
        await recordFailure(ip);
        return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });
      }
      await clearFailures(ip);
      res.setHeader('Set-Cookie', sessionCookie(await createSession()));
      return res.status(200).json({ authenticated: true, email: email.trim().toLowerCase(), expiresAt: Date.now() + SESSION_HOURS * 3600_000 });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (err) {
    console.error('api/auth', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
