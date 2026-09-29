// Humiliation to Motivation: game tree with current payoffs, (s, lambda) equilibrium map, and Proposition 5's information curve.
import { el, f2, frame, axes, regionRaster, clamp } from './ui.js';
import { KINDS, alpha, warH, sBar, sUnder, primary, info, entropy } from './model.js';

const narrow = () => innerWidth < 560;
const VW = () => (narrow() ? 430 : 720);
export const LAM_MAX = 0.95;

/** Figure 1: the extensive form, with the current payoffs and the equilibrium path drawn heavy. */
export function drawTree(svg, P, eq) {
  const W = VW(), nw = narrow(), H = 330;
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const g = el('g', {}, svg);
  const a = alpha(P);
  const N = { x: W / 2, y: 30 };
  const Hs = [{ t: 'H', x: W * 0.25, prob: `θ_H  [π = ${f2(P.pi)}]`, p: P.pH }, { t: 'L', x: W * 0.75, prob: `θ_L  [1 − π = ${f2(1 - P.pi)}]`, p: P.pL }];
  const yH = 104, yD = 196, yT = 282;
  const act = eq ? { H: eq.sH, L: eq.sL, r: eq.r } : null;
  const edge = (x1, y1, x2, y2, on, lab, anchor = 'middle') => {
    el('line', { x1, y1, x2, y2, class: 'edge' + (on ? ' on' : '') }, g);
    el('text', { x: (x1 + x2) / 2 + (anchor === 'end' ? -6 : anchor === 'start' ? 6 : 0), y: (y1 + y2) / 2, 'text-anchor': anchor, class: 'elab' }, g, lab);
  };
  const dOff = nw ? 50 : 70, aOff = nw ? 62 : 110;
  Hs.forEach((h, i) => {
    edge(N.x, N.y, h.x, yH, true, nw ? (i ? 'θ_L' : 'θ_H') : h.prob, i ? 'start' : 'end');
    const side = i ? 1 : -1, ax = h.x + side * aOff, cx = h.x - side * (nw ? 18 : 30);
    const chooseA = act && act[h.t] === 'A', chooseC = act && act[h.t] === 'C';
    const yA = nw ? yD + 8 : yT;
    edge(h.x, yH, ax, yA - 20, chooseA, 'A', i ? 'start' : 'end');
    edge(h.x, yH, cx, yD, chooseC, 'C', i ? 'end' : 'start');
    // A payoff
    el('text', { x: ax, y: yA, 'text-anchor': 'middle', class: 'pay' + (chooseA ? ' on' : '') }, g, f2(-a));
    el('text', { x: ax, y: yA + 15, 'text-anchor': 'middle', class: 'pay d' }, g, '0');
    // D node and responses
    const kx = cx - dOff, rx = cx + dOff, onPath = chooseC;
    edge(cx, yD, kx, yT - 20, onPath && act.r === 'K', 'K', 'end');
    edge(cx, yD, rx, yT - 20, onPath && act.r === 'R', 'R', 'start');
    el('text', { x: kx, y: yT, 'text-anchor': 'middle', class: 'pay' + (onPath && act.r === 'K' ? ' on' : '') }, g, f2(P.v));
    el('text', { x: kx, y: yT + 15, 'text-anchor': 'middle', class: 'pay d' }, g, f2(-P.d));
    el('text', { x: rx, y: yT, 'text-anchor': 'middle', class: 'pay' + (onPath && act.r === 'R' ? ' on' : '') }, g, f2(warH(P, h.p)));
    el('text', { x: rx, y: yT + 15, 'text-anchor': 'middle', class: 'pay d' }, g, f2((1 - h.p) * P.w - h.p * P.d - P.kD));
    el('circle', { cx, cy: yD, r: 13, class: 'node' }, g);
    el('text', { x: cx, y: yD + 5, 'text-anchor': 'middle', class: 'nl' }, g, 'D');
    el('circle', { cx: h.x, cy: yH, r: 13, class: 'node' }, g);
    el('text', { x: h.x, y: yH + 5, 'text-anchor': 'middle', class: 'nl' }, g, 'H');
    h.cx = cx;
  });
  el('line', { x1: Hs[0].cx + 14, y1: yD, x2: Hs[1].cx - 14, y2: yD, class: 'infoset' }, g);
  el('text', { x: W / 2, y: yD - 8, 'text-anchor': 'middle', class: 'elab' }, g, nw ? 'info set' : 'D’s information set');
  el('circle', { cx: N.x, cy: N.y, r: 14, class: 'node nature' }, g);
  el('text', { x: N.x, y: N.y + 5, 'text-anchor': 'middle', class: 'nl' }, g, 'N');
  el('text', { x: 4, y: H - 4, class: 'elab' }, g, nw ? 'Top: H’s payoff. Below: D’s. Heavy: equilibrium path.' : 'Top number: H’s payoff. Below it: D’s payoff. Heavy lines: the equilibrium shown.');
}

