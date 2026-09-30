// Misinformation Cascade: state, URL hash, panel controls, playback, walkthrough.
import { DEFAULTS, buildNetwork, simulate, summarize, affect, alphaOf } from './model.js';
import { drawNetwork, drawChart, drawVersions, topVersion, legendHtml, chartLegendHtml } from './views.js';
import { mountCascade9 } from './cascade9.js';
import { createTour } from './tour.js';
import { slider, choices, sec, pct, f2, esc } from './ui.js';
import { CLAIMS, PARAMS_NOTIONAL } from '../data/claims.js';

document.title = 'Misinformation Cascade | Interactive Deterrence';
const T = PARAMS_NOTIONAL.steps;
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
const st = sec(panel, 'What happened');
st.insertAdjacentHTML('beforeend', `<div class="status" id="status"><b></b><span></span></div><dl class="readout" id="read"></dl>`);
const sl = {};
const add = (parent, key, spec) => { sl[key] = slider(parent, { key, ...spec }, S[key], v => { S[key] = v; changed(); }); };

const who = sec(panel, 'Who shares');
add(who, 'md', { label: 'Median conviction', math: 'Δ', min: 0.05, max: 0.9, step: 0.01, note: '<span class="notional">notional</span>',
  help: 'How much it costs a typical person to repeat a claim they doubt. A person shares once the share of contacts they see sharing exceeds their Δ.' });
add(who, 'sd', { label: 'Spread of conviction', math: 'σ', min: 0.1, max: 1.2, step: 0.05, help: 'LogNormal shape. The Moral Panic paper uses 0.5.' });
add(who, 's0', { label: 'People who see the event first', min: 1, max: 12, step: 1, fmt: v => String(v) });

const aff = sec(panel, 'Fear and amplification');
add(aff, 'lam', { label: 'Fear gain', math: 'λ', min: 1, max: 3, step: 0.05, note: '<span class="notional">notional</span>',
  help: 'How much weight a frightened person puts on each contact who is sharing. 1 is calm.' });
add(aff, 'amp', { label: 'Amplified visibility', math: 'a', min: 0, max: 0.3, step: 0.01, note: '<span class="notional">notional</span>',
  help: 'Extra endorsement share people think they see (boosted or fake accounts): the gap between perceived and true share, θ̂ − θ.' });
add(aff, 'ex', { label: 'Exaggeration per retelling', math: 'ε', min: 0, max: 0.5, step: 0.01, note: '<span class="notional">notional</span>',
  help: 'Chance a sharer steps the claim up one level, multiplied by λ.' });

const cor = sec(panel, 'Correction');
cor.insertAdjacentHTML('beforeend', `<label class="tg"><input type="checkbox" id="cor-on"><span class="sw"></span><span class="t">Issue a correction<small>One correction, delivered in a single round.</small></span></label>`);
const corOn = $('cor-on');
corOn.addEventListener('change', () => { S.cor = corOn.checked ? 1 : 0; changed(); });
add(cor, 'tc', { label: 'Round it goes out', min: 1, max: 30, step: 1, fmt: v => String(v) });
add(cor, 'rc', { label: 'Reach', min: 0, max: 1, step: 0.05, fmt: v => pct(+v), help: 'Share of all people who see the correction.' });
cor.insertAdjacentHTML('beforeend', '<p class="fine">Who delivers it</p>');
const srcPick = choices(cor, [{ v: 'o', t: 'Out-group fact-check', s: 'Weight 1' }, { v: 'i', t: 'In-group voice', s: 'Weight 3' }], S.src, v => { S.src = v; changed(); }, 'Correction source');
cor.insertAdjacentHTML('beforeend', `<p class="fine">A sharer retracts only if α(E)·evidence &gt; (1 − α(E))·U<sub>I</sub> + C, the Sticky Affect condition. <a href="#method">How this works</a></p>`);

const seedSec = sec(panel, 'Network');
seedSec.insertAdjacentHTML('beforeend', `<div class="row"><button type="button" class="btn" id="new-seed">New network and people</button><span class="fine" id="seed-l"></span></div>`);
$('new-seed').addEventListener('click', () => { S.seed = (S.seed * 48271) % 9973 + 1; changed(); });
sec(panel, 'The rule each person follows: the Mass Game').insertAdjacentHTML('beforeend', '<div id="mg"></div>');

// ---- Stage ----
$('legend').innerHTML = legendHtml();
const tip = $('tip');
let net = null, netSeed = -1, updateNet = null, run = null, ghost = null;
function onHover(i, c) {
  if (i < 0 || !run) { tip.hidden = true; return; }
  const f = run.frames[S.t], s = f.state[i];
  const what = s === 1 ? `Sharing: “${esc(CLAIMS[f.ver[i]].text)}”` : s === 2 ? 'Retracted after the correction' : f.inoc[i] > 0 ? 'Not sharing, prebunked by the correction' : 'Not sharing';
  const nb = net.adj[i], m = nb.filter(j => f.state[j] === 1).length;
  tip.innerHTML = `<b>Person ${i + 1}</b><span class="tt-d">Conviction Δ = ${f2(run.delta[i])}${f.inoc[i] > 0 ? ` + ${f2(f.inoc[i])} prebunk` : ''}</span>
    <span class="tt-d">${m} of ${nb.length} contacts sharing</span>${what}`;
  const box = $('netbox').getBoundingClientRect(), r = c.getBoundingClientRect();
  tip.hidden = false;
  tip.style.left = Math.min(box.width - 290, Math.max(4, r.left - box.left + 12)) + 'px';
  tip.style.top = (r.top - box.top + 14) + 'px';
}

