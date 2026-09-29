// Drawing: the game tree or payoff matrix, and the λ-path chart.
import { el, pct, f2, esc } from './ui.js';
import { U0, U1 } from './qre.js';

const PCOL = ['--c1', '--c2'];
const f1 = x => x.toFixed(1).replace('-', '−');
export const fmtLam = l => (l === Infinity ? '∞' : l < 0.1 ? l.toFixed(3) : l < 10 ? l.toFixed(2) : l.toFixed(1));

/** Game tree with QRE choice probabilities on every branch. */
export function drawTree(svg, spec, game, sol, outcomes) {
  const narrow = narrowOf(svg), W = narrow ? 430 : 640, Hh = narrow ? 360 : 330, m = { l: 6, r: 6, t: 34, b: 86 };
  const bw = narrow ? 80 : 88;
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
  // Layout: leaves in DFS order across the width, depth down the page.
  const pos = new Map(); let leaf = 0, maxD = 0;
  const leaves = [];
  const lay = (n, d) => {
    maxD = Math.max(maxD, d);
    if (typeof n === 'string') { leaves.push(n); const k = { x: leaf++, d }; return k; }
    const kids = n.acts.map(a => lay(a.to, d + 1));
    const k = { x: kids.reduce((s, c) => s + c.x, 0) / kids.length, d, kids };
    pos.set(n.id, k);
    return k;
  };
  const rootK = lay(game.root, 0);
  const nL = leaves.length;
  const X = x => m.l + bw / 2 + ((W - m.l - m.r - bw) * x) / Math.max(1, nL - 1);
  const Y = d => m.t + ((Hh - m.t - m.b) * d) / maxD;
  const oc = Object.fromEntries(outcomes.map(o => [o.id, o]));
  const gE = el('g', {}, svg), gN = el('g', {}, svg);
  const draw = (n, k, px = null) => {
    const x0 = X(k.x), y0 = Y(k.d);
    n.acts.forEach((a, i) => {
      const kk = k.kids[i], x1 = X(kk.x), y1 = Y(kk.d), pr = sol.probs[n.id][i];
      el('line', { x1: x0, y1: y0, x2: x1, y2: y1, class: 'br-bg' }, gE);
      el('line', { x1: x0, y1: y0, x2: x1, y2: y1, class: 'br', 'stroke-width': (1 + 9 * pr).toFixed(2), style: `stroke:var(${PCOL[n.who]})` }, gE);
      const mx = x0 + (x1 - x0) * 0.42, my = y0 + (y1 - y0) * 0.42;
      const side = x1 < x0 ? -1 : 1;
      const t = el('text', { x: mx + side * 8, y: my, class: 'br-l', 'text-anchor': side < 0 ? 'end' : 'start' }, gE);
      if (!narrow) el('tspan', { class: 'br-a' }, t, `${a.t} `);
      el('title', {}, t, `${spec.players[n.who]}: ${a.t}, ${pct(pr)}`);
      el('tspan', { class: 'br-p' }, t, pct(pr));
      if (typeof a.to !== 'string') draw(a.to, kk, x0);
    });
    el('circle', { cx: x0, cy: y0, r: 13, class: 'nd', style: `stroke:var(${PCOL[n.who]})` }, gN);
    el('text', { x: x0, y: y0 + 4, class: 'nd-t', 'text-anchor': 'middle' }, gN, n.who === 0 ? '1' : '2');
    const label = `${spec.players[n.who]} · ${n.name}`;
    const isRoot = px === null;
    let right = px !== null && px < x0;
    if (!right && x0 - 18 - label.length * (narrow ? 7.2 : 6.8) < 0) right = true;
    el('text', isRoot ? { x: x0, y: y0 - 19, class: 'nd-n', 'text-anchor': 'middle' }
      : { x: x0 + (right ? 18 : -18), y: y0 - 8, class: 'nd-n', 'text-anchor': right ? 'start' : 'end' }, gN, label);
  };
  draw(game.root, rootK);
  // Terminals.
  const walkLeaves = (n, k) => {
    if (typeof n === 'string') return;
    n.acts.forEach((a, i) => {
      const kk = k.kids[i];
      if (typeof a.to === 'string') {
        const id = a.to, x = X(kk.x), y = Y(kk.d), o = oc[id], pr = sol.out[id] || 0, u = game.pay[id];
        const g = el('g', { class: 'term' }, gN);
        el('rect', { x: x - bw / 2, y: y + 4, width: bw, height: 62, rx: 3, class: 'term-b', style: `stroke:var(${o.col})` }, g);
        el('text', { x, y: y + 20, 'text-anchor': 'middle', class: 'term-t' }, g, id);
        el('text', { x, y: y + 34, 'text-anchor': 'middle', class: 'term-u' }, g, narrow ? `${f1(u[0])}, ${f1(u[1])}` : `(${f2(u[0])}, ${f2(u[1])})`);
        el('rect', { x: x - 36, y: y + 43, width: 72, height: 7, class: 'term-bg' }, g);
        el('rect', { x: x - 36, y: y + 43, width: (72 * pr).toFixed(1), height: 7, style: `fill:var(${o.col})` }, g);
        el('text', { x, y: y + 62, 'text-anchor': 'middle', class: 'term-p' }, g, pct(pr));
        el('title', {}, g, `${o.label}: payoffs (${f2(u[0])}, ${f2(u[1])}), probability ${pct(pr)}`);
      } else walkLeaves(a.to, kk);
    });
  };
  walkLeaves(game.root, rootK);
}

