// Humiliation to Motivation: the signaling game in Walberg, "Humiliation, Status, and Revisionist Motivation:
// A Formal Theory" (working paper, April 2026 draft), Section 4. Notation follows the paper:
// s = humiliation severity, lam = legitimacy (lambda), a0 = alpha_0, pi = Pr(theta_H), pH/pL = win probabilities,
// v = value of restored status, l = cost of losing (ell), k = cost of challenging, w, d, kD = D's payoffs.

export const DEFAULTS = { s: 0.35, lam: 0.2, a0: 2, pi: 0.4, pH: 0.5, pL: 0.2, v: 1, l: 1, k: 0.2, w: 1, d: 1, kD: 0.6 };

export const KINDS = {
  sep: { label: 'Separating', prop: 'Proposition 1', short: 'Only the capable type challenges; D resists.', col: '--c3', s: 'good' },
  trap: { label: 'Status trap', prop: 'Proposition 2', short: 'Both types challenge; D resists a mixed pool.', col: '--c2', s: 'bad' },
  poolK: { label: 'Pooling, D concedes', prop: 'Proposition 2, footnote', short: 'Both types challenge and D gives way.', col: '--c5', s: 'warn' },
  acc: { label: 'Accommodation', prop: 'Proposition 3', short: 'Both types accept the diminished status.', col: '--c1', s: 'good' },
  rev: { label: 'Only the weak type challenges', prop: '', short: 'Outside the paper’s three equilibria.', col: '--c6', s: 'warn' },
  none: { label: 'No pure-strategy equilibrium', prop: '', short: 'Outside the paper’s three equilibria.', col: '--c8', s: 'warn' },
};
export const ORDER = ['sep', 'trap', 'poolK', 'acc', 'rev'];

/** Audience cost of accommodation, alpha(s, lambda) = alpha_0 s (1 - lambda). */
export const alpha = P => P.a0 * P.s * (1 - P.lam);
/** H's payoff from a challenge that D resists: p_i v - (1 - p_i) l - k. */
export const warH = (P, p) => p * P.v - (1 - p) * P.l - P.k;
/** D's resistance threshold, eq. (2): D concedes iff pbar(mu) > p*. */
export const pStar = P => 1 - P.kD / (P.w + P.d);
export const pBar = (P, mu) => mu * P.pH + (1 - mu) * P.pL;
/** Numerators of the two thresholds: N_L for s-bar (Proposition 2), N_H for s-underbar (Proposition 3). */
export const NL = P => P.k + (1 - P.pL) * P.l - P.pL * P.v;
export const NH = P => P.k + (1 - P.pH) * P.l - P.pH * P.v;
export const sBar = P => NL(P) / (P.a0 * (1 - P.lam));
export const sUnder = P => NH(P) / (P.a0 * (1 - P.lam));

/**
 * All pure-strategy PBE. H's strategy is (action of theta_H, action of theta_L). After an on-path challenge D uses
 * Bayes' rule; after an off-path challenge D may hold any belief, so it may resist if p_L <= p* and concede if p_H > p*.
 */
export function equilibria(P) {
  const a = alpha(P), ps = pStar(P), out = [];
  const uC = { H: r => (r === 'K' ? P.v : warH(P, P.pH)), L: r => (r === 'K' ? P.v : warH(P, P.pL)) };
  for (const sH of ['A', 'C']) for (const sL of ['A', 'C']) {
    let resp;
    if (sH === 'C' || sL === 'C') {
      const mu = sH === 'C' && sL === 'C' ? P.pi : sH === 'C' ? 1 : 0;
      resp = [pBar(P, mu) > ps ? 'K' : 'R'];
    } else {
      resp = [];
      if (P.pL <= ps) resp.push('R');
      if (P.pH > ps) resp.push('K');
    }
    for (const r of resp) {
      const ok = (t, act) => (act === 'C' ? uC[t](r) >= -a : -a >= uC[t](r));
      if (!ok('H', sH) || !ok('L', sL)) continue;
      const kind = sH === 'A' && sL === 'A' ? 'acc' : sH === 'C' && sL === 'A' ? 'sep' : sH === 'A' ? 'rev' : r === 'R' ? 'trap' : 'poolK';
      out.push({ kind, sH, sL, r, offPath: sH === 'A' && sL === 'A' });
      break;
    }
  }
  return out.sort((x, y) => ORDER.indexOf(x.kind) - ORDER.indexOf(y.kind));
}

/** The equilibrium the figures show: the first in ORDER, or 'none'. */
export const primary = P => equilibria(P)[0]?.kind || 'none';

const H2 = x => (x <= 0 || x >= 1 ? 0 : -x * Math.log2(x) - (1 - x) * Math.log2(1 - x));
/** Proposition 5: information in the challenge signal, in bits. H(pi) when separating, 0 in the pooling and accommodation cases. */
export function info(P, kind = primary(P)) {
  if (kind === 'sep') return H2(P.pi);
  if (kind === 'trap' || kind === 'poolK' || kind === 'acc') return 0;
  return null;
}
export const entropy = P => H2(P.pi);

/** Lemma 1: partial derivatives of s-bar. */
export function lemma(P) {
  const den = P.a0 * (1 - P.lam);
  return { k: 1 / den, l: (1 - P.pL) / den, v: -P.pL / den, pL: -(P.v + P.l) / den, lam: NL(P) / (P.a0 * (1 - P.lam) ** 2) };
}

/** Keep parameters where the paper's analysis applies: p_L < p_H, and the low type loses from a resisted challenge (N_L > 0). */
export function fix(P, key) {
  if (P.pL > P.pH - 0.02) { if (key === 'pH') P.pL = Math.max(0.01, +(P.pH - 0.02).toFixed(2)); else P.pL = +(P.pH - 0.02).toFixed(2); }
  const maxPL = Math.floor(((P.k + P.l - 0.02) / (P.v + P.l)) * 100) / 100;
  if (P.pL > maxPL) P.pL = Math.max(0.01, maxPL);
  if (P.pL > P.pH - 0.02) P.pH = Math.min(0.99, +(P.pL + 0.02).toFixed(2));
}
