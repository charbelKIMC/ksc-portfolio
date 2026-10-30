-- Schéma de la base du portfolio (PostgreSQL / Neon).
-- Chaque instruction se termine par « ; » en fin de ligne : scripts/setup-db.js les exécute une par une.

-- Profil : une seule ligne (id = 1). Textes de l'en-tête, de « À propos » et du contact.
create table if not exists profile (
  id            smallint primary key default 1 check (id = 1),
  given_names   text not null,                  -- « Sètondji Charbel » (au-dessus du nom)
  first_name    text not null,
  last_name     text not null,
  location      text not null default '',
  status_text   text not null default '',       -- « ouvert aux opportunités »
  available     boolean not null default true,  -- point vert dans l'en-tête
  intro         text not null default '',       -- **texte** = gras
  about_title   text not null default '',
  about         text[] not null default '{}',   -- un élément par paragraphe
  goal          text not null default '',
  email         text not null,
  photo_url     text,
  cv_url        text,
  contact_title text not null default '',
  updated_at    timestamptz not null default now()
);

create table if not exists projects (
  id            serial primary key,
  slug          text not null unique check (slug ~ '^[a-z0-9-]+$'),  -- adresse : #claimora
  title         text not null,
  kind          text not null default '',
  badge         text,                           -- ancien statut en texte libre, remplacé par status
  status        text not null default 'done' check (status in ('in_progress', 'done')),
  year          text,
  categories    text[] not null default '{}',
  cover_url     text,
  cover_is_logo boolean not null default false,
  tagline       text not null default '',
  summary       text not null default '',
  about         text[] not null default '{}',
  features      text[] not null default '{}',
  steps_title   text,
  steps         jsonb not null default '[]',    -- [{ "title": "", "text": "" }]
  role          text,
  stack         text[] not null default '{}',
  facts         jsonb not null default '[]',    -- [{ "label": "", "value": "" }]
  demo_url      text,
  code_url      text,
  featured      boolean not null default false, -- affiché sur l'accueil
  published     boolean not null default true,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Statut des projets (octobre 2026) : « En cours » ou « Terminé » au lieu du texte libre badge.
-- Sur une base existante : ajoute la colonne, puis reprend les anciens badges (« En cours » → in_progress)
-- et les vide, pour que relancer db:setup ne change plus rien.
alter table projects add column if not exists status text not null default 'done' check (status in ('in_progress', 'done'));
update projects set status = case when lower(badge) like '%cours%' then 'in_progress' else status end, badge = null
where badge is not null;

create table if not exists project_images (
  id         serial primary key,
  project_id integer not null references projects(id) on delete cascade,
  url        text not null,
  caption    text not null default '',
  is_logo    boolean not null default false,
  position   integer not null default 0
);
create index if not exists project_images_project_idx on project_images (project_id, position);

create table if not exists services (
  id          serial primary key,
  tag         text not null default '',
  title       text not null,
  description text not null default '',
  position    integer not null default 0
);

-- Expériences : triées par date, la plus récente en premier.
create table if not exists experiences (
  id              serial primary key,
  role            text not null,
  company         text not null,
  location        text not null default '',
  start_date      date not null,               -- seul le mois compte
  end_date        date,                        -- vide = poste actuel
  duration_months integer not null check (duration_months > 0),
  tasks           text[] not null default '{}'
);

create table if not exists skill_groups (
  id       serial primary key,
  name     text not null,
  kind     text not null default 'tech' check (kind in ('tech', 'soft')),  -- soft = savoir-être
  position integer not null default 0
);

create table if not exists skills (
  id       serial primary key,
  group_id integer not null references skill_groups(id) on delete cascade,
  name     text not null,
  position integer not null default 0
);
create index if not exists skills_group_idx on skills (group_id, position);

create table if not exists social_links (
  id       serial primary key,
  label    text not null,
  url      text not null,
  position integer not null default 0
);

-- Utilisée à l'étape 2 (connexion) pour limiter les tentatives.
create table if not exists login_attempts (
  id         bigserial primary key,
  ip         text not null,
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_ip_idx on login_attempts (ip, created_at);
