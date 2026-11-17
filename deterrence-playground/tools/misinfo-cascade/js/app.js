// Misinformation Cascade: state, URL hash, panel controls, playback, comparison, walkthrough.
import { DEFAULTS, buildNetwork, simulate, summarize, affect, alphaOf } from './model.js';
import { drawNetwork, drawChart, drawVersions, topVersion, topAlarm, legendHtml, chartLegendHtml } from './views.js';
import { mountCascade9 } from './cascade9.js';
import { createTour } from './tour.js';
import { initDetail } from './detail.js';
import { slider, choices, sec, pct, f2, esc } from './ui.js';
import { CLAIMS, PARAMS_NOTIONAL } from '../data/claims.js';
import { PRESETS, runLabel, resultSentence } from './text.js';

document.title = 'Misinformation Cascade | Interactive Deterrence';
const T = PARAMS_NOTIONAL.steps, NN = PARAMS_NOTIONAL.nodes;
const S = { ...DEFAULTS };
const LIM = { md: [0.05, 0.9], sd: [0.1, 1.2], lam: [1, 3], amp: [0, 0.3], ex: [0, 0.5], s0: [1, 12], cor: [0, 1], tc: [1, 30], rc: [0, 1], seed: [1, 9999], t: [0, T] };
const INT = new Set(['s0', 'cor', 'tc', 'seed', 't']);

function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  for (const k of Object.keys(DEFAULTS)) {
    if (!q.has(k)) continue;
    if (k === 'src') { if (['o', 'i'].includes(q.get(k))) S.src = q.get(k); continue; }
    const v = Number(q.get(k));
    if (Number.isFinite(v)) S[k] = Math.max(LIM[k][0], Math.min(LIM[k][1], INT.has(k) ? Math.round(v) : v));
  }
}
function writeHash() {
  const q = new URLSearchParams();
  for (const k of Object.keys(DEFAULTS)) q.set(k, String(S[k]));
  history.replaceState(null, '', '#' + q.toString());
}

const panel = document.getElementById('panel');
const $ = id => document.getElementById(id);

// ---- Panel ----
const st = sec(panel, 'What happened <span class="notional">model output</span>');
st.insertAdjacentHTML('beforeend', `<div class="status" id="status"><b></b><span></span></div>
  <div class="row"><button type="button" class="btn" id="keep">Keep this run to compare</button><button type="button" class="btn" id="unkeep" hidden>Clear kept run</button></div>
  <p class="fine" id="kept-l" hidden></p>
  <dl class="readout" id="read"></dl>`);
const sl = {};
const add = (parent, key, spec) => { sl[key] = slider(parent, { key, ...spec }, S[key], v => { S[key] = v; changed(); }); };
const NOTIONAL = '<span class="notional">notional</span>';

const cor = sec(panel, 'Correction');
cor.id = 'sec-cor';
cor.insertAdjacentHTML('beforeend', `<label class="tg"><input type="checkbox" id="cor-on"><span class="sw"></span><span class="t">Issue a correction<small>One correction, delivered in a single round.</small></span></label>`);
const corOn = $('cor-on');
corOn.addEventListener('change', () => { S.cor = corOn.checked ? 1 : 0; changed(); });
add(cor, 'tc', { label: 'Round it goes out', min: 1, max: 30, step: 1, fmt: v => String(v), note: NOTIONAL });
add(cor, 'rc', { label: 'Reach', min: 0, max: 1, step: 0.05, fmt: v => pct(+v), note: NOTIONAL, help: 'Share of all people who see the correction, drawn at random.' });
cor.insertAdjacentHTML('beforeend', '<p class="fine" id="src-l">Who delivers it</p>');
const srcPick = choices(cor, [{ v: 'o', t: 'Out-group fact-check', s: 'Weight 1 (notional)' }, { v: 'i', t: 'In-group voice', s: 'Weight 3 (ratio from a model, not data)' }], S.src, v => { S.src = v; changed(); }, 'Correction source');
cor.insertAdjacentHTML('beforeend', `<p class="fine full-only">A sharer retracts only if α(E)·evidence &gt; (1 − α(E))·U<sub>I</sub> + C, the Sticky Affect condition: α(E) is the weight on accuracy, which falls as emotional activation E rises; U<sub>I</sub> is what the claim means to the person’s identity; C is the cost of backing down. <a href="#method">How this works</a></p>`);

