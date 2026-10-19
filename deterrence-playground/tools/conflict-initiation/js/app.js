// Conflict Initiation: tabs, parameters, the Idea / Theory / Parameters views, and the URL hash.
import { mountChrome } from '../../../shared/js/chrome.js';
import { learnButton, runLesson } from '../../../shared/js/learn.js';
import { DEFAULTS, solve, netShare, retaliationAfterStrategic, strategicValue } from '../data/engine.js';
import { PARAMS, PARAM_GROUPS, PRESETS, IDEA, CORE, STEPS } from '../data/content.js';
import * as EXT from '../data/extension.js';
import { mountPlay } from './play.js';
import { mountTree } from './tree.js';
import { lessonSteps, SHEET } from './lesson.js';
import { f2, pct, esc, tex, typeset } from './util.js';

mountChrome({ title: 'Conflict Initiation', sub: 'How expectations of escalation management shape whether, and how, a state starts a war.', category: 'Game theory' });

const TABS = ['idea', 'theory', 'params', 'play', 'solve'];
const S = { tab: 'idea', P: { ...DEFAULTS }, root: null };
const view = document.getElementById('view'), aside = document.getElementById('aside'), layout = document.getElementById('layout');
const tabs = [...document.querySelectorAll('.tabs [role=tab]')];
const META = Object.fromEntries(PARAMS.map(p => [p.k, p]));

// ---------------------------------------------------------------- hash
function writeHash() {
  const q = new URLSearchParams({ t: S.tab });
  for (const k of Object.keys(DEFAULTS)) if (S.P[k] !== DEFAULTS[k]) q.set(k, String(S.P[k]));
  history.replaceState(null, '', '#' + q.toString());
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (TABS.includes(q.get('t'))) S.tab = q.get('t');
  for (const k of Object.keys(DEFAULTS)) {
    if (!q.has(k)) continue;
    const v = Number(q.get(k)), m = META[k];
    if (Number.isFinite(v) && m) S.P[k] = Math.min(m.max, Math.max(m.min, v));
  }
}

// ---------------------------------------------------------------- prediction summary
const optLabel = n => n.edges[n.best].label;
function summary(P, root) {
  const open = root.edges[root.best], b = open.node;
  const reply = b.kind === 'B' ? optLabel(b) : '';
  const ns = netShare(P, root);
  return `<div class="ci-pred" id="ci-pred">
    <p class="eyebrow">What the model predicts</p>
    <p class="ci-pred-main"><b class="pa">A: ${esc(open.label)}</b>${reply ? ` <span class="arrow">→</span> <b class="pb">B: ${esc(reply)}</b>` : ''}</p>
    <dl class="ci-nums">
      <div><dt>A's expected share of the pie</dt><dd>${pct(root.s)}</dd></div>
      <div><dt>A's expected losses</dt><dd>${f2(root.la)}</dd></div>
      <div><dt>A's net share</dt><dd>${f2(ns)}</dd></div>
      <div><dt>Payoffs (A, B)</dt><dd>${f2(root.v[0])}, ${f2(root.v[1])}</dd></div>
    </dl>
  </div>`;
}

