// Scoring. Bayes' rule in odds form and the implied evidence weight.
// Form from Walberg, Sonic Vectors design spec (working paper, June 2026):
//   posterior odds = prior odds * LR^lambda. lambda = 1 is the Bayesian weight.
// Clamping, the cap on lambda-hat and the miscalibration score are this tool's own (notional) choices.

import { ROUNDS } from '../data/rounds.js';

const odds = p => p / (1 - p);
const clampP = p => Math.min(0.99, Math.max(0.01, p));
export const LAM_MIN = -1, LAM_MAX = 4;

/** Bayesian posterior for a prior and likelihood ratio. */
export const bayes = (prior, lr) => (prior * lr) / (prior * lr + 1 - prior);

/** Implied weight on the report, from one answer (0-1). */
export function lambdaHat(prior, lr, answer) {
  const l = Math.log(odds(clampP(answer)) / odds(prior)) / Math.log(lr);
  return Math.min(LAM_MAX, Math.max(LAM_MIN, l));
}

/** Distance from the Bayesian weight, capped at 3. */
export const miscal = l => Math.min(3, Math.abs(l - 1));

/** Score every answered round. answers: { id: 0..100 }. */
export function scoreAll(answers) {
  const out = {};
  for (const r of ROUNDS) {
    const a = answers[r.id];
    if (a == null) continue;
    const b = bayes(r.prior, r.lr);
    const lam = lambdaHat(r.prior, r.lr, a / 100);
    out[r.id] = { r, answer: a, bayes: b * 100, lam, mis: miscal(lam), pull: a - b * 100 };
  }
  return out;
}

const mean = xs => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;

/**
 * Twin-pair summaries by part: loaded minus neutral miscalibration and pull.
 * opts.skip: loaded-round ids whose pull never ran (the soundtrack round with sound off). Those pairs
 * are still returned (flag skip) for display but left out of every average.
 */
export function summary(scored, opts = {}) {
  const skip = new Set(opts.skip || []);
  const pairs = ROUNDS.filter(r => r.kind === 'loaded' && scored[r.id] && scored[r.twin])
    .map(r => {
      const L = scored[r.id], N = scored[r.twin];
      return { r, L, N, gap: L.mis - N.mis, pullGap: L.pull - N.pull, skip: skip.has(r.id) };
    });
  const by = part => pairs.filter(p => p.r.part === part && !p.skip);
  const s = part => {
    const ps = by(part);
    return ps.length ? {
      n: ps.length,
      misL: mean(ps.map(p => p.L.mis)), misN: mean(ps.map(p => p.N.mis)),
      gap: mean(ps.map(p => p.gap)), pullGap: mean(ps.map(p => p.pullGap)),
    } : null;
  };
  const p2 = by(2);
  return {
    pairs, p1: s(1), p2: s(2),
    seen: mean(p2.filter(p => p.r.seen).map(p => p.gap)),
    unseen: mean(p2.filter(p => !p.r.seen).map(p => p.gap)),
  };
}

export const fmtLam = l => (l <= LAM_MIN ? '≤ ' : l >= LAM_MAX ? '≥ ' : '') + l.toFixed(2).replace('-', '−');
export const fmtSigned = (x, d = 2) => {
  const r = Number(x.toFixed(d)); // round first so a tiny gap never prints as −0.00
  return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(d);
};

/** Plain-English reading of one weight: how far the answer moved relative to what the report justifies. */
export function readLam(l) {
  if (l < 0) return 'moved the wrong way';
  if (l > 1.15) return 'moved further than the report justifies';
  if (l < 0.85) return 'moved less far than the report justifies';
  return 'moved about as far as the report justifies';
}