const who = sec(panel, 'Who shares');
add(who, 'md', { label: 'Median conviction', math: 'Δ', min: 0.05, max: 0.9, step: 0.01, note: NOTIONAL,
  help: 'Conviction Δ is how much it costs a typical person to repeat a claim they doubt. A person shares once the share of contacts they see sharing exceeds their Δ.' });
add(who, 'sd', { label: 'Spread of conviction', math: 'σ', min: 0.1, max: 1.2, step: 0.05, cls: 'full-only', help: 'How much convictions differ between people (LogNormal shape σ). The Moral Panic paper uses 0.5.' });
add(who, 's0', { label: 'People who see the event first', min: 1, max: 12, step: 1, fmt: v => String(v), note: NOTIONAL, cls: 'full-only' });

const aff = sec(panel, 'Fear and amplification');
add(aff, 'lam', { label: 'Fear gain', math: 'λ', min: 1, max: 3, step: 0.05, note: NOTIONAL,
  help: 'Fear gain λ: how much weight a frightened person puts on each contact who is sharing. 1 is calm.' });
add(aff, 'amp', { label: 'Amplified visibility', math: 'a', min: 0, max: 0.3, step: 0.01, note: NOTIONAL, cls: 'full-only',
  help: 'Extra endorsement share people think they see (boosted or fake accounts): the gap between perceived and true share, θ̂ − θ.' });
add(aff, 'ex', { label: 'Exaggeration per retelling', math: 'ε', min: 0, max: 0.5, step: 0.01, note: NOTIONAL, cls: 'full-only',
  help: 'Chance ε that a sharer steps the claim up one level, multiplied by λ.' });

const seedSec = sec(panel, 'Network', 'full-only');
seedSec.insertAdjacentHTML('beforeend', `<div class="row"><button type="button" class="btn" id="new-seed">New network and people</button><span class="fine" id="seed-l"></span></div>`);
$('new-seed').addEventListener('click', () => { S.seed = (S.seed * 48271) % 9973 + 1; changed(); });
sec(panel, 'The rule each person follows: the Mass Game', 'full-only').insertAdjacentHTML('beforeend', '<div id="mg"></div>');

// ---- Stage ----
$('legend').innerHTML = legendHtml();
const tip = $('tip');
let net = null, netSeed = -1, updateNet = null, run = null, ghost = null, kept = null;
function onHover(i, c) {
  if (i < 0 || !run) { tip.hidden = true; return; }
  const f = run.frames[S.t], s = f.state[i];
  const what = s === 1 ? `Sharing: “${esc(CLAIMS[f.ver[i]].text)}”` : s === 2 ? 'Retracted after the correction' : f.inoc[i] > 0 ? 'Not sharing; reached by the correction before sharing' : 'Not sharing';
  const nb = net.adj[i], m = nb.filter(j => f.state[j] === 1).length;
  tip.innerHTML = `<b>Person ${i + 1}</b><span class="tt-d">Conviction Δ = ${f2(run.delta[i])}${f.inoc[i] > 0 ? ` + ${f2(f.inoc[i])} from the correction` : ''}</span>
    <span class="tt-d">${m} of ${nb.length} contacts sharing</span>${what}`;
  const box = $('netbox').getBoundingClientRect(), r = c.getBoundingClientRect();
  tip.hidden = false;
  tip.style.left = Math.min(box.width - 290, Math.max(4, r.left - box.left + 12)) + 'px';
  tip.style.top = (r.top - box.top + 14) + 'px';
}

