// Phase plane for the two-party model: vector field, the two equilibrium lines (Richardson's "reaction
// lines"), the equilibrium, the separatrix of a saddle, trajectories from clicked starting points and, when
// switched on, the real U.S.-Soviet/Russian stockpile path with a fitted path beside it. Plus the time chart.
import { el } from '../../../shared/js/mapkit.js';
import { equilibrium, stable2, separatrix, deriv2, path2 } from './model.js';

export const DOM = 50; // both axes run 0..DOM
const width = svg => Math.max(280, Math.round(svg.clientWidth || svg.parentElement.clientWidth || 600));

export function drawPhase(svg, S, view, onClick) {
  const W = width(svg), narrow = W < 560;
  const H = Math.round(Math.min(W, 640) * (narrow ? 1 : 0.9));
  const P = { l: 48, r: 14, t: 14, b: 44 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const pw = W - P.l - P.r, ph = H - P.t - P.b;
  const X = v => P.l + v / DOM * pw, Y = v => H - P.b - v / DOM * ph;
  const g = el('g', {}, svg);
  const cid = 'clip-' + svg.id;
  el('rect', { x: P.l, y: P.t, width: pw, height: ph }, el('clipPath', { id: cid }, el('defs', {}, svg)));
  el('rect', { x: P.l, y: P.t, width: pw, height: ph, class: 'plotbg' }, g);
  for (let i = 0; i <= 5; i++) {
    const v = DOM * i / 5;
    el('line', { x1: X(v), x2: X(v), y1: P.t, y2: H - P.b, class: 'grid' }, g);
    el('line', { x1: P.l, x2: W - P.r, y1: Y(v), y2: Y(v), class: 'grid' }, g);
    el('text', { x: X(v), y: H - P.b + 15, class: 'ax-t', 'text-anchor': 'middle' }, g, String(v));
    el('text', { x: P.l - 6, y: Y(v) + 4, class: 'ax-t', 'text-anchor': 'end' }, g, String(v));
  }
  const data = S.overlay;
  el('text', { x: P.l + pw / 2, y: H - 8, class: 'ax-l', 'text-anchor': 'middle' }, g, data ? 'United States: warheads (thousands), x' : 'Side A\'s arms, x');
  const yl = P.t + ph / 2;
  el('text', { x: 12, y: yl, class: 'ax-l', 'text-anchor': 'middle', transform: `rotate(-90 12 ${yl})` }, g, data ? 'USSR / Russia: warheads (thousands), y' : 'Side B\'s arms, y');

  const c = el('g', { 'clip-path': `url(#${cid})` }, g);
  // Vector field.
  const n = narrow ? 11 : 15, step = DOM / n, len = step * 0.36;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = (i + 0.5) * step, y = (j + 0.5) * step, [dx, dy] = deriv2(S, x, y), m = Math.hypot(dx, dy);
    if (m < 1e-6) continue;
    const ux = dx / m * len, uy = dy / m * len;
    const x1 = X(x - ux / 2), y1 = Y(y - uy / 2), x2 = X(x + ux / 2), y2 = Y(y + uy / 2);
    el('line', { x1, y1, x2, y2, class: 'vf' }, c);
    const ang = Math.atan2(y2 - y1, x2 - x1), hl = 4.5;
    el('path', { d: `M${x2},${y2}L${x2 - hl * Math.cos(ang - 0.5)},${y2 - hl * Math.sin(ang - 0.5)}L${x2 - hl * Math.cos(ang + 0.5)},${y2 - hl * Math.sin(ang + 0.5)}Z`, class: 'vf-h' }, c);
  }
  // Equilibrium lines: dx/dt = 0 and dy/dt = 0.
  const lineXY = (f, cls) => el('path', { d: `M${X(-5)},${Y(f(-5))}L${X(DOM + 5)},${Y(f(DOM + 5))}`, class: cls }, c);
  if (Math.abs(S.k) > 1e-9) lineXY(x => (S.a * x - S.g) / S.k, 'nc nc-a');
  else if (Math.abs(S.a) > 1e-9) el('line', { x1: X(S.g / S.a), x2: X(S.g / S.a), y1: P.t, y2: H - P.b, class: 'nc nc-a' }, c);
  if (Math.abs(S.b) > 1e-9) lineXY(x => (S.l * x + S.h) / S.b, 'nc nc-b');
  const eq = equilibrium(S), st = stable2(S), sep = eq && separatrix(S);
  if (sep) el('path', { d: `M${X(eq.x - sep[0] * 200)},${Y(eq.y - sep[1] * 200)}L${X(eq.x + sep[0] * 200)},${Y(eq.y + sep[1] * 200)}`, class: 'sep' }, c);

  // Real data and the fitted path.
  if (data && view.data) {
    const d = view.data.pts.map(([, x, y], i) => `${i ? 'L' : 'M'}${X(x)},${Y(y)}`).join('');
    el('path', { d, class: 'real' }, c);
    view.data.pts.forEach(([yr, x, y]) => {
      if (yr % 10) return;
      el('circle', { cx: X(x), cy: Y(y), r: 3.5, class: 'real-d' }, c);
      el('text', { x: X(x) + 6, y: Y(y) - 5, class: 'real-t' }, c, String(yr));
    });
    view.data.win.forEach(([x, y]) => el('circle', { cx: X(x), cy: Y(y), r: 5, class: 'real-w' }, c));
    if (view.fitPath) el('path', { d: view.fitPath.map(([, x, y], i) => `${i ? 'L' : 'M'}${X(x)},${Y(y)}`).join(''), class: 'fitp' }, c);
  }

  // Trajectories.
  view.paths.forEach((pts, i) => {
    const d = pts.map(([, x, y], j) => `${j ? 'L' : 'M'}${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join('');
    const p = el('path', { d, class: 'traj' + (i === view.paths.length - 1 ? ' last' : '') }, c);
    el('circle', { cx: X(pts[0][1]), cy: Y(pts[0][2]), r: 4, class: 'traj-s' + (i === view.paths.length - 1 ? ' last' : '') }, c);
    if (view.animate && i === view.paths.length - 1 && p.getTotalLength) {
      const L = p.getTotalLength();
      p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      requestAnimationFrame(() => requestAnimationFrame(() => { p.style.strokeDashoffset = 0; }));
    }
  });
  if (eq && eq.x > -1 && eq.y > -1 && eq.x < DOM && eq.y < DOM) {
    el('circle', { cx: X(eq.x), cy: Y(eq.y), r: 7, class: st ? 'eq eq-s' : 'eq eq-u' }, g);
  }

  svg.onclick = ev => {
    const r = svg.getBoundingClientRect(), sx = (ev.clientX - r.left) * W / r.width, sy = (ev.clientY - r.top) * H / r.height;
    const x = (sx - P.l) / pw * DOM, y = (H - P.b - sy) / ph * DOM;
    if (!Number.isFinite(x + y) || x < 0 || y < 0 || x > DOM || y > DOM) return;
    onClick(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  };
  return { eq, st };
}

/** Arms over time for one path (two lines), or for three parties when `series` has three entries. */
export function drawTime(svg, series, opts = {}) {
  const W = width(svg), narrow = W < 560;
  const H = narrow ? 220 : 240;
  const P = { l: 48, r: 14, t: 12, b: 36 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const T = opts.T || 60;
  const top = opts.ymax || Math.min(DOM * 1.2, Math.max(5, ...series.flatMap(s => s.pts.map(p => p[1]))) * 1.08);
  const X = t => P.l + t / T * (W - P.l - P.r), Y = v => H - P.b - Math.max(-0.02 * top, Math.min(top * 1.02, v)) / top * (H - P.t - P.b);
  const g = el('g', {}, svg);
  el('rect', { x: P.l, y: P.t, width: W - P.l - P.r, height: H - P.t - P.b, class: 'plotbg' }, g);
  for (let i = 0; i <= 4; i++) {
    const v = top * i / 4, t = T * i / 4;
    el('line', { x1: P.l, x2: W - P.r, y1: Y(v), y2: Y(v), class: 'grid' }, g);
    el('text', { x: P.l - 6, y: Y(v) + 4, class: 'ax-t', 'text-anchor': 'end' }, g, v >= 10 ? Math.round(v) : v.toFixed(1));
    el('text', { x: X(t), y: H - P.b + 15, class: 'ax-t', 'text-anchor': 'middle' }, g, String(Math.round(t)));
  }
  el('text', { x: (P.l + W - P.r) / 2, y: H - 4, class: 'ax-l', 'text-anchor': 'middle' }, g, opts.xlab || 'Years from the start');
  (opts.eqs || []).forEach(e => { if (e.v > 0 && e.v < top) el('line', { x1: P.l, x2: W - P.r, y1: Y(e.v), y2: Y(e.v), class: 'eqline', style: `stroke:${e.c}` }, g); });
  series.forEach(s => {
    const cut = s.pts.findIndex(p => p[1] > top * 1.02);
    const d = s.pts.slice(0, cut < 0 ? undefined : cut + 1).filter(p => p[0] <= T).map(([t, v], i) => `${i ? 'L' : 'M'}${X(t).toFixed(1)},${Y(v).toFixed(1)}`).join('');
    el('path', { d, class: 'ts', style: `stroke:${s.c}` }, g);
  });
}

export { path2 };
