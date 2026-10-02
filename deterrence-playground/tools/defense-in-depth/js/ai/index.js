// The computer opponent's entry points (SPEC §5.1, §10.2).
//   policy(g, side, phase)   -> { missions, actions } for this hour ('hour'), or { missions: [], actions: [], plan }
//                               for 'plan'. Uses g.diff (e | s | h) and the default doctrine of that level.
//   aiPlayer({ diff, profile }) -> a player function for newGame({ players }) with .plan(g, side, rng); profile may
//                               be a campaign doctrine key (js/campaign.js profileFor) or a profiles.js key/object.
//   planDef(g, profile, rng), planAtt(g, profile, rng) -> plan objects (the Plan screen's "Auto-plan" button).
// The AI reads only its own fogged picture (js/vision.js picture in fog mode) and its own units; it is
// deterministic (no dice; its few random choices come from its own seeded stream).
import { resolve } from './profiles.js';
import { attackerPolicy } from './attacker.js';
import { defenderPolicy } from './defender.js';
import { planDef } from './plan-def.js';
import { planAtt } from './plan-att.js';

export { planDef, planAtt };
export { profileFor, resolve, PROFILES, ALIASES } from './profiles.js';

/** One hour's orders for `side` from a resolved profile. */
export function decide(g, side, P) {
  if (g.over || g.phase !== 'battle') return { missions: [], actions: [] };
  return side === 'def' ? defenderPolicy(g, P) : attackerPolicy(g, P);
}

/** SPEC §10.2 policy: the default doctrine of the game's difficulty level. */
export function policy(g, side, phase = 'hour') {
  const P = resolve(null, side, g.diff);
  if (phase === 'plan') return { missions: [], actions: [], plan: side === 'def' ? planDef(g, P) : planAtt(g, P) };
  return decide(g, side, P);
}

/** A computer player for newGame({ players: { def, att } }). opts: { diff = 's', profile }. */
export function aiPlayer(opts = {}) {
  const cache = {};
  const prof = (g, side) => (cache[side] ||= resolve(opts.profile || null, side, opts.diff || g.diff || 's'));
  const fn = (g, side, phase = 'hour') => (phase === 'plan' ? { missions: [], actions: [] } : decide(g, side, prof(g, side)));
  fn.plan = (g, side, rng) => (side === 'def' ? planDef(g, prof(g, side), rng) : planAtt(g, prof(g, side), rng));
  fn.profile = prof;
  return fn;
}
