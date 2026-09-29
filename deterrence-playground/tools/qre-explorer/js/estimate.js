// Estimating λ in the crisis standoff from simulated data, five ways.
// Mirrors, in one dimension, the estimators compared by Crisman-Cox & Gibilisco (PSRM 2021):
// traditional MLE with an equation solver (tMLE), pseudo-likelihood (PL), nested pseudo-likelihood (NPL,
// Aguirregabiria & Mira 2007) and constrained MLE (CMLE, Su & Judd 2012). Their game is a signaling
// game; this 2x2 game is a stand-in that has the same problem: several equilibria at one parameter value.
// The data are simulated here; nothing is estimated from real crises.
import { allQRE, principalQRE, d1, d2, sig } from './qre.js';
import { mulberry32 } from './rng.js';

export const GRID = Array.from({ length: 241 }, (_, i) => -1 + (2.6 * i) / 240); // log10 λ from −1 to 1.6
const clamp = p => Math.min(1 - 1e-12, Math.max(1e-12, p));

/** Fixed uniforms for a seed, so moving λ* or N shifts the data smoothly. */
export function draws(seed, n) {
  const r = mulberry32(seed * 7919 + 17);
  return Array.from({ length: n }, () => [r(), r()]);
}

/** Simulate N crises from the chosen equilibrium at λ*. Returns counts and the generating (p, q). */
export function simulate(g, corr, lamStar, which, u) {
  const roots = allQRE(g, lamStar), prin = principalQRE(g, corr, lamStar);
  let gen = prin, usedOther = false;
  if (which === 'other' && roots.length > 1) {
    gen = roots.reduce((a, r) => (Math.abs(r.x - prin.x) > Math.abs(a.x - prin.x) ? r : a), prin);
    usedOther = true;
  }
  let r1 = 0, c1 = 0;
  for (const [a, b] of u) { if (a < gen.p) r1++; if (b < gen.q) c1++; }
  return { n: u.length, r1, c1, gen, usedOther, nEq: roots.length };
}

const ll = (d, p, q) => d.r1 * Math.log(clamp(p)) + (d.n - d.r1) * Math.log(clamp(1 - p))
  + d.c1 * Math.log(clamp(q)) + (d.n - d.c1) * Math.log(clamp(1 - q));

/** Pseudo-log-likelihood: each side's logit response to fixed beliefs (pb, qb) about the other. */
const pll = (g, d, lam, pb, qb) => ll(d, sig(lam * d1(g, qb)), sig(lam * d2(g, pb)));

function argmaxLam(f) {
  // Grid search on log10 λ, then golden-section refinement.
  let bi = 0, bv = -Infinity;
  GRID.forEach((u, i) => { const v = f(10 ** u); if (v > bv) { bv = v; bi = i; } });
  let a = GRID[Math.max(0, bi - 1)], b = GRID[Math.min(GRID.length - 1, bi + 1)];
  const gr = (Math.sqrt(5) - 1) / 2;
  for (let k = 0; k < 40; k++) {
    const c = b - gr * (b - a), e = a + gr * (b - a);
    if (f(10 ** c) > f(10 ** e)) b = e; else a = c;
  }
  return 10 ** ((a + b) / 2);
}

/**
 * Likelihood curves over GRID and the five estimates.
 * startP: the fixed starting guess for the naive equation solver (probability the challenger escalates).
 */
export function estimate(g, corr, d, startP = 0.9) {
  const xs = Math.log(startP / (1 - startP));
  const curves = { principal: [], naive: [], all: [] };
  let best = { cm: -Infinity, cmLam: NaN, pr: -Infinity, prLam: NaN, nv: -Infinity, nvLam: NaN };
  for (const u of GRID) {
    const lam = 10 ** u, roots = allQRE(g, lam, 900);
    const pr = principalQRE(g, corr, lam), vPr = ll(d, pr.p, pr.q);
    // Naive solver: whatever root a solver started at startP converges to (the nearest root in logit p).
    const nv = roots.reduce((a, r) => (Math.abs(r.x - xs) < Math.abs(a.x - xs) ? r : a), roots[0]);
    const vNv = ll(d, nv.p, nv.q);
    curves.principal.push([u, vPr]); curves.naive.push([u, vNv, nv.x]);
    for (const r of roots) {
      const v = ll(d, r.p, r.q);
      curves.all.push([u, v, Math.abs(r.x - pr.x) < 1e-6]);
      if (v > best.cm) { best.cm = v; best.cmLam = lam; }
    }
    if (vPr > best.pr) { best.pr = vPr; best.prLam = lam; }
    if (vNv > best.nv) { best.nv = vNv; best.nvLam = lam; }
  }
  // Pseudo-likelihood: first stage = observed frequencies.
  const ph = clamp(d.r1 / d.n), qh = clamp(d.c1 / d.n);
  const plLam = argmaxLam(l => pll(g, d, l, ph, qh));
  // NPL: update beliefs by one best-response step at the current estimate, re-estimate, repeat.
  let pb = ph, qb = qh, npl = plLam, iters = 0, conv = false;
  for (; iters < 60; iters++) {
    const pn = sig(npl * d1(g, qb)), qn = sig(npl * d2(g, pb));
    pb = pn; qb = qn;
    const nl = argmaxLam(l => pll(g, d, l, pb, qb));
    if (Math.abs(Math.log10(nl) - Math.log10(npl)) < 1e-4) { npl = nl; conv = true; iters++; break; }
    npl = nl;
  }
  // Count jumps in the naive curve: discontinuities where the solver switches equilibrium.
  let jumps = 0;
  for (let i = 1; i < curves.naive.length; i++) {
    const a = curves.naive[i - 1][2], b = curves.naive[i][2];
    if (Math.abs(b - a) > 0.5 + 0.1 * Math.abs(a)) { jumps++; curves.naive[i][3] = true; }
  }
  return {
    curves, jumps,
    est: { naive: best.nvLam, principal: best.prLam, pl: plLam, npl, nplConv: conv, nplIters: iters, cmle: best.cmLam },
    max: Math.max(best.cm, best.pr, best.nv),
  };
}
