// Remplit une base vide avec un contenu au format FALLBACK (public/js/data.js).
// query(text, params) doit renvoyer un tableau de lignes : voir lib/db.js.

import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Lit public/js/data.js (script navigateur) et renvoie l'objet FALLBACK.
export async function loadFallback() {
  const code = await readFile(new URL('../public/js/data.js', import.meta.url), 'utf8');
  return vm.runInNewContext(`${code}\nFALLBACK;`);
}

// Instructions de db/schema.sql, une par élément (le pilote HTTP de Neon n'en exécute qu'une à la fois).
export async function loadSchema() {
  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  return sql.split(/;\s*\n/).map(s => s.trim()).filter(s => s.replace(/--.*$/gm, '').trim());
}

const monthDate = ym => (ym ? `${ym}-01` : null);

export async function seed(query, c) {
  const p = c.profile;
  await query(
    `insert into profile (id, given_names, first_name, last_name, location, status_text, available, intro,
                          about_title, about, goal, email, photo_url, cv_url, contact_title)
     values (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [p.givenNames, p.firstName, p.lastName, p.location, p.statusText, p.available, p.intro,
     p.aboutTitle, p.about, p.goal, p.email, p.photoUrl, p.cvUrl, p.contactTitle]
  );

  for (const [i, r] of c.projects.entries()) {
    const [{ id }] = await query(
      `insert into projects (slug, title, kind, badge, year, categories, cover_url, cover_is_logo, tagline, summary,
                             about, features, steps_title, steps, role, stack, facts, demo_url, code_url, featured, position)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16, $17::jsonb, $18, $19, $20, $21)
       returning id`,
      [r.id, r.title, r.kind, r.badge, r.year, r.cats, r.img, r.logo, r.tag, r.summary,
       r.about, r.features, r.stepsTitle, JSON.stringify(r.steps), r.role, r.stack, JSON.stringify(r.facts),
       r.demo, r.code, r.featured, i]
    );
    for (const [j, g] of r.gallery.entries()) {
      await query('insert into project_images (project_id, url, caption, is_logo, position) values ($1, $2, $3, $4, $5)',
        [id, g.src, g.caption, g.logo, j]);
    }
  }

  for (const [i, s] of c.services.entries()) {
    await query('insert into services (tag, title, description, position) values ($1, $2, $3, $4)',
      [s.tag, s.title, s.description, i]);
  }

  for (const e of c.experiences) {
    await query(
      `insert into experiences (role, company, location, start_date, end_date, duration_months, tasks)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [e.role, e.company, e.location, monthDate(e.start), monthDate(e.end), e.months, e.tasks]
    );
  }

  for (const [i, g] of c.skillGroups.entries()) {
    const [{ id }] = await query('insert into skill_groups (name, kind, position) values ($1, $2, $3) returning id',
      [g.name, g.kind, i]);
    for (const [j, name] of g.skills.entries()) {
      await query('insert into skills (group_id, name, position) values ($1, $2, $3)', [id, name, j]);
    }
  }

  for (const [i, s] of c.socials.entries()) {
    await query('insert into social_links (label, url, position) values ($1, $2, $3)', [s.label, s.url, i]);
  }
}
