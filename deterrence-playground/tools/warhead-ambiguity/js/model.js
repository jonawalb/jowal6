// Is It a Nuke? A notional Bayesian decision model for a state that detects an incoming dual-capable missile.
// Concepts: warhead, destination and target ambiguity (Acton, "Silver Bullet?", Carnegie 2013); warhead ambiguity,
// false positives and the point that only states able to launch before detonation face post-launch ambiguity
// (Acton, "Is It a Nuke?", Carnegie 2020); entanglement (Acton, International Security 2018).
// EVERY NUMBER IN THIS FILE IS NOTIONAL. It is not an estimate for any real state, missile or crisis.
// Pure functions, no DOM.

export const STATES = [
  { id: 'F', name: 'No attack', long: 'False alarm or misidentified object', col: '--c7' },
  { id: 'C', name: 'Conventional', long: 'Real launch, conventional warhead', col: '--c5' },
  { id: 'N', name: 'Nuclear', long: 'Real launch, nuclear warhead', col: '--bad' },
];
export const ACTIONS = [
  { id: 'wait', name: 'Wait', long: 'Ride it out and characterize after impact', col: '--c3' },
  { id: 'conv', name: 'Retaliate conventionally', long: 'Strike back with conventional forces now', col: '--c1' },
  { id: 'low', name: 'Launch on warning', long: 'Order nuclear retaliation before impact', col: '--c2' },
];

export const SITES = [
  { id: 'conv', name: 'Conventional site', s: 'associated with conventional units' },
  { id: 'mixed', name: 'Mixed or co-located site', s: 'hosts nuclear and conventional units' },
  { id: 'nuc', name: 'Nuclear site', s: 'associated with nuclear units' },
  { id: 'unk', name: 'Unknown', s: 'launch point not resolved' },
];
export const TRAJS = [
  { id: 'theater', name: 'Conventional targets in theater', s: 'bases, ships, air defenses' },
  { id: 'dual', name: 'Dual-use warning or command asset', s: 'target ambiguity' },
  { id: 'nucf', name: 'Your nuclear forces', s: 'launchers, submarine bases' },
  { id: 'city', name: 'Capital or leadership', s: 'strategic targets' },
  { id: 'unclear', name: 'Unclear or maneuvering', s: 'destination ambiguity' },
];

export const CONTEXTS = {
  peace: { name: 'Peacetime', s: 'No fighting under way', pReal: 0.02, pNuc: 0.7 },
  crisis: { name: 'Crisis', s: 'Tension, no shooting yet', pReal: 0.15, pNuc: 0.4 },
  war: { name: 'Conventional war', s: 'Missiles already flying', pReal: 0.9, pNuc: 0.1 },
};

export const DEFAULTS = {
  ctx: 'war', pReal: 0.9, pNuc: 0.1, E: 0.6, Eo: 0.2, lrC: 20, corr: 0, site: 'mixed', traj: 'dual', surv: 0.3, lowCap: 1, K: 50,
};
export const LIMITS = { pReal: [0.001, 0.999], pNuc: [0.001, 0.999], E: [0, 1], Eo: [0, 1], lrC: [1, 200], surv: [0, 1], K: [1, 500] };

/** Notional costs: rows are actions, columns are true states. Deterrent loss scales with (1 - survivability). */
export const COSTS = {
  wait: { F: 0, C: 10, N: 300, Nloss: 400 },
  conv: { F: 30, C: 8, N: 290, Nloss: 400 },
  low: { F: 1000, C: 800, N: 300, Nloss: 0 },
};

const norm = o => { const s = Object.values(o).reduce((a, b) => a + b, 0); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v / s])); };

/** Where launches come from, by true state, as entanglement E rises (conventional and nuclear units intermingle). */
export function siteDist(st, E) {
  if (st === 'F') return { conv: 0.1, mixed: 0.1, nuc: 0.1, unk: 0.7 };
  if (st === 'C') return norm({ conv: 0.8 * (1 - E) + 0.01, mixed: 0.8 * E + 0.05, nuc: 0.02, unk: 0.13 });
  return norm({ conv: 0.02, mixed: 0.8 * E + 0.05, nuc: 0.8 * (1 - E) + 0.01, unk: 0.13 });
}
/** Where launches seem headed, by true state. Entanglement sends more conventional strikes at dual-use assets and at
 * co-located forces that also serve the nuclear mission. */
