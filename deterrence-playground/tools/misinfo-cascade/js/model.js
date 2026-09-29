// Misinformation Cascade: network, sharing rule, exaggeration and correction.
//
// Each person i has a private conviction Δ_i (the integrity cost of repeating a claim they doubt).
// Mass Game rule (Walberg, working paper, June 2026): share iff Δ_i < θ̂_i, where θ̂_i is the
// endorsement share person i perceives. On a network θ̂_i is local: the share of i's neighbours who are
// sharing, scaled by the fear gain λ and raised by amplified visibility a (the θ̂ − θ lever).
// Corrections follow the Sticky Affect condition (Walberg, working paper, March 2026).
import { mulberry32, normal, keyed } from './rng.js';
import { PARAMS_NOTIONAL as P } from '../data/claims.js';

export const DEFAULTS = {
  md: 0.3,    // median conviction Δ
  sd: 0.5,    // LogNormal shape of Δ
  lam: 1.4,   // fear gain λ
  amp: 0.05,  // amplified visibility a
  ex: 0.18,   // exaggeration chance per retelling at λ = 1
  s0: 4,      // people who see the event first
  cor: 1,     // correction on/off
  tc: 8,      // correction round
  rc: 0.4,    // correction reach (share of people)
  src: 'o',   // 'o' out-group fact-check, 'i' in-group voice
  seed: 7,
  t: 40,      // round shown
};
export const W = 800, H = 470;
export const MAXV = 4;

/** Small-world network on jittered grid positions. Deterministic in seed. */
export function buildNetwork(seed) {
  const r = mulberry32(seed * 7919 + 17);
  const n = P.nodes, cols = 16, rows = Math.ceil(n / cols);
  const dx = (W - 40) / cols, dy = (H - 40) / rows;
  const nodes = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols, rr = Math.floor(i / cols);
    nodes.push({ x: 20 + dx * (c + 0.5) + (r() - 0.5) * dx * 0.8, y: 20 + dy * (rr + 0.5) + (r() - 0.5) * dy * 0.8 });
  }
  const key = (a, b) => a < b ? a * n + b : b * n + a;
  const edges = new Map();
  for (let i = 0; i < n; i++) {
    const d = nodes.map((q, j) => [j, (q.x - nodes[i].x) ** 2 + (q.y - nodes[i].y) ** 2]).filter(v => v[0] !== i).sort((a, b) => a[1] - b[1]);
    for (let k = 0; k < P.nearest; k++) edges.set(key(i, d[k][0]), [i, d[k][0]]);
  }
  const list = [...edges.values()];
  for (const e of list) {
    if (r() < P.rewire) {
      let j = Math.floor(r() * n);
      while (j === e[0] || edges.has(key(e[0], j))) j = Math.floor(r() * n);
      edges.delete(key(e[0], e[1]));
      e[1] = j; edges.set(key(e[0], j), e);
    }
  }
  const adj = nodes.map(() => []);
  for (const [a, b] of edges.values()) { adj[a].push(b); adj[b].push(a); }
  return { nodes, edges: [...edges.values()], adj };
}

/** Convictions Δ_i ~ LogNormal(ln md, sd). The same z-scores for a seed, so moving a slider shifts everyone. */
export function convictions(seed, md, sd) {
  const r = mulberry32(seed * 104729 + 3);
  return Array.from({ length: P.nodes }, () => md * Math.exp(sd * normal(r)));
}

/** First witnesses: a seeded origin and its nearest network neighbours (breadth-first). */
export function origin(net, seed, s0) {
  const r = mulberry32(seed * 31 + 5);
  const start = Math.floor(r() * P.nodes);
  const out = [start], seen = new Set(out);
  for (let q = 0; q < out.length && out.length < s0; q++) {
    for (const j of net.adj[out[q]]) { if (out.length >= s0) break; if (!seen.has(j)) { seen.add(j); out.push(j); } }
  }
  return out;
}

