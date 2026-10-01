// Scoring, the computer-in-your-seat benchmark, and expected values for the overlay and debrief. Pure; no DOM.
import { P, CRISES } from '../data/params.js';
import { newSeries, playOut, tally, seatPolicy } from './engine.js';
import { optionValues, draw, think } from './ai.js';
import { makeRng, STREAM } from './rng.js';

/** The computer in your seat: the same strategy the Rival uses, for your true resolve and your current beliefs. */
export function computerSeat(s) {
  const c = s.cur;
  return draw(seatPolicy(c, 'you', s.dice).p, makeRng(s.dice, STREAM.ai + 7, c.i * 16 + c.round).u());
}

/**
 * Benchmark: replay your series n times (same hidden resolves, different dice and Rival noise) with the computer
 * in your seat. Returns the list of series totals.
 */
export function benchmark(seed, n = P.benchRuns, types) {
  const out = [];
  for (let k = 1; k <= n; k++) {
    const s = newSeries(seed, { types, dice: (seed * 31 + k * 7919) >>> 0 });
    out.push(tally(playOut(s, computerSeat)).you);
  }
  return out;
}

export const percentile = (total, runs) => runs.length
  ? Math.round(100 * runs.filter(r => r < total).length / runs.length + 50 * runs.filter(r => r === total).length / runs.length)
  : 50;

/**
 * Expected points of each of your options at one past decision (a log entry of crisis c), by simulation.
 * hindsight = true: the Rival's true resolve is used. false: its resolve is drawn from your belief at the time.
 * After your move, both sides follow the cutoff rule to the end (you for your true resolve).
 */
export function decisionValues(c, entry, { hindsight = false, n = P.rollouts, seed = 1 } = {}) {
  const at = { crisis: CRISES[c.i], risk: entry.risk, round: entry.round, mine: entry.belBefore.you, theirs: entry.belBefore.rival };
  return optionValues(at, c.types.you, hindsight ? c.types.rival : null, n, () => makeRng(seed, 600 + c.i * 16 + entry.round, hindsight ? 4 : 3));
}

/** What the computer would have done in your seat at a past decision (the "equilibrium play" overlay). */
export function equilibriumAt(c, entry, seed = 1) {
  const at = { crisis: CRISES[c.i], risk: entry.risk, round: entry.round, mine: entry.belBefore.you, theirs: entry.belBefore.rival };
  return think(at, c.types.you, () => makeRng(seed, 500, c.i * 16 + entry.round));
}
