// Stockage des fichiers envoyés depuis l'admin (images WebP, CV en PDF).
//   Avec BLOB_READ_WRITE_TOKEN : Vercel Blob, renvoie une adresse https://…public.blob.vercel-storage.com/…
//   Sans, en local seulement : dossier public/uploads/ (pour tester), renvoie « uploads/… »
import { put } from '@vercel/blob';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_BYTES = 4 * 1024 * 1024;   // sous la limite de 4,5 Mo des fonctions Vercel

// Type de fichier reconnu à ses premiers octets (on ne se fie pas au nom ni au Content-Type annoncé)
const TYPES = [
  { type: 'image/webp', ext: 'webp', test: b => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { type: 'image/jpeg', ext: 'jpg', test: b => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
  { type: 'image/png', ext: 'png', test: b => b.toString('hex', 0, 8) === '89504e470d0a1a0a' },
  { type: 'application/pdf', ext: 'pdf', test: b => b.toString('ascii', 0, 5) === '%PDF-' }
];

export function detectType(buffer) {
  return TYPES.find(t => buffer.length > 12 && t.test(buffer)) ?? null;
}

// « Capture Écran (2).PNG » → « capture-ecran-2 »
const baseName = name => String(name || 'fichier').replace(/\.[^.]*$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'fichier';

export async function store(buffer, { name, folder }) {
  const kind = detectType(buffer);
  if (!kind) throw new Error('Type de fichier non accepté.');
  const file = `${baseName(name)}.${kind.ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`portfolio/${folder}/${file}`, buffer, {
      access: 'public', contentType: kind.type, addRandomSuffix: true, cacheControlMaxAge: 31536000
    });
    return blob.url;
  }
  if (process.env.VERCEL) throw new Error('Stockage non configuré : variable BLOB_READ_WRITE_TOKEN manquante.');

  const dir = process.env.LOCAL_UPLOAD_DIR || fileURLToPath(new URL('../public/uploads/', import.meta.url));
  const unique = `${baseName(name)}-${randomBytes(4).toString('hex')}.${kind.ext}`;
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, unique), buffer);
  return `uploads/${unique}`;
}
