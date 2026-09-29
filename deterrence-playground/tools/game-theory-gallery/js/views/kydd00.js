// Kydd (2000) view: the trust game and the reassurance game's separating equilibrium.
import { K00_DEFAULTS, solveK00, boundCurves } from '../models/kydd00.js';
import { el, frame, axes, line, dragPlot, legend, figCard, f2, clamp, stext } from '../ui.js';
import { mark } from './common.js';

const R = (key, label, math, min, max, step, help, notional) => ({ type: 'range', key, label, math, min, max, step, help, notional });

export default {
  id: 'kydd00',
  defaults: K00_DEFAULTS,
  scaleNote: 'Mutual defection pays 0, as in Kydd. The defaults are Kydd’s own example payoffs (p. 336): R<sub>N</sub> = T<sub>M</sub> = 2, T<sub>N</sub> = R<sub>M</sub> = 1, S = 1. They are illustrative, not estimates.',

  controls() {
    return [
      R('p2', 'Player 1’s trust: chance player 2 is nice', 'p<sub>2</sub>', 0, 0.99, 0.01),
      R('a', 'Size of player 1’s first gesture', 'α', 0, 1, 0.01, 'Weight of the first round; the second is worth 1 − α.'),
      R('RN', 'Nice type: reward for mutual cooperation', 'R<sub>1N</sub>', 0.2, 4, 0.1, 'Nice types have Stag Hunt preferences.', true),
      R('SN', 'Nice type: cost of being the sucker', 'S<sub>1N</sub>', 0.2, 4, 0.1, '', true),
      R('TM', 'Mean type: temptation to exploit', 'T<sub>1M</sub>', 0.2, 4, 0.1, 'Mean types have Prisoner’s Dilemma preferences.', true),
      R('RM', 'Mean type: reward for mutual cooperation', 'R<sub>1M</sub>', 0.1, p => Math.max(0.1, +(p.TM - 0.1).toFixed(1)), 0.1, 'Below T<sub>1M</sub>.', true),
      R('SM', 'Mean type: cost of being the sucker', 'S<sub>1M</sub>', 0.2, 4, 0.1, '', true),
    ];
  },

  fix(P) { if (P.RM >= P.TM) P.RM = Math.max(0.1, +(P.TM - 0.1).toFixed(1)); },

  solve: solveK00,

  status(P, e) {
    if (e.sep && e.aOK) return { s: 'good', b: 'Reassurance works', t: 'Nice player 1 makes the gesture; the mean type will not. Nice players end up cooperating fully.' };
    if (e.sep) return { s: 'warn', b: 'Reassurance possible, wrong gesture size', t: `A gesture between ${f2(e.loC)} and ${f2(e.hiC)} would separate the types.` };
    return { s: 'bad', b: 'No reassuring equilibrium', t: P.p2 >= e.pStarM ? 'Player 1 is trusting enough that even the mean type would make the gesture.' : 'No gesture size deters the mean type yet suits the nice type.' };
  },

  why(P, e) {
    const one = `In the one-round trust game, player 1 cooperates only if trust p<sub>2</sub> exceeds p* = S/(R + S) = ${f2(e.pStarN)} (p. 332); here trust is ${f2(P.p2)}, so ${e.trustGame ? 'it would' : 'it would not'}.`;
    if (!e.sep) return `${one} In the reassurance game a separating signal needs trust between ${e.pLow != null ? f2(Math.max(0, e.pLow)) : '–'} and p<sub>2</sub>*<sup>M</sup> = ${f2(e.pStarM)}${e.propHolds ? '' : ', and it needs the nice type to be the bolder cooperator (p<sub>2</sub>*<sup>N</sup> < p<sub>2</sub>*<sup>M</sup>), which fails here (Proposition, p. 339)'}.`;
    const size = P.a <= e.lo ? `At α = ${f2(P.a)} the gesture is too cheap: a mean type would make it too, to lure player 2 into cooperating and then exploit it (p. 338).`
      : P.a >= e.hi ? `At α = ${f2(P.a)} the gesture is too risky: a nice player 1 would not stake that much on a player 2 who may be mean.`
        : `At α = ${f2(P.a)} only the nice type will stake the first round, so the gesture reveals its type.`;
    return `${one} With a first round to spend, a costly gesture can build trust. It must be large enough that the mean type won’t fake it (α > ${f2(e.lo)}) and small enough that the nice type will risk it (α < ${f2(e.hi)}). ${size} Both bounds rise with trust: the more fearful player 1 is, the smaller the first step must be, which fits Osgood’s GRIT (p. 340).`;
  },

  effect(k, P, e, pP) {
    if (!k) return '';
    const up = P[k] > pP[k];
    const T = {
      p2: `More trust raises both bounds on the gesture; past p<sub>2</sub>*<sup>M</sup> the mean type would cooperate too and the gesture stops meaning anything.`,
      a: 'The gesture’s size is player 1’s choice; the bounds say which sizes reveal a nice type.',
      RN: `The nice type values cooperation ${up ? 'more' : 'less'}, so reassurance gets ${up ? 'easier' : 'harder'} (p. 339).`,
      SN: `Being the sucker hurts the nice type ${up ? 'more' : 'less'}, so reassurance gets ${up ? 'harder' : 'easier'} (p. 339).`,
      RM: `The mean type likes cooperation ${up ? 'more' : 'less'}, so it is ${up ? 'more' : 'less'} tempted to mimic: reassurance gets ${up ? 'harder' : 'easier'} (p. 339).`,
      SM: `Being the sucker hurts the mean type ${up ? 'more' : 'less'}, which makes faking a gesture ${up ? 'riskier' : 'cheaper'} and reassurance ${up ? 'easier' : 'harder'} (p. 339).`,
      TM: `The mean type’s temptation sets the lower bound: a bigger prize from fooling player 2 needs a ${up ? 'bigger' : 'smaller'} gesture to deter it.`,
    };
    return T[k] || '';
  },

  metrics(P, e) {
    return [
      { k: 'Trust-game threshold p*', n: e.pStarN },
      { k: 'Upper bound on trust p<sub>2</sub>*<sup>M</sup>', n: e.pStarM, track: true },
      { k: 'Lower bound on trust', n: e.pLow },
      { k: 'Smallest separating gesture', n: e.sep ? e.lo : null, track: true },
      { k: 'Largest separating gesture', n: e.sep ? Math.min(1, e.hi) : null, track: true },
      { k: 'This gesture separates', f: 'raw', s: e.sep && e.aOK ? 'yes' : 'no', n: e.sep && e.aOK ? 1 : 0, track: true },
    ];
  },

  figures(host, P, set) {
    const a = figCard(host, 'k00-b', 'Which gesture sizes reassure, by player 1’s trust', 'Chart of the lower and upper bounds on the first-round gesture against trust, with the separating band shaded. Click to move the point.', 'Click or drag to set trust and gesture size. Shaded band: sizes that separate nice from mean.');
    a.svg.classList.add('drag');
    let F = null;
    dragPlot(a.svg, () => F, (x, y) => set({ p2: +clamp(x, 0, 0.99).toFixed(2), a: +clamp(y, 0, 1).toFixed(2) }));
    return {
      draw(P, e) {
        F = frame(a.svg, { W: 760, H: 300, m: { l: 52, r: 16, t: 14, b: 42 }, x: [0, 1], y: [0, 1] });
        const pts = boundCurves(P);
        const band = pts.filter(([p2, lo, hi]) => p2 < e.pStarM && lo < hi && lo < 1);
        if (band.length > 1) {
          const top = band.map(([p2, , hi]) => [p2, Math.min(1, hi)]), bot = band.map(([p2, lo]) => [p2, Math.max(0, lo)]).reverse();
          el('path', { d: line(F, top) + line(F, bot).replace('M', 'L') + 'Z', class: 'bandfill' }, F.g);
        }
        el('path', { d: line(F, pts.map(([p2, lo]) => [p2, clamp(lo, 0, 1)])), class: 'ln c2' }, F.g);
        el('path', { d: line(F, pts.map(([p2, , hi]) => [p2, clamp(hi, 0, 1)])), class: 'ln c1' }, F.g);
        [[e.pStarN, 'p* (trust game)'], [e.pStarM, 'p₂*ᴹ']].forEach(([x, t], i) => {
          if (x > 0 && x < 1) { el('line', { x1: F.sx(x), x2: F.sx(x), y1: F.sy(0), y2: F.sy(1), class: 'bound' }, F.g); stext(F.g, { x: F.sx(x) + 4, y: F.sy(0.06 + 0.07 * i), class: 'bl' }, t); }
        });
        mark(F, P.p2, P.a);
        axes(F, { xt: [0, 0.25, 0.5, 0.75, 1], yt: [0, 0.5, 1], xl: 'Player 1’s trust p₂', yl: 'Gesture size α' });
        legend(a.legend, [['--c2', 'lower bound: mean type won’t fake it'], ['--c1', 'upper bound: nice type will risk it'], ['--c3', 'separating gestures']]);
      },
    };
  },
};
