const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const chips = list => list.length ? `<div class="chips">${list.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : '';
const coverHTML = (p, cls) => p.img
  ? `<div class="${cls}${p.logo ? ' logo-cover' : ''}"><img src="${p.img}" alt="Visuel du projet ${esc(p.title)}" loading="lazy"></div>`
  : `<div class="${cls}"><canvas data-seed="${p.seed}" aria-hidden="true"></canvas></div>`;

const ICONS = {
  github: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1.2-1.6-2.2-1-1 1c-1.2-.5-2.4-1.7-2.9-2.9l1-1-1-2.2z" fill="currentColor" stroke-width="1"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.1V21h-4v-5.1c0-1.22-.02-2.79-1.7-2.79-1.7 0-1.96 1.33-1.96 2.7V21h-4z"/></svg>',
  web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9z"/></svg>',
  arrowLeft: '<svg class="icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  arrowRight: '<svg class="icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
};

// Statut d'un projet : « En cours » (jaune) ou « Terminé » (vert)
const STATUS = { in_progress: 'En cours', done: 'Terminé' };
const statusHTML = (p, cls) => `<span class="${cls} ${p.status === 'in_progress' ? 'progress' : 'done'}">${STATUS[p.status] || STATUS.done}</span>`;

const cardHTML = p => {
  const status = statusHTML(p, 'pc-status');
  const media = p.img
    ? `<img src="${p.img}" alt="" loading="lazy">`
    : `<canvas data-seed="${p.seed}" aria-hidden="true"></canvas>`;
  const code = p.code
    ? `<a class="code" href="${esc(p.code)}" target="_blank" rel="noopener">${ICONS.github}Code</a>`
    : (p.demo ? `<a class="code" href="${esc(p.demo)}" target="_blank" rel="noopener">Démo ${ICONS.web}</a>` : '');
  return `
  <article class="pcard">
    <div class="pc-media${p.logo ? ' logo-cover' : ''}">
      ${media}
      <span class="pc-cats">${esc(p.cats.join(' / '))}</span>
      ${status}
      <span class="pc-icon" aria-hidden="true">&lt;/&gt;</span>
    </div>
    <div class="pc-body">
      <h3><a href="#${p.id}">${esc(p.title)}</a></h3>
      <p>${esc(p.summary)}</p>
      ${chips(p.stack)}
    </div>
    <div class="pc-foot"><span class="go">Voir le projet </span>${code}</div>
  </article>`;
};

// Contenu : /api/content (base de données, modifiée depuis l'admin), sinon FALLBACK (js/data.js)
let PROJECTS = [];

async function loadContent() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch('/api/content', { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Contenu de secours affiché :', err.message);
    return FALLBACK;
  } finally {
    clearTimeout(timer);
  }
}

const $ = id => document.getElementById(id);
// **texte** → texte en gras, le reste est échappé
const rich = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const plural = (n, word) => `${word}${n > 1 ? 's' : ''}`;
const MONTHS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

// « 2026-08 », « 2026-10 » → « Août – Oct. 2026 »
function periodLabel(start, end) {
  const [y1, m1] = start.split('-').map(Number);
  if (!end) return `${MONTHS[m1 - 1]} ${y1} – aujourd'hui`;
  const [y2, m2] = end.split('-').map(Number);
  return y1 === y2 ? `${MONTHS[m1 - 1]} – ${MONTHS[m2 - 1]} ${y2}` : `${MONTHS[m1 - 1]} ${y1} – ${MONTHS[m2 - 1]} ${y2}`;
}

function durationLabel(months) {
  if (months < 12) return `${months} mois`;
  const years = Math.round(months / 12 * 10) / 10;
  return `${String(years).replace('.', ',')} ${plural(years, 'an')}`;
}

