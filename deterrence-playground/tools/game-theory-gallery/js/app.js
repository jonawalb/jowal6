// Game Theory Gallery: model picker, open-model choice, learn pages, per-model state, URL hash, walkthrough
// and sources. Two views share the page: the model (default) and the learn pages (#learn=<model>&p=<page>).
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
import { PRIMERS } from '../data/primers.js';
import { mountModel } from './shell.js';
import { LEARN_TERMS } from '../data/learn-terms.js';
import { createLearn } from './learn.js';
import { createChoice, rememberedChoice } from './choice.js';
import { createTour } from './tour.js';
import { cardIcon } from './icons.js';
import { esc } from './ui.js';

document.title = 'Game Theory Gallery | Interactive Deterrence';

const MODELS = { fearon95, powell06, brink, fearon94, jervis78, kydd00, slantchev03, rubinstein82 };
const NOTES = { ...NOTES_A, ...NOTES_B };
const S = { m: 'fearon95', P: Object.fromEntries(Object.entries(MODELS).map(([k, m]) => [k, { ...m.defaults }])) };

const stage = document.getElementById('stage'), panel = document.getElementById('panel');
const picker = document.getElementById('picker'), learnHost = document.getElementById('learn');
let current = null, mounted = null;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- Picker -----------------------------------------------------------------------------------
picker.innerHTML = CARDS.map(c => c.href
  ? `<button type="button" class="mcard ext" data-ext="${c.id}">${cardIcon(c.icon)}<span class="mc-t"><b>${esc(c.title)}</b><span class="mc-who">${esc(c.who)}</span><span class="mc-bl">${esc(c.blurb)}</span></span></button>`
  : `<button type="button" class="mcard" data-m="${c.id}" aria-pressed="false">${cardIcon(c.icon)}<span class="mc-t"><b>${esc(c.title)}</b><span class="mc-who">${esc(c.who)}</span><span class="mc-bl">${esc(c.blurb)}</span></span></button>`).join('');
picker.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => openModel(b.dataset.m)));
picker.querySelectorAll('[data-ext]').forEach(b => b.addEventListener('click', () => openExternal(cardOf(b.dataset.ext))));

const cardOf = m => CARDS.find(c => c.id === m);
const scrollOpts = () => ({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });

function mount() {
  picker.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === S.m)));
  document.body.dataset.model = S.m;
  if (mounted === S.m) return;
  mounted = S.m;
  current = mountModel(stage, panel, MODELS[S.m], S.P[S.m], NOTES[S.m], writeHash);
  // Small link near the title that opens the learn pages at page 1.
  if (PRIMERS[S.m]) {
    stage.querySelector('.mhead .cite').insertAdjacentHTML('afterend',
      '<p class="mlearn"><button type="button" class="linkbtn">Learn about this model</button></p>');
    stage.querySelector('.mlearn button').addEventListener('click', () => showLearn(S.m, 0, true));
  }
}

// ---- Views: model or learn pages ---------------------------------------------------------------
function showModel({ push = false, focus = false, scroll = false } = {}) {
  document.body.classList.remove('picking');
  const wasLearning = !learnHost.hidden;
  document.body.classList.remove('learning');
  learnHost.hidden = true; learnHost.innerHTML = '';
  mount();
  writeHash(push || wasLearning);
  if (wasLearning) window.scrollTo(0, 0);
  if (scroll) stage.scrollIntoView(scrollOpts());
  if (focus) {
    const h = stage.querySelector('.mhead h2');
    h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true });
  }
}

function showLearn(m, i, push = false) {
  if (!PRIMERS[m]) return showModel();
  document.body.classList.remove('picking');
  S.m = m; mount();
  const entering = learnHost.hidden;
  document.body.classList.add('learning');
  learnHost.hidden = false;
  i = learn.show(m, i);
  if (entering) window.scrollTo(0, 0);
  if (push) history.pushState(null, '', learnHash(m, i)); else history.replaceState(null, '', learnHash(m, i));
}