let timer = null;
const playBtn = $('play');
function stopPlay() { clearInterval(timer); timer = null; playBtn.textContent = 'Play'; }
playBtn.addEventListener('click', () => {
  if (timer) { stopPlay(); return; }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { S.t = T; changed(); return; }
  if (S.t >= T) S.t = 0;
  playBtn.textContent = 'Pause';
  timer = setInterval(() => { S.t++; renderFrame(); writeHash(); if (S.t >= T) stopPlay(); }, 260);
});
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
  drawChart($('chart'), run, ghost, S, t => { stopPlay(); S.t = t; renderFrame(); writeHash(); });
  drawVersions($('versions'), f);
  scrub.value = S.t;
  $('round-l').textContent = `Round ${S.t} of ${T}`;
  const tv = topVersion(f);
  $('headline').innerHTML = tv < 0 ? 'No one is sharing the claim.'
    : `<span class="hl-k">Most shared in round ${S.t}</span> “${esc(CLAIMS[tv].text)}”`;
  $('headline').dataset.v = tv;
  $('now').textContent = `${f.sharing} of ${PARAMS_NOTIONAL.nodes} people sharing${f.retracted ? `, ${f.retracted} retracted` : ''}.`;
}

function renderPanel() {
  for (const k of Object.keys(sl)) sl[k].set(S[k]);
  corOn.checked = !!S.cor; srcPick.set(S.src);
  ['tc', 'rc'].forEach(k => sl[k].disable(!S.cor));
  $('seed-l').textContent = `Seed ${S.seed}`;
  $('chart-leg').innerHTML = chartLegendHtml(S.cor);
  const s = summarize(run), g = summarize(ghost);
  const box = $('status');
  box.dataset.s = s.final >= 0.5 ? 'bad' : s.final >= 0.2 ? 'warn' : 'good';
  box.querySelector('b').textContent = s.final >= 0.5 ? 'The claim swept the network' : s.final >= 0.2 ? 'A partial cascade' : 'The claim stayed local';
  box.querySelector('span').textContent = `${pct(s.final)} of people are sharing at round ${T}${S.cor ? `, against ${pct(g.final)} with no correction` : ''}.`;
  const log = run.frames[S.tc]?.log;
  const rows = [
    ['Peak share sharing', pct(s.peak)],
    ['Reached half the network', s.half < 0 ? 'never' : `round ${s.half}`],
    ['Sharers passing on retelling 2+', pct(s.alarmShare)],
  ];
  if (S.cor && log) rows.push(
    ['Correction reached', `${log.reached} people`],
    ['Sharers who retracted', `${log.retracted} of ${log.retracted + log.held}`],
    ['Prebunked before sharing', `${log.prebunked}`],
    ['Averted vs. no correction', pct(g.final - s.final)],
  );
  $('read').innerHTML = rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
  massGame();
}

/** Worked Mass Game payoff table for a person with the median conviction. */
function massGame() {
  const th = 0.5, D = S.md, lamTh = Math.min(1, S.lam * th + S.amp);
  $('mg').innerHTML = `<p class="fine">A person with the median conviction Δ = ${f2(D)}, half of whose contacts are sharing. With fear and amplification they perceive θ̂ = min(1, λθ + a) = ${f2(lamTh)}.</p>
  <div class="tablewrap"><table class="mg"><thead><tr><th></th><th>Group stays quiet</th><th>Group shares</th></tr></thead><tbody>
  <tr><th>Stay quiet</th><td class="num">0</td><td class="num">−θ̂ + Δ = ${f2(-lamTh + D)}</td></tr>
  <tr><th>Share</th><td class="num">−Δ = ${f2(-D)}</td><td class="num">θ̂ − Δ = ${f2(lamTh - D)}</td></tr></tbody></table></div>
  <p class="why">${lamTh > D ? `θ̂ &gt; Δ, so when the group shares, this person shares too.` : `Δ ≥ θ̂, so this person holds out even when the group shares.`}
  A sharer caught by the correction has accuracy weight α(E) = 1/(1 + E) = ${f2(alphaOf(affect(S.lam, 0)))} on the accurate report and ${f2(alphaOf(affect(S.lam, 4)))} on the most alarming retelling.</p>`;
}

function changed() { stopPlay(); compute(); renderPanel(); renderFrame(); writeHash(); }

mountCascade9($('c9'));
const tour = createTour($('tour-root'), set => { Object.assign(S, set); changed(); document.querySelector('.layout').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
$('start-tour').addEventListener('click', () => tour.start());
$('reset').addEventListener('click', () => { Object.assign(S, DEFAULTS); changed(); });

readHash();
changed();
