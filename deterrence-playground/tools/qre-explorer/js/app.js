// Quantal Response Explorer: state, URL hash, panel, stage rendering and walkthrough.
import { GAMES, GAME_ORDER } from '../data/games.js';
import { solveTree, allQRE, nash, correspondence, principalQRE, U0, U1 } from './qre.js';
import { drawTree, drawMatrix, drawTreePath, drawCorr, treeLegend, corrLegend, fmtLam } from './views.js';
import { draws, simulate, estimate } from './estimate.js';
import { drawLL, estTable, METHODS } from './estview.js';
import { createTour } from './tour.js';
import { slider, choices, sec, pct, f2, esc } from './ui.js';

document.title = 'Quantal Response Explorer | Interactive Deterrence';

export const DEFAULTS = { g: 'sig', lu: 0, inf: 0, sc: 1, ls: 0.7, wh: 'other', n: 300, seed: 1, sp: 0.5 };
for (const id of GAME_ORDER) for (const p of GAMES[id].params) DEFAULTS[p.key] = p.def;
const LIM = { lu: [U0, U1], inf: [0, 1], sc: [0.25, 4], ls: [-0.5, 1.5], n: [50, 3000], seed: [1, 9999], sp: [0.02, 0.98] };
for (const id of GAME_ORDER) for (const p of GAMES[id].params) LIM[p.key] = [p.min, p.max];
const S = { ...DEFAULTS };

function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  for (const k of Object.keys(DEFAULTS)) {
    if (!q.has(k)) continue;
    const raw = q.get(k);
    if (k === 'g') { if (GAMES[raw]) S.g = raw; continue; }
    if (k === 'wh') { if (['principal', 'other'].includes(raw)) S.wh = raw; continue; }
    const v = Number(raw);
    if (Number.isFinite(v)) S[k] = Math.max(LIM[k][0], Math.min(LIM[k][1], ['n', 'seed', 'inf'].includes(k) ? Math.round(v) : v));
  }
}
function writeHash() {
  const q = new URLSearchParams();
  for (const k of Object.keys(DEFAULTS)) q.set(k, String(typeof S[k] === 'number' ? +S[k].toFixed(3) : S[k]));
  history.replaceState(null, '', '#' + q.toString());
}

const $ = id => document.getElementById(id);
const panel = $('panel');
const lam = () => (S.inf ? Infinity : 10 ** S.lu);

// ---------- Panel ----------
const gs = sec(panel, 'Game');
const gamePick = choices(gs, GAME_ORDER.map(id => ({ v: id, t: GAMES[id].name, s: GAMES[id].kind === 'tree' ? 'Sequential moves' : 'Simultaneous moves' })),
  S.g, v => { S.g = v; changed(); }, 'Choose a game');

const ls = sec(panel, 'Precision');
const lamSl = slider(ls, { key: 'lu', label: 'How well players respond to payoffs', math: 'λ', min: U0, max: U1, step: 0.01,
  fmt: v => fmtLam(10 ** v), help: 'Log scale. λ = 0 is pure noise: every action equally likely. Large λ approaches Nash play.' },
  S.lu, v => { S.lu = v; S.inf = 0; changed(); });
ls.insertAdjacentHTML('beforeend', `<div class="row"><button type="button" class="btn" data-l="-2">λ ≈ 0</button>
  <button type="button" class="btn" data-l="0">λ = 1</button><button type="button" class="btn" id="inf-btn" aria-pressed="false">λ = ∞ (Nash)</button></div>`);
ls.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => { S.lu = +b.dataset.l; S.inf = 0; changed(); }));
$('inf-btn').addEventListener('click', () => { S.inf = S.inf ? 0 : 1; changed(); });

const st = sec(panel, 'At this setting');
st.insertAdjacentHTML('beforeend', '<div class="status" id="status"><b></b><span></span></div><dl class="readout" id="read"></dl>');

const ps = sec(panel, 'Payoffs');
ps.insertAdjacentHTML('beforeend', '<p class="fine">Values are <span class="notional">notional</span> teaching inputs. Only the game’s structure comes from the cited papers.</p><div id="pay-sl"></div><p class="fine" id="pay-x"></p>');
let paySl = {};
function buildPaySliders() {
  const box = $('pay-sl'); box.innerHTML = ''; paySl = {};
  for (const p of GAMES[S.g].params) paySl[p.key] = slider(box, { ...p, fmt: p.fmt || (v => f2(+v)) }, S[p.key], v => { S[p.key] = v; changed(); });
}

