// Fog of Command: wires the engine, the map, the order bar, the report feed and the review together.
import { GAME, TYPES, FORCES, ARTILLERY, OFFDEF, COMBAT } from '../data/params.js';
import { NODES, NODE, NORTH } from '../data/map.js';
import { replay, issue, setStance, setFire, undoLast, advance, orderDelay, delaySince, unit, where } from './engine.js';
import { beliefAt } from './vision.js';
import { redAI, blueAI } from './ai.js';
import { path, travelHours } from './graph.js';
import { createMap, render } from './map.js';
import { feedHTML, status, fireText, fireTag, renderBelow, hhmm, NAME, DEF, foeOf, waveText, endTime, secondPick, odWords, odFor } from './panel.js';
import { tilt } from './combat.js';
import { createAAR } from './aar.js';
import { lessonSteps, LESSON_SEED, SHEET } from './lesson.js';
import { learnButton, runLesson } from '../../../shared/js/learn.js';
import { readHash, writeHash } from './hash.js';
import { snap, slide, shell, spot, contacts, lift } from './fx.js';
import { pulse, shake, flash } from '../../../shared/js/motion.js';

const $ = id => document.getElementById(id);
const newSeed = () => 1 + Math.floor(Math.random() * 999998);
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrowQ = matchMedia('(max-width: 640px)');
const CLOCK = '<svg class="fc-bclk" viewBox="-8 -8 16 16" aria-hidden="true"><circle r="6.5"/><path d="M0 -3.8V0L2.8 1.8"/></svg>';

let g = null, me = 'blue', sel = null, prevSel = null, view = 'belief', aarHour = null, tab = 'map';
const openHours = new Set();
const handlers = { onSector, onKey: onSectorKey, onUnit, onArty };
let map = createMap($('map'), handlers, narrowQ.matches, false);
const remap = () => { map = createMap($('map'), handlers, narrowQ.matches, !!g && me === 'red'); };

const say = html => { $('say').innerHTML = html; };
const mineUnits = () => g.units.filter(u => u.side === me);
const pending = u => g.orders.find(o => o.unit === u.id && !o.done && !o.cancelled);
const artyId = () => mineUnits().find(u => u.type === 'arty').id;
const armed = () => !!g && !!sel && unit(g, sel)?.type === 'arty' && !g.fire[me][g.t];
const alive = u => !u.broken && u.node !== 'gone';

/** Fill every on-page time and turn count from the parameters. */
function fillText() {
  const kAt = v => (COMBAT.k.prepared * tilt(v)).toFixed(1), rAt = v => Math.sqrt(COMBAT.k.prepared * tilt(v)).toFixed(1);
  const f = { end: endTime(), turns: `${GAME.hours} one-hour turns (${hhmm(0)} to ${endTime()})`, waves: waveText(), pick: hhmm(secondPick()), arty: `${Math.round(ARTILLERY.frac * 100)}%`,
    odstep: `${OFFDEF.step}`, odk0: kAt(OFFDEF.min), odr0: rAt(OFFDEF.min), odk10: kAt(OFFDEF.max), odr10: rAt(OFFDEF.max) };
  document.querySelectorAll('[data-fill]').forEach(n => { n.textContent = f[n.dataset.fill]; });
}

/** "1–9, 0, T and W": the keys that pick your units. */
function keyList(side) {
  const ks = FORCES[side].filter(d => d.type !== 'arty' && d.key).map(d => d.key.toUpperCase());
  const digits = ks.filter(k => /[1-9]/.test(k)).map(Number).sort((a, b) => a - b), rest = ks.filter(k => !/[1-9]/.test(k));
  const parts = [digits.length > 2 ? `${digits[0]}–${digits[digits.length - 1]}` : digits.join(', '), ...rest].filter(Boolean);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
}
const keysHint = side => `Keys: <b>${keyList(side)}</b> pick a unit (the key is on each unit), <b>A</b> artillery, <b>G</b> give ground or hold, <b>Tab</b> and <b>Enter</b> or the arrow keys for sectors, <b>N</b> ends the hour, <b>U</b> undoes, <b>Esc</b> clears.`;

