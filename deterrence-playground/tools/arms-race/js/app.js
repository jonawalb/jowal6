// Arms Race Dynamics: state, controls, rendering and URL hash.
import { PRESETS2, DEFAULT2, STARTS, DEFAULT3 } from '../data/presets.js';
import { SOURCES, DILEMMA } from '../data/sources.js';
import { STOCKPILES, Y0, Y1 } from '../data/warheads.js';
import { equilibrium, eigen2, stable2, path2, fate, fitSide } from './model.js';
import { drawPhase, drawTime, DOM } from './phase.js';
import { mountThree, renderThree, fromPreset3, hash3, readHash3 } from './three.js';
import { createTour } from './tour.js';
import { addExportBar } from '../../../shared/js/export.js';

const $ = id => document.getElementById(id);
const f2 = v => (+v).toFixed(2);
const sgn = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);

const FIELDS = [
  { k: 'k', n: 'A\'s reaction to B (k)', min: 0, max: 1.5, step: 0.01 },
  { k: 'l', n: 'B\'s reaction to A (l)', min: 0, max: 1.5, step: 0.01 },
  { k: 'a', n: 'A\'s fatigue and expense (a)', min: 0, max: 1.5, step: 0.01 },
  { k: 'b', n: 'B\'s fatigue and expense (b)', min: 0, max: 1.5, step: 0.01 },
  { k: 'g', n: 'A\'s grievance (g)', min: -10, max: 10, step: 0.1, help: 'Negative values act as goodwill.' },
  { k: 'h', n: 'B\'s grievance (h)', min: -10, max: 10, step: 0.1 },
];
const FITS = [{ k: 'y0', n: 'Fit from', min: 1950, max: 2016 }, { k: 'y1', n: 'Fit to', min: 1960, max: Y1 - 1 }];

const from2 = k => ({ preset: k, ...PRESETS2.find(p => p.k === k).p });
const DEFAULT = () => ({ mode: 'two', ...from2(DEFAULT2), starts: STARTS.map(s => s.slice()), overlay: false, y0: 1950, y1: 1986 });
const S = DEFAULT();
const S3 = fromPreset3(DEFAULT3); // three-party state, kept apart from the two-party coefficients
const sl = {};
let animate = false, FIT = null;

// ---- Hash ---------------------------------------------------------------------------------------------
function writeHash() {
  const q = new URLSearchParams({ m: S.mode, p: S.preset || 'custom' });
  FIELDS.forEach(f => q.set(f.k, +(+S[f.k]).toFixed(3)));
  q.set('s', S.starts.map(([x, y]) => `${x}_${y}`).join('~'));
  q.set('ov', +S.overlay); q.set('y0', S.y0); q.set('y1', S.y1);
  Object.entries(hash3(S3)).forEach(([k, v]) => q.set(k, v));
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (['two', 'three'].includes(q.get('m'))) S.mode = q.get('m');
  if (PRESETS2.some(p => p.k === q.get('p'))) Object.assign(S, from2(q.get('p')));
  FIELDS.forEach(f => { const n = parseFloat(q.get(f.k)); if (q.has(f.k) && Number.isFinite(n)) S[f.k] = Math.max(f.min, Math.min(f.max, n)); });
  if (q.get('p') === 'custom') S.preset = '';
  if (q.has('s')) S.starts = q.get('s').split('~').map(t => t.split('_').map(parseFloat)).filter(p => p.length === 2 && p.every(Number.isFinite)).slice(-8);
  if (q.has('ov')) S.overlay = q.get('ov') === '1';
  FITS.forEach(f => { const n = parseInt(q.get(f.k), 10); if (Number.isFinite(n)) S[f.k] = Math.max(f.min, Math.min(f.max, n)); });
  readHash3(q, S3);
}

