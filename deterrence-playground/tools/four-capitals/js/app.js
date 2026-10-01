// Four Capitals: start screen, the monthly decision, reveal and resolution, and the end-of-game debrief.
import { P } from '../data/params.js';
import { COUNTRIES, IDS, defaultWeights } from '../data/countries.js';
import { POSTURES, BY_ID, answers } from '../data/actions.js';
import { AREA_LABEL } from '../data/theater.js';
import { newGame, brief, resolveTurn, snapshot, encode, decode } from './engine.js';
import { applyOrders, updateControl } from './forces.js';
import { paintDecide, wireDecide, emptyChoice } from './decide.js';
import { makeRng, STREAM } from './rng.js';
import { initBeliefs, updateBeliefs, chooseMove, intelView } from './ai.js';
import { score, benchmark, percentile } from './score.js';
import { drawTheatre, paintTheatre, paintZones, animateMoves, paintLadder, paintTracks, paintCaps, paintIntel, paintBeliefChart, COL } from './view.js';
import { pulse, flash } from '../../../shared/js/motion.js';

const $ = id => document.getElementById(id);
const newSeed = () => 1 + Math.floor(Math.random() * 999998);
const monthName = t => `${P.months[Math.min(t, P.turns - 1)]} ${P.year}`;
const show = (...ids) => ['start', 'typecard', 'play', 'resolve', 'end'].forEach(id => { $(id).hidden = !ids.includes(id); });

let g = null;            // { s, B, series, player, weights, difficulty, choice, line, before }
let pick = null;         // seat chosen on the start screen

/* ---------- Start ---------- */
function paintSeats() {
  const blurb = {
    us: 'Keep Taiwan free and the alliance credible without a war you cannot control.',
    tw: 'Hold on, keep your partners close and your people steady.',
    cn: 'Make progress toward unification before the coalition hardens, without losing control.',
    jp: 'Stand by the alliance without becoming the target.',
  };
  $('seats').innerHTML = IDS.map(id => `<button type="button" role="radio" aria-checked="${pick === id}" class="k4-seat" data-seat="${id}" style="--c:${COL[id]}"><b>${COUNTRIES[id].name}</b><small>${blurb[id]}</small></button>`).join('');
}
function paintWeights() {
  const w = defaultWeights(pick);
  $('weights').innerHTML = COUNTRIES[pick].objectives.map(o => `<label class="k4-w"><span>${o.label}</span><input type="range" min="0" max="5" step="1" value="${w[o.id]}" data-obj="${o.id}" aria-label="${o.label}"><output class="num">${w[o.id]}</output></label>`).join('');
}
$('seats').addEventListener('click', e => {
  const b = e.target.closest('[data-seat]'); if (!b) return;
  pick = b.dataset.seat; paintSeats(); paintWeights(); $('setup').hidden = false;
  $('start').style.setProperty('--accent', COL[pick]);
});
$('weights').addEventListener('input', e => { if (e.target.dataset.obj) e.target.nextElementSibling.textContent = e.target.value; });
$('begin').addEventListener('click', () => {
  const weights = Object.fromEntries([...$('weights').querySelectorAll('input')].map(i => [i.dataset.obj, +i.value]));
  begin({ seed: newSeed(), player: pick, weights, difficulty: $('difficulty').value });
  const t = g.s.types[g.player];
  $('type-t').textContent = `You lead ${COUNTRIES[g.player].name}. Your leadership is ${P.typeLabel[t].toLowerCase()}.`;
  $('type-x').textContent = P.typeText[t];
  $('typecard').style.setProperty('--c', COL[g.player]);
  show('typecard'); $('typecard').focus();
});
$('type-go').addEventListener('click', () => { show('play'); paint(); $('end-turn').focus(); });

function begin(start) {
  const s0 = newGame(start);
  g = { s: brief(s0), B: initBeliefs(), series: [], player: start.player, weights: start.weights, difficulty: start.difficulty, line: 'D', choice: emptyChoice() };
  g.series.push(g.B);
  document.body.style.setProperty('--c', COL[g.player]);
  drawTheatre($('theatre'));
}

