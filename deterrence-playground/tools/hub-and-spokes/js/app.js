// Hub and Spokes: start screen, the yearly allocation, crises, the year's results and the debrief.
import { P, RESPONSES } from '../data/params.js';
import { ALLIES, IDS, BY } from '../data/allies.js';
import { BY_ID } from '../data/actions.js';
import { newGame, brief, act, respond, warOdds, budgetOf, encode, decode, replay } from './engine.js';
import { intel, benchmark } from './ai.js';
import { score, peaks, percentile } from './score.js';
import { drawHub, animateYear, paintHubTracks, paintAllyCards, paintSeries } from './view.js';
import { paintDecide, wireDecide } from './decide.js';
import { pulse, flash, reduced } from '../../../shared/js/motion.js';

const $ = id => document.getElementById(id);
const newSeed = () => 1 + Math.floor(Math.random() * 999998);
const show = (...ids) => ['start', 'play', 'crisis', 'resolve', 'end'].forEach(id => { $(id).hidden = !ids.includes(id); });
const say = t => { $('live').textContent = ''; setTimeout(() => { $('live').textContent = t; }, 30); };
const cap = t => t[0].toUpperCase() + t.slice(1);
const pct = p => `${Math.round(p * 100)}%`;

let g = null; // { s, plan, tab, prev, yearLog, year }

/* ---------- Start ---------- */
$('intro').innerHTML = ALLIES.map(a => `<div class="hs-card" style="--c:${a.col}"><b>${cap(a.name)}</b><small>${a.blurb}</small></div>`).join('');
$('begin').addEventListener('click', () => { begin(newSeed()); show('play'); paint(); $('end-turn').focus(); });

function begin(seed) {
  g = { s: brief(newGame({ seed })), plan: [], tab: IDS[0], prev: null, yearLog: [], year: 0 };
}

/* ---------- Year ---------- */
function paint() {
  const s = g.s, I = intel(s);
  $('year').textContent = `Year ${s.turn + 1}`;
  $('yearof').textContent = `of ${P.turns}`;
  const probes = Object.keys(s.probes);
  $('event').innerHTML = (s.event ? `<b>${s.event.title}.</b> ${s.event.text} ` : '<b>A quiet year at home.</b> ')
    + (probes.length ? `<span class="hs-rival">The Rival is probing ${probes.map(id => BY[id].short).join(' and ')}.</span>` : 'The Rival is watching, not probing.');
  paintHubTracks($('tracks'), s, budgetOf(s), g.prev);
  drawHub($('hub'), s, I);
  paintAllyCards($('allies'), s, I, g.plan);
  paintDecide(g);
  history.replaceState(null, '', '#g=' + encode(s));
}
wireDecide(() => paintAllyCards($('allies'), g.s, intel(g.s), g.plan));

const snapHub = s => ({ cred: s.cred, war: s.war, strain: s.strain });
$('end-turn').addEventListener('click', () => {
  if (!g || g.s.over || g.s.crisis) return;
  g.prev = snapHub(g.s); g.year = g.s.turn;
  const before = g.s;
  const res = act(g.s, g.plan);
  g.s = res.state; g.yearLog = res.log; g.before = before;
  if (g.s.crisis) return showCrisis();
  showResolve();
});

function showCrisis() {
  const s = g.s, c = s.crisis, x = s.allies[c.ally];
  history.replaceState(null, '', '#g=' + encode(s));
  show('play', 'crisis'); $('decide').hidden = true;
  drawHub($('hub'), s, intel(s));
  $('cr-k').textContent = `Year ${s.turn + 1} · crisis · ${BY[c.ally].short}`;
  $('cr-t').textContent = c.title;
  const pledge = x.stake === 2 ? ' You gave them treaty-level guarantees: walking away now would be ruinous.' : x.stake === 1 ? ' You pledged support in public: walking away will cost more.' : '';
  $('cr-x').textContent = c.text + pledge;
  $('resp').innerHTML = RESPONSES.map(r => `<button type="button" class="hs-rbtn" data-resp="${r.id}"><b>${r.label}</b><span>${r.text}</span><span class="num">Chance this becomes a war: ${pct(warOdds(s, c, r.id))}</span></button>`).join('');
  $('crisis').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  $('crisis').focus();
  say(`Crisis: ${c.title}. ${c.text}`);
}
$('resp').addEventListener('click', e => {
  const b = e.target.closest('[data-resp]'); if (!b || !g.s.crisis) return;
  const res = respond(g.s, b.dataset.resp);
  g.s = res.state; g.yearLog = [...g.yearLog.filter(l => l.kind !== 'crisis'), ...res.log];
  showResolve();
});

