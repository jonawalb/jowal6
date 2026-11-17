// Sonic Vectors: state, tabs, controls and readouts for P1–P3 and the M1–M5 explainer.
import { bestResponse, substitutionSweep, regime, correctionPaths, correctionSummary, population, episodeFlags, lambdaOf } from './engine.js';
import { drawSubstitution, drawCorrection, drawPopulation, drawDots, regimeLabel } from './views.js';
import { slider, pct, f2, fh } from './ui.js';
import { DEFAULTS, LIMITS, MECHS } from '../data/params.js';
import { initDetail } from './detail.js';

initDetail();
document.title = 'Sonic Vectors | Interactive Deterrence';
const $ = id => document.getElementById(id);
const S = { ...DEFAULTS, tab: 'p1', mech: 'M1' };
const TABS = ['p1', 'p2', 'p3', 'm'];
{ const h = location.hash.slice(1); if (TABS.includes(h)) S.tab = h; }

// ---------- Controls ----------
const sliders = [];
const add = (host, key, spec) => { const s = slider(host, { key: host.id + '-' + key, ...spec }, S[key], v => { S[key] = v; render(); }); sliders.push([key, s]); return s; };
// Log slider for the music cost, reversed so that sliding right makes music cheaper (matching the chart).
const LG = LIMITS.CM_RANGE.map(Math.log10);
const logCm = { min: 0, max: 100, step: 1,
  toVal: v => +(10 ** (LG[1] - (LG[1] - LG[0]) * v / 100)).toPrecision(2),
  fromVal: c => Math.round((LG[1] - Math.log10(c)) / (LG[1] - LG[0]) * 100) };

add($('p1-primary'), 'cm', { label: 'Cost of the music per unit of arousal', sym: 'c<sub>m</sub>', ...logCm, fmt: v => String(v), help: 'Slide right to make music cheaper, as one upload plus platform amplification does.' });
add($('p2-primary'), 'tc', { label: 'Correction arrives at hour', sym: 't<sub>c</sub>', min: 0, max: 48, step: 1, fmt: v => String(v) });
add($('p3-primary'), 'w', { label: 'Share of each listener’s feeling that comes from one common melody', sym: 'w', min: 0, max: 1, step: 0.05, fmt: v => pct(v), help: '0: everyone’s mood is their own. Near 100%: one song sets everyone’s mood together.' });

const receiver = host => {
  host.insertAdjacentHTML('beforeend', '<div class="sec"><p class="eyebrow">Receiver and evidence <span class="notional">notional</span></p></div>');
  const sec = host.lastElementChild;
  sec.id = host.id + '-r';
  add(sec, 'pi', { label: 'Prior that the claim is true', sym: 'π', min: 0.05, max: 0.6, step: 0.01, fmt: v => pct(v) });
  add(sec, 'l0', { label: 'Strength of the true evidence (log-likelihood)', sym: 'ℓ<sub>0</sub>', min: 0.1, max: 1.5, step: 0.05, help: 'How much more likely the evidence is if the claim is true, on a log scale. 0.5 is weak.' });
  add(sec, 'kappa', { label: 'How much arousal raises the weight on evidence', sym: 'κ', min: 0, max: 4, step: 0.1, help: 'λ = 1 + κ · arousal · congruence. At κ = 0 music does nothing.' });
  add(sec, 'cong', { label: 'Valence congruence of feeling and claim', sym: 'g', min: 0, max: 1, step: 0.05, help: '1: a rage-coded claim meets a rage-primed listener. 0: the feeling has nothing to do with the claim.' });
  return sec;
};
{
  const p = $('p1-panel');
  p.insertAdjacentHTML('beforeend', '<div class="sec" id="p1-s"><p class="eyebrow">Sender <span class="notional">notional</span></p></div>');
  add($('p1-s'), 'cs', { label: 'Cost per unit of faked evidence', sym: 'c<sub>s</sub>', min: 0.05, max: 0.6, step: 0.01 });
  add($('p1-s'), 'tau', { label: 'Value to the sender of moving belief', sym: 'τ', min: 0.2, max: 2, step: 0.05 });
  receiver(p);
}
{
  const p = $('p2-panel');
  p.insertAdjacentHTML('beforeend', '<div class="sec" id="p2-s"><p class="eyebrow">Song and correction <span class="notional">notional</span></p></div>');
  add($('p2-s'), 'a0', { label: 'Arousal the song induces', sym: 'a<sub>0</sub>', min: 0.1, max: 1, step: 0.05 });
  add($('p2-s'), 'half', { label: 'Half-life of the feeling, hours', sym: 'h', min: 1, max: 48, step: 1, fmt: v => String(v) });
  add($('p2-s'), 'eff', { label: 'Share of its target a correction removes', sym: 'e', min: 0, max: 1, step: 0.05, fmt: v => pct(v) });
  receiver(p);
}
{
  const p = $('p3-panel');
  p.insertAdjacentHTML('beforeend', '<div class="sec" id="p3-s"><p class="eyebrow">Population <span class="notional">notional</span></p></div>');
  add($('p3-s'), 'act', { label: 'Belief above which a listener acts', sym: '', min: 0.3, max: 0.8, step: 0.01, fmt: v => pct(v), help: 'Acting stands for sharing, signing or turning out.' });
  add($('p3-s'), 'spread', { label: 'Spread of priors across listeners (sd of log-odds)', sym: '', min: 0, max: 2, step: 0.1 });
  receiver(p);
}
document.querySelectorAll('[data-corr]').forEach(b => b.addEventListener('click', () => { S.corr = b.dataset.corr; render(); }));

