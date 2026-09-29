// Game Theory Gallery: model picker, per-model state, URL hash, walkthrough and sources.
import fearon95 from './views/fearon95.js';
import powell06 from './views/powell06.js';
import brink from './views/brink.js';
import fearon94 from './views/fearon94.js';
import jervis78 from './views/jervis78.js';
import kydd00 from './views/kydd00.js';
import slantchev03 from './views/slantchev03.js';
import rubinstein82 from './views/rubinstein82.js';
import { NOTES_A } from '../data/notes.js';
import { NOTES_B } from '../data/notes-b.js';
import { CARDS, SOURCES } from '../data/catalog.js';
import { mountModel } from './shell.js';
import { createTour } from './tour.js';
import { cardIcon } from './icons.js';
import { esc } from './ui.js';

document.title = 'Game Theory Gallery | Interactive Deterrence';

const MODELS = { fearon95, powell06, brink, fearon94, jervis78, kydd00, slantchev03, rubinstein82 };
const NOTES = { ...NOTES_A, ...NOTES_B };
const S = { m: 'fearon95', P: Object.fromEntries(Object.entries(MODELS).map(([k, m]) => [k, { ...m.defaults }])) };

const stage = document.getElementById('stage'), panel = document.getElementById('panel');
const picker = document.getElementById('picker');
let current = null;

// ---- Picker -----------------------------------------------------------------------------------
picker.innerHTML = CARDS.map(c => c.href
  ? `<a class="mcard ext" href="${c.href}">${cardIcon(c.icon)}<span class="mc-t"><b>${esc(c.title)}</b><span class="mc-who">${esc(c.who)}</span><span class="mc-bl">${esc(c.blurb)}</span></span></a>`
  : `<button type="button" class="mcard" data-m="${c.id}" aria-pressed="false">${cardIcon(c.icon)}<span class="mc-t"><b>${esc(c.title)}</b><span class="mc-who">${esc(c.who)}</span><span class="mc-bl">${esc(c.blurb)}</span></span></button>`).join('');
picker.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
  if (S.m !== b.dataset.m) { S.m = b.dataset.m; mount(); }
  document.getElementById('stage').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}));

function mount() {
  picker.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === S.m)));
  document.body.dataset.model = S.m;
  current = mountModel(stage, panel, MODELS[S.m], S.P[S.m], NOTES[S.m], writeHash);
  writeHash();
}

// ---- Hash -------------------------------------------------------------------------------------
function writeHash() {
  const P = S.P[S.m], q = new URLSearchParams({ m: S.m });
  for (const k of Object.keys(MODELS[S.m].defaults)) q.set(k, String(P[k]));
  history.replaceState(null, '', '#' + q.toString());
}

function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const m = q.get('m');
  if (!MODELS[m]) return;
  S.m = m;
  const model = MODELS[m], D = model.defaults, P = S.P[m], enums = model.enums || {};
  // Pass 1: view, other enumerated strings and on/off switches.
  for (const k of Object.keys(D)) {
    if (!q.has(k)) continue;
    const raw = q.get(k);
    if (typeof D[k] === 'string') { if (!enums[k] || enums[k].includes(raw)) P[k] = raw; }
  }
  // Pass 2: numbers, clamped to the slider ranges declared for any view of this model.
  const views = model.views ? model.views.map(o => o.v) : [P.v];
  const specs = views.flatMap(v => model.controls({ ...P, v }));
  for (const k of Object.keys(D)) {
    if (typeof D[k] === 'string' || !q.has(k)) continue;
    const v = Number(q.get(k));
    if (!Number.isFinite(v)) continue;
    const s = specs.find(x => x.key === k);
    if (!s) continue;
    if (s.type === 'range') {
      const lo = typeof s.min === 'function' ? s.min(P) : s.min, hi = typeof s.max === 'function' ? s.max(P) : s.max;
      P[k] = Math.max(lo, Math.min(hi, v));
    } else if (s.type === 'toggle') P[k] = v ? 1 : 0;
    else if (s.opts && s.opts.some(o => o.v === v)) P[k] = v;
  }
  if (model.fix) Object.keys(D).forEach(k => model.fix(P, k));
}

// ---- Sources ----------------------------------------------------------------------------------
document.getElementById('sources').innerHTML = SOURCES.map(s =>
  `<li>${esc(s.t)}${s.u ? ` <a href="${s.u}" target="_blank" rel="noopener">${esc(s.u.replace('https://', ''))}</a>` : ' (book; no stable link)'}</li>`).join('');

// ---- Walkthrough and buttons ------------------------------------------------------------------
const tour = createTour(document.getElementById('tour-root'), step => {
  if (S.m !== step.m) { S.m = step.m; mount(); }
  current.apply({ ...MODELS[step.m].defaults, ...step.set }, 'try', step.title);
});
document.getElementById('start-tour').addEventListener('click', () => tour.start());
document.getElementById('copy-link').addEventListener('click', async e => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText(location.href); b.textContent = 'Link copied'; }
  catch (err) { b.textContent = 'Copy the address bar'; }
  setTimeout(() => { b.textContent = 'Copy link to this setup'; }, 1800);
});
document.querySelectorAll('[data-goto]').forEach(a => a.addEventListener('click', ev => {
  ev.preventDefault();
  S.m = a.dataset.goto; mount();
  picker.scrollIntoView({ behavior: 'auto', block: 'start' });
}));

readHash();
mount();

// Method-section math renders once KaTeX has loaded (its scripts are deferred).
function renderMath() {
  if (!window.renderMathInElement) return false;
  document.querySelectorAll('.below').forEach(node => window.renderMathInElement(node, {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false,
  }));
  return true;
}
if (!renderMath()) window.addEventListener('load', renderMath, { once: true });

// Redraw figures when the width class changes (plots use a narrower viewBox on phones).
let lastW = innerWidth, rt = 0;
addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => { if (Math.abs(innerWidth - lastW) > 40) { lastW = innerWidth; current.render(); } }, 150);
});