// ---------------------------------------------------------------- parameters
function presetBar() {
  return `<div class="ci-presets" id="ci-presets"><span class="lbl">Presets</span>${PRESETS.map(p =>
    `<button type="button" class="chip" data-preset="${p.id}" title="${esc(p.note)}">${esc(p.name)}</button>`).join('')}
    <button type="button" class="chip ghost" data-reset>Reset</button></div>`;
}
function sliderRow(p, full) {
  const v = S.P[p.k];
  return `<div class="ci-sl" data-k="${p.k}">
    <label for="sl-${p.k}"><span class="sym">${tex(p.sym)}</span> ${esc(p.name)}</label>
    <input id="sl-${p.k}" type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${v}">
    <output for="sl-${p.k}">${f2(v)}</output>
    ${full ? `<p class="help">${esc(p.help)}</p>` : ''}
  </div>`;
}
function paramPanel(full) {
  return PARAM_GROUPS.map((g, i) => `<details class="ci-grp" ${full || i < 2 ? 'open' : ''}>
    <summary><b>${esc(g.name)}</b>${full ? `<span>${esc(g.blurb)}</span>` : ''}</summary>
    <div class="ci-grp-b">${PARAMS.filter(p => p.g === g.id).map(p => sliderRow(p, full)).join('')}</div>
  </details>`).join('');
}
function wireParams(root) {
  root.querySelectorAll('.ci-sl input').forEach(inp => {
    inp.addEventListener('input', () => {
      const k = inp.closest('.ci-sl').dataset.k;
      S.P[k] = Number(inp.value);
      document.querySelectorAll(`.ci-sl[data-k="${k}"]`).forEach(row => {
        row.querySelector('output').textContent = f2(S.P[k]);
        const other = row.querySelector('input'); if (other !== inp) other.value = inp.value;
      });
      schedule();
    });
  });
  root.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
    const pr = PRESETS.find(p => p.id === b.dataset.preset);
    S.P = { ...DEFAULTS, ...pr.set }; S.preset = pr; render();
  }));
  root.querySelectorAll('[data-reset]').forEach(b => b.addEventListener('click', () => { S.P = { ...DEFAULTS }; S.preset = null; render(); }));
}

let raf = 0;
function schedule() { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { S.preset = null; recompute(); refresh(); }); }
function recompute() { S.root = solve(S.P); }

// ---------------------------------------------------------------- views
function exchangeCalc() {
  return `<section class="ci-sec ci-calc" id="ci-calc">
    <h2>Pie versus losses</h2>
    <p>Every outcome gives A a <b>share of the pie</b> and some <b>losses</b> (as a share of national value). A's payoff is
      <span class="ci-math">${tex('\\text{payoff}=V\\times\\text{share}-\\text{losses}')}</span>, where the <b>stakes</b> ${tex('V')} are what the whole pie is worth to A in the same units as its losses. Dividing by ${tex('V')} gives the
      <b>net share</b>: ${tex('\\text{share}-\\text{losses}/V')}. Compare any two outcomes here.</p>
    <div class="calc-grid">
      <fieldset><legend>Outcome 1</legend>
        <label>Share of the pie <input type="number" id="c1s" min="0" max="100" step="1" value="80">%</label>
        <label>Losses <input type="number" id="c1l" min="0" max="100" step="1" value="4">%</label></fieldset>
      <fieldset><legend>Outcome 2</legend>
        <label>Share of the pie <input type="number" id="c2s" min="0" max="100" step="1" value="100">%</label>
        <label>Losses <input type="number" id="c2l" min="0" max="100" step="1" value="40">%</label></fieldset>
      <fieldset><legend>Stakes</legend>
        <label><input type="range" id="cV" min="0.2" max="4" step="0.05" value="1"> <output id="cVo">1.00</output></label></fieldset>
    </div>
    <p class="calc-out" id="calc-out" aria-live="polite"></p>
  </section>`;
}
function wireCalc() {
  const g = id => document.getElementById(id);
  const run = () => {
    const s1 = +g('c1s').value / 100, l1 = +g('c1l').value / 100, s2 = +g('c2s').value / 100, l2 = +g('c2l').value / 100, V = +g('cV').value;
    g('cVo').textContent = f2(V);
    const n1 = s1 - l1 / V, n2 = s2 - l2 / V;
    const be = s1 !== s2 ? (l2 - l1) / (s2 - s1) : null;
    const win = Math.abs(n1 - n2) < 1e-9 ? 'They are worth the same.' : `<b>Outcome ${n1 > n2 ? 1 : 2} is better.</b>`;
    g('calc-out').innerHTML = `Net share: outcome 1 = ${f2(n1)}, outcome 2 = ${f2(n2)}. ${win}` +
      (be !== null && be > 0 ? ` The outcome with more pie wins once the stakes exceed ${f2(be)}.` : '');
  };
  ['c1s', 'c1l', 'c2s', 'c2l', 'cV'].forEach(id => g(id).addEventListener('input', run));
  run();
}

