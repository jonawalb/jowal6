// Score (0–100) and the benchmark. Weights and floors are in data/params.js (illustrative).
//   security   – mean share of demand met each year (importance-weighted), scaled from secFloor to 100%
//   resilience – share of demand you could still meet for a year if everything were banned in 2036
//   output     – mean industry output index, scaled from outFloor to 100
//   cost       – money lost on failed, abandoned or fruitless projects, and heavy spending
import { P } from '../data/params.js';
import { IDS, BY } from '../data/minerals.js';
import { banProof } from './market.js';
import { playOut } from './engine.js';
import { POLICIES } from './policies.js';

const clamp01 = x => Math.max(0, Math.min(1, x));
export const metOf = h => h.rows.reduce((t, r) => t + BY[r.m].game.importance * r.met, 0);

export function score(s) {
  const k = P.score, H = s.history;
  const met = H.length ? H.reduce((t, h) => t + metOf(h), 0) / H.length : 1;
  const out = H.length ? H.reduce((t, h) => t + h.output, 0) / H.length : 100;
  const bp = banProof(s);
  const spentRatio = s.spent / (P.budget * Math.max(1, H.length));
  const parts = [
    { id: 'security', label: 'Supply security', raw: `${(met * 100).toFixed(1)}% of demand met on average`, value: 100 * clamp01((met - k.secFloor) / (1 - k.secFloor)), weight: k.security },
    { id: 'resilience', label: 'Resilience in 2036', raw: `${Math.round(bp * 100)}% of demand would survive a total cutoff`, value: 100 * clamp01(bp / k.resTarget), weight: k.resilience },
    { id: 'output', label: 'Industry output', raw: `average index ${out.toFixed(1)}`, value: 100 * clamp01((out - k.outFloor) / (100 - k.outFloor)), weight: k.output },
    { id: 'cost', label: 'Cost discipline', raw: `${Math.round(s.waste)} points wasted, ${Math.round(spentRatio * 100)}% of budget spent`, value: Math.max(0, Math.min(100, 100 - 100 * s.waste / k.wasteScale - k.spendPenalty * Math.max(0, spentRatio - k.spendFree))), weight: k.cost },
  ];
  for (const p of parts) p.value = Math.round(p.value);
  return { total: Math.round(parts.reduce((t, p) => t + p.value * p.weight, 0)), parts, met, out, bp };
}

/** The computer in your seat on the same world (same seed): n runs with different computer dice. */
export const benchmark = (seed, n = P.benchRuns, from = 1) => Array.from({ length: n }, (_, i) => score(playOut(seed, POLICIES.computer, from + i)).total);
export const baseline = seed => playOut(seed, POLICIES.nothing);
export const percentile = (total, runs) => runs.length ? Math.round(100 * runs.filter(r => r < total).length / runs.length + 50 * runs.filter(r => r === total).length / runs.length) : 50;
/** Per-year, per-mineral share of demand met, for the debrief chart. */
export const metSeries = s => Object.fromEntries(IDS.map(m => [m, s.history.map(h => h.rows.find(r => r.m === m).met)]));
