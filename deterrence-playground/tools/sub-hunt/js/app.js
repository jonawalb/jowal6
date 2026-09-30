// The Hunt: wires the engine, the map and the panel together.
import { GAME, SENSORS, ACTIONS } from '../data/params.js';
import { newGame, replay, endTurn, place, undo, why, effortLeft, shipOrder, lastSnap, hourOf, thisTurn } from './game.js';
import { createMap, drawCursor, tokenColor, fitView, toPct, scale } from './map.js';
import { render } from './layers.js';
import { renderStatus, renderLog, renderQueue, renderSetup, renderBelow, turnText, pct } from './panel.js';
import { renderBalance } from './balanceview.js';
import { createReveal } from './reveal.js';
import { createTour } from './tour.js';
import { readHash, writeHash } from './hash.js';
import { pWithin } from './filter.js';
import { covers, lineEnds } from './sensors.js';
import { isLand, step, BOX } from './geo.js';

const $ = id => document.getElementById(id);
const newSeed = () => 1 + Math.floor(Math.random() * 999998);
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked: fine */ } } };

const map = createMap($('map'));
const phone = matchMedia('(max-width: 720px)'); // matches the CSS that moves the map above the controls
let color = tokenColor('--c2', document.body);
let g, tool = 'circle', cursor = null, ang = 90, coached = false;

$('tools').innerHTML = Object.entries(ACTIONS).map(([k, a]) =>
  `<button type="button" data-tool="${k}" aria-pressed="false" aria-keyshortcuts="${a.key}" class="${k === 'attack' ? 'sh-prosbtn' : ''}">
    <span class="sh-th"><span class="sh-k">${a.key}</span><b>${a.name}</b><span class="sh-cost">${a.cost ? `${a.cost} pt` : 'free'}</span></span>
    <small>${a.help}</small></button>`).join('');

function start(opts, log = [], n = 0) {
  g = log.length || n ? replay(opts, log, n) : newGame(opts);
  tool = 'circle';
  renderSetup(g, beh => start({ seed: g.seed, beh }));
  document.body.classList.toggle('sh-over', !!g.over);
  if (g.over) { finish(false); say('This link replays a finished hunt. The true track is on the map; the slider under it replays every hour.'); }
  else {
    reveal.hide();
    say(g.turn ? `Hunt resumed at turn ${g.turn + 1}.` : 'Turn 1. The sub is somewhere near the dashed ring. Spend your effort, then press End turn.');
  }
  writeHash(g);
  draw();
}

/** Share of the map's odds a tool would cover at p. */
function covered(p, t) {
  if (t === 'attack') return pWithin(g.filter, p, GAME.prosR);
  if (t === 'circle') return pWithin(g.filter, p, SENSORS.circle.r);
  if (t === 'helo') return pWithin(g.filter, p, SENSORS.helo.r);
  if (t !== 'air' && t !== 'line') return null;
  const a = t === 'air' ? { type: 'air', p } : { type: 'line', ends: lineEnds(p, ang) };
  let s = 0;
  g.filter.parts.forEach((q, i) => { if (!q.out && covers(a, [q.lon, q.lat])) s += g.filter.w[i]; });
  return s;
}
const WHAT = { circle: 'inside this circle', helo: 'inside this dip', air: 'inside this box', line: 'within 15 nm of this line', attack: 'inside this attack ring' };

function draw() {
  const order = g.over ? null : shipOrder(g);
  if (!g.over) render(map, g, { hour: hourOf(g), snap: lastSnap(g), reveal: false, order }, color);
  renderStatus(g);
  renderQueue(g);
  if (!g.over) renderLog(g);
  $('undo').disabled = !!g.over || !thisTurn(g).length;
  $('end').disabled = !!g.over;
  $('end').classList.toggle('nudge', !g.over && g.turn === 0 && thisTurn(g).length > 0);
  $('controls').classList.toggle('done', !!g.over);
  document.querySelectorAll('#tools button').forEach(b => {
    const t = b.dataset.tool;
    b.setAttribute('aria-pressed', String(t === tool));
    b.disabled = !!g.over || !!why(g, t, null);
  });
  $('lineopt').hidden = tool !== 'line' || !!g.over;
  $('line-ang').textContent = `${ang}°`;
  const last = !g.over && g.turn === GAME.turns - 1;
  const block = g.over ? '' : why(g, tool, null);
  $('hint').textContent = g.over ? 'The hunt is over. The review is below the map.'
    : last ? 'Last turn. Queue an attack now: when this turn ends, so does the hunt.'
      : block || `${ACTIONS[tool].name}: ${ACTIONS[tool].help} Click the map to queue it.`;
  drawCursor(map, g.over ? null : cursor, g.over ? null : tool, { ship: g.ship.p, ang });
  coach();
}

