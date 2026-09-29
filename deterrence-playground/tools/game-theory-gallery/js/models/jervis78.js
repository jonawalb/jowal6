// Jervis (1978), "Cooperation under the Security Dilemma," World Politics 30(2): 167-214.
// Pure functions, no DOM. Jervis gives ordinal rankings (p. 171): Stag Hunt CC > DC > DD > CD;
// Prisoner's Dilemma DC > CC > DD > CD. The cardinal numbers here are notional stand-ins for those ranks.
// Cooperation is more likely (p. 171) the higher CC and the lower CD's cost, the lower DC and the more costly DD,
// and the higher each side's expectation that the other will cooperate. A state compares the expected value of
// cooperating and defecting given its estimate q that the other cooperates (p. 179):
//     cooperate iff q*CC + (1-q)*CD >= q*DC + (1-q)*DD.
// Low costs of CD let a state wait and see, turning a simultaneous game into a sequential one (p. 172).
// Repeated play (p. 171) is summarized with the standard grim-trigger threshold delta >= (DC-CC)/(DC-DD);
// that formula is textbook repeated-game theory, not Jervis's own derivation.
// Four worlds (p. 211): offense or defense advantage x whether offensive postures are distinguishable.

export const J78_DEFAULTS = { v: 'game', cc: 4, dc: 3, dd: 2, cd: 1, q: 0.6, seq: 0, rep: 0, dl: 0.5, od: 'off', dist: 0 };

export const PRESETS = {
  stag: { cc: 4, dc: 3, dd: 2, cd: 1, label: 'Stag Hunt' },
  pd: { cc: 3, dc: 4, dd: 2, cd: 1, label: "Prisoner's Dilemma" },
};

const EPS = 1e-9;

/** Name the symmetric 2x2 game from its payoff order. */
export function classify({ cc, dc, dd, cd }) {
  if (cc > dc && dc > dd && dd > cd) return 'stag';
  if (dc > cc && cc > dd && dd > cd) return 'pd';
  if (dc > cc && cc > cd && cd > dd) return 'chicken';
  if (dc > dd && dd > cc) return 'deadlock';
  if (cc >= dc && cd >= dd) return 'harmony';
  return 'other';
}

export const GAME_NAMES = {
  stag: 'Stag Hunt', pd: "Prisoner's Dilemma", chicken: 'Chicken', deadlock: 'Deadlock', harmony: 'Harmony', other: 'Other ordering',
};

/** Pure-strategy Nash equilibria of the symmetric game, plus the mixed one when it exists. */
export function equilibria(G) {
  const { cc, dc, dd, cd } = G;
  // Row payoff for (row, col) with C=0, D=1.
  const u = (a, b) => [[cc, cd], [dc, dd]][a][b];
  const pure = [];
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
    const rowBest = u(a, b) >= u(1 - a, b) - EPS, colBest = u(b, a) >= u(1 - b, a) - EPS;
    if (rowBest && colBest) pure.push([a, b]);
  }
  const den = (cc - dc) + (dd - cd);
  let mixed = null;
  if (Math.abs(den) > EPS) {
    const q = (dd - cd) / den;                              // prob. other cooperates that equalizes C and D
    if (q > EPS && q < 1 - EPS) mixed = q;
  }
  return { pure, mixed };
}

/** A state's choice given its belief q that the other cooperates (p. 179). */
export function bestReply(G, q) {
  const evC = q * G.cc + (1 - q) * G.cd, evD = q * G.dc + (1 - q) * G.dd;
  const den = (G.cc - G.dc) + (G.dd - G.cd);
  const qStar = Math.abs(den) > EPS ? (G.dd - G.cd) / den : null;
  return { evC, evD, choice: evC >= evD - EPS ? 'C' : 'D', qStar };
}

/** Sequential play: the first mover sees how the second responds (p. 172: low CD lets a state wait and see). */
export function sequential(G) {
  const replyToC = G.cc >= G.dc - EPS ? 'C' : 'D';
  const replyToD = G.cd >= G.dd - EPS ? 'C' : 'D';
  const payIfC = replyToC === 'C' ? G.cc : G.cd;
  const payIfD = replyToD === 'C' ? G.dc : G.dd;
  const first = payIfC >= payIfD - EPS ? 'C' : 'D';
  const second = first === 'C' ? replyToC : replyToD;
  return { first, second, replyToC, replyToD };
}

/** Grim-trigger threshold for sustaining mutual cooperation in the repeated game (standard result). */
export function repeatedThreshold(G) {
  if (G.dc <= G.cc + EPS) return 0;                          // no temptation: cooperation needs no patience
  if (G.dc <= G.dd + EPS) return null;
  return (G.dc - G.cc) / (G.dc - G.dd);
}

export const WORLDS = {
  'off-0': { n: 1, title: 'Doubly dangerous', page: '211-212' },
  'def-0': { n: 2, title: 'Security dilemma, but security requirements may be compatible', page: '212-213' },
  'off-1': { n: 3, title: 'No security dilemma, but aggression possible; status-quo states can follow a different policy than aggressors; warning given', page: '213-214' },
  'def-1': { n: 4, title: 'Doubly stable', page: '214' },
};
