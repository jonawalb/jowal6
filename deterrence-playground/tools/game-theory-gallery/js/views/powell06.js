// Powell (2006) view: one inefficiency condition behind preventive war, preemption, strategic territory and
// domestic factions.
import { P06_DEFAULTS, solveShift, solveFirst, solveTerritory, solveDomestic } from '../models/powell06.js';
import { el, frame, axes, dragPlot, legend, figCard, f2, clamp, stext } from '../ui.js';
import { issueBar, valueBars, region, mark } from './common.js';

const R = (key, label, math, min, max, step, help) => ({ type: 'range', key, label, math, min, max, step, help });
const D_ = R('d', 'Share of the pie a war destroys', 'd', 0.01, 0.9, 0.01, 'The cost of fighting.');
const DL = R('dl', 'Discount factor', 'δ', 0.5, 0.99, 0.01, 'Patience. Powell’s limits take δ close to 1.');

/** "Race" bars: shift in power against the bargaining surplus (both per period). */
function race(svg, shift, surplus, labels = ['Shift in power', 'Bargaining surplus']) {
  const hi = Math.max(0.2, shift, surplus) * 1.1, lo = Math.min(0, shift);
  valueBars(svg, [
    { label: labels[0], v: shift, cls: shift > surplus ? 'bad' : 'mut' },
    { label: labels[1], v: surplus, cls: shift > surplus ? 'mut' : 'ok' },
  ], [lo, hi], { xl: 'Share of one period’s pie' });
}

