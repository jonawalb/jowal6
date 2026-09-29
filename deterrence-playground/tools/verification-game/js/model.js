// Inspection games from Avenhaus, von Stengel & Zamir, "Inspection Games" (Handbook of Game Theory, vol. 3,
// ch. 51, 2002). Section and equation numbers follow the chapter.
//
// Quota game (Sec. 4.1, Fig. 4.2, Theorem 4.1): n periods, m inspections, at most one violation.
//   Payoffs (inspector, inspectee): legal throughout (0, 0); undetected violation (-1, 1); caught violation (-a, -b).
//   With detection certain the equilibrium values are V(n,m) = C(n-1,m) / sum_i C(n,i) b^(m-i) and
//   I(n,m) = -C(n-1,m) / sum_i C(n,i) (-a)^(m-i).  The tool adds a detection probability per inspection
//   (d < 1 means an inspection can miss a violation); with d = 1 it reproduces Theorem 4.1 exactly.
//
// Alarm game (Sec. 3.1, eqs. 3.2, 3.8, 3.9; Sec. 3.2, eq. 3.14): one inspection with a statistical test.
//   Payoffs: false alarm (-e, -h), caught violation (-a, -b), undetected (-1, 1), legal no alarm (0, 0).
//   Detection 1 - beta(alpha) = Phi(d - q_{1-alpha}) for a normal test with signal-to-noise d.
//   Equilibrium: -h alpha* = -b + (1 + b) beta(alpha*)   and   q* = e / (e - (1 - a) beta'(alpha*)).

