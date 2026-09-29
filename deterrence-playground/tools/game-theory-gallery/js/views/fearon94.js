// Fearon (1994) view: audience costs in a war of attrition.
import { F94_DEFAULTS, solveF94 } from '../models/fearon94.js';
import { el, frame, axes, line, legend, figCard, f2, pct, stext, vw } from '../ui.js';

const R = (key, label, math, min, max, step, help) => ({ type: 'range', key, label, math, min, max, step, help });
const who = (e, i) => e.names[i];

export default {
  id: 'fearon94',
  defaults: F94_DEFAULTS,
  scaleNote: 'Values are abstract utilities. War values are uniform on [−W, 0], the case the article uses for one of its results (p. 586). Nothing here estimates any real government.',

  controls() {
    return [
      R('a1', 'State 1’s audience-cost rate', 'a<sub>1</sub>', 0.1, 5, 0.05, 'Backing down after escalating for time t costs a<sub>1</sub>t. Think of a leader facing a strong domestic audience.'),
      R('a2', 'State 2’s audience-cost rate', 'a<sub>2</sub>', 0.1, 5, 0.05),
      R('v', 'Value of the prize', 'v', 0.2, 2, 0.05),
      R('W1', 'State 1: how bad war might be (w₁ lies in [−W₁, 0])', 'W<sub>1</sub>', 0.2, 4, 0.05, 'Larger W₁ means state 2 initially doubts state 1 will fight.'),
      R('W2', 'State 2: how bad war might be', 'W<sub>2</sub>', 0.2, 4, 0.05),
    ];
  },

  solve: solveF94,

  status(P, e) {
    const s = e.warGivenCrisis > 0.3 ? 'bad' : 'warn';
    return { s, b: `War in ${pct(e.pWar)} of crises that could start`, t: `${who(e, e.L)} gives in at once with probability ${pct(e.pConcede0)}; otherwise a public crisis runs to at most t* = ${f2(e.ts)}.` };
  },

  why(P, e) {
    const L = who(e, e.L), H = who(e, e.H);
    return `Audience costs rise with every moment of escalation, so each side eventually reaches the point where backing down costs more than fighting. The crisis has a horizon t* = ${f2(e.ts)}, set by the state that reaches its limit first (Proposition 1, p. 584). Low-resolve types quit along the way; any state still standing at t* attacks. ${L} concedes at the outset with probability k/v = ${pct(e.pConcede0)}. Once a crisis begins, ${e.odds > 1.005 ? `${L} is ${f2(e.odds)} times as likely as ${H} to be a type that backs down` : e.odds < 0.995 ? `${H} is ${f2(1 / e.odds)} times as likely as ${L} to be a type that backs down` : 'the two are equally likely to back down'}, whatever the prize or the priors (p. 586).`;
  },

  effect(k, P, e, pP, pe) {
    if (!k) return '';
    const up = P[k] > pP[k];
    if (k === 'a1' || k === 'a2') {
      const i = k === 'a1' ? 0 : 1, j = 1 - i;
      const bi = i === e.H ? e.backH : e.backL, bj = j === e.H ? e.backH : e.backL;
      const pbi = pe ? (i === pe.H ? pe.backH : pe.backL) : null;
      return `${who(e, i)} can now ${up ? 'more' : 'less'} credibly tie its hands: its escalation says ${up ? 'more' : 'less'} about its resolve. Its chance of being a type that backs down in a crisis ${pbi != null ? `went from ${pct(pbi)} to ${pct(bi)}` : `is ${pct(bi)}`} (${who(e, j)}: ${pct(bj)}). Fearon’s result: the side with higher audience costs is always less likely to back down (p. 585).${Math.abs(P.a1 - P.a2) < 0.001 ? ' With equal rates the risk of war given a crisis does not depend on the rate at all (p. 586).' : ''}`;
    }
    if (k === 'W1' || k === 'W2') return `Priors about resolve change who concedes before any crisis starts (p. 586), but once both escalate, relative audience costs alone set the odds of backing down. Watch the odds hold steady while the chance of an immediate concession moves.`;
    if (k === 'v') return `A bigger prize makes both hold out longer: the horizon moves ${up ? 'out' : 'in'}.`;
    return '';
  },

  metrics(P, e) {
    return [
      { k: 't<sub>1</sub>* (state 1’s limit)', n: e.t1 },
      { k: 't<sub>2</sub>* (state 2’s limit)', n: e.t2 },
      { k: 'Horizon t*', n: e.ts, track: true },
      { k: `${who(e, e.L)} concedes at t = 0`, f: 'pct', n: e.pConcede0, track: true },
      { k: 'War', f: 'pct', n: e.pWar, track: true },
      { k: 'War, given a crisis', f: 'pct', n: e.warGivenCrisis, track: true },
      { k: 'State 1 backs down, given crisis', f: 'pct', n: e.H === 0 ? e.backH : e.backL, track: true },
      { k: 'State 2 backs down, given crisis', f: 'pct', n: e.H === 1 ? e.backH : e.backL, track: true },
      { k: 'Expected length of escalation', n: e.eT },
    ];
  },

  figures(host) {
    const a = figCard(host, 'f94-q', 'Chance each state has backed down by time t', 'Cumulative probability of backing down for each state against time, up to the horizon t*.', 'Equilibrium quit distributions of Proposition 2 (p. 584). At t* the remaining types attack.');
    const b = figCard(host, 'f94-out', 'How crises end', 'Stacked bar of outcomes: immediate concession, state 1 backs down, state 2 backs down, war.');
    return {
      draw(P, e) {
        const F = frame(a.svg, { W: 760, H: 280, m: { l: 52, r: 60, t: 14, b: 42 }, x: [0, e.ts * 1.12], y: [0, 1] });
        const c1 = e.curve.map(([t, qH, qL]) => [t, e.H === 0 ? qH : qL]);
        const c2 = e.curve.map(([t, qH, qL]) => [t, e.H === 1 ? qH : qL]);
        el('path', { d: line(F, c1), class: 'ln c1' }, F.g);
        el('path', { d: line(F, c2), class: 'ln c4' }, F.g);
        el('line', { x1: F.sx(e.ts), x2: F.sx(e.ts), y1: F.sy(0), y2: F.sy(1), class: 'bound' }, F.g);
        stext(F.g, { x: F.sx(e.ts) - 5, y: F.sy(0.95), class: 'bl', 'text-anchor': 'end' }, 'horizon t*: war');
        el('text', { x: F.sx(e.ts) + 5, y: F.sy(c1[c1.length - 1][1]) + 4, class: 'bl c1t' }, F.g, pct(c1[c1.length - 1][1]));
        el('text', { x: F.sx(e.ts) + 5, y: F.sy(c2[c2.length - 1][1]) + 4, class: 'bl c4t' }, F.g, pct(c2[c2.length - 1][1]));
        axes(F, { xt: [0, e.ts / 2, e.ts], yt: [0, 0.25, 0.5, 0.75, 1], xl: 'Escalation time t', yl: 'Backed down by t', yf: pct });
        legend(a.legend, [['--c1', 'State 1'], ['--c4', 'State 2']]);
        const parts = [
          { v: e.pConcede0, c: '--c5', t: `${who(e, e.L)} concedes at once` },
          { v: e.H === 0 ? e.firstH : e.firstL, c: '--c1', t: 'State 1 backs down' },
          { v: e.H === 1 ? e.firstH : e.firstL, c: '--c4', t: 'State 2 backs down' },
          { v: e.pWar, c: '--c2', t: 'War' },
        ];
        b.svg.innerHTML = '';
        const W = vw(b.svg);
        b.svg.setAttribute('viewBox', `0 0 ${W} 70`);
        let x = 20;
        parts.forEach(pt => {
          const w = (W - 40) * pt.v;
          el('rect', { x, y: 10, width: Math.max(0, w), height: 30, fill: `var(${pt.c})`, 'fill-opacity': 0.75 }, b.svg);
          if (w > 44) el('text', { x: x + w / 2, y: 30, 'text-anchor': 'middle', class: 'barin' }, b.svg, pct(pt.v));
          x += w;
        });
        el('text', { x: 20, y: 60, class: 'ax-t' }, b.svg, W < 700 ? 'Share of potential disputes' : 'Share of all potential disputes (who backs down first, from the equilibrium distributions)');
        legend(b.legend, parts.map(pt => [pt.c, pt.t]));
      },
    };
  },
};
