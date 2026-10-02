// Four Capitals: start screen, the monthly decision, reveal and resolution, and the end-of-game debrief.
import { P } from '../data/params.js';
import { COUNTRIES, IDS, defaultWeights } from '../data/countries.js';
import { POSTURES, BY_ID, answers } from '../data/actions.js';
import { AREA_LABEL } from '../data/theater.js';
import { FBY, RES_LABEL } from '../data/formations.js';
import { newGame, brief, resolveTurn, snapshot, encode, decode, blockedWhy } from './engine.js';
import { updateControl } from './forces.js';
import { ledger } from './logistics.js';
import { createTour } from './tour.js';
import { paintDecide, wireDecide, emptyChoice } from './decide.js';
import { seeFor, paintFog, seenOrders } from './fog-panel.js';
import { sight } from './fog.js';
import { wireTips } from './tips.js';
import { initBeliefs, updateBeliefs, chooseMove, intelView, forumLearn } from './ai.js';
import { FORUM_ID, forumTo } from './forum.js';
import { askForum, forumText } from './forum-panel.js';
import { ceasefire } from './politics.js';
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
  const s0 = newGame({ ...start, human: true });
  g = { s: brief(s0), B: initBeliefs(), series: [], player: start.player, weights: start.weights, difficulty: start.difficulty, line: 'D', choice: emptyChoice() };
  g.series.push(g.B);
  document.body.style.setProperty('--c', COL[g.player]);
  drawTheatre($('theatre'));
}

