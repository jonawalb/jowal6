// The Hunt: wires the engine, the map and the panel together.
import { GAME, SENSORS } from '../data/params.js';
import { newGame, replay, advance, place, prosecute, undo, canPlace, usedThisHour } from './game.js';
import { createMap, render, drawCursor, tokenColor, fitView, toPct } from './map.js';
import { renderStatus, renderLog, renderSetup, renderBelow, hourText, HINTS, pct } from './panel.js';
import { createReveal } from './reveal.js';
import { createBatch } from './batchview.js';
import { createTour } from './tour.js';
import { readHash, writeHash } from './hash.js';
import { pWithin } from './filter.js';
import { isLand, step, offset, BOX } from './geo.js';

const $ = id => document.getElementById(id);
const newSeed = () => 1 + Math.floor(Math.random() * 999998);
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked: fine */ } } };

const map = createMap($('map'));
const phone = matchMedia('(max-width: 720px)'); // matches the CSS that moves the map above the controls
let color = tokenColor('--c2', document.body);
let g, tool = 'buoy', cursor = null, pending = null, coached = false;

function start(opts, log = [], n = 0) {
  g = log.length || n ? replay(opts, log, n) : newGame(opts);
  pending = null;
  tool = 'buoy';
  $('pros-box').hidden = true;
  renderSetup(g, beh => start({ seed: g.seed, beh, share: g.share }));
  document.body.classList.toggle('sh-over', !!g.over);
  if (g.over) { finish(false); say('This link replays a finished hunt. The true track is on the map; the slider under it replays every hour.'); }
  else {
    reveal.hide();
    say(g.t ? `Hunt resumed at hour ${g.t}.` : 'Hour 0. The sub is somewhere in the dashed ring. Search where the glow is brightest.');
  }
  writeHash(g);
  draw();
}

/** Odds a tool would cover at p: the circle, the square or the attack ring. */
function covered(p, t) {
  if (t === 'pros') return pWithin(g.filter, p, GAME.prosR);
  if (t === 'buoy') return pWithin(g.filter, p, SENSORS.buoy.fieldR);
  let s = 0;
  g.filter.parts.forEach((q, i) => {
    if (q.out) return;
    const [x, y] = offset(p, [q.lon, q.lat]);
    if (Math.abs(x) <= SENSORS.mpa.half && Math.abs(y) <= SENSORS.mpa.half) s += g.filter.w[i];
  });
  return s;
}

function draw() {
  if (!g.over) render(map, g, { hour: g.t, snap: g.snaps[g.snaps.length - 1], reveal: false }, color);
  renderStatus(g);
  if (!g.over) renderLog(g);
  const used = usedThisHour(g);
  $('undo').disabled = g.over || !used;
  $('end').disabled = !!g.over;
  $('end').classList.toggle('nudge', used && !g.over && g.t === 0);
  $('controls').classList.toggle('done', !!g.over);
  document.querySelectorAll('#tools button').forEach(b => {
    const t = b.dataset.tool;
    b.setAttribute('aria-pressed', String(t === tool));
    b.disabled = !!g.over || (t !== 'pros' && !canPlace(g, t));
  });
  const last = !g.over && GAME.hours - g.t === 1 && tool !== 'pros';
  $('hint').textContent = g.over ? 'The hunt is over. The reveal is below the map.'
    : last ? 'Last hour. Press Attack now: when this hour ends, so does the hunt.'
      : (tool !== 'pros' && used ? HINTS.used : HINTS[tool]);
  drawCursor(map, g.over ? null : (pending || cursor), g.over || (used && tool !== 'pros') ? null : tool);
  coach();
}

/** First-hunt prompts on the map: where to click, then what the darker circle means. */
function coach() {
  const box = $('callout');
  let text = null, at = null;
  if (!coached && !g.over) {
    const first = g.assets[0];
    if (g.t === 0 && !first) { text = 'Start here: click inside the glowing ring to drop sonobuoys.'; at = step(g.datum, 180, GAME.datumR + 6); }
    else if (g.t === 0) { text = `Now press End hour, ${phone.matches ? 'below' : 'above'} the map.`; at = step(first.p, 180, SENSORS.buoy.fieldR + 22); }
    else if (g.t === 1 && first) {
      const heard = g.contacts.some(c => c.asset === first.id);
      text = heard ? 'A contact. The odds pull toward it, but it may be noise. Keep searching, or attack if the odds look good.'
        : 'Nothing heard, so the odds inside this circle dropped and rose everywhere else. That is Bayes\' rule.';
      at = step(first.p, 180, SENSORS.buoy.fieldR + 22);
    }
  }
  if (!text) { box.hidden = true; return; }
  const [x, y] = toPct(map, at);
  box.textContent = text;
  box.style.left = `${Math.max(2, Math.min(98, x))}%`;
  box.style.top = `${Math.max(2, Math.min(92, y))}%`;
  box.hidden = false;
}

