// Automatic fire-control policies, replayed headless from the same seed for the after-action review.
// "heuristic": cheapest weapon that can do the job, shoot-look-shoot, long-range interceptors kept for
//   ballistic missiles unless a leak is seconds away.
// "premium": the most capable weapon available at every track, the way a defender flush with interceptors
//   (or worried only about leakers) might fight.
// Between waves both rules resupply with the same budget as the player, split by proportionalOrder.
import { WEAPONS } from '../data/params.js';
import { createGame, step, nextWave, liveThreats, tti, coverage, canFire, fire, summary, DT } from './sim.js';
import { applyResupply, proportionalOrder } from './resupply.js';

const PLANS = {
  heuristic: {
    drone: [['gun', 99], ['sri', 3.5]],
    cruise: [['sri', 99], ['gun', 99], ['lri', 4]],
    ballistic: [['lri', 99], ['sri', 2.5]],
  },
  premium: {
    drone: [['lri', 99], ['sri', 99], ['gun', 99]],
    cruise: [['lri', 99], ['sri', 99], ['gun', 99]],
    ballistic: [['lri', 99], ['sri', 99]],
  },
};
const WANT = 0.7; // fire again until the shots in the air give at least this chance of a kill

export function act(S, name) {
  const plan = PLANS[name];
  const live = liveThreats(S).sort((a, b) => tti(a) - tti(b));
  for (const th of live) {
    if (coverage(S, th) >= WANT) continue;
    const t = tti(th);
    for (const [w, maxT] of plan[th.type]) {
      if (t > maxT) continue;
      if (!canFire(S, w, th).reason) { fire(S, w, th.id); break; }
    }
  }
}

/** Play a whole night with a policy, headless. Returns the summary. */
export function replay(seed, name, budget) {
  const S = createGame(seed, { headless: true, budget });
  let k = 0;
  while (S.phase !== 'over' && k < 60 * 60 * 20) {
    if (S.phase === 'break') { applyResupply(S, proportionalOrder(S)); nextWave(S); }
    if (k % 3 === 0) act(S, name);
    step(S, DT); k++;
  }
  return { ...summary(S), mags: Object.fromEntries(Object.keys(WEAPONS).map(w => [w, WEAPONS[w].mag])) };
}
