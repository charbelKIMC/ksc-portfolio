// Lecture et modification du contenu depuis l'espace admin.
// Chaque ressource décrit ses champs : nom côté formulaire → colonne SQL + règle de validation (zod).
// Les éléments liés (galerie d'un projet, compétences d'un groupe) sont écrits dans la même requête SQL
// que leur parent : une modification est enregistrée en entier ou pas du tout.
import { z } from 'zod';
import { query } from './db.js';

// --- Règles de validation -------------------------------------------------------------------------

const MAX = n => [n, `${n} caractères maximum`];
const required = n => z.string({ error: 'Champ obligatoire' }).trim().min(1, 'Champ obligatoire').max(...MAX(n));
const text = n => z.string().trim().max(...MAX(n)).default('');
const optional = n => z.string().trim().max(...MAX(n)).nullable().optional().transform(v => v || null);
const lines = (items, n) => z.array(z.string().trim().max(...MAX(n))).max(items, `${items} éléments maximum`)
  .default([]).transform(a => a.filter(Boolean));
const flag = z.boolean().default(false);
const pattern = (re, message, n = 500) => optional(n).refine(v => !v || re.test(v), message);
const link = pattern(/^https:\/\/\S+$/, 'Lien attendu : https://…');
const image = pattern(/^(https:\/\/\S+|(img|uploads)\/[\w./-]+)$/, 'Chemin img/… ou lien https://…');
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mois attendu : AAAA-MM');

// --- Ressources -----------------------------------------------------------------------------------

const field = (col, schema, { cast = '', select } = {}) => ({ col, schema, cast, select: select ?? col });

const RESOURCES = {
  profile: {
    table: 'profile',
    singleton: true,
    fields: {
      givenNames: field('given_names', required(80)),
      firstName: field('first_name', required(40)),
      lastName: field('last_name', required(40)),
      location: field('location', text(80)),
      statusText: field('status_text', text(80)),
      available: field('available', flag),
      intro: field('intro', text(600)),
      aboutTitle: field('about_title', text(160)),
      about: field('about', lines(10, 1500)),
      goal: field('goal', text(400)),
      email: field('email', required(160).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'E-mail invalide')),
      photoUrl: field('photo_url', image),
      cvUrl: field('cv_url', pattern(/^(https:\/\/\S+|[\w./-]+\.pdf)$/, 'Lien https://… ou fichier .pdf')),
      contactTitle: field('contact_title', text(160))
    }
  },

  projects: {
    table: 'projects',
    ordered: true,
    fields: {
      slug: field('slug', required(60).regex(/^[a-z0-9-]+$/, 'Minuscules, chiffres et tirets uniquement')),
      title: field('title', required(80)),
      kind: field('kind', text(80)),
      badge: field('badge', optional(30)),
      year: field('year', optional(10)),
      cats: field('categories', lines(8, 30)),
      img: field('cover_url', image),
      logo: field('cover_is_logo', flag),
      tag: field('tagline', text(200)),
      summary: field('summary', text(400)),
      about: field('about', lines(10, 2000)),
      features: field('features', lines(30, 300)),
      stepsTitle: field('steps_title', optional(80)),
      steps: field('steps', z.array(z.object({ title: required(60), text: text(300) })).max(12).default([]), { cast: '::jsonb' }),
      role: field('role', optional(1000)),
      stack: field('stack', lines(30, 40)),
      facts: field('facts', z.array(z.object({ label: required(40), value: required(160) })).max(12).default([]), { cast: '::jsonb' }),
      demo: field('demo_url', link),
      code: field('code_url', link),
      featured: field('featured', flag),
      published: field('published', flag)
    },
    child: {
      key: 'gallery',
      table: 'project_images',
      fk: 'project_id',
      schema: z.array(z.object({
        src: image.refine(Boolean, 'Image obligatoire'),
        caption: text(200),
        logo: flag
      })).max(20).default([]),
      recordset: 'url text, caption text, is_logo boolean, position int',
      toRows: list => list.map((g, i) => ({ url: g.src, caption: g.caption, is_logo: g.logo, position: i })),
      aggregate: `jsonb_agg(jsonb_build_object('src', c.url, 'caption', c.caption, 'logo', c.is_logo) order by c.position, c.id)`
    }
  },

  services: {
    table: 'services',
    ordered: true,
    fields: {
      tag: field('tag', text(30)),
      title: field('title', required(100)),
      description: field('description', text(600))
    }
  },

  experiences: {
    table: 'experiences',
    order: 'start_date desc, id',
    fields: {
      role: field('role', required(120)),
      company: field('company', required(120)),
      location: field('location', text(80)),
      start: field('start_date', month, { cast: '::date', select: "to_char(start_date, 'YYYY-MM')" }),
      end: field('end_date', month.nullable().optional().or(z.literal('')).transform(v => v || null),
        { cast: '::date', select: "to_char(end_date, 'YYYY-MM')" }),
      months: field('duration_months', z.coerce.number({ error: 'Nombre attendu' }).int('Nombre entier attendu').min(1, '1 mois minimum').max(600)),
      tasks: field('tasks', lines(15, 300))
    },
    check: d => (d.end && d.end < d.start ? { end: 'La fin doit être après le début' } : null),
    toDb: d => ({ ...d, start: `${d.start}-01`, end: d.end ? `${d.end}-01` : null })
  },

  skills: {
    table: 'skill_groups',
    ordered: true,
    fields: {
      name: field('name', required(60)),
      kind: field('kind', z.enum(['tech', 'soft'], { error: 'Type inconnu' }).default('tech'))
    },
    child: {
      key: 'skills',
      table: 'skills',
      fk: 'group_id',
      schema: lines(60, 60),
      recordset: 'name text, position int',
      toRows: list => list.map((name, i) => ({ name, position: i })),
      aggregate: 'jsonb_agg(c.name order by c.position, c.id)'
    }
  },

  socials: {
    table: 'social_links',
    ordered: true,
    fields: {
      label: field('label', required(80)),
      url: field('url', required(300).regex(/^(https:\/\/|mailto:|tel:)\S+$/, 'Lien https://, mailto: ou tel:'))
    }
  }
};

