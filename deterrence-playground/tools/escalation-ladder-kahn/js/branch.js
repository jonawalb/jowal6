// Model-generated branch: what the model plays out after the player leaves the historical record.
// Each round: the player's move shifts the rung; the opponent's response is a seeded roll on a notional table keyed
// by Kahn group and the player's move; then an end roll checks for settlement or a war that locks in.
// Crossing Kahn's No Nuclear Use Threshold (rung 21 or higher) ends the branch as nuclear use.
// Every number lives in params.br (model.js) and is notional and editable.
import { params } from './model.js';

export const RESP = ['bd', 'hold', 'match', 'esc'];
export const NUKE_RUNG = 21;

/** Mulberry32, as in Penghu Gambit: seeded, so every branch and batch can be replayed. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const runSeed = (seed, i) => (Math.imul(seed ^ 0x9E3779B9, 2654435761) + Math.imul(i + 1, 40503)) >>> 0;

const clampR = r => Math.max(1, Math.min(44, r));
/** Response-table row: 0 = rungs 1–3, 1 = rungs 4–9, 2 = rungs 10–20. */
export const band = r => (r <= 3 ? 0 : r <= 9 ? 1 : 2);
export const BAND_NAMES = ['Subcrisis Maneuvering (1–3)', 'Traditional Crises (4–9)', 'Intense Crises (10–20)'];
const MV_I = { d: 0, h: 1, e: 2, m: 3 };
/** Classify the departure option by how far it moved the rung. */
export const classify = d => (d < 0 ? 'd' : d === 0 ? 'h' : d <= 3 ? 'e' : 'm');

function respProbs(B, g, mv) {
  const row = B.resp[g][MV_I[mv]].map(x => Math.max(0, Number(x) || 0)), t = row.reduce((a, b) => a + b, 0);
  return t ? row.map(x => x / t) : [0.25, 0.25, 0.25, 0.25];
}

/**
 * Play a branch. start: rung before the departure; first: the departure option's rung.
 * choose(t, last) returns the player's move ('d'|'h'|'e'|'m') for round t >= 2, or null to stop and wait.
 * Returns { rounds: [...], end: 'S'|'F'|'W'|'N'|null, pending: bool }.
 */
export function playBranch(start, first, choose, seed, B = params.br) {
  const R = rng(seed), rounds = [], max = Math.max(1, Math.round(B.rounds));
  let rung = start, last = null, end = null;
  for (let t = 1; t <= max; t++) {
    let mv;
    if (t === 1) { mv = classify(first - start); rung = first; }
    else {
      mv = choose(t, last);
      if (!mv) return { rounds, end: null, pending: true };
      rung = clampR(rung + B.shift[MV_I[mv]]);
    }
    const r = { t, mv, pr: rung, from: rounds.length ? rounds[rounds.length - 1].rr : start };
    rounds.push(r);
    const u1 = R(), u2 = R();   // two rolls every round, so the dice line up with the round whatever happens
    if (rung >= NUKE_RUNG) { r.rr = rung; r.end = 'N'; r.why = 'your move crossed the No Nuclear Use Threshold'; end = 'N'; break; }
    const g = band(rung), P = respProbs(B, g, mv);
    let k = 0, acc = P[0];
    while (u1 >= acc && k < 3) acc += P[++k];
    r.g = g; r.probs = P; r.u1 = u1; r.resp = RESP[k]; r.pResp = P[k];
    rung = clampR(rung + B.rshift[k]); r.rr = rung; last = r.resp;
    if (rung >= NUKE_RUNG) { r.end = 'N'; r.why = 'the response crossed the No Nuclear Use Threshold'; end = 'N'; break; }
    const g2 = band(rung), soft = mv === 'd' || r.resp === 'bd';
    const pS = Math.min(1, soft ? B.settle[g2] + (mv === 'd' && r.resp === 'bd' ? B.settleBoth : 0) : B.settleBase);
    const pW = rung >= 12 ? Math.min(1 - pS, B.war) : 0;
    r.u2 = u2; r.pS = pS; r.pW = pW;
    if (u2 < pS) { r.end = 'S'; r.why = 'end roll under the settlement chance'; end = 'S'; break; }
    if (u2 < pS + pW) { r.end = 'W'; r.why = 'end roll in the war lock-in band'; end = 'W'; break; }
    if (t === max) { r.end = rung >= 12 ? 'W' : 'F'; r.why = `round limit reached at rung ${rung}`; end = r.end; }
  }
  return { rounds, end, pending: false };
}

// ---- policies for the Monte Carlo
const TFT = { bd: 'd', hold: 'h', match: 'e', esc: 'e' };
export const POLICIES = [
  { k: 'mine', t: 'Keep choosing what I chose' },
  { k: 'd', t: 'Always de-escalate' },
  { k: 'h', t: 'Always hold' },
  { k: 'tft', t: 'Tit-for-tat' },
  { k: 'e', t: 'Always escalate one step' },
];
export function policyFn(k, mine, firstMv) {
  if (k === 'mine') return t => mine[t - 2] || mine[mine.length - 1] || firstMv;
  if (k === 'tft') return (t, last) => TFT[last] || 'h';
  return () => k;
}

export const RUNS = 1000;
export function monteCarlo(start, first, policy, seed, B = params.br, n = RUNS) {
  const o = { S: 0, F: 0, W: 0, N: 0, rounds: 0, n };
  for (let i = 0; i < n; i++) {
    const g = playBranch(start, first, policy, runSeed(seed, i), B);
    o[g.end]++; o.rounds += g.rounds.length;
  }
  o.rounds /= n;
  return o;
}

/** One lever at a time, same seeds (common random numbers), as in Penghu Gambit. */
export function drivers(start, first, policy, seed, base) {
  const V = [];
  const v = (t, f) => { const B = structuredClone(params.br); f(B); V.push({ t, B }); };
  const shiftRow = (B, col, d) => B.resp.forEach(g => g.forEach(row => { row[col] = Math.max(0, row[col] + d); }));
  v('Opponent 10 points more likely to escalate', B => shiftRow(B, 3, 0.10));
  v('Opponent 10 points more likely to back down', B => shiftRow(B, 0, 0.10));
  v('Settlement chances × 1.5', B => { B.settle = B.settle.map(x => x * 1.5); B.settleBase *= 1.5; });
  v('Settlement chances × 0.5', B => { B.settle = B.settle.map(x => x * 0.5); B.settleBase *= 0.5; });
  v('War lock-in chance +15 points', B => { B.war += 0.15; });
  v('War lock-in chance −15 points', B => { B.war = Math.max(0, B.war - 0.15); });
  v('Two more rounds', B => { B.rounds += 2; });
  v('Two fewer rounds', B => { B.rounds = Math.max(1, B.rounds - 2); });
  v('Your escalation moves one rung larger', B => { B.shift[2] += 1; B.shift[3] += 1; });
  v('Opponent escalation one rung larger', B => { B.rshift[2] += 1; B.rshift[3] += 1; });
  return V.map(x => {
    const r = monteCarlo(start, first, policy, seed, x.B);
    return { t: x.t, dN: (r.N - base.N) / base.n, dS: (r.S - base.S) / base.n, dW: (r.W - base.W) / base.n };
  }).sort((a, b) => Math.abs(b.dN) - Math.abs(a.dN) || Math.abs(b.dS) - Math.abs(a.dS));
}
