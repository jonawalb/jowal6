// Smash the red line: either side forces the Patron to decide, ending the game. Pure; no DOM.
import { R_VALUES, SMASH, LEVELS } from '../data/params.js';
import { baseline } from './normal.js';

const K = SMASH.k;
export const canSmash = s => !s.over && s.turn >= SMASH.from;

/** How severe the Patron finds the smash: the Power's all-in seizure, or the worst the Coastal State has recently suffered plus the treaty invocation. */
export function severity(s, side) {
  if (side === 'p') return SMASH.sever.p;
  const recent = s.history.slice(-SMASH.sever.cWindow).map(h => h.E || 0);
  return Math.max(0, ...recent) + SMASH.sever.cBase;
}

/** The drivers of the Patron's decision, in log-odds, for a given line R. */
export function drivers(s, side, R) {
  const b = baseline(s);
  return [
    ['How far past the Patron’s line', K.gap * (severity(s, side) - R)],
    ['Patron credibility', K.cred * (s.cred - 50) / 10],
    ['International sympathy', K.sym * (s.sympathy - 50) / 10],
    ['Escalation risk (makes it cautious)', -K.esc * Math.max(0, s.esc - K.escFrom) / 10],
    [`Normalized rungs (${b ? LEVELS[b].label.toLowerCase() + ' and below' : 'none'})`, -K.normal * b],
    ...(side === 'c' ? [['Being dragged in by its ally', -K.coastal]] : []),
  ];
}
const logistic = z => Math.min(SMASH.clamp[1], Math.max(SMASH.clamp[0], 1 / (1 + Math.exp(-z))));
/** True chance the Patron steps in (uses the hidden line). */
export const pStepIn = (s, side, R = s.R) => logistic(K.const + drivers(s, side, R).reduce((a, [, v]) => a + v, 0));
/** The player's estimate: averaged over their belief about the line. */
export const estimate = (s, side) => s.bR.reduce((a, w, i) => a + w * pStepIn(s, side, R_VALUES[i]), 0);
/** The drivers at the believed (mean) line, for the on-screen breakdown. */
export function estimateDrivers(s, side) {
  const meanR = s.bR.reduce((a, w, i) => a + w * R_VALUES[i], 0);
  return drivers(s, side, meanR);
}

/** Resolve a smash. roll1 decides the Patron, roll2 a clash. Returns the ending. */
export function resolveSmash(s, side, roll1, roll2) {
  const p = pStepIn(s, side), est = estimate(s, side), stepIn = roll1 < p;
  const clashP = stepIn ? Math.max(0, Math.min(1, (s.esc - SMASH.clash.from) / SMASH.clash.span)) : 0;
  const clash = stepIn && roll2 < clashP;
  const info = { side, p, est, stepIn, clashP, clash, drivers: drivers(s, side, s.R) };
  const over = clash ? { reason: 'clash', title: 'The smash ends in a clash', text: 'The Patron stepped in, but with risk this high its ships and the Power’s cutters exchanged fire. Both governments lost control.' }
    : side === 'p' ? (stepIn
      ? { reason: 'smash_patron', title: 'The Power smashed the line, and the Patron stepped in', text: 'The Power seized the outpost under a cordon. The Patron sent its ships and the Power had to hand the garrison back. The Coastal State keeps the shoal.' }
      : { reason: 'smash_power', title: 'The Power smashed the line, and the Patron stayed out', text: 'The Power seized the outpost and detained the garrison. The Patron protested and did nothing more. The shoal is the Power’s.' })
    : (stepIn
      ? { reason: 'smash_patron', title: 'The Coastal State forced the issue, and the Patron came', text: 'A massive publicized resupply with Patron observers aboard pushed through every block while the Coastal State invoked the treaty. The Patron escorted it in and the Power stood down.' }
      : { reason: 'smash_abandoned', title: 'The Coastal State forced the issue, and the Patron stayed out', text: 'The Coastal State invoked the treaty and the Patron would not come. The convoy was turned back, the garrison was forced out, and the Patron’s word is worth less everywhere.' });
  return { over, info };
}
