// Cost Ratio Bargaining: the four figures (bargaining line, x* against kappa, Proposition 4, kappa index).
import { el, f2, frame, axes, clamp } from './ui.js';
import { solve, costs, xStar, kappaIndex } from './model.js';

export const KMIN = 0.1, KMAX = 10;
const narrow = () => innerWidth < 560;
const VW = () => (narrow() ? 430 : 720);

/** Figure 1: the division of the good. The bargaining range is [p - c_W, p + c_S]: its two halves are the two sides' war costs. */
export function drawLine(svg, P) {
  const W = VW(), H = 222, m = { l: 24, r: 24 };
  const s = solve(P);
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const sx = v => m.l + v * (W - m.l - m.r);
  const g = el('g', {}, svg);
  const yA = 96; // axis of the good
  // Bargaining range, split at p into the two war costs
  el('rect', { x: sx(s.lo), y: yA - 26, width: sx(P.p) - sx(s.lo), height: 26, class: 'band w' }, g);
  el('rect', { x: sx(P.p), y: yA - 26, width: sx(s.hi) - sx(P.p), height: 26, class: 'band s' }, g);
  const bandLab = (a, b, name, v) => {
    const w = b - a, t = w > 74 ? `${name} ${f2(v)}` : w > 30 ? name : '';
    if (t) el('text', { x: (a + b) / 2, y: yA - 9, 'text-anchor': 'middle', class: 'bandl' }, g, t);
  };
  bandLab(sx(s.lo), sx(P.p), 'c_W', s.cW);
  bandLab(sx(P.p), sx(s.hi), 'c_S', s.cS);
  el('text', { x: sx(s.lo), y: yA - 50, class: 'lab' }, g, `Bargaining range, width C = ${f2(P.C)}`);
  // axis
  el('line', { x1: sx(0), x2: sx(1), y1: yA, y2: yA, class: 'axl' }, g);
  [0, 0.25, 0.5, 0.75, 1].forEach(v => {
    el('line', { x1: sx(v), x2: sx(v), y1: yA, y2: yA + 5, class: 'axl' }, g);
    el('text', { x: sx(v), y: yA + 18, 'text-anchor': 'middle', class: 'tk' }, g, String(v));
  });
  el('text', { x: sx(0), y: yA + 34, class: 'ax-t' }, g, 'W’s share of the good, x →');
  // p marker (draggable)
  el('line', { x1: sx(P.p), x2: sx(P.p), y1: yA - 30, y2: yA + 4, class: 'pline' }, g);
  el('circle', { cx: sx(P.p), cy: yA - 30, r: 7, class: 'phandle' }, g);
  el('text', { x: sx(P.p) + 11, y: yA - 34, class: 'lab strong' }, g, `p ${f2(P.p)}`);
  // x* marker
  const xd = sx(s.x);
  el('path', { d: `M${xd} ${yA - 7} l7 7 l-7 7 l-7 -7z`, class: 'xstar' }, g);
  // The settlement bar
  const yB = yA + 58, hB = 30;
  el('rect', { x: sx(0), y: yB, width: sx(s.x) - sx(0), height: hB, class: 'share w' }, g);
  el('rect', { x: sx(s.x), y: yB, width: sx(1) - sx(s.x), height: hB, class: 'share s' }, g);
  el('line', { x1: xd, x2: xd, y1: yA + 7, y2: yB, class: 'xlink' }, g);
  const lw = s.x > (narrow() ? 0.3 : 0.18) ? `W gets x* = ${f2(s.x)}` : f2(s.x);
  el('text', { x: sx(s.x / 2), y: yB + 20, 'text-anchor': 'middle', class: 'sharel' }, g, lw);
  el('text', { x: sx((1 + s.x) / 2), y: yB + 20, 'text-anchor': 'middle', class: 'sharel' }, g, narrow() ? `S keeps ${f2(s.sShare)}` : `S keeps 1 − x* = ${f2(s.sShare)}`);
  el('text', { x: sx(0), y: yB + hB + 18, class: 'fine-t' }, g, narrow() ? 'S offers W its war payoff p − c_W; W accepts.' : 'Settlement in the equilibrium: S offers W exactly its war payoff p − c_W, and W accepts.');
  return { sx, W, lo: s.lo };
}

/** Drag on Figure 1: near p moves p; elsewhere moves W's reservation point, which sets kappa with C fixed. */
export function bindLineDrag(svg, getP, onSet) {
  let mode = null;
  const toX = e => {
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    const px = (e.clientX - r.left) / r.width * vb.width;
    return { px, v: (px - 24) / (vb.width - 48) };
  };
  const move = e => {
    const P = getP(), { v } = toX(e);
    if (mode === 'p') onSet({ p: clamp(+v.toFixed(3), 0.05, 0.95) });
    else {
      const cW = clamp(P.p - v, P.C / (1 + KMAX), P.C / (1 + KMIN));
      onSet({ k: clamp(+(P.C / cW - 1).toFixed(3), KMIN, KMAX) });
    }
  };
  svg.addEventListener('pointerdown', e => {
    const P = getP(), { px } = toX(e), vb = svg.viewBox.baseVal;
    const ppx = 24 + P.p * (vb.width - 48);
    mode = Math.abs(px - ppx) < 16 ? 'p' : 'k';
    svg.setPointerCapture(e.pointerId); move(e);
  });
  svg.addEventListener('pointermove', e => { if (mode) move(e); });
  const up = () => { mode = null; };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
}

