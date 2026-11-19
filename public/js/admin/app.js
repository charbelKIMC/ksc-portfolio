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

// --- Tableau de bord : contenu, visites du site et connexions à l'admin ---------------------------

const fmtDate = iso => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtDay = day => new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const countryName = code => { try { return new Intl.DisplayNames(['fr'], { type: 'region' }).of(code); } catch { return code; } };
const DEVICES = { desktop: 'Ordinateur', mobile: 'Mobile', tablet: 'Tablette' };

const pageName = path => path === '/' ? 'Accueil'
  : path === '/tous-les-projets' ? 'Tous les projets'
  : path.startsWith('/projets/') ? `Projet · ${path.slice(9)}` : path;

// « Chrome · Windows » à partir de l'identifiant du navigateur
function deviceName(ua) {
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navigateur inconnu';
  const os = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android'
    : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return [browser, os].filter(Boolean).join(' · ');
}

// Liste avec barres proportionnelles (pages, sources, pays, appareils)
const ranking = (title, rows, label = r => r.name) => `
  <section class="panel">
    <h3>${esc(title)}</h3>
    ${rows.length ? `<ul class="ranking">${rows.map(r => `
      <li><span class="bar" style="--w:${Math.round(r.views / rows[0].views * 100)}%"></span>
        <span class="name">${esc(label(r))}</span><b>${r.views}</b></li>`).join('')}</ul>`
      : '<p class="empty">Pas encore de données.</p>'}
  </section>`;

const loginRows = rows => rows.length ? `<ul class="log">${rows.map(r => `
  <li><time>${esc(fmtDate(r.at))}</time><span>${esc(deviceName(r.userAgent))}</span><code>${esc(r.ip)}</code></li>`).join('')}</ul>`
  : '<p class="empty">Aucune pour l’instant.</p>';

let dashboardDays = 30;

async function renderDashboard(body) {
  const [c, a] = await Promise.all([api('/api/content'), api(`/api/admin/activity?days=${dashboardDays}`)]);
  const counts = [
    ['projects', c.projects.length, 'projets publiés'],
    ['services', c.services.length, 'services'],
    ['experiences', c.experiences.length, 'expériences'],
    ['skills', c.skillGroups.reduce((n, g) => n + g.skills.length, 0), 'compétences'],
    ['socials', c.socials.length, 'liens de contact']
  ];
  const v = a.visits;
  const peak = Math.max(1, ...v.series.map(d => d.views));
  body.innerHTML = `
    <div class="stats">${counts.map(([id, n, label]) =>
      `<a class="stat" href="#${id}"><b>${n}</b><span>${esc(label)}</span></a>`).join('')}</div>
    <p class="hint">Après un enregistrement, le site public se met à jour en moins d'une minute.</p>

    <div class="dash-head">
      <h2>Visites du site</h2>
      <div class="period" role="group" aria-label="Période">${[7, 30, 90].map(d =>
        `<button type="button" data-days="${d}" aria-pressed="${d === a.days}">${d} jours</button>`).join('')}</div>
    </div>
    <div class="stats">
      <div class="stat"><b>${v.visitors}</b><span>visiteurs</span></div>
      <div class="stat"><b>${v.views}</b><span>pages vues</span></div>
      <div class="stat"><b>${v.visitors ? (v.views / v.visitors).toFixed(1).replace('.', ',') : '0'}</b><span>pages par visiteur</span></div>
    </div>
    <section class="panel">
      <h3>Pages vues par jour</h3>
      <div class="chart" role="img" aria-label="Pages vues par jour sur ${a.days} jours">${v.series.map(d =>
        `<span style="--h:${Math.round(d.views / peak * 100)}%" title="${esc(fmtDay(d.day))} : ${d.views} page${d.views > 1 ? 's' : ''} vue${d.views > 1 ? 's' : ''}, ${d.visitors} visiteur${d.visitors > 1 ? 's' : ''}"></span>`).join('')}</div>
      <div class="chart-axis"><span>${esc(fmtDay(v.series[0].day))}</span><span>Aujourd'hui</span></div>
    </section>
    <div class="panels">
      ${ranking('Pages les plus vues', v.pages, r => pageName(r.name))}
      ${ranking('Provenance', v.sources)}
      ${ranking('Pays', v.countries, r => r.name === 'Inconnu' ? r.name : countryName(r.name))}
      ${ranking('Appareils', v.devices, r => DEVICES[r.name] || r.name)}
    </div>
    <p class="hint">Sans cookie et sans adresse IP : un visiteur est compté une fois par jour. Les robots sont ignorés.</p>

    <div class="dash-head"><h2>Connexions à l'admin</h2></div>
    <div class="panels">
      <section class="panel">
        <h3>Dernières connexions réussies</h3>
        ${loginRows(a.logins)}
      </section>
      <section class="panel${a.failures.count ? ' warn' : ''}">
        <h3>Tentatives échouées <small>${a.failures.count} sur ${a.days} jours</small></h3>
        ${loginRows(a.failures.recent)}
      </section>
    </div>
    <p class="hint">Une connexion que tu ne reconnais pas ? Change ton mot de passe et la clé JWT_SECRET dans Vercel.</p>`;

  body.querySelector('.period').onclick = e => {
    const b = e.target.closest('[data-days]');
    if (!b) return;
    dashboardDays = Number(b.dataset.days);
    renderDashboard(body).catch(err => toast(err.message, 'error'));
  };
}