const MOODTXT = {
  deterrent: n => `${cap(n)} doubts you and is debating a deterrent of its own.`,
  accommodate: n => `${cap(n)} doubts you and is quietly courting the Rival.`,
};
const RESPTXT = { full: 'backed them fully', restrain: 'backed them with restraint', out: 'stayed out' };
function yearLines(log, s) {
  const out = [];
  const acts = log.filter(l => l.kind === 'act');
  if (acts.length) out.push(`<li>You: ${acts.map(a => { const d = BY_ID[a.id]; const o = d.follow && !d.follow.partner ? d.follow.opts.find(q => q.id === a.f) : null; return `${a.id === 'link' ? `linked ${BY[a.ally].short} with ${BY[a.f].short}` : `${d.label.toLowerCase()}${o ? ` (${o.label.toLowerCase()})` : ''} for ${BY[a.ally].short}`}${a.half ? ' <i>(half effect: cohesion too low)</i>' : a.fatigue ? ' <i>(repeated: 60%)</i>' : ''}`; }).join('; ')}.</li>`);
  else out.push('<li>You spent nothing this year.</li>');
  for (const l of log) {
    if (l.kind === 'hedge') out.push(`<li class="warn">${MOODTXT[l.mood](BY[l.ally].name)} Your credibility slips.</li>`);
    if (l.kind === 'bold') out.push(`<li class="bad">${cap(BY[l.ally].name)} feels very sure of you: it is spending less on defense and taking more risks.</li>`);
    if (l.kind === 'outcome') {
      const k = l.crisis === 'probe' ? 'the Rival’s probe of' : 'the crisis started by';
      out.push(`<li class="${l.war ? 'bad' : 'note'}">You ${RESPTXT[l.resp]} in ${k} ${BY[l.ally].name}. War odds ${pct(l.p)}, rolled ${Math.round(l.roll * 100)}: ${l.war ? '<b>it became a war.</b>' : 'it ended without fighting.'}</li>`);
    }
  }
  const free = IDS.filter(id => s.allies[id].mood === 'emboldened' && !log.some(l => l.kind === 'bold' && l.ally === id));
  if (free.length) out.push(`<li>Comfortable enough to coast: ${free.map(id => BY[id].short).join(', ')}.</li>`);
  return out.join('');
}
function showResolve() {
  const s = g.s;
  history.replaceState(null, '', '#g=' + encode(s));
  show('play', 'resolve'); $('decide').hidden = true;
  $('res-t').textContent = `Year ${g.year + 1}: what happened`;
  $('log').innerHTML = yearLines(g.yearLog, s);
  const view = { ...s, probes: g.before.probes };
  drawHub($('hub'), view, intel(s)); animateYear($('hub'), view, g.yearLog);
  paintHubTracks($('tracks'), s, budgetOf(s), g.prev);
  paintAllyCards($('allies'), s, intel(s), []);
  document.querySelectorAll('#tracks .hs-track').forEach(t => { if (t.querySelector('small')) flash(t); });
  $('resolve').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  $('resolve').focus();
  say($('log').textContent);
}
$('next').addEventListener('click', () => {
  if (g.s.over) return finish();
  g.s = brief(g.s); g.plan = []; g.prev = null;
  show('play'); $('decide').hidden = false; paint();
  $('play').scrollIntoView({ block: 'start' }); $('end-turn').focus();
});

