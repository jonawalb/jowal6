// Correction Lab: state, URL hash, panel controls, rendering and walkthrough.
import { DEFAULTS, NOTIONAL, run, persistShare, waterfall, terms, N } from './model.js';
import { drawPeople, drawThreshold, drawSweep, drawWaterfall, drawForest } from './views.js';
import { WT_MODERATORS, ANCHOR } from '../data/evidence.js';
import { createTour } from './tour.js';
import { slider, choices, sec, pct, f2 } from './ui.js';

document.title = 'Correction Lab | Interactive Deterrence';
const S = { ...DEFAULTS };
const LIM = { e: [0.25, 3], rep: [1, 3], rs: [0, 1], alt: [0, 1], id: [-1, 3], sa: [0, 1], k: [0, 6] };
const ENUM = { tm: ['i', 'd'], src: ['i', 'o'] };

function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  for (const k of Object.keys(DEFAULTS)) {
    if (!q.has(k)) continue;
    const raw = q.get(k);
    if (ENUM[k]) { if (ENUM[k].includes(raw)) S[k] = raw; continue; }
    const v = Number(raw);
    if (Number.isFinite(v)) S[k] = Math.max(LIM[k][0], Math.min(LIM[k][1], ['rep', 'rs', 'alt', 'sa'].includes(k) ? Math.round(v) : v));
  }
}
function writeHash() {
  const q = new URLSearchParams();
  for (const k of Object.keys(DEFAULTS)) q.set(k, String(typeof S[k] === 'number' ? +S[k].toFixed(3) : S[k]));
  history.replaceState(null, '', '#' + q.toString());
}

const $ = id => document.getElementById(id);
const panel = $('panel');
const mod = l => WT_MODERATORS.find(m => m.lever === l);
const rOf = (l, k) => mod(l).levels[k].r.toFixed(2).replace('-', '−');

// ---------- Panel ----------
const st = sec(panel, 'Predicted persistence');
st.insertAdjacentHTML('beforeend', '<div class="status" id="status"><b></b><span></span></div><dl class="readout" id="read"></dl><p class="fine">A prediction of this tool’s <span class="notional">notional model</span>, not of any study.</p>');

const sl = {}, ch = {}, tg = {};
const toggle = (parent, key, label, help) => {
  parent.insertAdjacentHTML('beforeend', `<label class="tg"><input type="checkbox" id="tg-${key}"><span class="sw"></span><span class="t">${label}<small>${help}</small></span></label>`);
  const inp = $(`tg-${key}`);
  inp.addEventListener('change', () => { S[key] = inp.checked ? 1 : 0; changed(); });
  tg[key] = inp;
};

const cs = sec(panel, 'The correction');
cs.insertAdjacentHTML('beforeend', '<p class="fine">When it comes</p>');
ch.tm = choices(cs, [{ v: 'i', t: 'Immediately', s: `WT r = ${rOf('tm', 'i')}` }, { v: 'd', t: 'After a delay', s: `WT r = ${rOf('tm', 'd')}` }], S.tm, v => { S.tm = v; changed(); }, 'Timing');
cs.insertAdjacentHTML('beforeend', '<p class="fine">Who delivers it</p>');
ch.src = choices(cs, [{ v: 'i', t: 'In-group voice', s: `same-source r = ${rOf('src', 'i')}` }, { v: 'o', t: 'Out-group source', s: `other-source r = ${rOf('src', 'o')}` }], S.src, v => { S.src = v; changed(); }, 'Source');
toggle(cs, 'alt', 'Gives an alternative explanation', `Says what happened instead. WT: r = ${rOf('alt', '1')} with, ${rOf('alt', '0')} without.`);
toggle(cs, 'rs', 'Restates the myth', `WT: r = ${rOf('rs', '1')} restated, ${rOf('rs', '0')} not (not significant).`);

const ms = sec(panel, 'The myth and the audience');
sl.rep = slider(ms, { key: 'rep', label: 'Times the myth was heard before the correction', min: 1, max: 3, step: 1, fmt: v => String(v),
  help: `WT meta-regression: b = −.30 per added repetition.` }, S.rep, v => { S.rep = v; changed(); });
sl.e = slider(ms, { key: 'e', label: 'Emotional activation', math: 'E', min: 0.25, max: 3, step: 0.05, note: '<span class="notional">notional</span>',
  help: 'Fear, anger, grievance. Acts only through the Sticky Affect weight α(E). The meta-analyses find no reliable emotion effect.' }, S.e, v => { S.e = v; changed(); });