const learnHash = (m, i) => `#learn=${m}&p=${i + 1}`;
const learn = createLearn(learnHost, {
  data: m => ({ PR: PRIMERS[m], keep: LEARN_TERMS[m] || [], card: cardOf(m) }),
  onPage: (m, i) => { if (!learnHost.hidden) history.replaceState(null, '', learnHash(m, i)); },
  onModel: () => showModel({ push: true, focus: true }),
});

// A card built in another tool (Fearon 1997, in the Deterrence Lab): the same choice, then leave the page,
// to its walkthrough (learnHref) or straight to its model (href).
let ext = null;
function openExternal(card) {
  const pref = rememberedChoice();
  if (pref) { location.href = pref === 'learn' ? card.learnHref : card.href; return; }
  ext = card;
  choice.open(card, card.question);
}

const choice = createChoice(document.getElementById('choose'), pick => {
  if (ext) { const c = ext; ext = null; location.href = pick === 'learn' ? c.learnHref : c.href; return; }
  if (pick === 'learn') showLearn(S.m, 0, true);
  else showModel({ scroll: true, focus: true });
});

/** A model card was clicked (or a link named a model but no setup): ask, unless the viewer said not to. */
function openModel(m) {
  S.m = m;
  showModel();
  const pref = rememberedChoice();
  if (pref === 'learn') return showLearn(m, 0, true);
  if (pref === 'model' || !PRIMERS[m]) return showModel({ scroll: true, focus: true });
  choice.open(cardOf(m), PRIMERS[m].question);
}

// ---- Hash -------------------------------------------------------------------------------------
function writeHash(push = false) {
  if (!learnHost.hidden) return;
  const P = S.P[S.m], q = new URLSearchParams({ m: S.m });
  for (const k of Object.keys(MODELS[S.m].defaults)) q.set(k, String(P[k]));
  history[push === true ? 'pushState' : 'replaceState'](null, '', '#' + q.toString());
}

function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const m = q.get('m');
  if (!MODELS[m]) return false;
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
  return [...q.keys()].some(k => k !== 'm');
}

/** Show whatever the address names: learn pages, a model with its setup, or a bare model (ask first). */
function route() {
  choice.dismiss();
  const q = new URLSearchParams(location.hash.slice(1)), L = q.get('learn');
  if (L && PRIMERS[L]) return showLearn(L, Math.max(1, parseInt(q.get('p'), 10) || 1) - 1);
  const hasSetup = readHash();
  if (q.has('m') && MODELS[q.get('m')] && !hasSetup) return openModel(S.m);
  if (!q.has('m')) return showPicker();
  showModel();
}

/** No model named in the address: show only the cards, and wait for a pick. */
function showPicker() {
  document.body.classList.add('picking');
  learnHost.hidden = true; learnHost.innerHTML = '';
  picker.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', 'false'));
}
addEventListener('popstate', route);

// ---- Sources ----------------------------------------------------------------------------------
document.getElementById('sources').innerHTML = SOURCES.map(s =>
  `<li>${esc(s.t)}${s.u ? ` <a href="${s.u}" target="_blank" rel="noopener">${esc(s.u.replace('https://', ''))}</a>` : ' (book; no stable link)'}${s.u2 ? ` (<a href="${s.u2}" target="_blank" rel="noopener">published version on the author’s site</a>)` : ''}</li>`).join('');

// ---- Walkthrough and buttons ------------------------------------------------------------------
const tour = createTour(document.getElementById('tour-root'), step => {
  S.m = step.m; showModel();
  current.apply({ ...MODELS[step.m].defaults, ...step.set }, 'try', step.title);
  // Bring the changed figure and the Equilibrium box to the top, clear of the walkthrough card.
  stage.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});
document.getElementById('start-tour').addEventListener('click', () => tour.start());
document.querySelectorAll('[data-goto]').forEach(a => a.addEventListener('click', ev => {
  ev.preventDefault();
  S.m = a.dataset.goto; showModel();
  picker.scrollIntoView({ behavior: 'auto', block: 'start' });
}));

route();

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
  rt = setTimeout(() => { if (Math.abs(innerWidth - lastW) > 40) { lastW = innerWidth; current?.render(); } }, 150);
});
