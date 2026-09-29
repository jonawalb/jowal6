// Charts: belief trajectories, the dominance region, and the three defense views.
import { el, f2, pct } from './ui.js';
import { cell, RHO_RANGE, TAU_RANGE } from './experiments.js';

/** Plot frame with linear or log x. box: { W, H, m, x:[a,b], y:[a,b], xlog } */
const narrow = svg => (svg.clientWidth || 800) < 560;
export function frame(svg, box) {
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${box.W} ${box.H}`);
  const { m } = box, iw = box.W - m.l - m.r, ih = box.H - m.t - m.b;
  const lx = v => box.xlog ? Math.log10(v) : v;
  const [x0, x1] = box.x.map(lx);
  const sx = v => m.l + (lx(v) - x0) / (x1 - x0) * iw;
  const sy = v => m.t + ih - (v - box.y[0]) / (box.y[1] - box.y[0]) * ih;
  const ix = px => { const t = x0 + (px - m.l) / iw * (x1 - x0); return box.xlog ? 10 ** t : t; };
  const iy = py => box.y[0] + (m.t + ih - py) / ih * (box.y[1] - box.y[0]);
  return { g: el('g', {}, svg), sx, sy, ix, iy, iw, ih, m, box };
}
export function axes(F, { xt = [], yt = [], xl = '', yl = '', xf = String, yf = String, grid = false }) {
  const { g, sx, sy, m, box } = F;
  const a = el('g', { class: 'axis' }, g);
  if (grid) yt.forEach(v => el('line', { x1: m.l, x2: box.W - m.r, y1: sy(v), y2: sy(v), class: 'grid' }, a));
  el('line', { x1: m.l, x2: box.W - m.r, y1: box.H - m.b, y2: box.H - m.b }, a);
  el('line', { x1: m.l, x2: m.l, y1: m.t, y2: box.H - m.b }, a);
  xt.forEach(v => { el('line', { x1: sx(v), x2: sx(v), y1: box.H - m.b, y2: box.H - m.b + 4 }, a); el('text', { x: sx(v), y: box.H - m.b + 16, 'text-anchor': 'middle' }, a, xf(v)); });
  yt.forEach(v => el('text', { x: m.l - 6, y: sy(v) + 4, 'text-anchor': 'end' }, a, yf(v)));
  if (xl) el('text', { x: m.l + F.iw / 2, y: box.H - 3, 'text-anchor': 'middle', class: 'ax-t' }, a, xl);
  if (yl) el('text', { x: 12, y: m.t + F.ih / 2, 'text-anchor': 'middle', class: 'ax-t', transform: `rotate(-90 12 ${m.t + F.ih / 2})` }, a, yl);
}
const path = (pts, sx, sy) => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join('');

/** Belief trajectories with ±1 sd bands, the true state and the signals. */
export function drawTrajectory(svg, tr, p) {
  const all = [...tr.neu, ...tr.att].flatMap(q => [q.mu - 1 / Math.sqrt(q.rho), q.mu + 1 / Math.sqrt(q.rho)]).concat([p.theta, p.c]);
  let lo = Math.max(-4, Math.min(...all)), hi = Math.min(4, Math.max(...all));
  if (hi - lo < 2.4) { const mid = (hi + lo) / 2; lo = mid - 1.2; hi = mid + 1.2; }
  const pad = (hi - lo) * 0.06; lo -= pad; hi += pad;
  const F = frame(svg, { W: narrow(svg) ? 420 : 680, H: narrow(svg) ? 300 : 290, m: { l: 54, r: 14, t: 12, b: 34 }, x: [0, p.T], y: [lo, hi] });
  const step = p.T <= 10 ? 1 : p.T <= 25 ? 5 : 10;
  const xt = []; for (let t = 0; t <= p.T; t += step) xt.push(t);
  const yt = []; const ys = (hi - lo) > 4 ? 1 : 0.5; for (let v = Math.ceil(lo / ys) * ys; v <= hi; v += ys) yt.push(+v.toFixed(2));
  axes(F, { xt, yt, xl: 'Signals received', yl: 'Belief about θ (threat)', yf: f2, grid: true });
  const { g, sx, sy } = F;
  const band = (arr, cls) => {
    const up = arr.map((q, t) => [t, Math.min(hi, q.mu + 1 / Math.sqrt(q.rho))]), dn = arr.map((q, t) => [t, Math.max(lo, q.mu - 1 / Math.sqrt(q.rho))]).reverse();
    el('path', { d: path(up, sx, sy) + path(dn, sx, sy).replace('M', 'L') + 'Z', class: 'band ' + cls }, g);
  };
  band(tr.neu, 'neu'); band(tr.att, 'att');
  el('line', { x1: sx(0), x2: sx(p.T), y1: sy(p.theta), y2: sy(p.theta), class: 'truth' }, g);
  el('text', { x: sx(0) + 6, y: sy(p.theta) + 15, class: 'lbl truth-l' }, g, Math.abs(p.c - p.theta) > 0.02 ? `true θ = ${f2(p.theta)}` : `true θ = ${f2(p.theta)} = action threshold c`);
  tr.sig.forEach((s, t) => { if (s > lo && s < hi) el('circle', { cx: sx(t + 1), cy: sy(s), r: 2.6, class: 'sig' + (p.kind === 'fab' ? ' fab' : '') }, g); });
  el('path', { d: path(tr.neu.map((q, t) => [t, q.mu]), sx, sy), class: 'ln neu' }, g);
  el('path', { d: path(tr.att.map((q, t) => [t, q.mu]), sx, sy), class: 'ln att' }, g);
  if (p.c > lo && p.c < hi && Math.abs(p.c - p.theta) > 0.02) {
    el('line', { x1: sx(0), x2: sx(p.T), y1: sy(p.c), y2: sy(p.c), class: 'thr' }, g);
    el('text', { x: sx(0) + 4, y: sy(p.c) - 5, class: 'lbl thr-l' }, g, `act if θ > ${f2(p.c)}`);
  }
}

const COL = { lam: '--c2', fab: '--c1' };
/** Region map over cost ratio ρ (log x) and stake τ (y). Returns the frame so the caller can drag. */
export function drawRegion(svg, tab, cur) {
  const F = frame(svg, { W: narrow(svg) ? 420 : 760, H: narrow(svg) ? 320 : 300, m: { l: 50, r: 12, t: 12, b: 40 }, x: RHO_RANGE, y: TAU_RANGE, xlog: true });
  const { g, sx, sy } = F, N = 44;
  const lay = el('g', { 'shape-rendering': 'crispEdges', opacity: 0.4 }, g);
  for (let j = 0; j < N; j++) {
    const tau = TAU_RANGE[0] + (j + 0.5) / N * (TAU_RANGE[1] - TAU_RANGE[0]);
    let run = null;
    const flush = i => { if (!run) return; const xa = sx(10 ** (-2 + 4 * run.i0 / N)), xb = sx(10 ** (-2 + 4 * i / N));
      const ya = sy(TAU_RANGE[0] + (j + 1) / N * 9.9), yb = sy(TAU_RANGE[0] + j / N * 9.9);
      el('rect', { x: xa, y: ya, width: xb - xa + 0.6, height: yb - ya + 0.6, fill: `var(${COL[run.k]})` }, lay); };
    for (let i = 0; i < N; i++) {
      const k = cell(tab, 10 ** (-2 + 4 * (i + 0.5) / N), tau).dom ? 'lam' : 'fab';
      if (!run || run.k !== k) { flush(i); run = { k, i0: i }; }
    }
    flush(N);
  }
  axes(F, { xt: [0.01, 0.1, 1, 10, 100], yt: [0.1, 2, 4, 6, 8, 10], xf: v => String(v), yf: v => String(v),
    xl: 'Cost ratio ρ (high = fabrication is cheap)', yl: 'Stake τ' });
  el('line', { x1: sx(cur.rho), x2: sx(cur.rho), y1: F.m.t, y2: F.box.H - F.m.b, class: 'now' }, g);
  el('line', { x1: F.m.l, x2: F.box.W - F.m.r, y1: sy(cur.tau), y2: sy(cur.tau), class: 'now' }, g);
  el('circle', { cx: sx(cur.rho), cy: sy(cur.tau), r: 6, class: 'mark' }, g);
  return F;
}

/** Disclose-vs-reassure map over captured gain λg (x) and budget (y). Cells: which leaves less distortion. */
export function drawDefenseMap(svg, grid, cur) {
  const F = frame(svg, { W: narrow(svg) ? 420 : 560, H: 250, m: { l: 50, r: 12, t: 10, b: 40 }, x: [0.05, 1.05], y: [0.5, 10.5] });
  const { g, sx, sy } = F;
  const lay = el('g', { 'shape-rendering': 'crispEdges' }, g);
  grid.forEach(c => el('rect', { x: sx(c.lg - 0.025), y: sy(c.b + 0.5), width: sx(c.lg + 0.025) - sx(c.lg - 0.025) + 0.5, height: sy(c.b - 0.5) - sy(c.b + 0.5) + 0.5,
    fill: `var(${c.reassure < c.disclose ? '--c3' : '--c1'})`, 'fill-opacity': 0.15 + 0.6 * Math.min(1, Math.abs(c.reassure - c.disclose)) }, lay));
  axes(F, { xt: [0.1, 0.3, 0.5, 0.7, 0.9], yt: [1, 4, 7, 10], xf: f2, xl: 'Captured weight on evidence λg (1 = not captured)', yl: 'Budget' });
  el('line', { x1: sx(0.3), x2: sx(0.3), y1: F.m.t, y2: F.box.H - F.m.b, class: 'bound' }, g);
  el('text', { x: sx(0.3) + 4, y: F.m.t + 12, class: 'lbl' }, g, 'λg < 0.3');
  el('circle', { cx: sx(cur.lg), cy: sy(cur.b), r: 6, class: 'mark' }, g);
  return F;
}

/** Fear and anger: campaign then 80 truthful signals. */
export function drawRecovery(svg, fear, anger) {
  const n1 = fear.campaign.length, n = n1 + fear.recovery.length;
  const all = [...fear.campaign, ...fear.recovery, ...anger.campaign, ...anger.recovery, 0];
  const hi = Math.max(...all) * 1.1, lo = Math.min(0, ...all) - 0.05;
  const F = frame(svg, { W: narrow(svg) ? 420 : 560, H: 250, m: { l: 50, r: 12, t: 12, b: 36 }, x: [0, n], y: [lo, hi] });
  const { g, sx, sy } = F;
  el('rect', { x: sx(0), y: F.m.t, width: sx(n1) - sx(0), height: F.ih, class: 'phase' }, g);
  axes(F, { xt: [0, 20, 40, 60, 80, 100, 120], yt: [0, +(hi / 2).toFixed(1), +(hi * 0.9).toFixed(1)], yf: f2, xl: 'Signals (shaded: campaign; then truthful news)', yl: 'Belief μ' });
  el('line', { x1: sx(0), x2: sx(n), y1: sy(0), y2: sy(0), class: 'truth' }, g);
  const pts = r => [...r.campaign, ...r.recovery].map((v, i) => [i + 1, v]);
  el('path', { d: path(pts(fear), sx, sy), class: 'ln fear' }, g);
  el('path', { d: path(pts(anger), sx, sy), class: 'ln anger' }, g);
}

/** Pointer drag on a plot, reporting data coordinates. */
export function dragPlot(svg, getF, onMove) {
  const pt = e => {
    const F = getF(); if (!F) return;
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    onMove(F.ix((e.clientX - r.left) / r.width * vb.width), F.iy((e.clientY - r.top) / r.height * vb.height));
  };
  let down = false;
  svg.addEventListener('pointerdown', e => { down = true; svg.setPointerCapture(e.pointerId); pt(e); });
  svg.addEventListener('pointermove', e => { if (down) pt(e); });
  svg.addEventListener('pointerup', () => { down = false; });
  svg.addEventListener('pointercancel', () => { down = false; });
}