const sc = sec(panel, 'Same data, different scale');
sc.insertAdjacentHTML('beforeend', '<p class="fine">Signorino (1999) notes that λ and the payoff weights “cannot be estimated individually.” Multiply every payoff by c and divide λ by c: the predictions do not move.</p>');
const scSl = slider(sc, { key: 'sc', label: 'Payoff scale', math: 'c', min: 0.25, max: 4, step: 0.05, fmt: v => `×${(+v).toFixed(2)}` }, S.sc, v => { S.sc = v; renderScale(); writeHash(); });
sc.insertAdjacentHTML('beforeend', '<dl class="readout" id="scale-read"></dl>');

// ---------- Estimation controls (stage card) ----------
const ec = $('est-ctl');
const lsSl = slider(ec, { key: 'ls', label: 'True precision in the simulated data', math: 'λ*', min: -0.5, max: 1.5, step: 0.01, fmt: v => fmtLam(10 ** v) }, S.ls, v => { S.ls = v; renderEst(); writeHash(); });
const nSl = slider(ec, { key: 'n', label: 'Simulated crises', math: 'N', min: 50, max: 3000, step: 50, fmt: v => String(v), note: '<span class="notional">simulated</span>' }, S.n, v => { S.n = v; renderEst(); writeHash(); });
const spSl = slider(ec, { key: 'sp', label: 'Solver’s starting guess: P(challenger escalates)', min: 0.02, max: 0.98, step: 0.01, fmt: v => pct(+v),
  help: 'Only the traditional MLE uses it. Move it and watch that estimate change.' }, S.sp, v => { S.sp = v; renderEst(); writeHash(); });
ec.insertAdjacentHTML('beforeend', '<p class="fine">Data come from</p>');
const whPick = choices(ec, [{ v: 'principal', t: 'The principal branch' }, { v: 'other', t: 'Another equilibrium', s: 'if one exists at λ*' }], S.wh, v => { S.wh = v; renderEst(); writeHash(); }, 'Which equilibrium generates the data');
ec.insertAdjacentHTML('beforeend', '<div class="row"><button type="button" class="btn" id="new-data">New random data</button><span class="fine" id="seed-l"></span></div>');
$('new-data').addEventListener('click', () => { S.seed = (S.seed * 48271) % 9973 + 1; renderEst(); writeHash(); });

// ---------- Rendering ----------
let built = null, corr = null, corrKey = '';
function currentGame() {
  const spec = GAMES[S.g];
  built = spec.build(S);
  if (spec.kind === 'matrix') {
    const key = spec.params.map(p => S[p.key]).join('|');
    if (key !== corrKey) { corr = correspondence(built); corrKey = key; }
  }
  return spec;
}

function onU(u) { S.lu = Math.round(u * 100) / 100; S.inf = 0; renderMain(); writeHash(); }

