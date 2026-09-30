// Small motion helpers local to this tool (presentation only). Every helper jumps straight to the end state
// under prefers-reduced-motion, and the last frame always writes the true value.
import { reduced } from '../../../shared/js/motion.js';
import { skin } from '../../../shared/js/skin.js';

export { reduced };
export const trailer = () => skin() === 'trailer';
export const ease = u => 1 - Math.pow(1 - u, 3);
const runs = new WeakMap();

/** Count el's text from `from` to `to`, formatting each frame with fmt. A newer call on the same element wins. */
export function count(el, from, to, fmt, ms = 600) {
  if (!el) return;
  const tok = {};
  runs.set(el, tok);
  if (reduced() || from == null || !Number.isFinite(from) || !Number.isFinite(to) || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  el.textContent = fmt(from);
  const step = now => {
    if (runs.get(el) !== tok) return;
    const u = Math.min(1, (now - t0) / ms);
    el.textContent = fmt(u < 1 ? from + (to - from) * ease(u) : to);
    if (u < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Run frame(u) for u in [0, 1] over ms; returns a cancel function. */
export function tween(ms, frame, delay = 0) {
  let on = true;
  if (reduced()) { frame(1); return () => {}; }
  const t0 = performance.now() + delay;
  const step = now => {
    if (!on) return;
    const u = Math.max(0, Math.min(1, (now - t0) / ms));
    frame(ease(u));
    if (u < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  return () => { on = false; frame(1); };
}

/** Restart a CSS animation class on an element (optionally after a delay set as --fx-d). */
export function replay(el, cls, delayMs = 0) {
  if (!el || reduced()) return;
  el.classList.remove(cls);
  el.style.setProperty('--fx-d', delayMs + 'ms');
  void el.getBoundingClientRect();
  el.classList.add(cls);
  el.addEventListener('animationend', function done(e) { if (e.target === el) { el.classList.remove(cls); el.removeEventListener('animationend', done); } });
}

/** Dice tumble: flicker random two-decimal rolls for ms, then settle on the element's real text. */
export function tumble(el, ms = 450) {
  if (!el || reduced()) return;
  const real = el.textContent, t0 = performance.now();
  const step = now => {
    if (now - t0 >= ms || !el.isConnected) { el.textContent = real; el.classList.remove('fx-tumbling'); return; }
    el.textContent = Math.random().toFixed(2);
    setTimeout(() => requestAnimationFrame(step), 45);
  };
  el.classList.add('fx-tumbling');
  requestAnimationFrame(step);
}

/** Parse the first number in a string (handles the Unicode minus). */
export const num = s => { const m = String(s ?? '').replace('−', '-').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : NaN; };
