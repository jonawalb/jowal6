// Fog of Command: wires the engine, the map, the order bar, the report feed and the review together.
import { GAME, TYPES } from '../data/params.js';
import { NODES, NODE, NORTH } from '../data/map.js';
import { replay, issue, setStance, setFire, undoLast, advance, orderDelay, unit, where } from './engine.js';
import { beliefAt } from './vision.js';
import { redAI, blueAI } from './ai.js';
import { path, travelHours } from './graph.js';
import { createMap, render } from './map.js';
import { feedHTML, status, fireText, renderBelow, hhmm, NAME, DEF, foeOf } from './panel.js';
import { createAAR } from './aar.js';
import { createTour } from './tour.js';
import { readHash, writeHash } from './hash.js';

const $ = id => document.getElementById(id);
const newSeed = () => 1 + Math.floor(Math.random() * 999998);
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrowQ = matchMedia('(max-width: 640px)');

let g = null, me = 'blue', sel = null, view = 'belief', aarHour = null;
let map = createMap($('map'), onSector, onSectorKey, narrowQ.matches);

const say = html => { $('say').innerHTML = html; };
const mineUnits = () => g.units.filter(u => u.side === me);
const pending = u => g.orders.find(o => o.unit === u.id && !o.done && !o.cancelled);

function start(side, seed, log = [], n = 0) {
  me = side;
  const players = me === 'blue' ? { blue: null, red: redAI() } : { red: null, blue: blueAI() };
  g = replay({ seed, players }, log, n);
  sel = null; view = 'belief'; aarHour = null;
  $('start').hidden = true;
  $('bar').hidden = false;
  document.body.dataset.side = me;
  document.body.classList.toggle('fc-over', !!g.over);
  $('viewbar').hidden = true;
  setView('belief');
  if (g.over) finish(false);
  else {
    aar.hide();
    say(g.t ? `Game resumed at ${hhmm(g.t)}.` : me === 'blue'
      ? '06:00. Red will enter from the north. Your recon is forward in Alder Woods and Millfield; your reserve waits behind the line.'
      : '06:00. Your recon arrives now; the first echelon arrives at 07:00 and the second at 11:00. Pick a waiting unit and click a north sector to choose where it enters.');
  }
  writeHash(g, me);
  draw();
}

function showStart() {
  aar.hide();
  g = null; sel = null;
  $('start').hidden = false;
  $('bar').hidden = true;
  $('viewbar').hidden = true;
  document.body.classList.remove('fc-over');
  delete document.body.dataset.side;
  history.replaceState(null, '', location.pathname + location.search);
  render(map, { me: 'blue', units: [], pic: { tracks: [], marks: [] }, mode: 'belief' });
  $('st-t').textContent = 'Fog of Command';
  $('st-s').textContent = 'Choose a side to start.';
  $('status').dataset.s = 'warn';
  $('feed').innerHTML = '<li class="muted">Reports appear here once the game starts.</li>';
  $('start').querySelector('button').focus({ preventScroll: true });
}

const unitStatus = u => {
  if (u.broken || u.node === 'gone') return 'broken';
  if (u.type === 'arty') return g.fire[me][g.t] ? `fired on ${NAME[g.fire[me][g.t]]}` : 'ready to fire';
  if (u.node === 'off') return `arrives ${hhmm(u.arrive)} at ${NAME[u.entry]}`;
  const o = pending(u);
  if (o) return `to ${NAME[o.dest]}, starts ${o.due > g.t ? 'next hour' : 'this hour'}`;
  if (u.seg || u.route.length) return `moving to ${NAME[u.route.length ? u.route[u.route.length - 1] : u.seg.to]}`;
  return NAME[u.node];
};

