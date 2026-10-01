// Supply Shock: start screen, the yearly plan, results, and the debrief.
import { P, yearOf } from '../data/params.js';
import { IDS, BY, MINERALS } from '../data/minerals.js';
import { newGame, brief, resolveYear, encode, decode } from './engine.js';
import { score, benchmark, baseline, percentile } from './score.js';
import { parts } from './market.js';
import { paintDashboard, paintRead, resultsTable, paintChart, chartTable, sourceLinks } from './view.js';
import { paintDecide, wireDecide } from './decide.js';
import { countUp, pulse, flash, reduced } from '../../../shared/js/motion.js';

const $ = id => document.getElementById(id);
const newSeed = () => 1 + Math.floor(Math.random() * 999998);
const show = (...ids) => ['start', 'play', 'end'].forEach(id => { $(id).hidden = !ids.includes(id); });
const name = m => BY[m].name.toLowerCase();
let g = null; // { s, plan, draft }

/* ---------- Start ---------- */
$('context').innerHTML = `<p class="eyebrow">The real pattern behind the game</p><ul>
  <li>In 2025 China mined an estimated 82% of the world’s natural graphite and about 69% of its rare earths, and produced 99% of primary low-purity gallium (USGS).</li>
  <li>For gallium, graphite and rare earths, China is the top refiner with over 90% of global supply; across key energy minerals other than rare earths, the top refining country’s share averaged 72% in 2025 (IEA).</li>
  <li>China put export licensing on gallium and germanium from August 2023 and banned both to the United States in December 2024; it tightened rare-earth controls in April 2025, expanded them in October 2025, then suspended the October measures for a year in November 2025 (USGS).</li>
  </ul><p class="fine">Sources: ${sourceLinks()}. The game’s Supplier is notional; its moves are not predictions.</p>`;
$('srcs').innerHTML = sourceLinks();
$('realsrc').innerHTML = MINERALS.map(m => `<li><b>${m.name}</b>: mining ${m.real.mine ?? 'n/a'}${m.real.mine != null ? '%' : ''} (${m.real.mineNote}); refining ${m.real.refine ? `${m.real.refine}% (${m.real.refineNote})` : 'n/a: no verified per-mineral figure'}.</li>`).join('');
$('balance-note').textContent = 'Balance (1,000 seeded games per strategy): see METHOD.md. The computer in your seat averages about 70 (median 73); doing nothing averages about 49.';
$('begin').addEventListener('click', () => { begin(newSeed()); show('play'); paint(); $('kinds').querySelector('button').focus(); });

function begin(seed) { g = { s: brief(newGame({ seed })), plan: [], draft: {} }; }

/* ---------- Plan ---------- */
function paint() {
  const s = g.s;
  $('year').textContent = yearOf(s.t);
  $('turnof').textContent = `year ${s.t + 1} of ${P.years}`;
  $('event').innerHTML = s.event ? `<b>${s.event.title}.</b> ${s.event.text}` : '';
  paintDashboard($('dash'), s, g.plan);
  paintRead($('read'), s);
  paintDecide(g);
  $('end-year').textContent = s.t === P.years - 1 ? 'End 2036' : `End ${yearOf(s.t)}`;
  history.replaceState(null, '', '#g=' + encode(s));
}
wireDecide(() => paintDashboard($('dash'), g.s, g.plan));

/* ---------- Resolve ---------- */
const moveText = mv => {
  const n = name(mv.m), bits = [];
  if (mv.from === 'open' && mv.to === 'lic') bits.push(`imposes export licensing on ${n}`);
  if (mv.from === 'open' && mv.to === 'ban') bits.push(`bans ${n} exports outright`);
  if (mv.from === 'lic' && mv.to === 'ban') bits.push(`tightens ${n} licensing into a ban`);
  if (mv.from === 'lic' && mv.to === 'open') bits.push(`lifts ${n} licensing`);
  if (mv.from === 'ban' && mv.to === 'lic') bits.push(`eases the ${n} ban to licensing`);
  if (mv.dump) bits.push(`floods the market with cheap ${n}`);
  return `The Supplier ${bits.join(' and ')}.`;
};

$('end-year').addEventListener('click', () => {
  if (!g || g.s.over || !$('results').hidden) return;
  const yr = yearOf(g.s.t);
  const { state, log } = resolveYear(g.s, g.plan);
  g.s = state; g.plan = []; g.draft = { m: g.draft.m, site: g.draft.site };
  const h = state.history[state.history.length - 1];
  $('res-t').textContent = `${yr}: what happened`;
  $('moves').innerHTML = h.moves.length ? h.moves.map(mv => `<li class="${mv.to === 'open' && !mv.dump ? 'good' : 'bad'}">${moveText(mv)}</li>`).join('')
    : `<li>${h.t < P.graceYears ? 'The Supplier watches and signals displeasure, but changes nothing this year.' : 'The Supplier changes nothing this year.'}</li>`;
  $('restable').innerHTML = resultsTable(h);
  const short = h.rows.filter(r => r.shortfall > 0.5);
  $('outline').innerHTML = `Industry output: <b class="num" id="outv">${h.output.toFixed(1)}</b> (100 = no shortfall).${short.length ? ` Short this year: ${short.map(r => `${BY[r.m].name} ${Math.round((1 - r.met) * 100)}%`).join(', ')}.` : ' No shortfalls.'}`;
  $('news').innerHTML = log.map(l => `<li class="${l.kind}">${l.text}</li>`).join('') || '<li class="muted">No actions this year.</li>';
  $('next').textContent = state.over ? 'See the debrief' : `Plan ${yr + 1}`;
  $('results').hidden = false; $('decide').hidden = true; $('end-year').disabled = true;
  paintDashboard($('dash'), state, []); paintRead($('read'), state);
  $('announce').textContent = `${yr}: ${h.moves.length ? h.moves.map(moveText).join(' ') : 'No Supplier moves.'} Output ${h.output.toFixed(1)}.${short.length ? ` Shortfalls in ${short.map(r => BY[r.m].name).join(', ')}.` : ''}`;
  $('results').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  $('results').focus({ preventScroll: true });
  if (short.length) flash($('outline'));
  history.replaceState(null, '', '#g=' + encode(state));
});