function renderMain() {
  const spec = currentGame(), L = lam();
  lamSl.set(S.lu); $('inf-btn').setAttribute('aria-pressed', String(!!S.inf));
  $('lam-now').textContent = `λ = ${fmtLam(L)}`;
  $('game-name').textContent = spec.name;
  $('cap-note').textContent = spec.kind === 'tree' ? '· branch width shows choice probability' : '· cells show the principal QRE';
  $('pay-x').textContent = spec.kind === 'tree' ? (built.extra ? `Fixed or derived: ${built.extra}.` : '') : '';
  const rows = [];
  let top, nashTxt;
  if (spec.kind === 'tree') {
    $('tree').removeAttribute('hidden'); $('matrix').hidden = true;
    const sol = solveTree(built, L), spe = solveTree(built, Infinity);
    drawTree($('tree'), spec, built, sol, spec.outcomes);
    const path = [];
    for (let i = 0; i <= 160; i++) { const u = U0 + ((U1 - U0) * i) / 160; path.push({ u, out: solveTree(built, 10 ** u).out }); }
    drawTreePath($('path'), path, spe, spec.outcomes, S.inf ? U1 : S.lu, onU);
    $('path-leg').innerHTML = treeLegend(spec.outcomes);
    $('path-h').textContent = 'Outcome probabilities along the QRE path';
    const o = spec.outcomes.map(x => ({ ...x, v: sol.out[x.id] || 0 })).sort((a, b) => b.v - a.v);
    top = o[0];
    const speO = spec.outcomes.filter(x => (spe.out[x.id] || 0) > 0.5).map(x => x.label.toLowerCase());
    nashTxt = `The subgame perfect equilibrium predicts ${speO.join(' or ') || 'a mix of outcomes'}.`;
    const tv = spec.outcomes.reduce((s, x) => s + Math.abs((sol.out[x.id] || 0) - (spe.out[x.id] || 0)), 0) / 2;
    for (const x of spec.outcomes) rows.push([x.label, pct(sol.out[x.id] || 0)]);
    rows.push(['Distance from Nash', pct(tv)]);
    $('uniq').innerHTML = 'A game of perfect information has exactly one logit agent QRE at every λ: solve the last move first, then work backward. The path from λ = 0 to ∞ is a single curve.';
  } else {
    $('tree').setAttribute('hidden', ''); $('matrix').hidden = false;
    const ne = nash(built);
    const all = S.inf ? [] : allQRE(built, L);
    const prin = S.inf ? limitEq(ne) : principalQRE(built, corr, L);
    drawMatrix($('matrix'), spec, built, prin);
    drawCorr($('path'), corr, ne, { all, prin }, S.inf ? U1 : S.lu, onU);
    $('path-leg').innerHTML = corrLegend(spec);
    $('path-h').textContent = 'Every logit QRE as λ grows (the QRE correspondence)';
    const cells = [['EE', prin.p * prin.q], ['EB', prin.p * (1 - prin.q)], ['BE', (1 - prin.p) * prin.q], ['BB', (1 - prin.p) * (1 - prin.q)]];
    const c0 = cells.sort((a, b) => b[1] - a[1])[0];
    top = { ...spec.outcomes.find(x => x.id === c0[0]), v: c0[1] };
    const lim = limitEq(ne);
    nashTxt = `${ne.length} Nash equilibri${ne.length === 1 ? 'um' : 'a'}. The principal branch ends at ${eqName(lim)}.`;
    rows.push(['QRE at this λ', S.inf ? '–' : String(all.length)]);
    rows.push([`P(${spec.players[0]} escalates)`, pct(prin.p)], [`P(${spec.players[1]} escalates)`, pct(prin.q)], ['P(clash)', pct(prin.p * prin.q)]);
    $('uniq').innerHTML = all.length > 1
      ? `At this λ the game has <b>${all.length}</b> logit equilibria. The bold curve is the principal branch, the one that starts at 50/50 when λ = 0. McKelvey and Palfrey (1995) show it is unique and ends at one Nash equilibrium for almost all games.`
      : 'At this λ the game has one logit equilibrium. Raise λ past the fold, where new branches appear, to see several.';
    if (Math.abs(S.cc - S.cd) < 0.001) $('uniq').innerHTML += ' <b>Equal clash costs make the game symmetric</b>, a non-generic case: the principal branch reaches a fork, and the tool follows one side arbitrarily.';
  }
  const box = $('status');
  box.dataset.s = /war|clash/i.test(top.label) ? 'bad' : /status quo|both back/i.test(top.label) ? 'good' : 'warn';
  box.querySelector('b').textContent = `${top.label}: ${pct(top.v)}`;
  box.querySelector('span').textContent = `Most likely outcome at λ = ${fmtLam(L)}. ${nashTxt}`;
  $('read').innerHTML = rows.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${b}</dd>`).join('');
  renderScale();
}

function limitEq(ne) {
  if (!corr) return ne[0];
  const l = corr.lines[corr.principal], end = l[l.length - 1];
  return ne.reduce((a, n) => (Math.abs(n.p - end.p) + Math.abs(n.q - end.q) < Math.abs(a.p - end.p) + Math.abs(a.q - end.q) ? n : a), ne[0]);
}
function eqName(n) {
  if (!n) return '–';
  if (!n.pure) return 'the mixed equilibrium';
  return n.p > 0.5 && n.q < 0.5 ? 'challenger escalates, defender backs down' : n.p < 0.5 && n.q > 0.5 ? 'defender escalates, challenger backs down' : n.p > 0.5 ? 'a clash' : 'both backing down';
}

function renderScale() {
  const spec = GAMES[S.g], L = lam(), c = S.sc;
  scSl.set(c);
  if (L === Infinity) { $('scale-read').innerHTML = '<dt>At λ = ∞</dt><dd>scale never matters</dd>'; return; }
  let a, b;
  if (spec.kind === 'tree') {
    const g2 = spec.build(S);
    for (const k of Object.keys(g2.pay)) g2.pay[k] = g2.pay[k].map(v => v * c);
    const o1 = solveTree(built, L).out, o2 = solveTree(g2, L / c).out, key = spec.outcomes[0];
    a = o1[key.id]; b = o2[key.id];
    $('scale-read').innerHTML = `<dt>${esc(key.label)}, λ = ${fmtLam(L)}</dt><dd>${pct(a)}</dd><dt>Payoffs ×${c.toFixed(2)}, λ = ${fmtLam(L / c)}</dt><dd>${pct(b)}</dd>`;
  } else {
    const g2 = spec.build(S);
    g2.R = g2.R.map(r => r.map(v => v * c)); g2.C = g2.C.map(r => r.map(v => v * c));
    const list = eqs => eqs.map(r => pct(r.p * r.q)).join(', ');
    $('scale-read').innerHTML = `<dt>P(clash) in each QRE, λ = ${fmtLam(L)}</dt><dd>${list(allQRE(built, L))}</dd><dt>Payoffs ×${c.toFixed(2)}, λ = ${fmtLam(L / c)}</dt><dd>${list(allQRE(g2, L / c))}</dd>`;
  }
}

function renderEst() {
  const spec = GAMES.chk, g = spec.build(S);
  const key = spec.params.map(p => S[p.key]).join('|');
  const c2 = key === corrKey && corr ? corr : correspondence(g);
  lsSl.set(S.ls); nSl.set(S.n); spSl.set(S.sp); whPick.set(S.wh);
  const lamStar = 10 ** S.ls;
  const d = simulate(g, c2, lamStar, S.wh, draws(S.seed, S.n));
  const res = estimate(g, c2, d, S.sp);
  drawLL($('ll'), res, lamStar, d);
  estTable($('est-tab'), res, lamStar);
  $('seed-l').textContent = `Seed ${S.seed}`;
  $('ll-leg').innerHTML = `<span class="lg"><i class="ln llp"></i>Likelihood on the principal branch</span><span class="lg"><i class="ln naive"></i>Traditional MLE (breaks where the solver switches equilibrium)</span><span class="lg"><i class="d all"></i>Every equilibrium</span><span class="lg">Curves below the floor run along the bottom edge.</span>`;
  const note = [];
  note.push(`${d.n} simulated standoffs from ${d.usedOther ? 'an equilibrium off the principal branch' : 'the principal branch'} at λ* = ${fmtLam(lamStar)} (${d.nEq} equilibri${d.nEq === 1 ? 'um' : 'a'} there): the challenger escalated in ${d.r1}, the defender in ${d.c1}.`);
  if (S.wh === 'other' && !d.usedOther) note.push('Only one equilibrium exists at this λ*, so the data come from the principal branch. Raise λ* to about 2.5 or more.');
  note.push(res.jumps ? `The traditional likelihood jumps ${res.jumps} time${res.jumps > 1 ? 's' : ''}: its solver lands on a different equilibrium as λ changes.` : 'The traditional likelihood is smooth over this range because its solver never switches equilibrium.');
  $('est-note').textContent = note.join(' ');
}

function renderPanel() {
  gamePick.set(S.g);
  buildPaySliders();
  for (const p of GAMES[S.g].params) paySl[p.key].set(S[p.key]);
}

function changed() { renderPanel(); renderMain(); if (S.g === 'chk' || !renderEst.done) { renderEst(); renderEst.done = true; } writeHash(); }

const tour = createTour($('tour-root'), set => { Object.assign(S, DEFAULTS, set); changed(); renderEst(); });
$('start-tour').addEventListener('click', () => tour.start());
$('copy-link').addEventListener('click', async e => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText(location.href); b.textContent = 'Link copied'; } catch (err) { b.textContent = 'Copy the address bar'; }
  setTimeout(() => { b.textContent = 'Copy link to this setup'; }, 1800);
});
$('reset').addEventListener('click', () => { Object.assign(S, DEFAULTS); changed(); renderEst(); });
$('est-methods').innerHTML = METHODS.map(m => `<li><b style="color:var(${m.c})">${esc(m.t)}.</b> ${esc(m.s)}</li>`).join('');

let lastNarrow = null;
addEventListener('resize', () => {
  const n = innerWidth < 700;
  if (n !== lastNarrow) { lastNarrow = n; renderMain(); renderEst(); }
});

readHash();
changed();
lastNarrow = innerWidth < 700;