/* ---------- Decide ---------- */
/** What you can see of a capital's strength in an area: exact for yourself, your partners or with fresh intelligence, else ±1. */
function seenIn(st) {
  return (w, a) => {
    const v = st.f[w][a] || 0;
    const ally = w !== 'cn' && g.player !== 'cn';
    if (v <= 0 || w === g.player || ally || st.sharp?.[g.player]) return [v, true];
    const r = makeRng(st.seed, STREAM.intel + 500 + st.turn * 40 + IDS.indexOf(w) * 8 + a.length);
    return [Math.max(0, v + (r.u() < 0.33 ? -1 : r.u() < 0.5 ? 1 : 0)), false];
  };
}
/** The map shows your planned deployment before you commit. */
function paintPlan() {
  const t = JSON.parse(JSON.stringify(g.s));
  applyOrders(t, g.player, g.choice.orders, g.choice.actions.reduce((n, id) => n + (BY_ID[id].deploy || 0), 0));
  updateControl(t);
  paintZones(t, seenIn(t));
}
function paint() {
  const s = g.s;
  $('month').textContent = monthName(s.turn);
  $('turnof').textContent = `month ${s.turn + 1} of ${P.turns}`;
  $('event').innerHTML = s.event ? `<b>${s.event.title}</b>${s.event.text}` : '';
  paintLadder($('ladder'), s);
  paintTracks($('tracks'), s, g.before);
  paintCaps($('caps'), s, g.player);
  paintTheatre(s); paintPlan();
  const views = Object.fromEntries(IDS.filter(w => w !== g.player).map(w => [w, intelView(g.B, s, g.player, w)]));
  const theirs = Object.fromEntries(IDS.filter(w => w !== g.player).map(w => [w, intelView(g.B, s, w, g.player)]));
  paintIntel($('intel'), views, theirs, g.player);
  paintFeed();
  paintDecide(g);
  history.replaceState(null, '', '#g=' + encode(s));
}
const moveText = (m, w) => [POSTURES.find(p => p.id === m.posture).label + (m.actions.length ? '; ' : ''), m.actions.map(id => BY_ID[id].label.toLowerCase()).join('; ')].join('');
function paintFeed() {
  const h = g.s.history[g.s.history.length - 1];
  $('feed').innerHTML = h ? `<h3>Last month</h3><ul>${IDS.map(w => `<li><b style="color:${COL[w]}">${COUNTRIES[w].short}</b>: ${moveText(h.moves[w], w)}</li>`).join('')}</ul>`
    : '<h3>The situation</h3><p class="fine">Beijing has stepped up pressure on Taiwan after a disputed election result. Its navy already holds the Strait; Japan watches the North and U.S. ships sit east of Taiwan. Washington, Tokyo and Taipei are watching each other as closely as they watch Beijing. Nothing has been fired yet.</p>';
}
wireDecide(() => paintPlan());

/* ---------- Resolve ---------- */
function computerMoves(s, B) {
  return Object.fromEntries(IDS.map(w => [w, w === g.player ? null : chooseMove(s, w, B[w], defaultWeights(w))]));
}
function step(playerMove) {
  const moves = computerMoves(g.s, g.B);
  moves[g.player] = playerMove;
  g.B = updateBeliefs(g.B, g.s, moves);
  g.series.push(g.B);
  g.before = snapshot(g.s);
  const res = resolveTurn(g.s, moves);
  return { moves, log: res.log, next: res.state };
}
$('end-turn').addEventListener('click', async () => {
  if (!g || g.s.over || !$('resolve').hidden) return;
  const month = monthName(g.s.turn);
  const { moves, log, next } = step(JSON.parse(JSON.stringify(g.choice)));
  g.s = next;
  show('play', 'resolve'); $('intel').hidden = $('feed').hidden = true; $('decide').hidden = true;
  $('res-t').textContent = `${month}: what happened`;
  $('reveal').innerHTML = IDS.map(w => `<div class="k4-mv" style="--c:${COL[w]}"><b>${COUNTRIES[w].short}${w === g.player ? ' (you)' : ''}</b><span class="po">${POSTURES.find(p => p.id === moves[w].posture).label}</span><ul>${moves[w].actions.map(id => `<li>${BY_ID[id].label}${followText(id, moves[w].follow)}</li>`).join('') || '<li>No moves</li>'}</ul>${deployText(moves[w].orders)}</div>`).join('');
  $('log').innerHTML = logHTML(log);
  paintLadder($('ladder'), g.s); paintTracks($('tracks'), g.s, g.before); paintCaps($('caps'), g.s, g.player); paintTheatre(g.s); paintZones(g.s, seenIn(g.s));
  $('play').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  $('next').disabled = true;
  for (const w of ['cn', 'us', 'jp', 'tw']) await animateMoves(w, moves[w].actions, log);
  paintTheatre(g.s);
  $('next').disabled = false; $('next').focus();
});

