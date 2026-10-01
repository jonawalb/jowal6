// Scoring against the player's own weights, and the benchmark: the same start replayed with the computer
// in the player's seat, playing for the same priorities.
import { P } from '../data/params.js';
import { COUNTRIES, IDS, defaultWeights } from '../data/countries.js';
import { newGame, brief, resolveTurn } from './engine.js';
import { initBeliefs, updateBeliefs, chooseMove, objectiveValue } from './ai.js';

export function score(s, who, weights) {
  const obs = COUNTRIES[who].objectives;
  const sum = obs.reduce((t, o) => t + (weights[o.id] || 0), 0);
  const w = sum > 0 ? weights : Object.fromEntries(obs.map(o => [o.id, 1]));
  const parts = obs.map(o => ({ id: o.id, label: o.label, value: Math.round(Math.max(0, Math.min(100, o.measure(s)))), weight: w[o.id] || 0 }));
  return { total: Math.round(objectiveValue(s, who, weights)), parts };
}

/** Play one whole game with the computer in every seat (the player's seat uses the player's weights). */
export const playOut = start => playOutFrom(newGame(start), start);

/** Benchmark totals for the player's seat over n replays from the same seat, types and weights.
 * Replays vary the dice (seed offsets) but keep the hidden types the player had. */
export function benchmark(start, n = P.benchRuns) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const seed = (start.seed * 31 + i * 7919) >>> 0;
    const s0 = newGame({ ...start, seed });
    const s = playOutFrom({ ...s0, types: start.types }, start);
    out.push(score(s, start.player, start.weights).total);
  }
  return out;
}

function playOutFrom(s, start, onTurn) {
  let B = initBeliefs();
  while (!s.over) {
    s = brief(s);
    const moves = Object.fromEntries(IDS.map(w => [w, chooseMove(s, w, B[w], w === start.player ? start.weights : defaultWeights(w))]));
    B = updateBeliefs(B, s, moves);
    s = resolveTurn(s, moves).state;
    if (onTurn) onTurn(s, B);
  }
  return s;
}
export { playOutFrom };

export const percentile = (total, runs) => runs.length ? Math.round(100 * runs.filter(r => r < total).length / runs.length + 50 * runs.filter(r => r === total).length / runs.length) : 50;
