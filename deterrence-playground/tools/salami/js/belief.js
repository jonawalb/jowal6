// Bayes' rule over the two hidden thresholds. Pure functions; every observation used here is public.
import { R_VALUES, T_VALUES, PATRON_TABLE, RESPONSES, SPIKE, STATEMENT } from '../data/params.js';

const clampGap = d => String(Math.max(-3, Math.min(1, d)));

/** Probability of each Patron response (silence, concern, warning, intervene) at effective level E against line R. */
export const patronProbs = (E, R) => PATRON_TABLE[clampGap(E - R)];
export const patronLik = (resp, E, R) => patronProbs(E, R)[RESPONSES.indexOf(resp)];

/** Probability the Power snaps given provocation P and threshold T. */
export function spikeProb(P, T) {
  const g = P - T;
  return g >= 0 ? SPIKE.at : g === -1 ? SPIKE.near : SPIKE.far;
}

// Standard normal CDF (Abramowitz and Stegun 7.1.26).
function phi(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}
/** Likelihood of a Patron statement category given line R. */
export function statementLik(cat, R) {
  const [a, b] = STATEMENT.cut, sd = STATEMENT.sd;
  const lo = phi((a - R) / sd), mid = phi((b - R) / sd) - lo;
  return cat === 'explicit' ? lo : cat === 'firm' ? mid : 1 - lo - mid;
}
export function statementCat(reading) {
  const [a, b] = STATEMENT.cut;
  return reading < a ? 'explicit' : reading < b ? 'firm' : 'vague';
}

/** Multiply a belief by a likelihood over its support and renormalise (returns a new array). */
export function update(belief, values, lik) {
  const post = belief.map((b, i) => b * lik(values[i]));
  const z = post.reduce((s, v) => s + v, 0);
  return z > 0 ? post.map(v => v / z) : belief.slice();
}
export const updateR = (b, lik) => update(b, R_VALUES, lik);
export const updateT = (b, lik) => update(b, T_VALUES, lik);

/** Expected probability the Patron intervenes at effective level E under belief bR. */
export const pIntervene = (bR, E) => (E <= 0 ? 0 : bR.reduce((s, b, i) => s + b * patronProbs(E, R_VALUES[i])[3], 0));
/** Expected probability the Power snaps at provocation P (threshold shifted by tAdj) under belief bT. */
export const pSpike = (bT, P, tAdj = 0) => bT.reduce((s, b, i) => s + b * spikeProb(P, T_VALUES[i] - tAdj), 0);
export const mode = (b, values) => values[b.reduce((k, v, i) => (v > b[k] ? i : k), 0)];
export const mean = (b, values) => b.reduce((s, v, i) => s + v * values[i], 0);
