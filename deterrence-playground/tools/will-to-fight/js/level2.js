// Level 2: government resolve R and the adversary's attack decision. Pure functions, no DOM.
// Equation numbers refer to Will_to_Fight_Theory_Memo, Section 4. The memo is the source of truth.
import { Phi, PhiInv, logistic, logit } from './normal.js';
import { muOf, roots, selectRoot, muOfD, consts } from './level1.js';

/** (23) Per-period probability that the war is decided in the defender's favour, given it is decided. */
export function qOf(W, p) {
  return logistic(p.a0 + p.aW * W + p.aS * p.sExt - p.aF * p.F);
}

/** (25) Value of fighting until the war is decided: [-c + (1-rho)(q v - (1-q) D)] / (1 - rho delta). */
export function vFight(q, p) {
  return (-p.c + (1 - p.rho) * (q * p.v - (1 - q) * p.D)) / (1 - p.rho * p.delta);
}

/** (26) Resolve R = V_F + L. The government fights (every period) iff R >= 0 (Lemma 2). */
export const resolve = (W, p) => vFight(qOf(W, p), p) + p.L;

/** (27) Partial derivatives of R, evaluated at W. */
export function resolveGrad(W, p) {
  const q = qOf(W, p), den = 1 - p.rho * p.delta, VF = vFight(q, p);
  const dRdq = (1 - p.rho) * (p.v + p.D) / den;
  return {
    dRdq, dRdW: dRdq * p.aW * q * (1 - q), dRds: dRdq * p.aS * q * (1 - q), dRdF: -dRdq * p.aF * q * (1 - q),
    dRdv: (1 - p.rho) * q / den, dRdD: -(1 - p.rho) * (1 - q) / den, dRdc: -1 / den, dRdL: 1,
    dRddelta: p.rho * VF / den,                                         // sign of V_F (27e)
    dRdrho: -((1 - p.delta) * VF + p.c) / ((1 - p.rho) * den),          // (27f)
  };
}

/** (28) Critical q: R >= 0 iff q >= qBar. */
export function qBar(p) {
  return (p.c + (1 - p.rho) * p.D - p.L * (1 - p.rho * p.delta)) / ((1 - p.rho) * (p.v + p.D));
}

/** (29) Critical cohesion: R >= 0 iff W >= WBar (aW > 0). -Infinity: always fights; +Infinity: never. */
export function wBar(p) {
  const qb = qBar(p);
  if (qb <= 0) return -Infinity;
  if (qb >= 1) return Infinity;
  return (logit(qb) - p.a0 - p.aS * p.sExt + p.aF * p.F) / p.aW;
}

/**
 * Proposition 5 classification of a (W, R) pair with cohesion cut-off omega (default 1/2):
 * 'cohesive' (R>=0, W>=omega), 'hollow' (R>=0, W<omega: Kabul-type), 'wavering' (R<0, W>=omega), 'collapse'.
 */
export function quadrant(W, R, omega = 0.5) {
  if (R >= 0) return W >= omega ? 'cohesive' : 'hollow';
  return W >= omega ? 'wavering' : 'collapse';
}

/** (30) The adversary's estimate of the defender's wartime mu: peacetime terms + kappa*r + eta. */
export function muHat(p) {
  return muOf({ ...p, A: 0 }) + p.kappa * p.r + p.eta;
}

/** (31) Probability of quick collapse, P(W < w_c), for a defender with prior mean mu playing cutoff xs. */
export function pCollapse(mu, xs, p) {
  return Phi(Math.sqrt(p.alpha) * (xs - mu + PhiInv(p.wc) / Math.sqrt(p.beta)));
}

/** (32) The adversary attacks iff P_c >= PBar = K/(G+K). */
export const pBar = p => p.K / (p.G + p.K);

/** (33) The mu at which P_c = PBar (exact, via the inverse map (13)). Unique under (11). */
export function muAttack(p) {
  const dP = PhiInv(p.wc) / Math.sqrt(p.beta) - PhiInv(pBar(p)) / Math.sqrt(p.alpha);
  return muOfD(dP, p);
}

/**
 * Adversary panel: what it expects (from muHat) against what happens (true wartime mu, A = 1).
 * Proposition 4: misestimation region is muAttack < mu_true <= muAttack + (mu_true - muHat).
 */
export function adversary(p, mode = 'follow', prevTrue = null, prevHat = null) {
  const muTrue = muOf({ ...p, A: 1 }), mh = muHat(p);
  const xsT = selectRoot(roots(muTrue, p), mode, prevTrue), xsH = selectRoot(roots(mh, p), mode, prevHat);
  const { sigT } = consts(p.alpha, p.beta);
  const pcT = pCollapse(muTrue, xsT, p), pcH = pCollapse(mh, xsH, p), PB = pBar(p);
  const attacks = pcH >= PB, wouldWithTruth = pcT >= PB;
  return {
    muTrue, muHat: mh, xsTrue: xsT, xsHat: xsH,
    EWtrue: Phi((muTrue - xsT) / sigT), EWhat: Phi((mh - xsH) / sigT),
    pcTrue: pcT, pcHat: pcH, PBar: PB, muAttack: muAttack(p),
    attacks, wouldWithTruth, misjudged: attacks && !wouldWithTruth, deterredWrongly: !attacks && wouldWithTruth,
  };
}

/** Level-2 solve for display at realized cohesion W. */
export function solveL2(W, p) {
  const q = qOf(W, p), R = resolve(W, p);
  return { q, VF: vFight(q, p), R, fights: R >= 0, qBar: qBar(p), WBar: wBar(p), grad: resolveGrad(W, p), quad: quadrant(W, R) };
}