// Shown at the start of every game: how Red's decoy works, or a warning that Red has one.
const DECOY_TIP = {
  red: '<b>You have a decoy (unit 8, Decoy Group).</b> It has no combat strength, but Blue sees it as a full tank battalion from the next sector, and Blue\'s recon hear it as one from two sectors away. Send it down a road away from your main attack and keep it two sectors from Blue\'s recon: heard, never looked at. If a Blue unit enters its sector, or Blue fires on it while a Blue recon troop watches, it is exposed. Done right, Blue sends its reserve the wrong way.',
  blue: '<b>Warning: Red has a decoy.</b> One of the "tank battalions" you see or hear may be a Decoy Group with no strength at all, sent to pull your one reserve down the wrong road. Before you commit the reserve, check the road: fire artillery on it while a recon troop watches. A tank that takes no damage is the decoy.',
};

/** The offense-defense slider (start screen): its value, and its words, which update as it moves. */
const odVal = () => Math.max(OFFDEF.min, Math.min(OFFDEF.max, Math.round(Number($('od').value)) || 0));
const odTag = v => `Balance: ${v} (${odWords(v).label})`;
function odShow() {
  const v = odVal(), w = odWords(v);
  $('od-out').textContent = `${v} — ${w.label}`;
  $('od').setAttribute('aria-valuetext', `${v}, ${w.label}`);
  $('od-desc').textContent = v === OFFDEF.standard ? `Standard: ${w.what}. Lower favors whoever defends a sector; higher favors whoever attacks.`
    : `${w.label[0].toUpperCase()}${w.label.slice(1)}: ${w.what}. Defending, this is ${odFor(v, 'blue')} for you; attacking, ${odFor(v, 'red')}.`;
  document.querySelectorAll('[data-odfx]').forEach(n => {
    const e = odFor(v, n.dataset.odfx);
    n.textContent = e ? `Balance ${v}: ${e} for you` : 'Standard balance';
    n.dataset.e = e || '';
  });
}

/** Start (or reload) a game. od: the offense-defense balance (OFFDEF); note: a line to show once it has loaded. */
function start(side, seed, log = [], n = 0, od = odVal(), note = '') {
  me = side;
  const players = me === 'blue' ? { blue: null, red: redAI() } : { red: null, blue: blueAI() };
  g = replay({ seed, od, players }, log, n);
  $('od').value = od; odShow();
  if (map.flip !== (me === 'red')) remap();
  sel = null; prevSel = null; view = 'belief'; aarHour = null; openHours.clear();
  $('start').hidden = true;
  $('bar').hidden = false;
  $('ucol').hidden = false;
  document.body.dataset.side = me;
  document.body.classList.toggle('fc-over', !!g.over);
  $('viewbar').hidden = true;
  $('keys').innerHTML = keysHint(me);
  $('decoytip-text').innerHTML = DECOY_TIP[me];
  $('decoytip').hidden = !!g.over;
  placeDecoyTip();
  setTab('map');
  setView('belief');
  if (g.over) finish(false, note);
  else {
    aar.hide();
    say(g.t ? `Game resumed at ${hhmm(g.t)}.` : narrowQ.matches ? (me === 'blue'
      ? `06:00. Hold Tarn Crossing until ${endTime()}. Red enters at the top. Tap a unit, then the sector where it should go.`
      : `06:00. Take Tarn Crossing by ${endTime()}. Your units wait in the tray at the bottom: tap one, then a sector on your entry edge, to choose where it enters.`)
      : me === 'blue'
      ? `06:00. Hold Tarn Crossing until ${endTime()}. Red enters from the north, at the top. Your recon troops are forward in Alder Woods and Millfield, set to give ground so they fall back rather than die; your reserve waits behind the line.`
      : `06:00. Take Tarn Crossing by ${endTime()}. Your entry edge is at the bottom of the map. Arrivals: ${waveText()}. Units not yet on the map wait in the staging tray below the entry edge; dashed markers show where each will enter. To change an entry, click a unit in the tray, then a sector on your entry edge.`);
    if (note) say(`${note} ${$('say').innerHTML}`);
  }
  writeHash(g, me);
  draw();
  if (!g.over) $('play').scrollIntoView({ block: 'start', behavior: 'auto' });
}