export default {
  id: 'powell06',
  defaults: P06_DEFAULTS,
  views: [
    { v: 'shift', t: 'Shifting power' },
    { v: 'first', t: 'First-strike advantage' },
    { v: 'territory', t: 'Strategic territory' },
    { v: 'domestic', t: 'Domestic factions' },
  ],
  enums: { v: ['shift', 'first', 'territory', 'domestic'] },

  controls(P) {
    if (P.v === 'shift') return [
      R('p', 'State 1’s chance of winning today', 'p', 0, 0.99, 0.01),
      R('D', 'Rise in state 1’s chance next period', 'Δ', 0, 1, 0.01, 'The shift is known in advance and permanent.'),
      D_, DL];
    if (P.v === 'first') return [
      R('p', 'State 1’s chance with no first strike', 'p', 0.01, 0.99, 0.01),
      R('f', 'First-strike advantage', 'f', 0, 0.5, 0.01, '1 wins with p + f if it attacks, p − f if attacked.'),
      D_, DL];
    if (P.v === 'territory') return [
      R('xb', 'Territory state 1 holds now', 'x̄', 0.05, 0.85, 0.01),
      R('pb', 'State 1’s chance of winning at x̄', 'p(x̄)', p => Math.min(0.9, +(p.xb + 0.01).toFixed(2)), 0.9, 0.01, 'Above x̄: state 1 is dissatisfied, the case Powell analyzes (p. 186).'),
      R('J', 'Jump in p just past x̄ (a ridge or pass)', 'J', 0, 0.5, 0.01, 'J = 0 means p is continuous; small concessions then shift power only a little.'),
      R('e', 'Size of the concession past x̄', 'x_t − x̄', 0.005, 0.1, 0.005),
      R('c2', 'State 2’s cost of a war', 'c<sub>2</sub>', 0, 2, 0.01),
      DL];
    return [
      R('p', 'State 1’s chance of winning', 'p', 0.01, 0.99, 0.01),
      D_,
      R('r', 'Faction a keeps power if it settles', 'r', 0, 1, 0.01),
      R('rp', 'Faction a keeps power if it fights and wins', 'r′', 0, 1, 0.01, 'War can rally support: r′ > r.'),
      R('l', 'Share the out-of-power faction must get', 'λ', 0, 0.49, 0.01),
    ];
  },

  fix(P, k) {
    if (P.v === 'shift' && P.p + P.D > 1) { if (k === 'p') P.D = +(1 - P.p).toFixed(2); else P.D = +(1 - P.p).toFixed(2); }
    if (P.v === 'first') { const m = Math.min(P.p, 1 - P.p); if (P.f > m) P.f = +m.toFixed(2); }
    if (P.v === 'territory') { if (P.pb < P.xb + 0.01) P.pb = Math.min(0.9, +(P.xb + 0.01).toFixed(2)); if (P.pb + P.J > 1) P.J = +(1 - P.pb).toFixed(2); }
  },

  solve(P) {
    return { shift: solveShift, first: solveFirst, territory: solveTerritory, domestic: solveDomestic }[P.v](P);
  },

  status(P, e) {
    const war = e.war;
    const T = {
      shift: ['Preventive war', 'The shift in power outruns the bargaining surplus.', 'Peace', 'The surplus from not fighting covers the shift in power.'],
      first: ['War from first-strike advantage', 'Bargaining forgoes the first strike, which shifts power too far.', 'Peace', 'The advantage to striking first is small next to the cost of war.'],
      territory: ['War over a concession', 'The concession shifts power so far that state 2 fights instead.', 'Concession accepted', 'State 2 concedes the territory rather than fight.'],
      domestic: ['Faction takes the state to war', 'Settling costs faction a too much of its hold on power.', 'Settlement possible', 'Some division satisfies faction a and state 2.'],
    }[P.v];
    return war ? { s: 'bad', b: T[0], t: T[1] } : { s: 'good', b: T[2], t: T[3] };
  },

  why(P, e) {
    if (P.v === 'shift') return `To keep state 2 from fighting now, state 1 must promise it at least what fighting brings. But once stronger, 1 can only credibly promise 2 the pie minus what 1 could then lock in, x* = (p + Δ)(1 − d) = ${f2(e.xStar)} per period. Per period, the shift in power is ${f2(e.shift)} and the surplus from not fighting is d = ${f2(e.surplus)}. ${e.war ? 'The shift is larger, so bargaining breaks down (condition 1, p. 182).' : 'The surplus is larger, so a peaceful path exists.'} As δ → 1 the test becomes Δ(1 − d) > d (p. 183).`;
    if (P.v === 'first') return `De facto range: state 1 needs x ≥ (p + f)(1 − d) = ${f2(e.lo)}; state 2 needs x ≤ (p − f)(1 − d) + d = ${f2(e.hi)}. ${e.empty ? `It is empty because 2f(1 − d) = ${f2(e.gap)} > d.` : 'It is not empty.'} Powell reads this as a shift in power: choosing to bargain rather than attack hands the adversary the first strike. Condition (1): [(1 + δ)f − (1 − δ)p](1 − d) = ${f2(e.shift)} ${e.war ? '>' : '≤'} d (p. 185).`;
    if (P.v === 'territory') return `If state 2 concedes x<sub>t</sub> = ${f2(e.xt)}, state 1’s chance of winning jumps to ${f2(e.pt)} and 1 will press for more next round. Fighting now is worth ${f2(e.fightNow * (1 - P.dl))} to 2 per period; conceding and then being held to indifference is worth ${f2(e.concede * (1 - P.dl))}. Equation (3) (p. 187): δp(x<sub>t</sub>) − p(x̄) = ${f2(e.lhs)} ${e.war ? '>' : '≤'} ${f2(e.rhs)}. With a continuous p (J = 0), Fearon shows states never fight in this game (p. 186).`;
    return `As a unitary state, 1 would accept any x between ${f2(e.unitary[0])} and ${f2(e.unitary[1])}. Faction a, though, keeps power with probability ${f2(P.r)} if it settles and ${f2(P.rp)} if it fights and wins, so it needs x ≥ ${f2(e.lo)}. State 2 gives at most ${f2(e.hi)}. ${e.war ? 'No division works: the faction prefers a larger share of a smaller pie (p. 189).' : 'A division still exists.'}`;
  },

  effect(k, P, e, pP) {
    if (!k) return '';
    const up = P[k] > pP[k];
    const T = {
      D: `A ${up ? 'larger' : 'smaller'} coming shift ${up ? 'raises' : 'lowers'} what state 1 will be able to lock in, so it can credibly promise state 2 ${up ? 'less' : 'more'}.`,
      d: `Costlier war ${up ? 'enlarges' : 'shrinks'} the surplus that peace creates, the right side of condition (1).`,
      dl: `More patience ${up ? 'raises' : 'lowers'} the weight on next period’s shift. Powell’s conditions are stated for δ near 1.`,
      p: P.v === 'shift' ? 'In the limit δ → 1 the initial balance drops out; only the size of the shift and the cost of war matter.' : 'The balance of power moves both sides’ reservation values.',
      f: `A ${up ? 'bigger' : 'smaller'} first-strike advantage makes bargaining (forgoing the strike) a ${up ? 'larger' : 'smaller'} shift in power.`,
      J: `The jump is the power shift a small concession triggers. ${P.J === 0 ? 'At J = 0 the shift is negligible and Fearon’s result of no war returns.' : ''}`,
      c2: 'A costlier war makes state 2 more willing to concede.',
      e: 'A bigger concession gives state 2 more today, but the power shift is set by the jump.',
      xb: 'Where the line sits changes today’s split, not the jump.',
      pb: 'State 2’s current chance of winning sets what it can lock in by fighting now.',
      r: `Settling ${up ? 'now costs faction a less' : 'now costs faction a more'} of its hold on power.`,
      rp: `Winning a war ${up ? 'does more' : 'does less'} to keep faction a in power, ${up ? 'tempting' : 'deterring'} it toward war.`,
      l: `A larger minimum share for the out-of-power faction makes holding power ${up ? 'less' : 'more'} valuable.`,
    };
    return T[k] || '';
  },

  metrics(P, e) {
    if (P.v === 'shift') return [
      { k: 'Shift in power (per period)', n: e.shift, track: true },
      { k: 'Bargaining surplus (per period)', n: e.surplus, track: true },
      { k: '2: fight now', n: e.warTwo, track: true },
      { k: '2: best credible peace', n: e.bestPeace, track: true },
      { k: 'Limit test Δ(1 − d) − d', n: e.limit },
    ];
    if (P.v === 'first') return [
      { k: 'De facto range', f: 'raw', s: e.empty ? 'empty' : `${f2(e.lo)} to ${f2(e.hi)}`, n: e.empty ? 0 : 1 },
      { k: '2f(1 − d)', n: e.gap, track: true },
      { k: 'd', n: e.surplus },
      { k: 'Condition (1) left side', n: e.shift, track: true },
    ];
    if (P.v === 'territory') return [
      { k: 'p after concession', n: e.pt },
      { k: '2: fight now (per period)', n: e.fightNow * (1 - P.dl), track: true },
      { k: '2: concede (per period)', n: e.concede * (1 - P.dl), track: true },
      { k: 'δp(x<sub>t</sub>) − p(x̄)', n: e.lhs },
      { k: '(1 − δ)²c<sub>2</sub> − (1 − δ)x<sub>t</sub>', n: e.rhs },
    ];
    return [
      { k: 'Faction a needs x ≥', n: e.lo, track: true },
      { k: 'State 2 gives x ≤', n: e.hi, track: true },
      { k: 'Unitary range', f: 'raw', s: `${f2(e.unitary[0])} to ${f2(e.unitary[1])}` },
    ];
  },

  figures(host, P, set) {
    if (P.v === 'shift' || P.v === 'first') {
      const a = figCard(host, 'p06-race', 'Condition (1): shift in power versus bargaining surplus', 'Two bars: the per-period shift in power and the per-period bargaining surplus. War when the first is longer.');
      const b = figCard(host, 'p06-reg', P.v === 'shift' ? 'Where bargaining breaks down, by size of shift and cost of war' : 'Where bargaining breaks down, by first-strike advantage and cost of war',
        'Region plot of war and peace. Click or drag to move the point.', 'Other parameters held at their current values. Click or drag to move the point. Dashed line: Powell’s δ → 1 boundary.');
      const c = P.v === 'first' ? figCard(host, 'p06-bar', 'De facto bargaining range', 'Issue space with the range of divisions neither state wants to overturn by attacking.') : null;
      b.svg.classList.add('drag');
      let F = null;
      const xKey = P.v === 'shift' ? 'D' : 'f';
      dragPlot(b.svg, () => F, (x, y) => {
        const xMax = P.v === 'shift' ? 1 - P.p : Math.min(P.p, 1 - P.p);
        set({ [xKey]: +clamp(x, 0, xMax).toFixed(2), d: +clamp(y, 0.01, 0.9).toFixed(2) });
      });
      return {
        draw(P, e) {
          race(a.svg, e.shift, e.surplus);
          legend(a.legend, [['--c2', 'shift larger: war'], ['--c3', 'surplus larger: peace']]);
          const xMax = P.v === 'shift' ? 1 : 0.5;
          F = frame(b.svg, { W: 760, H: 260, m: { l: 52, r: 16, t: 12, b: 42 }, x: [0, xMax], y: [0, 0.9] });
          const fn = P.v === 'shift' ? solveShift : solveFirst;
          const cap = P.v === 'shift' ? 1 - P.p : Math.min(P.p, 1 - P.p);
          region(F, 110, 50, (x, d) => x > cap ? 'na' : (fn({ ...P, [xKey]: x, d }).war ? 'war' : 'peace'), { war: '--c2', peace: '--c3' });
          // delta -> 1 boundary: shift: D(1-d) = d -> d = D/(1+D); first: 2f(1-d) = d -> d = 2f/(1+2f)
          const pts = [];
          for (let i = 0; i <= 60; i++) { const x = xMax * i / 60, d = P.v === 'shift' ? x / (1 + x) : 2 * x / (1 + 2 * x); if (d <= 0.9) pts.push(`${i ? 'L' : 'M'}${F.sx(x).toFixed(1)},${F.sy(d).toFixed(1)}`); }
          el('path', { d: pts.join(''), class: 'bound' }, F.g);
          if (cap < xMax) el('rect', { x: F.sx(cap), y: F.sy(0.9), width: F.sx(xMax) - F.sx(cap), height: F.sy(0) - F.sy(0.9), class: 'na' }, F.g);
          axes(F, { xt: P.v === 'shift' ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.1, 0.2, 0.3, 0.4, 0.5], yt: [0, 0.3, 0.6, 0.9], xl: P.v === 'shift' ? 'Shift in state 1’s chance Δ' : 'First-strike advantage f', yl: 'Cost of war d' });
          mark(F, P[xKey], P.d);
          legend(b.legend, cap < xMax ? [['--c2', 'war'], ['--c3', 'peace'], ['--chip', 'not possible at this p (a chance above 1 or below 0)']] : [['--c2', 'war'], ['--c3', 'peace']]);
          if (c) issueBar(c.svg, {
            rows: [{ label: 'Divisions neither state attacks to overturn', lo: e.lo, hi: e.hi, cls: e.empty ? 'bad' : 'ok', empty: e.empty }],
            marks: [{ x: e.lo, label: '(p + f)(1 − d)', cls: 'ra' }, { x: e.hi, label: '(p − f)(1 − d) + d', cls: 'rb', below: true }],
            left: 'State 2’s ideal', right: 'State 1’s ideal',
          });
        },
      };
    }
    if (P.v === 'territory') {
      const a = figCard(host, 'p06-px', 'State 1’s chance of winning, by the territory it holds', 'Step plot of p(x) with a jump just past the current line x̄.', 'Powell’s Figure 3 (p. 187), with our straight-line p away from the jump.');
      const b = figCard(host, 'p06-cmp', 'State 2’s choice when asked to concede past x̄ (per period)', 'Bars comparing state 2’s value of fighting now and of conceding.');
      return {
        draw(P, e) {
          const F = frame(a.svg, { W: 760, H: 250, m: { l: 52, r: 16, t: 14, b: 42 }, x: [0, 1], y: [0, 1] });
          // p(x): notional straight lines from (0, 0) to (xbar, pb) and from the jump to (1, 1).
          const right = x => (P.pb + P.J) + (1 - P.pb - P.J) * (x - P.xb) / (1 - P.xb);
          el('path', { d: `M${F.sx(0)},${F.sy(0)}L${F.sx(P.xb)},${F.sy(P.pb)}`, class: 'ln c1' }, F.g);
          el('path', { d: `M${F.sx(P.xb)},${F.sy(right(P.xb))}L${F.sx(1)},${F.sy(1)}`, class: 'ln c1' }, F.g);
          el('circle', { cx: F.sx(P.xb), cy: F.sy(P.pb), r: 4.5, class: 'dot c1' }, F.g);
          el('circle', { cx: F.sx(P.xb), cy: F.sy(right(P.xb)), r: 4.5, class: 'dot open' }, F.g);
          el('line', { x1: F.sx(e.xt), x2: F.sx(e.xt), y1: F.sy(0), y2: F.sy(1), class: 'refl' }, F.g);
          stext(F.g, { x: F.sx(e.xt) + 5, y: F.sy(0.08), class: 'bl' }, 'x_t');
          stext(F.g, { x: F.sx(P.xb) - 5, y: F.sy(0.08), class: 'bl', 'text-anchor': 'end' }, 'x̄');
          axes(F, { xt: [0, 0.25, 0.5, 0.75, 1], yt: [0, 0.5, 1], xl: 'Territory held by state 1, x', yl: 'p(x)' });
          legend(a.legend, [['--c1', 'p(x), notional away from the jump']]);
          valueBars(b.svg, [
            { label: 'Fight now', v: e.fightNow * (1 - P.dl), cls: e.war ? 'bad' : 'mut' },
            { label: 'Concede x_t, then be squeezed', v: e.concede * (1 - P.dl), cls: e.war ? 'mut' : 'ok' },
          ], [Math.min(0, e.fightNow * (1 - P.dl), e.concede * (1 - P.dl)), 1], { xl: 'State 2’s average payoff per period' });
        },
      };
    }
    const a = figCard(host, 'p06-dom', 'Divisions each side accepts', 'Two ranges: for a unitary state 1, and when faction a decides.');
    return {
      draw(P, e) {
        issueBar(a.svg, {
          rows: [
            { label: 'If state 1 were a unitary actor', lo: e.unitary[0], hi: e.unitary[1], cls: 'ok' },
            { label: 'When faction a decides for state 1', lo: e.lo, hi: e.hi, cls: e.war ? 'bad' : 'ok', empty: e.war },
          ],
          marks: [{ x: e.lo, label: 'faction a’s minimum', cls: 'ra', row: 1 }, { x: e.hi, label: 'p(1 − d) + d', cls: 'rb', row: 1, below: true }],
          left: 'State 2’s ideal', right: 'State 1’s ideal',
        });
        legend(a.legend, [['--c3', 'acceptable divisions'], ['--c2', 'gap']]);
      },
    };
  },
};