function unitButtons() {
  $('units').innerHTML = mineUnits().map(u => {
    const f = u.str0 ? u.str / u.str0 : 1;
    const dead = u.broken || u.node === 'gone';
    return `<button type="button" data-u="${u.id}" class="${u.type === 'arty' ? 'fc-arty' : ''}${u.stance === 'give' ? ' give' : ''}" aria-pressed="${sel === u.id}" ${dead || g.over ? 'disabled' : ''}>
      <b>${u.key ? `<span class="fc-key">${u.key.toUpperCase()}</span>` : ''}${u.short}</b><small>${unitStatus(u)}${u.stance === 'give' && !dead ? ' · gives ground' : ''}</small>
      ${u.str0 ? `<span class="fc-ub" aria-hidden="true"><i style="width:${(100 * f).toFixed(0)}%"></i></span>` : ''}</button>`;
  }).join('');
}

function selPanel() {
  const box = $('sel');
  if (!g || g.over) { box.innerHTML = ''; return; }
  const u = sel && unit(g, sel);
  if (!u) { box.innerHTML = '<span class="muted">Pick a unit, then click the sector where it should go. Or press A and click a sector to fire.</span>'; return; }
  if (u.type === 'arty') {
    const f = g.fires.find(x => x.t === g.t && x.side === me);
    box.innerHTML = f ? `<b>Artillery</b> has fired this hour. ${fireText(g, f)}` : '<b>Artillery</b>: click a sector to fire now. A recon troop next to the target shows exactly what is hit; one inside it may be hit.';
    return;
  }
  const info = `<b>${u.name}</b> · ${TYPES[u.type].label.toLowerCase()} · ${u.str0 ? `strength ${u.str.toFixed(1)} of ${u.str0}` : 'no combat strength'}`;
  const where_ = u.node === 'off' ? `Arrives ${hhmm(u.arrive)} at <b>${NAME[u.entry]}</b>. Click a north sector to change where it enters.` : `At ${NAME[where(u)] || 'the front'}. Click a sector to send it there.`;
  const stance = u.type === 'decoy' ? '<span class="muted">The decoy cannot fight; enemy units next door see it as a tank battalion until they share its sector or watch it under fire.</span>'
    : `<span class="fc-stance" role="group" aria-label="Standing order"><button type="button" class="btn" data-stance="hold" aria-pressed="${u.stance !== 'give'}">Hold</button><button type="button" class="btn" data-stance="give" aria-pressed="${u.stance === 'give'}">Give ground</button></span>`;
  box.innerHTML = `<span>${info}. ${where_}</span> ${stance}`;
}

function routes() {
  const out = [];
  for (const u of mineUnits()) {
    if (u.broken || u.type === 'arty' || u.node === 'off' || u.node === 'gone') continue;
    const o = pending(u);
    if (o) { const from = where(u); out.push({ unit: u.id, path: [from, ...path(from, o.dest)], pending: true }); continue; }
    if (u.seg) out.push({ unit: u.id, path: [u.seg.from, u.seg.to, ...u.route], pending: false });
    else if (u.route.length) out.push({ unit: u.id, path: [u.node, ...u.route], pending: false });
  }
  return out;
}

function liveView() {
  const foe = foeOf(me);
  return {
    me, units: g.units, pic: beliefAt(g, me, g.t), mode: 'belief', routes: routes(), selected: sel,
    target: g.fire[me][g.t] || null,
    hits: g.fires.filter(f => f.t === g.t && f.side === foe && f.hits.some(x => DEF[x.unit].side === me)).map(f => f.node),
    fights: g.fights.filter(f => f.t === g.t - 1).map(f => f.node),
  };
}

function draw() {
  if (!g) return;
  if (!g.over) render(map, liveView());
  const st = status(g, me, beliefAt(g, me, g.t));
  $('status').dataset.s = st.s; $('st-t').textContent = st.t; $('st-s').textContent = st.sub;
  $('feed').innerHTML = feedHTML(g, me);
  unitButtons();
  selPanel();
  $('clock').textContent = hhmm(g.t);
  $('hourof').textContent = g.over ? 'game over' : `hour ${g.t + 1} of ${GAME.hours}`;
  $('mission').textContent = me === 'blue' ? 'Defending: hold Tarn Crossing until 22:00' : 'Attacking: take Tarn Crossing by 22:00';
  const d = orderDelay(g, me);
  $('delay').innerHTML = g.over ? '' : d ? '<b>Orders this hour start next hour</b>' : 'Orders this hour start now';
  $('delay').classList.toggle('late', !!d && !g.over);
  $('undo').disabled = !!g.over || !g.log.some(a => a.t === g.t && a.kind !== 'f');
  $('end').disabled = !!g.over;
  $('bar').classList.toggle('done', !!g.over);
  for (const n of NODES) map.nodes[n.id].classList.toggle('sel-can', !g.over && !!sel);
}

