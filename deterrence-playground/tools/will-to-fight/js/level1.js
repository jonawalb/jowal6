// Level 1: cohesion W as a linear-normal global game. Pure functions, no DOM.
// Every formula cites the equation number in Will_to_Fight_Theory_Memo (Section 3). The memo is the source of truth.
import { Phi, phi, PhiInv, SQRT2PI } from './normal.js';

/** (1) Public prior mean: mu = theta0 + lamL*ell + lamP*pi + r*A. */
export function muOf(p) {
  return p.theta0 + p.lamL * p.ell + p.lamP * p.pi + p.r * p.A;
}

/** Precision-derived constants. (6) s, (9) h, (15) sigmaT. */
export function consts(alpha, beta) {
  const s = Math.sqrt(1 / (alpha + beta) + 1 / beta);   // (6) sd of x_j given x_i
  const h = alpha / ((alpha + beta) * s);                 // (9) slope inside Phi in g
  const sigT = Math.sqrt(1 / alpha + 1 / beta);           // (15) sd of (x_j - mu) under the prior
  return { s, h, sigT };
}

/** (5) Posterior mean m(x) = (alpha*mu + beta*x)/(alpha+beta). */
export const postMean = (x, mu, alpha, beta) => (alpha * mu + beta * x) / (alpha + beta);

/** (8) Expected payoff of fighting at signal x when everyone else uses cutoff c. */
export function payoff(x, c, mu, p) {
  const { s } = consts(p.alpha, p.beta);
  const m = postMean(x, mu, p.alpha, p.beta);
  return m + p.b * Phi((m - c) / s) - p.k;
}

/** (9) Indifference function g(x) = m(x) + b*Phi(h*(mu - x)) - k. Threshold equilibria are its roots. */
export function g(x, mu, p) {
  const { h } = consts(p.alpha, p.beta);
  return postMean(x, mu, p.alpha, p.beta) + p.b * Phi(h * (mu - x)) - p.k;
}

/** (10) g'(x) = [beta - b*alpha*phi(h(mu-x))/s] / (alpha+beta). */
export function gPrime(x, mu, p) {
  const { s, h } = consts(p.alpha, p.beta);
  return (p.beta - p.b * p.alpha * phi(h * (mu - x)) / s) / (p.alpha + p.beta);
}

/**
 * (11) Proposition 1. Uniqueness for every (mu, k) iff beta*s >= b*alpha/sqrt(2*pi),
 * i.e. sqrt(beta(alpha+2beta)/(alpha+beta)) >= b*alpha/sqrt(2pi). Also returns b_c (11b) and alpha_c (21).
 */
export function uniqueness(p) {
  const { s } = consts(p.alpha, p.beta);
  const lhs = p.beta * s;                       // = sqrt(beta(alpha+2beta)/(alpha+beta))
  const rhs = p.b * p.alpha / SQRT2PI;
  return { lhs, rhs, margin: lhs - rhs, unique: lhs >= rhs, bCrit: SQRT2PI * lhs / p.alpha, alphaCrit: alphaCrit(p.beta, p.b) };
}

/**
 * (21) alpha_c(beta, b): the unique alpha > 0 with sqrt(beta(alpha+2beta)/(alpha+beta)) = b*alpha/sqrt(2pi),
 * equivalently the positive root of b^2 a^3 + b^2 beta a^2 - 2pi beta a - 4pi beta^2 = 0. Infinity when b = 0.
 * It lies in (sqrt(2 pi beta)/b, 2 sqrt(pi beta)/b].
 */
export function alphaCrit(beta, b) {
  if (!(b > 0)) return Infinity;
  const f = a => Math.sqrt(beta * (a + 2 * beta) / (a + beta)) - b * a / SQRT2PI;
  let lo = Math.sqrt(2 * Math.PI * beta) / b * (1 - 1e-12), hi = 2 * Math.sqrt(Math.PI * beta) / b * (1 + 1e-12);
  for (let i = 0; i < 200; i++) { const m = 0.5 * (lo + hi); if (f(m) > 0) lo = m; else hi = m; }
  return 0.5 * (lo + hi);
}

/** (12) Every root of g lies in [((a+B)(k-b) - a*mu)/B, ((a+B)k - a*mu)/B]. */
export function rootBracket(mu, p) {
  const { alpha: a, beta: B } = p;
  return [((a + B) * (p.k - p.b) - a * mu) / B, ((a + B) * p.k - a * mu) / B];
}

function bisect(f, lo, hi, flo) {
  for (let i = 0; i < 80; i++) {
    const m = 0.5 * (lo + hi), fm = f(m);
    if (fm === 0) return m;
    if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else hi = m;
  }
  return 0.5 * (lo + hi);
}

/**
 * All threshold equilibria: the roots of g (9), found by scanning the exact bracket (12) on a fine grid and
 * bisecting every sign change. Sorted ascending: roots[0] is the high-cohesion equilibrium, the last the low one.
 */
export function roots(mu, p, n = 1600) {
  const [L, U] = rootBracket(mu, p);
  const pad = 1e-9 + 1e-6 * (U - L);
  const lo = L - pad, hi = U + pad, f = x => g(x, mu, p);
  const out = [];
  let x0 = lo, f0 = f(x0);
  for (let i = 1; i <= n; i++) {
    const x1 = lo + (hi - lo) * i / n, f1 = f(x1);
    if (f0 === 0) out.push(x0);
    else if ((f0 < 0) !== (f1 < 0) && f1 !== 0) out.push(bisect(f, x0, x1, f0));
    x0 = x1; f0 = f1;
  }
  if (f0 === 0) out.push(x0);
  return out;
}

