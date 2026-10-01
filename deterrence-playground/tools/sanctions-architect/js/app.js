// Sanctions Architect: start screen, the quarterly decision, resolution, and the end-of-game debrief.
import { P } from '../data/params.js';
import { BY_PARTNER } from '../data/partners.js';
import { newGame, resolveTurn, project, encode, decode } from './engine.js';
import { paintDecide, wireDecide, emptyChoice, chosen } from './decide.js';
import { score, benchmark, percentile } from './score.js';
import { metrics, paintTracks, paintPartners, paintDrivers, policyText, logHTML, feedHTML, paintChart } from './view.js';
import { pulse, flash, countUp } from '../../../shared/js/motion.js';

const $ = id => document.getElementById(id);
const newSeed = () => 1 + Math.floor(Math.random() * 999998);
const show = (...ids) => ['start', 'play', 'end'].forEach(id => { $(id).hidden = !ids.includes(id); });
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let g = null;                      // { s, c, before }
const pick = { demand: 'halt', ambition: 'modest' };

/* ---------- Start ---------- */
function paintStart() {
  $('demands').innerHTML = Object.entries(P.demands).map(([id, d]) => `<label class="sa-card${pick.demand === id ? ' on' : ''}"><input type="radio" name="demand" value="${id}"${pick.demand === id ? ' checked' : ''}><b>${d.label}</b><small>${d.text}</small></label>`).join('');
  $('ambitions').innerHTML = Object.entries(P.ambitions).map(([id, a]) => `<label class="sa-card${pick.ambition === id ? ' on' : ''}"><input type="radio" name="ambition" value="${id}"${pick.ambition === id ? ' checked' : ''}><b>${a.label}</b><small>${a.text}</small></label>`).join('');
}
$('start').addEventListener('change', e => {
  if (e.target.name === 'demand' || e.target.name === 'ambition') { pick[e.target.name] = e.target.value; paintStart(); document.querySelector(`input[name="${e.target.name}"][value="${e.target.value}"]`).focus(); }
});
$('begin').addEventListener('click', () => { begin({ seed: newSeed(), ...pick }); show('play'); paint(); $('h-quarter').focus(); });

function begin(start) {
  const s = newGame(start);
  g = { s, c: emptyChoice(s), before: null };
}

/* ---------- Decide ---------- */
function paintPreview() {
  const acts = chosen(g.c);
  const rec = project(g.s, acts);
  const pv = { revenue: rec.revenue, economy: rec.economy, leak: rec.leak, cohesion: rec.cohesion, own: g.s.ownCum + rec.own, shock: rec.shock, p: rec.pEst };
  paintTracks($('tracks'), metrics(g.s), g.before, pv);
  $('preview').innerHTML = `If you end the quarter with ${acts.length ? 'these measures' : 'no changes'}: pain landing about <b class="num">${Math.round(rec.pain)}</b> of <b class="num">${Math.round(rec.grossPain)}</b> imposed, leakage <b class="num">${Math.round(rec.leak * 100)}%</b>, your cost <b class="num">${rec.own.toFixed(1)}</b> this quarter, concession odds about <b class="num">${Math.round(rec.pEst * 100)}%</b>. Before the Target adapts and before any partner decides whether to leave.`;
}
function paint() {
  const s = g.s, last = s.history[s.history.length - 1];
  $('h-quarter').textContent = P.quarter(s.turn);
  $('turnof').textContent = `quarter ${s.turn + 1} of ${P.turns}`;
  $('h-demand').textContent = `${P.ambitions[s.ambition].label} demand: ${P.demands[s.demand].label.toLowerCase()}`;
  const pol = policyText(s);
  $('inforce').innerHTML = pol.length ? pol.map(t => `<li>${t}</li>`).join('') : '<li class="muted">Nothing yet</li>';
  paintPartners($('partners'), s, last);
  paintDrivers($('drivers'), s, last);
  $('feed').innerHTML = feedHTML(s);
  paintDecide(s, g.c);
  paintPreview();
  history.replaceState(null, '', '#g=' + encode(s));
}
wireDecide(() => g, () => paintPreview());

/* ---------- Resolve ---------- */
$('end-turn').addEventListener('click', () => {
  if (!g || g.s.over || !$('resolve').hidden) return;
  const q = P.quarter(g.s.turn);
  g.before = metrics(g.s);
  const { state, log } = resolveTurn(g.s, chosen(g.c));
  g.s = state;
  $('res-t').textContent = `${q}: what happened`;
  $('log').innerHTML = logHTML(log);
  $('resolve').hidden = false; $('decide').hidden = true; $('end-turn').disabled = true;
  paintTracks($('tracks'), metrics(g.s), g.before);
  paintPartners($('partners'), g.s, log);
  paintDrivers($('drivers'), g.s, log);
  $('feed').innerHTML = feedHTML(g.s);
  document.querySelectorAll('#tracks .sa-track').forEach(t => { if (t.querySelector('small')) flash(t); });
  history.replaceState(null, '', '#g=' + encode(g.s));
  $('resolve').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  $('res-t').focus();
});
$('next').addEventListener('click', () => {
  $('resolve').hidden = true; $('decide').hidden = false; $('end-turn').disabled = false;
  if (g.s.over) return finish();
  g.c = emptyChoice(g.s);
  paint();
  $('h-quarter').focus();
});

