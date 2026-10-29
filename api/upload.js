// POST /api/upload?name=photo.jpg&folder=projects — envoi d'un fichier par l'admin connecté.
// Le corps de la requête est le fichier brut (image déjà convertie en WebP par le navigateur, ou PDF).
// Réponse : { url } à enregistrer dans le champ du formulaire.
import { BlobError } from '@vercel/blob';
import { requireAdmin } from '../lib/auth.js';
import { MAX_BYTES, store } from '../lib/storage.js';

const FOLDERS = ['profile', 'projects', 'documents'];

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) throw Object.assign(new Error('Fichier trop lourd : 4 Mo maximum.'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  if (!(await requireAdmin(req, res))) return;

  const folder = FOLDERS.includes(req.query.folder) ? req.query.folder : 'projects';
  try {
    if (Number(req.headers['content-length']) > MAX_BYTES) {
      return res.status(413).json({ error: 'Fichier trop lourd : 4 Mo maximum.' });
    }
    // Corps déjà lu par la plateforme : on le reprend tel quel
    const buffer = Buffer.isBuffer(req.body) ? req.body : await readBody(req);
    if (buffer.length > MAX_BYTES) return res.status(413).json({ error: 'Fichier trop lourd : 4 Mo maximum.' });
    if (!buffer.length) return res.status(400).json({ error: 'Fichier vide.' });
    const url = await store(buffer, { name: req.query.name, folder });
    return res.status(201).json({ url });
  } catch (err) {
    if (err.status === 413) return res.status(413).json({ error: err.message });
    if (err.message === 'Type de fichier non accepté.') {
      return res.status(415).json({ error: 'Formats acceptés : WebP, JPEG, PNG et PDF.' });
    }
    console.error('api/upload', err);
    // Erreur de Vercel Blob (clé, store, accès…) : message transmis tel quel, seul l'admin connecté le voit
    if (err instanceof BlobError) return res.status(502).json({ error: err.message });
    return res.status(500).json({ error: err.message.startsWith('Stockage') ? err.message : 'Envoi impossible.' });
  }
}
