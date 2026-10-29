// Lecture du contenu public : transforme les lignes de la base au format attendu par public/js/main.js
// (le même que FALLBACK dans public/js/data.js).
// query(text, params) doit renvoyer un tableau de lignes : voir lib/db.js.

export async function getContent(query) {
  const [profiles, projects, images, services, experiences, groups, skills, socials] = await Promise.all([
    query('select * from profile where id = 1'),
    query('select * from projects where published order by position, id'),
    query('select * from project_images order by project_id, position, id'),
    query('select tag, title, description from services order by position, id'),
    query(`select role, company, location, to_char(start_date, 'YYYY-MM') as start, to_char(end_date, 'YYYY-MM') as "end",
                  duration_months as months, tasks
           from experiences order by start_date desc, id`),
    query('select id, name, kind from skill_groups order by position, id'),
    query('select group_id, name from skills order by position, id'),
    query('select label, url from social_links order by position, id')
  ]);

  const p = profiles[0];
  if (!p) throw new Error('Profil absent : lancer « npm run db:setup ».');

  return {
    profile: {
      givenNames: p.given_names,
      firstName: p.first_name,
      lastName: p.last_name,
      location: p.location,
      statusText: p.status_text,
      available: p.available,
      intro: p.intro,
      aboutTitle: p.about_title,
      about: p.about,
      goal: p.goal,
      email: p.email,
      photoUrl: p.photo_url,
      cvUrl: p.cv_url,
      contactTitle: p.contact_title
    },
    projects: projects.map(r => ({
      id: r.slug,
      seed: r.id,
      featured: r.featured,
      title: r.title,
      kind: r.kind,
      badge: r.badge,
      year: r.year,
      cats: r.categories,
      img: r.cover_url,
      logo: r.cover_is_logo,
      tag: r.tagline,
      summary: r.summary,
      about: r.about,
      features: r.features,
      stepsTitle: r.steps_title,
      steps: r.steps,
      role: r.role,
      stack: r.stack,
      gallery: images.filter(i => i.project_id === r.id).map(i => ({ src: i.url, caption: i.caption, logo: i.is_logo })),
      facts: r.facts,
      demo: r.demo_url,
      code: r.code_url
    })),
    services,
    experiences,
    skillGroups: groups.map(g => ({ name: g.name, kind: g.kind, skills: skills.filter(s => s.group_id === g.id).map(s => s.name) })),
    socials
  };
}
