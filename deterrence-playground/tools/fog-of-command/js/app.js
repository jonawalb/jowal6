// Fog of Command: wires the engine, the map, the panel and the review together.
import { GAME } from '../data/params.js';
import { NODES } from '../data/map.js';
import { newGame, replay, issue, undoLast, setDrone, advance, belief, unit, blueUnits } from './engine.js';
import { travelHours } from './graph.js';
import { createMap, render, addDefs } from './map.js';
import { renderStatus, renderPicture, renderReports, renderOrders, renderBelow, hhmm, NAME, UNIT_NAME } from './panel.js';
import { createAAR } from './aar.js';
import { createTour } from './tour.js';
import { readHash, writeHash } from './hash.js';

const $ = id => document.getElementById(id);
const newSeed = () => 1 + Math.floor(Math.random() * 999998);
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked: fine */ } } };
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrowQ = matchMedia('(max-width: 640px)');

let g, sel = 'drone', view = 'belief', coached = false, aarHour = null;
const map = createMap($('map'), onSector);
addDefs($('map'));

const lossOf = game => blueUnits(game).reduce((s, u) => s + (u.str0 - u.str), 0);
const say = html => { $('say').innerHTML = html; };

function start(seed, orders = [], drones = {}, n = 0) {
  g = n ? replay({ seed }, orders, drones, n) : newGame({ seed });
  if (!g.over) {
    for (const o of orders) if (o.t === g.t) issue(g, o.unit, o.dest);
    if (drones[g.t]) setDrone(g, drones[g.t]);
  }
  sel = 'drone'; view = 'belief'; aarHour = null;
  $('seed').value = seed;
  document.body.classList.toggle('fc-over', !!g.over);
  $('viewbar').hidden = true;
  if (g.over) finish(false);
  else {
    aar.hide();
    say(g.t ? `Game resumed at ${hhmm(g.t)}.` : '06:00. Red is somewhere north of the valley. Look before you move: task the drone, then end the hour.');
  }
  writeHash(g);
  draw();
}

function unitButtons() {
  const html = blueUnits(g).map(u => {
    const pend = g.orders.find(o => o.unit === u.id && !o.done && !o.cancelled);
    const st = u.broken ? 'broken, out of the fight' : u.seg ? `moving to ${NAME[u.route.length ? u.route[u.route.length - 1] : u.seg.to]}` : `${NAME[u.node]}`;
    return `<button type="button" data-u="${u.id}" aria-pressed="${sel === u.id}" ${u.broken || g.over ? 'disabled' : ''}>
      <b><span class="fc-key">${u.key}</span> ${UNIT_NAME[u.id]}</b><small>${st}${pend ? ' · order in transit' : ''}</small>
      <span class="fc-ub" aria-hidden="true"><i style="width:${(100 * u.str / u.str0).toFixed(0)}%"></i></span></button>`;
  }).join('');
  const dr = g.drones[g.t];
  $('units').innerHTML = html + `<button type="button" data-u="drone" class="fc-dronebtn" aria-pressed="${sel === 'drone'}" ${g.over ? 'disabled' : ''}><b><span class="fc-key">D</span> Drone</b><small>${dr ? `looking at ${NAME[dr]}` : 'not tasked this hour'}</small></button>`;
}

function liveView() {
  return {
    units: g.units, pic: belief(g), truthPic: g.snaps[g.snaps.length - 1].truth, mode: 'belief',
    orders: g.orders.filter(o => !o.done && !o.cancelled).map(o => ({ ...o, state: 'sent' })),
    drone: g.drones[g.t], fights: g.fights.filter(f => f.t === g.t - 1), selected: sel, narrow: narrowQ.matches,
  };
}

function draw() {
  if (!g.over) render(map, liveView());
  renderStatus(g, lossOf(g));
  if (!g.over) renderPicture(belief(g));
  renderReports(g);
  renderOrders(g);
  unitButtons();
  $('undo').disabled = !!g.over || !g.orders.some(o => o.t === g.t);
  $('end').disabled = !!g.over;
  $('end').classList.toggle('nudge', !g.over && g.t === 0 && !!g.drones[0]);
  $('controls').classList.toggle('done', !!g.over);
  $('clock').textContent = hhmm(g.t);
  $('hourof').textContent = g.over ? 'game over' : `hour ${g.t} of ${GAME.hours}`;
  $('hint').textContent = g.over ? 'The game is over. The review is below the map.'
    : sel === 'drone' ? 'Drone selected: click a sector to look there this hour. Then press End hour.'
    : `${UNIT_NAME[sel]} selected: click the sector it should move to. Orders take 0–2 hours to arrive.`;
  for (const n of NODES) map.nodes[n.id].classList.toggle('target', !g.over && (sel === 'drone' ? g.drones[g.t] === n.id : false));
  coach();
}

/** First-game prompts over the map. */
function coach() {
  const box = $('callout');
  let text = null;
  if (!coached && !g.over) {
    if (g.t === 0 && !g.drones[0]) text = 'Start here: the drone is selected. Click West Pass, Center Gap or East Track to look there.';
    else if (g.t === 0) text = 'Good. Now press End hour, above the map.';
    else if (g.t === 1) text = 'Reports arrive in the panel, late. Each hour: look, decide, send orders (pick a unit, click a sector), end the hour.';
  }
  box.hidden = !text;
  if (text) box.textContent = text;
}

