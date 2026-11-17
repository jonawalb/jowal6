// Scrubbable time charts: world deliveries by source, and the Taiwan-side lines.
import { el, svgPoint } from '../../../shared/js/mapkit.js';
import { HORIZON } from './model.js';

const PAD = { l: 44, r: 14, t: 16, b: 26 };
let W = 1000;
const xOf = t => PAD.l + (t / (HORIZON - 1)) * (W - PAD.l - PAD.r);
const tOf = (x, w) => Math.round(Math.max(0, Math.min(HORIZON - 1, (x - PAD.l) / (w - PAD.l - PAD.r) * (HORIZON - 1))));
function fit(svg) { W = Math.max(300, Math.round(svg.clientWidth || svg.parentElement.clientWidth || 1000)); }

function scrubbable(svg, onScrub) {
  if (svg._scrub) { svg._scrub.cb = onScrub; return; }
  svg._scrub = { cb: onScrub };
  let down = false;
  const go = e => { const vb = svg.viewBox.baseVal; svg._scrub.cb(tOf(svgPoint(svg, e)[0], vb ? vb.width : W)); };
  svg.addEventListener('pointerdown', e => { down = true; svg.setPointerCapture(e.pointerId); go(e); });
  svg.addEventListener('pointermove', e => { if (down) go(e); });
  svg.addEventListener('pointerup', () => { down = false; });
  svg.addEventListener('pointercancel', () => { down = false; });
}

function frame(g, H, dur, yOf, ticks) {
  if (dur > 0) {
    const x1 = xOf(Math.min(dur, HORIZON - 1));
    el('rect', { x: PAD.l, y: PAD.t, width: Math.max(0, x1 - PAD.l), height: H - PAD.t - PAD.b, class: 'band' }, g);
    if (dur < HORIZON) {
      el('line', { x1, x2: x1, y1: PAD.t, y2: H - PAD.b, class: 'band-end' }, g);
      el('text', { x: x1 + 4, y: PAD.t + 10, class: 'band-t' }, g, 'Blockade lifts');
    }
  }
  ticks.forEach(v => {
    el('line', { x1: PAD.l, x2: W - PAD.r, y1: yOf(v), y2: yOf(v), class: 'grid' }, g);
    el('text', { x: PAD.l - 6, y: yOf(v) + 4, class: 'ax-t', 'text-anchor': 'end' }, g, Math.round(v * 100) + '%');
  });
  const step = W < 600 ? 90 : 30;
  for (let t = 0; t < HORIZON; t += step) {
    el('line', { x1: xOf(t), x2: xOf(t), y1: H - PAD.b, y2: H - PAD.b + 4, class: 'ax' }, g);
    el('text', { x: xOf(t), y: H - 8, class: 'ax-t', 'text-anchor': 'middle' }, g, t === 0 ? 'Day 0' : String(t));
  }
}

function cursor(g, H, day) {
  const x = xOf(day);
  el('line', { x1: x, x2: x, y1: PAD.t - 6, y2: H - PAD.b, class: 'cur' }, g);
  el('circle', { cx: x, cy: PAD.t - 6, r: 6, class: 'cur-h' }, g);
}

const pts = (arr, yOf) => arr.map((v, i) => `${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`);

export const WORLD_LAYERS = [
  { k: 'tw', n: 'Made via Taiwan', c: 'var(--c1)' },
  { k: 'cn', n: 'Made in China', c: 'var(--c8)' },
  { k: 'alt', n: 'Alternatives', c: 'var(--c3)' },
  { k: 'inv', n: 'Drawn from stock', c: 'var(--c5)' },
];

/** Stacked deliveries: Taiwan chain, China-made, alternatives, stock drawdown. Shortfall below 100% is shaded;
 *  anything above 100% is backlog catch-up. */
export function drawWorld(svg, sim, dur, day, onScrub) {
  fit(svg);
  const H = W < 600 ? 230 : 280;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const g = el('g', {}, svg);
  const yOf = v => H - PAD.b - Math.min(1.3, v) / 1.3 * (H - PAD.t - PAD.b);
  frame(g, H, dur, yOf, [0, 0.25, 0.5, 0.75, 1, 1.25]);
  // Allocate each day's deliveries to sources in order; anything beyond supply came from stock.
  const parts = sim.days.map(d => {
    let left = d.delivered;
    const take = v => { const x = Math.min(left, v); left -= x; return x; };
    const tw = take(d.twSupply), cn = take(d.nonTw), alt = take(d.altSum);
    return { tw, cn, alt, inv: left };
  });
  const base = sim.days.map(() => 0);
  WORLD_LAYERS.forEach(L => {
    const top = parts.map((p, i) => base[i] + p[L.k]);
    if (top.every((v, i) => v - base[i] < 1e-6)) return;
    el('path', { d: `M${pts(top, yOf).join('L')}L${pts(base, yOf).reverse().join('L')}Z`, class: 'area', fill: L.c }, g);
    top.forEach((v, i) => { base[i] = v; });
  });
  const ones = sim.days.map(() => 1);
  const onTime = sim.days.map(d => d.onTime);
  el('path', { d: `M${pts(ones, yOf).join('L')}L${pts(onTime, yOf).reverse().join('L')}Z`, class: 'gap' }, g);
  el('path', { d: 'M' + pts(ones, yOf).join('L'), class: 'normal' }, g);
  cursor(g, H, day);
  scrubbable(svg, onScrub);
}

export const TW_LINES = [
  { k: 'grid', n: 'Grid supply', c: 'var(--c2)' },
  { k: 'lePower', n: 'Power to leading-edge fabs', c: 'var(--c6)' },
  { k: 'util', n: 'Fab and packaging output', c: 'var(--c1)' },
  { k: 'shipped', n: 'Chips leaving Taiwan', c: 'var(--c4)' },
];

export function drawTaiwan(svg, sim, dur, day, onScrub) {
  fit(svg);
  const H = W < 600 ? 220 : 250;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const g = el('g', {}, svg);
  const yOf = v => H - PAD.b - Math.min(1.1, Math.max(0, v)) / 1.1 * (H - PAD.t - PAD.b);
  frame(g, H, dur, yOf, [0, 0.5, 1]);
  TW_LINES.forEach(L => {
    const a = { d: 'M' + pts(sim.days.map(d => d[L.k]), yOf).join('L'), class: 'ln', stroke: L.c };
    if (L.k === 'shipped') a['stroke-dasharray'] = '5 3';
    el('path', a, g);
  });
  if (sim.throttle != null) {
    const x = xOf(sim.throttle);
    el('line', { x1: x, x2: x, y1: PAD.t, y2: H - PAD.b, class: 'mark' }, g);
    el('text', { x: x + 4, y: H - PAD.b - 6, class: 'mark-t' }, g, 'Fabs throttle');
  }
  cursor(g, H, day);
  scrubbable(svg, onScrub);
}
