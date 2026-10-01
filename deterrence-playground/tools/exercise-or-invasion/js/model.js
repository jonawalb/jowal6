// Signatures, readings and the Bayesian warning model. Pure functions, no DOM.
import { P } from '../data/params.js';

export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const logit = p => Math.log(p / (1 - p));
export const sigmoid = z => 1 / (1 + Math.exp(-z));
export const inWindow = (s, w = s.week) => s.windows.some(a => w >= a && w < a + P.calendar.windowLen);

/** Diminishing returns within one activity in one week. */
export const eff = n => n - P.readiness.stack * n * (n - 1);

/** Sensitivity of a source to an activity after Blue's sources have been exposed. */
export const sens = (s, k, a) => (P.S[k][a] || 0) * (1 - P.model.exposureHit * (s.exposure[k] || 0));

/** Readiness gained by a Red move this week. */
export function readinessGain(m) {
  const c = P.cover[m.cover] || P.cover.open;
  return P.prep.reduce((g, a) => g + P.readiness.gain[a] * eff(m.a[a] || 0), 0) * c.gain;
}

/** The true signature each source would read (before noise) for Red's move. */
export function signature(s, m) {
  const c = P.cover[m.cover] || P.cover.open;
  const hide = 1 - Math.min(P.deception.max, P.deception.perPoint * (m.a.deception || 0));
  const quiet = 1 - Math.min(P.comms.max, P.comms.perPoint * (m.a.comms || 0));
  const tempo = (m.a.tempo || 0) + (c.tempo || 0);
  const out = {};
  for (const k of P.sources) {
    let prep = 0;
    for (const a of P.prep) prep += sens(s, k, a) * (m.a[a] || 0);
    prep *= c.sig * hide * (k === 'signals' ? quiet : 1);
    out[k] = prep + sens(s, k, 'tempo') * tempo + (k === 'osint' ? P.deception.osint * (m.a.deception || 0) : 0);
  }
  return out;
}

/** Blue's model of one source's reading this week under attack (A) and exercise-only (E): mean and variance.
 * Tempo is uncertain under both; an attacker is expected to trade some tempo for preparation. */
export function expected(s, k, c, snap = false) {
  const M = P.model, win = inWindow(s);
  const t = (win ? M.tempo.window : M.tempo.off) + (snap ? P.cover.snap.tempo : 0);
  const prep = P.prep.reduce((x, a) => x + sens(s, k, a), 0), st = sens(s, k, 'tempo');
  const noise = (P.sigma[k] ** 2) / Math.max(1, c) + M.tau ** 2 + (st * M.tempoSd) ** 2;
  return {
    A: st * Math.max(0, t - (win ? M.tempoTradeA : 0)) + prep * M.prepA * M.maskA, vA: noise + (prep * M.prepSdA) ** 2,
    E: st * t + prep * M.prepE, vE: noise + (prep * M.prepSdE) ** 2,
  };
}
const logN = (x, m, v) => -0.5 * Math.log(v) - (x - m) ** 2 / (2 * v);

/** Log-likelihood ratio (attack vs exercise) of one reading x from c points of collection. */
export function llr(s, k, x, c, snap) {
  const e = expected(s, k, c, snap);
  return logN(x, e.A, e.vA) - logN(x, e.E, e.vE);
}
export const LLR_CAP = 1.5;           // no single week moves the model by more than this (analyst humility; see METHOD.md)
export const SNAP_LLR = Math.log(2);  // a declared snap exercise is twice as likely if Red intends to attack

/** Weekly evidence from a set of readings. */
export function weekEvidence(s, readings, collect, snap) {
  let z = 0;
  for (const k of P.sources) if (collect[k] > 0 && readings[k] != null) z += llr(s, k, readings[k], collect[k], snap);
  return clamp(z, -LLR_CAP, LLR_CAP) + (snap ? SNAP_LLR : 0);
}

/** How well c points on source k separate the two hypotheses (symmetric Kullback-Leibler divergence). */
export function separation(s, k, c) {
  if (c <= 0) return 0;
  const e = expected(s, k, c);
  return 0.5 * (e.vA / e.vE + e.vE / e.vA - 2) + 0.5 * (e.A - e.E) ** 2 * (1 / e.vA + 1 / e.vE);
}

/** Information-greedy collection plan: add points one at a time where they separate the hypotheses most. */
export function greedyCollect(s, total = P.bluePoints) {
  const c = Object.fromEntries(P.sources.map(k => [k, 0]));
  for (let i = 0; i < total; i++) {
    let best = null, gain = -1;
    for (const k of P.sources) {
      if (c[k] >= P.maxPerSource) continue;
      const g = separation(s, k, c[k] + 1) - separation(s, k, c[k]);
      if (g > gain + 1e-9) { gain = g; best = k; }
    }
    if (best) c[best]++;
  }
  return c;
}

/** Red's estimate of how much this week raises Blue's suspicion: the expected evidence Blue would draw
 * from Red's true signature under Blue's information-greedy collection plan. */
export function expectedEvidence(s, sig, snap) {
  const c = greedyCollect(s);
  let z = 0;
  for (const k of P.sources) if (c[k] > 0) {
    const e = expected(s, k, c[k], snap), n = (P.sigma[k] ** 2) / c[k];
    z += -0.5 * Math.log(e.vA / e.vE) - ((sig[k] - e.A) ** 2 + n) / (2 * e.vA) + ((sig[k] - e.E) ** 2 + n) / (2 * e.vE);
  }
  return clamp(z, -LLR_CAP, LLR_CAP) + (snap ? SNAP_LLR : 0);
}

/** Odds that an attack succeeds now. */
export function attackOdds(R, M) {
  const a = P.attack, r0 = P.readiness.attackMin;
  return clamp(a.base + (a.top - a.base) * clamp((R - r0) / (100 - r0), 0, 1) - a.mobilization * M, a.clamp[0], a.clamp[1]);
}

/** Mobilization gained per week while warned, given credibility. */
export const mobRate = C => P.warn.rate.base + P.warn.rate.cred * C / 100;
