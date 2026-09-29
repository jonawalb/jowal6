// Logit quantal response equilibrium solvers.
// Trees (perfect information): agent QRE by backward induction, which is unique at every λ
// (McKelvey & Palfrey 1998; Signorino 1999, eqs. 4-7). λ = Infinity returns the subgame perfect equilibrium.
// 2x2 games: every logit QRE at a given λ, and the whole correspondence as λ runs from 0.01 to 100.

export const sig = x => 1 / (1 + Math.exp(-x));
export const logit = p => Math.log(p / (1 - p));

/**
 * Agent logit QRE of a perfect-information tree.
 * Returns { probs: {nodeId: [p per action]}, ev: {nodeId: [u1,u2]}, out: {terminal: prob} }.
 */
export function solveTree(game, lam) {
  const probs = {}, ev = {}, out = {};
  const value = node => {
    if (typeof node === 'string') return game.pay[node];
    const vals = node.acts.map(a => value(a.to));
    const u = vals.map(v => v[node.who]);
    let p;
    if (lam === Infinity) {
      const m = Math.max(...u), best = u.map(x => Math.abs(x - m) < 1e-9);
      const k = best.filter(Boolean).length;
      p = best.map(b => (b ? 1 / k : 0));
    } else {
      const m = Math.max(...u), e = u.map(x => Math.exp(lam * (x - m))), z = e.reduce((a, b) => a + b, 0);
      p = e.map(x => x / z);
    }
    probs[node.id] = p;
    const v = [0, 1].map(i => vals.reduce((s, vv, k) => s + p[k] * vv[i], 0));
    ev[node.id] = v;
    return v;
  };
  value(game.root);
  const walk = (node, mass) => {
    if (typeof node === 'string') { out[node] = (out[node] || 0) + mass; return; }
    node.acts.forEach((a, k) => walk(a.to, mass * probs[node.id][k]));
  };
  walk(game.root, 1);
  return { probs, ev, out };
}

/** Walk a tree and list its decision nodes in drawing order. */
export function nodesOf(game) {
  const list = [];
  const go = n => { if (typeof n === 'string') return; list.push(n); n.acts.forEach(a => go(a.to)); };
  go(game.root);
  return list;
}

// ---------- 2x2 normal-form games ----------

/** Expected payoff advantage of action 0 over action 1 for the row player, given q = P(col plays 0). */
export const d1 = (g, q) => (g.R[0][0] * q + g.R[0][1] * (1 - q)) - (g.R[1][0] * q + g.R[1][1] * (1 - q));
/** Same for the column player, given p = P(row plays 0). */
export const d2 = (g, p) => (g.C[0][0] * p + g.C[1][0] * (1 - p)) - (g.C[0][1] * p + g.C[1][1] * (1 - p));
const bound = g => Math.max(...[0, 1].map(q => Math.abs(d1(g, q)))) + 1e-9;

/** H(x) = λ·d1(q(p(x))) − x, where x = logit p. Its roots are the QRE. */
const H = (g, lam, x) => lam * d1(g, sig(lam * d2(g, sig(x)))) - x;

/** All logit QRE of a 2x2 game at precision λ, as [{p, q, x}], sorted by p. */
export function allQRE(g, lam, n = 1500) {
  const L = lam * bound(g) + 1;
  const res = [];
  let x0 = -L, h0 = H(g, lam, x0);
  for (let i = 1; i <= n; i++) {
    const x1 = -L + (2 * L * i) / n, h1 = H(g, lam, x1);
    if (h0 === 0) res.push(x0);
    else if (h0 * h1 < 0) {
      let a = x0, b = x1, ha = h0;
      for (let k = 0; k < 60; k++) {
        const m = (a + b) / 2, hm = H(g, lam, m);
        if (ha * hm <= 0) b = m; else { a = m; ha = hm; }
      }
      res.push((a + b) / 2);
    }
    x0 = x1; h0 = h1;
  }
  return res.map(x => ({ x, p: sig(x), q: sig(lam * d2(g, sig(x))) }));
}

/** Pure and mixed Nash equilibria of the 2x2 game, as [{p, q}]. */
export function nash(g) {
  const out = [];
  for (const i of [0, 1]) for (const j of [0, 1]) {
    const rowOk = g.R[i][j] >= g.R[1 - i][j], colOk = g.C[i][j] >= g.C[i][1 - j];
    if (rowOk && colOk) out.push({ p: i === 0 ? 1 : 0, q: j === 0 ? 1 : 0, pure: true });
  }
  // Mixed: q* makes row indifferent, p* makes column indifferent.
  const a = g.R[0][0] - g.R[0][1] - g.R[1][0] + g.R[1][1], b = g.R[0][1] - g.R[1][1];
  const c = g.C[0][0] - g.C[1][0] - g.C[0][1] + g.C[1][1], e = g.C[1][0] - g.C[1][1];
  if (Math.abs(a) > 1e-9 && Math.abs(c) > 1e-9) {
    const q = -b / a, p = -e / c;
    if (q > 0 && q < 1 && p > 0 && p < 1) out.push({ p, q, pure: false });
  }
  return out;
}

/**
 * The QRE correspondence on u = log10 λ in [U0, U1], traced by marching squares on
 * y = x / (λ·B + 1) in [−1, 1]. Returns polylines [[{u, p, q}]] and the index of the principal branch
 * (the one that starts at the centroid, p = q = 1/2, as λ → 0; McKelvey & Palfrey 1995, Theorem 3).
 */