sl.id = slider(ms, { key: 'id', label: 'How much the claim means to their identity', math: 'Ū_I', min: -1, max: 3, step: 0.05, note: '<span class="notional">notional</span>',
  help: 'Mean identity value of the false claim across the 200 people.' }, S.id, v => { S.id = v; changed(); });

const ts = sec(panel, 'Model');
toggle(ts, 'sa', 'Sticky Affect weighting', 'On: emotion lowers the weight on accuracy, α(E) = 1/(1 + E). Off: α is held at its E = 1 value, as the meta-analytic null would suggest.');
sl.k = slider(ts, { key: 'k', label: 'How strongly contrasts move the model', math: 'κ', min: 0, max: 6, step: 0.1, note: '<span class="notional">notional</span>',
  help: 'Scales every meta-analytic Δz before it enters evidence or cost. 0 switches the evidence levers off.' }, S.k, v => { S.k = v; changed(); });

// ---------- Rendering ----------
function render() {
  const res = run(S), p = persistShare(S), held = res.revise.filter(r => !r).length;
  for (const k of Object.keys(sl)) sl[k].set(S[k]);
  for (const k of Object.keys(ch)) ch[k].set(S[k]);
  for (const k of Object.keys(tg)) tg[k].checked = !!S[k];
  const box = $('status');
  box.dataset.s = p >= 0.6 ? 'bad' : p >= 0.3 ? 'warn' : 'good';
  box.querySelector('b').textContent = `${pct(p)} still believe it`;
  box.querySelector('span').textContent = `Of 200 people who took in the myth, ${held} keep believing it after this correction. The average correction in the tool leaves ${pct(ANCHOR)}.`;
  const { d } = terms(S);
  $('read').innerHTML = [
    ['Accuracy weight α(E)', f2(res.a)],
    ['Evidence', f2(res.ev)],
    ['α(E)·evidence', f2(res.lhs)],
    ['Abandonment cost C', f2(res.C)],
    ['Evidence levers Σ Δz', f2(d.src + d.alt + d.rs)],
    ['Cost levers Σ Δz', f2(d.tm + d.rep)],
  ].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
  $('big').textContent = pct(p);
  $('big-sub').textContent = `${held} of ${N} people still believe the myth`;
  drawPeople($('people'), res);
  drawThreshold($('thresh'), res);
  drawSweep($('sweep'), S, e => { S.e = Math.round(e * 20) / 20; changed(); });
  drawWaterfall($('wf'), waterfall(S));
  drawForest($('forest'), S);
  $('sweep-note').textContent = S.sa
    ? `With Sticky Affect on, raising E from calm to high arousal moves persistence from ${pct(persistShare({ ...S, e: 0.25 }))} to ${pct(persistShare({ ...S, e: 3 }))}. With it off the dashed line is flat.`
    : 'Sticky Affect is off, so emotion has no effect: the solid and dashed lines coincide.';
  $('read-why').innerHTML = why(res);
}

function why(res) {
  const worst = [];
  if (S.tm === 'd') worst.push('it comes after a delay');
  if (S.src === 'o') worst.push('it comes from outside the group');
  if (!S.alt) worst.push('it retracts without explaining');
  if (S.rep > 1) worst.push(`the myth was heard ${S.rep} times first`);
  const lead = worst.length ? `This correction is weakened because ${listText(worst)}.` : 'This correction uses every design choice the meta-analyses favor.';
  return `${lead} A person revises only if α(E)·evidence (${f2(res.lhs)}) beats their own bar, (1 − α)·U<sub>I</sub> + C. With α = ${f2(res.a)}, identity carries ${pct(1 - res.a)} of the weight.`;
}
const listText = a => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

function changed() { render(); writeHash(); }

const tour = createTour($('tour-root'), set => { Object.assign(S, DEFAULTS, set); changed(); });
$('start-tour').addEventListener('click', () => tour.start());
$('copy-link').addEventListener('click', async e => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText(location.href); b.textContent = 'Link copied'; } catch (err) { b.textContent = 'Copy the address bar'; }
  setTimeout(() => { b.textContent = 'Copy link to this setup'; }, 1800);
});
$('reset').addEventListener('click', () => { Object.assign(S, DEFAULTS); changed(); });
$('calib').textContent = `e0 = ${NOTIONAL.e0.toFixed(2)}, C0 = ${NOTIONAL.C0}, spread of U_I = ${NOTIONAL.sdI}`;

let lastNarrow = null;
addEventListener('resize', () => { const n = innerWidth < 700; if (n !== lastNarrow) { lastNarrow = n; render(); } });
readHash();
changed();
lastNarrow = innerWidth < 700;
