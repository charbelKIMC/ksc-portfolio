// Génère les formulaires de l'admin à partir d'une description des champs (voir sections.js),
// relit les valeurs saisies et affiche les erreurs renvoyées par l'API.
//
// Types de champ : text, email, url, month, number, textarea, checkbox, select,
//   lines (une valeur par ligne → tableau), tags (séparées par des virgules → tableau),
//   rows (lignes répétables, chacune avec ses colonnes → tableau d'objets),
//   image (adresse + bouton d'envoi, converti en WebP), file (adresse + bouton d'envoi d'un PDF)
import { prepareImage, preparePdf, uploadFile } from './upload.js';

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Adresse enregistrée (img/…, uploads/… ou https://…) → adresse affichable depuis /admin
const previewSrc = v => (!v ? '' : /^https:\/\//.test(v) ? v : `/${v}`);

// Champ texte de l'adresse + aperçu + bouton « Choisir… » (le fichier part dès qu'il est choisi)
function uploadHTML(f, value, inputAttrs) {
  const isPdf = f.type === 'file';
  const preview = isPdf
    ? `<a class="pdf-link" href="${esc(previewSrc(value))}" target="_blank" rel="noopener"${value ? '' : ' hidden'}>Voir le PDF ↗</a>`
    : `<img class="thumb" src="${esc(previewSrc(value))}" alt=""${value ? '' : ' hidden'}>`;
  return `<div class="upload">
    ${preview}
    <div class="upload-main">
      <input type="text" ${inputAttrs} value="${esc(value)}" placeholder="${isPdf ? 'https://…' : 'img/… ou https://…'}">
      <div class="upload-actions">
        <label class="btn small pick">${isPdf ? 'Choisir un PDF' : 'Choisir une image'}<input class="sr-only" type="file"
          accept="${isPdf ? 'application/pdf' : 'image/*'}" data-kind="${isPdf ? 'pdf' : 'image'}"
          data-folder="${f.folder || 'projects'}" data-max="${f.maxWidth || 1600}"></label>
        <span class="upload-status" aria-live="polite"></span>
      </div>
    </div>
  </div>`;
}

function input(f, value, attrs = '') {
  const id = `f-${f.name}`;
  const common = `id="${id}" name="${f.name}"${f.required ? ' required' : ''}${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''} ${attrs}`;
  switch (f.type) {
    case 'textarea':
      return `<textarea ${common} rows="${f.rows || 3}">${esc(value)}</textarea>`;
    case 'lines':
      return `<textarea ${common} rows="${f.rows || 4}">${esc((value || []).join('\n'))}</textarea>`;
    case 'tags':
      return `<input type="text" ${common} value="${esc((value || []).join(', '))}">`;
    case 'select':
      return `<select ${common}>${f.options.map(([v, label]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select>`;
    case 'image':
    case 'file':
      return uploadHTML(f, value, `id="${id}" name="${f.name}"`);
    default:
      return `<input type="${f.type || 'text'}" ${common} value="${esc(value)}"${f.type === 'number' ? ' min="1" step="1"' : ''}>`;
  }
}

function rowHTML(f, row = {}) {
  return `<div class="row">${f.columns.map(c => c.type === 'checkbox'
    ? `<label class="check"><input type="checkbox" data-col="${c.name}"${row[c.name] ? ' checked' : ''}> ${esc(c.label)}</label>`
    : c.type === 'image'
    ? `<div class="col wide-col"><span>${esc(c.label)}</span>${uploadHTML(c, row[c.name], `data-col="${c.name}" aria-label="${esc(c.label)}"`)}</div>`
    : `<label>${esc(c.label)}<input type="text" data-col="${c.name}" value="${esc(row[c.name])}"${c.placeholder ? ` placeholder="${esc(c.placeholder)}"` : ''}></label>`
  ).join('')}<button class="icon" type="button" data-remove-row aria-label="Retirer cette ligne">×</button></div>`;
}

function fieldHTML(f, value) {
  const help = f.help ? `<small class="help">${esc(f.help)}</small>` : '';
  const err = '<small class="err" hidden></small>';
  if (f.type === 'checkbox') {
    return `<div class="field wide" data-field="${f.name}"><label class="check"><input type="checkbox" id="f-${f.name}" name="${f.name}"${value ? ' checked' : ''}> ${esc(f.label)}</label>${help}${err}</div>`;
  }
  if (f.type === 'rows') {
    return `<div class="field wide" data-field="${f.name}"><span class="label">${esc(f.label)}</span>${help}
      <div class="rows" data-rows="${f.name}">${(value || []).map(r => rowHTML(f, r)).join('')}</div>
      <button class="btn small" type="button" data-add-row="${f.name}">+ ${esc(f.addLabel || 'Ajouter une ligne')}</button>${err}</div>`;
  }
  const wide = f.wide ?? ['textarea', 'lines', 'image', 'file'].includes(f.type);
  return `<div class="field${wide ? ' wide' : ''}" data-field="${f.name}"><label for="f-${f.name}">${esc(f.label)}${f.required ? ' <span aria-hidden="true">*</span>' : ''}</label>${input(f, value)}${help}${err}</div>`;
}

export function formHTML(groups, values) {
  return groups.map(g => `
    <fieldset>
      <legend>${esc(g.legend)}</legend>
      ${g.intro ? `<p class="muted small">${esc(g.intro)}</p>` : ''}
      <div class="grid">${g.fields.map(f => fieldHTML(f, values[f.name])).join('')}</div>
    </fieldset>`).join('');
}

const fieldsOf = groups => groups.flatMap(g => g.fields);

// Lignes répétables : ajout et retrait
export function bindForm(form, groups) {
  const byName = Object.fromEntries(fieldsOf(groups).map(f => [f.name, f]));
  form.addEventListener('click', e => {
    const add = e.target.closest('[data-add-row]');
    if (add) {
      const f = byName[add.dataset.addRow];
      form.querySelector(`[data-rows="${f.name}"]`).insertAdjacentHTML('beforeend', rowHTML(f));
      form.querySelector(`[data-rows="${f.name}"] .row:last-child input`).focus();
      form.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const remove = e.target.closest('[data-remove-row]');
    if (remove) {
      remove.closest('.row').remove();
      form.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  // Aperçu mis à jour quand l'adresse change (saisie ou envoi)
  form.addEventListener('input', e => {
    const box = e.target.closest?.('.upload');
    if (!box || e.target.type === 'file') return;
    const src = previewSrc(e.target.value.trim());
    const preview = box.querySelector('.thumb, .pdf-link');
    preview[preview.tagName === 'IMG' ? 'src' : 'href'] = src;
    preview.hidden = !src;
  });

  // Fichier choisi : conversion (images), envoi, puis adresse remplie dans le champ
  form.addEventListener('change', async e => {
    const picker = e.target;
    if (picker.type !== 'file' || !picker.files[0]) return;
    const box = picker.closest('.upload');
    const field = box.querySelector('input[type="text"]');
    const status = box.querySelector('.upload-status');
    const file = picker.files[0];
    const { kind, folder, max } = picker.dataset;
    const setStatus = (text, error = false) => { status.textContent = text; status.classList.toggle('error', error); };
    picker.disabled = true;
    try {
      setStatus(kind === 'pdf' ? 'Vérification…' : 'Conversion en WebP…');
      const blob = kind === 'pdf' ? preparePdf(file) : await prepareImage(file, Number(max));
      setStatus(`Envoi (${Math.round(blob.size / 1024)} Ko)…`);
      field.value = await uploadFile(blob, { name: file.name, folder });
      field.dispatchEvent(new Event('input', { bubbles: true }));
      setStatus('Envoyé ✓ — pense à enregistrer.');
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      picker.disabled = false;
      picker.value = '';
    }
  });
}

export function readForm(form, groups) {
  const out = {};
  for (const f of fieldsOf(groups)) {
    const el = form.elements[f.name];
    switch (f.type) {
      case 'checkbox': out[f.name] = el.checked; break;
      case 'lines': out[f.name] = el.value.split('\n').map(s => s.trim()).filter(Boolean); break;
      case 'tags': out[f.name] = el.value.split(',').map(s => s.trim()).filter(Boolean); break;
      case 'rows':
        out[f.name] = [...form.querySelectorAll(`[data-rows="${f.name}"] .row`)].map(row => Object.fromEntries(
          f.columns.map(c => {
            const i = row.querySelector(`[data-col="${c.name}"]`);
            return [c.name, c.type === 'checkbox' ? i.checked : i.value.trim()];
          })
        )).filter(r => f.columns.some(c => c.type !== 'checkbox' && r[c.name]));
        break;
      default: out[f.name] = el.value.trim();
    }
  }
  return out;
}

// Erreurs de l'API : { title: '…', 'steps.0.title': '…' } → message sous le champ concerné
export function showErrors(form, fields = {}) {
  form.querySelectorAll('.err').forEach(e => { e.hidden = true; e.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach(e => e.removeAttribute('aria-invalid'));
  let first;
  for (const [path, message] of Object.entries(fields)) {
    const [name, index, col] = path.split('.');
    const box = form.querySelector(`[data-field="${name}"]`);
    if (!box) continue;
    const err = box.querySelector(':scope > .err');
    err.textContent = index === undefined ? message : `Ligne ${Number(index) + 1} : ${message}`;
    err.hidden = false;
    const target = col
      ? box.querySelectorAll('.row')[index]?.querySelector(`[data-col="${col}"]`)
      : box.querySelector('input, textarea, select');
    target?.setAttribute('aria-invalid', 'true');
    first ??= target || box;
  }
  first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  first?.focus?.({ preventScroll: true });
}

// « Mon Projet Été » → « mon-projet-ete »
export const slugify = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