export const U0 = -2, U1 = 2;
export function correspondence(g, nu = 300, ny = 320) {
  const B = bound(g);
  const us = Array.from({ length: nu + 1 }, (_, i) => U0 + ((U1 - U0) * i) / nu);
  const ys = Array.from({ length: ny + 1 }, (_, j) => -0.999 + (1.998 * j) / ny);
  const val = us.map(u => { const lam = 10 ** u, s = lam * B + 1; return ys.map(y => H(g, lam, y * s) / s); });
  const pt = (i, j, i2, j2) => {
    const a = val[i][j], b = val[i2][j2], t = a / (a - b);
    return { u: us[i] + t * (us[i2] - us[i]), y: ys[j] + t * (ys[j2] - ys[j]) };
  };
  // Edge keys: h:i:j is the edge from (i,j) to (i+1,j); v:i:j from (i,j) to (i,j+1).
  const adj = new Map(), P = new Map();
  const link = (k1, p1, k2, p2) => {
    P.set(k1, p1); P.set(k2, p2);
    if (!adj.has(k1)) adj.set(k1, []); if (!adj.has(k2)) adj.set(k2, []);
    adj.get(k1).push(k2); adj.get(k2).push(k1);
  };
  for (let i = 0; i < nu; i++) for (let j = 0; j < ny; j++) {
    const s = [val[i][j], val[i + 1][j], val[i + 1][j + 1], val[i][j + 1]].map(v => v > 0);
    const E = [];
    if (s[0] !== s[1]) E.push([`h:${i}:${j}`, () => pt(i, j, i + 1, j)]);
    if (s[1] !== s[2]) E.push([`v:${i + 1}:${j}`, () => pt(i + 1, j, i + 1, j + 1)]);
    if (s[2] !== s[3]) E.push([`h:${i}:${j + 1}`, () => pt(i, j + 1, i + 1, j + 1)]);
    if (s[3] !== s[0]) E.push([`v:${i}:${j}`, () => pt(i, j, i, j + 1)]);
    if (E.length === 2) link(E[0][0], E[0][1](), E[1][0], E[1][1]());
    else if (E.length === 4) { link(E[0][0], E[0][1](), E[1][0], E[1][1]()); link(E[2][0], E[2][1](), E[3][0], E[3][1]()); }
  }
  const seen = new Set(), lines = [];
  const a1 = d1(g, 1) - d1(g, 0), b1 = d1(g, 0);
  // q from the row player's condition, logit p = λ·d1(q), which is linear in q and numerically stable.
  const toPt = k => {
    const { u, y } = P.get(k), lam = 10 ** u, sc = lam * B + 1;
    let x = y * sc;
    // Polish x with a local bisection: the grid alone is too coarse near the mixed branch at high λ.
    let a = x - (4 / ny) * sc, b = x + (4 / ny) * sc, ha = H(g, lam, a);
    if (ha * H(g, lam, b) < 0) {
      for (let it = 0; it < 50; it++) { const m = (a + b) / 2, hm = H(g, lam, m); if (ha * hm <= 0) b = m; else { a = m; ha = hm; } }
      x = (a + b) / 2;
    }
    const p = sig(x);
    const q = Math.abs(a1) > 1e-9 ? Math.min(1, Math.max(0, (x / lam - b1) / a1)) : sig(lam * d2(g, p));
    return { u, p, q };
  };
  const ends = [...adj.keys()].filter(k => adj.get(k).length === 1);
  for (const start of [...ends, ...adj.keys()]) {
    if (seen.has(start)) continue;
    const line = [];
    let cur = start, prev = null;
    while (cur && !seen.has(cur)) {
      seen.add(cur); line.push(toPt(cur));
      const nx = adj.get(cur).find(k => k !== prev && !seen.has(k));
      prev = cur; cur = nx;
    }
    if (line.length > 1) lines.push(line);
  }
  lines.forEach(l => { if (l[0].u > l[l.length - 1].u) l.reverse(); });
  let principal = 0, best = Infinity;
  lines.forEach((l, k) => { const m = Math.min(...l.map(v => v.u)); if (m < best) { best = m; principal = k; } });
  return { lines, principal };
}

/** Point(s) where the principal branch crosses u; returns the first crossing along the branch. */
export function principalAt(corr, u) {
  const l = corr.lines[corr.principal];
  for (let k = 0; k < l.length - 1; k++) {
    const a = l[k], b = l[k + 1];
    if ((a.u - u) * (b.u - u) <= 0 && a.u !== b.u) {
      const t = (u - a.u) / (b.u - a.u);
      return { p: a.p + t * (b.p - a.p), q: a.q + t * (b.q - a.q) };
    }
  }
  const last = l[l.length - 1];
  return { p: last.p, q: last.q };
}

/** Principal QRE at λ, refined: the exact root nearest the traced branch point. */
export function principalQRE(g, corr, lam) {
  const u = Math.log10(lam), approx = principalAt(corr, Math.max(U0, Math.min(U1, u)));
  const roots = allQRE(g, lam);
  let best = roots[0], d = Infinity;
  for (const r of roots) { const dd = Math.abs(r.p - approx.p) + Math.abs(r.q - approx.q); if (dd < d) { d = dd; best = r; } }
  return best;
}
