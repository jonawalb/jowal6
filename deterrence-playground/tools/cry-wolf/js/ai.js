// The computer analyst (an exact Bayesian with warning thresholds) and simple comparison policies.
// A policy is { start(s), decide(s) -> { p, level, look } }. The computer reads only what the player could.
import { P } from '../data/params.js';
import { ALL } from '../data/indicators.js';
import { prior, startWeek, update, weekLogLik, lookLogLik, pAttack, pWithin, lookValue } from './bayes.js';
import { newGame, step } from './engine.js';
import { makeWorld } from './world.js';

// The analyst reports P(attack at all) but sets its level from P(attack within `soon` weeks): warning is about
// imminence, and a high base rate alone is no reason to mobilize in week 1.
export const ANALYST = { soon: 6, watch: 0.15, warning: 0.4, alert: 0.7, hold: 0.6, lookFrom: 0.05, lookTo: 0.95 };

/** Pick a level from a probability, with hysteresis so the analyst does not flap (each step-down costs trust). */
export function levelFor(p, current, cfg = ANALYST) {
  const up = [0, cfg.watch, cfg.warning, cfg.alert];
  let L = 0;
  for (let i = 3; i >= 1; i--) if (p >= up[i]) { L = i; break; }
  while (L < current && p >= up[L + 1] * cfg.hold) L++;
  return L;
}

export function bayesPolicy(cfg = ANALYST) {
  let lw;
  return {
    name: 'Bayesian analyst',
    start(s) { lw = prior(s.world.rate); },
    decide(s) {
      const t = s.week, wk = s.world.weeks[t - 1];
      lw = update(startWeek(lw, t), t, weekLogLik(wk));
      let look = -1;
      const p0 = pAttack(lw);
      if (s.budget > 0 && p0 > cfg.lookFrom && p0 < cfg.lookTo) {
        let best = 0;
        ALL.forEach((_, k) => { const v = lookValue(lw, t, k); if (v > best) { best = v; look = k; } });
        if (look >= 0) lw = update(lw, t, lookLogLik(look, wk.look[look]));
      }
      const p = pAttack(lw);
      return { p: Math.round(p * 100), level: levelFor(pWithin(lw, t, cfg.soon), s.level, cfg), look };
    },
  };
}

const fixed = (name, fn) => ({ name, start() {}, decide: fn });
export const POLICIES = {
  bayes: () => bayesPolicy(),
  never: () => fixed('Never warn', s => ({ p: Math.round(s.world.rate * 100), level: 0, look: -1 })),
  watch: () => fixed('Always watch', s => ({ p: Math.round(s.world.rate * 100), level: 1, look: -1 })),
  always: () => fixed('Always warn', () => ({ p: 90, level: 2, look: -1 })),
  alert: () => fixed('Always alert', () => ({ p: 95, level: 3, look: -1 })),
  // Reacts to any single strong indicator this week: the "one indicator settles it" analyst.
  jumpy: () => fixed('Jumpy (one strong indicator)', s => {
    const o = s.world.weeks[s.week - 1].obs; const hit = o[2] || o[3] || o[6];
    return { p: hit ? 80 : 20, level: hit ? 2 : 0, look: -1 };
  }),
};

/** Play a whole game with a policy. */
export function playOut(s, policy) {
  policy.start(s);
  while (!s.over) s = step(s, policy.decide(s)).state;
  return s;
}

/** The computer analyst on the same world as the player. */
export const analystGame = seed => playOut(newGame(seed), bayesPolicy());

/** Same ground truth, fresh reporting noise: the analyst's games for the benchmark. */
export function analystRuns(world, from, n) {
  const truth = { rateIdx: world.rateIdx, rate: world.rate, attackWeek: world.attackWeek };
  const out = [];
  for (let i = from; i < from + n; i++) out.push(playOut(newGame(world.seed, makeWorld(world.seed, { truth, noise: i + 1 })), bayesPolicy()));
  return out;
}