function renderProfile(p) {
  $('given-names').textContent = p.givenNames;
  $('name').innerHTML = `${esc(p.firstName)} <span class="last">${esc(p.lastName)}</span>`;
  $('intro').innerHTML = rich(p.intro);
  $('photo').src = p.photoUrl || 'img/charbel.jpg';
  $('photo').alt = `Portrait de ${p.firstName} ${p.lastName}`;
  $('about-title').textContent = p.aboutTitle;
  $('about').innerHTML = p.about.map(t => `<p>${rich(t)}</p>`).join('');
  $('goal').innerHTML = p.goal ? `<b>Objectif</b>${esc(p.goal)}` : '';
  $('goal').hidden = !p.goal;
  $('contact-title').textContent = p.contactTitle;
  $('mail').textContent = p.email;
  $('copyright').textContent = `© ${new Date().getFullYear()} ${p.givenNames} ${p.lastName}`;
}

// Chiffres clés calculés à partir du contenu : rien à mettre à jour à la main
function renderFacts(c) {
  const months = c.experiences.reduce((sum, e) => sum + e.months, 0);
  const techs = c.skillGroups.filter(g => g.kind === 'tech').reduce((sum, g) => sum + g.skills.length, 0);
  const facts = [
    [c.projects.length, `${plural(c.projects.length, 'projet')} ${plural(c.projects.length, 'réalisé')} ou en cours`],
    [durationLabel(months), "d'expérience professionnelle"],
    [techs, `${plural(techs, 'technologie')} ${plural(techs, 'maîtrisée')}`]
  ];
  $('facts').innerHTML = facts.map(([n, label]) => `<div><b>${esc(n)}</b><span>${esc(label)}</span></div>`).join('');
}

function renderSkills(groups) {
  const block = g => `<div><h3>${esc(g.name)}</h3>${chips(g.skills)}</div>`;
  $('skills').innerHTML = groups.filter(g => g.kind === 'tech').map(block).join('');
  const soft = groups.filter(g => g.kind === 'soft');
  $('soft').innerHTML = soft.map(g => `<h3>${esc(g.name)}</h3>${chips(g.skills)}`).join('');
  $('soft').hidden = !soft.length;
}

function renderServices(services) {
  $('service-list').innerHTML = services.map(s => `
        <article class="service">
          ${s.tag ? `<span class="svc-tag">${esc(s.tag)}</span>` : ''}
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.description)}</p>
        </article>`).join('');
}

