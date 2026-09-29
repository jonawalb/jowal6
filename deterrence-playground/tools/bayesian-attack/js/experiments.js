// The paper's experiments, rerun in the browser with seeded draws. Protocols and constants follow
// sim/fh2_dominance.py and sim/fh3_counterstrategy.py (Walberg, "Emotional Priors and Narrative Warfare",
// working paper, June 11, 2026). Draws come from mulberry32, not numpy, so numbers differ slightly from the paper's.
import { update, actionProb, decayed } from './engine.js';
import { mulberry32, normal } from './rng.js';
import { FH2, FH3 } from '../data/params.js';

// ---------- Belief trajectory ----------
/** Signals s_t = θ + ε_t for t = 1..T, then neutral, attacked and (for reference) fabricated paths. */
export function trajectory(p) {
  const r = mulberry32(p.seed * 9176 + 11);
  const sig = Array.from({ length: p.T }, () => p.theta + normal(r) / Math.sqrt(p.rhoS));
  const start = { mu: p.mu0, rho: p.rho0 };
  const neu = [start], att = [start];
  for (let t = 0; t < p.T; t++) {
    const x = decayed(p.x, p.rhoE, t);
    let em = { lam: 1 }, s = sig[t];
    if (p.kind === 'fear') em = { lamGood: x, lamBad: 1 };
    else if (p.kind === 'trust') em = { lamGood: 1, lamBad: x };
    else if (p.kind === 'anger') em = { lam: 1, kappa: x };
    else if (p.kind === 'fab') s = sig[t] + p.x;   // fabrication persists (paper: no decay)
    neu.push(update(neu[t], sig[t], p.rhoS));
    att.push(update(att[t], s, p.rhoS, em));
  }
  return { sig, neu, att };
}

// ---------- P2: dominance of the weighting attack over fabrication ----------
/**
 * Mean action probabilities for each λ on the paper's grid, for fabrication, and for the neutral baseline.
 * Only these depend on (ρe, T); the cost ratio ρ and stake τ enter the payoffs linearly, so the region map is exact given them.
 */
export function dominanceTable(rhoE, T, seed = 42) {
  const r = mulberry32(seed * 131 + T * 7 + Math.round(rhoE * 1000));
  const L = FH2.lambdaGrid, nL = L.length;
  const aLam = new Float64Array(nL), muLam = new Float64Array(nL);
  let aSig = 0, aBase = 0, muBase = 0;
  const prior = { mu: FH2.mu0, rho: FH2.rho0 };
  for (let m = 0; m < FH2.nMC; m++) {
    const s = Array.from({ length: T }, () => FH2.thetaTrue + normal(r) / Math.sqrt(FH2.rhoS));
    let b = prior, f = prior;
    for (let t = 0; t < T; t++) { b = update(b, s[t], FH2.rhoS); f = update(f, s[t] + FH2.fabBias, FH2.rhoS); }
    aBase += actionProb(b, FH2.actionThreshold); muBase += b.mu; aSig += actionProb(f, FH2.actionThreshold);
    for (let k = 0; k < nL; k++) {
      let c = prior;
      for (let t = 0; t < T; t++) c = update(c, s[t], FH2.rhoS, { lamGood: decayed(L[k], rhoE, t), lamBad: 1 });
      aLam[k] += actionProb(c, FH2.actionThreshold); muLam[k] += c.mu;
    }
  }
  const n = FH2.nMC;
  const sustain = L.map(l => {
    if (rhoE <= 1e-12) return l - 1;
    let top = 0;
    for (let t = 0; t < T; t++) top += (l - 1) * (1 - (1 - rhoE) ** t);
    return (l - 1) + rhoE * top;
  });
  return { L, aLam: [...aLam].map(v => v / n), muLam: [...muLam].map(v => v / n), aSig: aSig / n, aBase: aBase / n, muBase: muBase / n, sustain, rhoE, T };
}

/** Payoffs at cost ratio ρ and stake τ (paper's cost model: fabrication costs 1/ρ once; λ costs 0.15 × sustained energy). */
export function cell(tab, rho, tau) {
  const sigPay = tau * Math.abs(tab.aSig - tab.aBase) - 1 / rho;
  let best = -Infinity, k = 0;
  tab.L.forEach((l, i) => {
    const pay = tau * Math.abs(tab.aLam[i] - tab.aBase) - FH2.lambdaCostScale * tab.sustain[i];
    if (pay > best) { best = pay; k = i; }
  });
  return { lamPay: best, sigPay, lam: tab.L[k], dom: best > sigPay, act: Math.abs(tab.aLam[k] - tab.aBase), mean: Math.abs(tab.muLam[k] - tab.muBase) };
}

export const RHO_RANGE = [0.01, 100], TAU_RANGE = [0.1, 10];
/** Share of the paper's 22 × 22 (ρ, τ) grid on which the λ-attack dominates. */
export function regionShare(tab) {
  let k = 0;
  for (let i = 0; i < 22; i++) for (let j = 0; j < 22; j++) {
    const rho = 10 ** (-2 + 4 * i / 21), tau = 0.1 + 9.9 * j / 21;
    if (cell(tab, rho, tau).dom) k++;
  }
  return k / 484;
}