export const RESOURCE_NAMES = Object.keys(RESOURCES);

export class ValidationError extends Error {
  constructor(fields) {
    super('Certains champs sont invalides.');
    this.fields = fields;
  }
}

export class NotFoundError extends Error {}

function resource(name) {
  const r = RESOURCES[name];
  if (!r) throw new NotFoundError(`Ressource inconnue : ${name}`);
  return r;
}

function validate(r, body) {
  const shape = Object.fromEntries(Object.entries(r.fields).map(([k, f]) => [k, f.schema]));
  if (r.child) shape[r.child.key] = r.child.schema;
  const result = z.object(shape).safeParse(body ?? {});
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) fields[issue.path.join('.')] ??= issue.message;
    throw new ValidationError(fields);
  }
  const problems = r.check?.(result.data);
  if (problems) throw new ValidationError(problems);
  return r.toDb ? r.toDb(result.data) : result.data;
}

// --- Lecture -------------------------------------------------------------------------------------

function selectSql(r, where = '') {
  const cols = Object.entries(r.fields).map(([k, f]) => `${f.select === f.col ? `t.${f.col}` : f.select} as "${k}"`);
  if (r.child) {
    const c = r.child;
    cols.push(`coalesce((select ${c.aggregate} from ${c.table} c where c.${c.fk} = t.id), '[]'::jsonb) as "${c.key}"`);
  }
  const extra = r.ordered ? ', t.position' : '';
  return `select t.id${extra}, ${cols.join(', ')} from ${r.table} t ${where}
          order by ${r.order ?? (r.ordered ? 'position, id' : 'id')}`;
}

