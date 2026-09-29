// The "why estimation needs care" card: likelihood curves over λ and a table of estimates.
import { el, esc } from './ui.js';
import { GRID } from './estimate.js';
import { fmtLam, narrowOf } from './views.js';

let W = 640, H = 240;
const M = { l: 50, r: 14, t: 14, b: 58 };
const u0 = GRID[0], u1 = GRID[GRID.length - 1];
const xOf = u => M.l + ((W - M.l - M.r) * (u - u0)) / (u1 - u0);

export const METHODS = [
  { k: 'naive', t: 'Traditional MLE, one solver start', c: '--c2',
    s: 'Solves for one equilibrium at every guess of λ, from a fixed starting value, and maximizes the likelihood.' },
  { k: 'principal', t: 'MLE on the principal branch', c: '--c1',
    s: 'Always uses the equilibrium on the branch that starts at the centroid. Unique, but assumes the data were generated there.' },
  { k: 'pl', t: 'Pseudo-likelihood (PL)', c: '--c3',
    s: 'Plugs observed choice frequencies in as beliefs, then fits each side’s logit response. No equilibrium solving.' },
  { k: 'npl', t: 'Nested pseudo-likelihood (NPL)', c: '--c4',
    s: 'Repeats PL, updating beliefs with the fitted responses each round, until the estimate stops moving.' },
  { k: 'cmle', t: 'Constrained MLE (CMLE)', c: '--c6',
    s: 'Maximizes over λ and the equilibrium probabilities together, subject to their being a QRE. Here: every equilibrium at every λ, keep the best.' },
];

/** Log-likelihood (relative to its maximum) over log10 λ, with estimator markers underneath. */
export function drawLL(svg, res, lamStar, d) {
  const narrow = narrowOf(svg);
  W = narrow ? 420 : 640; H = narrow ? 280 : 240;
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const floor = -Math.max(40, 1.5 * d.n);
  const yOf = v => M.t + (H - M.t - M.b) * Math.min(1, (res.max - v) / -floor);
  const ax = el('g', { class: 'tsm-axis axis' }, svg);
  for (const f of [0, 0.25, 0.5, 0.75, 1]) {
    const v = res.max + floor * f;
    el('line', { x1: M.l, x2: W - M.r, y1: yOf(v), y2: yOf(v), class: 'grid' }, ax);
    el('text', { x: M.l - 6, y: yOf(v) + 4, 'text-anchor': 'end' }, ax, (floor * f).toFixed(0).replace('-', '−'));
  }
  for (const u of [-1, 0, 1]) {
    el('line', { x1: xOf(u), x2: xOf(u), y1: H - M.b, y2: H - M.b + 4 }, ax);
    el('text', { x: xOf(u), y: H - M.b + 15, 'text-anchor': 'middle' }, ax, String(10 ** u));
  }
  el('text', { x: xOf(Math.log10(40)), y: H - M.b + 15, 'text-anchor': 'middle' }, ax, '40');
  el('text', { x: 12, y: (M.t + H - M.b) / 2, 'text-anchor': 'middle', class: 'ax-t', transform: `rotate(-90 12 ${(M.t + H - M.b) / 2})` }, ax, 'Log-likelihood − max');
  // Every equilibrium at every λ (what CMLE searches over).
  const gAll = el('g', { class: 'll-all' }, svg);
  for (const [u, v] of res.curves.all) if (v > res.max + floor) el('circle', { cx: xOf(u).toFixed(1), cy: yOf(v).toFixed(1), r: 1.4 }, gAll);
  const path = (pts, breaks) => {
    let s = '', pen = false;
    pts.forEach((p, i) => {
      const brk = breaks && p[3];
      s += `${!pen || brk ? 'M' : 'L'}${xOf(p[0]).toFixed(1)},${yOf(p[1]).toFixed(1)}`; pen = true;
      if (i === 0) pen = true;
    });
    return s;
  };
  el('path', { d: path(res.curves.principal), class: 'll prin' }, svg);
  el('path', { d: path(res.curves.naive, true), class: 'll naive' }, svg);
  // Truth and estimates.
  const ty = H - M.b + 26;
  el('line', { x1: xOf(Math.log10(lamStar)), x2: xOf(Math.log10(lamStar)), y1: M.t, y2: H - M.b, class: 'truth' }, svg);
  el('text', { x: xOf(Math.log10(lamStar)) + 4, y: M.t + 10, class: 'truth-t' }, svg, `true λ* = ${fmtLam(lamStar)}`);
  METHODS.forEach((m, i) => {
    const l = res.est[m.k], u = Math.max(u0, Math.min(u1, Math.log10(l)));
    el('path', { d: `M${xOf(u)},${ty + 4 * i}l-5,8h10z`, style: `fill:var(${m.c})`, class: 'mk' }, svg);
  });
  el('text', { x: M.l, y: H - 4, class: 'ax-t' }, svg, 'λ (log scale). Triangles mark estimates.');
}

/** Table of estimates against the truth. */
export function estTable(box, res, lamStar) {
  const err = l => {
    const r = Math.log10(l / lamStar);
    return Math.abs(r) < 0.05 ? 'good' : Math.abs(r) < 0.2 ? 'warn' : 'bad';
  };
  box.innerHTML = `<table class="est"><thead><tr><th>Method</th><th>λ̂</th><th>Off by</th></tr></thead><tbody>${
    METHODS.map(m => {
      const l = res.est[m.k], e = err(l), pctOff = Math.round((l / lamStar - 1) * 100);
      const edge = l <= 10 ** u0 * 1.001 || l >= 10 ** u1 * 0.999 ? ' (edge)' : '';
      const extra = m.k === 'npl' && !res.est.nplConv ? ' (did not converge)' : '';
      return `<tr><th><i style="background:var(${m.c})"></i>${esc(m.t)}</th><td class="num">${fmtLam(l)}${edge}${extra}</td>
        <td class="num" data-s="${e}">${pctOff > 0 ? '+' : ''}${pctOff}%</td></tr>`;
    }).join('')}</tbody></table>`;
}