/** People the correction reaches: a seeded random sample of size round(rc·n). */
export function reached(seed, rc) {
  const r = mulberry32(seed * 7 + 901);
  const idx = Array.from({ length: P.nodes }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return new Set(idx.slice(0, Math.round(rc * P.nodes)));
}

/** Affect E, accuracy weight α(E) = 1/(1+E) (Sticky Affect: dα/dE < 0; the functional form is notional). */
export const affect = (lam, v) => (lam - 1) + v / MAXV;
export const alphaOf = E => 1 / (1 + E);

/**
 * Run the cascade. States: 0 silent, 1 sharing, 2 retracted. Returns one frame per round.
 * withCorrection=false gives the counterfactual run on identical random draws.
 */
export function simulate(p, net, withCorrection = true) {
  const n = P.nodes, T = P.steps;
  const delta = convictions(p.seed, p.md, p.sd);
  const state = new Int8Array(n), ver = new Int8Array(n).fill(-1), since = new Int16Array(n), inoc = new Float32Array(n);
  const reach = withCorrection && p.cor ? reached(p.seed, p.rc) : new Set();
  const w = p.src === 'i' ? 3 : 1;
  const evidence = w * P.evidence;
  for (const i of origin(net, p.seed, p.s0)) { state[i] = 1; ver[i] = 0; }
  const frames = [snap(0, state, ver, inoc, null)];
  let log = null;
  for (let t = 1; t <= T; t++) {
    if (withCorrection && p.cor && t === p.tc) log = correct();
    const nextState = state.slice(), nextVer = ver.slice();
    const pUp = Math.min(0.95, p.ex * p.lam);
    for (let i = 0; i < n; i++) {
      if (state[i] !== 0) continue;
      let m = 0, vmax = -1;
      for (const j of net.adj[i]) if (state[j] === 1) { m++; if (ver[j] > vmax) vmax = ver[j]; }
      if (m === 0) continue;                              // never saw the claim
      const thetaHat = Math.min(1, p.lam * m / net.adj[i].length + p.amp);
      if (delta[i] + inoc[i] < thetaHat) {
        nextState[i] = 1;
        nextVer[i] = Math.min(MAXV, vmax + (keyed(p.seed, t, i) < pUp ? 1 : 0));
      }
    }
    state.set(nextState); ver.set(nextVer);
    for (let i = 0; i < n; i++) if (state[i] === 1) since[i]++;
    frames.push(snap(t, state, ver, inoc, t === p.tc ? log : null));
  }
  return { frames, delta, reach };

  function correct() {
    const out = { reached: reach.size, retracted: 0, held: 0, prebunked: 0 };
    const decisions = [];
    for (const i of reach) {
      if (state[i] === 1) {
        const E = affect(p.lam, ver[i]), a = alphaOf(E);
        const nb = net.adj[i], S = nb.filter(j => state[j] === 1).length / nb.length;
        const N = Math.min(1, since[i] / P.narrativeRounds);
        const C = P.costSocial * S + P.costNarrative * N;
        const lhs = a * evidence, rhs = (1 - a) * P.identityUtility + C;
        decisions.push({ i, lhs, rhs });
        if (lhs > rhs) { out.retracted++; } else out.held++;
      } else if (state[i] === 0) {
        inoc[i] += alphaOf(affect(p.lam, 0)) * evidence;
        out.prebunked++;
      }
    }
    for (const d of decisions) if (d.lhs > d.rhs) state[d.i] = 2;
    out.decisions = decisions;
    return out;
  }
}

function snap(t, state, ver, inoc, log) {
  const counts = [0, 0, 0], vc = new Array(MAXV + 1).fill(0);
  for (let i = 0; i < state.length; i++) { counts[state[i]]++; if (state[i] === 1) vc[ver[i]]++; }
  return { t, state: state.slice(), ver: ver.slice(), inoc: inoc.slice(), sharing: counts[1], retracted: counts[2], vc, log };
}

/** Summary numbers for a run. */
export function summarize(run) {
  const f = run.frames, n = P.nodes;
  const peak = Math.max(...f.map(x => x.sharing));
  const last = f[f.length - 1];
  const ever = last.sharing + last.retracted;
  const half = f.findIndex(x => x.sharing >= n / 2);
  const alarm = last.vc.slice(2).reduce((a, b) => a + b, 0);
  return { peak: peak / n, final: last.sharing / n, ever: ever / n, half, alarmShare: last.sharing ? alarm / last.sharing : 0 };
}
