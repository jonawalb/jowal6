// Gaussian precision-weighting engine: a line-by-line port of sim/engine.py from
// Walberg, "Emotional Priors and Narrative Warfare: A Bayesian Game of Cognitive Manipulation" (working paper, June 2026).
//
//   Prior θ ~ N(μ0, 1/ρ0). Signal s = θ + ε, ε ~ N(0, 1/ρs).
//   Neutral update:  ρ' = ρ0 + ρs,        μ' = (ρ0 μ0 + ρs s) / ρ'
//   Emotional (λ):   ρ' = ρ0 + λ ρs,      μ' = (ρ0 μ0 + λ ρs s) / ρ'     (fear λ > 1, misplaced trust λ < 1)
//   Anger (κ):       ρ' ← ρ' · κ, applied after the update (compresses variance; does not touch the gain)
//   Signal-contingent λ: λ_good applies when δ = s − μ ≥ 0 (in this tool, news that raises perceived threat),
//   λ_bad when δ < 0 (news that lowers it). Names follow the paper's code.

export const NEUTRAL = { lam: 1, kappa: 1 };

/** One update. p = { mu, rho }. em = { lam, lamGood, lamBad, kappa }. Returns a new posterior. */
export function update(p, s, rhoS, em = NEUTRAL) {
  const d = s - p.mu;
  const lam = d < 0 ? (em.lamBad ?? em.lam ?? 1) : (em.lamGood ?? em.lam ?? 1);
  let rho = p.rho + lam * rhoS;
  const mu = (p.rho * p.mu + lam * rhoS * s) / rho;
  rho *= em.kappa ?? 1;
  return { mu, rho };
}

/** Distorted Kalman gain K(λ) = λρs / (ρ0 + λρs). */
export const gainK = (lam, rho0, rhoS) => lam * rhoS / (rho0 + lam * rhoS);

/** Error function (Abramowitz and Stegun 7.1.26, max error 1.5e-7). */
export function erf(x) {
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}

/** Action readout: P(θ > c | posterior), the citizen's propensity to act on perceived threat. */
export function actionProb(p, c) {
  const sd = 1 / Math.sqrt(p.rho);
  return 0.5 * (1 - erf((c - p.mu) / (sd * Math.SQRT2)));
}

/** Decaying campaign intensity: λ_t = 1 + (λ0 − 1)(1 − ρe)^t (paper, FH2). */
export const decayed = (x0, rhoE, t) => 1 + (x0 - 1) * (1 - rhoE) ** t;
