// Brinkmanship: learn-first intro, the round-by-round crisis, the equilibrium overlay and the end-of-series debrief.
import { P, ACTIONS, ACT, CRISES, TYPE } from '../data/params.js';
import { newSeries, playRound, nextCrisis, tally, encode, decode, replay } from './engine.js';
import { benchmark, percentile, decisionValues, equilibriumAt } from './score.js';
import { paintMeter, paintReads, paintStake, paintDots, logLine, eqTableHTML, hindHTML, seriesHeadline, pct, pts, sgn } from './view.js';
import { pulse, shake, flash, countUp, reduced } from '../../../shared/js/motion.js';

const $ = id => document.getElementById(id);
const newSeed = () => 1 + Math.floor(Math.random() * 999998);
const SCREENS = ['learn', 'play', 'after', 'end'];
const show = (...ids) => SCREENS.forEach(id => { $(id).hidden = !ids.includes(id); });
const save = () => history.replaceState(null, '', '#g=' + encode(s));

let s = null;          // the series state (engine.js)
let benchToken = 0;    // cancels a running benchmark when a new series starts

/* ---------- Choices ---------- */
$('choices').innerHTML = ACTIONS.map(a => `<button type="button" class="bk-choice ${a}" data-act="${a}" aria-keyshortcuts="${ACT[a].key}"><kbd>${ACT[a].key.toUpperCase()}</kbd><b>${ACT[a].label}</b><small>${ACT[a].text}</small></button>`).join('');
$('choices').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) choose(b.dataset.act); });
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || /input|select|textarea/i.test(e.target.tagName)) return;
  if ($('play').hidden || !$('after').hidden || !s?.cur) return;
  const a = ACTIONS.find(x => ACT[x].key === e.key.toLowerCase());
  if (a) { e.preventDefault(); choose(a); }
});

/* ---------- Paint the live crisis ---------- */
function paint() {
  const c = s.cur || s.done[s.done.length - 1], cr = CRISES[c.i];
  $('crisis-k').textContent = `Crisis ${c.i + 1} of ${CRISES.length}`;
  $('crisis-t').textContent = cr.name;
  $('crisis-x').textContent = cr.text;
  paintDots($('dots'), s);
  const t = tally(s);
  $('tally').innerHTML = `You <b>${pts(t.you)}</b> pts · Rival <b>${pts(t.rival)}</b> pts<br><span class="muted">Crises won ${t.wins}–${t.losses}</span>`;
  const m = paintMeter($('meter'), c.risk);
  $('meter-x').innerHTML = c.over ? 'Crisis over.' : `If both hold, the risk rolled this round is <b>${pct(m.hold)}</b> (dashed line). Each Raise adds ${pct(P.raise)}; if both raise, <b>${pct(m.both)}</b> (shaded).`;
  paintStake($('stake'), c);
  paintReads($('reads'), c);
  $('round').textContent = c.round;
  $('decide').hidden = !!c.over;
  $('log').innerHTML = c.log.map((l, k) => { const x = logLine(l, k === c.log.length - 1 ? c.over : null); return `<li class="${x.cls}">${x.html}</li>`; }).join('') || '<li>The crisis begins. Make your first move.</li>';
  save();
}

function choose(a) {
  if (!s?.cur) return;
  const before = s.cur;
  s = playRound(s, a);
  const c = s.cur || s.done[s.done.length - 1];
  const l = c.log[c.log.length - 1];
  const line = logLine(l, c.over);
  paint();
  $('say').textContent = line.html.replace(/<[^>]+>/g, '');
  if (c.over?.kind === 'disaster') shake($('meter'));
  else if (c.over?.kind === 'win') pulse($('tally'));
  else if (c.risk > before.risk + P.drift + 1e-9) flash($('meter'));
  if (c.over) setTimeout(afterCrisis, reduced() ? 0 : 450);
}

