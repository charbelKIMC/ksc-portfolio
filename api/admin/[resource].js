// /api/admin/:resource — modification du contenu, réservée à l'admin connecté.
//   resource : profile, projects, services, experiences, skills, socials
//   GET              → liste (ou le profil)
//   GET    ?id=12    → un élément
//   POST             → création
//   PUT    ?id=12    → modification (profil : sans id)
//   DELETE ?id=12    → suppression
//   PATCH  { order } → nouvel ordre d'affichage
import { requireAdmin } from '../../lib/auth.js';
import { create, get, list, remove, reorder, update, NotFoundError, ValidationError } from '../../lib/admin.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!(await requireAdmin(req, res))) return;

  const name = req.query.resource;
  const id = req.query.id === undefined ? null : Number(req.query.id);
  if (id !== null && !Number.isInteger(id)) return res.status(400).json({ error: 'Identifiant invalide' });
  const isProfile = name === 'profile';

  try {
    switch (req.method) {
      case 'GET':
        return res.status(200).json(isProfile || id !== null ? await get(name, id) : await list(name));
      case 'POST':
        return res.status(201).json(await create(name, req.body));
      case 'PUT':
        if (!isProfile && id === null) return res.status(400).json({ error: 'Identifiant manquant' });
        return res.status(200).json(await update(name, id, req.body));
      case 'DELETE':
        if (id === null) return res.status(400).json({ error: 'Identifiant manquant' });
        await remove(name, id);
        return res.status(200).json({ deleted: id });
      case 'PATCH':
        return res.status(200).json(await reorder(name, req.body?.order));
      default:
        res.setHeader('Allow', 'GET, POST, PUT, DELETE, PATCH');
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }
  } catch (err) {
    if (err instanceof ValidationError) return res.status(400).json({ error: err.message, fields: err.fields });
    if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
    if (err.code === '23505') return res.status(409).json({ error: 'Cette adresse est déjà utilisée par un autre projet.', fields: { slug: 'Déjà utilisée' } });
    console.error(`api/admin/${name}`, err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
