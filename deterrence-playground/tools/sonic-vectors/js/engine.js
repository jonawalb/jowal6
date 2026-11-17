// Sonic Vectors engine. Pure functions, no DOM.
//
// Walberg's model (source design §3): a receiver with prior π that claim c is true sees evidence s with likelihood
// ratio L(s|c). An affect-modulated receiver updates as
//     posterior ∝ π · L(s|c)^λ(a),   i.e.   logit(posterior) = logit(π) + λ(a) · ℓ,   ℓ = log L(s|c=1)/L(s|c=0).
// λ(a) rises with arousal and with valence congruence between the feeling and the claim. This tool uses the simplest
// such form, λ(a) = 1 + κ · arousal · congruence (λ = 1 is the ordinary Bayesian receiver). The functional form and
// every number are notional teaching choices of this tool, not estimates. The same λ-attack primitive drives
// tools/bayesian-attack (Gaussian version); here it gets an audio input a and a sender who can buy it.
import { mulberry32, normal } from './rng.js';

export const logit = p => Math.log(p / (1 - p));
export const sigmoid = x => 1 / (1 + Math.exp(-x));

/** λ(a) = 1 + κ · arousal · congruence. arousal and congruence in [0, 1]. */
export const lambdaOf = (arousal, kappa, cong = 1) => 1 + kappa * arousal * cong;

/** Posterior that the claim is true: σ(logit π + λ ℓ). */
export const posterior = (pi, ell, lam = 1) => sigmoid(logit(pi) + lam * ell);

// ---------- P1 Substitution ----------
/**
 * Sender's best response. It picks fabricated evidence f ≥ 0 (extra log-likelihood added to the true ℓ0) and
 * musical arousal A in [0, 1], to maximise  U = τ · posterior(π, ℓ0 + f, λ(A)) − cs · f − cm · A.
 * Solved by grid search (f step 0.05 to 3, A step 0.02).
 */
export function bestResponse(p, { F_MAX = 3, F_STEP = 0.05, A_STEP = 0.02 } = {}) {
  let best = null;
  const nf = Math.round(F_MAX / F_STEP), na = Math.round(1 / A_STEP);
  for (let i = 0; i <= nf; i++) {
    const f = i * F_STEP;
    for (let j = 0; j <= na; j++) {
      const A = j * A_STEP;
      const P = posterior(p.pi, p.l0 + f, lambdaOf(A, p.kappa, p.cong));
      const U = p.tau * P - p.cs * f - p.cm * A;
      if (!best || U > best.U + 1e-12) best = { f, A, P, U };
    }
  }
  best.honest = posterior(p.pi, p.l0);
  best.spendFake = p.cs * best.f;
  best.spendMusic = p.cm * best.A;
  return best;
}

/** Best response across a log-spaced sweep of the music cost cm (high to low). */
export function substitutionSweep(p, range = [0.01, 2], n = 61) {
  const [a, b] = range.map(Math.log10), out = [];
  for (let i = 0; i < n; i++) {
    const cm = 10 ** (b - (b - a) * i / (n - 1));
    out.push({ cm, ...bestResponse({ ...p, cm }) });
  }
  return out;
}

/** Regime label for a best response. */
export function regime(r) {
  if (r.f > 0 && r.A > 0) return 'both';
  if (r.f > 0) return 'fake';
  if (r.A > 0) return 'music';
  return 'none';
}

// ---------- P2 Asymmetric defense ----------
/** Arousal at hour t with half-life h, after an optional affect-targeted correction at tc. */
export const arousalAt = (a0, h, t) => a0 * 2 ** (-t / h);

/**
 * Two attacks that move belief by the same amount at hour 0:
 *  - fake: fabricated evidence f = (λ(a0) − 1) ℓ0 with no music (λ = 1). Fabricated evidence does not fade.
 *  - music: the true evidence ℓ0 with a song at arousal a0. The receiver's weight tracks current arousal, which halves
 *    every h hours (assumption: when the feeling fades, the extra weight fades with it).
 * A correction arrives at hour tc with efficacy e.
 *  - 'text' fact-check acts on the evidence: it removes a share e of the fabricated part of ℓ. The music attack uses
 *    true evidence, so a text fact-check has nothing false to remove there. That is P2's premise, built in.
 *  - 'affect' correction (names the feeling and its source) acts on a: it scales arousal by (1 − e). It does nothing
 *    to the fake, which carries no feeling.
 */
export function correctionPaths(p, hours = 72, step = 0.25) {
  const lam0 = lambdaOf(p.a0, p.kappa, p.cong);
  const f = (lam0 - 1) * p.l0;
  const truth = posterior(p.pi, p.l0);
  const fake = [], music = [];
  for (let t = 0; t <= hours + 1e-9; t += step) {
    const after = t >= p.tc;
    const fEff = after && p.corr === 'text' ? f * (1 - p.eff) : f;
    const A = arousalAt(p.a0, p.half, t) * (after && p.corr === 'affect' ? 1 - p.eff : 1);
    fake.push([t, posterior(p.pi, p.l0 + fEff)]);
    music.push([t, posterior(p.pi, p.l0, lambdaOf(A, p.kappa, p.cong))]);
  }
  return { fake, music, truth, f, lam0, start: posterior(p.pi, p.l0, lam0) };
}