function showStart() {
  aar.hide();
  g = null; sel = null; prevSel = null;
  if (map.flip) remap();
  $('start').hidden = false;
  $('bar').hidden = true;
  $('ucol').hidden = true;
  $('viewbar').hidden = true;
  say('');
  document.body.classList.remove('fc-over', 'fc-live', 'fc-armed');
  delete document.body.dataset.side;
  history.replaceState(null, '', location.pathname + location.search);
  render(map, { me: 'blue', units: [], pic: { tracks: [], marks: [] }, mode: 'belief' });
  $('st-t').textContent = 'Fog of Command';
  $('st-s').textContent = 'Choose a side to start.';
  $('status').dataset.s = 'warn';
  $('feed').innerHTML = '<li class="muted">Reports appear here once the game starts.</li>';
  $('start').querySelector('button').focus({ preventScroll: true });
}

/** Why a unit is waiting for orders: its last order was cancelled by contact and none has been given since. */
function idleReason(u) {
  if (!alive(u) || u.seg || u.route.length || pending(u)) return null;
  const h = [...g.events].reverse().find(e => e.kind === 'halt' && e.unit === u.id);
  if (!h || g.orders.some(o => o.unit === u.id && o.t > h.t)) return null;
  return `halted at ${NAME[h.node]} (contact); order to ${NAME[h.dest]} cancelled`;
}

const unitStatus = u => {
  if (u.broken || u.node === 'gone') return 'broken';
  if (u.type === 'arty') return g.over ? 'fixed' : g.fire[me][g.t] ? `fired on ${NAME[g.fire[me][g.t]]}` : armed() ? 'armed: click a sector' : 'ready to fire';
  if (g.over) return NAME[where(u)] || 'on the move';
  if (u.node === 'off') return `enters ${NAME[u.entry]} at ${hhmm(u.arrive)}`;
  const o = pending(u);
  if (o) return o.due > g.t ? `to ${NAME[o.dest]} · ordered ${hhmm(o.t)}, starts ${hhmm(o.due)}` : `to ${NAME[o.dest]}, starts now`;
  if (u.seg || u.route.length) return `moving to ${NAME[u.route.length ? u.route[u.route.length - 1] : u.seg.to]}`;
  const why = idleReason(u);
  return why ? `Needs orders: ${why}` : `${NAME[u.node]}${u.stance === 'give' ? ' · gives ground' : ''}`;
};
const lateIds = () => mineUnits().filter(u => { const o = pending(u); return o && o.due > g.t; }).map(u => u.id);

function unitButtons() {
  const late = new Set(g.over ? [] : lateIds());
  $('units').innerHTML = mineUnits().map(u => {
    const f = u.str0 ? u.str / u.str0 : 1;
    const dead = !alive(u);
    const idle = !g.over && idleReason(u);
    return `<button type="button" data-u="${u.id}" class="${u.type === 'arty' ? 'fc-arty' : ''}${u.stance === 'give' ? ' give' : ''}${idle ? ' idle' : ''}" aria-pressed="${sel === u.id}" ${dead || g.over ? 'disabled' : ''}>
      <span class="fc-key">${(u.key || '').toUpperCase()}</span><b>${u.short}${late.has(u.id) ? CLOCK : ''}</b><small class="${idle ? 'warn' : ''}" title="${unitStatus(u)}">${unitStatus(u)}</small>
      ${u.str0 ? `<span class="fc-ub" aria-hidden="true"><i style="width:${(100 * f).toFixed(0)}%"></i></span>` : ''}</button>`;
  }).join('');
}