/** 2x2 payoff matrix with the principal QRE's cell probabilities. */
export function drawMatrix(box, spec, g, eq) {
  const cell = (i, j) => (i ? 1 - eq.p : eq.p) * (j ? 1 - eq.q : eq.q);
  const ids = [['EE', 'EB'], ['BE', 'BB']];
  const oc = Object.fromEntries(spec.outcomes.map(o => [o.id, o]));
  box.innerHTML = `<table class="mx" aria-label="Payoff matrix with equilibrium probabilities">
    <thead><tr><th></th><th colspan="2" class="mx-p2">${spec.players[1]}</th></tr>
    <tr><th class="mx-p1">${spec.players[0]}</th>${spec.acts.map((a, j) => `<th>${a} <span class="mx-pr">${pct(j ? 1 - eq.q : eq.q)}</span></th>`).join('')}</tr></thead>
    <tbody>${[0, 1].map(i => `<tr><th>${spec.acts[i]} <span class="mx-pr">${pct(i ? 1 - eq.p : eq.p)}</span></th>${[0, 1].map(j => {
      const pr = cell(i, j), o = oc[ids[i][j]];
      return `<td style="--sh:${(pr * 0.85).toFixed(3)};--oc:var(${o.col})"><span class="mx-u">${f2(g.R[i][j])}, ${f2(g.C[i][j])}</span><b>${pct(pr)}</b><small>${esc(o.label)}</small></td>`;
    }).join('')}</tr>`).join('')}</tbody></table>`;
}

let CW = 640, CH = 250;
const M = { l: 44, r: 58, t: 14, b: 34 };
/** Narrow screens get a smaller drawing width so text stays legible. */
export const narrowOf = svg => (svg.getBoundingClientRect().width || 640) < 560;
const xOf = u => M.l + ((CW - M.l - M.r) * (u - U0)) / (U1 - U0);
const yOf = p => M.t + (CH - M.t - M.b) * (1 - p);