let timer = null;
const playBtn = $('play'), barPlay = $('bar-play');
function setPlayLabel(t) { playBtn.textContent = t; barPlay.textContent = t; }
function stopPlay() { clearInterval(timer); timer = null; setPlayLabel('Play'); }
function play() {
  if (timer) { stopPlay(); return; }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { S.t = T; renderFrame(); writeHash(); return; }
  if (S.t >= T) S.t = 0;
  setPlayLabel('Pause');
  timer = setInterval(() => { S.t++; renderFrame(); writeHash(); if (S.t >= T) stopPlay(); }, 260);
}
playBtn.addEventListener('click', play);
barPlay.addEventListener('click', play);
$('step-b').addEventListener('click', () => { stopPlay(); S.t = Math.max(0, S.t - 1); renderFrame(); writeHash(); });
$('step-f').addEventListener('click', () => { stopPlay(); S.t = Math.min(T, S.t + 1); renderFrame(); writeHash(); });
const scrub = $('scrub');
scrub.max = T;
scrub.addEventListener('input', () => { stopPlay(); S.t = +scrub.value; renderFrame(); writeHash(); });

function compute() {
  if (netSeed !== S.seed) { net = buildNetwork(S.seed); netSeed = S.seed; updateNet = drawNetwork($('net'), net, onHover); }
  run = simulate(S, net, true);
  ghost = simulate(S, net, false);
}

function renderFrame() {
  const f = run.frames[S.t];
  updateNet(f, run.reach, S.cor && S.t >= S.tc);
  drawChart($('chart'), run, ghost, S, t => { stopPlay(); S.t = t; renderFrame(); writeHash(); }, kept, summarize(run).half);
  drawVersions($('versions'), f);
  scrub.value = S.t;
  $('round-l').textContent = `Round ${S.t} of ${T}`;
  const tv = topVersion(f), ta = topAlarm(f);
  const hl = $('headline');
  if (S.t === 0) hl.innerHTML = `<span class="hl-k">Round 0</span> ${f.sharing} people saw the accurate report. Press Play to watch it spread.`;
  else if (tv < 0) hl.textContent = 'No one is sharing the claim.';
  else hl.innerHTML = `<span class="hl-k">Most shared in round ${S.t}</span> “${esc(CLAIMS[tv].text)}”`
    + (ta > tv ? `<span class="hl-a">Most alarming still circulating: “${esc(CLAIMS[ta].text)}” (${f.vc[ta]} ${f.vc[ta] === 1 ? 'person' : 'people'})</span>` : '');
  hl.dataset.v = S.t === 0 ? 0 : tv;
  $('now').textContent = `${f.sharing} of ${NN} people sharing${f.retracted ? `, ${f.retracted} retracted` : ''}.`;
  const s = summarize(run), g = summarize(ghost);
  $('result').textContent = resultSentence(S, f, s, g, kept, NN, T);
  $('bar-txt').textContent = `Round ${S.t}: ${pct(f.sharing / NN)} sharing.${S.t < T ? ` Round ${T}: ${pct(s.final)}.` : ''}${S.cor ? ` No correction: ${pct(g.final)}.` : ''}`;
}

function renderPanel() {
  for (const k of Object.keys(sl)) sl[k].set(S[k]);
  corOn.checked = !!S.cor; srcPick.set(S.src);
  ['tc', 'rc'].forEach(k => sl[k].disable(!S.cor));
  $('seed-l').textContent = `Seed ${S.seed}`;
  $('chart-leg').innerHTML = chartLegendHtml(S.cor, kept);
  const s = summarize(run), g = summarize(ghost);
  const box = $('status');
  box.dataset.s = s.final >= 0.5 ? 'bad' : s.final >= 0.2 ? 'warn' : 'good';
  box.querySelector('b').textContent = s.final >= 0.5 ? 'The claim swept the network' : s.final >= 0.2 ? 'A partial cascade' : 'The claim stayed local';
  box.querySelector('span').textContent = `${pct(s.final)} of people are sharing at round ${T}${S.cor ? `, against ${pct(g.final)} with no correction` : ''}.`;
  $('kept-l').hidden = !kept; $('unkeep').hidden = !kept;
  if (kept) $('kept-l').textContent = `Kept run (dotted line): ${kept.label}: ${pct(kept.final)} sharing at round ${T}.`;
  const log = run.frames[S.tc]?.log;
  const rows = [
    ['Peak share sharing', pct(s.peak)],
    ['Tipping point (half sharing)', s.half < 0 ? 'never' : `round ${s.half}`],
    ['Sharers passing on any retelling', pct(s.retellShare)],
    ['Sharers passing on retelling 2 or higher', pct(s.alarmShare), 'full-only'],
  ];
  if (S.cor && log) rows.push(
    ['Correction reached', `${log.reached} people`],
    ['Sharers it reached who retracted', `${log.retracted} of ${log.retracted + log.held}`],
    ['Reached before sharing', `${log.prebunked}`, 'full-only'],
    ['Averted vs. no correction', `${Math.round((g.final - s.final) * 100)} points`],
  );
  $('read').innerHTML = rows.map(([a, b, c]) => `<dt${c ? ` class="${c}"` : ''}>${a}</dt><dd${c ? ` class="${c}"` : ''}>${b}</dd>`).join('');
  massGame();
}