// ---- Normal distribution helpers ----------------------------------------------------------
const SQ2PI = Math.sqrt(2 * Math.PI);
export const phi = x => Math.exp(-x * x / 2) / SQ2PI;
export function Phi(x) { // Abramowitz-Stegun 7.1.26 via erf, |error| < 1.5e-7
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}
export function PhiInv(p) { // bisection is plenty here
  if (p <= 0) return -8; if (p >= 1) return 8;
  let lo = -8, hi = 8;
  for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

// ---- 2x2 bimatrix solver ---------------------------------------------------------------------
// Rows: inspect (0) / not (1). Columns: legal (0) / violate (1). Cells [inspector, inspectee].
// Returns p = P(inspect), q = P(violate), and values. Assumes the inspection-game ordering; falls back to
// pure equilibria when a player has a dominant action.
function solve2x2(M) {
  const I = (r, c) => M[r][c][0], V = (r, c) => M[r][c][1];
  // Inspectee's best reply to pure rows
  const vBest = r => (V(r, 1) > V(r, 0) ? 1 : 0);
  const iBest = c => (I(0, c) >= I(1, c) ? 0 : 1);
  for (const r of [0, 1]) { const c = vBest(r); if (iBest(c) === r) return pure(M, r, c); }
  // Mixed: inspectee indifferent -> p; inspector indifferent -> q.
  const p = (V(1, 1) - V(1, 0)) / (V(0, 0) - V(1, 0) - V(0, 1) + V(1, 1));
  const q = (I(1, 0) - I(0, 0)) / (I(0, 1) - I(0, 0) - I(1, 1) + I(1, 0));
  const val = (f) => p * (1 - q) * f(0, 0) + p * q * f(0, 1) + (1 - p) * (1 - q) * f(1, 0) + (1 - p) * q * f(1, 1);
  return { p, q, I: val(I), V: val(V) };
}
const pure = (M, r, c) => ({ p: r === 0 ? 1 : 0, q: c, I: M[r][c][0], V: M[r][c][1] });

/** Quota game: returns tables of values and first-stage strategies for all (k, j) with k <= n. */
export function quotaGame({ n, m, a, b, d }) {
  const I = [], V = [], P = [], Q = [];
  for (let k = 0; k <= n; k++) { I[k] = []; V[k] = []; P[k] = []; Q[k] = []; }
  for (let k = 0; k <= n; k++) for (let j = 0; j <= Math.min(k, m); j++) {
    if (j === k) {                                     // enough inspections to cover every remaining period
      if (k === 0) { I[k][j] = 0; V[k][j] = 0; P[k][j] = 1; Q[k][j] = 0; continue; }
      const vio = [d * -a + (1 - d) * -1, d * -b + (1 - d) * 1], leg = [I[k - 1][j - 1], V[k - 1][j - 1]];
      const viol = vio[1] > leg[1];                     // with d = 1 the inspectee always stays legal (Theorem 4.1)
      I[k][j] = viol ? vio[0] : leg[0]; V[k][j] = viol ? vio[1] : leg[1]; P[k][j] = 1; Q[k][j] = viol ? 1 : 0; continue;
    }
    if (j === 0) { I[k][j] = -1; V[k][j] = 1; P[k][j] = 0; Q[k][j] = 1; continue; }       // no inspections left
    const caught = [d * -a + (1 - d) * -1, d * -b + (1 - d) * 1];
    const s = solve2x2([[[I[k - 1][j - 1], V[k - 1][j - 1]], caught], [[I[k - 1][j], V[k - 1][j]], [-1, 1]]]);
    I[k][j] = s.I; V[k][j] = s.V; P[k][j] = s.p; Q[k][j] = s.q;
  }
  // Forward pass along equilibrium play: probability mass over (periods left, inspections left) while legal.
  let mass = { [m]: 1 };
  let pViol = 0, pCaught = 0, expInsp = 0;
  const timeline = [];
  for (let k = n; k >= 1; k--) {
    const next = {};
    let vHere = 0, iHere = 0;
    for (const [js, w] of Object.entries(mass)) {
      const j = +js; if (w < 1e-15) continue;
      const jj = Math.min(j, k);
      const p = P[k][jj], q = Q[k][jj];
      iHere += w * p; vHere += w * q;
      pViol += w * q; pCaught += w * q * p * d; expInsp += w * p;
      const cont = w * (1 - q);
      next[jj - 1] = (next[jj - 1] || 0) + cont * p;
      next[jj] = (next[jj] || 0) + cont * (1 - p);
    }
    timeline.push({ period: n - k + 1, inspect: iHere, violate: vHere });
    mass = next;
  }
  return { I: I[n][m], V: V[n][m], p1: P[n][m], q1: Q[n][m], pViol, pCaught, detect: pViol > 0 ? pCaught / pViol : 1, expInsp, timeline };
}

/** Closed form of Theorem 4.1 (d = 1), used to check the recursion. */
export function theorem41(n, m, a, b) {
  const C = (x, y) => { if (y < 0 || y > x) return 0; let r = 1; for (let i = 1; i <= y; i++) r = r * (x - y + i) / i; return r; };
  let sb = 0, sa = 0;
  for (let i = 0; i <= m; i++) { sb += C(n, i) * b ** (m - i); sa += C(n, i) * (-a) ** (m - i); }
  return { V: C(n - 1, m) / sb, I: -C(n - 1, m) / sa };
}

/** Alarm game (Theorem 3.1 with the normal test of eq. 3.14). */
export function alarmGame({ a, b, e, h, d }) {
  const beta = al => 1 - Phi(d - PhiInv(1 - al));
  const dbeta = al => { const z = PhiInv(1 - al); return -phi(d - z) / Math.max(1e-300, phi(z)); };
  const hh = Math.min(h, b * 0.999);
  let lo = 1e-9, hi = 1 - 1e-9;
  const f = al => (1 + b) * beta(al) - b + hh * al;       // eq. 3.8 rearranged; f(0) > 0 > f(1)
  for (let k = 0; k < 100; k++) { const mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
  const alpha = (lo + hi) / 2, bt = beta(alpha), slope = dbeta(alpha);
  const q = e / (e - (1 - a) * slope);                      // eq. 3.9
  const I = (1 - q) * (-e * alpha) + q * (-a - (1 - a) * bt); // eq. 3.2
  const V = (1 - q) * (-hh * alpha) + q * (-b + (1 + b) * bt);
  return { alpha, beta: bt, detect: 1 - bt, q, I, V, slope, roc: al => 1 - beta(al) };
}
