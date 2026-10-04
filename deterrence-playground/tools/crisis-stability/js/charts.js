// Charts: the weapons domain with lines of constant cost (Kent & Thaler Figs. 8, 16), the probability
// domain (Fig. 12) and the sensitivity sweep.
import { el } from '../../../shared/js/mapkit.js';
import { cost, damage } from './model.js';

const width = svg => Math.max(280, Math.round(svg.clientWidth || svg.parentElement.clientWidth || 600));
const nice = v => { const p = 10 ** Math.floor(Math.log10(Math.max(1, v))); const m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
const k = v => (v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : String(Math.round(v)));
export const LEVELS = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2];

/** Marching squares on a regular grid; returns [[x1,y1,x2,y2], ...] in data units. */
function contour(f, x0, x1, y0, y1, n, level) {
  const gx = i => x0 + (x1 - x0) * i / n, gy = j => y0 + (y1 - y0) * j / n;
  const v = [];
  for (let i = 0; i <= n; i++) { v[i] = []; for (let j = 0; j <= n; j++) v[i][j] = f(gx(i), gy(j)) - level; }
  const segs = [];
  const lerp = (a, b, va, vb) => a + (b - a) * (va / (va - vb));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const a = v[i][j], b = v[i + 1][j], c = v[i + 1][j + 1], d = v[i][j + 1];
    const pts = [];
    if ((a > 0) !== (b > 0)) pts.push([lerp(gx(i), gx(i + 1), a, b), gy(j)]);
    if ((b > 0) !== (c > 0)) pts.push([gx(i + 1), lerp(gy(j), gy(j + 1), b, c)]);
    if ((c > 0) !== (d > 0)) pts.push([lerp(gx(i + 1), gx(i), c, d), gy(j + 1)]);
    if ((d > 0) !== (a > 0)) pts.push([gx(i), lerp(gy(j + 1), gy(j), d, a)]);
    if (pts.length >= 2) segs.push([...pts[0], ...pts[1]]);
    if (pts.length === 4) segs.push([...pts[2], ...pts[3]]);
  }
  return segs;
}

/**
 * Weapons domain. x: B weapons available to attack A's value. y: A weapons available to attack B's value.
 * A's cost falls toward the y axis (few B weapons left); B's cost falls toward the x axis.
 */
