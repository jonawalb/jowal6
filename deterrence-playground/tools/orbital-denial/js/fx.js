// Motion for Orbital Denial: each month's attacks play out on the orbit view (jamming waves, a dazzle beam,
// a cyber pulse from the ground, missile and co-orbital intercepts with a kill burst and a spreading debris
// cloud), readouts count to their new values, and the review rises in with its charts drawing on.
// Presentation only: it reads the month that just resolved and never changes the game. Off under
// prefers-reduced-motion (motion.js helpers are no-ops then, and every local effect checks reduced()).
import { burst as burst0, tracer as tracer0, pulse, shake, flash, countUp, reveal, reduced } from '../../../shared/js/motion.js';
import { skin } from '../../../shared/js/skin.js';
import { MISSIONS, SHELL_KEYS } from '../data/params.js';
import { GEOM } from './orbit.js';

const NS = 'http://www.w3.org/2000/svg';
const rich = () => skin() === 'trailer';
const later = (ms, f) => setTimeout(f, ms);
// motion.js helpers start their clock before the first frame, so frame one can have a negative radius; start it in a frame.
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
const COL = { B: 'var(--accent)', R: 'var(--red)' };

/** Effects layer on top of the orbit view (the view's own group is cleared on every draw; this is not). */
export function fxLayer(svg) {
  const defs = document.createElementNS(NS, 'defs');
  defs.innerHTML = `<filter id="od-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svg.prepend(defs);
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', 'od-fx');
  g.setAttribute('aria-hidden', 'true');
  svg.appendChild(g);
  return g;
}

/** Centre of a side's constellation arc (the same angles orbit.js draws with). */
function spot(side, m) {
  const r = GEOM.RADII[MISSIONS[m].shell], [a0, a1] = side === 'B' ? [172, 98] : [82, 8];
  return GEOM.pt(r, (a0 + a1) / 2);
}
/** A ground station on the attacker's side of the Earth. */
const ground = side => GEOM.pt(GEOM.RE, side === 'B' ? 140 : 40);

/** Fragments fly off the kill point along the shell and settle into the speckle. */
function debrisCloud(fx, side, m, n) {
  if (reduced()) return;
  const r = GEOM.RADII[MISSIONS[m].shell], a = side === 'B' ? 135 : 45;
  const g = document.createElementNS(NS, 'g');
  fx.appendChild(g);
  const bits = Array.from({ length: n }, () => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('r', (0.8 + Math.random() * 0.9).toFixed(2));
    c.setAttribute('fill', Math.random() < .3 ? 'var(--ink)' : 'var(--muted)');
    g.appendChild(c);
    return { c, da: (Math.random() - .5) * 60, dr: (Math.random() - .5) * 26 };
  });
  const t0 = performance.now(), ms = 1500;
  const frame = now => {
    const u = Math.max(0, Math.min(1, (now - t0) / ms)), e = 1 - Math.pow(1 - u, 3);
    for (const b of bits) {
      const [x, y] = GEOM.pt(r + b.dr * e, a + b.da * e);
      b.c.setAttribute('cx', x.toFixed(1)); b.c.setAttribute('cy', y.toFixed(1));
      b.c.setAttribute('opacity', (u < .7 ? 1 : 1 - (u - .7) / .3).toFixed(2));
    }
    if (u < 1) requestAnimationFrame(frame); else g.remove();
  };
  requestAnimationFrame(frame);
}

/** One side's attack against the other side's constellation m. */
async function strike(fx, X, x) {
  const Y = X === 'B' ? 'R' : 'B', col = COL[X], [tx, ty] = spot(Y, x.m), big = rich();
  const res = x.res || '';
  if (x.a === 'jam') {
    const [sx, sy] = ground(X);
    tracer(fx, sx, sy, tx, ty, { color: col, ms: 380, width: 1.2 });
    for (let k = 0; k < (big ? 4 : 3); k++) later(300 + k * 160, () => ping(fx, tx, ty, { color: 'var(--warn)', r: 30, ms: 800, width: 1.6 }));
  } else if (x.a === 'dazzle') {
    const [sx, sy] = ground(X);
    await tracer(fx, sx, sy, tx, ty, { color: col, ms: 260, width: big ? 3.4 : 2.6 });
    ping(fx, tx, ty, { color: 'var(--ink)', r: 16, ms: 500 });
    if (/damaged/.test(res)) burst(fx, tx, ty, { color: col, n: 8, r: 14 });
  } else if (x.a === 'cyber') {
    const [sx, sy] = ground(Y);
    for (let k = 0; k < 3; k++) later(k * 110, () => ping(fx, sx, sy, { color: col, r: 14 + k * 6, ms: 500, width: 1.4 }));
    if (!/failed/.test(res)) later(330, () => ping(fx, tx, ty, { color: 'var(--warn)', r: 22, ms: 700 }));
  } else if (x.a === 'asat' || x.a === 'coorb') {
    const [sx, sy] = x.a === 'asat' ? ground(X) : spot(X, x.m);
    await tracer(fx, sx, sy, tx, ty, { color: col, ms: x.a === 'asat' ? 520 : 700, width: 2.4 });
    if (/^hit/.test(res)) {
      burst(fx, tx, ty, { color: col, n: big ? 20 : 14, r: 30, ms: 800 });
      ping(fx, tx, ty, { color: col, r: 44, ms: 900 });
      if (x.a === 'asat') debrisCloud(fx, Y, x.m, big ? 60 : 36);
      else debrisCloud(fx, Y, x.m, big ? 12 : 8);
    } else ping(fx, tx, ty, { color: 'var(--muted)', r: 16, ms: 500 });
  }
}

/** Play the month that just resolved. `card` shakes when you lost satellites. */
export function monthFx(fx, hm, before, { card, endBtn }) {
  pulse(endBtn);
  if (!hm || reduced()) return;
  let i = 0;
  for (const X of ['B', 'R']) for (const x of hm.acts[X]) {
    if (!['jam', 'dazzle', 'cyber', 'asat', 'coorb'].includes(x.a)) continue;
    later(i++ * 260 + (X === 'R' ? 120 : 0), () => strike(fx, X, x));
  }
  const lostB = before && Object.keys(hm.alive.B).some(m => hm.alive.B[m] < before[m]);
  if (lostB) later(Math.max(500, i * 260), () => shake(card));
}

/** Readouts: count from the value shown before the month to the real new value. */
export function countTo(el, from, to, fmt) {
  if (!el || from == null || from === to || reduced()) return;
  const text = el.textContent; // what render wrote: the real value, restored exactly when the count ends
  countUp(el, to, { from, ms: 600, fmt: v => (v === to ? text : fmt(v)) });
  setTimeout(() => { if (+el.dataset.mv === to) el.textContent = text; }, 680);
  flash(el);
}

/** Fragment totals on the orbit view count up after a kill. */
export function countFrags(svg, before, after, fmt) {
  if (reduced() || !before) return;
  svg.querySelectorAll('.od-deb-t').forEach((t, i) => {
    const s = SHELL_KEYS[i];
    if (!s || before[s] === after[s]) return;
    const text = t.textContent;
    countUp(t, after[s], { from: before[s], ms: 800, fmt: n => `${fmt(n)} frag.` });
    setTimeout(() => { if (t.isConnected) t.textContent = text; }, 880);
  });
}

/** The newest log entry rises in. */
export const logFx = li => { if (li) reveal([li]); };

/** The review: cards rise in and the solid chart lines draw on (dashed ones fade up). */
export function aarFx(box) {
  const parts = [...box.children];
  parts.forEach(e => e.classList.remove('m-in'));
  reveal(parts, { stagger: 50 });
  if (reduced()) return;
  box.querySelectorAll('.od-chart .od-line').forEach((p, i) => {
    if (p.classList.contains('dash')) { p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: 200 + i * 60, fill: 'backwards' }); return; }
    const L = p.getTotalLength();
    if (!L) return;
    p.animate([{ strokeDasharray: `${L} ${L}`, strokeDashoffset: L }, { strokeDasharray: `${L} ${L}`, strokeDashoffset: 0 }],
      { duration: 900, delay: 150 + i * 60, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'backwards' });
  });
}