function selPanel() {
  const box = $('sel');
  if (!g || g.over) { box.innerHTML = ''; return; }
  const u = sel && unit(g, sel);
  if (!u) { box.innerHTML = `<span class="muted">Pick a unit (in this list, on the map, or by its key), then click the sector where it should go. Or press A and click a sector to fire.</span>`; return; }
  if (u.type === 'arty') {
    const f = g.fires.find(x => x.t === g.t && x.side === me);
    box.innerHTML = f ? `<span><b>Artillery</b> has fired this hour. ${fireText(g, f)}</span>` : '<span><b>Artillery armed.</b> Click a sector on the map to fire. A recon troop next to the target shows exactly what is hit; one inside it may be hit. Esc cancels.</span>';
    return;
  }
  const info = `<b>${u.name}</b> · ${TYPES[u.type].label.toLowerCase()} · ${u.str0 ? `strength ${u.str.toFixed(1)} of ${u.str0}` : 'no combat strength'}`;
  const where_ = u.node === 'off' ? `Enters at <b>${NAME[u.entry]}</b> at ${hhmm(u.arrive)}. Click a sector on your entry edge to change where.` : `At ${NAME[where(u)] || 'the front'}. Click a sector to send it there.`;
  const recon = u.type === 'recon' && u.stance === 'give' ? ' <span class="muted">Recon troops start set to give ground, so they fall back from a stronger enemy instead of being destroyed. Choose Hold to make one stand.</span>' : '';
  const stance = u.type === 'decoy' ? '<span class="muted">The decoy cannot fight; enemy units next door see it as a tank battalion until they share its sector or watch it under fire, and enemy recon two sectors away hear it as one at once. Keep it two sectors from Blue\'s recon: heard, never watched.</span>'
    : `<span class="fc-stance" role="group" aria-label="Standing order (key G)"><button type="button" class="btn" data-stance="hold" aria-pressed="${u.stance !== 'give'}">Hold</button><button type="button" class="btn" data-stance="give" aria-pressed="${u.stance === 'give'}">Give ground</button></span>`;
  box.innerHTML = `<span>${info}. ${where_}${recon}</span> ${stance}`;
}

function routes() {
  const out = [];
  for (const u of mineUnits()) {
    if (u.broken || u.type === 'arty' || u.node === 'off' || u.node === 'gone') continue;
    const o = pending(u);
    if (o) { const from = where(u); out.push({ unit: u.id, path: [from, ...path(from, o.dest)], pending: o.due > g.t }); continue; }
    if (u.seg) out.push({ unit: u.id, path: [u.seg.from, u.seg.to, ...u.route], pending: false });
    else if (u.route.length) out.push({ unit: u.id, path: [u.node, ...u.route], pending: false });
  }
  return out;
}

function liveView() {
  const foe = foeOf(me);
  const f = g.fires.find(x => x.t === g.t && x.side === me);
  return {
    me, units: g.units, pic: beliefAt(g, me, g.t), mode: 'belief', live: true, routes: routes(), selected: sel,
    target: g.fire[me][g.t] || null, fireTag: f ? fireTag(g, f) : null,
    hits: g.fires.filter(x => x.t === g.t && x.side === foe && x.hits.some(h => DEF[h.unit].side === me)).map(x => x.node),
    fights: g.fights.filter(x => x.t === g.t - 1).map(x => x.node),
    late: lateIds(), idle: Object.fromEntries(mineUnits().map(u => [u.id, idleReason(u)]).filter(([, r]) => r)),
  };
}

function draw() {
  if (!g) return;
  if (!g.over) render(map, liveView());
  const st = status(g, me, beliefAt(g, me, g.t));
  $('status').dataset.s = st.s; $('st-t').textContent = st.t; $('st-s').textContent = st.sub;
  $('feed').innerHTML = feedHTML(g, me, openHours);
  unitButtons();
  selPanel();
  $('clock').textContent = hhmm(g.t);
  $('hourof').textContent = g.over ? 'game over' : `hour ${g.t + 1} of ${GAME.hours}`;
  $('mission').textContent = `${me === 'blue' ? `Defending: hold Tarn Crossing until ${endTime()}` : `Attacking: take Tarn Crossing by ${endTime()}`}${g.od === OFFDEF.standard ? '' : ` · ${odTag(g.od).toLowerCase()}`}`;
  const d = !g.over && orderDelay(g, me);
  $('delay').textContent = g.over ? '' : d ? 'Orders start next hour' : 'Orders start now';
  $('delay').classList.toggle('late', !!d);
  const since = d ? delaySince(g, me) : null;
  $('late').hidden = !d;
  if (d) $('late').innerHTML = `${CLOCK}<span><b>Orders are running late.</b> Moves you order this hour start next hour, at ${hhmm(g.t + 1)}${since < g.t ? `; orders have been late since ${hhmm(since)}` : ''}. <span class="fc-wide">Artillery, entry sectors and hold or give ground still act at once.</span></span>`;
  $('undo').disabled = !!g.over || !g.log.some(a => a.t === g.t && a.kind !== 'f');
  $('end').disabled = !!g.over;
  $('bar').classList.toggle('done', !!g.over);
  document.body.classList.toggle('fc-live', !g.over);
  document.body.classList.toggle('fc-armed', armed());
  const su = sel && unit(g, sel);
  for (const n of NODES) map.nodes[n.id].classList.toggle('sel-can', !g.over && !!su && (su.node !== 'off' || NORTH.includes(n.id)));
}

