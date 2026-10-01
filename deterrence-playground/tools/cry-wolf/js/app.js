// Cry Wolf: start, the weekly assessment, and the end-of-game debrief.
import { P } from '../data/params.js';
import { ALL } from '../data/indicators.js';
import { newGame, step, thisWeek, encode, decode, replay } from './engine.js';
import { analystGame, analystRuns } from './ai.js';
import { posteriorPath } from './bayes.js';
import { score, percentile } from './score.js';
import { paintReports, paintGrid, paintChart, indicatorTable, LEVEL_COL } from './view.js';
import { pulse, flash, countUp } from '../../../shared/js/motion.js';

const $ = id => document.getElementById(id);
const newSeed = () => 1 + Math.floor(Math.random() * 999998);
const show = (...ids) => ['start', 'play', 'end'].forEach(id => { $(id).hidden = !ids.includes(id); });

let g = null;   // { s, p, level, look, lastEvents }

$('lr').innerHTML = indicatorTable();
$('budget0').textContent = P.lookBudget;

/* ---------- Start ---------- */
function fresh(seed) {
  g = { s: newGame(seed), p: null, level: 0, look: -1, lastEvents: null };
  g.p = Math.round(g.s.world.rate * 100);
}
function paintStart() {
  $('base').innerHTML = `<b>Base rate.</b> ${P.baseRates[g.s.world.rateIdx].text} <span class="muted">(Invented for this game.)</span>`;
}
$('begin').addEventListener('click', () => { show('play'); paint(); $('prob').focus(); });

/* ---------- The week ---------- */
function paintMeters() {
  const s = g.s;
  const m = [
    ['Trust', Math.round(s.trust), s.trust, 'var(--good)'],
    ['Readiness', Math.round(s.ready), s.ready, 'var(--accent)'],
    ['Costs so far', Math.round(s.cost), null],
    ['False alarms', s.falseAlarms, null],
  ];
  $('meters').innerHTML = m.map(([l, v, bar, c]) => `<div class="cw-m"><span>${l}</span><b class="num" data-m="${l}">${v}</b>${bar != null ? `<span class="bar" aria-hidden="true"><i style="width:${bar}%;background:${c}"></i></span>` : ''}</div>`).join('');
}
function paintLevels() {
  $('levels').innerHTML = P.levels.map((l, i) => `<button type="button" role="radio" aria-checked="${g.level === i}" tabindex="${g.level === i ? 0 : -1}" data-level="${i}" style="--lc:${LEVEL_COL[i]}">${l.label}</button>`).join('');
  $('lvx').textContent = P.levels[g.level].text;
}
function paint() {
  const s = g.s, wk = thisWeek(s);
  $('week').textContent = `Week ${s.week}`;
  paintMeters();
  $('exnote').textContent = wk.ex ? 'The Neighbor has announced a large exercise this week. Expect more reports of every kind.' : 'No exercise announced this week.';
  paintReports($('reports'), wk, g.look, s.budget > 0);
  $('looks').textContent = s.budget - (g.look >= 0 ? 1 : 0);
  $('prob').value = g.p; $('prob-out').textContent = `${g.p}%`;
  paintLevels();
  paintChart($('chart'), [{ v: s.hist.map(h => h.p / 100), cls: 'you' }], { levels: s.hist.map(h => h.level) });
  paintGrid($('grid'), s.world, s.hist, s.week);
  history.replaceState(null, '', '#g=' + encode(s));
}
$('prob').addEventListener('input', e => { g.p = +e.target.value; $('prob-out').textContent = `${g.p}%`; });
$('levels').addEventListener('click', e => { const b = e.target.closest('[data-level]'); if (!b) return; g.level = +b.dataset.level; paintLevels(); $('levels').querySelector(`[data-level="${g.level}"]`).focus(); });
$('levels').addEventListener('keydown', e => {
  const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (d == null) return;
  e.preventDefault(); g.level = (g.level + d + 4) % 4; paintLevels(); $('levels').querySelector(`[data-level="${g.level}"]`).focus();
});
$('reports').addEventListener('click', e => {
  const b = e.target.closest('[data-look]'); if (!b || g.look >= 0 || g.s.budget <= 0) return;
  g.look = +b.dataset.look;
  paintReports($('reports'), thisWeek(g.s), g.look, true);
  $('looks').textContent = g.s.budget - 1;
  const res = $('reports').querySelector('.cw-look');
  flash(res); res.setAttribute('tabindex', '-1'); res.focus();
  $('feed').textContent = `Closer look at ${ALL[g.look].label.toLowerCase()}: ${thisWeek(g.s).look[g.look] ? 'it looks tied to preparation' : 'it looks routine'}.`;
});