// ---------- Tabs ----------
const tabBtns = [...document.querySelectorAll('#tabs [role=tab]')];
tabBtns.forEach((b, i) => {
  b.addEventListener('click', () => { S.tab = b.dataset.tab; render(); history.replaceState(null, '', '#' + S.tab); });
  b.addEventListener('keydown', e => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
    e.preventDefault(); const n = tabBtns[(i + d + tabBtns.length) % tabBtns.length]; n.click(); n.focus();
  });
});

// ---------- Mechanisms ----------
const TERMS = { M1: ['a', 'lam'], M2: ['a'], M3: ['pi'], M4: ['L'], M5: ['s'] };
$('mgrid').innerHTML = MECHS.map(m => `<button type="button" class="mcard" data-m="${m.id}" aria-pressed="false">
  <span class="m-h"><b>${m.id}</b> ${m.name}<span class="m-loc">acts on ${m.locus}</span></span>
  <span class="m-d">${m.does}</span>
  <span class="m-c">${m.caseT ? `<i>Example of the channel:</i> ${m.caseT}. ${m.caseD} <span class="m-s">Source: ${m.src.map(s => s[0]).join('; ')}.</span>` : `<i>Example:</i> ${m.caseD}`}</span>
  ${m.id === 'M5' ? '<span class="m-tag">The old channel</span>' : '<span class="m-tag new">New channel: no false signal needed</span>'}
</button>`).join('');
document.querySelectorAll('.mcard').forEach(b => b.addEventListener('click', () => { S.mech = b.dataset.m; render(); }));
$('case-src').innerHTML = MECHS.filter(m => m.caseT).map(m => `<li>${m.id}, ${m.caseT}: ${m.src.map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`).join('; ')}.</li>`).join('');
$('notional-list').innerHTML = [
  `Prior π = ${pct(DEFAULTS.pi)}; true evidence ℓ<sub>0</sub> = ${DEFAULTS.l0} (weak); κ = ${DEFAULTS.kappa}; congruence ${DEFAULTS.cong}.`,
  `P1: costs and τ share one notional utility unit (τ = 1 is the value of moving belief from 0% to 100%). Faked evidence costs ${DEFAULTS.cs} per unit, music ${DEFAULTS.cm} per unit of arousal by default (slider ${LIMITS.CM_RANGE[0]} to ${LIMITS.CM_RANGE[1]}); value of belief τ = ${DEFAULTS.tau}; f up to ${LIMITS.F_MAX}, A up to 1.`,
  `P2: song arousal ${DEFAULTS.a0}; the feeling halves every ${DEFAULTS.half} hours; a correction removes ${pct(DEFAULTS.eff)} of its target, instantly and for good, and arrives at hour ${DEFAULTS.tc}. That 70% is generous: Lewandowsky et al. (2012) review evidence that corrections often leave belief in place.`,
  `P3: ${LIMITS.N} listeners, ${LIMITS.EPISODES} episodes, seed ${LIMITS.SEED}; one melody supplies ${pct(DEFAULTS.w)} of each feeling; a listener acts above ${pct(DEFAULTS.act)} belief; prior spread ${DEFAULTS.spread}.`,
  'The form λ = 1 + κ · arousal · congruence is the simplest one that rises in both, as the model requires. It is a choice of this tool.',
].map(t => `<li>${t}</li>`).join('');

// ---------- Demo buttons ----------
const DEMOS = {
  'p1-hi': { tab: 'p1', cm: 2 }, 'p1-lo': { tab: 'p1', cm: 0.01 },
  'p2-text': { tab: 'p2', corr: 'text', tc: 6 }, 'p2-affect': { tab: 'p2', corr: 'affect', tc: 6 },
  p3: { tab: 'p3', w: 0.8 }, mech: { tab: 'm', mech: 'M1' },
};
document.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => {
  Object.assign(S, DEFAULTS, DEMOS[b.dataset.demo]);
  render(); $('tabs').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}));
$('reset').addEventListener('click', () => { Object.assign(S, DEFAULTS); render(); });

// ---------- Render ----------
const popCache = new Map();
const popFor = () => {
  const k = [S.pi, S.l0, S.kappa, S.cong, S.w, S.act, S.spread].join('|');
  if (!popCache.has(k)) { if (popCache.size > 40) popCache.clear(); popCache.set(k, population(S, LIMITS)); }
  return popCache.get(k);
};
const sweepCache = new Map();
const sweepFor = () => {
  const k = [S.pi, S.l0, S.kappa, S.cong, S.cs, S.tau].join('|');
  if (!sweepCache.has(k)) { if (sweepCache.size > 40) sweepCache.clear(); sweepCache.set(k, substitutionSweep(S, LIMITS.CM_RANGE)); }
  return sweepCache.get(k);
};

// Phone: a sticky bar repeats the headline of the open tab while its result line is off screen.
const sticky = $('sticky-res'), phone = matchMedia('(max-width: 640px)');
let readVisible = true, stickyText = '';
const io = new IntersectionObserver(es => { es.forEach(e => { if (!e.target.closest('[hidden]')) readVisible = e.intersectionRatio >= 0.6; }); syncSticky(); }, { threshold: [0, 0.3, 0.6, 1] });
['p1-read', 'p2-read', 'p3-read', 'm-read'].forEach(id => io.observe($(id)));
function syncSticky() {
  const b = $(`${S.tab === 'm' ? 'm' : S.tab}-read`)?.querySelector('b');
  const show = phone.matches && !readVisible && !!b;
  sticky.hidden = !show; document.body.classList.toggle('has-sticky', show);
  if (b) sticky.textContent = stickyText || b.textContent;
}
sticky.addEventListener('click', () => $(`${S.tab}-read`).scrollIntoView({ block: 'center' }));
phone.addEventListener('change', syncSticky);

function render() {
  sliders.forEach(([k, s]) => s.set(S[k]));
  tabBtns.forEach(b => { const on = b.dataset.tab === S.tab; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
  TABS.forEach(t => { $('pan-' + t).hidden = t !== S.tab; });
  document.querySelectorAll('[data-corr]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.corr === S.corr)));
  if (S.tab === 'p1') renderP1();
  if (S.tab === 'p2') renderP2();
  if (S.tab === 'p3') renderP3();
  if (S.tab === 'm') renderM();
  syncSticky();
}

function renderP1() {
  const sweep = sweepFor(), r = bestResponse(S, LIMITS), hi = bestResponse({ ...S, cm: LIMITS.CM_RANGE[1] }, LIMITS);
  drawSubstitution($('p1-svg'), sweep, { cm: S.cm, f: r.f, A: r.A }, LIMITS.CM_RANGE);
  const lam = lambdaOf(r.A, S.kappa, S.cong);
  const k = regime(r);
  const atMax = S.cm >= LIMITS.CM_RANGE[1] - 1e-9;
  const vs = !atMax && hi.f > 0 && r.f < hi.f - 1e-9 ? ` When music is at its most costly (${LIMITS.CM_RANGE[1]}) the sender fakes f = ${f2(hi.f)}; here it fakes ${pct(1 - r.f / hi.f)} less.` : '';
  stickyText = `${regimeLabel(k)}: f = ${f2(r.f)}, A = ${f2(r.A)}, belief ${pct(r.P)}`;
  const seen = new Set(sweep.map(regime));
  $('p1-leg').innerHTML = `<span class="lg"><i class="k fake"></i>Faked evidence f</span><span class="lg"><i class="k music"></i>Music arousal A</span>` +
    ['fake', 'both', 'music'].filter(x => seen.has(x)).map(x => `<span class="lg"><i class="sw reg-${x}"></i>${regimeLabel(x)}</span>`).join('');
  $('p1-read').innerHTML = `<b>${regimeLabel(k)}.</b> At music cost c<sub>m</sub> = ${S.cm}, the sender’s best move is to fake f = ${f2(r.f)} and buy arousal A = ${f2(r.A)}, so listeners weight the evidence λ = ${f2(lam)} times. Belief goes from ${pct(r.honest)} on the true evidence alone to ${pct(r.P)}.${vs}`;
}

function renderP2() {
  const cp = correctionPaths(S, LIMITS.HOURS), s = correctionSummary(S);
  drawCorrection($('p2-svg'), cp, S);
  stickyText = S.corr === 'text' ? `Fact-check removes ${pct(s.removedFake)} of the fake’s excess, ${pct(s.removedMusic)} of the song’s` : `Naming the feeling removes ${pct(s.removedMusic)} of the song’s excess, ${pct(s.removedFake)} of the fake’s`;
  const both = `Both attacks start at ${pct(s.truth + s.start)} belief against the ${pct(s.truth)} the true evidence justifies.`;
  $('p2-read').innerHTML = S.corr === 'text'
    ? `<b>The fact-check removes ${pct(s.removedFake)} of the fake’s excess belief and ${pct(s.removedMusic)} of the song’s.</b> ${both} By hour ${S.tc} the song’s excess has already fallen ${pct(s.decayedMusic)} as the feeling fades, but the fact-check cannot touch the rest: the song’s evidence is true. ${s.cross == null ? 'The song’s excess stays above the corrected fake for the whole window.' : s.cross <= S.tc ? 'The fading feeling had already brought the song below the corrected fake.' : `It falls to the corrected fake’s level only at hour ${fh(s.cross)}.`}`
    : `<b>Naming the feeling removes ${pct(s.removedMusic)} of the song’s excess belief and ${pct(s.removedFake)} of the fake’s.</b> ${both} This correction acts on the feeling, so it reaches the song and misses the fake, the mirror image of a text fact-check.`;
}

function renderP3() {
  const pop = popFor(), mass = LIMITS.MASS, E = LIMITS.EPISODES;
  drawPopulation($('p3-svg'), pop, mass);
  const m = pop.melody, i = pop.indep;
  const nm = Math.round(m.mass * E), ni = Math.round(i.mass * E);
  stickyText = `More than half act at once: ${nm} of ${E} episodes with one melody, ${ni} without`;
  $('p3-read').innerHTML = `<b>One melody: more than half act at once in ${nm} of ${E} episodes. Independent moods: ${ni}.</b> On average ${pct(m.mean)} of listeners act with one melody and ${pct(i.mean)} without, so the melody does not raise the average. It makes listeners’ belief updates move together (correlation ${f2(pop.corr.melody)} between two listeners, against ${f2(pop.corr.indep)}), so the share who act ranges from ${pct(m.min)} to ${pct(m.max)} across episodes, against ${pct(i.min)} to ${pct(i.max)} with independent moods.`;
  const e = m.argmax;
  drawDots($('dots-i'), episodeFlags(S, pop, e, 0), 'indep');
  drawDots($('dots-m'), episodeFlags(S, pop, e, S.w), 'melody');
  $('dots-cap').textContent = `The largest one-melody episode of the ${E} (episode ${e + 1}), and the same listeners and evidence with independent moods. Filled dots act.`;
}

function renderM() {
  const m = MECHS.find(x => x.id === S.mech), on = TERMS[S.mech];
  document.querySelectorAll('.mcard').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === S.mech)));
  document.querySelectorAll('.formula [data-term]').forEach(t => t.classList.toggle('hl', on.includes(t.dataset.term)));
  stickyText = '';
  $('m-read').innerHTML = `<b>${m.id} ${m.name} acts on ${m.locus}.</b> ${m.does} ${m.id === 'M5' ? 'M1 to M4 are the new part.' : 'No false signal is needed, which is why M1 to M4 are the new part.'} In this tool: ${m.where}.`;
}

window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TABS.includes(h) && h !== S.tab) { S.tab = h; render(); } });
render();