function select(id, quiet = false) {
  const u = id && unit(g, id);
  if (!u || !alive(u) || g.over) { sel = null; prevSel = null; draw(); return; }
  if (u.type === 'arty') { arm(); return; }
  prevSel = null;
  sel = sel === id && !quiet ? null : id;
  if (sel && !quiet) {
    say(u.node === 'off' ? `<b>${u.short}</b> picked. It enters at ${NAME[u.entry]} at ${hhmm(u.arrive)}: click a sector on your entry edge to change where.`
      : `<b>${u.short}</b> picked, at ${NAME[where(u)] || 'the front'}. Click the sector where it should go.`);
    if (narrowQ.matches && tab === 'units') setTab('map');
  }
  draw();
}

/** Arm (or disarm) a fire mission. The unit you had selected comes back after the mission is fired. */
function arm() {
  const id = artyId();
  if (sel === id) { sel = prevSel; prevSel = null; say('Fire mission cancelled.'); draw(); return; }
  if (g.fire[me][g.t]) { say('Your artillery has already fired this hour.'); return; }
  prevSel = sel; sel = id;
  say(`<b>Artillery armed.</b> Click the sector to fire on (the cursor is a crosshair). Esc or A again cancels.${prevSel ? ` ${unit(g, prevSel).short} stays picked after the mission.` : ''}`);
  if (narrowQ.matches && tab !== 'map') setTab('map');
  draw();
}

/** Your units in a sector, in the order the map draws them. */
const stackAt = node => mineUnits().filter(u => alive(u) && u.type !== 'arty' && u.node !== 'off' && (u.node === node || (u.seg && u.seg.from === node)));

/** A click on one of your unit icons (node: its sector), or on a ghost marker (group: the staged units). */
function onUnit(id, node, group = null) {
  if (!g || g.over) return;
  if (armed() && node) { onSector(node); return; }
  // A unit is already picked and the click lands on another group's entry marker: that is an order to that
  // sector (the markers fill most of an entry sector on a phone), not a request to pick the group.
  if (group && sel && !group.includes(sel) && NODE[node]) { onSector(node); return; }
  if (group) { const i = group.indexOf(sel); select(group[(i + 1) % group.length], true); cycleSay(group, i + 1); return; }
  if (sel === id && node) {
    const st = stackAt(node);
    if (st.length > 1) { const i = st.findIndex(u => u.id === id); select(st[(i + 1) % st.length].id, true); cycleSay(st.map(u => u.id), i + 1); return; }
  }
  select(id, true);
  const u = unit(g, id);
  if (u) say(u.node === 'off' ? `<b>${u.short}</b> picked. It enters at ${NAME[u.entry]} at ${hhmm(u.arrive)}: click a sector on your entry edge to change where.`
    : `<b>${u.short}</b> picked${stackAt(node || where(u)).length > 1 ? ' (click it again for the next unit here)' : ''}. Click the sector where it should go.`);
}
function cycleSay(ids, i) {
  const u = unit(g, ids[i % ids.length]);
  say(`<b>${u.short}</b> picked (${(i % ids.length) + 1} of ${ids.length} here; click again for the next). ${u.node === 'off' ? 'Click a sector on your entry edge to change where it enters.' : 'Click the sector where it should go.'}`);
}

