// Envoi de fichiers depuis l'admin.
// Les images sont réduites puis converties en WebP dans le navigateur avant l'envoi : rapide, léger,
// et rien d'autre à installer. Les PDF (CV) partent tels quels.

const MAX_BYTES = 4 * 1024 * 1024;   // même limite que le serveur (lib/storage.js)

const toBlob = (canvas, type, quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality));

// Image choisie → WebP de maxWidth px de large au plus (JPEG si le navigateur ne sait pas encoder le WebP, ex. Safari)
export async function prepareImage(file, maxWidth = 1600) {
  if (!file.type.startsWith('image/')) throw new Error('Choisis une image (JPG, PNG, WebP…).');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Image illisible. Essaie un fichier JPG ou PNG.');
  }
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let blob = await toBlob(canvas, 'image/webp', 0.82);
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.85);
  if (!blob) throw new Error('Conversion impossible.');
  if (blob.size > MAX_BYTES) throw new Error('Image trop lourde même après réduction (4 Mo maximum).');
  return blob;
}

export function preparePdf(file) {
  if (file.type !== 'application/pdf') throw new Error('Choisis un fichier PDF.');
  if (file.size > MAX_BYTES) throw new Error('PDF trop lourd : 4 Mo maximum.');
  return file;
}

// Envoie le fichier et renvoie son adresse (https://… sur Vercel, uploads/… en local)
export async function uploadFile(blob, { name, folder }) {
  const res = await fetch(`/api/upload?folder=${encodeURIComponent(folder)}&name=${encodeURIComponent(name)}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data.url;
}
