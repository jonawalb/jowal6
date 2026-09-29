// Fearon (1995) view: bargaining range, private information, first-strike advantages, preventive war.
import { F95_DEFAULTS, solveRange, solveInfo, solvePreempt, solvePrevent, eUA } from '../models/fearon95.js';
import { el, frame, axes, line, dragPlot, legend, figCard, f2, pct, clamp, stext } from '../ui.js';
import { issueBar, valueBars, region, mark } from './common.js';

const R = (key, label, math, min, max, step, help, extra = {}) => ({ type: 'range', key, label, math, min, max, step, help, ...extra });

export default {
  id: 'fearon95',
  defaults: F95_DEFAULTS,
  views: [
    { v: 'range', t: 'Bargaining range' },
    { v: 'info', t: 'Private information' },
    { v: 'preempt', t: 'First-strike advantage' },
    { v: 'prevent', t: 'Preventive war' },
  ],
  enums: { v: ['range', 'info', 'preempt', 'prevent'], div: ['cont', 'steps', 'none'] },

  controls(P) {
    if (P.v === 'range') return [
      R('p', 'A’s chance of winning a war', 'p', 0, 1, 0.01, 'War is a lottery: A wins everything with probability p.'),
      R('ca', 'A’s cost of war', 'c<sub>A</sub>', 0, 0.5, 0.01),
      R('cb', 'B’s cost of war', 'c<sub>B</sub>', 0, 0.5, 0.01),
      { type: 'toggle', key: 'opt', label: 'Let the states disagree about who would win', on: 'Disagree', off: 'Agree', rebuild: true },
      R('r', 'B’s estimate of its own chance', 'r', 0, 1, 0.01, 'If p + r > 1, both are optimistic (p. 391).', { hidden: !P.opt }),
      { type: 'seg', key: 'div', label: 'How finely can the issue be divided?', rebuild: true, opts: [{ v: 'cont', t: 'Any split' }, { v: 'steps', t: 'In steps' }, { v: 'none', t: 'All or nothing' }] },
      R('k', 'Number of equal steps', 'k', 1, 10, 1, 'Feasible deals: 0, 1/k, 2/k, … 1.', { hidden: P.div !== 'steps' }),
      { type: 'toggle', key: 'lot', label: 'Allow a lottery or alternation (p. 389)', on: 'Allowed', off: 'Not allowed', hidden: P.div === 'cont' },
    ];
    if (P.v === 'info') return [
      R('p', 'A’s chance of winning a war', 'p', 0, 1, 0.01),
      R('ca', 'A’s cost of war', 'c<sub>A</sub>', 0.01, 0.5, 0.01),
      R('cmax', 'A’s uncertainty: B’s cost lies between 0 and', 'c̄', 0.02, 0.8, 0.01, 'A believes c<sub>B</sub> is uniform on [0, c̄]. A wider range means more uncertainty.'),
      R('cbt', 'B’s actual cost in this draw', 'c<sub>B</sub>', 0, 0.8, 0.01, 'Only B knows this. It decides whether this particular crisis ends in war.'),
    ];
    if (P.v === 'preempt') return [
      R('p', 'A wins if both mobilize at once', 'p', 0, 1, 0.01),
      R('pf', 'A wins if A strikes first', 'p<sub>f</sub>', 0, 1, 0.01, 'An offensive advantage means p<sub>f</sub> > p > p<sub>s</sub>.'),
      R('ps', 'A wins if B strikes first', 'p<sub>s</sub>', 0, 1, 0.01),
      R('ca', 'A’s cost of war', 'c<sub>A</sub>', 0, 0.5, 0.01),
      R('cb', 'B’s cost of war', 'c<sub>B</sub>', 0, 0.5, 0.01),
    ];
    return [
      R('p1', 'A’s chance of winning now', 'p<sub>1</sub>', 0, 0.98, 0.01),
      R('p2', 'A’s chance after it grows stronger', 'p<sub>2</sub>', 0.02, 1, 0.01, 'The shift happens next period and lasts.'),
      R('cb', 'B’s cost of war (per war)', 'c<sub>B</sub>', 0, 2, 0.01),
      R('dl', 'Discount factor', 'δ', 0.5, 0.98, 0.01, 'How much the states value the future.'),
    ];
  },

  fix(P, k) {
    if (P.v === 'preempt') {
      if (k === 'pf' && P.pf < P.p) P.p = P.pf;
      if (k === 'ps' && P.ps > P.p) P.p = P.ps;
      if (P.pf < P.p) P.pf = P.p;
      if (P.ps > P.p) P.ps = P.p;
    }
    if (P.v === 'prevent') {
      if (k === 'p1' && P.p2 < P.p1 + 0.01) P.p2 = Math.min(1, +(P.p1 + 0.01).toFixed(2));
      if (P.p1 > P.p2 - 0.01) P.p1 = Math.max(0, +(P.p2 - 0.01).toFixed(2));
    }
  },

  solve(P) {
    if (P.v === 'range') return solveRange(P);
    if (P.v === 'info') return solveInfo(P);
    if (P.v === 'preempt') return solvePreempt(P);
    return solvePrevent(P);
  },

  status(P, e) {
    if (P.v === 'range') {
      if (e.cls === 'peace') return { s: 'good', b: 'A bargain beats war', t: 'Some feasible deal gives both states more than fighting.' };
      if (e.cls === 'optimism') return { s: 'bad', b: 'Mutual optimism closes the range', t: 'Each side expects so much from war that no deal satisfies both.' };
      return { s: 'bad', b: 'War over an indivisible issue', t: 'Deals both prefer exist in principle, but none of them is feasible.' };
    }
    if (P.v === 'info') return e.pWar > 0.001
      ? { s: 'warn', b: `Calculated risk: ${pct(e.pWar)} chance of war`, t: 'A demands more than some types of B will accept.' }
      : { s: 'good', b: 'No risk of war', t: 'A demands only what every type of B accepts.' };
    if (P.v === 'preempt') return e.empty
      ? { s: 'bad', b: 'No self-enforcing bargain', t: 'Whatever the deal, one side prefers to strike first.' }
      : { s: e.width < (P.ca + P.cb) - 0.005 ? 'warn' : 'good', b: e.width < (P.ca + P.cb) - 0.005 ? 'Range narrowed' : 'Range intact', t: 'Some deals are safe from a first strike.' };
    return e.war
      ? { s: 'bad', b: 'Preventive war', t: 'B attacks now, before A grows stronger.' }
      : { s: 'good', b: 'Peace, on worsening terms for B', t: 'B accepts A’s rise rather than fight.' };
  },

  why(P, e) {
    if (P.v === 'range') {
      if (e.cls === 'optimism') return `A expects war to be worth at least ${f2(e.lo)} to it; B, expecting to win with ${f2(e.rB)}, will not give more than ${f2(e.hi)}. Their expectations sum to ${f2(e.sumBeliefs)} > 1 + c<sub>A</sub> + c<sub>B</sub>. Fearon’s point (p. 392): rational states can only disagree like this if they hold private information, so the real puzzle is why they don’t share it.`;
      if (e.cls === 'indivisible') return `The range (${f2(e.lo)}, ${f2(e.hi)}) is not empty, but no feasible division falls inside it. Fearon (pp. 389-390) treats this as coherent but rare: side payments, linkage or a lottery usually create intermediate deals. Try allowing a lottery.`;
      return `War costs A ${f2(P.ca)} and B ${f2(P.cb)}, so every x between ${f2(e.lo)} and ${f2(e.hi)} beats a war for both (p. 387). The range is exactly c<sub>A</sub> + c<sub>B</sub> wide${P.opt ? ' minus the optimism gap' : ''}: costlier wars make room for more deals.`;
    }
    if (P.v === 'info') {
      const cut = e.xs - P.p;
      return `A demands x* = ${f2(e.xs)}. Types of B with c<sub>B</sub> below ${f2(cut)} fight; the rest accept. Asking for more raises A’s gain if B gives way and raises the chance B fights: at x*, the two effects balance (Claim 2, p. 411). In this draw B’s cost is ${f2(P.cbt)}, so ${e.fights ? '<b>B fights</b>' : 'B accepts'}. If B simply announced its cost, every type would claim a high one, so A would ignore the claim (pp. 396, 412).`;
    }
    if (P.v === 'preempt') {
      if (e.empty) return `Striking first is worth ${f2(P.pf - P.ca)} to A and striking second leaves B wanting at least ${f2(1 - P.ps - P.cb)}. The first-strike gap p<sub>f</sub> − p<sub>s</sub> = ${f2(e.gap)} exceeds c<sub>A</sub> + c<sub>B</sub> = ${f2(e.costs)}, so every deal invites a first strike (p. 403). Deals both prefer to war still exist; neither can trust the other not to defect from one.`;
      return `A stays at peace only if x ≥ p<sub>f</sub> − c<sub>A</sub> = ${f2(e.lo)}; B only if x ≤ p<sub>s</sub> + c<sub>B</sub> = ${f2(e.hi)}. The de facto range is ${f2(Math.max(0, e.width))} wide versus ${f2(P.ca + P.cb)} without first-strike advantages. Fearon argues such advantages usually narrow the range and make other causes of war more dangerous, rather than cause war alone (p. 404).`;
    }
    return e.war
      ? `Once stronger, A will demand ${f2(e.x2)} every period (p. 405). Even if A offered B everything now, B would get ${f2(e.perAcq)} per period on average, less than the ${f2(e.perWar)} it gets by fighting while still strong. ${e.clipped ? '' : `In Fearon’s terms, δp<sub>2</sub> − p<sub>1</sub> = ${f2(e.lhs)} exceeds c<sub>B</sub>(1 − δ)<sup>2</sup> = ${f2(e.rhs)} (p. 406).`} A cannot promise to go easy later, so B attacks.`
      : `B’s decline is small relative to its cost of war: fighting is worth ${f2(e.perWar)} per period, peace up to ${f2(e.perAcq)}. A can buy B off now by demanding x<sub>1</sub> = ${f2(e.x1)} in the first period, then ${f2(e.x2)} forever.`;
  },

  effect(k, P, e, pP) {
    if (!k) return '';
    const up = P[k] > pP[k];
    const T = {
      ca: `A higher cost of war for A ${up ? 'lowers' : 'raises'} what A needs from a deal, ${up ? 'widening' : 'narrowing'} the range from A’s side.`,
      cb: `B’s cost of war moves B’s reservation level. Costlier war for B ${up ? 'lets A ask for more before B would rather fight' : 'makes B quicker to fight'}.`,
      p: 'Shifting the balance of power moves the whole range: the deals both accept track the expected outcome of war.',
      r: `B ${up ? 'grows more' : 'grows less'} optimistic about its own chances, ${up ? 'pulling B’s reservation level down past A’s' : 'reopening room for a deal'}.`,
      cmax: `More uncertainty about B’s resolve ${up ? 'tempts A to gamble on a higher demand' : 'lets A tailor its demand more safely'}; the equilibrium chance of war is (c̄ − c<sub>A</sub>)/2c̄ when interior.`,
      cbt: 'B’s actual cost does not change A’s demand, because A cannot observe it. It only decides whether this crisis ends in war.',
      pf: 'A larger payoff to striking first means A must be given more to stay at peace.',
      ps: 'A lower chance for A when struck first means B must be given more to stay at peace.',
      p1: 'B’s current strength sets what B can lock in by fighting now.',
      p2: `A ${up ? 'larger' : 'smaller'} coming shift means A’s later demands will be ${up ? 'harsher' : 'milder'}; A cannot promise otherwise.`,
      dl: `B cares ${up ? 'more' : 'less'} about the future, so ${up ? 'the coming decline weighs more heavily against peace' : 'today’s terms matter more than tomorrow’s decline'}.`,
      k: 'Finer steps put more feasible deals on the table.',
    };
    if (k === 'cb' && P.v === 'prevent') return `A higher cost of war makes preventive attack less attractive to B.`;
    if (k === 'lot') return P.lot ? 'A lottery gives each state an expected share equal to the odds, so any split in expectation becomes feasible (p. 389). Powell (2006) argues this is why indivisibility is really a commitment problem.' : 'Without a lottery, only the listed divisions are available.';
    if (k === 'opt') return P.opt ? 'B now forms its own estimate r of its chances. Try raising it until p + r exceeds 1.' : 'Both states now agree on p.';
    return T[k] || '';
  },

  metrics(P, e) {
    if (P.v === 'range') return [
      { k: 'A accepts x ≥', n: e.lo, track: true },
      { k: 'B accepts x ≤', n: e.hi, track: true },
      { k: 'Width of range', n: Math.max(0, e.width), track: true },
      { k: 'Beliefs p + r', n: e.sumBeliefs, hide: !P.opt },
      { k: 'Feasible deal in range', f: 'raw', s: e.deal == null ? 'none' : 'yes', n: e.deal == null ? 0 : 1 },
    ];
    if (P.v === 'info') return [
      { k: 'A’s demand x*', n: e.xs, track: true },
      { k: 'Chance of war', f: 'pct', n: e.pWar, track: true },
      { k: 'B fights if c<sub>B</sub> <', n: e.xs - P.p },
      { k: 'A’s expected payoff', n: e.eu, track: true },
      { k: 'Safe demand (x = p)', n: P.p },
      { k: 'Full-information demand', n: Math.min(1, P.p + P.cbt) },
    ];
    if (P.v === 'preempt') return [
      { k: 'De facto range', f: 'raw', s: e.empty ? 'empty' : `${f2(e.lo)} to ${f2(e.hi)}`, n: e.empty ? 0 : 1 },
      { k: 'Width', n: Math.max(0, e.width), track: true },
      { k: 'First-strike gap', n: e.gap, track: true },
      { k: 'c<sub>A</sub> + c<sub>B</sub>', n: e.costs },
    ];
    return [
      { k: 'A’s later demand x<sub>2</sub>', n: e.x2, track: true },
      { k: 'B: fight now (per period)', n: e.perWar, track: true },
      { k: 'B: best peace (per period)', n: e.perAcq, track: true },
      { k: 'δp<sub>2</sub> − p<sub>1</sub>', n: e.lhs },
      { k: 'c<sub>B</sub>(1 − δ)<sup>2</sup>', n: e.rhs },
    ];
  },

  figures(host, P, set) {
    if (P.v === 'range' || P.v === 'preempt') {
      const f = figCard(host, 'f95-bar', P.v === 'range' ? 'The issue space and the bargaining range' : 'Bargaining range with and without first-strike advantages',
        'Issue space from 0 to 1 with the range of deals both states prefer to war. Click or drag to move p.', 'Click or drag on the bar to move p.');
      f.svg.classList.add('drag');
      let F = null;
      dragPlot(f.svg, () => F, x => set({ p: +clamp(x, 0, 1).toFixed(2) }));
      return {
        draw(P, e) {
          if (P.v === 'range') {
            const pts = e.pts;
            F = issueBar(f.svg, {
              rows: [{ label: P.opt ? 'Deals each side thinks beat war' : 'Deals both states prefer to war', lo: e.lo, hi: e.hi, cls: e.cls === 'peace' ? 'ok' : 'bad', empty: e.cls === 'optimism' }],
              marks: [
                { x: e.lo, label: 'p − c_A', cls: 'ra' }, { x: e.hi, label: P.opt ? '1 − r + c_B' : 'p + c_B', cls: 'rb' },
                { x: P.p, label: 'p', cls: 'pm', below: true }, ...(P.opt ? [{ x: 1 - P.r, label: '1 − r', cls: 'pm', below: true }] : []),
              ],
              pts, ptOk: x => x >= e.lo - 1e-9 && x <= e.hi + 1e-9,
            });
            legend(f.legend, [['--c3', 'deals both prefer'], ['--c2', 'gap: no deal']]);
          } else {
            F = issueBar(f.svg, {
              rows: [
                { label: 'No first-strike advantage: (p − c_A, p + c_B)', lo: e.loPlain, hi: e.hiPlain, cls: 'ok' },
                { label: 'De facto range: (p_f − c_A, p_s + c_B)', lo: e.lo, hi: e.hi, cls: e.empty ? 'bad' : 'ok', empty: e.empty },
              ],
              marks: [{ x: P.p, label: 'p', cls: 'pm' }, { x: e.lo, label: 'p_f − c_A', cls: 'ra', row: 1 }, { x: e.hi, label: 'p_s + c_B', cls: 'rb', row: 1, below: true }],
            });
            legend(f.legend, [['--c3', 'self-enforcing deals'], ['--c2', 'gap: every deal invites a first strike']]);
          }
        },
      };
    }
    if (P.v === 'info') {
      const a = figCard(host, 'f95-eu', 'A’s demand: gain if B gives way versus risk that B fights',
        'Curves of A’s expected payoff and the chance of war against A’s demand x.');
      const b = figCard(host, 'f95-types', 'Which types of B fight the equilibrium demand',
        'Strip of B’s possible costs from 0 to the upper bound, with the types that fight shaded.');
      return {
        draw(P, e) {
          const F = frame(a.svg, { W: 760, H: 280, m: { l: 52, r: 16, t: 14, b: 42 }, x: [0, 1], y: [Math.min(0, P.p - P.ca - 0.05), 1] });
          const xs = Array.from({ length: 201 }, (_, i) => i / 200);
          el('path', { d: line(F, xs.map(x => [x, x < P.p ? x : eUA(P, x)])), class: 'ln c1' }, F.g);
          el('path', { d: line(F, xs.map(x => [x, clamp((x - P.p) / P.cmax, 0, 1)])), class: 'ln c2 dash' }, F.g);
          el('line', { x1: F.sx(e.xs), x2: F.sx(e.xs), y1: F.sy(F.box.y[0]), y2: F.sy(1), class: 'refl' }, F.g);
          el('text', { x: F.sx(e.xs) + 5, y: F.sy(0.95), class: 'bl' }, F.g, `x* = ${f2(e.xs)}`);
          mark(F, e.xs, e.eu);
          axes(F, { xt: [0, 0.25, 0.5, 0.75, 1], yt: [0, 0.5, 1], xl: 'A’s demand x', yl: 'Payoff / probability' });
          legend(a.legend, [['--c1', 'A’s expected payoff'], ['--c2', 'chance B fights']]);
          const G = frame(b.svg, { W: 760, H: 96, m: { l: 24, r: 24, t: 22, b: 36 }, x: [0, P.cmax], y: [0, 1] });
          const cut = clamp(e.xs - P.p, 0, P.cmax);
          el('rect', { x: G.sx(0), y: 26, width: G.sx(P.cmax) - G.sx(0), height: 22, class: 'band ok' }, G.g);
          if (cut > 0) el('rect', { x: G.sx(0), y: 26, width: G.sx(cut) - G.sx(0), height: 22, class: 'band bad' }, G.g);
          stext(G.g, { x: G.sx(0), y: 18, class: 'rowlab' }, 'B’s cost of war c_B (A’s uncertainty)');
          if (P.cbt <= P.cmax) {
            el('line', { x1: G.sx(P.cbt), x2: G.sx(P.cbt), y1: 22, y2: 52, class: 'mk pm' }, G.g);
          }
          axes(G, { xt: [0, P.cmax / 2, P.cmax] });
          legend(b.legend, [['--c2', 'types that fight'], ['--c3', 'types that accept'], ['--muted', 'dashed line: B’s cost in this draw']]);
        },
      };
    }
    const a = figCard(host, 'f95-bars', 'B’s choice in the first period (values per period)', 'Bars comparing B’s value of attacking now with the best peace A can credibly offer.');
    const b = figCard(host, 'f95-reg', 'When does B attack? By A’s future strength and B’s cost', 'Region plot: A’s future chance of winning on the horizontal axis, B’s cost of war on the vertical. Click or drag to move the point.', 'Current p₁ and δ held fixed. Click or drag to move the point.');
    b.svg.classList.add('drag');
    let F = null;
    dragPlot(b.svg, () => F, (x, y) => set({ p2: +clamp(x, P.p1 + 0.01, 1).toFixed(2), cb: +clamp(y, 0, 2).toFixed(2) }));
    return {
      draw(P, e) {
        valueBars(a.svg, [
          { label: 'Attack now', v: e.perWar, cls: e.war ? 'bad' : 'mut' },
          { label: 'Best peace A can promise', v: e.perAcq, cls: e.war ? 'mut' : 'ok' },
        ], [Math.min(0, e.perWar), Math.max(1, e.perAcq, e.perWar)], { xl: 'B’s average payoff per period' });
        F = frame(b.svg, { W: 760, H: 260, m: { l: 52, r: 16, t: 12, b: 42 }, x: [0, 1], y: [0, 2] });
        region(F, 110, 50, (p2, cb) => p2 <= P.p1 ? 'na' : (solvePrevent({ ...P, p2, cb }).war ? 'war' : 'peace'), { war: '--c2', peace: '--c3' });
        axes(F, { xt: [0, 0.25, 0.5, 0.75, 1], yt: [0, 0.5, 1, 1.5, 2], xl: 'A’s future chance of winning p₂', yl: 'B’s cost of war' });
        el('line', { x1: F.sx(P.p1), x2: F.sx(P.p1), y1: F.sy(0), y2: F.sy(2), class: 'refl' }, F.g);
        el('text', { x: F.sx(P.p1) + 4, y: F.sy(1.9), class: 'bl' }, F.g, 'p₁ today');
        mark(F, P.p2, P.cb);
        legend(b.legend, [['--c2', 'preventive war'], ['--c3', 'peace']]);
      },
    };
  },
};