async function renderList(name, body) {
  const s = SECTIONS[name];
  const items = await api(`/api/admin/${name}`);
  body.innerHTML = `
    <div class="list-head">
      <p class="muted">${items.length} élément${items.length > 1 ? 's' : ''}${s.ordered ? ' · même ordre que sur le site' : ''}${s.note ? `. ${esc(s.note)}` : ''}</p>
      <a class="btn primary" href="#${name}/new">Ajouter ${esc(s.one)}</a>
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
      if (del && await askConfirm({
        title: `Supprimer « ${del.dataset.label} » ?`,
        text: 'Cette action est définitive : l\'élément disparaîtra aussi du site.',
        ok: 'Supprimer',
        danger: true
      })) {
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

// Fenêtre de confirmation : renvoie true si l'admin valide, false s'il annule (bouton, Échap ou clic à côté)
// danger : bouton de validation en rouge, pour les actions définitives
function askConfirm({ title, text, ok, danger = false }) {
  const dialog = $('confirm-dialog');
  $('confirm-title').textContent = title;
  $('confirm-text').textContent = text;
  $('confirm-ok').textContent = ok;
  $('confirm-ok').classList.toggle('danger-fill', danger);
  dialog.returnValue = '';
  dialog.showModal();
  // Réponse lue au clic (submit), sans attendre l'événement close qui peut arriver en retard ;
  // close reste la voie de sortie pour Échap et le clic à côté.
  const form = dialog.querySelector('form');
  return new Promise(resolve => {
    const finish = confirmed => {
      form.removeEventListener('submit', onSubmit);
      dialog.removeEventListener('close', onClose);
      resolve(confirmed);
    };
    const onSubmit = e => finish(e.submitter?.value === 'ok');
    const onClose = () => finish(dialog.returnValue === 'ok');
    form.addEventListener('submit', onSubmit);
    dialog.addEventListener('close', onClose);
  });
}
$('confirm-dialog').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

$('logout').addEventListener('click', async () => {
  const confirmed = await askConfirm({
    title: 'Se déconnecter ?',
    text: dirty
      ? 'Tes modifications ne sont pas enregistrées : elles seront perdues.'
      : 'Tu devras te reconnecter pour modifier le contenu du portfolio.',
    ok: 'Se déconnecter'
  });
  if (!confirmed) return;
  setMenu(false);
  await api('/api/auth', { method: 'DELETE' }).catch(() => {});
  showLogin();
});

// Au chargement : déjà connecté ?
api('/api/auth')
  .then(s => (s.authenticated ? showApp(s) : showLogin()))
  .catch(() => showLogin('Serveur injoignable. Réessaie dans un instant.'));