/** First-hunt prompts on the map. */
function coach() {
  const box = $('callout');
  let text = null, at = null;
  if (!coached && !g.over && g.turn === 0) {
    const n = thisTurn(g).length;
    if (!n) { text = 'Start here: click inside the glow to drop a buoy circle. Then try other actions.'; at = step(g.datum, 180, GAME.datumR + 6); }
    else if (effortLeft(g) > 0) { text = `${effortLeft(g)} effort left. Queue more, or press End turn.`; at = step(g.datum, 180, GAME.datumR + 6); }
    else { text = `Effort spent. Press End turn, ${phone.matches ? 'below' : 'above'} the map.`; at = step(g.datum, 180, GAME.datumR + 6); }
  }
  if (!text) { box.hidden = true; return; }
  const [x, y] = toPct(map, at);
  box.textContent = text;
  box.style.left = `${Math.max(12, Math.min(88, x))}%`;
  box.style.top = `${Math.max(2, Math.min(88, y))}%`;
  box.hidden = false;
}

const say = html => { $('say').innerHTML = html; };

function setTool(t) { tool = t; draw(); }

function act(p) {
  if (g.over || !p) return;
  const no = why(g, tool, p);
  if (no) { say(no); return; }
  const odds = covered(p, tool);
  const r = place(g, tool, p, ang);
  const a = ACTIONS[tool];
  if (tool === 'attack') say(`Attack queued: your map gives this ring <b>${pct(odds)}</b>. It strikes when you press End turn, before the sub moves. Undo to cancel.`);
  else if (tool === 'move' || tool === 'dash') say(`Ship ordered ${tool === 'dash' ? 'to sprint (deaf this turn)' : 'to move, listening'}. One ship order per turn: a new one replaces it.`);
  else say(`${a.name} ${r.name} queued for ${a.cost} effort, over water holding <b>${pct(odds)}</b> of the odds. ${effortLeft(g)} effort left.`);
  writeHash(g);
  draw();
}

function end() {
  if (g.over) return;
  coached = true;
  const ev = endTurn(g);
  say(turnText(g, ev));
  writeHash(g);
  if (g.over) finish(true); else draw();
}

function finish(scroll) {
  coached = true;
  document.body.classList.add('sh-over');
  draw();
  reveal.show(g);
  if (scroll) $('reveal').scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

const reveal = createReveal({
  onHour: h => { render(map, g, { hour: h, snap: g.snaps[h], reveal: true }, color); renderLog(g, h); },
  onAgain: () => start({ seed: g.seed, beh: g.beh }),
  onNew: () => start({ seed: newSeed(), beh: g.beh }),
});

// Map pointer and keyboard input.
const tip = $('tip');
function hover(e) {
  if (g.over) { tip.hidden = true; return; }
  const p = map.point(e);
  cursor = p;
  drawCursor(map, p, tool, { ship: g.ship.p, ang });
  const v = isLand(p[0], p[1]) ? null : covered(p, tool);
  if (v === null) { tip.hidden = true; return; }
  tip.innerHTML = `<b>${pct(v)}</b><span class="tt-d">of the odds ${WHAT[tool]}</span>`;
  tip.hidden = false;
  const box = $('box').getBoundingClientRect();
  const x = e.clientX - box.left, y = e.clientY - box.top;
  tip.style.left = `${Math.min(x + 14, box.width - 190)}px`;
  tip.style.top = `${Math.max(4, y - 48)}px`;
}
$('map').addEventListener('pointermove', e => { if (e.pointerType === 'mouse') hover(e); });
$('map').addEventListener('pointerleave', () => { tip.hidden = true; drawCursor(map, null, g.over ? null : tool, { ship: g.ship.p, ang }); });
$('map').addEventListener('click', e => { tip.hidden = true; cursor = map.point(e); act(cursor); });
$('map').addEventListener('keydown', e => {
  const moves = { ArrowUp: 0, ArrowDown: 180, ArrowLeft: 270, ArrowRight: 90 };
  if (!cursor) cursor = lastSnap(g).best.p.slice();
  if (e.key in moves) {
    e.preventDefault();
    const q = step(cursor, moves[e.key], e.shiftKey ? 24 : 6);
    if (q[0] > BOX[0] && q[0] < BOX[2] && q[1] > BOX[1] && q[1] < BOX[3]) cursor = q;
    drawCursor(map, cursor, tool, { ship: g.ship.p, ang });
    const v = covered(cursor, tool);
    say(`Crosshair at ${cursor[1].toFixed(1)}°N ${Math.abs(cursor[0]).toFixed(1)}°W${v === null ? '' : `: ${pct(v)} of the odds ${WHAT[tool]}`}.`);
  } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(cursor); }
});

