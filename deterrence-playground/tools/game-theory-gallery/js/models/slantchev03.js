// Slantchev (2003), "The Principle of Convergence in Wartime Negotiations," APSR 97(4): 621-632.
// Pure functions, no DOM. Players alternate offers over a flow worth pi = 1 per period (player 1 offers in even
// periods). Each rejection is followed by a battle that player 1 wins with probability p, moving the military
// position k one step toward N (2 defeated) or 0 (1 defeated). Per-period war payoffs are b_i < s_i (pp. 622-623).
//   Fight to the finish (p. 623): W_k^i = (1-delta)b_i + delta[p W_{k+1}^i + (1-p) W_{k-1}^i].
//   Complete information (Proposition 1, p. 624; appendix eq. 1, p. 630): unique stationary no-delay MPE offers
//     1 - x_k = (1-delta)b2 + delta[p y_{k+1} + (1-p) y_{k-1}],  1 - y_k = (1-delta)b1 + delta[p x_{k+1} + (1-p) x_{k-1}],
//     with y_0 = 1, y_N = 0, x_0 = 0, x_N = 1.
//   Three types of player 2 (p. 624): weak (p = pH), moderate (pM), strong (pL). Beliefs after a battle, eq. 4.
//   Proposition 2 (p. 626; appendix pp. 630-631): for patient players a unique MPSE in which 2w accepts at t = 0,
//     2m settles at t = 1, and 2s makes a non-serious offer and settles at t = 2. We compute the appendix's offers
//     (eqs. 2, 5, 6) and check its conditions (eq. 3 after either battle outcome, eq. 7, and x^^ <= x^ <= x*).

export const S03_DEFAULTS = {
  v: 'complete', N: 6, k0: 3, p: 0.5, dl: 0.9, b1: 0.3, b2: 0.3,
  pL: 0.3, pM: 0.5, pH: 0.7, qw: 0.3, qs: 0.3, dl2: 0.99, t2: 's', I0: 1, I1: 1,
};

const EPS = 1e-9;