export function drawDomain(svg, S, R, onHover) {
  const W = width(svg), narrow = W < 560;
  const H = narrow ? Math.round(W * 0.95) : Math.min(520, Math.round(W * 0.62));
  const P = { l: 52, r: narrow ? 12 : 64, t: 18, b: 44 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const xmax = nice(Math.max(R.ab.vAll, R.ba.aAvail, 100) * 1.08), ymax = nice(Math.max(R.ab.aAvail, R.ba.vAll, 100) * 1.08);
  const X = v => P.l + v / xmax * (W - P.l - P.r), Y = v => H - P.b - v / ymax * (H - P.t - P.b);
  const g = el('g', {}, svg);
  el('rect', { x: P.l, y: P.t, width: W - P.l - P.r, height: H - P.t - P.b, class: 'plotbg' }, g);
  for (let i = 0; i <= 4; i++) {
    const xv = xmax * i / 4, yv = ymax * i / 4;
    el('line', { x1: X(xv), x2: X(xv), y1: P.t, y2: H - P.b, class: 'grid' }, g);
    el('line', { x1: P.l, x2: W - P.r, y1: Y(yv), y2: Y(yv), class: 'grid' }, g);
    el('text', { x: X(xv), y: H - P.b + 15, class: 'ax-t', 'text-anchor': 'middle' }, g, k(xv));
    el('text', { x: P.l - 6, y: Y(yv) + 4, class: 'ax-t', 'text-anchor': 'end' }, g, k(yv));
  }
  el('text', { x: (P.l + W - P.r) / 2, y: H - 6, class: 'ax-l', 'text-anchor': 'middle' }, g, 'Side B weapons available to strike A\'s value');
  el('text', { x: 12, y: (P.t + H - P.b) / 2, class: 'ax-l', 'text-anchor': 'middle', transform: `rotate(-90 12 ${(P.t + H - P.b) / 2})` }, g, 'Side A weapons available to strike B\'s value');

  // Lines of constant cost.
  const cA = (x, y) => cost(damage(x, S.A.w80), damage(y, S.B.w80));
  const cB = (x, y) => cost(damage(y, S.B.w80), damage(x, S.A.w80));
  const n = narrow ? 36 : 56;
  const placed = { a: [], b: [] };
  [['a', cA], ['b', cB]].forEach(([side, f]) => {
    LEVELS.forEach(L => {
      const segs = contour(f, 0, xmax, 0, ymax, n, L);
      if (!segs.length) return;
      el('path', { d: segs.map(s => `M${X(s[0]).toFixed(1)} ${Y(s[1]).toFixed(1)}L${X(s[2]).toFixed(1)} ${Y(s[3]).toFixed(1)}`).join(''),
        class: 'cl cl-' + side + (Math.abs(L - 1) < 1e-9 ? ' cl-one' : '') }, g);
      // Label A's lines along the top edge, B's along the right edge.
      const pick = side === 'a' ? segs.reduce((m, s) => (Math.max(s[1], s[3]) > Math.max(m[1], m[3]) ? s : m))
        : segs.reduce((m, s) => (Math.max(s[0], s[2]) > Math.max(m[0], m[2]) ? s : m));
      const lx = side === 'a' ? X((pick[0] + pick[2]) / 2) : W - P.r + 4, ly = side === 'a' ? P.t - 4 : Y((pick[1] + pick[3]) / 2) + 4;
      if (side === 'a' && Math.max(pick[1], pick[3]) < ymax * 0.97) return;
      if (side === 'b' && (narrow || Math.max(pick[0], pick[2]) < xmax * 0.97)) return;
      const pos = side === 'a' ? lx : ly;
      if (placed[side].some(q => Math.abs(q - pos) < (side === 'a' ? 26 : 13))) return;
      placed[side].push(pos);
      el('text', { x: lx, y: ly, class: 'cl-t cl-t-' + side, 'text-anchor': side === 'a' ? 'middle' : 'start' }, g, L.toFixed(1));
    });
  });

  // Draw-down curves.
  const curve = (pts, map, side) => {
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(map(p)[0]).toFixed(1)} ${Y(map(p)[1]).toFixed(1)}`).join('');
    el('path', { d, class: 'dd dd-' + side }, g);
  };
  const mapAB = p => [p.surv, p.left], mapBA = p => [p.left, p.surv];
  curve(R.ab.pts, mapAB, 'a');
  curve(R.ba.pts, mapBA, 'b');
  const inv = [R.ab.vAll, R.ba.vAll];
  el('circle', { cx: X(inv[0]), cy: Y(inv[1]), r: 4, class: 'invpt' }, g);
  const stop = (p, map, side, lab) => {
    const [x, y] = map(p);
    el('circle', { cx: X(x), cy: Y(y), r: 6.5, class: 'stop stop-' + side }, g);
    const right = X(x) + 10 + lab.length * 6.6 < W - 4;
    el('text', { x: X(x) + (right ? 10 : -10), y: Y(y) + (side === 'a' ? -8 : 16), class: 'stop-t stop-t-' + side, 'text-anchor': right ? 'start' : 'end' }, g, lab);
  };
  stop(R.ab.stop, mapAB, 'a', `A strikes first: ${R.c1A.toFixed(2)} / ${R.c2B.toFixed(2)}`);
  stop(R.ba.stop, mapBA, 'b', `B strikes first: ${R.c2A.toFixed(2)} / ${R.c1B.toFixed(2)}`);

  // Hover: nearest point on either curve.
  const hot = el('g', { class: 'hot' }, g);
  const all = [...R.ab.pts.map(p => ({ p, side: 'a', xy: mapAB(p) })), ...R.ba.pts.map(p => ({ p, side: 'b', xy: mapBA(p) }))];
  svg.onpointermove = e => {
    const r = svg.getBoundingClientRect(), sx = (e.clientX - r.left) * W / r.width, sy = (e.clientY - r.top) * H / r.height;
    let best = null, bd = 1e9;
    all.forEach(o => { const d = Math.hypot(X(o.xy[0]) - sx, Y(o.xy[1]) - sy); if (d < bd) { bd = d; best = o; } });
    hot.replaceChildren();
    if (!best || bd > 40) { onHover(null); return; }
    el('circle', { cx: X(best.xy[0]), cy: Y(best.xy[1]), r: 5, class: 'hov hov-' + best.side }, hot);
    onHover(best);
  };
  svg.onpointerdown = svg.onpointermove;  // a tap reads the nearest point too
  svg.onpointerleave = e => { if (e.pointerType === 'touch') return; hot.replaceChildren(); onHover(null); };  // keep a tapped reading
}

/** Probability domain (Fig. 12): box A, where both sides see an advantage in waiting, has area = index. */
export function drawProb(svg, R) {
  const W = 220, H = 220, P = 24, s = W - 2 * P;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const g = el('g', {}, svg);
  const x = P + R.rA * s, y = H - P - R.rB * s;
  el('rect', { x: P, y: P, width: s, height: s, class: 'pd-all' }, g);
  el('rect', { x: P, y, width: R.rA * s, height: R.rB * s, class: 'pd-a' }, g);
  el('line', { x1: x, x2: x, y1: P, y2: H - P, class: 'pd-la' }, g);
  el('line', { x1: P, x2: W - P, y1: y, y2: y, class: 'pd-lb' }, g);
  el('text', { x: P + R.rA * s / 2, y: y + R.rB * s / 2 + 5, class: 'pd-t', 'text-anchor': 'middle' }, g, R.index >= 0.12 ? 'Both wait' : '');
  el('text', { x, y: H - 6, class: 'pd-ax pd-ax-a', 'text-anchor': 'middle' }, g, R.rA.toFixed(2));
  el('text', { x: 4, y: y + 4, class: 'pd-ax pd-ax-b' }, g, R.rB.toFixed(2));
}

/** Sweep chart: index against one input, three lines (A only, B only, both). */
export function drawSweep(svg, sw) {
  const W = width(svg), narrow = W < 560, H = narrow ? 220 : 250;
  const P = { l: 44, r: 16, t: 14, b: 40 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const g = el('g', {}, svg);
  const n = sw.xs.length;
  const X = i => P.l + i / (n - 1) * (W - P.l - P.r), Y = v => H - P.b - v * (H - P.t - P.b);
  [0, 0.25, 0.5, 0.75, 1].forEach(v => {
    el('line', { x1: P.l, x2: W - P.r, y1: Y(v), y2: Y(v), class: 'grid' }, g);
    el('text', { x: P.l - 6, y: Y(v) + 4, class: 'ax-t', 'text-anchor': 'end' }, g, v.toFixed(2));
  });
  sw.xs.forEach((v, i) => { if (!narrow || i % 2 === 0 || i === n - 1) el('text', { x: X(i), y: H - P.b + 15, class: 'ax-t', 'text-anchor': 'middle' }, g, sw.sw.fmt(v)); });
  el('text', { x: (P.l + W - P.r) / 2, y: H - 5, class: 'ax-l', 'text-anchor': 'middle' }, g, sw.sw.n);
  [['both', 'sw-both'], ['a', 'sw-a'], ['b', 'sw-b']].forEach(([key, cls]) => {
    el('path', { d: sw[key].map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(''), class: 'swl ' + cls }, g);
    sw[key].forEach((v, i) => el('circle', { cx: X(i), cy: Y(v), r: 2.6, class: 'swd ' + cls }, g));
  });
  // Where the current setting sits (interpolated on the x axis).
  const pos = cur => { let i = sw.xs.findIndex(v => v >= cur - 1e-9); if (i < 0) return n - 1; if (i === 0) return 0; const a = sw.xs[i - 1], b = sw.xs[i]; return i - 1 + (cur - a) / (b - a); };
  // One marker when both sides share the current value; otherwise a tick per side on the x axis.
  const ca = sw.sw.k === 'size' ? 1 : sw.curA, cb = sw.sw.k === 'size' ? 1 : sw.curB;
  if (Math.abs(ca - cb) < 1e-6) {
    const c = pos(ca);
    el('line', { x1: X(c), x2: X(c), y1: P.t, y2: H - P.b, class: 'cur' }, g);
    el('circle', { cx: X(c), cy: Y(sw.base), r: 5, class: 'cur-h' }, g);
  } else {
    [['a', ca], ['b', cb]].forEach(([s, v]) => {
      const x = X(pos(v));
      el('path', { d: `M${x} ${H - P.b - 1}l-6 -10h12z`, class: 'curtick curtick-' + s }, g);
      el('text', { x, y: H - P.b - 14, class: 'curtick-t curtick-' + s, 'text-anchor': 'middle' }, g, s.toUpperCase() + ' now');
    });
  }
}