function onSector(node) {
  if (!g || g.over) return;
  if (!sel) {
    // Nothing selected: pick (and, on later clicks, cycle through) your units in that sector.
    const here = stackAt(node);
    const staged = mineUnits().filter(u => u.node === 'off' && alive(u) && u.entry === node);
    const all = [...here, ...staged].map(u => u.id);
    if (!all.length) { say(`No unit of yours in ${NAME[node]}. Pick a unit first (click it or press its key), or press A to fire there.`); return; }
    select(all[0], true); cycleSay(all, 0); return;
  }
  const u = unit(g, sel);
  let fired = null;
  if (u.type === 'arty') {
    if (g.fire[me][g.t]) { say('Your artillery has already fired this hour.'); return; }
    const f = setFire(g, me, node);
    if (!f) return;
    fired = f;
    sel = prevSel && alive(unit(g, prevSel)) ? prevSel : null; prevSel = null;
    say(`${fireText(g, f)}${sel ? ` <b>${unit(g, sel).short}</b> is still picked.` : ''}`);
  } else if (u.node === 'off') {
    if (!NORTH.includes(node)) { say(`${u.short} has not arrived yet. It can only enter through a sector on your entry edge (the bottom row).`); return; }
    issue(g, u.id, node);
    say(`<b>${u.short}</b> will enter at <b>${NAME[node]}</b> at ${hhmm(u.arrive)}. The dashed marker there shows it.`);
    sel = null;
  } else {
    const from = where(u);
    if (from === node && !pending(u) && !u.route.length && !u.seg) {
      const st = stackAt(node);
      if (st.length > 1) { const i = st.findIndex(x => x.id === u.id); select(st[(i + 1) % st.length].id, true); cycleSay(st.map(x => x.id), i + 1); return; }
      say(`${u.short} is already in ${NAME[node]}.`); return;
    }
    const o = issue(g, u.id, node);
    if (!o) return;
    const hrs = travelHours(from, node);
    say(`Order sent: <b>${u.short}</b> to <b>${NAME[node]}</b>. ${o.d ? `${CLOCK} It starts next hour, at ${hhmm(o.due)} (orders are running late)` : 'It starts now'}; the move takes about ${hrs} hour${hrs === 1 ? '' : 's'}.`);
    sel = null;
  }
  writeHash(g, me);
  draw();
  if (fired) {
    // The round flies from your battery; a recon troop next door watches it land.
    const m = map;
    shell(m, fired.node, { from: m.G.battery }).then(() => { if (fired.spotter && m === map) spot(m, fired.spotter, fired.node); });
  }
}

/** Your battery on the map: clicking it arms a fire mission, like the A key. */
function onArty() { if (g && !g.over) arm(); }

/** Keyboard on a sector: Enter/Space acts, arrow keys move between sectors. */
function onSectorKey(e, id) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSector(id); return; }
  const n = NODE[id];
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!d) return;
  e.preventDefault();
  if (map.flip) { d[0] = -d[0]; d[1] = -d[1]; }   // the board is turned: screen directions are reversed
  let to = null;
  if (id === 'x') to = d[1] < 0 ? 's1' : null;
  else if (n.row === 3 && d[1] > 0) to = 'x';
  else to = NODES.find(m => m.id !== 'x' && m.col === n.col + d[0] && m.row === n.row + d[1])?.id;
  if (to) map.nodes[to].focus();
}

function endHour() {
  if (!g || g.over) return;
  sel = null; prevSel = null;
  const t0 = g.t;
  const before = snap(map);
  const was = new Map(beliefAt(g, me, t0).tracks.filter(tr => tr.elem).map(tr => [tr.elem, tr]));
  const str0 = new Map(mineUnits().map(u => [u.id, u.str]));
  pulse($('end'));
  advance(g);
  const fights = g.fights.filter(f => f.t === t0).length;
  const halts = g.events.filter(e => e.t === t0 && e.kind === 'halt' && e.side === me);
  say(`<b>${hhmm(g.t)}.</b> ${fights ? `Fighting in ${fights} sector${fights > 1 ? 's' : ''}. ` : ''}${halts.map(e => `<b>${DEF[e.unit].short} halted at ${NAME[e.node]}</b> (contact); its order is cancelled. `).join('')}New reports are ${narrowQ.matches ? 'in the Reports tab' : 'on the right'}.`);
  writeHash(g, me);
  if (g.over) finish(true);
  else {
    draw();
    hourFx(t0, before, was, str0);
  }
}

/** The hour's motion: units slide to where they are now, enemy rounds land, fights flare, new contacts ping. */
function hourFx(t0, before, was, str0) {
  const m = map;
  slide(m, before);
  flash($('clock'));
  for (const tr of beliefAt(g, me, g.t).tracks) {
    const p = tr.elem && was.get(tr.elem);
    if (tr.age === 0 && tr.elem && (!p || p.node !== tr.node || p.age > 0)) m.svg.querySelector(`[data-elem="${tr.elem}"]`)?.classList.add('fresh');
  }
  const hurt = () => mineUnits().filter(u => str0.has(u.id) && u.str < str0.get(u.id) - 1e-9)
    .forEach(u => { const b = $('units').querySelector(`[data-u="${u.id}"]`); shake(b); flash(b); });
  const hits = liveView().hits;
  setTimeout(() => { if (m === map) contacts(m, g.fights.filter(f => f.t === t0).map(f => f.node)); }, 380);
  Promise.all(hits.map((n, i) => new Promise(r => setTimeout(r, i * 140)).then(() => shell(m, n, { foe: true })))).then(hurt);
}

