// The hidden world of one game, drawn entirely from the seed: the base rate, whether and when the Neighbor
// attacks, and every weekly report and sharper look that could be seen. Pure; runs in node and the browser.
import { P } from '../data/params.js';
import { EXERCISE, CATS, ALL } from '../data/indicators.js';
import { makeRng, STREAM } from './rng.js';

/** Phase in week t if the attack comes at the end of week a (a = null: no attack). null after the attack. */
export function phaseOf(t, a) {
  if (a == null) return 0;
  const d = a - t;
  if (d < 0) return null;
  if (d < P.late) return 2;
  if (d < P.late + P.early) return 1;
  return 0;
}

/** Draw the truth: which published base rate this game has, and the attack week (or null). */
export function drawTruth(seed) {
  const r = makeRng(seed, STREAM.setup);
  const rateIdx = Math.min(P.baseRates.length - 1, Math.floor(r.u() * P.baseRates.length));
  const attack = r.u() < P.baseRates[rateIdx].rate;
  const span = P.attackLast - P.attackFirst + 1;
  const a = P.attackFirst + Math.min(span - 1, Math.floor(r.u() * span));
  return { rateIdx, rate: P.baseRates[rateIdx].rate, attackWeek: attack ? a : null };
}

/**
 * The whole world. `truth` may be passed to keep the same ground truth with different reporting noise
 * (`noise` > 0), which is how the computer benchmark varies games.
 */
export function makeWorld(seed, { truth = null, noise = 0 } = {}) {
  const tr = truth || drawTruth(seed);
  const rw = makeRng(seed, STREAM.week, noise), rl = makeRng(seed, STREAM.look, noise);
  const weeks = [];
  for (let t = 1; t <= P.weeks; t++) {
    const ph = phaseOf(t, tr.attackWeek) ?? 0;
    const ex = rw.u() < EXERCISE.p[ph];
    const obs = CATS.map(c => rw.u() < (ex ? c.exercise : c.normal)[ph]);
    const look = ALL.map(c => rl.u() < c.look[ph]);
    weeks.push({ t, ph, ex, obs, look });
  }
  const last = tr.attackWeek ?? P.weeks;
  return { seed, noise, ...tr, last, weeks };
}