/**
 * (12b) Multiplicity band (Prop. 1d). If Gamma = sqrt(2pi) beta s - b alpha < 0, g has three roots exactly when
 * |mu - mu_dagger| < Delta, Delta = b(Phi(z0) - 1/2) - beta s z0 / alpha, z0 = sqrt(2 ln(b alpha / (sqrt(2pi) beta s))).
 * Returns null when (11) holds.
 */
export function multiplicityBand(p) {
  const { s } = consts(p.alpha, p.beta), bs = p.beta * s;
  if (!(p.b * p.alpha > SQRT2PI * bs)) return null;
  const z0 = Math.sqrt(2 * Math.log(p.b * p.alpha / (SQRT2PI * bs)));
  const half = p.b * (Phi(z0) - 0.5) - bs * z0 / p.alpha, mt = p.k - p.b / 2;
  return { lo: mt - half, hi: mt + half, half, z0 };
}

/** (13) Inverse map: the mu at which x* = mu - d is an equilibrium. mu(d) = k + beta d/(a+B) - b Phi(h d). */
export function muOfD(d, p) {
  const { h } = consts(p.alpha, p.beta);
  return p.k + p.beta * d / (p.alpha + p.beta) - p.b * Phi(h * d);
}

/** (14) Tipping point: mu at which x* = mu and E[W] = 1/2. */
export const tippingMu = p => p.k - p.b / 2;

/** (4) Realized cohesion for a realized theta. */
export const realizedW = (theta, xs, p) => Phi(Math.sqrt(p.beta) * (theta - xs));

/** (15) Expected cohesion under the public prior. */
export function expectedW(mu, xs, p) {
  return Phi((mu - xs) / consts(p.alpha, p.beta).sigT);
}

/**
 * (16)-(19) Comparative statics at a root xs (implicit function theorem). Valid where g'(xs) > 0
 * (always under (11); at the outer roots otherwise). Gamma = beta*s - b*alpha*phi(z), z = h(mu - xs).
 */
export function statics(mu, xs, p) {
  const { alpha: a, beta: B, b } = p;
  const { s, h, sigT } = consts(a, B);
  const z = h * (mu - xs), pz = phi(z), Gam = B * s - b * a * pz;
  const dxdmu = -a * (s + b * pz) / Gam;                 // (16)
  const dxdk = (a + B) * s / Gam;                         // (17)
  const dxdb = -(a + B) * s * Phi(z) / Gam;               // (18)
  const u = (mu - xs) / sigT;
  const dEWdmu = phi(u) / sigT * (a + B) * s / Gam;        // (19)
  return { dxdmu, dxdk, dxdb, dEWdmu, dEWdk: -phi(u) / sigT * dxdk, dEWdb: -phi(u) / sigT * dxdb, Gam };
}

/** (20) Slope of E[W] in mu at the tipping point: sqrt(a(a+2B)) / (sqrt(2pi) B s - b a). */
export function tippingSlope(p) {
  const { s } = consts(p.alpha, p.beta);
  return Math.sqrt(p.alpha * (p.alpha + 2 * p.beta)) / (SQRT2PI * p.beta * s - p.b * p.alpha);
}

/**
 * The exact S-curve E[W] against mu, traced parametrically in d = mu - x* using (13) and (15).
 * Returns points {d, mu, EW, stable}; stable is g' > 0 (the branch is folded back where it is false).
 */
export function sCurve(p, n = 400, dSpan) {
  const { h, sigT } = consts(p.alpha, p.beta);
  const span = dSpan ?? 3.2 * sigT;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const d = -span + 2 * span * i / n;
    const slope = p.beta / (p.alpha + p.beta) - p.b * h * phi(h * d);   // d mu / d d = g' at that root
    out.push({ d, mu: muOfD(d, p), EW: Phi(d / sigT), stable: slope > 0 });
  }
  return out;
}

/** Tipping zone: the mu-interval over which E[W] runs from lo to hi (default 10%-90%), via (13). */
export function tippingZone(p, lo = 0.1, hi = 0.9) {
  const { sigT } = consts(p.alpha, p.beta);
  return [muOfD(sigT * PhiInv(lo), p), muOfD(sigT * PhiInv(hi), p)];
}

/**
 * Pick one root to display. mode 'high' = smallest x* (most cohesive), 'low' = largest x*,
 * 'follow' = the root nearest the previous one (shows hysteresis as parameters move).
 */
export function selectRoot(rs, mode = 'follow', prev = null) {
  if (!rs.length) return NaN;
  if (mode === 'high') return rs[0];
  if (mode === 'low') return rs[rs.length - 1];
  if (prev == null || !Number.isFinite(prev)) return rs[0];
  // Only the outer roots are stable, so 'follow' never settles on a middle root.
  const stable = rs.length >= 3 ? [rs[0], rs[rs.length - 1]] : rs;
  return stable.reduce((best, x) => (Math.abs(x - prev) < Math.abs(best - prev) ? x : best), stable[0]);
}

/** Full Level-1 solve for display. */
export function solveL1(p, opts = {}) {
  const mu = muOf(p);
  const rs = roots(mu, p);
  const xs = selectRoot(rs, opts.mode ?? 'follow', opts.prev);
  const theta = mu + (opts.shock ?? 0) / Math.sqrt(p.alpha);
  return {
    mu, roots: rs, xs, theta,
    W: realizedW(theta, xs, p), EW: expectedW(mu, xs, p),
    uniq: uniqueness(p), tip: tippingMu(p), zone: tippingZone(p), band: multiplicityBand(p),
    stat: statics(mu, xs, p), slopeTip: tippingSlope(p),
  };
}