function eventText(ev, s, before) {
  const parts = [`Week ${s.week - 1}: ${P.levels[s.level].label}. Readiness ${Math.round(before.ready)} → ${Math.round(s.ready)}, trust ${Math.round(s.trust)}.`];
  for (const e of ev) if (e.kind === 'false-alarm') parts.push(`False alarm${e.end ? ' (still warning when the 26 weeks ran out)' : ''}: the decision-maker loses ${Math.round(e.drop)} trust. That is false alarm number ${e.n}.`);
  return parts.join(' ');
}
$('end-week').addEventListener('click', () => {
  if (!g || g.s.over) return;
  const before = g.s;
  const { state, events } = step(g.s, { p: g.p, level: g.level, look: g.look });
  g.s = state; g.look = -1;
  if (state.over) return finish();
  paint();
  $('feed').textContent = eventText(events, state, before);
  if (events.some(e => e.kind === 'false-alarm')) flash($('meters'));
  pulse($('week'));
  $('prob').focus();
});

/* ---------- End ---------- */
function finish() {
  const s = g.s, w = s.world;
  history.replaceState(null, '', '#g=' + encode(s));
  show('end');
  $('end-k').textContent = `${s.hist.length} week${s.hist.length === 1 ? '' : 's'} · base rate ${Math.round(w.rate * 100)}%`;
  if (s.over.attack) {
    $('end-t').textContent = s.over.inTime ? `The Neighbor attacked in week ${w.attackWeek}. The defense was ready.` : `The Neighbor attacked in week ${w.attackWeek}. ${s.ready >= 30 ? 'The defense was only partly ready.' : 'It came as a surprise.'}`;
    $('end-x').textContent = `It had been preparing since week ${Math.max(1, w.attackWeek - P.late - P.early + 1)}. Readiness when it struck: ${Math.round(s.ready)} (60 counts as warned in time).`;
  } else {
    $('end-t').textContent = 'No attack. It was exercises and bluff all along.';
    $('end-x').textContent = `Every report you saw came from routine activity and exercises. You raised ${s.falseAlarms} false alarm${s.falseAlarms === 1 ? '' : 's'}.`;
  }
  const sc = score(s);
  $('total').textContent = sc.total; countUp($('total'), sc.total, { from: 0 });
  $('parts').innerHTML = sc.parts.map(p => `<tr><td>${p.label}</td><td class="num">${p.value}</td><td class="muted">× ${p.weight}</td><td class="fine">${p.note}</td></tr>`).join('');
  const ai = analystGame(s.seed), aiSc = score(ai);
  $('ai-total').textContent = aiSc.total;
  const post = posteriorPath(w, s.hist.map(h => h.look));
  paintChart($('end-chart'), [
    { v: post, cls: 'bay' },
    { v: ai.hist.map(h => h.p / 100), cls: 'ai' },
    { v: s.hist.map(h => h.p / 100), cls: 'you' },
  ], { attackWeek: w.attackWeek, levels: s.hist.map(h => h.level) });
  paintGrid($('end-grid'), w, s.hist, s.hist.length, true);
  $('lessons').innerHTML = lessons(s, post).map(l => `<li>${l}</li>`).join('');
  $('end').focus();
  runBench(sc.total);
}
function lessons(s, post) {
  const out = [], w = s.world;
  const gap = s.hist.reduce((m, h, i) => Math.max(m, Math.abs(h.p / 100 - post[i])), 0);
  if (Math.abs(s.hist[0].p / 100 - w.rate) > 0.2) out.push(`<b>Base rates matter.</b> Before any report, the best estimate was the base rate, ${Math.round(w.rate * 100)}%. Your week-1 estimate was ${s.hist[0].p}%.`);
  if (gap > 0.3) out.push(`<b>One indicator rarely settles it.</b> At one point your estimate was ${Math.round(gap * 100)} points from the Bayesian posterior. Single reports have likelihood ratios of about 1 to 6; it takes several weeks of them together.`);
  if (s.falseAlarms) out.push(`<b>False alarms compound.</b> You raised ${s.falseAlarms} false alarm${s.falseAlarms > 1 ? 's' : ''}; each cost more trust than the last, and trust recovers only a point a week.${s.trust < 95 ? ` You ended at ${Math.round(s.trust)} trust, so your next warning would build readiness at only ${Math.round(s.trust)}% of the full rate.` : ''}`);
  if (s.over.attack && !s.over.inTime) {
    const a = w.attackWeek, top = Math.max(...s.hist.slice(Math.max(0, a - 4)).map(h => h.level));
    const t50 = post.findIndex(p => p >= 0.8);
    out.push(`<b>Waiting for certainty means warning too late.</b> Readiness takes three or four weeks to build; in the last four weeks before the attack your highest level was ${P.levels[top].label}.${t50 >= 0 && t50 + 1 < a ? ` The Bayesian posterior passed 80% in week ${t50 + 1}, ${a - t50 - 1} week${a - t50 - 1 === 1 ? '' : 's'} before the attack.` : ' Even the Bayesian posterior stayed below 80% until the attack week: some attacks cannot be warned of in time from these reports.'}`);
  }
  if (!out.length) out.push('A clean game: your estimates tracked the evidence and your warnings were timely and sparing.');
  return out;
}
function runBench(total) {
  const runs = [];
  const tick = () => {
    runs.push(...analystRuns(g.s.world, runs.length, 10).map(r => score(r).total));
    if (runs.length < P.bench) { $('pct-x').textContent = `comparing with the computer analyst… ${runs.length} of ${P.bench}`; return setTimeout(tick, 0); }
    $('pct').textContent = `${percentile(total, runs)}%`;
    $('pct-x').textContent = `of ${P.bench} computer-analyst games with the same truth and fresh reporting scored below you`;
    pulse($('pct'));
  };
  $('pct').textContent = '…';
  setTimeout(tick, 30);
}

/* ---------- Restart, links, load ---------- */
function restart() {
  fresh(newSeed()); history.replaceState(null, '', location.pathname + location.search);
  paintStart(); $('feed').textContent = ''; show('start'); $('start').scrollIntoView({ block: 'start' }); $('begin').focus();
}
$('again').addEventListener('click', restart);
$('new-game').addEventListener('click', restart);
$('copy-link').addEventListener('click', async e => {
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; } catch { e.target.textContent = 'Copy the address bar'; }
  setTimeout(() => { e.target.textContent = 'Copy link'; }, 1600);
});

function load() {
  const m = location.hash.match(/#g=([^&]+)/);
  const d = m && decode(decodeURIComponent(m[1]));
  if (!d) { fresh(newSeed()); paintStart(); show('start'); return; }
  fresh(d.seed);
  g.s = replay(d);
  const last = g.s.hist[g.s.hist.length - 1];
  if (last) { g.p = last.p; g.level = last.level; }
  if (g.s.over) return finish();
  if (!g.s.hist.length) { paintStart(); show('start'); return; }
  show('play'); paint();
}
load();