const rotate = () => { ang = (ang + 30) % 180; draw(); };
/** Keyboard help: jump the crosshair to the map's best attack spot. */
function toBest() {
  cursor = lastSnap(g).best.p.slice();
  $('map').focus({ preventScroll: true });
  drawCursor(map, cursor, tool, { ship: g.ship.p, ang });
  const v = covered(cursor, tool);
  say(`Crosshair on the brightest spot${v === null ? '' : `: ${pct(v)} of the odds ${WHAT[tool]}`}. Press Enter to use ${ACTIONS[tool].name.toLowerCase()} here.`);
}
const doUndo = () => { if (undo(g)) { say(`Undone. ${effortLeft(g)} effort left this turn.`); writeHash(g); draw(); } };
$('tools').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) setTool(b.dataset.tool); });
$('rotate').onclick = rotate;
$('undo').onclick = doUndo;
$('end').onclick = end;
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || tour.open || !g || g.over) return;
  if (e.target.closest('input, textarea, select')) return;
  const k = e.key.toLowerCase();
  const t = Object.entries(ACTIONS).find(([, a]) => a.key === k);
  if (t) { e.preventDefault(); if (!why(g, t[0], null)) setTool(t[0]); else say(why(g, t[0], null)); }
  else if (k === 'r' && tool === 'line') { e.preventDefault(); rotate(); }
  else if (k === 'b') { e.preventDefault(); toBest(); }
  else if (k === 'u') { e.preventDefault(); doUndo(); }
  else if (k === 'e') { e.preventDefault(); end(); }
});

$('seed').onchange = () => { const s = Math.round(+$('seed').value); if (s >= 1 && s <= 999999) start({ seed: s, beh: g.beh }); };
$('restart').onclick = () => start({ seed: g.seed, beh: g.beh });
$('newsub').onclick = () => start({ seed: newSeed(), beh: g.beh });
$('copy-link').onclick = async () => {
  writeHash(g);
  try { await navigator.clipboard.writeText(location.href); say('Link copied. It replays this hunt exactly.'); } catch { say('Copy the address bar to share this hunt.'); }
};

// "How to play" stays until dismissed; the choice is remembered in this browser only.
const howto = show => { $('howto').hidden = !show; $('show-howto').setAttribute('aria-pressed', String(show)); };
howto(store.get('sh-howto') !== 'hidden');
$('hide-howto').onclick = e => { howto(false); store.set('sh-howto', 'hidden'); if (!e.detail) $('map').focus({ preventScroll: true }); };
$('show-howto').onclick = () => { const s = $('howto').hidden; howto(s); store.set('sh-howto', s ? 'shown' : 'hidden'); if (s) $('howto').scrollIntoView({ block: 'nearest' }); };

const tour = createTour($('tour'));
$('start-tour').onclick = () => tour.start();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  color = tokenColor('--c2', document.body);
  if (g.over) reveal.show(g); else draw();
});

const narrow = matchMedia('(max-width: 640px)');
fitView(map, narrow.matches);
narrow.addEventListener('change', () => { fitView(map, narrow.matches); if (g) coach(); });
// Keep marks a fixed on-screen size as the map resizes.
let lastU = 0;
new ResizeObserver(() => {
  const u = scale(map);
  if (g && Math.abs(u - lastU) > 0.02) { lastU = u; if (g.over) reveal.redraw(); else draw(); }
}).observe($('map'));

renderBelow();
renderBalance();
const boot = () => { const h = readHash(); start({ seed: h.seed || newSeed(), beh: h.beh }, h.log, h.n); };
// A pasted or edited link loads that hunt. Our own replaceState calls do not fire hashchange.
window.addEventListener('hashchange', () => { if (location.hash.includes('seed=')) boot(); });
// History footnotes scroll to their source without replacing the hunt in the address bar.
$('history').addEventListener('click', e => {
  const a = e.target.closest('a[href^="#src-"]');
  if (!a) return;
  e.preventDefault();
  document.querySelector(a.getAttribute('href'))?.scrollIntoView({ block: 'center' });
});
boot();
// First visit: open the walkthrough once (remembered in this browser only).
if (store.get('sh-tour') !== 'seen' && !g.over) { store.set('sh-tour', 'seen'); tour.start(); }