// ---- Controls -------------------------------------------------------------------------------------------
function slider(box, f, get, set) {
  const id = 'sl-' + f.k, w = document.createElement('div');
  w.className = 'slider';
  w.innerHTML = `<div class="sl-h"><label for="${id}">${f.n}</label><output for="${id}"></output></div>
    <input type="range" id="${id}" min="${f.min}" max="${f.max}" step="${f.step || 1}">${f.help ? `<small>${f.help}</small>` : ''}`;
  box.appendChild(w);
  const input = w.querySelector('input'), out = w.querySelector('output');
  input.addEventListener('input', () => set(+input.value));
  sl[f.k] = () => { input.value = get(); out.textContent = f.step ? f2(get()) : String(get()); };
}
function mountControls() {
  $('presets').innerHTML = PRESETS2.map(p => `<button type="button" data-k="${p.k}"><b>${p.n}</b><br><small>${p.s}</small></button>`).join('');
  $('presets').querySelectorAll('button').forEach(b => b.onclick = () => { Object.assign(S, from2(b.dataset.k)); animate = true; update(); });
  FIELDS.forEach(f => slider($('sl2'), f, () => S[f.k], v => { S[f.k] = v; S.preset = ''; update(); }));
  FITS.forEach(f => slider($('fitsl'), f, () => S[f.k], v => {
    S[f.k] = v;
    if (S.y1 - S.y0 < 8) { if (f.k === 'y0') S.y1 = Math.min(Y1 - 1, S.y0 + 8); else S.y0 = Math.max(1950, S.y1 - 8); }
    update();
  }));
  $('overlay').onchange = e => { S.overlay = e.target.checked; update(); };
  $('clear').onclick = () => { S.starts = []; update(); };
  $('apply-fit').onclick = () => {
    if (!FIT) return;
    const clamp = (k, v) => { const f = FIELDS.find(x => x.k === k); return Math.max(f.min, Math.min(f.max, Math.round(v * 100) / 100)); };
    Object.assign(S, { k: clamp('k', FIT.us.react), a: clamp('a', FIT.us.fatigue), g: clamp('g', FIT.us.griev),
      l: clamp('l', FIT.ru.react), b: clamp('b', FIT.ru.fatigue), h: clamp('h', FIT.ru.griev), preset: '' });
    const i = S.y0 - Y0;
    S.starts = [[+(STOCKPILES.US[i] / 1000).toFixed(1), +(STOCKPILES.RU[i] / 1000).toFixed(1)]];
    animate = true; update();
  };
  $('mode').querySelectorAll('button').forEach(b => b.onclick = () => { S.mode = b.dataset.m; update(); });
  mountThree(S3, update);
}
function sync() {
  $('mode').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === S.mode));
  const two = S.mode === 'two';
  $('two-stage').hidden = $('two-panel').hidden = !two;
  $('three-stage').hidden = $('three-panel').hidden = two;
  $('presets').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === S.preset));
  const note = PRESETS2.find(p => p.k === S.preset)?.note;
  $('preset-note').hidden = !note;
  $('preset-note').textContent = note || '';
  FIELDS.forEach(f => sl[f.k]());
  FITS.forEach(f => sl[f.k]());
  $('overlay').checked = S.overlay;
  document.body.classList.toggle('ov', S.overlay);
}

// ---- Real data and fit ----------------------------------------------------------------------------------
function dataView() {
  if (!S.overlay) { FIT = null; return null; }
  const us = STOCKPILES.US.map(v => v / 1000), ru = STOCKPILES.RU.map(v => v / 1000);
  const i0 = S.y0 - Y0, i1 = S.y1 - Y0;
  FIT = { us: fitSide(us, ru, i0, i1), ru: fitSide(ru, us, i0, i1) };
  let fitPath = null;
  if (FIT.us && FIT.ru) {
    let x = us[i0], y = ru[i0];
    fitPath = [[S.y0, x, y]];
    for (let t = S.y0 + 1; t <= S.y1; t++) {
      const nx = x + FIT.us.react * y - FIT.us.fatigue * x + FIT.us.griev, ny = y + FIT.ru.react * x - FIT.ru.fatigue * y + FIT.ru.griev;
      x = nx; y = ny; fitPath.push([t, x, y]);
    }
  }
  return { data: { pts: us.map((x, i) => [Y0 + i, x, ru[i]]), win: [[us[i0], ru[i0]], [us[i1], ru[i1]]] }, fitPath };
}
function renderFit() {
  $('datasec').classList.toggle('off', !S.overlay);
  if (!FIT || !FIT.us || !FIT.ru) { $('fit').innerHTML = '<tr><td colspan="5">Switch the overlay on to fit.</td></tr>'; $('fit-note').textContent = ''; $('apply-fit').disabled = true; return; }
  const row = (n, f) => `<tr><th scope="row">${n}</th><td class="num r">${sgn(f.react)}</td><td class="num r">${sgn(f.fatigue)}</td><td class="num r">${sgn(f.griev)}</td><td class="num r">${f2(f.r2)}</td></tr>`;
  $('fit').innerHTML = row('U.S. (k, a, g)', FIT.us) + row('USSR/Russia (l, b, h)', FIT.ru);
  const wrong = [FIT.us.react, FIT.ru.react, FIT.us.fatigue, FIT.ru.fatigue].some(v => v < 0);
  const ab = FIT.us.fatigue * FIT.ru.fatigue, kl = FIT.us.react * FIT.ru.react;
  $('fit-note').textContent = `Illustrative least-squares fit to annual changes, ${S.y0}–${S.y1} (${FIT.us.n} years). Fitted ab = ${ab.toFixed(4)}, kl = ${kl.toFixed(4)}.` +
    (wrong ? ' At least one coefficient has the wrong sign for Richardson\'s story, a sign the equations do not describe this period well.' : '');
  $('apply-fit').disabled = false;
}