const followText = (id, f) => { const a = BY_ID[id]; if (!a.follow) return ''; const o = answers(id, f?.[id]); return ' <span class="muted">(' + a.follow.map(q => q.opts.find(x => x.id === o[q.id]).label).join(', ') + ')</span>'; };
const deployText = o => { const m = (o?.moves || []).filter(x => x[2] > 0); return m.length ? `<p class="fine">Forces: ${m.map(([f, t, n]) => `${n} ${AREA_LABEL[f]} → ${AREA_LABEL[t]}`).join('; ')}</p>` : ''; };
const verb = { success: 'Success', partial: 'Partial', failure: 'Failed', blocked: 'Could not be carried out' };
function logHTML(log) {
  return log.map(l => {
    if (l.kind === 'note') return `<li class="note">${l.text}</li>`;
    if (l.kind === 'battle') return `<li class="note battle">${l.text.replace(/\b(CN|US|JP)\b/g, m => ({ CN: 'China', US: 'U.S.', JP: 'Japan' }[m]))}</li>`;
    if (l.kind === 'order') return l.who === g.player && !l.ok ? `<li style="--c:${COL[l.who]}">Your order ${l.text}</li>` : '';
    if (l.kind === 'force') return `<li style="--c:${COL[l.who]}">${COUNTRIES[l.who].short}: ${l.text}</li>`;
    if (l.kind === 'nukerisk') return `<li class="note">Nuclear risk this month: ${(l.p * 100).toFixed(1)}%.</li>`;
    if (l.kind === 'posture') return l.support ? `<li style="--c:${COL[l.who]}">${COUNTRIES[l.who].short} posture: ${POSTURES.find(p => p.id === l.posture).label}. <span class="fx">Home support ${l.support > 0 ? '+' : ''}${Math.round(l.support)}${l.who === g.player ? ' (your type’s cost)' : ''}</span></li>` : '';
    const a = BY_ID[l.id];
    const odds = l.status === 'blocked' ? l.reason : `odds ${Math.round(l.p * 100)}%, rolled ${Math.round(l.roll * 100)}${l.factors.length ? ' · ' + l.factors.map(([x, d]) => `${x} ${d > 0 ? '+' : ''}${d}`).join(' · ') : ''}`;
    return `<li style="--c:${COL[l.who]}"><b>${COUNTRIES[l.who].short}</b>: ${a.label}${followText(l.id, { [l.id]: l.o })}<span class="st ${l.status}">${verb[l.status]}</span><span class="fx">${odds}</span></li>`;
  }).join('');
}
$('next').addEventListener('click', () => {
  if (g.s.over) return finish();
  g.s = brief(g.s);
  g.choice = emptyChoice();
  show('play'); $('intel').hidden = $('feed').hidden = $('decide').hidden = false; paint();
  document.querySelectorAll('#tracks .k4-track').forEach(t => { if (t.querySelector('small')) flash(t); });
  $('play').scrollIntoView({ block: 'start' });
});

/* ---------- End ---------- */
function finish() {
  const s = g.s, me = g.player;
  history.replaceState(null, '', '#g=' + encode(s));
  show('end');
  $('end').style.setProperty('--c', COL[me]);
  $('end-k').textContent = `${COUNTRIES[me].name} · ${s.turn} month${s.turn === 1 ? '' : 's'}`;
  $('end-t').textContent = s.over.title;
  $('end-x').textContent = s.over.text;
  const sc = score(s, me, g.weights);
  $('total').textContent = sc.total;
  $('parts').innerHTML = sc.parts.map(p => `<tr><td>${p.label}</td><td class="num">${p.value}</td><td class="muted">weight ${p.weight}</td></tr>`).join('');
  $('types').innerHTML = IDS.map(w => `<div style="--c:${COL[w]}"><b>${COUNTRIES[w].short}</b>: ${P.typeLabel[s.types[w]]}${w === me ? ' (you)' : ''}</div>`).join('');
  paintBeliefChart($('beliefs'), g.series, me, s.types[me], ['Start', ...s.history.map(h => P.months[h.turn].slice(0, 3))]);
  $('end').focus();
  runBench(sc.total);
}
function runBench(total) {
  const start = { seed: g.s.seed, player: g.player, weights: g.weights, difficulty: g.difficulty, types: g.s.types };
  const runs = [], N = 60;
  $('pct').textContent = '…'; $('pct-x').textContent = 'comparing with the computer in your seat…';
  const tick = () => {
    runs.push(...benchmark({ ...start, seed: start.seed + runs.length * 101 }, 3));
    if (runs.length < N) { $('pct-x').textContent = `comparing with the computer in your seat… ${runs.length} of ${N}`; return setTimeout(tick, 0); }
    const pc = percentile(total, runs);
    $('pct').textContent = `${pc}%`;
    $('pct-x').textContent = `of ${N} computer games in your seat, with your type and your weights, scored below you`;
    pulse($('pct'));
  };
  setTimeout(tick, 30);
}
$('again').addEventListener('click', restart);
$('new-game').addEventListener('click', restart);
function restart() { g = null; pick = null; history.replaceState(null, '', location.pathname + location.search); paintSeats(); $('setup').hidden = true; show('start'); $('start').scrollIntoView({ block: 'start' }); }

$('copy-link').addEventListener('click', async e => {
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; } catch { e.target.textContent = 'Copy the address bar'; }
  setTimeout(() => { e.target.textContent = 'Copy link'; }, 1600);
});

/* ---------- Load: replay a shared link, or start fresh ---------- */
function load() {
  const m = location.hash.match(/#g=([^&]+)/);
  const d = m && decode(decodeURIComponent(m[1]));
  if (!d) { paintSeats(); show('start'); return; }
  begin(d);
  for (const mv of d.moves) {
    if (g.s.over) break;
    g.s = step(mv).next;
    if (!g.s.over) g.s = brief(g.s);
  }
  if (g.s.over) return finish();
  show('play'); paint();
}
load();
