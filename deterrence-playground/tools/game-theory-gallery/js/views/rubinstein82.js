// Rubinstein (1982) view: alternating offers with discounting or fixed bargaining costs.
import { R82_DEFAULTS, solveDisc, solveCost, curveDisc } from '../models/rubinstein82.js';
import { el, frame, axes, line, dragPlot, legend, figCard, f2, pct, clamp, vw } from '../ui.js';
import { mark } from './common.js';

const R = (key, label, math, min, max, step, help) => ({ type: 'range', key, label, math, min, max, step, help });

function pieBar(svg, share, label1, label2) {
  const W = vw(svg), L = W - 40;
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} 84`);
  const w = L * share;
  el('rect', { x: 20, y: 12, width: w, height: 34, fill: 'var(--c1)', 'fill-opacity': 0.75 }, svg);
  el('rect', { x: 20 + w, y: 12, width: L - w, height: 34, fill: 'var(--c4)', 'fill-opacity': 0.6 }, svg);
  if (w > 60) el('text', { x: 20 + w / 2, y: 34, 'text-anchor': 'middle', class: 'barin' }, svg, label1);
  if (L - w > 60) el('text', { x: 20 + w + (L - w) / 2, y: 34, 'text-anchor': 'middle', class: 'barin' }, svg, label2);
  el('text', { x: 20, y: 72, class: 'ax-t' }, svg, 'Player 1 (moves first)');
  el('text', { x: W - 20, y: 72, class: 'ax-t', 'text-anchor': 'end' }, svg, 'Player 2');
}

export default {
  id: 'rubinstein82',
  defaults: R82_DEFAULTS,
  views: [{ v: 'disc', t: 'Discounting' }, { v: 'cost', t: 'Fixed bargaining costs' }],
  enums: { v: ['disc', 'cost'] },
  scaleNote: 'The pie has size 1. Discount factors and costs are abstract; they stand for patience, not for any real negotiation.',

  controls(P) {
    if (P.v === 'disc') return [
      R('d1', 'Player 1’s discount factor', 'δ<sub>1</sub>', 0, 0.99, 0.01, 'Patience: the value of a unit of pie one period later.'),
      R('d2', 'Player 2’s discount factor', 'δ<sub>2</sub>', 0, 0.99, 0.01),
    ];
    return [
      R('c1', 'Player 1’s cost per period of delay', 'c<sub>1</sub>', 0, 0.5, 0.01),
      R('c2', 'Player 2’s cost per period of delay', 'c<sub>2</sub>', 0, 0.5, 0.01),
    ];
  },

  solve(P) { return P.v === 'disc' ? solveDisc(P) : solveCost(P); },

  status(P, e) {
    if (P.v === 'disc') return { s: 'good', b: `Immediate agreement: player 1 gets ${f2(e.M)}`, t: 'The unique perfect equilibrium ends bargaining with the first offer (p. 108).' };
    if (e.kind === 'equal') return { s: 'warn', b: 'Many equilibria', t: `With equal costs, any split giving player 1 at least ${f2(P.c1)} is a perfect equilibrium partition (p. 107).` };
    return { s: 'good', b: e.kind === 'c1<c2' ? 'Player 1 takes the whole pie' : `Player 1 gets only ${f2(e.M)}`, t: 'The side with the lower cost of delay wins almost everything (p. 107).' };
  },

  why(P, e) {
    if (P.v === 'disc') return `Player 1 must offer player 2 what 2 would get by refusing and proposing next period, discounted: 1 − M = δ<sub>2</sub>(1 − δ<sub>1</sub>M). Solving gives M = (1 − δ<sub>2</sub>)/(1 − δ<sub>1</sub>δ<sub>2</sub>) = ${f2(e.M)} (Conclusion 2, p. 108). Had player 2 moved first, it would offer 1 only δ<sub>1</sub>M = ${f2(e.offer2)}. ${Math.abs(P.d1 - P.d2) < 0.001 ? `With equal patience, 1’s edge from moving first is ${f2(e.firstMover)} and shrinks as δ → 1.` : `The more patient player gets more.`} Slantchev (2003, 622) builds his model of bargaining during war on this protocol.`;
    if (e.kind === 'equal') return `Equal costs leave the split indeterminate: any x with ${f2(P.c1)} ≤ x ≤ 1 can be supported (Conclusion 1, p. 107).`;
    return e.kind === 'c1<c2'
      ? `Player 2 loses more from each round of delay (c<sub>2</sub> = ${f2(P.c2)} > c<sub>1</sub> = ${f2(P.c1)}), so player 1 can hold out for everything (Conclusion 1(3), p. 107).`
      : `Player 1 loses more from delay, so the most it can extract is c<sub>2</sub> = ${f2(P.c2)}, what player 2 would lose by waiting one round (Conclusion 1(1), p. 107).`;
  },

  effect(k, P, e, pP) {
    if (!k) return '';
    const up = P[k] > pP[k];
    if (k === 'd1') return `Player 1 grows ${up ? 'more' : 'less'} patient and can ${up ? 'demand more' : 'demand less'}: refusing costs it ${up ? 'less' : 'more'}.`;
    if (k === 'd2') return `Player 2 grows ${up ? 'more' : 'less'} patient, so player 1 must offer it ${up ? 'more' : 'less'} to prevent a refusal.`;
    return 'With fixed costs the only thing that matters is which side’s delay costs more.';
  },

  metrics(P, e) {
    if (P.v === 'disc') return [
      { k: 'Player 1’s share M', n: e.M, track: true },
      { k: 'Player 2’s share', n: e.share2, track: true },
      { k: '2’s offer if 2 moved first', n: e.offer2 },
      { k: 'Delay', f: 'raw', s: 'none', n: 0 },
    ];
    return [{ k: 'Player 1’s share', f: 'raw', s: e.kind === 'equal' ? `any x ≥ ${f2(P.c1)}` : f2(e.M), n: e.M, track: true }];
  },

  figures(host, P, set) {
    const a = figCard(host, 'r82-pie', 'The agreed split', 'Bar split between player 1 and player 2.');
    if (P.v === 'cost') return {
      draw(P, e) {
        if (e.kind === 'equal') { pieBar(a.svg, P.c1, `≥ ${f2(P.c1)}`, 'anything above is an equilibrium'); }
        else pieBar(a.svg, e.M, pct(e.M), pct(1 - e.M));
        legend(a.legend, [['--c1', 'player 1'], ['--c4', 'player 2']]);
      },
    };
    const b = figCard(host, 'r82-c', 'Player 1’s share as its patience grows', 'Line of player 1’s share against its discount factor, at the current δ₂. Click to set δ₁.', 'Current δ₂ held fixed. Click or drag to set δ₁. Dashed: equal patience.');
    b.svg.classList.add('drag');
    let F = null;
    dragPlot(b.svg, () => F, x => set({ d1: +clamp(x, 0, 0.99).toFixed(2) }));
    return {
      draw(P, e) {
        pieBar(a.svg, e.M, `${pct(e.M)}`, `${pct(1 - e.M)}`);
        legend(a.legend, [['--c1', 'player 1'], ['--c4', 'player 2']]);
        F = frame(b.svg, { W: 760, H: 240, m: { l: 52, r: 16, t: 14, b: 42 }, x: [0, 1], y: [0, 1] });
        el('path', { d: line(F, curveDisc(P.d2)), class: 'ln c1' }, F.g);
        el('path', { d: line(F, Array.from({ length: 100 }, (_, i) => { const d = i / 100; return [d, 1 / (1 + d)]; })), class: 'ln c7 dash' }, F.g);
        el('line', { x1: F.sx(0), x2: F.sx(1), y1: F.sy(0.5), y2: F.sy(0.5), class: 'refl' }, F.g);
        mark(F, P.d1, e.M);
        axes(F, { xt: [0, 0.25, 0.5, 0.75, 1], yt: [0, 0.5, 1], xl: 'Player 1’s discount factor δ₁', yl: 'Player 1’s share' });
        legend(b.legend, [['--c1', `share at δ₂ = ${f2(P.d2)}`], ['--c7', 'share with δ₁ = δ₂ = δ: 1/(1 + δ)']]);
      },
    };
  },
};
