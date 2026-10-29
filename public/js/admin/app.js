// Espace admin : connexion, navigation, listes et formulaires de chaque section.
// Adresses : #dashboard, #profile, #projects (liste), #projects/new (création), #projects/12 (modification)
import { SECTIONS } from './sections.js';
import { bindForm, esc, formHTML, readForm, showErrors, slugify } from './forms.js';

const $ = id => document.getElementById(id);
const SAVED = 'Enregistré. Le site sera à jour d\'ici une minute.';

// Appel à l'API : renvoie le JSON, ou lève une erreur avec le message (et les champs en erreur) du serveur
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/auth') showLogin('Ta session a expiré, reconnecte-toi.');
  if (!res.ok) throw Object.assign(new Error(data.error || `Erreur ${res.status}`), { status: res.status, fields: data.fields });
  return data;
}

const NAV = [['dashboard', 'Tableau de bord'], ...Object.entries(SECTIONS).map(([id, s]) => [id, s.title])];

let expiryTimer, toastTimer;
let dirty = false;        // formulaire modifié et pas encore enregistré
let currentHash = '';

function toast(message, kind = 'ok') {
  const el = $('toast');
  el.textContent = message;
  el.className = `toast ${kind}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
}

function showLogin(message = '') {
  clearTimeout(expiryTimer);
  dirty = false;
  $('app').hidden = true;
  $('login').hidden = false;
  $('login-error').textContent = message;
  $('login-error').hidden = !message;
  $('login-form').email.focus();
}

function showApp(session) {
  $('login').hidden = true;
  $('app').hidden = false;
  $('who').textContent = session.email;
  // Retour à l'écran de connexion quand la session de 8 h expire
  clearTimeout(expiryTimer);
  expiryTimer = setTimeout(() => showLogin('Ta session a expiré, reconnecte-toi.'), Math.max(0, session.expiresAt - Date.now()));
  route();
}

// --- Vues ----------------------------------------------------------------------------------------

async function renderDashboard(body) {
  const c = await api('/api/content');
  const counts = [
    ['projects', c.projects.length, 'projets publiés'],
    ['services', c.services.length, 'services'],
    ['experiences', c.experiences.length, 'expériences'],
    ['skills', c.skillGroups.reduce((n, g) => n + g.skills.length, 0), 'compétences'],
    ['socials', c.socials.length, 'liens de contact']
  ];
  body.innerHTML = `
    <div class="stats">${counts.map(([id, n, label]) =>
      `<a class="stat" href="#${id}"><b>${n}</b><span>${esc(label)}</span></a>`).join('')}</div>
    <p class="muted small" style="margin-top:20px">Après un enregistrement, le site public se met à jour en moins d'une minute.</p>`;
}