function finish(scroll, note = '') {
  document.body.classList.add('fc-over');
  document.body.classList.remove('fc-armed');
  $('viewbar').hidden = false;
  $('decoytip').hidden = true;
  say(`${note ? `${note} ` : ''}${g.over.winner === me ? 'You won. The review is below the map.' : 'You lost. The review is below the map.'}`);
  draw();
  aar.show(g, me);
  if (scroll) $('aar').scrollIntoView({ block: 'nearest', behavior: reduce() ? 'auto' : 'smooth' });
}

function reviewAt(h) {
  const prev = aarHour, before = prev !== null ? snap(map) : null;
  aarHour = h;
  const s = g.snaps[h];
  if (!s) return;
  const units = s.units.map(x => ({ ...DEF[x.id], ...x, str0: TYPES[DEF[x.id].type].str }));
  const truthPic = { tracks: units.filter(u => u.side !== me && !u.broken && NODE[u.node || (u.seg && u.seg.from)]).map(u => ({ elem: u.id, node: u.node || u.seg.from, type: u.type, str: u.str, est: u.str, hp: u.str0 ? u.str / u.str0 : 0, exact: true, age: 0 })), marks: [] };
  render(map, {
    me, units, pic: view === 'truth' ? truthPic : beliefAt(g, me, h), mode: view, routes: [], selected: null,
    target: g.fire[me][h] || null, hits: [], fights: g.fights.filter(f => f.t === h - 1).map(f => f.node),
  });
  if (before && prev !== h) slide(map, before, { ms: 420, forward: h === prev + 1 });
}

function setView(v) {
  const changed = v !== view;
  view = v;
  document.querySelectorAll('#viewbar [data-view]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.view === v)));
  if (g && g.over && aarHour !== null) {
    const before = changed ? snap(map) : null;
    reviewAt(aarHour);
    if (changed) { slide(map, before, { forward: false }); lift(map, v === 'truth'); }
  }
}

/** The decoy note heads the unit list; on a phone, where the Map tab hides that list, it sits above the map. */
function placeDecoyTip() {
  const tip = $('decoytip');
  if (narrowQ.matches) $('box').before(tip); else $('ucol').prepend(tip);
}

/** Phone tabs: Map, Units, Reports (CSS shows one at a time while a game is on). */
function setTab(t) {
  tab = t;
  document.body.dataset.tab = t;
  document.querySelectorAll('.fc-tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  // On a phone each tab starts at the top of the play area, under the order bar.
  if (narrowQ.matches && g && !g.over && $('play').getBoundingClientRect().top < 0) $('play').scrollIntoView({ block: 'start', behavior: 'auto' });
}

const aar = createAAR({ onHour: reviewAt, onAgain: () => start(me, g.seed, [], 0, g.od), onNew: showStart });

document.querySelectorAll('#viewbar [data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
document.querySelectorAll('.fc-side').forEach(b => b.addEventListener('click', () => start(b.dataset.side, newSeed())));
$('od').addEventListener('input', odShow);
$('decoytip-x').addEventListener('click', () => { $('decoytip').hidden = true; });
$('again').addEventListener('click', () => $('aar-again').click());
document.querySelectorAll('.fc-tabs [data-tab]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
$('units').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) select(b.dataset.u); });
$('feed').addEventListener('toggle', e => { const d = e.target; if (d.dataset?.h === undefined) return; if (d.open) openHours.add(+d.dataset.h); else openHours.delete(+d.dataset.h); }, true);
$('sel').addEventListener('click', e => {
  const b = e.target.closest('[data-stance]');
  if (!b || !sel) return;
  stance(b.dataset.stance);
});
function stance(s) {
  const u = unit(g, sel);
  setStance(g, sel, s);
  say(s === 'give' ? `<b>${u.short}</b> will give ground: it falls back one sector if a stronger enemy attacks it.` : `<b>${u.short}</b> will hold and fight.`);
  writeHash(g, me); draw();
}
$('end').onclick = endHour;
$('undo').onclick = () => { const a = undoLast(g); if (a) { say(`Withdrawn: the last ${a.kind === 's' ? 'standing order' : a.kind === 'e' ? 'entry choice' : 'order'} to ${DEF[a.unit].short}.`); writeHash(g, me); draw(); } };
$('new-game').onclick = showStart;
$('copy-link').onclick = async () => {
  if (g) writeHash(g, me);
  try { await navigator.clipboard.writeText(location.href); say('Link copied. It replays this game exactly.'); } catch { say('Copy the address bar to share this game.'); }
};

document.addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, select, summary') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (!g || g.over) return;
  const k = e.key.toLowerCase();
  const u = mineUnits().find(x => x.key && x.key === k);
  if (u) { if (alive(u)) select(u.id); else say(`${u.short} has broken and left the battle.`); return; }
  if (k === 'g') {
    const s = sel && unit(g, sel);
    if (!s) say('Pick a unit first, then press G to switch it between hold and give ground.');
    else if (s.type === 'arty' || s.type === 'decoy') say(`The ${s.type === 'arty' ? 'artillery' : 'decoy'} has no standing order; G works on fighting units.`);
    else stance(s.stance === 'give' ? 'hold' : 'give');
  } else if (k === 'n') endHour();
  else if (k === 'u') $('undo').click();
  else if (k === 'escape') { if (armed()) arm(); else { sel = null; prevSel = null; draw(); } }
  else if (k === ']' || k === '[') {
    const list = mineUnits().filter(alive);
    const i = list.findIndex(x => x.id === sel);
    select(list[(i + (k === ']' ? 1 : list.length - 1) + (i < 0 && k === '[' ? 1 : 0)) % list.length].id, true);
  }
});