// ---- Render ---------------------------------------------------------------------------------------------
function renderTwo() {
  const eq = equilibrium(S), st = stable2(S), ev = eigen2(S), ab = S.a * S.b, kl = S.k * S.l;
  $('ab').textContent = `${f2(ab)} ${ab > kl ? '>' : ab < kl ? '<' : '='} ${f2(kl)}`;
  $('ab-note').textContent = st ? 'fatigue wins: the race settles' : 'reaction wins: the balance is unstable';
  const fmtE = e => f2(e.re) + (e.im ? ` ± ${f2(Math.abs(e.im))}i` : '');
  $('eqread').innerHTML = `<dt>Equilibrium x*, y*</dt><dd>${eq ? `${f2(eq.x)}, ${f2(eq.y)}` : 'none (parallel lines)'}</dd>
    <dt>Growth rates (eigenvalues)</dt><dd>${ev.map(fmtE).join(', ')} a year</dd>`;
  const view = { paths: S.starts.map(([x, y]) => path2(S, x, y, 60, 0.1, -5, DOM * 3)), animate, ...(dataView() || {}) };
  drawPhase($('phase'), S, view, (x, y) => { S.starts = [...S.starts, [x, y]].slice(-8); animate = true; update(); });
  animate = false;
  const lastP = view.paths[view.paths.length - 1];
  $('timecard').hidden = !lastP;
  if (lastP) drawTime($('time'), [{ c: 'var(--c1)', pts: lastP.map(p => [p[0], p[1]]) }, { c: 'var(--c2)', pts: lastP.map(p => [p[0], p[2]]) }], { T: 60 });
  else $('time').replaceChildren();
  const fates = view.paths.map(p => fate(p, eq));
  const cnt = k => fates.filter(f => f === k).length;
  $('phase-note').textContent = view.paths.length
    ? `${view.paths.length} race${view.paths.length > 1 ? 's' : ''}: ${cnt('settles')} settle${cnt('runaway') ? `, ${cnt('runaway')} run away` : ''}${cnt('disarm') ? `, ${cnt('disarm')} head to disarmament` : ''}${cnt('moving') ? `, ${cnt('moving')} still moving after 60 years` : ''}. Click to add another; the last eight are kept.`
    : 'Click the plane to start a race.';
  const s = $('status');
  const where = eq && eq.x >= 0 && eq.y >= 0;
  s.dataset.s = st ? (where ? 'good' : 'warn') : 'bad';
  s.querySelector('b').textContent = st ? (where ? 'Stable race' : 'Stable, toward disarmament') : (eq && where ? 'Unstable: runaway or disarmament' : 'Runaway race');
  s.querySelector('span').textContent = st
    ? (where ? `Every race settles at A ${f2(eq.x)}, B ${f2(eq.y)}, wherever it starts.` : 'The equilibrium lies at negative arms: races wind down toward zero.')
    : (eq && where ? 'Races that start above the dividing line run away; races below it collapse toward disarmament.' : 'Arms grow without limit from any starting point.');
}

function update() {
  sync();
  if (S.mode === 'two') { renderTwo(); renderFit(); } else renderThree(S3);
  writeHash();
}

// ---- Boot -----------------------------------------------------------------------------------------------
readHash();
mountControls();
$('srclist').innerHTML = SOURCES.map(s => `<li>${s}</li>`).join('');
$('dilemma').innerHTML = DILEMMA;
const tour = createTour($('stage'), set => {
  const { p3, ...rest } = JSON.parse(JSON.stringify(set));
  Object.assign(S, DEFAULT(), rest);
  Object.assign(S3, fromPreset3(p3 || DEFAULT3));
  animate = true; update();
});
$('tour-btn').onclick = () => tour.start();
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy').textContent = 'Link copied'; }
  catch { $('copy').textContent = 'Copy failed'; }
  setTimeout(() => { $('copy').textContent = 'Copy link'; }, 1600);
};
$('reset').onclick = () => { tour.stop(); Object.assign(S, DEFAULT()); Object.assign(S3, fromPreset3(DEFAULT3)); update(); };
update();
let rz = null;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(update, 120); });
const NOTE = 'Richardson arms-race model; coefficients notional. Stockpiles: FAS via Our World in Data (CC BY 4.0).';
addExportBar($('phase'), { target: () => $('phase'), where: 'after', title: () => 'Richardson phase plane', note: NOTE,
  csv: () => [['start', 't', 'x', 'y'], ...S.starts.flatMap(([x0, y0], i) => path2(S, x0, y0, 60, 1).map(p => [i + 1, p[0].toFixed(0), p[1].toFixed(3), p[2].toFixed(3)]))] });
addExportBar($('time3'), { target: () => $('time3'), where: 'after', title: () => 'Three-party Richardson extension (notional coefficients)', note: NOTE });
