// Crisis Stability Calculator: state, rendering and URL hash.
import { PRESETS, DEFAULT_PRESET } from '../data/presets.js';
import { SOURCES, SOURCE_ORDER, LIT } from '../data/sources.js';
import { evaluate } from './model.js';
import { SWEEPS, runSweep } from './sweeps.js';
import { drawDomain, drawProb, drawSweep } from './charts.js';
import { mountControls, syncControls, FIELDS } from './controls.js';
import { lessonSteps, SHEET } from './lesson.js';
import { learnButton, runLesson } from '../../../shared/js/learn.js';
import { afterUpdate, afterSweep } from './fx.js';
import { addExportBar } from '../../../shared/js/export.js';

const $ = id => document.getElementById(id);
const r0 = v => Math.round(v).toLocaleString();
const f2 = v => v.toFixed(2);
const fromPreset = k => { const p = PRESETS.find(x => x.k === k); return { preset: k, A: { ...p.A }, B: { ...p.B }, prl: p.prl, wpt: p.wpt }; };
const DEFAULT = () => ({ ...fromPreset(DEFAULT_PRESET), edit: 'A', sweep: 'mirv' });
const S = DEFAULT();
let R = null, SW = null;

// ---- Hash ------------------------------------------------------------------------------------
const KEYS = FIELDS.map(f => f.k);
function writeHash() {
  const q = new URLSearchParams({ p: S.preset || 'custom', a: KEYS.map(k => +(+S.A[k]).toFixed(3)).join('_'),
    b: KEYS.map(k => +(+S.B[k]).toFixed(3)).join('_'), prl: +S.prl, w: S.wpt, sw: S.sweep, e: S.edit });
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (PRESETS.some(p => p.k === q.get('p'))) Object.assign(S, fromPreset(q.get('p')));
  const side = (key, tgt) => {
    if (!q.has(key)) return;
    q.get(key).split('_').forEach((v, i) => {
      const f = FIELDS[i], n = parseFloat(v);
      if (f && Number.isFinite(n)) tgt[f.k] = Math.max(f.min, Math.min(f.max, n));
    });
  };
  side('a', S.A); side('b', S.B);
  if (q.get('p') === 'custom') S.preset = '';
  if (q.has('prl')) S.prl = q.get('prl') === '1';
  if (['1', '2'].includes(q.get('w'))) S.wpt = +q.get('w');
  if (SWEEPS.some(s => s.k === q.get('sw'))) S.sweep = q.get('sw');
  if (['A', 'B'].includes(q.get('e'))) S.edit = q.get('e');
}

// ---- Render ------------------------------------------------------------------------------------
function band(x) {
  return x >= 0.75 ? ['good', 'Robust first-strike stability'] : x >= 0.45 ? ['warn', 'Moderate first-strike stability'] : ['bad', 'Fragile: first-strike incentives'];
}

function renderHead() {
  const [s, label] = band(R.index);
  const st = $('status');
  st.dataset.s = s;
  st.querySelector('b').textContent = `Index ${f2(R.index)} · ${label}`;
  const weak = R.rA < R.rB ? 'A' : 'B', rw = Math.min(R.rA, R.rB);
  st.querySelector('span').textContent = Math.abs(R.rA - R.rB) < 0.02
    ? `Both sides face the same pull: striking first costs each about ${Math.round(rw * 100)}% of what waiting would.`
    : `Side ${weak} feels the stronger pull to go first: striking first costs it ${Math.round(rw * 100)}% of what waiting and being struck would.`;
  $('idx').textContent = f2(R.index);
  $('idx-note').textContent = `= ${f2(R.rA)} × ${f2(R.rB)}`;
  drawProb($('prob'), R);
  $('costs').innerHTML = `
    <tr><th scope="row">A strikes first</th><td class="num ca">${f2(R.c1A)}</td><td class="num cb">${f2(R.c2B)}</td></tr>
    <tr><th scope="row">B strikes first</th><td class="num ca">${f2(R.c2A)}</td><td class="num cb">${f2(R.c1B)}</td></tr>
    <tr class="ratio"><th scope="row">First ÷ second</th><td class="num ca">${f2(R.rA)}</td><td class="num cb">${f2(R.rB)}</td></tr>`;
}

