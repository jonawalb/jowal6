// Richardson's arms-race equations and a three-party extension.
//   dx/dt = k y - a x + g
//   dy/dt = l x - b y + h
// x, y: each side's arms. k, l: defence (reaction) coefficients. a, b: fatigue and expense. g, h: grievances.
// Notation as in Smith (2019), pp. 25-34, which uses alpha and beta for a and b. The equilibrium is stable
// when both eigenvalues of [[-a, k], [l, -b]] have negative real part; with a, b, k, l >= 0 that is ab > kl.

export function equilibrium(p) {
  const det = p.a * p.b - p.k * p.l;
  if (Math.abs(det) < 1e-9) return null; // parallel equilibrium lines
  return { x: (p.b * p.g + p.k * p.h) / det, y: (p.a * p.h + p.l * p.g) / det, det };
}

/** Eigenvalues of the 2x2 system matrix; complex parts appear only when kl < 0 (fitted coefficients). */
export function eigen2(p) {
  const tr = -(p.a + p.b), det = p.a * p.b - p.k * p.l, disc = tr * tr / 4 - det;
  if (disc >= 0) { const s = Math.sqrt(disc); return [{ re: tr / 2 + s, im: 0 }, { re: tr / 2 - s, im: 0 }]; }
  const s = Math.sqrt(-disc);
  return [{ re: tr / 2, im: s }, { re: tr / 2, im: -s }];
}

export const stable2 = p => eigen2(p).every(e => e.re < 0);

/** Eigenvector of the stable (negative) eigenvalue of a saddle: the separatrix direction. */
export function separatrix(p) {
  const ev = eigen2(p);
  if (ev[0].im !== 0 || !(ev[0].re > 0 && ev[1].re < 0)) return null;
  const lam = ev[1].re;
  // (-a - lam) vx + k vy = 0
  const v = Math.abs(p.k) > 1e-9 ? [p.k, p.a + lam] : [p.b + lam, p.l];
  const n = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / n, v[1] / n];
}

const d2 = (p, x, y) => [p.k * y - p.a * x + p.g, p.l * x - p.b * y + p.h];
export const deriv2 = d2;

/** RK4 path from (x0, y0) for T years, stopping when it leaves [lo, hi] on either axis. */
export function path2(p, x0, y0, T = 60, dt = 0.1, lo = -5, hi = 200) {
  const out = [[0, x0, y0]];
  let x = x0, y = y0;
  for (let t = dt; t <= T + 1e-9; t += dt) {
    const k1 = d2(p, x, y), k2 = d2(p, x + dt / 2 * k1[0], y + dt / 2 * k1[1]);
    const k3 = d2(p, x + dt / 2 * k2[0], y + dt / 2 * k2[1]), k4 = d2(p, x + dt * k3[0], y + dt * k3[1]);
    x += dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y += dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    out.push([t, x, y]);
    if (x < lo || y < lo || x > hi || y > hi || !Number.isFinite(x + y)) break;
  }
  return out;
}

/** What happens to a path: settles, runs away, or collapses toward zero arms. */
export function fate(pts, eq) {
  const [, x, y] = pts[pts.length - 1];
  if (x > 150 || y > 150) return 'runaway';
  if (x < 0 && y < 0) return 'disarm';
  if (eq && Math.hypot(x - eq.x, y - eq.y) < 1) return 'settles';
  return x < 0 || y < 0 ? 'disarm' : 'moving';
}

// ---- Three parties ------------------------------------------------------------------------------------
// dx_i/dt = sum_j K[i][j] x_j - a_i x_i + g_i, i = US, Russia, China.

export function matrix3(p) {
  return [0, 1, 2].map(i => [0, 1, 2].map(j => (i === j ? -p.a[i] : p.K[i][j])));
}