const lk = Math.log10;
/** Figure 2: x*(kappa) on a log axis, the range band around it, the benchmark at kappa = 1 and the asymptote p. */
export function drawCurve(svg, P) {
  const s = solve(P);
  const yMin = Math.max(0, P.p - P.C - 0.04), yMax = Math.min(1, P.p + P.C + 0.04);
  const F = frame(svg, { W: VW(), H: narrow() ? 360 : 330, m: { l: 50, r: 16, t: 16, b: 44 }, x: [lk(KMIN), lk(KMAX)], y: [yMin, yMax] });
  const { g, sx, sy, box } = F;
  // regime shading
  el('rect', { x: sx(lk(KMIN)), y: F.m.t, width: sx(0) - sx(lk(KMIN)), height: F.ih, class: 'zone S' }, g);
  el('rect', { x: sx(0), y: F.m.t, width: sx(lk(KMAX)) - sx(0), height: F.ih, class: 'zone W' }, g);
  el('text', { x: sx(lk(KMIN)) + 6, y: F.m.t + 14, class: 'zonel' }, g, narrow() ? 'κ < 1' : 'κ < 1: S’s costs lower');
  el('text', { x: sx(lk(KMAX)) - 6, y: F.m.t + 14, 'text-anchor': 'end', class: 'zonel' }, g, narrow() ? 'κ > 1' : 'κ > 1: W’s costs lower');
  const ks = []; for (let i = 0; i <= 120; i++) ks.push(lk(KMIN) + i / 120 * (lk(KMAX) - lk(KMIN)));
  const upper = ks.map(t => [sx(t), sy(P.p + costs(P.C, 10 ** t).cS)]);
  const lower = ks.map(t => [sx(t), sy(xStar(P.p, P.C, 10 ** t))]);
  el('path', { d: 'M' + upper.map(q => q.join(' ')).join('L') + 'L' + lower.reverse().map(q => q.join(' ')).join('L') + 'Z', class: 'rangeband' }, g);
  lower.reverse();
  el('line', { x1: sx(lk(KMIN)), x2: sx(lk(KMAX)), y1: sy(P.p), y2: sy(P.p), class: 'asym' }, g);
  el('text', { x: sx(lk(KMAX)) - 4, y: sy(P.p) - 5, 'text-anchor': 'end', class: 'bl' }, g, narrow() ? `p = ${f2(P.p)}` : `p = ${f2(P.p)} (x* approaches it as κ grows)`);
  el('line', { x1: sx(lk(KMIN)), x2: sx(lk(KMAX)), y1: sy(s.bench), y2: sy(s.bench), class: 'bench' }, g);
  el('text', { x: sx(lk(KMIN)) + 4, y: sy(s.bench) + 14, class: 'bl' }, g, narrow() ? `p − C/2 = ${f2(s.bench)}` : `benchmark p − C/2 = ${f2(s.bench)}`);
  el('path', { d: 'M' + lower.map(q => q.join(' ')).join('L'), class: 'xcurve' }, g);
  el('text', { x: sx(lk(KMIN)) + 4, y: sy(xStar(P.p, P.C, KMIN)) - 6, class: 'bl' }, g, 'x*(κ)');
  el('text', { x: sx(lk(3)), y: sy(P.p + costs(P.C, 3).cS) - 6, 'text-anchor': 'middle', class: 'bl mute' }, g, 'S’s limit p + c_S');
  // kappa_D and kappa_V
  [['kV', 'κ_V', 'mV'], ['kD', 'κ_D', 'mD']].forEach(([key, lab, cls]) => {
    const t = lk(P[key]), y = sy(xStar(P.p, P.C, P[key]));
    el('circle', { cx: sx(t), cy: y, r: 5, class: 'pt ' + cls }, g);
    el('text', { x: sx(t), y: y + 18, 'text-anchor': 'middle', class: 'bl' }, g, lab);
  });
  const t = lk(P.k);
  el('line', { x1: sx(t), x2: sx(t), y1: F.m.t, y2: box.H - F.m.b, class: 'cur' }, g);
  el('circle', { cx: sx(t), cy: sy(s.x), r: 7.5, class: 'mark' }, g);
  axes(F, {
    xt: narrow() ? [-1, lk(0.3), 0, lk(3), 1] : [-1, lk(0.2), lk(0.5), 0, lk(2), lk(5), 1], xf: v => { const k = 10 ** v; return k < 1 ? String(+k.toFixed(1)) : String(Math.round(k)); },
    yt: niceTicks(yMin, yMax), xl: narrow() ? 'κ = c_S / c_W (log scale)' : 'Cost-exchange ratio κ = c_S / c_W (log scale)', yl: 'W’s share',
  });
  return F;
}