function ideaView() {
  return IDEA + exchangeCalc() + `<section class="ci-sec"><h2>Core ideas</h2><ol class="ci-core">${CORE.map(([h, b]) => `<li><b>${h}.</b> ${b}</li>`).join('')}</ol>
    <p class="ci-next"><button type="button" class="btn" data-goto="play">Play the game</button> <button type="button" class="btn ghost" data-goto="solve">See the solved tree</button></p></section>`;
}

const yes = b => b ? '<span class="ok">holds</span>' : '<span class="no">fails</span>';
function theoryView() {
  const P = S.P, root = S.root;
  const bRet = P.V_B * (1 - P.p_nuc) >= P.nB - P.hB;
  const r = retaliationAfterStrategic(P);
  const altBest = Math.max(...root.edges.filter(e => e.key !== 'strategic').map(e => e.node.v[0]));
  const den = r * (P.V_A * (1 - P.p_str) + P.DA);
  const kStar = den > 0 ? 1 - (P.V_A - P.sA - altBest) / den : null;
  const widen = P.V_B * (P.p_lim * P.s_lim - P.p_thr), dc = P.cB_thr - P.cB_lim;
  const ext = EXT.applies(P);
  const mb = EXT.muBar(P);
  return `<section class="ci-sec">
    <h2>How the game is solved</h2>
    <p>The game is solved by <b>backward induction</b>: start at the last decisions, work out what each side would do there, replace each decision by its value, and move up one step at a time until you reach A's opening. Chance nodes are replaced by their expected value. The result is a <b>subgame-perfect equilibrium</b>: every threat in it is one the player would actually carry out.</p>
    <ol class="ci-steps">${STEPS.map(([h, b]) => `<li><b>${h}${/[?.]$/.test(h) ? '' : '.'}</b> ${b}</li>`).join('')}</ol>
  </section>
  <section class="ci-sec">
    <h2>The key conditions, with your current numbers</h2>
    <div class="ci-cond">
      <h3>1. Payoffs and net share</h3>
      <p>${tex('U^A=V^A\\times\\text{share}-\\text{losses}^A,\\quad U^B=V^B\\times(1-\\text{share})-\\text{losses}^B', true)}</p>
      <p>Now: A's equilibrium net share is <b>${f2(netShare(P, root))}</b> (share ${pct(root.s)}, losses ${f2(root.la)}, stakes ${f2(P.V_A)}).</p>
    </div>
    <div class="ci-cond">
      <h3>2. Would B answer a low-yield strike in kind?</h3>
      <p>${tex('V^B\\,(1-p_{\\text{nuclear}})\\ \\ge\\ n^B-h^B', true)}</p>
      <p>Now: ${f2(P.V_B * (1 - P.p_nuc))} against ${f2(P.nB - P.hB)}: the condition ${yes(bRet)}, so B ${bRet ? 'would retaliate' : 'would give in'} after a low-yield strike in a war over the whole pie.</p>
    </div>
    <div class="ci-cond">
      <h3>3. The strategic strike</h3>
      <p>After absorbing a strike, B retaliates by choice only if ${tex('V^B(1-p_{\\text{exchange}})\\ge D^B-H^B')}. Otherwise retaliation happens only when it is automatic:</p>
      <p>${tex('r=\\alpha^B+(1-\\alpha^B)\\,\\mathbf{1}[\\text{B prefers to retaliate}],\\qquad U^A_{\\text{strike}}=V^A-\\sigma^A-(1-\\kappa^A)\\,r\\,\\big(V^A(1-p_{\\text{exchange}})+D^A\\big)', true)}</p>
      <p>Now: chance of retaliation if B survives ${tex('r')} = <b>${f2(r)}</b>. A strategic opening is worth <b>${f2(strategicValue(P))}</b> to A, against <b>${f2(altBest)}</b> for its best other opening.
      ${kStar === null ? 'No retaliation is possible, so the disarming chance does not matter.' : kStar <= 0 ? 'The strike beats every other opening at any disarming chance.' : kStar >= 1 ? 'No disarming chance makes the strike A\'s best opening.' : `A would prefer the strike once its disarming chance passes ${tex('\\kappa^*')} = <b>${f2(kStar)}</b> (now ${f2(P.kA)}).`}</p>
    </div>
    <div class="ci-cond">
      <h3>4. When does B widen a limited war?</h3>
      <p>${tex('V^B\\,(p_{\\text{limited}}\\times s-p_{\\text{theater}})\\ >\\ c^B_{\\text{theater}}-c^B_{\\text{limited}}', true)}</p>
      <p>Now: ${f2(widen)} against ${f2(dc)}: the condition ${yes(widen > dc)}. This rule is exact when nuclear options are off the table; with them, the tree decides.</p>
    </div>
    <div class="ci-cond">
      <h3>5. Nuclear coercion or a limited fait accompli?</h3>
      <p>If B would give in to either opening, A prefers low-yield coercion when ${tex('\\tau^A/V^A<1-s')}.</p>
      <p>Now: ${f2(P.tA / P.V_A)} against ${f2(1 - P.s_lim)}: the condition ${yes(P.tA / P.V_A < 1 - P.s_lim)}.</p>
    </div>
  </section>
  <section class="ci-sec"><h2>Results</h2><ol class="ci-core">${CORE.map(([h, b]) => `<li><b>${h}.</b> ${b}</li>`).join('')}</ol>
    <p class="fine">Each result was checked against the full game tree on random parameter draws. Results 2 and 3 are exact under the conditions stated above.</p></section>
  <section class="ci-sec">
    <h2>Extension: uncertain resolve</h2>
    <p>Suppose A cannot tell whether B is <b>resolute</b> (would answer a low-yield strike in kind) and has only a belief ${tex('\\mu')} that it is. After losing a limited war, A goes nuclear only if it is confident enough that B will give in:</p>
    <p>${tex('\\mu<\\bar\\mu=\\dfrac{V^A s-\\tau^A}{V^A s\\,(1-p_{\\text{nuclear}})+n^A}', true)}</p>
    <p>Weak B types do not simply give in: some bluff by fighting, which keeps A uncertain, and A sometimes escalates anyway. The chance of nuclear first use rises with ${tex('\\mu')} up to ${tex('\\bar\\mu')}, then drops to zero.</p>
    ${ext ? `<p>Now: ${tex('\\bar\\mu')} = <b>${f2(mb)}</b>.</p>${extChart(P)}` : '<p class="fine">At the current numbers this extension does not apply (it needs A to lose by escalating against a resolute B, and B\'s bluff to be worth something). Try the Baseline preset.</p>'}
    <p class="fine">This is a candidate equilibrium: its indifference conditions were checked numerically; off-path beliefs are not yet checked.</p>
  </section>`;
}

