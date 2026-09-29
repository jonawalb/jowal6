// Is It a Nuke? Stage figures: belief chain, decision costs with thresholds, and the long-run escalation map.
import { STATES, ACTIONS, decide, longRun } from './model.js';
import { el, pct, clamp, frame, axes, dragPlot } from './ui.js';

const vw = svg => ((svg.clientWidth || 760) < 560 ? 380 : 760);
const pc1 = x => (x < 0.001 ? '<0.1%' : x < 0.1 ? (x * 100).toFixed(1) + '%' : Math.round(x * 100) + '%');

/** Stacked bars: belief over no attack / conventional / nuclear after each piece of evidence. */
export function drawChain(svg, chain) {
  svg.innerHTML = '';
  const VW = vw(svg), narrow = VW < 760, rowH = narrow ? 58 : 44;
  svg.setAttribute('viewBox', `0 0 ${VW} ${10 + chain.length * rowH}`);
  const X0 = narrow ? 0 : 190, W = VW - X0 - (narrow ? 0 : 10);
  chain.forEach((row, k) => {
    const y = 6 + k * rowH + (narrow ? 18 : 0);
    const ty = narrow ? y - 5 : y + 14;
    el('text', { x: 0, y: ty, class: 'rn' }, svg, row.step);
    el('text', { x: narrow ? VW : 0, y: narrow ? ty : y + 29, class: 'rs', 'text-anchor': narrow ? 'end' : 'start' }, svg, row.note);
    let x = X0;
    for (const s of STATES) {
      const w = W * row.mu[s.id];
      if (w > 0.3) {
        el('rect', { x, y, width: w, height: 30, fill: `var(${s.col})`, class: 'seg' }, svg);
        if (w > 44) el('text', { x: x + w / 2, y: y + 20, 'text-anchor': 'middle', class: 'segl' }, svg, pc1(row.mu[s.id]));
      }
      x += w;
    }
  });
}

/** Expected cost of each action at the current belief, and a strip showing which action wins as Pr(nuclear) varies. */
export function drawDecision(svg, P, mu, costs) {
  svg.innerHTML = '';
  const VW = vw(svg), narrow = VW < 760;
  const { ec, best } = decide(P, mu, costs);
  const H = 3 * 40 + 126;
  svg.setAttribute('viewBox', `0 0 ${VW} ${H}`);
  const X0 = narrow ? 128 : 210, W = VW - X0 - 60;
  const max = Math.max(...Object.values(ec), 1);
  ACTIONS.forEach((a, i) => {
    const y = 8 + i * 40, off = a.id === 'low' && !P.lowCap;
    el('text', { x: 0, y: y + 18, class: 'rn' + (off ? ' off' : '') }, svg, narrow ? a.name.replace('Retaliate conventionally', 'Conventional') : a.name);
    el('rect', { x: X0, y, width: Math.max(1, W * ec[a.id] / max), height: 26, fill: `var(${a.col})`, class: 'cbar' + (a.id === best ? ' best' : '') + (off ? ' off' : '') }, svg);
    el('text', { x: X0 + Math.max(1, W * ec[a.id] / max) + 6, y: y + 18, class: 'tk' }, svg, off ? 'not available' : Math.round(ec[a.id]).toString());
  });
  // strip: Pr(nuclear) from 0 to 1, the rest split between no attack and conventional at today's ratio
  const ys = 3 * 40 + 40, rest = mu.F + mu.C || 1;
  el('text', { x: 0, y: ys - 18, class: 'rs' }, svg, narrow ? 'Best action as Pr(nuclear) changes' : 'Best action as Pr(nuclear) changes, other beliefs in proportion');
  const n = 120;
  for (let i = 0; i < n; i++) {
    const pN = (i + 0.5) / n, m = { N: pN, F: (1 - pN) * mu.F / rest, C: (1 - pN) * mu.C / rest };
    const b = decide(P, m, costs).best;
    el('rect', { x: X0 + W * i / n, y: ys, width: W / n + 0.6, height: 22, fill: `var(${ACTIONS.find(a => a.id === b).col})`, class: 'strip' }, svg);
  }
  el('text', { x: 0, y: ys + 16, class: 'rs' }, svg, 'Pr(nuclear)');
  for (const v of [0, 0.5, 1]) el('text', { x: X0 + W * v, y: ys + 38, 'text-anchor': 'middle', class: 'tk' }, svg, pct(v));
  const cx = X0 + W * clamp(mu.N, 0, 1);
  el('path', { d: `M${cx} ${ys - 2}l-7 -11h14z`, class: 'pbm' }, svg);
  el('line', { x1: cx, x2: cx, y1: ys, y2: ys + 22, class: 'pbl' }, svg);
  el('text', { x: clamp(cx, X0 + 30, X0 + W - 30), y: ys + 56, 'text-anchor': 'middle', class: 'cuml' }, svg, `now ${pc1(mu.N)}`);
  return { ec, best };
}

