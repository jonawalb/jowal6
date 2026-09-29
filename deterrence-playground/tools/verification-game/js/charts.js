// Charts for Trust but Verify: line charts over a swept input, the per-period timeline and the ROC curve.
import { el } from '../../../shared/js/mapkit.js';

const width = svg => Math.max(280, Math.round(svg.clientWidth || svg.parentElement.clientWidth || 600));
const pctT = v => Math.round(v * 100) + '%';

function frame(svg, { H0 = 250, xl, yl, ymax = 1 }) {
  const W = width(svg), narrow = W < 560, H = narrow ? H0 - 20 : H0;
  const P = { l: 46, r: 14, t: 14, b: 42 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const g = el('g', {}, svg);
  const Y = v => H - P.b - v / ymax * (H - P.t - P.b);
  for (let i = 0; i <= 4; i++) {
    const v = ymax * i / 4;
    el('line', { x1: P.l, x2: W - P.r, y1: Y(v), y2: Y(v), class: 'grid' }, g);
    el('text', { x: P.l - 6, y: Y(v) + 4, class: 'ax-t', 'text-anchor': 'end' }, g, pctT(v));
  }
  if (xl) el('text', { x: (P.l + W - P.r) / 2, y: H - 5, class: 'ax-l', 'text-anchor': 'middle' }, g, xl);
  if (yl) el('text', { x: 11, y: (P.t + H - P.b) / 2, class: 'ax-l', 'text-anchor': 'middle', transform: `rotate(-90 11 ${(P.t + H - P.b) / 2})` }, g, yl);
  return { W, H, P, g, Y, narrow };
}

/** Lines over a discrete x grid. series: [{ key, cls, vals }]; cur = index of current x (fractional ok). */
export function drawLines(svg, { xs, fmt, xl, series, cur, ymax = 1 }) {
  const f = frame(svg, { xl, ymax });
  const { W, H, P, g, Y, narrow } = f;
  const n = xs.length, X = i => P.l + i / Math.max(1, n - 1) * (W - P.l - P.r);
  const every = Math.ceil(n / (narrow ? 6 : 12));
  xs.forEach((v, i) => { if (i % every === 0 || i === n - 1) el('text', { x: X(i), y: H - P.b + 15, class: 'ax-t', 'text-anchor': 'middle' }, g, fmt(v)); });
  if (cur != null) el('line', { x1: X(cur), x2: X(cur), y1: P.t, y2: H - P.b, class: 'cur' }, g);
  series.forEach(s => {
    el('path', { d: s.vals.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(Math.min(ymax, v)).toFixed(1)}`).join(''), class: 'ln ' + s.cls }, g);
    if (cur != null) {
      const i0 = Math.floor(cur), t = cur - i0, v = s.vals[i0] + (s.vals[Math.min(n - 1, i0 + 1)] - s.vals[i0]) * t;
      el('circle', { cx: X(cur), cy: Y(Math.min(ymax, v)), r: 5, class: 'dot ' + s.cls }, g);
    }
  });
}

/** Per-period bars: chance of an inspection and of the violation, each period, along equilibrium play. */
export function drawTimeline(svg, tl) {
  const ymax = Math.max(0.2, Math.ceil(Math.max(...tl.map(t => Math.max(t.inspect, t.violate))) * 5) / 5);
  const { W, H, P, g, Y, narrow } = frame(svg, { H0: 220, xl: 'Period of the treaty', ymax });
  const n = tl.length, bw = (W - P.l - P.r) / n;
  tl.forEach((t, i) => {
    const x = P.l + i * bw;
    el('rect', { x: x + bw * 0.1, y: Y(t.inspect), width: bw * 0.38, height: Y(0) - Y(t.inspect), class: 'bar-i' }, g);
    el('rect', { x: x + bw * 0.52, y: Y(t.violate), width: bw * 0.38, height: Y(0) - Y(t.violate), class: 'bar-v' }, g);
    if (!narrow || n <= 12 || i % Math.ceil(n / 8) === 0) el('text', { x: x + bw / 2, y: H - P.b + 15, class: 'ax-t', 'text-anchor': 'middle' }, g, String(t.period));
  });
}

/** ROC curve: detection chance against false-alarm chance, with the equilibrium point. */
export function drawRoc(svg, G) {
  const W0 = width(svg), side = Math.min(W0, 420);
  const H = side, W = W0, P = { l: 46, r: 14, t: 14, b: 42 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const g = el('g', {}, svg);
  const s = Math.min(W - P.l - P.r, H - P.t - P.b), x0 = P.l + (W - P.l - P.r - s) / 2;
  // Log-ish x axis is hard to read; use a square-root scale so small alphas are visible.
  const X = a => x0 + Math.sqrt(a) * s, Y = v => P.t + (1 - v) * s;
  [0, 0.01, 0.05, 0.1, 0.25, 0.5, 1].forEach(a => {
    el('line', { x1: X(a), x2: X(a), y1: P.t, y2: P.t + s, class: 'grid' }, g);
    el('text', { x: X(a), y: P.t + s + 15, class: 'ax-t', 'text-anchor': 'middle' }, g, a < 0.1 && a > 0 ? (a * 100) + '%' : pctT(a));
  });
  [0, 0.25, 0.5, 0.75, 1].forEach(v => {
    el('line', { x1: x0, x2: x0 + s, y1: Y(v), y2: Y(v), class: 'grid' }, g);
    el('text', { x: x0 - 6, y: Y(v) + 4, class: 'ax-t', 'text-anchor': 'end' }, g, pctT(v));
  });
  el('text', { x: x0 + s / 2, y: H - 5, class: 'ax-l', 'text-anchor': 'middle' }, g, 'False-alarm chance α (square-root scale)');
  el('path', { d: `M${X(0)} ${Y(0)}L${X(1)} ${Y(1)}`, class: 'chance' }, g);
  const pts = [];
  for (let i = 0; i <= 120; i++) { const a = (i / 120) ** 2; pts.push(`${i ? 'L' : 'M'}${X(a).toFixed(1)} ${Y(G.roc(a)).toFixed(1)}`); }
  el('path', { d: pts.join(''), class: 'ln roc' }, g);
  el('line', { x1: X(G.alpha), x2: X(G.alpha), y1: Y(0), y2: Y(G.detect), class: 'cur' }, g);
  el('circle', { cx: X(G.alpha), cy: Y(G.detect), r: 6, class: 'dot eq' }, g);
  const right = X(G.alpha) < x0 + s - 150;
  el('text', { x: X(G.alpha) + (right ? 10 : -10), y: Y(G.detect) - 8, class: 'eq-t', 'text-anchor': right ? 'start' : 'end' }, g,
    `Equilibrium: α ${(G.alpha * 100).toFixed(G.alpha < 0.01 ? 2 : 1)}%, detection ${pctT(G.detect)}`);
}