/* ---------- End ---------- */
function lessons(s) {
  const out = [], H = s.history;
  const via = {};
  for (const h of H) for (const [k, v] of Object.entries(h.via)) via[k] = (via[k] || 0) + v / H.length;
  const top = Object.entries(via).sort((a, b) => b[1] - a[1])[0];
  if (top) out.push(`<b>Sanctions leak through the least-committed partner.</b> Most of your leakage ran through the ${BY_PARTNER[top[0]].name} (${s.partners[top[0]].member ? 'a member with low commitment' : BY_PARTNER[top[0]].member ? 'after it left the coalition' : 'outside the coalition'}): about ${Math.round(top[1] * 100)} points of leakage a quarter.`);
  const sec = H.findIndex(h => h.actions.some(a => a.m === 'enforce' && a.a === 'secondary' && a.b > 0));
  out.push(sec >= 0
    ? `<b>Secondary sanctions plug leaks at a cost.</b> You used them from ${P.quarter(sec)}; leakage went from ${Math.round(H[Math.max(0, sec - 1)].leak * 100)}% to ${Math.round(H[Math.min(H.length - 1, sec + 1)].leak * 100)}% a quarter later, while partners’ commitment paid for it.`
    : '<b>Secondary sanctions plug leaks at a cost.</b> You never used them. They cut what the neutral hubs carry, but they cost you and irritate partners every quarter they are in force.');
  out.push(s.ambition === 'maximal'
    ? '<b>Maximal demands rarely succeed.</b> The Target needed more than twice the pressure to grant the whole demand. In test games, coalition-preserving play won a maximal demand about one time in five.'
    : '<b>Modest demands are easier to grant.</b> A partial, verifiable step asks less of the Target, so less pressure is needed; it also counts for less in the score.');
  const broad = H.some(h => h.actions.some(a => (a.m === 'energy' && a.a === 'embargo') || (a.m === 'finance' && a.a === 'cb')));
  const peakRally = Math.max(...H.map(h => h.pressure.rally));
  out.push(`<b>Targeted vs broad.</b> ${broad ? 'You used broad measures (an embargo or a central-bank freeze).' : 'You stayed with targeted measures.'} The rally round the flag peaked at ${Math.round(peakRally)}. Broad measures hit harder but feed the rally, shock prices and strain partners; elite measures cost little and cut the rally.`);
  return out.map(t => `<li>${t}</li>`).join('');
}
function finish() {
  const s = g.s;
  history.replaceState(null, '', '#g=' + encode(s));
  show('end');
  $('end-k').textContent = `${P.ambitions[s.ambition].label} demand: ${P.demands[s.demand].label.toLowerCase()} · ${s.history.length} quarter${s.history.length === 1 ? '' : 's'}`;
  $('end-t').textContent = s.over.title;
  $('end-x').textContent = s.over.text;
  const sc = score(s);
  countUp($('total'), sc.total, { from: 0 });
  $('parts').innerHTML = `<caption class="sr-only">Score parts</caption>` + sc.parts.map(p => `<tr><td>${p.label}</td><td class="num">${p.points}</td><td class="muted">of ${p.max}</td></tr>`).join('');
  $('type').innerHTML = `The Target was <b>${P.typeLabel[s.type].toLowerCase()}</b>. ${P.typeText[s.type]} Your final belief: ${P.types.map(k => `${P.typeLabel[k]} ${Math.round(s.belief[k] * 100)}%`).join(', ')}.`;
  paintChart($('chart'), s.history);
  $('lessons').innerHTML = lessons(s);
  $('end').focus();
  runBench(sc.total);
}
function runBench(total) {
  const start = { seed: g.s.seed, demand: g.s.demand, ambition: g.s.ambition, type: g.s.type };
  const runs = [], N = P.benchRuns;
  $('pct').textContent = '…'; $('pct-x').textContent = 'comparing with the computer in your seat…';
  const tick = () => {
    runs.push(...benchmark(start, 10, runs.length));
    if (runs.length < N) { $('pct-x').textContent = `comparing with the computer in your seat… ${runs.length} of ${N}`; return setTimeout(tick, 0); }
    const pc = percentile(total, runs);
    const mean = Math.round(runs.reduce((a, b) => a + b, 0) / N);
    $('pct').textContent = `${pc}%`;
    $('pct-x').textContent = `of ${N} games with the computer in your seat (same demand, same Target) scored below you. Its average: ${mean}.`;
    pulse($('pct'));
  };
  setTimeout(tick, 30);
}
function restart() {
  g = null; history.replaceState(null, '', location.pathname + location.search);
  paintStart(); show('start'); $('resolve').hidden = true; $('decide').hidden = false; $('end-turn').disabled = false;
  $('start').scrollIntoView({ block: 'start' }); $('start-t').focus();
}
$('again').addEventListener('click', restart);
$('new-game').addEventListener('click', restart);
$('copy-link').addEventListener('click', async e => {
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; } catch { e.target.textContent = 'Copy the address bar'; }
  setTimeout(() => { e.target.textContent = 'Copy link'; }, 1600);
});

/* ---------- Load: replay a shared link, or start fresh ---------- */
function load() {
  const m = location.hash.match(/#g=([^&]+)/);
  const d = m && decode(decodeURIComponent(m[1]));
  if (!d) { paintStart(); show('start'); return; }
  begin(d);
  for (const mv of d.moves) { if (g.s.over) break; g.s = resolveTurn(g.s, mv).state; }
  if (g.s.over) return finish();
  g.c = emptyChoice(g.s);
  show('play'); paint();
}
load();
