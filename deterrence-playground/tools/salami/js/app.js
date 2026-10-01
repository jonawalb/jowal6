// Salami: start screen, the monthly decision, the reveal, and the end-of-game debrief.
import { P, LEVELS, C_MSGS, P_MSGS, R_VALUES, R_PRIOR, T_VALUES, T_PRIOR, RESPONSE_LABEL } from '../data/params.js';
import { M, newGame, brief, resolveTurn, encode, decode } from './engine.js';
import { chooseCoastal, choosePower } from './ai.js';
import { mode } from './belief.js';
import { score, winner, timeline } from './score.js';
import { paintDecide, wireDecide, emptyChoice } from './decide.js';
import { drawShoal, paintShoal, animateMonth, paintTracks, paintBelief, paintTimeline, paintNormal, levelLabel, COL } from './view.js';
import { counters, baseline } from './normal.js';
import { pulse, flash } from '../../../shared/js/motion.js';

const $ = id => document.getElementById(id);
const newSeed = () => 1 + Math.floor(Math.random() * 999998);
const show = (...ids) => ['start', 'play', 'resolve', 'end'].forEach(id => { $(id).hidden = !ids.includes(id); });
const SIDE = { c: 'the Coastal State', p: 'the Coast Guard Power' };
const pct = v => `${Math.round(v * 100)}%`;
let g = null, pick = null;

/* ---------- Start ---------- */
$('seats').addEventListener('click', e => {
  const b = e.target.closest('[data-side]'); if (!b) return;
  pick = b.dataset.side;
  document.querySelectorAll('[data-side]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
  $('begin').disabled = false;
});
$('seats').addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  const bs = [...document.querySelectorAll('[data-side]')], i = bs.indexOf(document.activeElement);
  const n = bs[(i + 1) % bs.length]; n.focus(); n.click(); e.preventDefault();
});
$('begin').addEventListener('click', () => { if (!pick) return; begin({ seed: newSeed(), side: pick }); show('play'); paint(); $('play').focus(); });

function begin({ seed, side }) {
  g = { s: brief(newGame({ seed, side })), side, before: null };
  g.choice = emptyChoice(side, g.s); g.smashArmed = false;
  document.body.style.setProperty('--c', side === 'c' ? COL.c : COL.p);
  drawShoal($('shoal'));
}

/* ---------- Decide ---------- */
function eventText(s) {
  const w = [s.cur.rough ? 'Rough seas: boats’ odds ×0.8.' : '', s.cur.cloud ? 'Low cloud: airdrop odds ×0.6.' : ''].filter(Boolean).join(' ') || 'Calm weather.';
  return `<b>${w}</b>${s.cur.text}${s.onScene > 0 ? ' <span class="sl-tag">Patron ships on scene</span>' : ''}`;
}
function paint() {
  const s = g.s;
  $('month').textContent = P.months[s.turn];
  $('turnof').textContent = `month ${s.turn + 1} of ${P.turns} · you are ${SIDE[g.side]}`;
  $('event').innerHTML = eventText(s);
  paintTracks($('tracks'), s, g.before);
  paintShoal(s, s.lastLevel);
  paintFeed();
  paintNormal($('normal'), s, counters(s), baseline(s));
  $('dec-t').textContent = g.side === 'c' ? 'Your move: resupply' : 'Your move: squeeze';
  paintDecide(g);
  history.replaceState(null, '', '#g=' + encode(s));
}
function paintFeed() {
  const h = g.s.history[g.s.history.length - 1];
  $('feed').innerHTML = h ? `<h3>Last month</h3><ul><li><b style="color:${COL.c}">Coastal State</b>: ${M[h.c.method].label.toLowerCase()}, ${C_MSGS.find(m => m.id === h.c.msg).label.toLowerCase()}${h.c.push ? ', pushed through' : ''}. Landed ${h.delivered.toFixed(1)} months of supplies.${h.enc ? (h.answered ? ' <b>Answered</b> the Power.' : ' <b>Left the Power unanswered.</b>') : ''}</li><li><b style="color:${COL.p}">Power</b>: ${LEVELS[h.p.level].label.toLowerCase()}, ${P_MSGS.find(m => m.id === h.p.msg).label.toLowerCase()}.</li><li><b style="color:${COL.a}">Patron</b>: ${RESPONSE_LABEL[h.resp]}${h.E ? ` (it saw rung ${h.E})` : ''}.</li></ul>`
    : `<h3>The situation</h3><p class="fine">The Coastal State keeps a handful of marines on an old ship it ran aground on the shoal years ago. The Coast Guard Power claims the shoal and wants them gone, but not at the price of a fight with the Patron, whose treaty with the Coastal State is vague about places like this. The garrison has ${P.start.supplies} months of supplies and eats ${P.use} a month.</p>`;
}
wireDecide(() => g, () => paintShoal(g.s, g.side === 'p' ? g.choice.level : g.s.lastLevel));

