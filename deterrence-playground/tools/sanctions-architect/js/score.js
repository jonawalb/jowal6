// Scoring 0–100 and the benchmark: the same Target (same hidden type, same demand) replayed with the
// computer's coalition-preserving strategy in your seat.
import { P } from '../data/params.js';
import { newGame, resolveTurn, achieved } from './engine.js';
import { cohesion } from './model.js';
import { STRATEGIES } from './ai.js';
import { makeRng, STREAM } from './rng.js';

const clamp01 = x => Math.max(0, Math.min(1, x));

export function score(s) {
  const W = P.scoreW, amb = P.ambitions[s.ambition].value;
  const n = Math.max(1, s.history.length);
  const parts = [
    { id: 'achieved', label: `Demand achieved (× ${amb} for a ${s.ambition} demand)`, value: achieved(s) * amb, w: W.achieved },
    { id: 'coalition', label: 'Coalition intact (final cohesion)', value: clamp01(cohesion(s) / 100), w: W.coalition },
    { id: 'cost', label: 'Your economic cost kept down', value: clamp01(1 - s.ownCum / P.costScale), w: W.cost },
    { id: 'shock', label: 'Global price shock kept down', value: clamp01(1 - s.shockSum / n / P.shockScale), w: W.shock },
  ];
  const total = Math.round(100 * parts.reduce((t, p) => t + p.value * p.w, 0));
  return { total, parts: parts.map(p => ({ ...p, points: Math.round(100 * p.value * p.w), max: Math.round(100 * p.w) })) };
}

/** Play a whole game with a computer strategy in your seat. */
export function playOut(start, strategy = 'sensible') {
  let s = newGame(start);
  const fn = STRATEGIES[strategy];
  while (!s.over) s = resolveTurn(s, fn(s, makeRng(s.seed, STREAM.intel, s.turn))).state;
  return s;
}

/** Benchmark totals: n replays with the same demand, ambition and hidden type, different dice. */
export function benchmark(start, n = P.benchRuns, offset = 0) {
  const out = [];
  for (let i = 1 + offset; i <= n + offset; i++) {
    const seed = (start.seed * 31 + i * 7919) >>> 0;
    out.push(score(playOut({ ...start, seed })).total);
  }
  return out;
}

export const percentile = (total, runs) => runs.length ? Math.round(100 * runs.filter(r => r < total).length / runs.length + 50 * runs.filter(r => r === total).length / runs.length) : 50;