$('next').addEventListener('click', () => {
  $('results').hidden = true; $('decide').hidden = false; $('end-year').disabled = false;
  if (g.s.over) return finish();
  g.s = brief(g.s);
  paint();
  $('play').scrollIntoView({ block: 'start' });
  $('kinds').querySelector('button').focus({ preventScroll: true });
});

/* ---------- Debrief ---------- */
function lessons(s) {
  const mines = s.projects.filter(p => p.kind === 'mine'), refs = s.projects.filter(p => p.kind === 'refinery');
  const minesOn = mines.filter(p => p.status === 'online');
  const firstMine = minesOn.length ? Math.min(...minesOn.map(p => p.online)) : null;
  const refAdded = IDS.reduce((t, m) => t + Math.min(s.projects.filter(p => p.m === m && p.kind === 'refinery' && p.status === 'online').reduce((a, p) => a + p.cap, 0), Math.max(0, parts(s, m).ore - BY[m].game.ref)), 0);
  const idle0 = IDS.reduce((t, m) => t + Math.max(0, BY[m].game.ore - BY[m].game.ref), 0);
  const draws = s.history.reduce((t, h) => t + h.rows.reduce((a, r) => a + r.draw, 0), 0);
  const withheld = s.history.reduce((t, h) => t + h.rows.reduce((a, r) => a + r.withheld, 0), 0);
  return [
    `<b>Money cannot buy time.</b> ${mines.length ? `You funded ${mines.length} mine${mines.length > 1 ? 's' : ''}; ${minesOn.length} came online by 2036${firstMine != null ? `, the first in ${yearOf(firstMine)}` : ''}. ${mines.filter(p => p.status === 'build').length} were still being built.` : `You funded no mines. Here a domestic mine takes ${P.mine.dom.lead[0]}–${P.mine.dom.lead[2]} years (usually about ${P.mine.dom.lead[1]}) before any slips.`}`,
    `<b>Refining is the chokepoint.</b> In 2027 you could reach about ${Math.round(idle0)} units of non-Supplier ore (all six minerals) that refining outside the Supplier could not process. ${refs.length ? `You started ${refs.length} refining project${refs.length > 1 ? 's' : ''}; those online add about ${Math.round(refAdded)} units of secure supply a year.` : 'You built no refining, so friendly ore still had to pass through the Supplier.'}`,
    `<b>Stockpiles buy time only.</b> The Supplier withheld about ${Math.round(withheld)} units over the decade; your stockpiles covered ${Math.round(draws)} of them${s.upkeepTotal ? ` and cost ${s.upkeepTotal.toFixed(1)} points in upkeep` : ''}.`,
  ];
}

function finish() {
  const s = g.s;
  history.replaceState(null, '', '#g=' + encode(s));
  show('end');
  const sc = score(s);
  $('end-t').textContent = `The Supplier was ${P.typeLabel[s.type].toLowerCase()}. ${P.typeText[s.type]}`;
  countUp($('total'), sc.total, { from: 0 });
  $('parts').innerHTML = sc.parts.map(p => `<tr><td>${p.label} <span class="muted">(${Math.round(p.weight * 100)}%)</span></td><td class="num">${p.value}</td><td class="muted">${p.raw}</td></tr>`).join('');
  paintChart($('chart'), s);
  $('charttable').innerHTML = chartTable(s);
  $('lessons').innerHTML = lessons(s).map(l => `<li>${l}</li>`).join('');
  $('end').focus();
  setTimeout(() => {
    $('base').textContent = score(baseline(s.seed)).total;
    const runs = [], N = P.benchRuns;
    const tick = () => {
      runs.push(...benchmark(s.seed, 4, runs.length + 1));
      if (runs.length < N) { $('pct-x').textContent = `comparing with the computer in your seat… ${runs.length} of ${N}`; return setTimeout(tick, 0); }
      const med = [...runs].sort((a, b) => a - b)[Math.floor(N / 2)];
      $('pct').textContent = `${percentile(sc.total, runs)}%`;
      $('pct-x').textContent = `of ${N} computer games in your seat, same world, scored below you (their median: ${med})`;
      pulse($('pct'));
    };
    tick();
  }, 40);
}

$('again').addEventListener('click', restart);
$('new-game').addEventListener('click', restart);
function restart() { g = null; history.replaceState(null, '', location.pathname + location.search); $('results').hidden = true; $('decide').hidden = false; $('end-year').disabled = false; show('start'); $('start').scrollIntoView({ block: 'start' }); $('begin').focus(); }

$('copy-link').addEventListener('click', async e => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText(location.href); b.textContent = 'Link copied'; } catch { b.textContent = 'Copy the address bar'; }
  setTimeout(() => { b.textContent = 'Copy link'; }, 1600);
});

/* ---------- Load: replay a shared link, or start fresh ---------- */
function load() {
  const m = location.hash.match(/#g=([^&]+)/);
  const d = m && decode(decodeURIComponent(m[1]));
  if (!d) { show('start'); return; }
  begin(d.seed);
  d.years.forEach((acts, i) => {
    if (g.s.over) return;
    g.s = resolveYear(g.s, acts).state;
    if (!g.s.over) g.s = brief(g.s);
  });
  if (g.s.over) return finish();
  show('play'); paint();
}
load();