export async function list(name) {
  const r = resource(name);
  return query(selectSql(r));
}

export async function get(name, id) {
  const r = resource(name);
  const [row] = await query(selectSql(r, 'where t.id = $1'), [r.singleton ? 1 : id]);
  if (!row) throw new NotFoundError('Élément introuvable.');
  return row;
}

// --- Écriture ------------------------------------------------------------------------------------

// Valeurs des colonnes, dans l'ordre des champs, à partir de $start
function columns(r, data, start = 1) {
  return Object.entries(r.fields).map(([k, f], i) => ({
    col: f.col,
    param: `$${start + i}${f.cast}`,
    value: f.cast === '::jsonb' ? JSON.stringify(data[k]) : data[k]
  }));
}

// Requête qui remplace les éléments liés du parent « p » (CTE) ; renvoie [sql, valeur du paramètre]
function childSql(r, data, n, { replace }) {
  const c = r.child;
  const del = replace ? `, d as (delete from ${c.table} where ${c.fk} in (select id from p))` : '';
  const names = c.recordset.split(',').map(s => s.trim().split(' ')[0]);
  return [
    `${del}, ch as (insert into ${c.table} (${c.fk}, ${names.join(', ')})
       select p.id, ${names.map(x => `x.${x}`).join(', ')} from p, jsonb_to_recordset($${n}::jsonb) as x(${c.recordset}))`,
    JSON.stringify(c.toRows(data[c.key]))
  ];
}

export async function create(name, body) {
  const r = resource(name);
  if (r.singleton) throw new NotFoundError('Création impossible pour cette ressource.');
  const data = validate(r, body);
  const cols = columns(r, data);
  const values = cols.map(c => c.value);
  const position = r.ordered ? `, (select coalesce(max(position) + 1, 0) from ${r.table})` : '';
  let sql = `with p as (insert into ${r.table} (${cols.map(c => c.col).join(', ')}${r.ordered ? ', position' : ''})
             values (${cols.map(c => c.param).join(', ')}${position}) returning id)`;
  if (r.child) {
    const [extra, value] = childSql(r, data, values.length + 1, { replace: false });
    sql += extra;
    values.push(value);
  }
  const [{ id }] = await query(`${sql} select id from p`, values);
  return get(name, id);
}

export async function update(name, id, body) {
  const r = resource(name);
  const data = validate(r, body);
  const cols = columns(r, data);
  const values = cols.map(c => c.value);
  const stamp = ['projects', 'profile'].includes(name) ? ', updated_at = now()' : '';
  values.push(r.singleton ? 1 : id);
  let sql = `with p as (update ${r.table} set ${cols.map(c => `${c.col} = ${c.param}`).join(', ')}${stamp}
             where id = $${values.length} returning id)`;
  if (r.child) {
    const [extra, value] = childSql(r, data, values.length + 1, { replace: true });
    sql += extra;
    values.push(value);
  }
  const rows = await query(`${sql} select id from p`, values);
  if (!rows.length) throw new NotFoundError('Élément introuvable.');
  return get(name, rows[0].id);
}

export async function remove(name, id) {
  const r = resource(name);
  if (r.singleton) throw new NotFoundError('Suppression impossible pour cette ressource.');
  const rows = await query(`delete from ${r.table} where id = $1 returning id`, [id]);
  if (!rows.length) throw new NotFoundError('Élément introuvable.');
}

// Nouvel ordre d'affichage : ids dans l'ordre voulu
export async function reorder(name, ids) {
  const r = resource(name);
  if (!r.ordered) throw new NotFoundError('Cette ressource se trie automatiquement.');
  if (!Array.isArray(ids) || !ids.every(Number.isInteger)) throw new ValidationError({ order: 'Liste d\'identifiants attendue' });
  await query(`update ${r.table} t set position = x.pos - 1
               from unnest($1::int[]) with ordinality as x(id, pos) where t.id = x.id`, [ids]);
  return list(name);
}