/* ---------- Resolve ---------- */
function step(mine) {
  const s = brief(g.s);
  const moves = g.side === 'c' ? { c: mine, p: choosePower(s) } : { c: chooseCoastal(s), p: mine };
  g.before = { ...s };
  return resolveTurn(s, moves);
}
const beliefLine = (b0, b1, values, labels, what) => {
  const m0 = mode(b0, values), m1 = mode(b1, values), i0 = values.indexOf(m0), i1 = values.indexOf(m1);
  return `${what}: most likely <b>${labels(m0)}</b> (${pct(b0[i0])}) → <b>${labels(m1)}</b> (${pct(b1[i1])}).`;
};
$('end-turn').addEventListener('click', async () => {
  if (!g || g.s.over || !$('resolve').hidden) return;
  const month = P.months[g.s.turn];
  const { state, log } = step(JSON.parse(JSON.stringify(g.choice)));
  const h = state.history[state.history.length - 1], b = g.before;
  g.s = state;
  show('play', 'resolve'); $('decide').hidden = true;
  $('res-t').textContent = h.smash ? `${month}: the red line is smashed` : `${month}: what happened`;
  $('reveal').innerHTML = `<div class="sl-mv" style="--c:${COL.c}"><b>Coastal State${g.side === 'c' ? ' (you)' : ''}</b>${M[h.c.method].label}; ${C_MSGS.find(m => m.id === h.c.msg).label.toLowerCase()}${h.c.push ? '; push through' : ''}<small>Provocation ${h.P}</small></div>
    <div class="sl-mv" style="--c:${COL.p}"><b>Power${g.side === 'p' ? ' (you)' : ''}</b>${LEVELS[h.p.level].label}; ${P_MSGS.find(m => m.id === h.p.msg).label.toLowerCase()}${h.p.hold ? '; hold course' : ''}${h.p.detain ? '; detain crews' : ''}</div>
    <div class="sl-mv" style="--c:${COL.a}"><b>Patron</b>${RESPONSE_LABEL[h.resp]}<small>${h.E ? `It saw rung ${h.E}` : 'Nothing reached it'}</small></div>`;
  const lines = log.map(l => `<li class="${l.tone || ''}">${l.text}</li>`);
  lines.push(`<li class="note">${beliefLine(b.bR, state.bR, R_VALUES, levelLabel, 'The Patron’s line')}</li>`);
  if (g.side === 'c') lines.push(`<li class="note">${beliefLine(b.bT, state.bT, T_VALUES, String, 'The Power’s threshold')}</li>`);
  $('log').innerHTML = lines.join('');
  paintTracks($('tracks'), g.s, b); paintShoal(g.s, h.p.level); paintNormal($('normal'), g.s, counters(g.s), baseline(g.s));
  $('next').disabled = true;
  $('resolve').focus();
  await Promise.race([animateMonth(h), new Promise(r => setTimeout(r, 2500))]);
  $('next').disabled = false; $('next').focus();
});
$('next').addEventListener('click', () => {
  if (g.s.over) return finish();
  g.s = brief(g.s);
  g.choice = emptyChoice(g.side, g.s); g.smashArmed = false;
  show('play'); $('decide').hidden = false; paint();
  document.querySelectorAll('#tracks .sl-track').forEach(t => { if (t.querySelector('small')) flash(t); });
  $('end-turn').focus();
});

