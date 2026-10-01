// Will to Fight: state, URL hash, presets and render loop.
import { DEFAULTS, encode, decode, clean } from './params.js';
import { solveL1 } from './level1.js';
import { solveL2, adversary } from './level2.js';
import { drawG, drawS, drawR } from './plots.js';
import { mountPanel } from './panel.js';
import { renderStatus, renderGauge, renderAdversary, summary, renderWhy } from './readouts.js';
import { CASES, LEVELS, applyCase } from '../data/cases.js';
import { pulse, flash, reveal } from '../../../shared/js/motion.js';
import { addExportBar } from '../../../shared/js/export.js';

const S = decode(location.hash);
let prev = { xs: null, true: null, hat: null }, lastUnique = null, lastQuad = null;
const $ = id => document.getElementById(id);

function writeHash() { history.replaceState(null, '', '#' + encode(S)); }

function render() {
  const p = S.p;
  const L1 = solveL1(p, { mode: S.mode, prev: prev.xs, shock: p.shock });
  const L2 = solveL2(L1.W, p);
  const A = adversary(p, S.mode, prev.true, prev.hat);
  prev = { xs: L1.xs, true: A.xsTrue, hat: A.xsHat };
  $('mu-readout').textContent = `μ = ${p.theta0.toFixed(2)} + ${p.lamL}·${p.ell.toFixed(2)} + ${p.lamP}·${p.pi.toFixed(2)} + ${p.r.toFixed(2)}·${p.A} = ${L1.mu.toFixed(2)}`.replace(/-/g, '−');
  renderStatus($('status'), L1, p);
  drawG($('fig-g'), L1, p);
  drawS($('fig-s'), L1, p, A);
  drawR($('fig-r'), L1.W, L2, p);
  renderGauge($('gauge'), L1, L2);
  renderAdversary($('adv'), A);
  $('summary').textContent = summary(L1, L2, A);
  if (lastUnique !== null && lastUnique !== L1.uniq.unique) pulse($('uniq-box'));
  if (lastQuad !== null && lastQuad !== L2.quad) flash($('gauge'));
  lastUnique = L1.uniq.unique; lastQuad = L2.quad;
  writeHash();
}

let raf = 0;
const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); };

const panel = mountPanel($('panel'), S, (k, v) => {
  S.p[k] = clean(k, v);
  if (S.caseId) { S.caseId = ''; markCase(); renderWhy($('why-body'), null); $('why').hidden = true; }
  schedule();
}, m => { S.mode = m; panel.sync(S); schedule(); });

function markCase() {
  document.querySelectorAll('#case-list button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === S.caseId)));
}

function loadCase(id) {
  const cs = CASES.find(c => c.id === id);
  if (!cs) return;
  S.p = applyCase(cs, DEFAULTS);
  S.caseId = id;
  prev = { xs: null, true: null, hat: null };
  panel.sync(S); markCase();
  renderWhy($('why-body'), cs, LEVELS);
  $('why').hidden = false;
  render();
}

const list = $('case-list');
let group = '';
for (const c of CASES) {
  if (c.group !== group) { group = c.group; const h = document.createElement('span'); h.className = 'wf-case-g'; h.textContent = group; list.appendChild(h); }
  const b = document.createElement('button');
  b.type = 'button'; b.dataset.id = c.id;
  b.innerHTML = `<b>${c.name}</b><span>${c.short}</span>`;
  b.addEventListener('click', () => loadCase(c.id));
  list.appendChild(b);
}

$('reset').addEventListener('click', () => {
  S.p = { ...DEFAULTS }; S.mode = 'follow'; S.caseId = ''; prev = { xs: null, true: null, hat: null };
  panel.sync(S); markCase(); $('why').hidden = true; render();
});
$('copy-link').addEventListener('click', async () => {
  writeHash();
  try { await navigator.clipboard.writeText(location.href); $('copy-msg').textContent = 'Link copied: it stores every parameter.'; }
  catch (e) { $('copy-msg').textContent = 'Copy failed; the address bar holds the link.'; }
});

panel.sync(S);
markCase();
const hashKeys = [...new URLSearchParams(location.hash.slice(1)).keys()];
if (S.caseId && CASES.some(c => c.id === S.caseId)) {
  if (hashKeys.every(k => k === 'case' || k === 'sel')) loadCase(S.caseId); // '#case=<id>' alone loads the preset
  else {
    // A full shared link restores its own parameter values; the case only restores the justification cards.
    renderWhy($('why-body'), CASES.find(c => c.id === S.caseId), LEVELS);
    $('why').hidden = false;
    render();
  }
} else render();

document.querySelectorAll('.fig').forEach(card => {
  const svg = card.querySelector('svg[id]');
  if (svg) addExportBar(card, { target: () => svg, title: () => `Will to Fight: ${card.querySelector('.eyebrow')?.textContent || ''}`, note: 'Formal model; parameters as set in the tool link' });
});
reveal(document.querySelectorAll('.wf-learn .col'));

function renderMath() {
  if (!window.renderMathInElement) return false;
  window.renderMathInElement($('learn'), { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false });
  return true;
}
if (!renderMath()) window.addEventListener('load', renderMath, { once: true });