const say = html => { $('say').innerHTML = html; };

function setTool(t) {
  tool = t; pending = null; $('pros-box').hidden = true;
  if (g) draw();
}

function act(p) {
  if (g.over || !p) return;
  if (isLand(p[0], p[1])) { say('That is land. Pick a point at sea.'); return; }
  if (tool === 'buoy' || tool === 'mpa') {
    if (usedThisHour(g)) { say('One search per hour. Press End hour, or Undo to move this one.'); return; }
    if (!canPlace(g, tool)) { say(`No ${tool === 'buoy' ? 'sonobuoys' : 'aircraft flights'} left. Try the other tool.`); return; }
    const odds = covered(p, tool);
    const a = place(g, tool, p);
    say(`${tool === 'buoy' ? 'Sonobuoys' : 'Aircraft'} ${a.name} will search water holding <b>${pct(odds)}</b> of the odds. Press End hour.`);
  } else {
    pending = p.slice();
    $('pros-p').textContent = pct(pWithin(g.filter, pending, GAME.prosR));
    $('pros-box').hidden = false;
    $('pros-go').focus({ preventScroll: true });
  }
  writeHash(g);
  draw();
}

function endHour() {
  if (g.over) return;
  if (g.t >= 1) coached = true; // the first-hunt prompts end after hour 1
  const ev = advance(g);
  say(hourText(g, ev));
  writeHash(g);
  if (g.over) finish(true); else draw();
}

function finish(scroll) {
  coached = true;
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
  const idle = tool !== 'pros' && usedThisHour(g);
  if (!pending) drawCursor(map, p, idle ? null : tool);
  if (idle || isLand(p[0], p[1])) { tip.hidden = true; return; }
  const what = { buoy: 'inside this circle', mpa: 'inside this square', pros: 'inside this attack ring' }[tool];
  tip.innerHTML = `<b>${pct(covered(p, tool))}</b><span class="tt-d">of the odds ${what}</span>`;
  tip.hidden = false;
  const box = $('box').getBoundingClientRect();
  const x = e.clientX - box.left, y = e.clientY - box.top;
  tip.style.left = `${Math.min(x + 14, box.width - 190)}px`;
  tip.style.top = `${Math.max(4, y - 48)}px`;
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
    say(`Crosshair at ${cursor[1].toFixed(1)}°N ${Math.abs(cursor[0]).toFixed(1)}°W: ${pct(covered(cursor, tool))} of the odds under the selected tool.`);
  } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(cursor); }
});

$('tools').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) setTool(b.dataset.tool); });
$('undo').onclick = () => { if (undo(g)) { say('Undone. Click the map to search somewhere else.'); writeHash(g); draw(); } };
$('end').onclick = endHour;
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

// "How to play" stays until dismissed; the choice is remembered in this browser only.
const howto = show => { $('howto').hidden = !show; $('show-howto').setAttribute('aria-pressed', String(show)); };
howto(store.get('sh-howto') !== 'hidden');
$('hide-howto').onclick = e => { howto(false); store.set('sh-howto', 'hidden'); if (!e.detail) $('map').focus({ preventScroll: true }); };
$('show-howto').onclick = () => { const s = $('howto').hidden; howto(s); store.set('sh-howto', s ? 'shown' : 'hidden'); if (s) $('howto').scrollIntoView({ block: 'nearest' }); };

const tour = createTour($('tour'));
$('start-tour').onclick = () => tour.start();
createBatch(() => ({ seed: g.seed, beh: g.beh }));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  color = tokenColor('--c2', document.body);
  if (g.over) reveal.show(g); else draw();
});

const narrow = matchMedia('(max-width: 640px)');
fitView(map, narrow.matches);
narrow.addEventListener('change', () => { fitView(map, narrow.matches); if (g) coach(); });

renderBelow();
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