function axes(svg, ylab) {
  const narrow = narrowOf(svg);
  CW = narrow ? 420 : 640; CH = narrow ? 290 : 250; M.r = narrow ? 44 : 58;
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${CW} ${CH}`);
  const ax = el('g', { class: 'tsm-axis axis' }, svg);
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    el('line', { x1: M.l, x2: CW - M.r, y1: yOf(p), y2: yOf(p), class: 'grid' }, ax);
    el('text', { x: M.l - 6, y: yOf(p) + 4, 'text-anchor': 'end' }, ax, pct(p));
  }
  for (let u = U0; u <= U1; u++) {
    el('line', { x1: xOf(u), x2: xOf(u), y1: CH - M.b, y2: CH - M.b + 4 }, ax);
    el('text', { x: xOf(u), y: CH - M.b + 16, 'text-anchor': 'middle' }, ax, String(10 ** u));
  }
  el('text', { x: CW - M.r + M.r / 2, y: CH - M.b + 16, 'text-anchor': 'middle' }, ax, '∞');
  el('text', { x: (M.l + CW - M.r) / 2, y: CH - 3, 'text-anchor': 'middle', class: 'ax-t' }, ax, 'Precision λ (log scale)');
  el('text', { x: 12, y: (M.t + CH - M.b) / 2, 'text-anchor': 'middle', class: 'ax-t', transform: `rotate(-90 12 ${(M.t + CH - M.b) / 2})` }, ax, ylab);
  el('rect', { x: CW - M.r + 8, y: M.t, width: M.r - 16, height: CH - M.t - M.b, class: 'inf-band' }, svg);
}

function scrubber(svg, u, onU) {
  el('line', { x1: xOf(u), x2: xOf(u), y1: M.t, y2: CH - M.b, class: 'now' }, svg);
  const hit = el('rect', { x: M.l, y: M.t, width: CW - M.l - M.r, height: CH - M.t - M.b, class: 'hit' }, svg);
  const toU = e => {
    const r = svg.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * CW;
    return Math.max(U0, Math.min(U1, U0 + ((x - M.l) / (CW - M.l - M.r)) * (U1 - U0)));
  };
  let drag = false;
  hit.addEventListener('pointerdown', e => { drag = true; hit.setPointerCapture(e.pointerId); onU(toU(e)); });
  hit.addEventListener('pointermove', e => { if (drag) onU(toU(e)); });
  hit.addEventListener('pointerup', () => { drag = false; });
}

/** Stacked outcome probabilities along the (unique) QRE path of a tree game. */
export function drawTreePath(svg, path, spe, outcomes, u, onU) {
  axes(svg, 'Outcome probability');
  const g = el('g', {}, svg);
  let lower = path.map(() => 0);
  for (const o of outcomes) {
    const upper = path.map((r, i) => lower[i] + (r.out[o.id] || 0));
    const top = path.map((r, i) => `${xOf(r.u).toFixed(1)},${yOf(upper[i]).toFixed(1)}`);
    const bot = path.map((r, i) => `${xOf(r.u).toFixed(1)},${yOf(lower[i]).toFixed(1)}`).reverse();
    el('polygon', { points: [...top, ...bot].join(' '), class: 'area', style: `fill:var(${o.col})` }, g);
    lower = upper;
  }
  // λ = ∞ column: the subgame perfect outcome.
  let acc = 0;
  for (const o of outcomes) {
    const v = spe.out[o.id] || 0;
    if (v > 0) el('rect', { x: CW - M.r + 8, y: yOf(acc + v), width: M.r - 16, height: yOf(acc) - yOf(acc + v), class: 'area', style: `fill:var(${o.col})` }, svg);
    acc += v;
  }
  scrubber(svg, u, onU);
}

/** QRE correspondence of a 2x2 game: every branch, principal branch bold, Nash equilibria at ∞. */
export function drawCorr(svg, corr, nashEq, current, u, onU) {
  axes(svg, 'Probability of escalating');
  const g = el('g', {}, svg);
  corr.lines.forEach((l, k) => {
    for (const [key, cls] of [['q', 'col'], ['p', 'row']]) {
      const d = l.map((v, i) => `${i ? 'L' : 'M'}${xOf(v.u).toFixed(1)},${yOf(v[key]).toFixed(1)}`).join('');
      el('path', { d, class: `cl ${cls} ${k === corr.principal ? 'prin' : 'side'}` }, g);
    }
  });
  for (const n of nashEq) {
    el('circle', { cx: CW - M.r / 2, cy: yOf(n.q), r: 4.5, class: `ne col${n.pure ? '' : ' mix'}` }, svg);
    el('circle', { cx: CW - M.r / 2, cy: yOf(n.p), r: 4.5, class: `ne row${n.pure ? '' : ' mix'}` }, svg);
  }
  for (const r of current.all) {
    const isP = Math.abs(r.x - current.prin.x) < 1e-6;
    el('circle', { cx: xOf(u), cy: yOf(r.p), r: isP ? 5.5 : 4, class: `dot row${isP ? ' prin' : ''}` }, svg);
    el('circle', { cx: xOf(u), cy: yOf(r.q), r: isP ? 5.5 : 4, class: `dot col${isP ? ' prin' : ''}` }, svg);
  }
  scrubber(svg, u, onU);
}

export function treeLegend(outcomes) {
  return outcomes.map(o => `<span class="lg"><i style="background:var(${o.col})"></i>${esc(o.label)}</span>`).join('')
    + '<span class="lg"><i class="inf"></i>∞ column: subgame perfect outcome</span>';
}
export function corrLegend(spec) {
  return `<span class="lg"><i class="ln row"></i>${spec.players[0]}</span><span class="lg"><i class="ln col"></i>${spec.players[1]}</span>
    <span class="lg"><i class="ln prin"></i>Principal branch</span><span class="lg"><i class="ln side"></i>Other branches</span>
    <span class="lg"><i class="d ne"></i>Nash equilibria (λ = ∞)</span>`;
}