/** Worked Mass Game payoff table for a person with the median conviction. */
function massGame() {
  const th = 0.5, D = S.md, lamTh = Math.min(1, S.lam * th + S.amp);
  $('mg').innerHTML = `<p class="fine">A person with the median conviction Δ = ${f2(D)}, half of whose contacts are sharing (true share θ = 0.50). With fear gain λ and amplified visibility a, the share they think is sharing is θ̂ = min(1, λθ + a) = ${f2(lamTh)}.</p>
  <div class="tablewrap"><table class="mg"><thead><tr><th></th><th>Others stay quiet</th><th>Others share</th></tr></thead><tbody>
  <tr><th>Stay quiet</th><td class="num">0</td><td class="num">−θ̂ + Δ = ${f2(-lamTh + D)}</td></tr>
  <tr><th>Share</th><td class="num">−Δ = ${f2(-D)}</td><td class="num">θ̂ − Δ = ${f2(lamTh - D)}</td></tr></tbody></table></div>
  <p class="why">${lamTh > D ? `θ̂ &gt; Δ, so when the others share, this person shares too.` : `Δ ≥ θ̂, so this person holds out even when the others share.`}
  A sharer caught by the correction has accuracy weight α(E) = 1/(1 + E) = ${f2(alphaOf(affect(S.lam, 0)))} on the accurate report and ${f2(alphaOf(affect(S.lam, 4)))} on the most alarming retelling.</p>`;
}

function changed() { stopPlay(); compute(); renderPanel(); renderFrame(); writeHash(); }

function keepRun() { kept = { label: runLabel(S, DEFAULTS), final: summarize(run).final, series: run.frames.map(f => f.sharing) }; }
$('keep').addEventListener('click', () => { keepRun(); renderPanel(); renderFrame(); });
$('unkeep').addEventListener('click', () => { kept = null; renderPanel(); renderFrame(); });

document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
  const p = PRESETS[b.dataset.preset];
  if (p.play) kept = null; else if (!p.nokeep) keepRun();
  Object.assign(S, DEFAULTS, p.set);
  changed();
  document.querySelector(p.look).scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  if (p.play) play();
  $('back-script').hidden = false;
}));

$('back-script').querySelector('a').addEventListener('click', e => {
  e.preventDefault(); // the URL hash holds the settings, so scroll instead of navigating
  const d = $('present'); d.open = true; d.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  d.querySelector('summary').focus({ preventScroll: true });
});
mountCascade9($('c9'));
initDetail();
const tour = createTour($('tour-root'), {
  apply(set) { Object.assign(S, set); changed(); },
  snapshot() { return { s: { ...S }, kept }; },
  restore(snap) { Object.assign(S, snap.s); kept = snap.kept; changed(); },
  result() { return resultSentence(S, run.frames[S.t], summarize(run), summarize(ghost), null, NN, T); },
});
$('start-tour').addEventListener('click', () => tour.start());
$('reset').addEventListener('click', () => { Object.assign(S, DEFAULTS); kept = null; changed(); });
addEventListener('hashchange', () => { Object.assign(S, DEFAULTS); readHash(); changed(); });

readHash();
changed();
