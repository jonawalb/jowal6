// Sea Control Game: state, controls, rendering and URL hash.
import { BASE, PRESETS, DEFAULT_PRESET, DEFAULT_M } from '../data/presets.js';
import { SOURCES, QUOTES, CASES, LIT } from '../data/sources.js';
import { OPTS, solve } from './model.js';
import { drawMain } from './charts.js';
import { createTour } from './tour.js';
import { addExportBar } from '../../../shared/js/export.js';

const $ = id => document.getElementById(id);
const pct = v => Math.round(v * 100) + '%';
const f2 = v => (+v).toFixed(2);

// Slider definitions. `box` names the panel group each slider sits in.
const FIELDS = [
  { k: 'm', box: 'sl-mix', n: 'Budget in the battle fleet (m)', min: 0, max: 1, step: 0.01, fmt: pct, help: 'The rest buys distributed forces: escorts, mine countermeasures, sensors, small combatants.' },
  { k: 'R', box: 'sl-env', n: 'D\'s budget relative to C\'s (R)', min: 1, max: 5, step: 0.1, fmt: v => f2(v) + '×' },
  { k: 'k', box: 'sl-env', n: 'Cost-exchange advantage of denial (k)', min: 0.05, max: 3, step: 0.05, fmt: f2, help: 'How much damage C\'s budget buys through mines, submarines and missiles, relative to what D\'s distributed forces cost to counter it.' },
  { k: 'w', box: 'sl-env', n: 'Battle fleet needed to contain a fleet in being (w)', min: 0.5, max: 3, step: 0.1, fmt: v => f2(v) + '×', help: 'Units of D\'s battle fleet per unit of C\'s fleet.' },
  { k: 'phi', box: 'sl-env', n: 'Traffic an uncontained fleet in being can close (φ)', min: 0, max: 1, step: 0.05, fmt: pct },
  { k: 'L', box: 'sl-env', n: 'Value C puts on keeping its fleet (L)', min: 0, max: 2, step: 0.05, fmt: f2, help: 'In units of full command of the sea. Higher values make C less willing to risk battle.' },
  { k: 'tau', box: 'sl-ins', n: 'Insurers\' loss-rate threshold (τ)', min: 0.05, max: 0.6, step: 0.01, fmt: pct },
  { k: 'rho', box: 'sl-ins', n: 'Traffic that sails once insurers withdraw (ρ)', min: 0, max: 1, step: 0.05, fmt: pct },
  { k: 'theta', box: 'sl-lock', n: 'Planning weight on decisive battle (θ)', min: 0, max: 1, step: 0.05, fmt: pct, help: 'Doctrinal inheritance: how much D plans for the case where C accepts battle.' },
  { k: 'beta', box: 'sl-lock', n: 'Prestige premium on capital ships (β)', min: 0, max: 0.5, step: 0.01, fmt: f2, help: 'Prestige-platform bias: value D puts on each unit of m for its own sake.' },
];

const fromPreset = k => ({ preset: k, ...BASE, ...PRESETS.find(p => p.k === k).p });
const DEFAULT = () => ({ ...fromPreset(DEFAULT_PRESET), m: DEFAULT_M });
const S = DEFAULT();
let R = null;
const sliders = {};

// ---- Hash --------------------------------------------------------------------------------------------
const HK = FIELDS.map(f => f.k);
function writeHash() {
  const q = new URLSearchParams({ p: S.preset || 'custom' });
  HK.forEach(k => q.set(k, +(+S[k]).toFixed(3)));
  q.set('ins', +S.ins);
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (PRESETS.some(p => p.k === q.get('p'))) Object.assign(S, fromPreset(q.get('p')));
  FIELDS.forEach(f => {
    const n = parseFloat(q.get(f.k));
    if (q.has(f.k) && Number.isFinite(n)) S[f.k] = Math.max(f.min, Math.min(f.max, n));
  });
  if (q.has('ins')) S.ins = q.get('ins') === '1';
  if (q.get('p') === 'custom') S.preset = '';
}

// ---- Controls ------------------------------------------------------------------------------------------
function mountControls() {
  $('presets').innerHTML = PRESETS.map(p => `<button type="button" data-k="${p.k}"><b>${p.n}</b><br><small>${p.s}</small></button>`).join('');
  $('presets').querySelectorAll('button').forEach(b => b.onclick = () => { Object.assign(S, fromPreset(b.dataset.k)); update(); });
  FIELDS.forEach(f => {
    const id = 'sl-' + f.k, w = document.createElement('div');
    w.className = 'slider';
    w.innerHTML = `<div class="sl-h"><label for="${id}">${f.n}</label><output for="${id}"></output></div>
      <input type="range" id="${id}" min="${f.min}" max="${f.max}" step="${f.step}">${f.help ? `<small>${f.help}</small>` : ''}`;
    $(f.box).appendChild(w);
    const input = w.querySelector('input'), out = w.querySelector('output');
    input.addEventListener('input', () => { S[f.k] = +input.value; if (f.k !== 'm') S.preset = ''; update(); });
    sliders[f.k] = v => { input.value = v; out.textContent = f.fmt(+v); };
  });
  $('ins').onchange = e => { S.ins = e.target.checked; S.preset = ''; update(); };
}
function syncControls() {
  $('presets').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === S.preset));
  const note = PRESETS.find(p => p.k === S.preset)?.note;
  $('preset-note').hidden = !note;
  $('preset-note').textContent = note || '';
  FIELDS.forEach(f => sliders[f.k](S[f.k]));
  $('ins').checked = S.ins;
  $('sl-ins').classList.toggle('off', !S.ins);
}