/** Characteristic polynomial lambda^3 + c2 lambda^2 + c1 lambda + c0 and its roots (Durand-Kerner). */
export function eigen3(M) {
  const tr = M[0][0] + M[1][1] + M[2][2];
  const minors = M[0][0] * M[1][1] - M[0][1] * M[1][0] + M[0][0] * M[2][2] - M[0][2] * M[2][0] + M[1][1] * M[2][2] - M[1][2] * M[2][1];
  const det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
  const c = [1, -tr, minors, -det];
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const div = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const f = z => { let r = [c[0], 0]; for (let i = 1; i < 4; i++) { r = mul(r, z); r[0] += c[i]; } return r; };
  let z = [[0.4, 0.9], [-0.65, 0.72], [0.9, -0.3]];
  for (let it = 0; it < 200; it++) {
    z = z.map((zi, i) => {
      let den = [1, 0];
      z.forEach((zj, j) => { if (i !== j) den = mul(den, [zi[0] - zj[0], zi[1] - zj[1]]); });
      const q = div(f(zi), den);
      return [zi[0] - q[0], zi[1] - q[1]];
    });
  }
  return z.map(([re, im]) => ({ re, im: Math.abs(im) < 1e-7 ? 0 : im })).sort((u, v) => v.re - u.re);
}

export function equilibrium3(p) {
  const M = matrix3(p), b = p.g.map(v => -v);
  const det3 = A => A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
  const D = det3(M);
  if (Math.abs(D) < 1e-9) return null;
  return [0, 1, 2].map(c => det3(M.map((row, i) => row.map((v, j) => (j === c ? b[i] : v)))) / D);
}

export function path3(p, x0, T = 60, dt = 0.1) {
  const M = matrix3(p), f = x => M.map((row, i) => row[0] * x[0] + row[1] * x[1] + row[2] * x[2] + p.g[i]);
  const out = [[0, ...x0]];
  let x = x0.slice();
  for (let t = dt; t <= T + 1e-9; t += dt) {
    const k1 = f(x), k2 = f(x.map((v, i) => v + dt / 2 * k1[i])), k3 = f(x.map((v, i) => v + dt / 2 * k2[i])), k4 = f(x.map((v, i) => v + dt * k3[i]));
    x = x.map((v, i) => v + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    out.push([t, ...x]);
    if (x.some(v => v > 400 || !Number.isFinite(v))) break;
  }
  return out;
}

/** Pairwise checks: is each two-party subsystem stable on its own (a_i a_j > K_ij K_ji)? */
export const pairs3 = p => [[0, 1], [0, 2], [1, 2]].map(([i, j]) => ({ i, j, stable: p.a[i] * p.a[j] > p.K[i][j] * p.K[j][i] && p.a[i] + p.a[j] > 0 }));

// ---- Fitting to data (illustrative) ---------------------------------------------------------------------
/** OLS of the annual change in own arms on the rival's arms, own arms and a constant. */
export function fitSide(own, rival, i0, i1) {
  const rows = [];
  for (let t = i0; t < i1; t++) rows.push([rival[t], own[t], 1, own[t + 1] - own[t]]);
  const n = rows.length;
  if (n < 5) return null;
  const XtX = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], Xty = [0, 0, 0];
  rows.forEach(r => { for (let i = 0; i < 3; i++) { Xty[i] += r[i] * r[3]; for (let j = 0; j < 3; j++) XtX[i][j] += r[i] * r[j]; } });
  const c = solve3(XtX, Xty);
  if (!c) return null;
  const mean = rows.reduce((s, r) => s + r[3], 0) / n;
  let ssr = 0, sst = 0;
  rows.forEach(r => { const e = r[3] - (c[0] * r[0] + c[1] * r[1] + c[2]); ssr += e * e; sst += (r[3] - mean) ** 2; });
  return { react: c[0], fatigue: -c[1], griev: c[2], r2: sst > 0 ? 1 - ssr / sst : 0, n };
}

function solve3(A, b) {
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 3; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[3] / r[i]);
}
