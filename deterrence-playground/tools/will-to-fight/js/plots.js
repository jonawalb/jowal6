// SVG figures: the indifference curve g(x*) with its roots, the E[W]-against-mu S-curve, and R against W.
// Plotting only; all numbers come from level1.js / level2.js (memo equations cited there).
import { el } from '../../../shared/js/mapkit.js';
import { g, sCurve, rootBracket, gPrime, consts } from './level1.js';
import { resolve } from './level2.js';

export const fmt = (x, n = 2) => (x == null || Number.isNaN(x)) ? '–'
  : !Number.isFinite(x) ? (x > 0 ? '+∞' : '−∞') : (Math.abs(x) < 0.5 * 10 ** -n ? '0' : x.toFixed(n).replace('-', '−'));

function frame(svg, W, H, m, xr, yr) {
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const sx = v => m.l + (v - xr[0]) / (xr[1] - xr[0]) * iw;
  const sy = v => m.t + ih - (v - yr[0]) / (yr[1] - yr[0]) * ih;
  return { svg, W, H, m, iw, ih, sx, sy, xr, yr, gr: el('g', {}, svg) };
}

function ticks(lo, hi, n = 5) {
  const step0 = (hi - lo) / n, mag = 10 ** Math.floor(Math.log10(step0)), r = step0 / mag;
  const step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag, out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

function axes(F, xl, yl, yf = v => fmt(v, 1), xf = v => fmt(v, 1)) {
  const { gr, sx, sy, m, W, H, xr, yr } = F, a = el('g', { class: 'axis' }, gr);
  el('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }, a);
  el('line', { x1: m.l, x2: m.l, y1: m.t, y2: H - m.b }, a);
  ticks(xr[0], xr[1]).forEach(v => { el('line', { x1: sx(v), x2: sx(v), y1: H - m.b, y2: H - m.b + 4 }, a); el('text', { x: sx(v), y: H - m.b + 16, 'text-anchor': 'middle' }, a, xf(v)); });
  ticks(yr[0], yr[1], 4).forEach(v => { el('line', { x1: m.l - 4, x2: m.l, y1: sy(v), y2: sy(v) }, a); el('text', { x: m.l - 7, y: sy(v) + 4, 'text-anchor': 'end' }, a, yf(v)); });
  el('text', { x: m.l + F.iw / 2, y: H - 4, 'text-anchor': 'middle', class: 'ax-t' }, a, xl);
  el('text', { x: 12, y: m.t + F.ih / 2, 'text-anchor': 'middle', class: 'ax-t', transform: `rotate(-90 12 ${m.t + F.ih / 2})` }, a, yl);
}

const path = (pts, F) => pts.map((q, i) => `${i ? 'L' : 'M'}${F.sx(q[0]).toFixed(1)},${F.sy(q[1]).toFixed(1)}`).join('');

/** Figure 1: g(x*) (eq. 9) over the root bracket (eq. 12), roots marked; the selected root ringed. */
export function drawG(svg, L1, p) {
  const [lo, hi] = rootBracket(L1.mu, p), pad = Math.max(0.6, 0.35 * (hi - lo));
  const xr = [lo - pad, hi + pad], n = 240, pts = [];
  for (let i = 0; i <= n; i++) { const x = xr[0] + (xr[1] - xr[0]) * i / n; pts.push([x, g(x, L1.mu, p)]); }
  let y0 = Math.min(...pts.map(q => q[1])), y1 = Math.max(...pts.map(q => q[1]));
  const yp = 0.08 * (y1 - y0 || 1); y0 -= yp; y1 += yp;
  const F = frame(svg, 640, 300, { l: 48, r: 14, t: 14, b: 38 }, xr, [y0, y1]);
  axes(F, 'cutoff x* (signal at which a fighter is indifferent)', 'g(x*)');
  el('rect', { x: F.sx(lo), y: F.m.t, width: F.sx(hi) - F.sx(lo), height: F.ih, class: 'band' }, F.gr);
  el('line', { x1: F.m.l, x2: F.W - F.m.r, y1: F.sy(0), y2: F.sy(0), class: 'zero' }, F.gr);
  el('path', { d: path(pts, F), class: 'ln ln-g' }, F.gr);
  L1.roots.forEach((x, i) => {
    const stable = gPrime(x, L1.mu, p) > 0, sel = Math.abs(x - L1.xs) < 1e-9;
    if (sel) el('circle', { cx: F.sx(x), cy: F.sy(0), r: 11, class: 'sel-ring' }, F.gr);
    el('circle', { cx: F.sx(x), cy: F.sy(0), r: 5.5, class: stable ? 'root' : 'root unstable' }, F.gr);
    el('text', { x: F.sx(x), y: F.sy(0) - 14, 'text-anchor': 'middle', class: 'bl' }, F.gr, `x*${L1.roots.length > 1 ? (i + 1) : ''} = ${fmt(x)}`);
  });
  svg.setAttribute('aria-label', `Indifference curve g of x star. ${L1.roots.length} equilibrium cutoff${L1.roots.length > 1 ? 's' : ''}: ${L1.roots.map(x => fmt(x)).join(', ')}.`);
}

/** Figure 2: exact S-curve of E[W] against mu (eqs. 13, 15), tipping zone shaded, current and adversary points. */
export function drawS(svg, L1, p, adv) {
  const { sigT } = consts(p.alpha, p.beta);
  const pts = sCurve(p, 360, Math.max(3.2 * sigT, Math.abs(L1.mu - L1.xs) * 1.1, Math.abs(adv.muHat - adv.xsHat) * 1.1));
  const mus = pts.map(q => q.mu).concat([L1.mu, adv.muHat, L1.tip], L1.band ? [L1.band.lo, L1.band.hi] : []);
  let x0 = Math.min(...mus), x1 = Math.max(...mus);
  const xp = 0.06 * (x1 - x0 || 1); x0 -= xp; x1 += xp;
  const F = frame(svg, 640, 300, { l: 48, r: 14, t: 14, b: 38 }, [x0, x1], [0, 1]);
  axes(F, 'public mean μ (what everyone expects the force to be)', 'expected cohesion E[W]', v => `${Math.round(v * 100)}%`);
  const [z0, z1] = L1.zone;
  el('rect', { x: F.sx(Math.min(z0, z1)), y: F.m.t, width: Math.abs(F.sx(z1) - F.sx(z0)), height: F.ih, class: 'zone' }, F.gr);
  el('text', { x: F.sx((z0 + z1) / 2), y: F.m.t + 12, 'text-anchor': 'middle', class: 'zl' }, F.gr, 'tipping zone');
  if (L1.band) {
    el('rect', { x: F.sx(L1.band.lo), y: F.m.t, width: F.sx(L1.band.hi) - F.sx(L1.band.lo), height: F.ih, class: 'hyst' }, F.gr);
    el('text', { x: F.sx((L1.band.lo + L1.band.hi) / 2), y: F.m.t + 26, 'text-anchor': 'middle', class: 'zl' }, F.gr, 'three equilibria');
  }
  el('line', { x1: F.sx(L1.tip), x2: F.sx(L1.tip), y1: F.m.t, y2: F.H - F.m.b, class: 'bound' }, F.gr);
  el('text', { x: F.sx(L1.tip) + 4, y: F.H - F.m.b - 6, class: 'bl' }, F.gr, `μ† = ${fmt(L1.tip)}`);
  // Split into stable and unstable runs so the folded middle branch is dashed.
  let run = [], st = pts[0].stable;
  const flush = () => { if (run.length > 1) el('path', { d: path(run, F), class: st ? 'ln ln-s' : 'ln ln-s unstable' }, F.gr); };
  for (const q of pts) { if (q.stable !== st) { run.push([q.mu, q.EW]); flush(); run = [[q.mu, q.EW]]; st = q.stable; } else run.push([q.mu, q.EW]); }
  flush();
  el('line', { x1: F.sx(adv.muHat), x2: F.sx(adv.muHat), y1: F.sy(0), y2: F.sy(adv.EWhat), class: 'adv-line' }, F.gr);
  el('circle', { cx: F.sx(adv.muHat), cy: F.sy(adv.EWhat), r: 5.5, class: 'adv-pt' }, F.gr);
  el('text', { x: F.sx(adv.muHat) + 8, y: adv.EWhat < 0.15 ? F.sy(adv.EWhat) - 12 : F.sy(adv.EWhat) + 18, 'text-anchor': 'start', class: 'bl adv-t' }, F.gr, 'adversary’s μ̂');
  el('circle', { cx: F.sx(L1.mu), cy: F.sy(L1.EW), r: 7, class: 'mark' }, F.gr);
  el('text', { x: F.sx(L1.mu), y: L1.EW > 0.85 ? F.sy(L1.EW) + 22 : F.sy(L1.EW) - 12, 'text-anchor': 'middle', class: 'bl' }, F.gr, `μ = ${fmt(L1.mu)}`);
  svg.setAttribute('aria-label', `S-curve of expected cohesion against mu. Current mu ${fmt(L1.mu)}, expected cohesion ${Math.round(L1.EW * 100)} percent. Tipping point ${fmt(L1.tip)}.`);
}

/** Figure 3: R against W (eqs. 23-26), critical cohesion WBar (29), realized W. */
export function drawR(svg, W, L2, p) {
  const pts = [];
  for (let i = 0; i <= 100; i++) pts.push([i / 100, resolve(i / 100, p)]);
  let y0 = Math.min(0, ...pts.map(q => q[1])), y1 = Math.max(0, ...pts.map(q => q[1]));
  const yp = 0.1 * (y1 - y0 || 1); y0 -= yp; y1 += yp;
  const F = frame(svg, 640, 220, { l: 48, r: 14, t: 12, b: 38 }, [0, 1], [y0, y1]);
  axes(F, 'realized cohesion W', 'resolve R', v => fmt(v, 1), v => `${Math.round(v * 100)}%`);
  el('rect', { x: F.m.l, y: F.m.t, width: F.iw, height: Math.max(0, F.sy(0) - F.m.t), class: 'fightz' }, F.gr);
  el('line', { x1: F.m.l, x2: F.W - F.m.r, y1: F.sy(0), y2: F.sy(0), class: 'zero' }, F.gr);
  el('line', { x1: F.sx(0.5), x2: F.sx(0.5), y1: F.m.t, y2: F.H - F.m.b, class: 'half' }, F.gr);
  if (Number.isFinite(L2.WBar) && L2.WBar > 0 && L2.WBar < 1) {
    el('line', { x1: F.sx(L2.WBar), x2: F.sx(L2.WBar), y1: F.m.t, y2: F.H - F.m.b, class: 'bound' }, F.gr);
    el('text', { x: F.sx(L2.WBar) + 4, y: F.m.t + 12, class: 'bl' }, F.gr, `W̄ = ${fmt(L2.WBar)}`);
  }
  el('path', { d: path(pts, F), class: 'ln ln-r' }, F.gr);
  el('circle', { cx: F.sx(W), cy: F.sy(L2.R), r: 7, class: 'mark' }, F.gr);
  el('text', { x: F.m.l + 6, y: F.sy(0) - 6, class: 'zl' }, F.gr, 'fight');
  el('text', { x: F.m.l + 6, y: F.sy(0) + 14, class: 'zl' }, F.gr, 'concede');
  svg.setAttribute('aria-label', `Resolve against cohesion. At realized cohesion ${Math.round(W * 100)} percent, resolve is ${fmt(L2.R)}.`);
}