// ---- Render ------------------------------------------------------------------------------------------
const optName = k => ({ battle: 'decisive battle', fleet: 'a fleet in being', denial: 'sea denial' })[k];

function renderHead() {
  $('open').textContent = pct(R.open);
  $('open-note').textContent = `at m = ${pct(S.m)}; the best mix keeps ${pct(R.openStar)} open`;
  $('opts').innerHTML = OPTS.map(o => {
    const c = R.cur[o.k], on = o.k === R.br;
    return `<tr class="${on ? 'on on-' + o.k : ''}"><th scope="row"><i class="dotk k-${o.k}"></i>${o.n}${on ? ' <span class="pill">C picks</span>' : ''}</th>
      <td class="num r">${pct(c.open)}</td><td class="num r">${f2(c.uC)}</td></tr>`;
  }).join('');
  const qt = QUOTES[R.br];
  $('quote').innerHTML = `“${qt.t}” <span class="who">${qt.who}</span>`;

  const gap = R.openStar - R.open, st = $('status');
  st.dataset.s = gap < 0.02 ? 'good' : gap < 0.12 ? 'warn' : 'bad';
  st.querySelector('b').textContent = `C answers with ${optName(R.br)}`;
  st.querySelector('span').textContent = gap < 0.02
    ? `This mix is at or near the best available: ${pct(R.open)} of traffic stays open.`
    : `A mix of ${pct(R.mStar)} battle fleet would keep ${pct(R.openStar)} open, ${Math.round(gap * 100)} points more than this one.`;
}

function renderChartNote() {
  const lockOn = S.theta > 0 || S.beta > 0;
  let t = `At the best mix, ${pct(R.mStar)} in the battle fleet, C answers with ${optName(R.brStar)}.`;
  if (R.cur.withdrawn && R.br === 'denial') t += ` Insurers have withdrawn: the loss rate of ${pct(R.cur.r)} is above the ${pct(S.tau)} threshold.`;
  if (lockOn) t += ` The locked-in navy buys ${pct(R.mL)} battle fleet; C answers with ${optName(R.brL)} and ${pct(R.openL)} of traffic stays open, ${Math.round((R.openStar - R.openL) * 100)} points below the best mix.`;
  $('chart-note').textContent = t;
}

function renderSummary() {
  const row = (n, v) => `<dt>${n}</dt><dd>${v}</dd>`;
  $('summary').innerHTML = row('Battle fleet (mR)', f2(S.m * S.R)) + row('Distributed forces', f2((1 - S.m) * S.R)) +
    row('C wins a battle', pct(R.cur.q)) + row('Loss rate under denial', pct(R.cur.r)) +
    row('Best mix m*', pct(R.mStar)) + row('Locked-in mix', S.theta > 0 || S.beta > 0 ? pct(R.mL) : '–');
}

function draw() {
  drawMain($('main'), R, S, m => { S.m = m; update(); });
}

function update() {
  R = solve(S, S.m);
  syncControls();
  renderHead();
  draw();
  renderChartNote();
  renderSummary();
  writeHash();
}

// ---- Boot ------------------------------------------------------------------------------------------------
readHash();
mountControls();
$('srclist').innerHTML = SOURCES.map(s => `<li>${s}</li>`).join('');
$('lit').innerHTML = LIT;
$('cases').innerHTML = CASES.map(c => `<article class="case"><h3>${c.t}</h3>${c.body}
  <button type="button" class="btn" data-p="${c.preset}">Load an illustrative setting</button></article>`).join('');
$('cases').querySelectorAll('button').forEach(b => b.onclick = () => {
  Object.assign(S, fromPreset(b.dataset.p), { m: 0.1 });
  update();
  $('maincard').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
});
$('main').addEventListener('keydown', e => {
  const d = { ArrowLeft: -0.01, ArrowRight: 0.01, ArrowDown: -0.05, ArrowUp: 0.05 }[e.key];
  if (d === undefined) return;
  e.preventDefault();
  S.m = Math.max(0, Math.min(1, Math.round((S.m + d) * 100) / 100));
  update();
});
const tour = createTour($('stage'), set => { Object.assign(S, DEFAULT(), set); update(); });
$('tour-btn').onclick = () => tour.start();
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy').textContent = 'Link copied'; }
  catch { $('copy').textContent = 'Copy failed'; }
  setTimeout(() => { $('copy').textContent = 'Copy link'; }, 1600);
};
$('reset').onclick = () => { tour.stop(); Object.assign(S, DEFAULT()); update(); };
update();
let rz = null;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(draw, 120); });
addExportBar($('main'), { target: () => $('main'), where: 'after',
  title: () => `Sea traffic kept open vs battle-fleet share (notional model)`,
  note: 'Model: the tool\'s own illustration of Walberg, "Too Much Mahan, Not Enough Corbett" (working paper, 2026). All values notional.',
  csv: () => [['m', 'challenger_choice', 'open_if_battle', 'open_if_fleet_in_being', 'open_if_denial', 'open_under_choice'],
    ...R.curve.filter((_, i) => i % 4 === 0).map(c => [c.m.toFixed(2), c.br, c.battle.toFixed(3), c.fleet.toFixed(3), c.denial.toFixed(3), c.open.toFixed(3)])] });