/** Figure 2: equilibrium region over severity s and legitimacy lambda, with the two thresholds of Propositions 2 and 3. */
export function drawRegion(svg, P) {
  const F = frame(svg, { W: VW(), H: narrow() ? 380 : 360, m: { l: 50, r: 16, t: 12, b: 44 }, x: [0, 1], y: [0, LAM_MAX] });
  const cols = Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [k, v.col]));
  const n = narrow() ? 90 : 140;
  regionRaster(F, n, Math.round(n * 0.8), (s, lam) => ({ key: primary({ ...P, s, lam }) }), cols);
  const { g, sx, sy } = F;
  [[sBar, 's̄', 's̄: status trap begins'], [sUnder, 's̲', 's̲: accommodation ends']].forEach(([fn, sym, lab]) => {
    const pts = [];
    for (let i = 0; i <= 100; i++) { const lam = i / 100 * LAM_MAX, s = fn({ ...P, lam }); if (s >= 0 && s <= 1) pts.push([sx(s), sy(lam)]); }
    if (pts.length > 1) {
      el('path', { d: 'M' + pts.map(q => q.join(' ')).join('L'), class: 'bound' }, g);
      const [x, y] = pts[pts.length - 1];
      el('text', { x: x - 6, y: y < F.m.t + 20 ? y + 16 : y - 8, 'text-anchor': 'end', class: 'bl' }, g, narrow() ? sym : lab);
    }
  });
  el('circle', { cx: sx(P.s), cy: sy(P.lam), r: 8, class: 'mark' }, g);
  axes(F, { xt: [0, 0.25, 0.5, 0.75, 1], yt: [0, 0.25, 0.5, 0.75], xl: 'Humiliation severity s', yl: 'Legitimacy λ' });
  return F;
}

/** Figure 3: Proposition 5, how much a challenge tells D, as severity rises with everything else fixed. */
export function drawInfo(svg, P) {
  const Hpi = entropy(P);
  const F = frame(svg, { W: VW(), H: 230, m: { l: 50, r: 16, t: 16, b: 44 }, x: [0, 1], y: [0, 1.05] });
  const { g, sx, sy } = F;
  const N = 400, segs = [];
  let cur = null;
  for (let i = 0; i <= N; i++) {
    const s = i / N, v = info({ ...P, s });
    if (v === null) { cur = null; continue; }
    if (!cur || Math.abs(cur.v - v) > 1e-9) { cur = { v, pts: [] }; segs.push(cur); }
    cur.pts.push([sx(s), sy(v)]);
  }
  el('line', { x1: sx(0), x2: sx(1), y1: sy(Hpi), y2: sy(Hpi), class: 'bench' }, g);
  el('text', { x: sx(1) - 4, y: sy(Hpi) - 5, 'text-anchor': 'end', class: 'bl' }, g, `H(π) = ${f2(Hpi)} bits`);
  segs.forEach(sg => el('path', { d: 'M' + sg.pts.map(q => q.join(' ')).join('L'), class: 'icurve' }, g));
  [[sUnder(P), 's̲'], [sBar(P), 's̄']].forEach(([s, lab]) => {
    if (s < 0 || s > 1) return;
    el('line', { x1: sx(s), x2: sx(s), y1: F.m.t, y2: sy(0), class: 'bound' }, g);
    el('text', { x: sx(s) + 4, y: F.m.t + 12, class: 'bl' }, g, lab);
  });
  const iv = info(P);
  el('line', { x1: sx(P.s), x2: sx(P.s), y1: F.m.t, y2: sy(0), class: 'cur' }, g);
  if (iv !== null) el('circle', { cx: sx(P.s), cy: sy(iv), r: 7, class: 'mark' }, g);
  axes(F, { xt: [0, 0.25, 0.5, 0.75, 1], yt: [0, 0.5, 1], xl: 'Humiliation severity s (λ and the rest fixed)', yl: 'Bits' });
  return F;
}

/** Drag helper that clamps to the map. */
export const toMap = (x, y) => ({ s: +clamp(x, 0, 1).toFixed(3), lam: +clamp(y, 0, LAM_MAX).toFixed(3) });