function extChart(P) {
  const W = 560, H = 200, m = { l: 44, r: 12, t: 12, b: 34 };
  const xs = Array.from({ length: 201 }, (_, i) => i / 200);
  const pr = xs.map(mu => EXT.prFirstUse(P, mu));
  const top = Math.max(0.05, ...pr) * 1.1;
  const X = x => m.l + x * (W - m.l - m.r), Y = y => H - m.b - (y / top) * (H - m.t - m.b);
  const d = xs.map((x, i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(pr[i]).toFixed(1)}`).join('');
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return `<figure class="ci-fig"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Chance of nuclear first use against A's belief that B is resolute">
    ${ticks.map(t => `<line x1="${X(t)}" x2="${X(t)}" y1="${m.t}" y2="${H - m.b}" class="grid"/><text x="${X(t)}" y="${H - m.b + 16}" class="ax" text-anchor="middle">${t}</text>`).join('')}
    <line x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}" class="axis"/>
    <text x="${m.l - 6}" y="${Y(0) + 4}" class="ax" text-anchor="end">0</text><text x="${m.l - 6}" y="${Y(top / 1.1) + 4}" class="ax" text-anchor="end">${pct(top / 1.1)}</text>
    <line x1="${X(EXT.muBar(P))}" x2="${X(EXT.muBar(P))}" y1="${m.t}" y2="${H - m.b}" class="cut"/>
    <path d="${d}" class="ln"/>
    <text x="${(m.l + W - m.r) / 2}" y="${H - 4}" class="ax" text-anchor="middle">A's belief that B is resolute</text>
  </svg><figcaption>Chance that A uses nuclear weapons first, given it opens a limited war. Dotted line: the escalation cutoff.</figcaption></figure>`;
}

function paramsView() {
  return `<section class="ci-sec"><h2>Parameters</h2>
    <p>Every number in the model, grouped. Losses are measured as a share of national value; the stakes ${tex('V')} put the pie in the same units. Each side has its own copy of most parameters, marked A or B. Move a slider and every tab updates; the address bar keeps your settings, so a link reproduces them.</p>
    ${presetBar()}<div id="preset-note" class="fine"></div>
    <div class="ci-params-full">${paramPanel(true)}</div></section>`;
}

// ---------------------------------------------------------------- render
let play = null, tree = null;
function render() {
  recompute();
  tabs.forEach(t => { const on = t.dataset.t === S.tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
  document.body.dataset.tab = S.tab;
  const side = S.tab === 'play' || S.tab === 'solve';
  layout.classList.toggle('with-aside', side);
  play = tree = null;
  if (S.tab === 'idea') view.innerHTML = ideaView();
  else if (S.tab === 'theory') view.innerHTML = theoryView();
  else if (S.tab === 'params') view.innerHTML = paramsView();
  else if (S.tab === 'play') { view.innerHTML = ''; play = mountPlay(view, ctx); }
  else { view.innerHTML = ''; tree = mountTree(view, ctx); }
  aside.innerHTML = side ? summary(S.P, S.root) + presetBar() + `<div id="preset-note" class="fine"></div><div class="ci-params">${paramPanel(false)}</div>` : '';
  if (S.tab === 'params') view.insertAdjacentHTML('afterbegin', summary(S.P, S.root));
  wireParams(document.body);
  if (S.tab === 'idea') wireCalc();
  view.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => go(b.dataset.goto)));
  noteRefresh();
  typeset(document.body);
  writeHash();
}
function noteRefresh() {
  document.querySelectorAll('#preset-note').forEach(n => { n.innerHTML = S.preset ? `<b>${esc(S.preset.name)}:</b> ${esc(S.preset.note)}` : ''; });
}
/** Parameters moved: update everything without rebuilding the sliders. */
function refresh() {
  document.querySelectorAll('#ci-pred').forEach(p => { p.outerHTML = summary(S.P, S.root); });
  if (S.tab === 'theory') { view.innerHTML = theoryView(); typeset(view); }
  if (play) play.reset();
  if (tree) tree.update();
  noteRefresh();
  writeHash();
}
function go(t) { S.tab = t; render(); scrollTo({ top: 0 }); }

const ctx = { get P() { return S.P; }, get root() { return S.root; } };

tabs.forEach((t, i) => {
  t.addEventListener('click', () => go(t.dataset.t));
  t.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const j = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    go(TABS[j]); tabs[j].focus();
  });
});

readHash();
render();

// ---------------------------------------------------------------- lesson
let lesson = null;
function startLesson() {
  lesson?.stop?.();
  S.P = { ...DEFAULTS }; S.preset = null;
  go('idea');
  lesson = runLesson(lessonSteps({ go, get tab() { return S.tab; } }), { slug: 'conflict-initiation', title: 'Learn to play', onFinish: () => learn.refresh() });
}
const learn = learnButton(document.getElementById('learn-slot'), { slug: 'conflict-initiation', minutes: 5, onStart: startLesson, sheet: SHEET });
if (new URLSearchParams(location.hash.slice(1)).get('tour') === '1') startLesson();