function niceTicks(a, b) {
  const step = b - a > 0.6 ? 0.2 : b - a > 0.3 ? 0.1 : 0.05, out = [];
  for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(2));
  return out;
}

/** Figure 3: Proposition 4, the same dyad fought as a denial war and as a survival war. */
export function drawCompare(svg, P) {
  const W = VW(), H = 190, m = { l: narrow() ? 104 : 118, r: 20 };
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const s = solve(P);
  const a = Math.max(0, P.p - P.C - 0.03), b = Math.min(1, P.p + P.C + 0.03);
  const sx = v => m.l + (v - a) / (b - a) * (W - m.l - m.r);
  const g = el('g', {}, svg);
  const rows = [['Denial, τ = D', P.kD, s.xD, 38], ['Survival, τ = V', P.kV, s.xV, 98]];
  rows.forEach(([lab, k, x, y]) => {
    const { cS } = costs(P.C, k);
    el('text', { x: 4, y: y + 4, class: 'rn' }, g, lab);
    el('text', { x: 4, y: y + 20, class: 'rs' }, g, `κ = ${f2(k)}`);
    el('rect', { x: sx(x), y: y - 10, width: sx(P.p) - sx(x), height: 20, class: 'band w' }, g);
    el('rect', { x: sx(P.p), y: y - 10, width: sx(P.p + cS) - sx(P.p), height: 20, class: 'band s' }, g);
    el('path', { d: `M${sx(x)} ${y - 8} l8 8 l-8 8 l-8 -8z`, class: 'xstar' }, g);
    if (narrow()) el('text', { x: sx(x), y: y - 14, 'text-anchor': 'middle', class: 'bl' }, g, `x* ${f2(x)}`);
    else el('text', { x: sx(x) - 12, y: y + 4, 'text-anchor': 'end', class: 'bl' }, g, `x* ${f2(x)}`);
  });
  el('line', { x1: sx(P.p), x2: sx(P.p), y1: 16, y2: 116, class: 'pline' }, g);
  el('text', { x: sx(P.p), y: 12, 'text-anchor': 'middle', class: 'bl' }, g, 'p');
  // gap bracket
  const y0 = 142, xa = sx(s.xV), xb = sx(s.xD);
  el('path', { d: `M${xa} ${y0 - 6}V${y0}H${xb}V${y0 - 6}`, class: 'brk' }, g);
  el('text', { x: (xa + xb) / 2, y: y0 + 18, 'text-anchor': 'middle', class: 'lab strong' }, g, `W gains ${f2(s.gapDirect)} more under denial`);
  el('line', { x1: sx(a), x2: sx(b), y1: 124, y2: 124, class: 'axl' }, g);
  niceTicks(a, b).forEach(v => el('text', { x: sx(v), y: 180, 'text-anchor': 'middle', class: 'tk' }, g, String(v)));
}

/** Figure 4: the kappa index of Section 5.3.2, three components averaged, read against the 0.5 regime line. */
export function drawIndex(svg, P) {
  const nw = narrow(), W = VW(), H = nw ? 250 : 200, m = { l: nw ? 16 : 190, r: 50 };
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const g = el('g', {}, svg), sx = v => m.l + v * (W - m.l - m.r);
  const K = kappaIndex(P);
  const rows = [['Offensive cost asymmetry', P.off], ['Defensive cost burden', P.def], ['Target exposure (inverse)', P.exp], ['κ index (mean)', K.v]];
  rows.forEach(([lab, v], i) => {
    const y = nw ? 24 + i * 52 : 18 + i * 40, last = i === 3;
    if (nw) el('text', { x: m.l, y: y - 5, class: last ? 'rn' : 'rs' }, g, lab);
    else el('text', { x: m.l - 10, y: y + 14, 'text-anchor': 'end', class: last ? 'rn' : 'rs' }, g, lab);
    el('rect', { x: sx(0), y, width: sx(1) - sx(0), height: 20, class: 'track' }, g);
    el('rect', { x: sx(0), y, width: sx(v) - sx(0), height: 20, class: last ? 'ibar total ' + K.regime : 'ibar' }, g);
    el('text', { x: sx(1) + 8, y: y + 15, class: 'bl' }, g, f2(v));
  });
  el('line', { x1: sx(0.5), x2: sx(0.5), y1: 10, y2: H - 24, class: 'bench' }, g);
  el('text', { x: sx(0.5), y: H - 6, 'text-anchor': 'middle', class: 'bl' }, g, '0.5: high-κ above, low-κ below');
}