async function renderList(name, body) {
  const s = SECTIONS[name];
  const items = await api(`/api/admin/${name}`);
  body.innerHTML = `
    <div class="list-head">
      <p class="muted">${items.length} élément${items.length > 1 ? 's' : ''}${s.ordered ? ' · même ordre que sur le site' : ''}${s.note ? `. ${esc(s.note)}` : ''}</p>
      <a class="btn primary" href="#${name}/new">+ Ajouter ${esc(s.one)}</a>
    </div>
    ${items.length ? `<ul class="items">${items.map((item, i) => {
      const v = s.summary(item);
      return `<li class="item">
        <div class="item-main">
          <a class="item-title" href="#${name}/${item.id}">${esc(v.title)}</a>
          ${v.badges.map(b => `<span class="badge${b === 'Brouillon' ? ' draft' : ''}">${esc(b)}</span>`).join('')}
          ${v.sub ? `<span class="item-sub">${esc(v.sub)}</span>` : ''}
        </div>
        <div class="item-actions">
          ${s.ordered ? `<button class="icon" type="button" data-move="-1" data-index="${i}" aria-label="Monter"${i === 0 ? ' disabled' : ''}>↑</button>
          <button class="icon" type="button" data-move="1" data-index="${i}" aria-label="Descendre"${i === items.length - 1 ? ' disabled' : ''}>↓</button>` : ''}
          ${v.link ? `<a class="btn small" href="${esc(v.link)}" target="_blank" rel="noopener">Voir ↗</a>` : ''}
          <a class="btn small" href="#${name}/${item.id}">Modifier</a>
          <button class="btn small danger" type="button" data-delete="${item.id}" data-label="${esc(v.title)}">Supprimer</button>
        </div>
      </li>`;
    }).join('')}</ul>` : '<p class="notice">Rien pour l\'instant.</p>'}`;

  body.onclick = async e => {
    const move = e.target.closest('[data-move]');
    const del = e.target.closest('[data-delete]');
    try {
      if (move) {
        const ids = items.map(it => it.id);
        const i = Number(move.dataset.index), j = i + Number(move.dataset.move);
        [ids[i], ids[j]] = [ids[j], ids[i]];
        await api(`/api/admin/${name}`, { method: 'PATCH', body: { order: ids } });
        await renderList(name, body);
        body.querySelector(`[data-index="${j}"][data-move="${move.dataset.move}"]`)?.focus();
        toast(SAVED);
      }
      if (del && confirm(`Supprimer « ${del.dataset.label} » ? Cette action est définitive.`)) {
        await api(`/api/admin/${name}?id=${del.dataset.delete}`, { method: 'DELETE' });
        await renderList(name, body);
        toast('Supprimé.');
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  };
}

async function renderForm(name, id, body) {
  const s = SECTIONS[name];
  const isNew = id === 'new';
  const values = s.singleton ? await api(`/api/admin/${name}`)
    : isNew ? { ...s.empty } : await api(`/api/admin/${name}?id=${id}`);
  if (!s.singleton) $('section-title').textContent = isNew ? `${s.title} · nouveau` : `${s.title} · ${s.summary(values).title}`;

  body.innerHTML = `
    ${s.singleton ? '' : `<a class="back-link" href="#${name}">← ${esc(s.title)}</a>`}
    <form id="edit-form" class="edit" novalidate>
      ${formHTML(s.groups, values)}
      <div class="form-actions">
        <button class="btn primary" type="submit">${isNew ? 'Créer' : 'Enregistrer'}</button>
        ${s.singleton ? '' : `<a class="btn" href="#${name}">Annuler</a>`}
      </div>
    </form>`;

  const form = $('edit-form');
  bindForm(form, s.groups);
  form.addEventListener('input', () => { dirty = true; });

  // Nouveau projet : l'adresse suit le titre tant qu'elle n'a pas été modifiée à la main
  if (name === 'projects' && isNew) {
    let slugEdited = false;
    form.slug.addEventListener('input', () => { slugEdited = true; });
    form.title.addEventListener('input', () => { if (!slugEdited) form.slug.value = slugify(form.title.value); });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    showErrors(form);
    try {
      const data = readForm(form, s.groups);
      const saved = s.singleton ? await api(`/api/admin/${name}`, { method: 'PUT', body: data })
        : isNew ? await api(`/api/admin/${name}`, { method: 'POST', body: data })
        : await api(`/api/admin/${name}?id=${id}`, { method: 'PUT', body: data });
      dirty = false;
      toast(SAVED);
      if (!s.singleton) location.hash = name;
      else if (saved) renderForm(name, null, body);
    } catch (err) {
      showErrors(form, err.fields);
      toast(err.message, 'error');
    } finally {
      button.disabled = false;
    }
  });
}

function route() {
  if ($('app').hidden) return;
  // Quitter un formulaire non enregistré : demander confirmation
  if (dirty && location.hash !== currentHash) {
    if (!confirm('Tes modifications ne sont pas enregistrées. Quitter quand même ?')) {
      history.replaceState(null, '', currentHash);
      return;
    }
    dirty = false;
  }
  currentHash = location.hash;

  const [name = 'dashboard', id] = location.hash.slice(1).split('/');
  const section = SECTIONS[name];
  const current = section ? name : 'dashboard';
  $('sections').innerHTML = NAV.map(([key, title]) =>
    `<a href="#${key}"${key === current ? ' aria-current="page"' : ''}>${esc(title)}</a>`).join('');
  $('section-title').textContent = section ? section.title : 'Tableau de bord';

  const body = $('section-body');
  body.onclick = null;
  body.innerHTML = '<p class="muted">Chargement…</p>';
  const view = !section ? renderDashboard(body)
    : section.singleton || id ? renderForm(name, id, body)
    : renderList(name, body);
  view.catch(err => { body.innerHTML = `<p class="error">${esc(err.message)}</p>`; });
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
window.addEventListener('beforeunload', e => { if (dirty) e.preventDefault(); });

// Menu hamburger (mobile) : se ferme au choix d'une section, avec Échap ou en touchant à côté
function setMenu(open) {
  $('side').classList.toggle('open', open);
  $('menu-btn').setAttribute('aria-expanded', String(open));
  $('menu-btn').setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
}
$('menu-btn').addEventListener('click', () => setMenu(!$('side').classList.contains('open')));
$('sections').addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
document.addEventListener('click', e => { if (!e.target.closest('#side')) setMenu(false); });

$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.currentTarget;
  const button = form.querySelector('button');
  const email = form.email.value.trim(), password = form.password.value;
  if (!email || !password) return showLogin('Renseigne ton e-mail et ton mot de passe.');
  button.disabled = true;
  try {
    const session = await api('/api/auth', { method: 'POST', body: { email, password } });
    form.reset();
    showApp(session);
  } catch (err) {
    form.password.value = '';
    showLogin(err.message);
  } finally {
    button.disabled = false;
  }
});

$('logout').addEventListener('click', async () => {
  if (dirty && !confirm('Tes modifications ne sont pas enregistrées. Te déconnecter quand même ?')) return;
  await api('/api/auth', { method: 'DELETE' }).catch(() => {});
  showLogin();
});

// Au chargement : déjà connecté ?
api('/api/auth')
  .then(s => (s.authenticated ? showApp(s) : showLogin()))
  .catch(() => showLogin('Serveur injoignable. Réessaie dans un instant.'));