function select(id) {
  const u = id && unit(g, id);
  if (!u || u.broken || u.node === 'gone' || g.over) { sel = null; draw(); return; }
  sel = sel === id ? null : id;
  draw();
}

function onSector(node) {
  if (!g || g.over) return;
  if (!sel) {
    // Nothing selected: pick (and cycle through) your units in that sector.
    const here = mineUnits().filter(u => !u.broken && u.type !== 'arty' && (u.node === node || (u.seg && u.seg.from === node)));
    if (!here.length) { say(`No unit of yours in ${NAME[node]}. Pick a unit first (keys 1–9), or press A to fire there.`); return; }
    sel = here[0].id; draw(); return;
  }
  const u = unit(g, sel);
  if (u.type === 'arty') {
    if (g.fire[me][g.t]) { say('Your artillery has already fired this hour.'); return; }
    const f = setFire(g, me, node);
    if (f) say(fireText(g, f));
    sel = null;
  } else if (u.node === 'off') {
    if (!NORTH.includes(node)) { say(`${u.short} has not arrived yet. It can only enter through a north sector.`); return; }
    issue(g, u.id, node);
    say(`${u.short} will enter at <b>${NAME[node]}</b> at ${hhmm(u.arrive)}.`);
    sel = null;
  } else {
    const from = where(u);
    if (from === node && !pending(u) && !u.route.length && !u.seg) { say(`${u.short} is already in ${NAME[node]}.`); return; }
    const o = issue(g, u.id, node);
    if (!o) return;
    const hrs = travelHours(from, node);
    say(`Order sent: <b>${u.short}</b> to <b>${NAME[node]}</b>. It starts ${o.d ? 'next hour' : 'now'}; the move takes about ${hrs} hour${hrs === 1 ? '' : 's'}.`);
    sel = null;
  }
  writeHash(g, me);
  draw();
}

/** Keyboard on a sector: Enter/Space acts, arrow keys move between sectors. */
function onSectorKey(e, id) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSector(id); return; }
  const n = NODE[id];
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!d) return;
  e.preventDefault();
  let to = null;
  if (id === 'x') to = d[1] < 0 ? 's1' : null;
  else if (n.row === 3 && d[1] > 0) to = 'x';
  else to = NODES.find(m => m.id !== 'x' && m.col === n.col + d[0] && m.row === n.row + d[1])?.id;
  if (to) map.nodes[to].focus();
}

function endHour() {
  if (!g || g.over) return;
  sel = null;
  const t0 = g.t;
  advance(g);
  const fights = g.fights.filter(f => f.t === t0).length;
  say(`<b>${hhmm(g.t)}.</b> ${fights ? `Fighting in ${fights} sector${fights > 1 ? 's' : ''}. ` : ''}New reports are on the ${narrowQ.matches ? 'page below the map' : 'right'}.`);
  writeHash(g, me);
  if (g.over) finish(true); else draw();
}

function finish(scroll) {
  document.body.classList.add('fc-over');
  $('viewbar').hidden = false;
  say(g.over.winner === me ? 'You won. The review is below the map.' : 'You lost. The review is below the map.');
  draw();
  aar.show(g, me);
  if (scroll) $('aar').scrollIntoView({ block: 'nearest', behavior: reduce() ? 'auto' : 'smooth' });
}

