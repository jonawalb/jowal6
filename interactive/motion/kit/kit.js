// Motion kit: a tiny timeline for looping SVG trailers.
// Usage (inside a trailer's module script):
//   import { run, seg, ease, lerp, captions, endCard, bg } from '../_kit/kit.js';
//   const svg = document.querySelector('svg'); bg(svg);
//   run({ duration: 14, poster: 9.5, frame: t => { ... draw at time t (seconds) ... } });
// ?t=5 freezes at 5 s (for screenshots); prefers-reduced-motion or ?poster shows the poster frame.
// The loop pauses while the tab or frame is hidden, and restarts at 0 when the page is shown again.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
/** 0 before a, 1 after b, linear between. */
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ease = {
  out: u => 1 - Math.pow(1 - u, 3),
  in: u => u * u * u,
  inOut: u => (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  back: u => { const c = 1.6; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },
};
const NS = 'http://www.w3.org/2000/svg';
export function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

/** Background: vignette, a faint plotting grid and film grain. Call first so it sits underneath. */
export function bg(svg, { grid = 80 } = {}) {
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <radialGradient id="kit-vig" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#15291f"/><stop offset="1" stop-color="#070f0b"/></radialGradient>
    <filter id="kit-noise"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .5 0"/></filter>
    <filter id="kit-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  const g = el('g', { id: 'kit-bg' });
  svg.insertBefore(g, svg.firstChild.nextSibling);
  el('rect', { width: 1600, height: 1000, fill: 'url(#kit-vig)' }, g);
  const gr = el('g', { class: 'kit-grid' }, g);
  for (let x = grid; x < 1600; x += grid) el('line', { x1: x, y1: 0, x2: x, y2: 1000 }, gr);
  for (let y = grid; y < 1000; y += grid) el('line', { x1: 0, y1: y, x2: 1600, y2: y }, gr);
  el('rect', { width: 1600, height: 1000, filter: 'url(#kit-noise)', class: 'kit-grain' }, svg);
  return g;
}

/** Captions: [[start, end, text], ...] shown bottom-left with an amber tick. Returns an updater f(t). */
export function captions(svg, list, { x = 72, y = 930 } = {}) {
  const g = el('g', {}, svg);
  const bar = el('rect', { x, y: y - 22, width: 6, height: 30, class: 'kit-cap-bar' }, g);
  const tx = el('text', { x: x + 22, y, class: 't-cap' }, g);
  return t => {
    const c = list.find(([a, b]) => t >= a && t < b);
    if (!c) { g.setAttribute('opacity', 0); return; }
    const [a, b, s] = c, u = Math.min(seg(t, a, a + .35), 1 - seg(t, b - .35, b));
    if (tx.textContent !== s) tx.textContent = s;
    g.setAttribute('opacity', u);
    tx.setAttribute('transform', `translate(${(1 - ease.out(seg(t, a, a + .5))) * -14},0)`);
  };
}

/** End card: title lockup plus a "Play" pill, faded in over [a, b]. Returns an updater f(t). */
export function endCard(svg, { kicker, title, line, cta = 'Play it' }) {
  const g = el('g', { opacity: 0 }, svg);
  el('rect', { width: 1600, height: 1000, fill: '#070f0b', opacity: .82 }, g);
  el('text', { x: 800, y: 400, 'text-anchor': 'middle', class: 't-kicker' }, g).textContent = kicker;
  el('text', { x: 800, y: 505, 'text-anchor': 'middle', class: 't-title' }, g).textContent = title;
  const l = el('text', { x: 800, y: 575, 'text-anchor': 'middle', class: 't-cap', fill: 'var(--muted)' }, g);
  l.textContent = line; l.style.fill = 'var(--muted)';
  const pill = el('g', {}, g);
  el('rect', { x: 800 - 110, y: 625, width: 220, height: 58, rx: 29, fill: 'var(--amber)' }, pill);
  el('text', { x: 800, y: 661, 'text-anchor': 'middle', class: 't-cta' }, pill).textContent = cta + '  →';
  return (t, a, b) => {
    const u = ease.out(seg(t, a, a + .8)) * (1 - seg(t, b - .4, b));
    g.setAttribute('opacity', u);
    pill.setAttribute('transform', `translate(0,${(1 - ease.back(seg(t, a + .3, a + 1.1))) * 18})`);
  };
}

/** Run the loop. frame(t) draws the scene at time t seconds. */
export function run({ duration, poster, frame }) {
  const q = new URLSearchParams(location.search);
  const still = q.has('t') ? +q.get('t') : (q.has('poster') || matchMedia('(prefers-reduced-motion: reduce)').matches ? poster : null);
  if (still != null) { frame(still); return; }
  let t0 = performance.now(), raf = 0;
  const tick = now => { frame(((now - t0) / 1000) % duration); raf = requestAnimationFrame(tick); };
  const start = () => { cancelAnimationFrame(raf); t0 = performance.now(); raf = requestAnimationFrame(tick);
    // Tell a parent carousel how long one loop runs, so it can move on when the trailer ends.
    if (parent !== window) parent.postMessage({ trailer: location.pathname, duration }, '*'); };
  document.addEventListener('visibilitychange', () => document.hidden ? cancelAnimationFrame(raf) : start());
  addEventListener('message', e => { if (e.data === 'restart') start(); });
  start();
}