function renderDomain() {
  drawDomain($('domain'), S, R, h => {
    if (!h) { $('hover').innerHTML = hoverDefault(); return; }
    const p = h.p, first = h.side === 'a' ? 'A' : 'B', vic = first === 'A' ? 'B' : 'A';
    const cF = p.cAtt, cV = p.cVic;
    $('hover').innerHTML = `<b>${first} strikes first.</b> ${first} has spent <b class="num">${r0(p.s)}</b> warheads on ${vic}'s forces and keeps <b class="num">${r0(p.left)}</b> for ${vic}'s value; <b class="num">${r0(p.surv)}</b> of ${vic}'s weapons survive. Cost to ${first} <b class="num">${f2(cF)}</b>, to ${vic} <b class="num">${f2(cV)}</b>.`;
  });
  $('hover').innerHTML = hoverDefault();
}
const hoverDefault = () => `A stops after spending <b class="num">${r0(R.ab.stop.s)}</b> warheads on counterforce; B stops after <b class="num">${r0(R.ba.stop.s)}</b>. Hover or tap along a curve to read any point.`;

function renderSweep() {
  SW = runSweep(S, S.sweep);
  $('sweep-choices').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === S.sweep));
  drawSweep($('sweep'), SW);
  const lo = Math.min(...SW.both), hi = Math.max(...SW.both);
  $('sweep-note').textContent = `${SW.sw.note} With both sides changed together the index runs from ${f2(lo)} to ${f2(hi)} across this range.`;
}

function renderSummary() {
  const row = (n, a, b) => `<dt>${n}</dt><dd><span class="ca">${a}</span> · <span class="cb">${b}</span></dd>`;
  const t = s => s.nf * s.mf + s.ns * s.ms;
  const fixShare = s => Math.round(100 * s.nf * s.mf / Math.max(1, t(s))) + '%';
  $('summary').innerHTML = row('Warheads', r0(t(S.A)), r0(t(S.B))) + row('In fixed launchers', fixShare(S.A), fixShare(S.B)) +
    row('Untargetable on alert', r0(S.A.ns * S.A.ms * S.A.alert), r0(S.B.ns * S.B.ms * S.B.alert)) +
    row('Counterforce spend', r0(R.ab.stop.s), r0(R.ba.stop.s));
}

function update() {
  R = evaluate(S);
  syncControls(S);
  renderHead();
  renderDomain();
  renderSweep();
  renderSummary();
  writeHash();
  afterUpdate(S, R);
}

// ---- Boot ----------------------------------------------------------------------------------------
readHash();
mountControls(S, update);
$('sweep-choices').innerHTML = SWEEPS.map(s => `<button type="button" class="btn" data-k="${s.k}">${s.short}</button>`).join('');
$('sweep-choices').querySelectorAll('button').forEach(b => b.onclick = () => { S.sweep = b.dataset.k; renderSweep(); writeHash(); afterSweep(); });
$('srclist').innerHTML = SOURCE_ORDER.map(k => `<li>${SOURCES[k]}</li>`).join('');
$('lit').innerHTML = LIT;
// "Learn to play": banner at the top of the stage; the lesson starts from the default posture.
const startLesson = () => { Object.assign(S, DEFAULT()); update(); scrollTo({ top: 0 }); runLesson(lessonSteps(), { slug: 'crisis-stability', title: 'Learn to play', onFinish: () => learn.refresh() }); };
const learn = learnButton($('stage'), { slug: 'crisis-stability', minutes: 5, onStart: startLesson, sheet: SHEET });
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy').textContent = 'Link copied'; }
  catch { $('copy').textContent = 'Copy failed'; }
  setTimeout(() => { $('copy').textContent = 'Copy link'; }, 1600);
};
$('reset').onclick = () => { Object.assign(S, DEFAULT()); update(); };
update();
let rz = null;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { renderDomain(); drawSweep($('sweep'), SW); }, 120); });
const NOTE = 'Kent & Thaler (RAND R-3765-AF, 1989) method; force postures and damage curves notional.';
addExportBar($('domain'), { target: () => $('domain'), title: () => `Weapons domain, stability index ${f2(R.index)} (notional postures)`, note: NOTE, where: 'after',
  csv: () => [['striker', 'counterforce_spent', 'striker_left_for_value', 'victim_surviving', 'cost_striker', 'cost_victim'],
    ...R.ab.pts.map(p => ['A', p.s.toFixed(0), p.left.toFixed(0), p.surv.toFixed(0), p.cAtt.toFixed(3), p.cVic.toFixed(3)]),
    ...R.ba.pts.map(p => ['B', p.s.toFixed(0), p.left.toFixed(0), p.surv.toFixed(0), p.cAtt.toFixed(3), p.cVic.toFixed(3)])] });
addExportBar($('sweep'), { target: () => $('sweep'), title: () => `Stability index vs ${SW.sw.n.toLowerCase()} (notional)`, note: NOTE, where: 'after',
  csv: () => [[SW.sw.n, 'A only', 'B only', 'both'], ...SW.xs.map((x, i) => [x, SW.a[i].toFixed(3), SW.b[i].toFixed(3), SW.both[i].toFixed(3)])] });
