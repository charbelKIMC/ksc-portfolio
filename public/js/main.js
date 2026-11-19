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
      <h3><a href="/projets/${p.id}">${esc(p.title)}</a></h3>
      <p>${esc(p.summary)}</p>
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
  $('subintro').textContent = p.subintro || '';
  $('subintro').hidden = !p.subintro;
  $('recruiter').innerHTML = p.recruiterLine ? `${esc(p.recruiterLine)} <a href="#parcours">voir mon parcours ${ICONS.arrowRight}</a>` : '';
  $('recruiter').hidden = !p.recruiterLine;
  $('photo').src = p.photoUrl || 'img/charbel.jpg';
  $('photo').alt = `Portrait de ${p.firstName} ${p.lastName}`;
  $('about-title').textContent = p.aboutTitle;
  $('about').innerHTML = p.about.map(t => `<p>${rich(t)}</p>`).join('');
  $('goal').innerHTML = p.goal ? `<b>${esc(p.goalLabel || 'Objectif')}</b>${esc(p.goal)}` : '';
  $('goal').hidden = !p.goal;
  $('contact-title').textContent = p.contactTitle;
  $('contact-subtitle').textContent = p.contactSubtitle || '';
  $('contact-subtitle').hidden = !p.contactSubtitle;
  $('mail').textContent = p.email;
  const fullName = p.givenNames.includes(p.firstName) ? `${p.givenNames} ${p.lastName}` : `${p.givenNames} ${p.firstName} ${p.lastName}`;
  $('copyright').textContent = `© ${new Date().getFullYear()} ${fullName}`;

  // Boutons WhatsApp (accueil, services, contact, bouton flottant) : message prérempli ; masqués sans numéro
  document.querySelectorAll('[data-wa]').forEach(a => {
    if (p.whatsapp) a.href = `https://wa.me/${p.whatsapp}${p.whatsappMessage ? `?text=${encodeURIComponent(p.whatsappMessage)}` : ''}`;
    else if (a.classList.contains('wa-float')) a.hidden = true;
    else { a.href = '#contact'; a.removeAttribute('target'); }
  });
  $('home').parentElement.querySelector('.wa-float').hidden = !p.whatsapp;

  // E-mail prérempli : ouvre la messagerie avec l'objet et le texte déjà écrits
  const mailParams = [p.mailSubject && `subject=${encodeURIComponent(p.mailSubject)}`, p.mailBody && `body=${encodeURIComponent(p.mailBody)}`].filter(Boolean).join('&');
  $('mail-btn').href = `mailto:${p.email}${mailParams ? `?${mailParams}` : ''}`;
}