// ---------- P4 (i): disclose or reassure ----------
function capture(r) {
  let c = { mu: FH3.mu0, rho: FH3.rho0 };
  for (let i = 0; i < FH3.captureStrength; i++) c = update(c, FH3.thetaTrue + 1.5 + normal(r), FH3.rhoS, { lamGood: FH3.captureLambda, lamBad: 1 });
  return c;
}
/** Residual distortion (after / before) for disclosure and for reassurance at captured gain λg and budget. */
export function discloseVsReassure(lamG, budget, seed = 42) {
  const r1 = mulberry32(seed * 17 + Math.round(lamG * 100) * 101 + budget);
  const r2 = mulberry32(seed * 19 + Math.round(lamG * 100) * 103 + budget + 7);
  let d0 = 0, dD = 0, e0 = 0, dR = 0;
  for (let m = 0; m < FH3.nMC; m++) {
    const c = capture(r1); d0 += Math.abs(c.mu - FH3.thetaTrue);
    let cd = c;
    for (let i = 0; i < budget; i++) cd = update(cd, FH3.thetaTrue + normal(r1) / Math.sqrt(FH3.rhoS), FH3.rhoS, { lam: lamG });
    dD += Math.abs(cd.mu - FH3.thetaTrue);
  }
  const lamRestored = lamG + (1 - lamG) * Math.min(1, FH3.reassurePerUnit * budget * FH3.reassureShare);
  for (let m = 0; m < FH3.nMC; m++) {
    const c = capture(r2); e0 += Math.abs(c.mu - FH3.thetaTrue);
    let cr = c;
    for (let i = 0; i < FH3.reassureSignals; i++) cr = update(cr, FH3.thetaTrue + normal(r2) / Math.sqrt(FH3.rhoS), FH3.rhoS, { lam: lamRestored });
    dR += Math.abs(cr.mu - FH3.thetaTrue);
  }
  return { disclose: dD / d0, reassure: dR / e0, lamRestored, before: d0 / FH3.nMC };
}

// ---------- P4 (ii): fear is reversible, anger is near-absorbing ----------
/** Ramp intensity up to `peak` and back with slanted news (+1), then 80 truthful undistorted signals. */
export function hysteresis(channel, peak = 1, seed = 42) {
  const r = mulberry32(seed * 23 + (channel === 'fear' ? 1 : 1000));
  const up = Array.from({ length: 21 }, (_, i) => peak * i / 20);
  const path = up.concat(up.slice(0, -1).reverse());
  let c = { mu: FH3.mu0, rho: FH3.rho0 };
  const campaign = [];
  for (const x of path) {
    const em = channel === 'fear' ? { lamGood: 1 + 2 * x, lamBad: 1 } : { kappa: 1 + 9 * x };
    c = update(c, FH3.thetaTrue + 1 + normal(r) / Math.sqrt(FH3.rhoS), FH3.rhoS, em);
    campaign.push(c.mu);
  }
  const post = Math.abs(c.mu - FH3.thetaTrue);
  const recovery = [];
  for (let i = 0; i < FH3.nCorrect; i++) {
    c = update(c, FH3.thetaTrue + normal(r) / Math.sqrt(FH3.rhoS), FH3.rhoS);
    recovery.push(c.mu);
  }
  const fin = Math.abs(c.mu - FH3.thetaTrue);
  return { campaign, recovery, post, fin, recovered: Math.max(0, Math.min(1, (post - fin) / (post || 1e-12))) };
}

// ---------- P4 (iii): two kinds of inoculation ----------
export function inoculation(protOwn = FH3.protOwn, protPhi = FH3.protPhi, seed = 42) {
  const dist = (channel, prot) => {
    const r = mulberry32(seed * 29 + (channel === 'fear' ? 200 : 300));
    let tot = 0;
    for (let m = 0; m < FH3.nMC; m++) {
      let c = { mu: FH3.mu0, rho: FH3.rho0 };
      for (let i = 0; i < 4; i++) {
        const em = channel === 'fear' ? { lamGood: 1 + (FH3.lamAttack - 1) * (1 - prot), lamBad: 1 } : { kappa: 1 + (FH3.kappaAttack - 1) * (1 - prot) };
        c = update(c, FH3.thetaTrue + normal(r), FH3.rhoS, em);
      }
      tot += Math.abs(c.mu - FH3.thetaTrue);
    }
    return tot / FH3.nMC;
  };
  const bf = dist('fear', 0), ba = dist('anger', 0), prot = (b, d) => (b - d) / (b || 1e-12);
  const hOwn = prot(bf, dist('fear', protOwn)), hCross = prot(ba, dist('anger', 0));
  const aOwn = prot(bf, dist('fear', protPhi)), aCross = prot(ba, dist('anger', protPhi));
  return { harden: { own: hOwn, cross: hCross, ratio: hCross / Math.abs(hOwn || 1e-9) }, aware: { own: aOwn, cross: aCross, ratio: aCross / Math.abs(aOwn || 1e-9) } };
}
