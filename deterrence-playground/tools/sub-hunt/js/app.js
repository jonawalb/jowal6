// The Hunt: wires the engine, the map and the panel together.
import { GAME, SENSORS } from '../data/params.js';
import { newGame, replay, advance, place, orderShip, prosecute, undo, canPlace } from './game.js';
import { createMap, render, drawCursor, tokenColor, fitView } from './map.js';
import { renderStatus, renderLog, renderSetup, renderBelow, HINTS } from './panel.js';
import { mathHtml, drawLRC } from './math.js';
import { createReveal } from './reveal.js';
import { createBatch } from './batchview.js';
import { createTour } from './tour.js';
import { readHash, writeHash } from './hash.js';
import { pWithin } from './filter.js';
import { isLand, step, BOX } from './geo.js';

const $ = id => document.getElementById(id);
const pct = x => `${Math.round(x * 100)}%`;
const newSeed = () => 1 + Math.floor(Math.random() * 999998);

const map = createMap($('map'));
let color = tokenColor('--c2', document.body);
let g, tool = 'buoy', cursor = null, pending = null;

function start(opts, log = [], n = 0) {
  g = log.length || n ? replay(opts, log, n) : newGame(opts);
  pending = null;
  $('pros-box').hidden = true;
  renderSetup(g, beh => start({ seed: g.seed, beh, share: g.share }));
  document.body.classList.toggle('sh-over', !!g.over);
  if (g.over) finish(false);
  else { reveal.hide(); say(g.t ? `Hunt resumed at hour ${g.t}.` : 'Hour 0. The sub is somewhere in the dashed ring. Place sensors, then advance the clock.'); }
  writeHash(g);
  draw();
}

function draw() {
  if (!g.over) render(map, g, { hour: g.t, snap: g.snaps[g.snaps.length - 1], reveal: false }, color);
  renderStatus(g);
  if (!g.over) renderLog(g);
  const mine = g.log.length && g.log[g.log.length - 1].t === g.t;
  $('undo').disabled = g.over || !mine;
  $('adv1').disabled = $('adv3').disabled = !!g.over;
  $('controls').classList.toggle('done', !!g.over);
  document.querySelectorAll('#tools button').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.tool === tool));
    b.disabled = !!g.over || ((b.dataset.tool === 'buoy' || b.dataset.tool === 'mpa') && !canPlace(g, b.dataset.tool));
  });
  $('hint').textContent = g.over ? 'The hunt is over. Use the reveal below, or start again.' : HINTS[tool];
  drawCursor(map, g.over ? null : (pending || cursor), g.over ? null : tool);
}

const say = t => { $('say').textContent = t; };

function setTool(t) {
  tool = t; pending = null; $('pros-box').hidden = true;
  $('math').innerHTML = mathHtml(t); drawLRC($('math'));
  if (g) draw();
}

function act(p) {
  if (g.over || !p) return;
  if (isLand(p[0], p[1])) { say('That is land. Pick a point at sea.'); return; }
  if (tool === 'buoy' || tool === 'mpa') {
    if (!canPlace(g, tool)) { say(`Not enough budget for ${SENSORS[tool].label.toLowerCase()}.`); return; }
    const a = place(g, tool, p);
    say(tool === 'buoy' ? `Buoys laid. They listen hours ${a.t0}–${a.t1}.` : `Aircraft ordered. It searches the box in hours ${a.t0}–${a.t1}.`);
  } else if (tool === 'ship') {
    orderShip(g, p); say('Ship ordered to the new point.');
  } else {
    pending = p.slice();
    $('pros-p').textContent = pct(pWithin(g.filter, pending, GAME.prosR));
    $('pros-box').hidden = false;
    $('pros-go').focus({ preventScroll: true });
  }
  writeHash(g);
  draw();
}

function advanceBy(n) {
  const lines = [];
  for (let k = 0; k < n && !g.over; k++) {
    const ev = advance(g);
    const nc = ev.contacts.length;
    if (nc) lines.push(`Hour ${ev.h}: ${nc} new contact${nc > 1 ? 's' : ''}.`);
    if (ev.clue) lines.push(`Hour ${ev.h}: clue received.`);
  }
  say(lines.length ? lines.join(' ') : `Hour ${g.t}: nothing heard. Probability drains from the searched water.`);
  writeHash(g);
  if (g.over) finish(true); else draw();
}

