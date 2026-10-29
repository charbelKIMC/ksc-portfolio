// Crée les tables puis les remplit avec le contenu de public/js/data.js si la base est vide.
//   npm run db:setup   → crée ce qui manque, ne touche pas à une base déjà remplie
//   npm run db:reset   → EFFACE tout le contenu de la base puis la remplit de nouveau
import { query } from '../lib/db.js';
import { loadFallback, loadSchema, seed } from '../db/seed.js';

const reset = process.argv.includes('--reset');

for (const statement of await loadSchema()) await query(statement);
console.log('Tables prêtes.');

if (reset) {
  await query(`truncate profile, projects, project_images, services, experiences, skill_groups, skills, social_links
               restart identity cascade`);
  console.log('Contenu effacé.');
}

const [{ n }] = await query('select count(*)::int as n from profile');
if (n > 0) {
  console.log('La base contient déjà un profil : rien à importer (npm run db:reset pour tout réimporter).');
} else {
  await seed(query, await loadFallback());
  console.log('Contenu importé depuis public/js/data.js.');
}