function renderExperiences(list) {
  $('timeline').innerHTML = list.map(e => `
          <li><time>${esc(periodLabel(e.start, e.end))}<small>${esc(durationLabel(e.months))}</small></time><div><h4>${esc(e.role)}</h4><p class="where"><b>${esc(e.company)}</b>${e.location ? ` · ${esc(e.location)}` : ''}</p>${e.tasks.length ? `<ul>${e.tasks.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</div></li>`).join('');
}

function renderSocials(socials) {
  $('socials').innerHTML = socials.map(s =>
    `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join('');
}

function renderProjects(projects) {
  PROJECTS = projects;
  $('project-grid').innerHTML = projects.filter(p => p.featured).map(cardHTML).join('');
  $('all-btn').textContent = `Voir tous les projets (${projects.length}) `;
}

// Page « Tous les projets » avec filtres
let activeCat = 'Tous';
function renderAll() {
  const cats = ['Tous', ...new Set(PROJECTS.flatMap(p => p.cats))];
  if (!cats.includes(activeCat)) activeCat = 'Tous';
  const list = activeCat === 'Tous' ? PROJECTS : PROJECTS.filter(p => p.cats.includes(activeCat));
  document.getElementById('all-count').textContent = `${list.length} projet${list.length > 1 ? 's' : ''}${activeCat === 'Tous' ? ', réalisés ou en cours' : ' · ' + activeCat}`;
  document.getElementById('filters').innerHTML = cats.map(c => `<button type="button" aria-pressed="${c === activeCat}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  document.getElementById('all-grid').innerHTML = list.map(cardHTML).join('');
  drawCovers();
}
document.getElementById('filters').addEventListener('click', e => {
  const b = e.target.closest('button[data-cat]');
  if (!b) return;
  activeCat = b.dataset.cat;
  renderAll();
});

function renderDetail(p) {
  const i = PROJECTS.indexOf(p);
  const prev = PROJECTS[(i - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(i + 1) % PROJECTS.length];
  const actions = `<div class="d-actions">${p.demo
      ? `<a class="btn primary" href="${esc(p.demo)}" target="_blank" rel="noopener">Voir la démo</a>`
      : `<span class="btn" aria-disabled="true">Démo bientôt disponible</span>`}${p.code ? `<a class="btn" href="${esc(p.code)}" target="_blank" rel="noopener">Voir le code</a>` : ''}</div>`;
  document.getElementById('detail').innerHTML = `
    <div class="wrap">
      <a class="back" href="#tous-les-projets">${ICONS.arrowLeft}Tous les projets</a>
      <header class="d-head">
        <div style="display:flex;gap:12px;align-items:center;font-family:var(--font-mono);font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em"><span>${esc(p.kind)}</span>${p.year ? `<span>${esc(p.year)}</span>` : ''}${statusHTML(p, 'pill')}</div>
        <h1>${esc(p.title)}</h1>
        <p class="tag">${esc(p.tag)}</p>
        ${actions}
      </header>
      ${p.img ? coverHTML(p, 'd-cover') : `<div class="d-cover"><canvas data-seed="${p.seed}" aria-hidden="true" style="aspect-ratio:16/6"></canvas></div>`}
      <div class="d-grid">
        <div class="d-main">
          <section><h2>Le projet</h2><div class="prose">${p.about.map(t => `<p>${esc(t)}</p>`).join('')}</div></section>
          ${p.features.length ? `<section><h2>Fonctionnalités</h2><ul>${p.features.map(t => `<li>${esc(t)}</li>`).join('')}</ul></section>` : ''}
          ${p.steps.length ? `<section><h2>${esc(p.stepsTitle || 'Étapes')}</h2><ol class="steps">${p.steps.map(s => `<li><div><b>${esc(s.title)}</b>${esc(s.text)}</div></li>`).join('')}</ol></section>` : ''}
          ${p.role ? `<section><h2>Mon rôle</h2><p>${esc(p.role)}</p></section>` : ''}
          ${p.stack.length ? `<section><h2>Technologies</h2>${chips(p.stack)}</section>` : ''}
          <section><h2>Visuels</h2>${p.gallery.length
            ? `<div class="gallery">${p.gallery.map(g => `<figure class="${g.logo ? 'logo' : ''}"><img src="${esc(g.src)}" alt="${esc(g.caption)}" loading="lazy"><figcaption>${esc(g.caption)}</figcaption></figure>`).join('')}</div>`
            : `<p class="d-todo">Les visuels de ce projet seront bientôt disponibles.</p>`}</section>
        </div>
        <dl class="d-side">${p.facts.map(f => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>
      </div>
      <nav class="d-nav" aria-label="Autres projets">
        <a href="#${prev.id}"><small>${ICONS.arrowLeft}Projet précédent</small><span>${esc(prev.title)}</span></a>
        <a class="next" href="#${next.id}"><small>Projet suivant${ICONS.arrowRight}</small><span>${esc(next.title)}</span></a>
      </nav>
    </div>`;
}

function route() {
  const id = decodeURIComponent(location.hash.slice(1));
  const p = PROJECTS.find(x => x.id === id);
  const views = { home: document.getElementById('home'), all: document.getElementById('all'), detail: document.getElementById('detail') };
  const wasHome = !views.home.hidden;
  const show = name => Object.entries(views).forEach(([k, el]) => { el.hidden = k !== name; });
  if (p) {
    renderDetail(p); show('detail'); window.scrollTo(0, 0);
  } else if (id === 'tous-les-projets') {
    renderAll(); show('all'); window.scrollTo(0, 0);
  } else {
    show('home');
    const target = id && document.getElementById(id);
    if (target) target.scrollIntoView();
    else if (!wasHome) window.scrollTo(0, 0);
  }
  document.getElementById('nav').classList.remove('open');
  document.getElementById('menu-btn').setAttribute('aria-expanded', 'false');
  drawCovers();
}

document.getElementById('menu-btn').addEventListener('click', () => {
  const nav = document.getElementById('nav');
  const open = nav.classList.toggle('open');
  document.getElementById('menu-btn').setAttribute('aria-expanded', String(open));
  document.getElementById('menu-btn').setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
});
document.getElementById('menu').addEventListener('click', e => {
  if (e.target.closest('a')) { document.getElementById('nav').classList.remove('open'); document.getElementById('menu-btn').setAttribute('aria-expanded', 'false'); }
});

// Visuels génératifs pour les cartes projet (à remplacer par des captures d'écran)
function drawCovers() {
  const cs = getComputedStyle(document.documentElement);
  const accent = cs.getPropertyValue('--accent').trim();
  const sun = cs.getPropertyValue('--sun').trim();
  const bg = cs.getPropertyValue('--bg').trim();
  const ink = cs.getPropertyValue('--ink').trim();
  document.querySelectorAll('canvas[data-seed]').forEach(c => {
    const seed = +c.dataset.seed;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.max(1, r.width * dpr); c.height = Math.max(1, r.height * dpr);
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const w = r.width, h = r.height;
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    let s = seed * 9301;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const colors = [accent, sun, ink];
    for (let i = 0; i < 7; i++) {
      g.globalAlpha = 0.85;
      g.fillStyle = colors[(i + seed) % 3];
      const x = rnd() * w, y = rnd() * h, size = 20 + rnd() * h * 0.6;
      if ((i + seed) % 2) { g.beginPath(); g.arc(x, y, size / 2, 0, Math.PI * 2); g.fill(); }
      else { g.fillRect(x - size / 2, y - size / 4, size, size / 2); }
    }
    g.globalAlpha = 1;
  });
}
// Chiffres clés : comptage jusqu'à la valeur finale quand ils apparaissent à l'écran
function animateFacts() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const countUp = el => {
    const m = el.textContent.match(/^(\d+)(.*)$/);
    if (!m) return;
    const end = +m[1], rest = m[2], t0 = performance.now(), dur = 1100;
    const tick = t => {
      const k = Math.min(1, (t - t0) / dur), eased = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(end * eased) + rest;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.querySelectorAll('b').forEach(countUp); io.unobserve(e.target); }
  }), { threshold: .6 });
  document.querySelectorAll('.facts').forEach(f => io.observe(f));
}

// Démarrage : charger le contenu, l'afficher, puis lancer les animations d'arrivée
loadContent().then(c => {
  renderProfile(c.profile);
  renderFacts(c);
  renderSkills(c.skillGroups);
  renderProjects(c.projects);
  renderServices(c.services);
  renderExperiences(c.experiences);
  renderSocials(c.socials);
  route();
  animateFacts();
}).finally(() => document.documentElement.classList.remove('is-loading'));

window.addEventListener('hashchange', route);
window.addEventListener('resize', drawCovers);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawCovers);
new MutationObserver(drawCovers).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
document.fonts && document.fonts.ready.then(drawCovers);

document.getElementById('copy').addEventListener('click', e => {
  const text = document.getElementById('mail').textContent;
  const btn = e.currentTarget;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'Adresse copiée';
    setTimeout(() => btn.textContent = "Copier l'adresse", 2000);
  }).catch(() => {
    const range = document.createRange();
    range.selectNodeContents(document.getElementById('mail'));
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
    btn.textContent = 'Appuie sur Ctrl+C';
  });
});
