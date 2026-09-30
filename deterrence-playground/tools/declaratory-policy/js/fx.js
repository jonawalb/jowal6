// Tool-local motion for this data interactive, on top of shared/js/motion.js. Presentation only: nothing here
// changes a value, every animation is at most 700 ms, and every helper is a no-op under prefers-reduced-motion.
import { reduced, reveal, flash, pulse } from '../../../shared/js/motion.js';
export { reduced, reveal, flash, pulse };

const EASE = 'cubic-bezier(.2,.8,.2,1)';
const runs = new WeakMap();
const intFmt = v => Math.round(v).toLocaleString('en-US');

/** Show a number, counting from the value shown before (or from 0 on first show with intro) and
 *  cancelling any count already running on the element. Returns true when the value changed. */
export function num(el, to, { fmt = intFmt, ms = 450, intro = false, flashIt = false } = {}) {
  if (!el) return false;
  const had = el.dataset.fx != null;
  const from = had ? Number(el.dataset.fx) : (intro ? 0 : to);
  el.dataset.fx = to;
  cancelAnimationFrame(runs.get(el));
  const changed = had && from !== to;
  if (!Number.isFinite(to) || !Number.isFinite(from) || from === to || reduced()) { el.textContent = fmt(to); }
  else {
    const t0 = performance.now();
    const step = now => {
      const u = Math.max(0, Math.min(1, (now - t0) / ms)), e = 1 - Math.pow(1 - u, 3);
      el.textContent = fmt(u < 1 ? from + (to - from) * e : to);
      if (u < 1) runs.set(el, requestAnimationFrame(step));
    };
    el.textContent = fmt(from);
    runs.set(el, requestAnimationFrame(step));
  }
  if (changed && flashIt) flash(el);
  return changed;
}

/** Wipe an SVG group (or element) in from the left (lines and areas "draw" along the time axis) or up. */
export function wipeIn(el, ms = 700, elapsed = 0, dir = 'x') {
  if (!el || reduced() || !el.animate || elapsed >= ms) return;
  const from = dir === 'y' ? 'inset(100% 0 0 0)' : 'inset(0 100% 0 0)'; // 'y': bars rise from the baseline
  const a = el.animate([{ clipPath: from }, { clipPath: 'inset(0 0 0 0)' }], { duration: ms, easing: EASE });
  if (elapsed > 0) a.currentTime = elapsed; // a redraw during the intro continues it instead of restarting
}

/** Intro/transition bookkeeping for charts that rebuild their SVG on every draw: wipe on the first draw
 *  (continuing across redraws in the first 700 ms), cross-fade when the signature (view, filters) changes. */
export function chartMotion(ms = 700, dir = 'x') {
  let t0 = 0, last = null;
  return (el, sig) => {
    const now = performance.now();
    if (last === null) t0 = now;
    if (now - t0 < ms) wipeIn(el, ms, now - t0, dir);
    else if (sig !== last) fadeUp(el);
    last = sig;
  };
}

/** Stroke a single SVG path in along its length (solid strokes only). */
export function drawPath(path, ms = 650) {
  if (!path || reduced() || !path.getTotalLength) return;
  const L = path.getTotalLength();
  if (!L) return;
  path.animate([{ strokeDasharray: `${L} ${L}`, strokeDashoffset: L }, { strokeDasharray: `${L} ${L}`, strokeDashoffset: 0 }],
    { duration: ms, easing: EASE });
}

/** Fade an element up (quick cross-fade after a redraw so a view change does not jump). */
export function fadeUp(el, { ms = 300, from = 0.15 } = {}) {
  if (!el || reduced() || !el.animate) return;
  el.animate([{ opacity: from }, { opacity: 1 }], { duration: ms, easing: 'ease-out' });
}

/** Rise a freshly rendered card in. */
export function rise(el, { ms = 360, delay = 0, dy = 8 } = {}) {
  if (!el || reduced() || !el.animate) return;
  el.animate([{ opacity: 0, transform: `translateY(${dy}px)` }, { opacity: 1, transform: 'none' }],
    { duration: ms, delay, easing: EASE, fill: 'backwards' });
}

/** Grow bars from zero along an axis ('x', 'y', or 'xy' for dots), with a small stagger. */
export function grow(els, { axis = 'x', ms = 520, stagger = 30, origin } = {}) {
  if (reduced()) return;
  [...els].forEach((e, i) => {
    if (!e.animate) return;
    const s = axis === 'x' ? 'scaleX(0)' : axis === 'y' ? 'scaleY(0)' : 'scale(0)';
    e.style.transformOrigin = origin || (axis === 'x' ? 'left center' : axis === 'y' ? 'center bottom' : 'center');
    if (e instanceof SVGElement) e.style.transformBox = 'fill-box';
    e.animate([{ transform: s }, { transform: 'none' }], { duration: ms, delay: Math.min(i, 12) * stagger, easing: EASE, fill: 'backwards' });
  });
}

/** Before a re-render: remember positions of keyed rows. Call the returned function after the re-render to
 *  slide each row from its old position to its new one (FLIP). */
export function flipPrep(root, sel, key) {
  if (!root || reduced()) return () => {};
  const before = new Map([...root.querySelectorAll(sel)].map(e => [key(e), e.getBoundingClientRect().top]));
  return () => {
    const moves = [...root.querySelectorAll(sel)].map(e => [e, before.get(key(e)), e.getBoundingClientRect().top]);
    for (const [e, b, a] of moves) {
      if (b == null || Math.abs(b - a) < 1) continue;
      e.animate([{ transform: `translateY(${b - a}px)` }, { transform: 'none' }], { duration: 280, easing: EASE });
    }
  };
}

/** Before a re-render: remember an inline style value (e.g. a bar's width) per key. The returned function
 *  tweens each matching element from its old value to its new one. */
export function tweenPrep(root, sel, key, prop = 'width', ms = 260) {
  if (!root || reduced()) return () => {};
  const before = new Map([...root.querySelectorAll(sel)].map(e => [key(e), e.style[prop]]));
  return () => root.querySelectorAll(sel).forEach(e => {
    const b = before.get(key(e)), a = e.style[prop];
    if (b == null || b === a || !b || !a) return;
    e.animate([{ [prop]: b }, { [prop]: a }], { duration: ms, easing: EASE });
  });
}

/** Run fn once, just before el first scrolls into view (the margin starts it slightly early so the first
 *  visible frame is already animating). Runs at once without IntersectionObserver. */
export function onFirstView(el, fn, margin = '0px 0px 40px 0px') {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { fn(); return; }
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { threshold: 0, rootMargin: margin });
  io.observe(el);
}

/** Expanding ring at (x, y) in an SVG. Local copy of the shared ping, with the animation clock clamped at 0:
 *  a rAF timestamp can precede performance.now(), which made the shared one set a negative radius. */
export function ping(svg, x, y, { color = 'var(--accent)', r = 40, ms = 900, width = 2 } = {}) {
  if (!svg || reduced()) return;
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  for (const [k, v] of Object.entries({ cx: x, cy: y, r: 1, fill: 'none', stroke: color, 'stroke-width': width, 'pointer-events': 'none' })) c.setAttribute(k, v);
  svg.appendChild(c);
  const t0 = performance.now();
  const step = now => {
    const u = Math.max(0, Math.min(1, (now - t0) / ms)), e = 1 - Math.pow(1 - u, 3);
    c.setAttribute('r', (1 + r * e).toFixed(2)); c.setAttribute('opacity', (1 - u).toFixed(3));
    if (u < 1) requestAnimationFrame(step); else c.remove();
  };
  requestAnimationFrame(step);
}
