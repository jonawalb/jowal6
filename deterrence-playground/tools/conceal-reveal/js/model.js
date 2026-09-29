// Conceal or Reveal? The disclosure signaling game from Walberg, "Secret Weapons" working paper
// (formal model: "Secret Weapons: A Signaling Model of Military Technology Disclosure," draft of April 2026;
// framework: dissertation prospectus draft of 29 September 2026). Pure functions, no DOM.
//
// Sender type theta = (q, i): capability q in {H, L}, intent i in {C (coercive), O (operational)}.
// Sender signals s in {R (Reveal), K (Conceal)}; Receiver sees s only and chooses Concede (C0) or Fight (F).
// Payoffs (paper eqs. 1-4):
//   Concede: u_S = b - r*1{s=R},                                   u_R = 0
//   Fight:   u_S = (pi_q + sigma*1{s=K}) b - c + V*1{i=O} - r*1{s=R},  u_R = (1 - pi_q - sigma*1{s=K}) b - c
// The prior over the four types is written here as g = Pr(coercive), hC = Pr(H | coercive), hO = Pr(H | operational),
// which spans every prior with p_theta > 0.

export const DEFAULTS = { b: 1, c: 0.45, piH: 0.7, piL: 0.2, sig: 0.1, V: 1.0, r: 0.2, g: 0.5, hC: 0.9, hO: 0.2 };

export const TYPES = [
  { id: 'HC', q: 'H', i: 'C', name: 'High capability, coercive intent' },
  { id: 'HO', q: 'H', i: 'O', name: 'High capability, operational intent' },
  { id: 'LC', q: 'L', i: 'C', name: 'Low capability, coercive intent' },
  { id: 'LO', q: 'L', i: 'O', name: 'Low capability, operational intent' },
];

const EPS = 1e-9;

/** Prior p_theta for each type. */
export function priors(P) {
  return { HC: P.g * P.hC, LC: P.g * (1 - P.hC), HO: (1 - P.g) * P.hO, LO: (1 - P.g) * (1 - P.hO) };
}

export const winProb = (P, q) => (q === 'H' ? P.piH : P.piL);

/** Receiver's expected payoff from fighting after signal s when the Sender's expected win probability is pibar. */
export const fightValue = (P, pibar, s) => (1 - pibar - (s === 'K' ? P.sig : 0)) * P.b - P.c;

/** The Receiver's cutoff: it fights iff pibar <= cutoff(s) (paper eq. 5, rearranged). */
export const cutoff = (P, s) => 1 - P.c / P.b - (s === 'K' ? P.sig : 0);

/** Sender payoff for type t, signal s, Receiver response a ('C0' | 'F'). */
export function senderPayoff(P, t, s, a) {
  const rev = s === 'R' ? P.r : 0;
  if (a === 'C0') return P.b - rev;
  return (winProb(P, t.q) + (s === 'K' ? P.sig : 0)) * P.b - P.c + (t.i === 'O' ? P.V : 0) - rev;
}

/** Posterior over types given the set of types that send a signal (Bayes' rule on the path of play). */
export function posterior(P, senders) {
  const pr = priors(P);
  const tot = senders.reduce((a, id) => a + pr[id], 0);
  if (tot < EPS) return null;
  const mu = {};
  for (const t of TYPES) mu[t.id] = senders.includes(t.id) ? pr[t.id] / tot : 0;
  return mu;
}
export const pibarOf = (P, mu) => TYPES.reduce((a, t) => a + mu[t.id] * winProb(P, t.q), 0);

/** Posterior-weighted win probabilities under the intent-separating strategy (paper eqs. 6-7). */
export function pibarISE(P) {
  const pr = priors(P);
  return {
    R: (pr.HC * P.piH + pr.LC * P.piL) / (pr.HC + pr.LC),
    K: (pr.HO * P.piH + pr.LO * P.piL) / (pr.HO + pr.LO),
  };
}

/**
 * Proposition 1 conditions, each with the two sides of the inequality and its slack (positive = holds).
 * (R-C) c > (1 - pibar_R) b            (R-F) c < (1 - pibar_K - sigma) b
 * (IC-C) b - r >= (pi_H + sigma) b - c  [binding type (H, C)]
 * (IC-O) (pi_L + sigma) b - c + V >= b - r  [binding type (L, O)]
 */
