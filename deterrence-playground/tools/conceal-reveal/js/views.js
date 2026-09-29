// Conceal or Reveal? Stage figures: the type grid, the equilibrium region map and the belief-updating view.
import { TYPES, KINDS, priors, senderPayoff, pibarOf, cutoff, regionKey, SLACKS } from './model.js';
import { el, f2, pct, clamp, frame, axes, regionRaster, dragPlot } from './ui.js';

/** Narrow screens get a smaller viewBox so chart text stays legible. */
const vw = svg => ((svg.clientWidth || 760) < 560 ? 440 : 760);

export const TYPE_COL = { HC: '--c2', LC: '--c5', HO: '--c1', LO: '--c4' };
const ACT = { R: 'Reveals', K: 'Conceals' }, RESP = { C0: 'concedes', F: 'fights' };

/** 2 x 2 grid: capability (rows) x intent (columns); each cell shows the type's move and payoffs. */
export function drawTypeGrid(node, P, eq, hi) {
  const pr = priors(P);
  const cell = id => {
    const t = TYPES.find(x => x.id === id);
    if (!eq) return `<div class="tcell" data-t="${id}"><p class="tn"><i style="background:var(${TYPE_COL[id]})"></i>${t.name}</p><p class="fine">No pure-strategy equilibrium at these values.</p></div>`;
    const s = eq.sig[id], d = s === 'R' ? 'K' : 'R';
    const on = senderPayoff(P, t, s, eq.a[s]), dev = senderPayoff(P, t, d, eq.a[d]);
    return `<div class="tcell${hi && hi.includes(id) ? ' hi' : ''}" data-t="${id}">
      <p class="tn"><i style="background:var(${TYPE_COL[id]})"></i>${t.name}</p>
      <p class="tp">Prior <b class="num">${pct(pr[id])}</b></p>
      <p class="tact" data-s="${s}">${ACT[s]}</p>
      <p class="tr">Receiver ${RESP[eq.a[s]]}${eq.a[s] === 'F' ? ' (war)' : ''}</p>
      <dl class="tpay"><dt>Payoff on path</dt><dd class="num">${f2(on)}</dd><dt>If it switched to ${ACT[d].toLowerCase().replace('s', '')}</dt><dd class="num">${f2(dev)}</dd></dl>
    </div>`;
  };
  node.innerHTML = `<div class="tgrid">
    <div></div><p class="th">Coercive intent <span>wants R to know</span></p><p class="th">Operational intent <span>wants to use it in war</span></p>
    <p class="th row">High capability <span>π<sub>H</sub> = ${f2(P.piH)}</span></p>${cell('HC')}${cell('HO')}
    <p class="th row">Low capability <span>π<sub>L</sub> = ${f2(P.piL)}</span></p>${cell('LC')}${cell('LO')}
  </div>`;
}

// ---- Region map --------------------------------------------------------------------------------
export const AXES = {
  Vr: { x: 'V', y: 'r', xr: [0, 2], yr: [0, 1], xl: 'Operational bonus V', yl: 'Revelation cost r', lines: ['ICC', 'ICO'] },
  sc: { x: 'sig', y: 'c', xr: [0, 0.3], yr: [0, 1.2], xl: 'Surprise advantage σ', yl: 'Cost of war c', lines: ['RC', 'RF', 'ICC', 'ICO'] },
  hh: { x: 'hO', y: 'hC', xr: [0.02, 0.98], yr: [0.02, 0.98], xl: 'Pr(high capability | operational)', yl: 'Pr(high | coercive)', lines: ['RC', 'RF'] },
};
const LBL = { RC: 'R-C', RF: 'R-F', ICC: 'IC-C', ICO: 'IC-O' };

export function drawRegion(svg, P, ax) {
  const A = AXES[ax];
  const xr = ax === 'sc' ? [0, Math.min(0.3, +(0.99 - P.piH).toFixed(2))] : A.xr;
  const VW = vw(svg);
  const F = frame(svg, { W: VW, H: VW < 760 ? 330 : 300, m: { l: 54, r: 14, t: 12, b: 44 }, x: xr, y: A.yr });
  const at = (x, y) => ({ ...P, [A.x]: x, [A.y]: y });
  regionRaster(F, 120, 60, (x, y) => ({ key: regionKey(at(x, y)) }),
    Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [k, v.col])));
  const g = el('g', { class: 'contours' }, F.g);
  for (const k of A.lines) contour(F, g, (x, y) => SLACKS[k](at(x, y)), LBL[k]);
  const xt = ticks(xr).filter((v, i) => VW === 760 || i % 2 === 0), yt = ticks(A.yr);
  axes(F, { xt, yt, xl: A.xl, yl: A.yl });
  el('circle', { cx: F.sx(clamp(P[A.x], xr[0], xr[1])), cy: F.sy(clamp(P[A.y], A.yr[0], A.yr[1])), r: 7, class: 'mark' }, F.g);
  return { F, A, xr };
}
function ticks([a, b]) {
  const step = (b - a) > 1.5 ? 0.5 : (b - a) > 0.6 ? 0.25 : (b - a) > 0.2 ? 0.1 : 0.05;
  const out = [];
  for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(3));
  return out;
}