export function trajDist(st, E) {
  if (st === 'F') return { theater: 0.1, dual: 0.1, nucf: 0.15, city: 0.15, unclear: 0.5 };
  if (st === 'C') return norm({ theater: 0.8 - 0.75 * E, dual: 0.05 + 0.45 * E, nucf: 0.02 + 0.25 * E, city: 0.01, unclear: 0.12 + 0.05 * E });
  return { theater: 0.1, dual: 0.3, nucf: 0.3, city: 0.15, unclear: 0.15 };
}

/**
 * Posterior over F, C, N after each piece of evidence; returns the chain of beliefs and likelihood ratios.
 * The observer reads evidence through its ASSUMED entanglement P.Eo, which may differ from the true level P.E.
 */
export function update(P, site = P.site, traj = P.traj, corr = P.corr) {
  let w = { F: 1 - P.pReal, C: P.pReal * (1 - P.pNuc), N: P.pReal * P.pNuc };
  const chain = [{ step: 'Prior', note: 'context and priors', mu: norm(w) }];
  if (corr) { w = { ...w, F: w.F / P.lrC }; chain.push({ step: 'Second sensor', note: `false alarm ×1/${Math.round(P.lrC)}`, mu: norm(w) }); }
  else chain.push({ step: 'One sensor only', note: 'no corroboration', mu: norm(w) });
  const sd = { F: siteDist('F', P.Eo)[site], C: siteDist('C', P.Eo)[site], N: siteDist('N', P.Eo)[site] };
  w = { F: w.F * sd.F, C: w.C * sd.C, N: w.N * sd.N };
  chain.push({ step: 'Launch site', note: `nuclear vs conventional ×${fmtLR(sd.N / sd.C)}`, mu: norm(w), lr: sd.N / sd.C });
  const td = { F: trajDist('F', P.Eo)[traj], C: trajDist('C', P.Eo)[traj], N: trajDist('N', P.Eo)[traj] };
  w = { F: w.F * td.F, C: w.C * td.C, N: w.N * td.N };
  chain.push({ step: 'Trajectory and target', note: `nuclear vs conventional ×${fmtLR(td.N / td.C)}`, mu: norm(w), lr: td.N / td.C });
  return chain;
}
const fmtLR = x => (x >= 10 ? x.toFixed(0) : x >= 1 ? x.toFixed(1) : x.toFixed(2));

export function expCosts(P, mu, costs = COSTS) {
  const out = {};
  for (const a of ACTIONS) {
    const c = costs[a.id];
    out[a.id] = mu.F * c.F + mu.C * c.C + mu.N * (c.N + c.Nloss * (1 - P.surv));
  }
  return out;
}

export function decide(P, mu, costs = COSTS) {
  const ec = expCosts(P, mu, costs);
  const opts = ACTIONS.filter(a => a.id !== 'low' || P.lowCap);
  const best = opts.reduce((b, a) => (ec[a.id] < ec[b.id] ? a : b), opts[0]);
  return { ec, best: best.id };
}

/**
 * Long-run rates: evidence is generated at the TRUE entanglement P.E and read at the assumed level P.Eo.
 * Sums over every site and trajectory, holding priors and corroboration fixed. rate[state][action].
 */
export function longRun(P, costs = COSTS) {
  const rate = { F: { wait: 0, conv: 0, low: 0 }, C: { wait: 0, conv: 0, low: 0 }, N: { wait: 0, conv: 0, low: 0 } };
  for (const st of ['F', 'C', 'N']) {
    const sd = siteDist(st, P.E), td = trajDist(st, P.E);
    for (const s of SITES) for (const t of TRAJS) {
      const pr = sd[s.id] * td[t.id];
      const ch = update(P, s.id, t.id);
      rate[st][decide(P, ch[ch.length - 1].mu, costs).best] += pr;
    }
  }
  return rate;
}