/* ---------- End ---------- */
const level = v => (v >= 0.66 ? 'high' : v >= 0.33 ? 'middling' : 'low');
function finish() {
  const s = g.s, sc = score(s);
  history.replaceState(null, '', '#g=' + encode(s));
  show('end');
  $('end-t').textContent = sc.total >= 80 ? 'A network that held' : sc.total >= 65 ? 'Strained, but standing' : sc.total >= 50 ? 'Spokes working loose' : 'The wheel came apart';
  $('total').textContent = sc.total;
  $('parts').innerHTML = sc.parts.map(p => `<tr><td>${p.label}</td><td class="num">${p.value}</td><td class="muted">${Math.round(p.weight * 100)}%</td></tr>`).join('')
    + `<tr><td>Wars</td><td class="num">${s.wars.length}</td><td class="muted">${s.wars.map(w => `Y${w.turn + 1} ${BY[w.ally].short}`).join(', ')}</td></tr>`;
  paintSeries($('ch-fear'), s, 'fear', 'Abandonment fear (true)');
  paintSeries($('ch-entrap'), s, 'entrap', 'Entrapment risk (true)');
  const pk = peaks(s);
  $('peaks').innerHTML = IDS.map(id => `<li><b style="color:${BY[id].col}">${BY[id].short}</b>: abandonment fear peaked at ${pk[id].fear.v} in Year ${pk[id].fear.turn + 1}; entrapment risk at ${pk[id].entrap.v} in Year ${pk[id].entrap.turn + 1}.</li>`).join('');
  $('types').innerHTML = IDS.map(id => { const x = s.allies[id]; return `<div style="--c:${BY[id].col}"><b>${BY[id].short}</b><br>Fear of abandonment: ${level(x.fear)}<br>Risk appetite: ${level(x.risk)}<br>When doubtful: ${x.autonomy > 0.55 ? 'builds its own deterrent' : 'accommodates the Rival'}</div>`; }).join('');
  $('end').focus();
  say(`Game over. Score ${sc.total}.`);
  runBench(sc.total);
}
function runBench(total) {
  const seed = g.s.seed, runs = [], N = P.benchRuns;
  $('pct').textContent = '…'; $('pct-x').textContent = 'the computer is playing your ten years…';
  const tick = () => {
    if (!g || g.s.seed !== seed) return;
    runs.push(...benchmark(seed, 6, runs.length));
    if (runs.length < N) { $('pct-x').textContent = `the computer is playing your ten years… ${runs.length} of ${N}`; return setTimeout(tick, 0); }
    const sorted = [...runs].sort((a, b) => a - b);
    $('pct').textContent = `${percentile(total, runs)}%`;
    $('pct-x').textContent = `of ${N} computer games in your world scored below you (computer median ${sorted[N >> 1]}, range ${sorted[0]}–${sorted[N - 1]})`;
    pulse($('pct'));
  };
  setTimeout(tick, 30);
}
$('again').addEventListener('click', restart);
$('new-game').addEventListener('click', restart);
function restart() { g = null; history.replaceState(null, '', location.pathname + location.search); show('start'); $('start').scrollIntoView({ block: 'start' }); $('begin').focus(); }

$('copy-link').addEventListener('click', async e => {
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; } catch { e.target.textContent = 'Copy the address bar'; }
  setTimeout(() => { e.target.textContent = 'Copy link'; }, 1600);
});

/* ---------- Load: replay a shared link, or start fresh ---------- */
function load() {
  const m = location.hash.match(/#g=([^&]+)/);
  const d = m && decode(decodeURIComponent(m[1]));
  if (!d) { show('start'); return; }
  g = { s: replay(d.seed, d.moves), plan: [], tab: IDS[0], prev: null, yearLog: [], year: 0 };
  if (g.s.over) return finish();
  if (g.s.crisis) { g.year = g.s.turn; g.before = g.s; g.yearLog = g.s.log || []; show('play'); paint(); return showCrisis(); }
  show('play'); paint();
}
load();