/** Solve A z = w by Gaussian elimination with partial pivoting. */
function gauss(A, w) {
  const n = w.length, M = A.map((r, i) => [...r, w[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const fct = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= fct * M[c][j];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

/** Complete-information MPE offers x_k (1 proposes) and y_k (2 proposes), k = 0..N with boundary values. */
export function mpeOffers(p, N, dl, b1, b2) {
  const n = N - 1, A = Array.from({ length: 2 * n }, () => new Array(2 * n).fill(0)), w = new Array(2 * n).fill(0);
  // Unknown order: x_1..x_n, then y_1..y_n.
  for (let k = 1; k <= n; k++) {
    const r = k - 1;                          // x_k + delta[p y_{k+1} + (1-p) y_{k-1}] = 1 - (1-delta) b2
    A[r][r] = 1; w[r] = 1 - (1 - dl) * b2;
    if (k + 1 <= n) A[r][n + k] += dl * p; // y_{k+1}; y_N = 0
    if (k - 1 >= 1) A[r][n + k - 2] += dl * (1 - p); else w[r] -= dl * (1 - p) * 1; // y_0 = 1
    const s = n + k - 1;                      // y_k + delta[p x_{k+1} + (1-p) x_{k-1}] = 1 - (1-delta) b1
    A[s][s] = 1; w[s] = 1 - (1 - dl) * b1;
    if (k + 1 <= n) A[s][k] += dl * p; else w[s] -= dl * p * 1; // x_N = 1
    if (k - 1 >= 1) A[s][k - 2] += dl * (1 - p);                 // x_0 = 0
  }
  const z = gauss(A, w);
  const x = [0, ...z.slice(0, n), 1], y = [1, ...z.slice(n), 0];
  return { x, y };
}

/** Expected payoffs from fighting to the finish, W^1_k and W^2_k. */
export function fightValues(p, N, dl, b1, b2) {
  const solve = (b, lo, hi) => {
    const n = N - 1, A = Array.from({ length: n }, () => new Array(n).fill(0)), w = new Array(n).fill((1 - dl) * b);
    for (let k = 1; k <= n; k++) {
      const r = k - 1; A[r][r] = 1;
      if (k + 1 <= n) A[r][k] -= dl * p; else w[r] += dl * p * hi;
      if (k - 1 >= 1) A[r][k - 2] -= dl * (1 - p); else w[r] += dl * (1 - p) * lo;
    }
    return [lo, ...gauss(A, w), hi];
  };
  return { W1: solve(b1, 0, 1), W2: solve(b2, 1, 0) };
}

export function solveComplete(P) {
  const { x, y } = mpeOffers(P.p, P.N, P.dl, P.b1, P.b2);
  const { W1, W2 } = fightValues(P.p, P.N, P.dl, P.b1, P.b2);
  const k = P.k0;
  return { x, y, W1, W2, deal: x[k], rangeLo: W1[k], rangeHi: 1 - W2[k] };
}

/** Proposition 2's separating MPSE: offers, beliefs and the conditions that support it. */
export function solveIncomplete(P) {
  const { N, k0, pL, pM, pH, qw, qs, b1, b2 } = P, dl = P.dl2, qm = 1 - qw - qs;
  const S = mpeOffers(pL, N, dl, b1, b2);
  const V1 = k => S.x[Math.max(0, Math.min(N, k))];     // V^s_1(k), with V1(0) = 0, V1(N) = 1
  const V2 = k => S.y[Math.max(0, Math.min(N, k))];     // V^s_2(k), with V2(0) = 1, V2(N) = 0
  const post = I => {                                    // eq. 4
    const ls = qs * (I ? pL : 1 - pL), lm = qm * (I ? pM : 1 - pM);
    return ls / (ls + lm);
  };
  const yStar = (q, k1) => { const p1 = q * pL + (1 - q) * pM; return 1 - (1 - dl) * b1 - dl * (p1 * V1(k1 + 1) + (1 - p1) * V1(k1 - 1)); };
  const cond3 = (q, k1) => {
    const gap = V1(k1 + 1) - V1(k1 - 1);
    const need = (1 - dl) / (dl * (1 - q)) * (1 - b1 - b2) / gap;
    return { need, ok: gap > EPS && pM - pL > need + EPS };
  };
  const q1 = post(1), q0 = post(0);
  const x0 = 1 - (1 - dl) * b2 - dl * (pH * yStar(q1, k0 + 1) + (1 - pH) * yStar(q0, k0 - 1));        // eq. 5
  const p0 = (qm * pM + qs * pL) / (qm + qs);
  const xStar = qw * x0 + (1 - qw) * ((1 - dl) * b1 + dl * (p0 * (1 - yStar(q1, k0 + 1)) + (1 - p0) * (1 - yStar(q0, k0 - 1)))); // eq. 6
  const xh0 = 1 - (1 - dl) * b2 - dl * (pM * yStar(q1, k0 + 1) + (1 - pM) * yStar(q0, k0 - 1));
  const xh = (1 - qs) * xh0 + qs * ((1 - dl) * b1 + dl * (1 - pL * V2(k0 + 1) - (1 - pL) * V2(k0 - 1)));
  const xhh = (1 - dl * dl) * (1 - b2) + dl * dl * (pL * pL * V1(k0 + 2) + 2 * pL * (1 - pL) * V1(k0) + (1 - pL) ** 2 * V1(k0 - 2));
  const gap7 = V2(k0 - 1) - V2(k0 + 1);
  const need7 = qs * (1 - dl) / (dl * (1 - qs)) * (1 - b1 - b2) / gap7;
  const c3win = cond3(q1, k0 + 1), c3loss = cond3(q0, k0 - 1);
  const checks = [
    { id: 'c3w', ok: c3win.ok, need: c3win.need, text: 'Strong type prefers to signal after player 1 wins the first battle (eq. 3)' },
    { id: 'c3l', ok: c3loss.ok, need: c3loss.need, text: 'Strong type prefers to signal after player 1 loses it (eq. 3)' },
    { id: 'c7', ok: gap7 > EPS && pM - pL > need7 + EPS, need: need7, text: 'Player 1 prefers screening out the strong type to settling with all at once (eq. 7)' },
    { id: 'hat', ok: xh <= xStar + EPS, text: 'Player 1 prefers full separation to separating only the strong type (Lemma 6)' },
    { id: 'hathat', ok: xhh <= xStar + EPS, text: 'Player 1 prefers full separation to settling with every type at once' },
  ];
  const valid = pL < pM - EPS && pM < pH - EPS && qm > EPS && k0 >= 2 && k0 <= N - 2;
  return {
    valid, holds: valid && checks.every(c => c.ok), checks, qm, q1, q0, x0, xStar, xh, xhh, p0,
    yStar, V1, V2, pBattles: qm * 1 + qs * 2, knownWeak: mpeOffers(pH, N, dl, b1, b2).x[k0],
  };
}

/** One realized path of play under Proposition 2 for a chosen type and battle outcomes. */
export function path(P, E) {
  const t = P.t2, k1 = P.k0 + (P.I0 ? 1 : -1), steps = [];
  steps.push({ t: 0, who: '1', act: `proposes a split giving itself ${E.x0.toFixed(2)}`, k: P.k0 });
  if (t === 'w') { steps.push({ t: 0, who: '2', act: 'accepts; war never starts', end: E.x0 }); return steps; }
  steps.push({ t: 0, who: '2', act: 'rejects', battle: P.I0, k: k1 });
  const q = P.I0 ? E.q1 : E.q0;
  const y = E.yStar(q, k1);
  if (t === 'm') { steps.push({ t: 1, who: '2', act: `proposes a split giving player 1 ${(1 - y).toFixed(2)}; player 1 accepts`, end: 1 - y, belief: q }); return steps; }
  steps.push({ t: 1, who: '2', act: 'makes a non-serious offer; player 1 rejects', belief: q });
  const k2 = k1 + (P.I1 ? 1 : -1);
  steps.push({ t: 1, who: 'battle', act: '', battle: P.I1, k: k2 });
  if (k2 <= 0 || k2 >= P.N) { steps.push({ t: 2, who: 'war', act: k2 <= 0 ? 'player 1 is defeated' : 'player 2 is defeated', end: k2 <= 0 ? 0 : 1 }); return steps; }
  steps.push({ t: 2, who: '1', act: `proposes a split giving itself ${E.V1(k2).toFixed(2)}; player 2 accepts`, end: E.V1(k2) });
  return steps;
}