/* ---------- After each crisis: reveal and the equilibrium overlay ---------- */
const OUTCOME = { win: 'You won the stake', lose: 'The Rival won the stake', split: 'Split', exhausted: 'Split by exhaustion', disaster: 'Disaster' };
function afterCrisis() {
  const c = s.done[s.done.length - 1];
  show('play', 'after');
  $('after-k').textContent = `Crisis ${c.i + 1} of ${CRISES.length}: ${CRISES[c.i].name}`;
  $('after-t').textContent = `${OUTCOME[c.over.kind]}: ${sgn(c.over.pay.you)} points to you`;
  $('after-x').textContent = `${c.log.length} round${c.log.length === 1 ? '' : 's'}; the risk reached ${pct(c.log[c.log.length - 1].after ?? c.risk)}. Here is who you were really facing.`;
  $('reveal').innerHTML = `<div style="--c:var(--you)"><b>You</b>: ${TYPE[c.types.you].label.toLowerCase()} (stake worth ${c.val.you})</div>
    <div style="--c:var(--riv)"><b>The Rival</b>: ${TYPE[c.types.rival].label.toLowerCase()} (worth ${c.val.rival}). You had rated that ${pct(c.log[c.log.length - 1].belBefore.you[c.types.rival])} likely before the last round.</div>`;
  const rows = c.log.map(l => ({ l, eq: equilibriumAt(c, l, s.dice), ev: decisionValues(c, l, { seed: s.dice }) }));
  $('eq').innerHTML = eqTableHTML(rows);
  $('next').textContent = s.over ? 'See the debrief' : 'Next crisis';
  $('after').focus();
  $('after').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
}
$('next').addEventListener('click', () => {
  if (s.over) return finish();
  s = nextCrisis(s);
  show('play'); paint();
  $('play').scrollIntoView({ block: 'start' });
  $('choices').querySelector('button').focus();
});

/* ---------- Debrief ---------- */
function finish() {
  show('end');
  const t = tally(s);
  $('end-t').textContent = seriesHeadline(t);
  countUp($('total'), t.you, { from: 0, fmt: n => pts(n) });
  $('hind').innerHTML = s.done.map(c => hindHTML(c, c.log.map(l => ({ l, ev: decisionValues(c, l, { hindsight: true, seed: s.dice }) })))).join('');
  save();
  $('end').focus();
  $('end').scrollIntoView({ block: 'start' });
  runBench(t.you);
}
function runBench(total) {
  const token = ++benchToken, runs = [], N = P.benchRuns, seed = s.seed, types = s.types;
  $('pct').textContent = '…';
  const tick = () => {
    if (token !== benchToken) return;
    const k = runs.length;
    for (let j = 0; j < 10 && runs.length < N; j++) runs.push(...benchmark((seed + (k + j) * 101) >>> 0, 1, types));
    if (runs.length < N) { $('pct-x').textContent = `comparing with the computer in your seat… ${runs.length} of ${N}`; return setTimeout(tick, 0); }
    const mean = runs.reduce((a, x) => a + x, 0) / N;
    $('pct').textContent = `${percentile(total, runs)}%`;
    $('pct-x').textContent = `of ${N} series played by the computer in your seat (same resolves, different dice) scored below you. Its average: ${pts(mean)}.`;
    pulse($('pct'));
  };
  setTimeout(tick, 30);
}

/* ---------- Start, restart, copy link, load ---------- */
function begin(seed) {
  benchToken++;
  s = newSeries(seed);
  show('play'); paint();
  $('play').scrollIntoView({ block: 'start' });
  $('choices').querySelector('button').focus();
}
$('start').addEventListener('click', () => begin(newSeed()));
$('new-game').addEventListener('click', () => begin(newSeed()));
$('again').addEventListener('click', () => begin(newSeed()));
$('copy-link').addEventListener('click', async e => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText(location.href); b.textContent = 'Link copied'; } catch { b.textContent = 'Copy the address bar'; }
  setTimeout(() => { b.textContent = 'Copy link'; }, 1600);
});

function load() {
  const m = location.hash.match(/#g=([^&]+)/);
  const d = m && decode(decodeURIComponent(m[1]));
  if (!d) { show('learn'); return; }
  s = replay(d);
  if (s.over) { paint(); return finish(); }
  show('play'); paint();
  if (!s.cur) afterCrisis();
}
load();