function reviewAt(h) {
  aarHour = h;
  const s = g.snaps[h];
  if (!s) return;
  const units = s.units.map(x => ({ ...DEF[x.id], ...x, str0: TYPES[DEF[x.id].type].str }));
  const truthPic = { tracks: units.filter(u => u.side !== me && !u.broken && NODE[u.node || (u.seg && u.seg.from)]).map(u => ({ elem: u.id, node: u.node || u.seg.from, type: u.type, str: u.str, est: u.str, hp: u.str0 ? u.str / u.str0 : 0, exact: true, age: 0 })), marks: [] };
  render(map, {
    me, units, pic: view === 'truth' ? truthPic : beliefAt(g, me, h), mode: view, routes: [], selected: null,
    target: g.fire[me][h] || null, hits: [], fights: g.fights.filter(f => f.t === h - 1).map(f => f.node),
  });
}

function setView(v) {
  view = v;
  document.querySelectorAll('#viewbar [data-view]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.view === v)));
  if (g && g.over && aarHour !== null) reviewAt(aarHour);
}

const aar = createAAR({ onHour: reviewAt, onAgain: () => start(me, g.seed), onNew: showStart });

document.querySelectorAll('#viewbar [data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
document.querySelectorAll('.fc-side').forEach(b => b.addEventListener('click', () => start(b.dataset.side, newSeed())));
$('units').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) select(b.dataset.u); });
$('sel').addEventListener('click', e => {
  const b = e.target.closest('[data-stance]');
  if (!b || !sel) return;
  setStance(g, sel, b.dataset.stance);
  say(b.dataset.stance === 'give' ? `${unit(g, sel).short} will give ground: it falls back one sector if a stronger enemy attacks it.` : `${unit(g, sel).short} will hold and fight.`);
  writeHash(g, me); draw();
});
$('end').onclick = endHour;
$('undo').onclick = () => { const a = undoLast(g); if (a) { say(`Withdrawn: the last ${a.kind === 's' ? 'standing order' : 'order'} to ${DEF[a.unit].short}.`); writeHash(g, me); draw(); } };
$('new-game').onclick = showStart;
$('copy-link').onclick = async () => {
  if (g) writeHash(g, me);
  try { await navigator.clipboard.writeText(location.href); say('Link copied. It replays this game exactly.'); } catch { say('Copy the address bar to share this game.'); }
};

document.addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (!g || g.over || tour.open) return;
  const k = e.key.toLowerCase();
  const u = mineUnits().find(x => x.key && x.key === k);
  if (u) { select(u.id); return; }
  if (k === 'g' && sel) { const s = unit(g, sel); if (s.type !== 'arty' && s.type !== 'decoy') { setStance(g, sel, s.stance === 'give' ? 'hold' : 'give'); writeHash(g, me); draw(); } }
  else if (k === 'n') endHour();
  else if (k === 'u') $('undo').click();
  else if (k === 'escape') { sel = null; draw(); }
  else if (k === ']' || k === '[') {
    const list = mineUnits().filter(x => !x.broken && x.node !== 'gone');
    const i = list.findIndex(x => x.id === sel);
    select(list[(i + (k === ']' ? 1 : list.length - 1) + (i < 0 && k === '[' ? 1 : 0)) % list.length].id);
  }
});

const tour = createTour($('tour'));
$('start-tour').onclick = () => { if (!g) start('blue', newSeed()); tour.start(); };
narrowQ.addEventListener('change', () => {
  map = createMap($('map'), onSector, onSectorKey, narrowQ.matches);
  if (!g) render(map, { me: 'blue', units: [], pic: { tracks: [], marks: [] }, mode: 'belief' });
  else if (g.over && aarHour !== null) reviewAt(aarHour); else draw();
});
$('quotes').addEventListener('click', e => {
  const a = e.target.closest('a[href^="#src-"]');
  if (!a) return;
  e.preventDefault();
  document.querySelector(a.getAttribute('href'))?.scrollIntoView({ block: 'center' });
});

renderBelow($);
const boot = () => { const h = readHash(); if (h.seed && h.me) start(h.me, h.seed, h.log, h.n); else showStart(); };
window.addEventListener('hashchange', () => { if (location.hash.includes('s=')) boot(); });
boot();