export function prop1(P) {
  const pb = pibarISE(P);
  const rc = { lhs: P.c, rhs: (1 - pb.R) * P.b };
  const rf = { lhs: P.c, rhs: (1 - pb.K - P.sig) * P.b };
  const icc = { lhs: P.b - P.r, rhs: (P.piH + P.sig) * P.b - P.c };
  const ico = { lhs: (P.piL + P.sig) * P.b - P.c + P.V, rhs: P.b - P.r };
  const out = {
    pb,
    RC: { ...rc, slack: rc.lhs - rc.rhs, ok: rc.lhs > rc.rhs + EPS },
    RF: { ...rf, slack: rf.rhs - rf.lhs, ok: rf.lhs < rf.rhs - EPS },
    ICC: { ...icc, slack: icc.lhs - icc.rhs, ok: icc.lhs >= icc.rhs - EPS },
    ICO: { ...ico, slack: ico.lhs - ico.rhs, ok: ico.lhs >= ico.rhs - EPS },
  };
  out.ok = out.RC.ok && out.RF.ok && out.ICC.ok && out.ICO.ok;
  // (R-C) and (R-F) can hold together only if pibar_R > pibar_K + sigma (see method note on Step 6).
  out.gap = pb.R - pb.K - P.sig;
  return out;
}

/** Slack functions for contour drawing on the region map; zero on each Proposition 1 boundary. */
export const SLACKS = {
  RC: P => prop1(P).RC.slack,
  RF: P => prop1(P).RF.slack,
  ICC: P => prop1(P).ICC.slack,
  ICO: P => prop1(P).ICO.slack,
};

/**
 * Every pure-strategy PBE, by exhaustive search over the 16 Sender strategies (a tool extension; the paper
 * characterizes the intent-separating equilibrium and lists the others as future work).
 * On-path responses follow Bayes' rule (the Receiver fights when fighting pays at least 0, as in the paper's Step 3).
 * An off-path response is allowed if some belief supports it: Fight if fighting pays against the weakest Sender,
 * Concede if conceding pays against the strongest.
 */
export function allEquilibria(P) {
  const out = [];
  for (let m = 0; m < 16; m++) {
    const sig = {};
    TYPES.forEach((t, k) => { sig[t.id] = (m >> k) & 1 ? 'R' : 'K'; });
    const resp = {}, mu = {}, off = {};
    let feasibleSets = [];
    for (const s of ['R', 'K']) {
      const senders = TYPES.filter(t => sig[t.id] === s).map(t => t.id);
      const post = posterior(P, senders);
      if (post) {
        mu[s] = post;
        resp[s] = [fightValue(P, pibarOf(P, post), s) >= -EPS ? 'F' : 'C0'];
      } else {
        off[s] = true;
        const opts = [];
        if (fightValue(P, P.piL, s) >= -EPS) opts.push('F');
        if (fightValue(P, P.piH, s) < EPS) opts.push('C0');
        resp[s] = opts;
      }
    }
    for (const aR of resp.R) for (const aK of resp.K) feasibleSets.push({ R: aR, K: aK });
    for (const a of feasibleSets) {
      const ok = TYPES.every(t => {
        const s = sig[t.id], d = s === 'R' ? 'K' : 'R';
        return senderPayoff(P, t, s, a[s]) >= senderPayoff(P, t, d, a[d]) - EPS;
      });
      if (ok) { out.push(describe(P, sig, a, mu, off)); break; }
    }
  }
  const rank = e => ORDER.indexOf(e.kind);
  return out.sort((x, y) => rank(x) - rank(y));
}

export const KINDS = {
  ise: { label: 'Intent-separating', col: '--c3', short: 'Coercive types reveal, operational types conceal.' },
  cap: { label: 'Capability-separating', col: '--c1', short: 'High-capability types reveal, low-capability types conceal.' },
  poolK: { label: 'Everyone conceals', col: '--c6', short: 'All four types conceal. The signal carries no information.' },
  poolR: { label: 'Everyone reveals', col: '--c5', short: 'All four types reveal. The signal carries no information.' },
  other: { label: 'Other pattern', col: '--c7', short: 'Some other split of the four types.' },
  none: { label: 'No pure-strategy equilibrium', col: '--c8', short: 'Only mixed strategies can be in equilibrium here; the tool does not compute them.' },
};
const ORDER = ['ise', 'cap', 'poolK', 'poolR', 'other'];

function describe(P, sig, a, mu, off) {
  const v = TYPES.map(t => sig[t.id]).join('');
  const intent = TYPES.every(t => sig[t.id] === (t.i === 'C' ? 'R' : 'K'));
  const cap = TYPES.every(t => sig[t.id] === (t.q === 'H' ? 'R' : 'K'));
  const kind = intent ? 'ise' : cap ? 'cap' : !v.includes('R') ? 'poolK' : !v.includes('K') ? 'poolR' : 'other';
  const pr = priors(P);
  let pWar = 0, pConcede = 0;
  for (const t of TYPES) { if (a[sig[t.id]] === 'F') pWar += pr[t.id]; else pConcede += pr[t.id]; }
  return { kind, sig: { ...sig }, a: { ...a }, mu, off, pWar, pConcede };
}

/** Region key for the map: the most informative equilibrium that exists at P. */
export function regionKey(P) {
  const all = allEquilibria(P);
  return all.length ? all[0].kind : 'none';
}
