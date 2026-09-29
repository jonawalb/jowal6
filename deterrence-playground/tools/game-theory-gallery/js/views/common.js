// Figure primitives shared by several models: the issue bar, value bars, region rasters.
import { el, frame, axes, f2, stext, vw } from '../ui.js';

/**
 * Horizontal issue space X = [0, 1] with a shaded range and labeled markers.
 * o: { rows: [{ y, label, lo, hi, cls, empty }], marks: [{ x, label, cls, row }], pts: [x...] | null, ptOk: fn }
 * Returns the frame so callers can add drag handling.
 */
export function issueBar(svg, o) {
  const H = 82 + o.rows.length * 58;
  const F = frame(svg, { W: 760, H, m: { l: 24, r: 24, t: 34, b: 34 }, x: [0, 1], y: [0, 1] });
  const { g, sx } = F;
  const top = F.m.t;
  o.rows.forEach((r, i) => {
    const y = top + i * 58 + 8;
    stext(g, { x: sx(0), y: y - 6, class: 'rowlab' }, r.label);
    el('rect', { x: sx(0), y, width: sx(1) - sx(0), height: 18, class: 'track' }, g);
    if (!r.empty && r.hi > r.lo) {
      const a = Math.max(0, r.lo), b = Math.min(1, r.hi);
      if (b > a) el('rect', { x: sx(a), y, width: sx(b) - sx(a), height: 18, class: 'band ' + (r.cls || '') }, g);
    }
    if (r.empty) {
      const a = Math.max(0, Math.min(r.lo, r.hi)), b = Math.min(1, Math.max(r.lo, r.hi));
      el('rect', { x: sx(a), y: y + 6, width: Math.max(2, sx(b) - sx(a)), height: 6, class: 'gapbar' }, g);
    }
  });
  if (o.pts) {
    const y = top + 17;
    o.pts.forEach(x => el('circle', { cx: sx(x), cy: y, r: 5.5, class: 'fpt' + (o.ptOk(x) ? ' ok' : '') }, g));
  }
  const hasBelow = (o.marks || []).some(m => m.below && (m.row || 0) === o.rows.length - 1);
  const bottom = top + (o.rows.length - 1) * 58 + 26 + (hasBelow ? 18 : 0);
  (o.marks || []).forEach(m => {
    if (m.x < -0.001 || m.x > 1.001) return;
    const row = m.row || 0, y0 = top + row * 58 + 4, y1 = y0 + 26;
    el('line', { x1: sx(m.x), x2: sx(m.x), y1: y0, y2: y1, class: 'mk ' + (m.cls || '') }, g);
    stext(g, { x: sx(m.x), y: m.below ? y1 + 14 : y0 - 3, 'text-anchor': 'middle', class: 'mkl ' + (m.cls || '') }, m.label);
  });
  const ax = el('g', { class: 'axis' }, g);
  [0, 0.25, 0.5, 0.75, 1].forEach(v => {
    el('line', { x1: sx(v), x2: sx(v), y1: bottom + 4, y2: bottom + 9 }, ax);
    el('text', { x: sx(v), y: bottom + 22, 'text-anchor': 'middle' }, ax, f2(v));
  });
  el('text', { x: sx(0), y: H - 2, class: 'ax-t' }, ax, o.left || 'B’s ideal (x = 0)');
  el('text', { x: sx(1), y: H - 2, class: 'ax-t', 'text-anchor': 'end' }, ax, o.right || 'A’s ideal (x = 1)');
  return F;
}

/**
 * Horizontal value bars. bars: [{ label, v, cls, note }], domain [lo, hi]. Optional ref line.
 */
export function valueBars(svg, bars, domain, o = {}) {
  const H = 26 + bars.length * 40 + 44;
  const W = vw(svg);
  const F = frame(svg, { W, H, m: { l: Math.min(o.left || 220, Math.round(W * 0.4)), r: 56, t: 14, b: 46 }, x: domain, y: [0, 1] });
  const { g, sx } = F;
  bars.forEach((b, i) => {
    const y = F.m.t + i * 40;
    stext(g, { x: F.m.l - 10, y: y + 17, 'text-anchor': 'end', class: 'barlab' }, b.label);
    const x0 = sx(Math.max(domain[0], Math.min(0, domain[1]))), x1 = sx(Math.max(domain[0], Math.min(b.v, domain[1])));
    el('rect', { x: Math.min(x0, x1), y, width: Math.max(1, Math.abs(x1 - x0)), height: 24, class: 'vbar ' + (b.cls || '') }, g);
    el('text', { x: Math.max(x0, x1) + 6, y: y + 17, class: 'barv' }, g, (b.fmt || f2)(b.v));
  });
  if (o.ref != null) el('line', { x1: sx(o.ref), x2: sx(o.ref), y1: F.m.t - 4, y2: H - F.m.b + 2, class: 'refl' }, g);
  axes(F, { xt: o.ticks || [domain[0], (domain[0] + domain[1]) / 2, domain[1]], xl: o.xl || '' });
  return F;
}

/**
 * Region raster over a 2-D parameter grid. classify(x, y) -> key; colors: key -> CSS variable.
 * Draws run-length rects per row at low opacity.
 */
export function region(F, nx, ny, classify, colors) {
  const { g, sx, sy, box } = F;
  const layer = el('g', { class: 'raster', 'shape-rendering': 'crispEdges', opacity: 0.34 }, g);
  const dx = (box.x[1] - box.x[0]) / nx, dy = (box.y[1] - box.y[0]) / ny;
  for (let j = 0; j < ny; j++) {
    const yv = box.y[0] + (j + 0.5) * dy;
    let run = null;
    const flush = i => {
      if (!run || !colors[run.key]) return;
      const x0 = sx(box.x[0] + run.i0 * dx), x1 = sx(box.x[0] + i * dx);
      const yT = sy(box.y[0] + (j + 1) * dy), yB = sy(box.y[0] + j * dy);
      el('rect', { x: x0, y: yT, width: x1 - x0 + 0.8, height: yB - yT + 0.8, fill: `var(${colors[run.key]})` }, layer);
    };
    for (let i = 0; i < nx; i++) {
      const k = classify(box.x[0] + (i + 0.5) * dx, yv);
      if (!run || run.key !== k) { flush(i); run = { key: k, i0: i }; }
    }
    flush(nx);
  }
  return layer;
}

/** Mark the current point on a plot. */
export const mark = (F, x, y) => el('circle', { cx: F.sx(x), cy: F.sy(y), r: 7, class: 'mark' }, F.g);
