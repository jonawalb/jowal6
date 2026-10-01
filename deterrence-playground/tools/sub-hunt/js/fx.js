// Motion for The Hunt: buoy drops, detection pings, attack tracers and bursts, the probability map easing
// into its new shape, and counters that count. Presentation only: nothing here reads or changes game state
// beyond positions to draw at. Every effect is skipped under prefers-reduced-motion (see motion.js).
import { burst as burst0, tracer as tracer0, pulse, shake, countUp, reveal, reduced } from '../../../shared/js/motion.js';
import { skin } from '../../../shared/js/skin.js';
import { buoyPoints } from './sensors.js';
import { P } from './map.js';
import { step } from './geo.js';

const NS = 'http://www.w3.org/2000/svg';
const rich = () => skin() === 'trailer';
const wait = ms => new Promise(r => setTimeout(r, ms));
// burst and tracer from motion.js start inside a frame so their clocks never run backwards on frame one.
/** Sonar/radar ring like motion.ping, but with its clock clamped at 0 (motion.ping can start a few ms before
 *  its own t0, which gives a negative radius and a console error on frame one). */
function ping(svg, x, y, { color = 'var(--accent)', r = 40, ms = 900, width = 2 } = {}) {
  if (!svg || reduced()) return;
  const c = document.createElementNS(NS, 'circle');
  for (const [k, v] of Object.entries({ cx: x, cy: y, r: 1, fill: 'none', stroke: color, 'stroke-width': width, 'pointer-events': 'none' })) c.setAttribute(k, v);
  svg.appendChild(c);
  const t0 = performance.now();
  const f = now => {
    const u = Math.max(0, Math.min(1, (now - t0) / ms)), e = 1 - Math.pow(1 - u, 3);
    c.setAttribute('r', (1 + r * e).toFixed(2)); c.setAttribute('opacity', (1 - u).toFixed(3));
    if (u < 1) requestAnimationFrame(f); else c.remove();
  };
  requestAnimationFrame(f);
}
const burst = (...a) => requestAnimationFrame(() => burst0(...a));
const tracer = (...a) => new Promise(res => requestAnimationFrame(() => tracer0(...a).then(res)));

/** A top layer for effects, plus a glow filter the trailer look applies to it (CSS, sub-hunt.css). */
export function fxLayer(map) {
  const root = map.layers.cursor.parentNode;
  let defs = map.svg.querySelector('defs');
  if (!defs) { defs = document.createElementNS(NS, 'defs'); map.svg.prepend(defs); }
  defs.insertAdjacentHTML('beforeend', `<filter id="sh-glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', 'sh-fx');
  g.setAttribute('aria-hidden', 'true');
  root.appendChild(g);
  return g;
}

/** Where a newly queued sensor lands, as SVG points (a buoy line gives every buoy). */
function dropPoints(a) {
  if (a.type !== 'line') return [P(a.p)];
  return buoyPoints(a.p, a.ang).map(P);
}

/** A sensor (or an attack) was queued at the player's click. */
export function dropFx(fx, map, type, a, btn) {
  pulse(btn);
  if (reduced() || !a) return;
  const u = map.u || 1;
  if (type === 'attack') { ping(fx, ...P(a.p), { color: 'var(--red)', r: 26 * u, ms: 600 }); return; }
  if (type === 'move' || type === 'dash') { ping(fx, ...P(a.dest), { color: 'var(--blue)', r: 14 * u, ms: 500 }); return; }
  const pts = dropPoints(a), r = (type === 'line' ? 12 : 30) * u * (rich() ? 1.3 : 1);
  pts.forEach(([x, y], i) => setTimeout(() => ping(fx, x, y, { color: 'var(--blue)', r, ms: 700 }), i * 35));
  if (rich() && type !== 'line') setTimeout(() => ping(fx, ...pts[0], { color: 'var(--blue)', r: r * 1.6, ms: 900, width: 1 }), 160);
}

/** The probability map eases from last turn's shape into this one's (the old image fades off the new). */
export function heatFade(map, oldHref) {
  if (reduced() || !oldHref || oldHref === map.heatImg.getAttribute('href')) return;
  const ghost = map.heatImg.cloneNode();
  ghost.setAttribute('href', oldHref);
  map.heatImg.after(ghost);
  ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: rich() ? 900 : 650, easing: 'ease-out' }).onfinish = () => ghost.remove();
}

/** A turn resolved: attacks streak from the ship and burst, then every contact pings where it was heard. */
export async function turnFx(fx, map, g, ev, statusEl) {
  if (!ev || reduced()) return;
  const u = map.u || 1, big = rich();
  const from = P(g.ship.track[ev.h0] || g.ship.p);
  for (const a of ev.attacks) {
    const [x, y] = P(a.p);
    await tracer(fx, from[0], from[1], x, y, { color: 'var(--red)', ms: 420, width: 2.4 });
    burst(fx, x, y, a.hit ? { color: 'var(--good)', n: big ? 22 : 16, r: 40 * u, ms: 900 } : { color: 'var(--muted)', n: 10, r: 22 * u });
    if (a.hit) { ping(fx, x, y, { color: 'var(--good)', r: 60 * u, ms: 1100 }); pulse(statusEl); }
  }
  ev.contacts.forEach((c, i) => setTimeout(() => {
    if (c.type === 'ship') {
      const tip = P(step(c.from, c.brg, 70)), s = P(c.from);
      tracer(fx, s[0], s[1], tip[0], tip[1], { color: 'var(--red)', ms: 500, width: 1.8 });
      return;
    }
    const [x, y] = P(c.p);
    const rings = big ? 3 : 2;
    for (let k = 0; k < rings; k++) setTimeout(() => ping(fx, x, y, { color: 'var(--red)', r: (big ? 34 : 26) * u, ms: 900 }), k * 220);
  }, 120 + i * 140));
  if (g.over && g.over.kind !== 'found') { await wait(200); shake(statusEl); }
}

/** During the replay, a faint ring marks the sub's true position each hour it steps forward. */
export function replayFx(fx, map, g, h) {
  if (reduced() || !g.subTrack[h]) return;
  ping(fx, ...P(g.subTrack[h].p), { color: 'var(--red)', r: 16 * (map.u || 1), ms: 600, width: 1.5 });
  g.contacts.filter(c => c.h === h && c.p).forEach(c => ping(fx, ...P(c.p), { color: 'var(--ink)', r: 20 * (map.u || 1), ms: 700 }));
}

/** Count a readout from its last value to its new one. The final text is always the real number. */
export function tick(el, v, fmt) {
  if (!el) return;
  const prev = el.dataset.fxv;
  el.dataset.fxv = v;
  if (prev === undefined || +prev === v) return;
  countUp(el, v, { from: +prev, ms: 520, fmt });
}

/** The review card and its parts rise in. */
export function revealFx(box) {
  const parts = [...box.children];
  parts.forEach(e => e.classList.remove('m-in'));
  reveal(parts, { stagger: 70 });
}