function onSector(node) {
  if (!g || g.over) return;
  if (sel === 'drone') {
    setDrone(g, node);
    say(`Drone tasked to <b>${NAME[node]}</b> for this hour. It reports fast, but when it names a unit type, decoys fool it about half the time.`);
  } else {
    const u = unit(g, sel);
    const from = u.node || u.seg?.to;
    const pend = g.orders.find(o => o.unit === u.id && !o.done && !o.cancelled);
    if (!pend && from === node && !u.route.length) { say(`${UNIT_NAME[u.id]} is already in ${NAME[node]}.`); return; }
    issue(g, u.id, node);
    const hrs = travelHours(from, node);
    say(`Order sent: <b>${UNIT_NAME[u.id]}</b> to <b>${NAME[node]}</b>. It reaches the unit in 0–2 hours; the move then takes about ${hrs} hour${hrs === 1 ? '' : 's'}.${pend ? ' It replaces the order still in transit.' : ''}`);
  }
  writeHash(g);
  draw();
}

function endHour() {
  if (!g || g.over) return;
  if (g.t >= 1) coached = true;
  const before = g.reports.filter(r => r.arrT <= g.t).length;
  const ev0 = g.events.length, f0 = g.fights.length;
  advance(g);
  const got = g.reports.filter(r => r.arrT <= g.t).length - before;
  const lines = [`<b>${hhmm(g.t)}.</b> ${got ? `${got} new report${got > 1 ? 's' : ''}.` : 'No new reports.'}`];
  for (const e of g.events.slice(ev0)) {
    if (e.kind === 'order') lines.push(`${UNIT_NAME[e.unit]} received its order (sent ${hhmm(e.sent)}) and is moving to ${NAME[e.dest]}.`);
    if (e.kind === 'break' && e.side === 'blue') lines.push(`<b class="fc-bad">${UNIT_NAME[e.unit]} broke</b> after heavy losses and fell back to the rear.`);
  }
  for (const f of g.fights.slice(f0)) {
    lines.push(`Fighting in ${NAME[f.node]}: you lost ${f.lb.toFixed(1)} strength points.`);
  }
  say(lines.join(' '));
  writeHash(g);
  if (g.over) finish(true); else draw();
}

function finish(scroll) {
  coached = true;
  document.body.classList.add('fc-over');
  $('viewbar').hidden = false;
  draw();
  aar.show(g);
  if (scroll) $('aar').scrollIntoView({ block: 'nearest', behavior: reduce() ? 'auto' : 'smooth' });
}

function reviewAt(h) {
  aarHour = h;
  const s = g.snaps[h];
  const units = g.units.map((u, i) => ({ ...u, ...s.units[i] }));
  const pic = belief(g, h);
  render(map, {
    units, pic, truthPic: s.truth, mode: view,
    orders: g.orders.filter(o => o.t <= h && !(o.at !== undefined && o.at <= h) && !o.cancelled).map(o => ({ ...o, state: 'sent' })),
    drone: g.drones[h], fights: g.fights.filter(f => f.t === h - 1), selected: null, narrow: narrowQ.matches,
  });
  renderPicture(view === 'truth' ? s.truth : pic, view === 'truth' ? 'true' : `est. at ${hhmm(h)}`);
}

const aar = createAAR({
  onHour: reviewAt,
  onAgain: () => start(g.seed),
  onNew: () => start(newSeed()),
});

document.querySelectorAll('#viewbar [data-view]').forEach(b => b.addEventListener('click', () => {
  view = b.dataset.view;
  document.querySelectorAll('#viewbar [data-view]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  if (aarHour !== null) reviewAt(aarHour);
}));

$('units').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  sel = b.dataset.u;
  draw();
});
$('end').onclick = endHour;
$('undo').onclick = () => { const o = undoLast(g); if (o) { say(`Order to ${UNIT_NAME[o.unit]} withdrawn.`); writeHash(g); draw(); } };
document.addEventListener('keydown', e => {
  if (!g || g.over || e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const u = blueUnits(g).find(x => x.key === e.key);
  if (u && !u.broken) { sel = u.id; draw(); }
  else if (e.key === 'd' || e.key === 'D') { sel = 'drone'; draw(); }
  else if (e.key === 'n' || e.key === 'N') endHour();
});

$('seed').onchange = () => { const s = Math.round(+$('seed').value); if (s >= 1 && s <= 999999) start(s); };
$('restart').onclick = () => start(g.seed);
$('newgame').onclick = () => start(newSeed());
$('copy-link').onclick = async () => {
  writeHash(g);
  try { await navigator.clipboard.writeText(location.href); say('Link copied. It replays this game exactly.'); } catch { say('Copy the address bar to share this game.'); }
};

const howto = show => { $('howto').hidden = !show; $('show-howto').setAttribute('aria-pressed', String(show)); };
howto(store.get('fc-howto') !== 'hidden');
$('hide-howto').onclick = () => { howto(false); store.set('fc-howto', 'hidden'); };
$('show-howto').onclick = () => { const s = $('howto').hidden; howto(s); store.set('fc-howto', s ? 'shown' : 'hidden'); if (s) $('howto').scrollIntoView({ block: 'nearest' }); };

const tour = createTour($('tour'));
$('start-tour').onclick = () => tour.start();
narrowQ.addEventListener('change', () => { $('map').classList.toggle('narrow', narrowQ.matches); if (g.over && aarHour !== null) reviewAt(aarHour); else draw(); });
$('map').classList.toggle('narrow', narrowQ.matches);
$('quotes').addEventListener('click', e => {
  const a = e.target.closest('a[href^="#src-"]');
  if (!a) return;
  e.preventDefault();
  document.querySelector(a.getAttribute('href'))?.scrollIntoView({ block: 'center' });
});

renderBelow();
const boot = () => { const h = readHash(); start(h.seed || newSeed(), h.orders, h.drones, h.n); };
window.addEventListener('hashchange', () => { if (location.hash.includes('s=')) boot(); });
boot();