/* ---------- Decide ---------- */
/** The map shows your planned deployment before you commit; rivals as you see them through the fog (js/fog.js). */
function paintPlan() {
  const t = (g.L || ledger(g.s, g.player, g.choice)).trial;
  updateControl(t);
  paintZones(t, seeFor(g.s, g.player, t));
}
function paint() {
  const s = g.s;
  $('month').textContent = monthName(s.turn);
  $('turnof').textContent = `month ${s.turn + 1} of ${P.turns}`;
  $('event').innerHTML = (s.event ? `<b>${s.event.title}</b>${s.event.text}` : '') + (ceasefire(s)
    ? `<span class="k4-cease"><b>Ceasefire this month</b> (the ${COUNTRIES[s.cease.from].capital}–${COUNTRIES[s.cease.to].capital} peace forum). Escalatory moves cost more at home; a successful escalatory military or law-enforcement move breaks it, at a heavy cost in credibility. If it holds, the crisis ends in a settlement.</span>` : '');
  paintLadder($('ladder'), s);
  paintTracks($('tracks'), s, g.before);
  paintCaps($('caps'), s, g.player);
  paintTheatre(s);
  const views = Object.fromEntries(IDS.filter(w => w !== g.player).map(w => [w, intelView(g.B, s, g.player, w)]));
  const theirs = Object.fromEntries(IDS.filter(w => w !== g.player).map(w => [w, intelView(g.B, s, w, g.player)]));
  paintIntel($('intel'), views, theirs, g.player);
  paintFeed();
  paintFog($('fog'), s, g.player);
  paintDecide(g);
  paintPlan();
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
/** Peace forums the computer capitals are calling, addressed to the player: [[caller, move id]]. */
const forumsToMe = moves => IDS.filter(w => w !== g.player && moves[w].actions.includes(FORUM_ID[w]) && forumTo(w, moves[w].follow?.[FORUM_ID[w]]) === g.player
  && !blockedWhy(g.s, FORUM_ID[w])).map(w => [w, FORUM_ID[w]]);
function step(playerMove, moves = computerMoves(g.s, g.B)) {
  moves[g.player] = playerMove;
  g.B = updateBeliefs(g.B, g.s, moves);
  g.before = snapshot(g.s);
  const res = resolveTurn(g.s, moves, { beliefs: g.B });
  g.B = forumLearn(g.B, res.log);                      // a forum's answer teaches the caller about the rival
  g.series.push(g.B);
  return { moves, log: res.log, next: res.state };
}
$('end-turn').addEventListener('click', async () => {
  if (!g || g.s.over || !$('resolve').hidden) return;
  const month = monthName(g.s.turn);
  const mine = JSON.parse(JSON.stringify(g.choice)), theirs = computerMoves(g.s, g.B);
  $('end-turn').disabled = true;
  for (const [w] of forumsToMe(theirs)) mine.reply = { ...(mine.reply || {}), [w]: await askForum(g.s, w, g.player, g.B) };
  $('end-turn').disabled = false;
  const { moves, log, next } = step(mine, theirs);
  g.s = next;
  show('play', 'resolve'); $('intel').hidden = $('feed').hidden = true; $('decide').hidden = true;
  $('res-t').textContent = `${month}: what happened`;
  $('reveal').innerHTML = IDS.map(w => `<div class="k4-mv" style="--c:${COL[w]}"><b>${COUNTRIES[w].short}${w === g.player ? ' (you)' : ''}</b><span class="po">${POSTURES.find(p => p.id === moves[w].posture).label}</span><ul>${moves[w].actions.map(id => `<li>${BY_ID[id].label}${followText(id, moves[w].follow)}</li>`).join('') || '<li>No moves</li>'}</ul>${deployText(w, moves[w].orders)}${emphText(w, moves[w], log)}</div>`).join('');
  $('log').innerHTML = logHTML(log);
  paintLadder($('ladder'), g.s); paintTracks($('tracks'), g.s, g.before); paintCaps($('caps'), g.s, g.player); paintTheatre(g.s); paintZones(g.s, seeFor(g.s, g.player)); paintFog($('fog'), g.s, g.player);
  $('play').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  $('next').disabled = true;
  for (const w of ['cn', 'us', 'jp', 'tw']) await animateMoves(w, moves[w].actions, log);
  paintTheatre(g.s);
  $('next').disabled = false; $('next').focus();
});

const followText = (id, f) => { const a = BY_ID[id]; if (!a.follow) return ''; const o = answers(id, f?.[id]); return ' <span class="muted">(' + a.follow.map(q => q.opts.find(x => x.id === o[q.id]).label).join(', ') + ')</span>'; };
/** Force orders as you saw them: rivals' through the fog. */
const deployText = (w, o) => { const m = seenOrders(g.s, g.player, w, o); return m.length ? `<p class="fine">Forces: ${m.join('; ')}</p>` : ''; };
/** China's landing coast shows once a landing or air-defence strike uses it; your own emphasis always shows to you. */
const emphText = (w, m, log) => {
  const used = w === 'cn' && log.some(l => l.who === 'cn' && (l.id === 'cn_landing' || (l.id === 'cn_strike' && l.o?.focus === 'airdef')) && l.status !== 'blocked');
  const e = m.orders?.emph;
  return e && (used || w === g.player) ? `<p class="fine">${w === 'cn' ? 'Landing' : w === 'tw' ? 'Reserve' : 'Fires'} emphasis: ${AREA_LABEL[e]}</p>` : '';
};
const verb = { success: 'Success', partial: 'Partial', failure: 'Failed', blocked: 'Could not be carried out' };
function logHTML(log) {
  return log.map(l => {
    if (l.kind === 'note') return `<li class="note">${l.text}</li>`;
    if (l.kind === 'battle') return `<li class="note battle">${l.text.replace(/\b(CN|US|JP|TW)\b/g, m => ({ CN: 'China', US: 'U.S.', JP: 'Japan', TW: 'Taiwan' }[m]))}</li>`;
    if (l.kind === 'order') return l.who === g.player && !l.ok ? `<li style="--c:${COL[l.who]}">Your order ${l.text}</li>` : '';
    if (l.kind === 'force') {
      if (l.short && l.who !== g.player) return '';
      const fogged = l.area && sight(g.s, g.player, l.who, l.area) !== 'exact';   // a rival's arrival you did not see clearly
      return `<li style="--c:${COL[l.who]}">${COUNTRIES[l.who].short}: ${fogged ? `a formation arrived in the ${AREA_LABEL[l.area]}` : l.text}</li>`;
    }
    if (l.kind === 'nukerisk') return `<li class="note">Nuclear risk this month: ${(l.p * 100).toFixed(1)}%.</li>`;
    if (l.forum && l.kind === 'action') return `<li style="--c:${COL[l.who]}" class="k4-forumli"><b>${COUNTRIES[l.who].short}</b>: Call for a peace forum → ${COUNTRIES[l.forum.to].capital}<span class="st ${l.status}">${l.forum.accepted ? 'Accepted' : 'Declined'}</span><span class="fx">${forumText(l, g.player)}</span></li>`;
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
  $('end-logi').innerHTML = endLogi(s, me);
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
function restart() { g = null; pick = null; $('old-link').hidden = true; history.replaceState(null, '', location.pathname + location.search); paintSeats(); $('setup').hidden = true; show('start'); $('start').scrollIntoView({ block: 'start' }); }

$('copy-link').addEventListener('click', async e => {
  try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; } catch { e.target.textContent = 'Copy the address bar'; }
  setTimeout(() => { e.target.textContent = 'Copy link'; }, 1600);
});

/** Debrief: your formations from start to finish, resources left, the months each resource held you back, and landings. */
function endLogi(s, me) {
  const fm = s.units[me].map(u => { const f = FBY[u.id]; return `<tr><th scope="row">${f.name}</th><td class="num">${f.str}</td><td class="num">${+u.str.toFixed(1)}</td><td class="num">${u.ready}</td><td>${u.at === 'transit' ? 'In transit' : AREA_LABEL[u.at]}</td></tr>`; }).join('');
  const b = s.binds[me], months = s.turn;
  const held = ['lift', 'fuel', 'mun', 'ready'].map(k => `${RES_LABEL[k]} ${b[k]} of ${months}`).join(' · ');
  const land = s.landings.length ? s.landings.map(l => `${P.months[l.turn]}: ${AREA_LABEL[l.sector].toLowerCase()}, ${l.m === 1 ? 'got ashore' : l.m === 0.5 ? 'a partial lodgement' : 'thrown back'}`).join('; ') : 'No landing was attempted.';
  return `<div class="k4-scroll"><table class="k4-parts k4-endf"><caption class="sr-only">Your formations at the end</caption><thead><tr><th scope="col">Formation</th><th scope="col">Start</th><th scope="col">End</th><th scope="col">Readiness</th><th scope="col">Where</th></tr></thead><tbody>${fm}</tbody></table></div>
    <p class="fine">Left at the end: fuel ${+s.res[me].fuel.toFixed(1)}, munitions ${+s.res[me].mun.toFixed(1)}. Months a resource held you back (an order or move you could not pay for, a stance that fell back, combat short of munitions, or a formation below 50 readiness): ${held}.</p>
    <p class="fine"><b>Landings:</b> ${land}</p>`;
}

/* ---------- Walkthrough ---------- */
const tour = createTour(() => {
  if (!g) { pick = pick || 'us'; paintSeats(); paintWeights(); $('setup').hidden = false; $('begin').click(); $('type-go').click(); }
  else if (g.s.over || !$('resolve').hidden) return false;
  return true;
});
$('tour-btn').addEventListener('click', () => tour.start());

/* ---------- Load: replay a shared link, or start fresh ---------- */
function load() {
  const m = location.hash.match(/#g=([^&]+)/);
  const d = m && decode(decodeURIComponent(m[1]));
  if (d && d.old) {
    $('old-link').hidden = false;
    $('old-link').textContent = 'That link is from an earlier version of Four Capitals (before domestic politics, base consent, the economic shock meter, U.S. reinforcement delays and the peace forum), so it cannot be replayed. Start a new game below.';
    history.replaceState(null, '', location.pathname + location.search);
  }
  if (!d || d.old) { paintSeats(); show('start'); return; }
  begin(d);
  for (const mv of d.moves) {
    if (g.s.over) break;
    g.s = step(mv).next;
    if (!g.s.over) g.s = brief(g.s);
  }
  if (g.s.over) return finish();
  show('play'); paint();
}
wireTips();
load();