/* ---------- End ---------- */
function finish() {
  const s = g.s, me = g.side, sc = score(s, me), w = winner(s);
  history.replaceState(null, '', '#g=' + encode(s));
  show('end');
  const mine = (w === 'coastal' && me === 'c') || (w === 'power' && me === 'p');
  $('end-k').textContent = `You played ${SIDE[me]} · ${s.over.month} month${s.over.month === 1 ? '' : 's'} · ${mine ? 'you won' : w === 'none' ? 'nobody won' : 'you lost'}`;
  $('end-t').textContent = s.over.title;
  $('end-x').textContent = s.over.text;
  $('total').textContent = sc.total;
  $('parts').innerHTML = sc.parts.map(p => `<tr><td>${p.label}</td><td class="num">${p.value}</td></tr>`).join('');
  $('truth').innerHTML = `The Patron’s line was <b>${levelLabel(s.R)}</b> (rung ${s.R})${s.R === 6 ? ', reachable only with observers, injuries, detentions or a wave of sympathy' : ''}. ${me === 'c' ? ` The Power snapped at provocation <b>${s.T}</b>.` : ' As the Power you had no fixed threshold: the computer read one into your jumps.'}`;
  const rows = timeline(s);
  paintTimeline($('timeline'), s, rows, me === 'c');
  paintBelief($('end-r'), { prior: R_PRIOR, post: s.bR, labels: R_VALUES.map(levelLabel), truth: R_VALUES.indexOf(s.R), color: COL.a });
  $('end-t2-t').textContent = me === 'c' ? 'Final belief about the Power’s threshold' : 'What the computer came to believe about your threshold';
  paintBelief($('end-t2'), { prior: T_PRIOR, post: s.bT, labels: T_VALUES.map(String), truth: me === 'c' ? T_VALUES.indexOf(s.T) : null, color: COL.p });
  $('lessons').innerHTML = lessons(s, rows, me);
  const sm = s.history.find(h => h.smash)?.smash;
  $('smash-d').hidden = !sm;
  if (sm) $('smash-x').innerHTML = `${sm.side === 'c' ? 'The Coastal State' : 'The Power'}${sm.side === me ? ' (you)' : ''} smashed the red line in ${P.months[s.over.month - 1]}. The estimate from ${sm.side === me ? 'your' : 'its'} belief was that the Patron would step in ${pct(sm.est)} of the time; the true chance was <b>${pct(sm.p)}</b>, and it ${sm.stepIn ? 'stepped in' : 'stayed out'}${sm.clashP ? ` (chance of a clash once it did: ${pct(sm.clashP)})` : ''}. What drove it, at the Patron’s true line (log-odds; + toward stepping in): ${sm.drivers.map(([k, v]) => `${k} ${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`).join('; ')}.`;
  const close = rows.filter(r => r.gapR === -1).length, over = rows.filter(r => r.gapR !== null && r.gapR >= 0).length;
  const hitT = rows.filter(r => r.gapT >= 0).length;
  $('closest').textContent = `The Patron saw a rung one below its line in ${close} month${close === 1 ? '' : 's'} and its line or above in ${over}.` + (me === 'c' ? ` Your provocation reached the Power’s threshold in ${hitT} month${hitT === 1 ? '' : 's'}.` : '');
  $('end').focus();
  pulse($('total'));
}
function lessons(s, rows, me) {
  const enc = rows.filter(r => r.enc), ans = enc.filter(r => r.answered).length, peak = Math.max(0, ...rows.map(r => r.base));
  const first = rows.find(r => r.base === peak), end = rows[rows.length - 1]?.base ?? 0;
  const lines = [`The Coastal State answered ${ans} of ${enc.length} encounters.`];
  if (!peak) lines.push('No rung ever became normal: the Power never used one unanswered twice in six months, so every slice still drew sympathy, risk and the Patron’s full attention.');
  else lines.push(`The normal crept up to <b>${levelLabel(peak).toLowerCase()}</b> by ${P.months[first.month]}${end < peak ? ` and was pushed back to ${end ? levelLabel(end).toLowerCase() : 'nothing'} by the end` : ' and stayed there'}. Each normal rung drew less sympathy and risk, and the Patron saw it as a rung milder: the line moved without anyone crossing it.`);
  lines.push(me === 'c' ? 'The lesson for the Coastal State: an unanswered slice is a concession, but answering everything spends escalation risk and wears out your voice. Answer the slice that is one use from becoming normal.'
    : 'The lesson for the Power: a slice that goes unanswered twice becomes the new floor. Climb from the floor one rung at a time; jumping skips the normalizing and lands you at the Patron’s line.');
  return lines.join(' ');
}
$('again').addEventListener('click', restart);
$('new-game').addEventListener('click', restart);
function restart() {
  g = null; pick = null; history.replaceState(null, '', location.pathname + location.search);
  document.querySelectorAll('[data-side]').forEach(x => x.setAttribute('aria-checked', 'false'));
  $('begin').disabled = true; show('start'); $('start').scrollIntoView({ block: 'start' });
}
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
  begin(d);
  for (const mv of d.moves) { if (g.s.over) break; g.s = step(mv).state; if (!g.s.over) g.s = brief(g.s); }
  if (g.s.over) return finish();
  g.choice = emptyChoice(g.side, g.s);
  show('play'); paint();
}
load();