/** Excess belief over what the true evidence justifies, just before and just after the correction, for both attacks. */
export function correctionSummary(p) {
  const truth = posterior(p.pi, p.l0);
  const lam0 = lambdaOf(p.a0, p.kappa, p.cong), f = (lam0 - 1) * p.l0;
  const A = arousalAt(p.a0, p.half, p.tc);
  const fakeBefore = posterior(p.pi, p.l0 + f) - truth;
  const fakeAfter = posterior(p.pi, p.l0 + (p.corr === 'text' ? f * (1 - p.eff) : f)) - truth;
  const musicBefore = posterior(p.pi, p.l0, lambdaOf(A, p.kappa, p.cong)) - truth;
  const musicAfter = posterior(p.pi, p.l0, lambdaOf(A * (p.corr === 'affect' ? 1 - p.eff : 1), p.kappa, p.cong)) - truth;
  const start = posterior(p.pi, p.l0 + f) - truth;
  // Hour at which the music excess (with no affect correction) falls to the fake's post-correction excess.
  let cross = null;
  for (let t = 0; t <= 500; t += 0.25) {
    const ex = posterior(p.pi, p.l0, lambdaOf(arousalAt(p.a0, p.half, t), p.kappa, p.cong)) - truth;
    if (ex <= fakeAfter + 1e-12) { cross = t; break; }
  }
  return {
    truth, start, fakeBefore, fakeAfter, musicBefore, musicAfter,
    removedFake: fakeBefore > 0 ? 1 - fakeAfter / fakeBefore : 0,
    removedMusic: musicBefore > 0 ? 1 - musicAfter / musicBefore : 0,
    decayedMusic: start > 0 ? 1 - musicBefore / start : 0,
    cross,
  };
}

// ---------- P3 Coordination ----------
/** Standard normal CDF via erf (Abramowitz and Stegun 7.1.26). */
export function Phi(x) {
  const z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.3275911 * z);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

/**
 * Population view. N listeners with priors spread around π (logit-normal, sd `spread`) each hear content that sets
 * arousal A_i = Φ(√w · z_common + √(1−w) · z_i), uniform on [0, 1] for every w. w is the share of the feeling that
 * comes from one common melody: w = 0 means each listener's mood is independent; w near 1 means one song moves
 * everyone together. Each listener updates on the same true evidence ℓ0 and acts if belief exceeds `act`.
 * Repeated over many episodes (one fresh song and fresh moods each time). Priors are fixed across episodes.
 */
export function population(p, { N = 300, EPISODES = 300, SEED = 2026, MASS = 0.5 } = {}) {
  const r = mulberry32(SEED);
  const priors = Array.from({ length: N }, () => logit(p.pi) + p.spread * normal(r));
  const zc = Array.from({ length: EPISODES }, () => normal(r));
  const zi = Array.from({ length: EPISODES }, () => Float64Array.from({ length: N }, () => normal(r)));
  const run = w => {
    const a = Math.sqrt(w), b = Math.sqrt(1 - w), shares = [];
    for (let e = 0; e < EPISODES; e++) {
      let k = 0;
      for (let i = 0; i < N; i++) {
        const A = Phi(a * zc[e] + b * zi[e][i]);
        const lam = lambdaOf(A, p.kappa, p.cong);
        const post = sigmoid(priors[i] + lam * p.l0);
        if (post > p.act) k++;
      }
      shares.push(k / N);
    }
    const mean = shares.reduce((s, x) => s + x, 0) / EPISODES;
    const sd = Math.sqrt(shares.reduce((s, x) => s + (x - mean) ** 2, 0) / EPISODES);
    const mass = shares.filter(x => x > MASS).length / EPISODES;
    return { shares, mean, sd, mass, max: Math.max(...shares), min: Math.min(...shares), argmax: shares.indexOf(Math.max(...shares)) };
  };
  const out = { indep: run(0), melody: run(p.w) };
  out.corr = updateCorrelation(p, zc, zi);
  out.draw = { priors, zc, zi };
  return out;
}

/** Who acts in episode e at melody share w (for the dot grid). */
export function episodeFlags(p, pop, e, w) {
  const { priors, zc, zi } = pop.draw, a = Math.sqrt(w), b = Math.sqrt(1 - w);
  return priors.map((pr, i) => sigmoid(pr + lambdaOf(Phi(a * zc[e] + b * zi[e][i]), p.kappa, p.cong) * p.l0) > p.act);
}

/** Correlation between two listeners' belief updates (λ ℓ0) across episodes, pooled over 50 listener pairs. */
function updateCorrelation(p, zc, zi) {
  const c = w => {
    const a = Math.sqrt(w), b = Math.sqrt(1 - w), xs = [], ys = [];
    for (let k = 0; k < 50; k++) for (let e = 0; e < zc.length; e++) {
      xs.push(lambdaOf(Phi(a * zc[e] + b * zi[e][2 * k]), p.kappa, p.cong) * p.l0);
      ys.push(lambdaOf(Phi(a * zc[e] + b * zi[e][2 * k + 1]), p.kappa, p.cong) * p.l0);
    }
    const mx = xs.reduce((s, x) => s + x, 0) / xs.length, my = ys.reduce((s, x) => s + x, 0) / ys.length;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
  };
  return { indep: c(0), melody: c(p.w) };
}