// "Learn to play": a guided first game on a fixed seed at the standard balance (js/lesson.js).
let lesson = null;
function learn(side) {
  if (g && g.t > 0 && !g.over && !confirm('The lesson starts a new game. To keep this one, cancel and copy its link first.')) return;
  if (lesson) lesson.stop();
  start(side, LESSON_SEED, [], 0, OFFDEF.standard);
  lesson = runLesson(lessonSteps(side, { get: () => ({ g, me, sel }), tab: setTab }),
    { slug: 'fog-of-command', title: side === 'red' ? 'Learn to attack' : 'Learn to play', onExit: () => { lesson = null; } });
}
learnButton($('start'), { slug: 'fog-of-command', minutes: 6, onStart: () => learn('blue'), sheet: SHEET,
  blurb: 'A guided first game as the defender, about 6 minutes. Every term is explained as it comes up.' });
$('start-tour').onclick = () => learn(g && !g.over ? me : 'blue');
$('learn-red').onclick = () => learn('red');
narrowQ.addEventListener('change', () => {
  remap();
  placeDecoyTip();
  if (!g) render(map, { me: 'blue', units: [], pic: { tracks: [], marks: [] }, mode: 'belief' });
  else if (g.over && aarHour !== null) reviewAt(aarHour); else draw();
});
$('quotes').addEventListener('click', e => {
  const a = e.target.closest('a[href^="#src-"]');
  if (!a) return;
  e.preventDefault();
  document.querySelector(a.getAttribute('href'))?.scrollIntoView({ block: 'center' });
});

fillText();
renderBelow($);
odShow();
// A link from the 12-hour game (before 2026-10-01) has no h= in it: replay its moves under today's rules, and say so.
const OLD_LINK = h => `<b>This link was made in the earlier ${h}-hour version of the game.</b> Its moves are replayed under the current rules (${GAME.hours} hours, to ${endTime()}, with a retuned kill rate), so fights may come out differently, and a game that ended at ${hhmm(h)} carries on.`;
const boot = () => {
  const h = readHash();
  if (h.seed && h.me) start(h.me, h.seed, h.log, h.n, h.od, h.hours !== GAME.hours && (h.n || h.log.length) ? OLD_LINK(h.hours) : '');
  else showStart();
};
window.addEventListener('hashchange', () => { if (location.hash.includes('s=')) boot(); });
boot();