/** Zero contour of f over the plot by marching squares, drawn as short segments, with one label. */
function contour(F, g, f, label) {
  const { box, sx, sy } = F, nx = 60, ny = 36;
  const xs = i => box.x[0] + (box.x[1] - box.x[0]) * i / nx, ys = j => box.y[0] + (box.y[1] - box.y[0]) * j / ny;
  const v = [];
  for (let j = 0; j <= ny; j++) { v[j] = []; for (let i = 0; i <= nx; i++) v[j][i] = f(xs(i), ys(j)); }
  let d = '', best = null;
  const cx = (box.x[0] + box.x[1]) / 2, cy = (box.y[0] + box.y[1]) / 2;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
    const pts = [];
    for (let e = 0; e < 4; e++) {
      const [a1, b1] = c[e], [a2, b2] = c[(e + 1) % 4];
      const f1 = v[b1][a1], f2v = v[b2][a2];
      if ((f1 > 0) !== (f2v > 0)) {
        const t = f1 / (f1 - f2v);
        pts.push([xs(a1 + (a2 - a1) * t), ys(b1 + (b2 - b1) * t)]);
      }
    }
    for (let k = 0; k + 1 < pts.length; k += 2) {
      const [p, q] = [pts[k], pts[k + 1]];
      d += `M${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}L${sx(q[0]).toFixed(1)} ${sy(q[1]).toFixed(1)}`;
      const dist = Math.hypot((p[0] - cx) / (box.x[1] - box.x[0]), (p[1] - cy) / (box.y[1] - box.y[0]));
      if (!best || dist < best.dist) best = { dist, p };
    }
  }
  if (!d) return;
  el('path', { d, class: 'bound' }, g);
  el('text', { x: sx(best.p[0]) + 6, y: sy(best.p[1]) - 6, class: 'bl' }, g, label);
}

export function bindRegionDrag(svg, get, onMove) {
  dragPlot(svg, () => get().F, (x, y) => {
    const { A, xr } = get();
    onMove(A.x, clamp(x, xr[0], xr[1]), A.y, clamp(y, A.yr[0], A.yr[1]));
  });
}

// ---- Belief updating ---------------------------------------------------------------------------
/** Prior and the two posteriors as stacked bars, and the Receiver's fight/concede cutoff for each signal. */
export function drawBayes(svg, P, eq) {
  svg.innerHTML = '';
  const narrow = vw(svg) < 760;
  const VW = narrow ? 440 : 760, rowH = narrow ? 112 : 76;
  svg.setAttribute('viewBox', `0 0 ${VW} ${34 + 3 * rowH}`);
  const g = el('g', {}, svg), pr = priors(P);
  const X0 = narrow ? 104 : 150, W = narrow ? 320 : 340;
  const rows = [
    { name: 'Prior', sub: 'before any signal', mu: pr },
    { name: 'After Reveal', sub: 'Bayes’ rule', mu: eq?.mu.R, s: 'R' },
    { name: 'After Conceal', sub: 'Bayes’ rule', mu: eq?.mu.K, s: 'K' },
  ];
  const AX0 = narrow ? X0 : 540, AW = narrow ? W - 40 : 180;
  el('text', { x: X0, y: 16, class: 'ax-t' }, g, 'Receiver’s belief about the four types');
  if (!narrow) el('text', { x: AX0, y: 16, class: 'ax-t' }, g, 'Expected Sender win prob. π̄');
  rows.forEach((row, k) => {
    const y = 34 + k * rowH;
    el('text', { x: 0, y: y + 16, class: 'rn' }, g, row.name);
    el('text', { x: 0, y: y + 32, class: 'rs' }, g, row.sub);
    if (!row.mu) {
      el('rect', { x: X0, y, width: W, height: 34, class: 'offbar' }, g);
      el('text', { x: X0 + 10, y: y + 22, class: 'rs' }, g, eq ? (narrow ? 'Off the path of play.' : 'Nobody sends this signal: the belief is off the path of play.') : 'No pure-strategy equilibrium.');
      return;
    }
    let x = X0;
    for (const t of TYPES) {
      const w = W * row.mu[t.id];
      if (w > 0.2) {
        el('rect', { x, y, width: w, height: 34, fill: `var(${TYPE_COL[t.id]})`, class: 'seg' }, g);
        if (w > 34) el('text', { x: x + w / 2, y: y + 22, 'text-anchor': 'middle', class: 'segl' }, g, w > 64 ? `${t.id} ${pct(row.mu[t.id])}` : pct(row.mu[t.id]));
      }
      x += w;
    }
    const pb = pibarOf(P, row.mu);
    const sx = v => AX0 + clamp(v, 0, 1) * AW, ya = narrow ? y + 72 : y + 26;
    el('line', { x1: sx(0), x2: sx(1), y1: ya, y2: ya, class: 'cax' }, g);
    for (const v of [0, 0.5, 1]) { el('line', { x1: sx(v), x2: sx(v), y1: ya, y2: ya + 4, class: 'cax' }, g); el('text', { x: sx(v), y: ya + 16, 'text-anchor': 'middle', class: 'tk' }, g, f2(v)); }
    if (narrow) el('text', { x: 0, y: ya + 4, class: 'rs' }, g, 'π̄');
    if (row.s) {
      const cut = cutoff(P, row.s);
      if (cut > 0) el('rect', { x: sx(0), y: ya - 12, width: Math.max(0, sx(cut) - sx(0)), height: 12, class: 'fightzone' }, g);
      if (cut > 0 && cut < 1) el('text', { x: sx(cut), y: ya - 16, 'text-anchor': 'middle', class: 'tk' }, g, `fights if π̄ ≤ ${f2(cut)}`);
      else el('text', { x: sx(0), y: ya - 16, class: 'tk' }, g, cut <= 0 ? 'never fights' : 'always fights');
    }
    el('path', { d: `M${sx(pb)} ${ya - 2}l-6 -10h12z`, class: 'pbm' }, g);
    el('text', { x: AX0 + AW + 6, y: ya + 4, class: 'rs' }, g, f2(pb));
  });
}