function finish(scroll) {
  document.body.classList.add('sh-over');
  $('pros-box').hidden = true;
  draw();
  reveal.show(g);
  if (scroll) $('reveal').scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

const reveal = createReveal({
  onHour: h => { render(map, g, { hour: h, snap: g.snaps[h], reveal: true }, color); renderLog(g, h); },
  onAgain: () => start({ seed: g.seed, beh: g.beh, share: g.share }),
  onNew: () => start({ seed: newSeed(), beh: g.beh, share: g.share }),
});

// Map pointer and keyboard input.
const tip = $('tip');
function hover(e) {
  if (g.over) { tip.hidden = true; return; }
  const p = map.point(e);
  cursor = p;
  if (!pending) drawCursor(map, p, tool);
  const r = tool === 'pros' ? GAME.prosR : 20;
  const box = $('box').getBoundingClientRect();
  tip.innerHTML = `<b>${pct(pWithin(g.filter, p, r))}</b><span class="tt-d">of your map within ${r} nm</span>`;
  tip.hidden = false;
  const x = e.clientX - box.left, y = e.clientY - box.top;
  tip.style.left = `${Math.min(x + 14, box.width - 170)}px`;
  tip.style.top = `${Math.max(4, y - 44)}px`;
}
$('map').addEventListener('pointermove', e => { if (e.pointerType === 'mouse') hover(e); });
$('map').addEventListener('pointerleave', () => { tip.hidden = true; if (!pending) drawCursor(map, null); });
$('map').addEventListener('click', e => { tip.hidden = true; act(map.point(e)); });
$('map').addEventListener('keydown', e => {
  const moves = { ArrowUp: [0, 6], ArrowDown: [180, 6], ArrowLeft: [270, 6], ArrowRight: [90, 6] };
  if (!cursor) cursor = g.datum.slice();
  if (moves[e.key]) {
    e.preventDefault();
    const q = step(cursor, moves[e.key][0], moves[e.key][1] * (e.shiftKey ? 4 : 1));
    if (q[0] > BOX[0] && q[0] < BOX[2] && q[1] > BOX[1] && q[1] < BOX[3]) cursor = q;
    drawCursor(map, cursor, tool);
    say(`Crosshair at ${cursor[1].toFixed(1)}°N ${Math.abs(cursor[0]).toFixed(1)}°W: ${pct(pWithin(g.filter, cursor, 20))} of your map within 20 nm.`);
  } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(cursor); }
});

$('tools').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) setTool(b.dataset.tool); });
$('undo').onclick = () => { if (undo(g)) { say('Undone.'); writeHash(g); draw(); } };
$('adv1').onclick = () => advanceBy(1);
$('adv3').onclick = () => advanceBy(3);
$('pros-cancel').onclick = () => { pending = null; $('pros-box').hidden = true; draw(); };
$('pros-go').onclick = () => { if (!pending) return; prosecute(g, pending); pending = null; writeHash(g); finish(true); };

$('sp').oninput = () => { $('sp-o').textContent = `${$('sp').value}%`; };
$('sp').onchange = () => start({ seed: g.seed, beh: g.beh, share: +$('sp').value / 100 });
$('seed').onchange = () => { const s = Math.round(+$('seed').value); if (s >= 1 && s <= 999999) start({ seed: s, beh: g.beh, share: g.share }); };
$('restart').onclick = () => start({ seed: g.seed, beh: g.beh, share: g.share });
$('newsub').onclick = () => start({ seed: newSeed(), beh: g.beh, share: g.share });
$('copy-link').onclick = async () => {
  writeHash(g);
  try { await navigator.clipboard.writeText(location.href); say('Link copied. It replays this hunt exactly.'); } catch { say('Copy the address bar to share this hunt.'); }
};

const tour = createTour($('tour'));
$('start-tour').onclick = () => tour.start();
createBatch(() => ({ seed: g.seed, beh: g.beh }));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  color = tokenColor('--c2', document.body);
  if (g.over) reveal.show(g); else draw();
});

const narrow = matchMedia('(max-width: 640px)');
fitView(map, narrow.matches);
narrow.addEventListener('change', () => fitView(map, narrow.matches));

renderBelow();
setTool('buoy');
const boot = () => { const h = readHash(); start({ seed: h.seed || newSeed(), beh: h.beh, share: h.share }, h.log, h.n); };
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
