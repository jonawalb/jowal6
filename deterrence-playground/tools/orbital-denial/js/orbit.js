// The orbit view: a schematic half-disk, not to scale. Your constellations on the left, Red's on the right,
// fragments as speckle in each shell. Each half-shell is a button that picks that mission as the target.
import { SHELL_KEYS, SHELLS, MISSIONS, MISSION_KEYS, BACKGROUND } from '../data/params.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 640, H = 350, CX = 320, CY = 332, RE = 58;
const RADII = { low: 96, high: 146, meo: 206, geo: 268 };
const MISSION_OF = Object.fromEntries(MISSION_KEYS.map(m => [MISSIONS[m].shell, m]));
const el = (tag, attrs, parent, text) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
};
const pt = (r, deg) => [CX + r * Math.cos(deg * Math.PI / 180), CY - r * Math.sin(deg * Math.PI / 180)];
const arc = (r, a0, a1) => { const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1); return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 0 ${a0 > a1 ? 1 : 0} ${x1.toFixed(1)},${y1.toFixed(1)}`; };
const fmt = n => Math.round(n).toLocaleString('en-US');

/** Stable pseudo-random speckle positions per shell. */
function speckle(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const SPECK = Object.fromEntries(SHELL_KEYS.map((s, i) => { const r = speckle(99 + i); return [s, Array.from({ length: 420 }, () => [r() * 180, (r() - 0.5) * 18])]; }));

export function createOrbit(svg, { onPick }) {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let pickMode = null; // 'enemy' | 'own' | null
  const root = el('g', {}, svg);

  function draw(v, opts = {}) {
    pickMode = opts.pick || null;
    root.textContent = '';
    el('path', { d: `M${CX - RE},${CY} A${RE},${RE} 0 0 1 ${CX + RE},${CY} Z`, class: 'od-earth' }, root);
    el('text', { x: CX, y: CY - 16, class: 'od-earth-t' }, root, 'Earth');
    el('line', { x1: CX, y1: CY - RE - 4, x2: CX, y2: 22, class: 'od-divider' }, root);
    el('text', { x: CX - 12, y: 18, class: 'od-side you end' }, root, 'Yours');
    el('text', { x: CX + 12, y: 18, class: 'od-side red' }, root, 'Red\'s');
    for (const s of SHELL_KEYS) {
      const r = RADII[s], m = MISSION_OF[s];
      el('path', { d: arc(r, 180, 0), class: 'od-shell' }, root);
      // Fragment speckle: dot count grows with the square root of the fragment count.
      const D = v.debris[s], nd = Math.min(420, Math.round(Math.sqrt(D) * 3.2));
      const g = el('g', { class: 'od-deb' }, root);
      for (let i = 0; i < nd; i++) { const [a, dr] = SPECK[s][i]; const [x, y] = pt(r + dr, a); el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 0.9 }, g); }
      for (const side of ['B', 'R']) drawSide(v, s, m, r, side);
      el('text', { x: 0, y: 0, class: 'od-shell-t', transform: `translate(${CX - r - 13},${CY - 4}) rotate(-90)` }, root, SHELLS[s].name);
      el('text', { x: 0, y: 0, class: 'od-deb-t', transform: `translate(${CX + r + 23},${CY - 4}) rotate(-90)` }, root, `${fmt(D)} frag.`);
    }
    el('text', { x: W - 6, y: 18, class: 'od-note end' }, root, 'Schematic, not to scale');
  }

  function drawSide(v, s, m, r, side) {
    const sd = v.sides[side], M = MISSIONS[m], n0 = Math.max(M.n0, sd.alive[m] + sd.pending[m]);
    const [a0, a1] = side === 'B' ? [172, 98] : [82, 8];
    const cls = side === 'B' ? 'you' : 'red';
    const mine = pickMode === 'enemy' ? side === 'R' : pickMode === 'own' ? side === 'B' : false;
    const target = mine && validFn(side, m);
    const g = el('g', { class: `od-grp ${cls}${target ? ' pick' : ''}${mine && !target ? ' off' : ''}`, 'data-m': m, 'data-side': side }, root);
    if (target) { g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', `${side === 'B' ? 'Your' : 'Red\'s'} ${M.name}`); }
    el('path', { d: arc(r, a0 + 3, a1 - 3), class: 'od-hit' }, g);
    const deg = 1 - (sd.cap[m] / Math.max(1e-9, Math.min(1, sd.alive[m] / M.need)));
    if (deg > 0.02 && sd.alive[m] > 0) el('path', { d: arc(r, a0, a1), class: 'od-jam', style: `stroke-opacity:${Math.min(0.85, 0.2 + deg)}` }, g);
    for (let i = 0; i < n0; i++) {
      const [x, y] = pt(r, a0 + (a1 - a0) * (n0 === 1 ? 0.5 : i / (n0 - 1)));
      const k = i < sd.alive[m] ? 'on' : i < sd.alive[m] + sd.pending[m] ? 'pend' : 'lost';
      if (k === 'lost') { el('path', { d: `M${x - 3},${y - 3}l6,6m0,-6l-6,6`, class: 'od-lost' }, g); continue; }
      el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: M.n0 > 12 ? 2.6 : 3.8, class: `od-sat ${k}` }, g);
    }
    const [tx, ty] = pt(r - 12, (a0 + a1) / 2);
    el('text', { x: tx.toFixed(1), y: ty.toFixed(1), class: `od-grp-t ${cls}` }, g, `${M.short} ${sd.alive[m]}/${M.need}`);
    if (target) {
      const go = () => onPick(m);
      g.addEventListener('click', go);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    }
  }
  // Groups are dimmed when the chosen action cannot reach them (the caller passes `valid`).
  let validFn = () => true;
  return { draw: (v, o = {}) => { validFn = o.valid || (() => true); draw(v, o); } };
}

export const BG_NOTE = `Everyone else's satellites (${BACKGROUND.low.toLocaleString('en-US')} in low LEO, ${BACKGROUND.high.toLocaleString('en-US')} in high LEO) are not drawn but share the debris.`;