/** Heat map over prior Pr(nuclear) (log scale) and true entanglement: chance a campaign triggers a wrongful launch. */
export function drawMap(svg, P, costs) {
  const VW = vw(svg), narrow = VW < 760;
  const F = frame(svg, { W: VW, H: narrow ? 300 : 280, m: { l: 50, r: 12, t: 10, b: 44 }, x: [-3, 0], y: [0, 1] });
  const { g, sx, sy } = F;
  const nx = narrow ? 30 : 48, ny = 20, dx = 3 / nx, dy = 1 / ny;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const lp = -3 + (i + 0.5) * dx, E = (j + 0.5) * dy;
    const r = longRun({ ...P, pNuc: 10 ** lp, E }, costs);
    const pc = 1 - (1 - r.C.low) ** P.K;
    const x0 = Math.round(sx(-3 + i * dx)), x1 = Math.round(sx(-3 + (i + 1) * dx)), y0 = Math.round(sy((j + 1) * dy)), y1 = Math.round(sy(j * dy));
    el('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, fill: 'var(--bad)', 'fill-opacity': (0.04 + 0.9 * pc).toFixed(2), 'shape-rendering': 'crispEdges' }, g);
  }
  el('line', { x1: sx(-3), x2: sx(0), y1: sy(P.Eo), y2: sy(P.Eo), class: 'eo' }, g);
  el('text', { x: sx(0) - 4, y: sy(P.Eo) - 5, 'text-anchor': 'end', class: 'bl' }, g, 'assumed entanglement');
  axes(F, { xt: [-3, -2, -1, 0], yt: [0, 0.5, 1], xl: 'Prior Pr(nuclear | real launch), log scale', yl: 'Actual entanglement', xf: v => ({ '-3': '0.1%', '-2': '1%', '-1': '10%', '0': '100%' })[String(v)], yf: v => v.toFixed(1) });
  el('circle', { cx: sx(clamp(Math.log10(P.pNuc), -3, 0)), cy: sy(P.E), r: 7, class: 'mark' }, g);
  return F;
}

export function bindMapDrag(svg, getF, onMove) {
  dragPlot(svg, getF, (x, y) => onMove(10 ** clamp(x, -3, Math.log10(0.999)), clamp(y, 0, 1)));
}

/** Long-run outcome tiles. */
export function drawRates(node, P, costs) {
  const r = longRun(P, costs);
  const per = x => Math.round(x * 1000);
  const camp = 1 - (1 - r.C.low) ** P.K;
  node.innerHTML = `
    <div class="tile bad"><b class="num">${pc1(camp)}</b><span>chance that at least one of ${P.K} conventional launches in a campaign triggers launch on warning</span></div>
    <div class="tile"><b class="num">${per(r.C.low)}</b><span>nuclear launches per 1,000 conventional launches</span></div>
    <div class="tile"><b class="num">${per(r.F.low)} / ${per(r.F.conv)}</b><span>nuclear / conventional responses per 1,000 false alarms</span></div>
    <div class="tile"><b class="num">${per(r.N.wait)}</b><span>nuclear launches per 1,000 ridden out as if conventional or false</span></div>`;
}