// Chiffres clés calculés à partir du contenu : rien à mettre à jour à la main
function renderFacts(c) {
  const months = c.experiences.reduce((sum, e) => sum + e.months, 0);
  const facts = [
    [c.projects.length, `${plural(c.projects.length, 'projet')} ${plural(c.projects.length, 'réalisé')} ou en cours`],
    [durationLabel(months), "d'expérience professionnelle"],
    ['24 h', 'pour une première réponse']
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

function renderServices(services, projects) {
  const example = slug => {
    const p = slug && projects.find(x => x.id === slug);
    return p ? `<p class="svc-example">Exemple : <a href="/projets/${p.id}">${esc(p.title)}</a></p>` : '';
  };
  $('service-list').innerHTML = services.map(s => `
        <article class="service">
          ${s.tag ? `<span class="svc-tag">${esc(s.tag)}</span>` : ''}
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.description)}</p>
          ${example(s.example)}
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
      <a class="back" href="/tous-les-projets">${ICONS.arrowLeft}Tous les projets</a>
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
            ? `<div class="gallery">${p.gallery.map((g, i) => `<button class="shot${g.logo ? ' logo' : ''}" type="button" data-full="${esc(g.src)}" aria-label="Agrandir le visuel ${i + 1}"><img src="${esc(g.src)}" alt="${esc(g.caption || `Visuel ${i + 1} du projet ${p.title}`)}" loading="lazy"></button>`).join('')}</div>`
            : `<p class="d-todo">Les visuels de ce projet seront bientôt disponibles.</p>`}</section>
        </div>
        <dl class="d-side">${p.facts.map(f => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>
      </div>
      <nav class="d-nav" aria-label="Autres projets">
        <a href="/projets/${prev.id}"><small>${ICONS.arrowLeft}Projet précédent</small><span>${esc(prev.title)}</span></a>
        <a class="next" href="/projets/${next.id}"><small>Projet suivant${ICONS.arrowRight}</small><span>${esc(next.title)}</span></a>
      </nav>
    </div>`;
}

function renderNotFound() {
  document.getElementById('detail').innerHTML = `
    <div class="wrap">
      <a class="back" href="/tous-les-projets">${ICONS.arrowLeft}Tous les projets</a>
      <header class="d-head">
        <h1>Projet introuvable</h1>
        <p class="tag">Ce projet n'existe pas ou n'est plus en ligne.</p>
      </header>
    </div>`;
}

// Titre, description et adresse canonique de la page affichée (lus par Google)
const HOME_META = { title: document.title, description: document.querySelector('meta[name="description"]').content };
function setMeta({ title, description, path, index = true }) {
  document.title = title;
  document.querySelector('meta[name="description"]').content = description;
  document.querySelector('link[rel="canonical"]').href = `https://charbelkinkpe.com${path}`;
  let robots = document.querySelector('meta[name="robots"]');
  if (!index && !robots) robots = Object.assign(document.head.appendChild(document.createElement('meta')), { name: 'robots' });
  if (robots) robots.content = index ? 'index, follow' : 'noindex';
}

// Pages : / (accueil, sections en #), /tous-les-projets, /projets/<adresse du projet>
function go(url, { replace = false } = {}) {
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
  route();
}

function route() {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const hash = decodeURIComponent(location.hash.slice(1));
  // Anciennes adresses (#tous-les-projets, #claimora…) : redirigées vers les vraies pages
  if (path === '/' && hash === 'tous-les-projets') return go('/tous-les-projets', { replace: true });
  if (path === '/' && PROJECTS.some(x => x.id === hash)) return go(`/projets/${hash}`, { replace: true });

  const views = { home: document.getElementById('home'), all: document.getElementById('all'), detail: document.getElementById('detail') };
  const wasHome = !views.home.hidden;
  const show = name => Object.entries(views).forEach(([k, el]) => { el.hidden = k !== name; });
  const slug = path.match(/^\/projets\/([^/]+)$/)?.[1];
  if (slug) {
    const p = PROJECTS.find(x => x.id === decodeURIComponent(slug));
    if (p) {
      renderDetail(p);
      setMeta({ title: `${p.title} · Charbel Kinkpe`, description: p.summary || p.tag || HOME_META.description, path });
    } else {
      renderNotFound();
      setMeta({ title: 'Projet introuvable · Charbel Kinkpe', description: HOME_META.description, path, index: false });
    }
    show('detail'); window.scrollTo(0, 0);
  } else if (path === '/tous-les-projets') {
    renderAll(); show('all'); window.scrollTo(0, 0);
    setMeta({ title: 'Tous les projets · Charbel Kinkpe', description: `Les projets réalisés ou en cours de ${HOME_META.title.split(' · ')[0]} : web, mobile, SaaS, fintech.`, path });
  } else {
    show('home');
    setMeta({ ...HOME_META, path: '/' });
    const target = hash && document.getElementById(hash);
    if (target) target.scrollIntoView();
    else if (!wasHome) window.scrollTo(0, 0);
  }
  document.getElementById('nav').classList.remove('open');
  document.getElementById('menu-btn').setAttribute('aria-expanded', 'false');
  drawCovers();
  trackView();
}

// Statistiques de visite : une page vue par changement de page, sans cookie, seulement sur le site en ligne,
// et jamais si le navigateur demande à ne pas être suivi
let lastTracked = null;
function trackView() {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (path === lastTracked || !location.hostname.endsWith('charbelkinkpe.com') || navigator.doNotTrack === '1') return;
  const referrer = lastTracked === null ? document.referrer : '';   // le site d'origine compte seulement à l'arrivée
  lastTracked = path;
  navigator.sendBeacon?.('/api/track', JSON.stringify({ path, referrer }));
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
// Animation d'arrivée des sections de l'accueil : chaque élément apparaît une seule fois en entrant à l'écran
// (pour les services, seul le contenu des cartes apparaît, les cartes restent en place),
// puis reste net (pas d'effet lié à la position du défilement)
function revealOnArrival() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const items = document.querySelectorAll(`#home section.band .label, #home section.band .body > h2, #home .section-head,
    #home .service > *, #home .pcard, #home .method li, #home .facts, #home .goal, #home .skills > div, #home .soft,
    #home .timeline > li, #home .contact-actions, #home .mailrow, #home .socials`);
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  items.forEach(el => { el.classList.add('reveal'); io.observe(el); });
}

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
  renderServices(c.services, c.projects);
  renderExperiences(c.experiences);
  renderSocials(c.socials);
  route();
  animateFacts();
  revealOnArrival();
}).finally(() => document.documentElement.classList.remove('is-loading'));

window.addEventListener('popstate', route);

// Liens internes : changement de page sans rechargement (le logo, lui, recharge volontairement la page)
document.addEventListener('click', e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href]');
  if (!a || a.target === '_blank' || a.classList.contains('logo')) return;
  const url = new URL(a.href);
  const page = url.pathname.replace(/\/+$/, '') || '/';
  if (url.origin !== location.origin || !(page === '/' || page === '/tous-les-projets' || page.startsWith('/projets/'))) return;
  e.preventDefault();
  if (a.getAttribute('href') === '#top') return window.scrollTo({ top: 0, behavior: 'smooth' });
  go(url.pathname + url.hash);
});
window.addEventListener('resize', drawCovers);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawCovers);
new MutationObserver(drawCovers).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
document.fonts && document.fonts.ready.then(drawCovers);

document.getElementById('copy').addEventListener('click', e => {
  const text = document.getElementById('mail').textContent;
  const btn = e.currentTarget;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'Copie faite !';
    setTimeout(() => btn.textContent = "Copier", 2000);
  }).catch(() => {
    const range = document.createRange();
    range.selectNodeContents(document.getElementById('mail'));
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
    btn.textContent = 'Appuie sur Ctrl+C';
  });
});

// Visuels d'un projet : un clic sur une vignette ouvre l'image entière en grand (fermeture : ✕, Échap ou clic à côté)
const lightbox = document.createElement('dialog');
lightbox.className = 'lightbox';
lightbox.innerHTML = '<img alt=""><button type="button" aria-label="Fermer">×</button>';
document.body.append(lightbox);
lightbox.addEventListener('click', e => { if (e.target === lightbox || e.target.closest('button')) lightbox.close(); });
document.getElementById('detail').addEventListener('click', e => {
  const shot = e.target.closest('.shot');
  if (!shot) return;
  const img = lightbox.querySelector('img');
  img.src = shot.dataset.full;
  img.alt = shot.querySelector('img').alt;
  lightbox.showModal();
});
