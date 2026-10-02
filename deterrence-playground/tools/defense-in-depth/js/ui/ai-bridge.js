// The computer opponent as the page uses it (SPEC §5, §10.2), over W2-AI's commanders (js/ai/index.js):
// aiPlayer(side, diff, profile) is a policy function with .plan(g, side, rng) for newGame({ players }), and
// autoPlan(g, side) fills the player's Auto-plan with the same planner the Standard computer uses (SPEC §1.2).
// o.seer gives the review's "opponent who sees everything" replay (SPEC §7.4): before each hour it adds exact
// sightings of every enemy unit to that side's picture. Nothing else here reads the truth.
import * as AIM from '../ai/index.js';
import { alive } from '../forces.js';

/** A plan for `side` from the computer's planner. profile: a level ('e' | 's' | 'h'), a profile or doctrine key. */
export const planFor = (g, side, profile, rng) => (side === 'def' ? AIM.planDef(g, profile, rng) : AIM.planAtt(g, profile, rng));

/** The Auto-plan button: the Standard computer's planner for your side. */
export const autoPlan = (g, side) => planFor(g, side, 's', g.rng && g.rng.planAi);

/** A profile key a side would get at a difficulty (for labels and the review's doctrine flip). */
export const profileKey = (diff, side) => AIM.profileFor(diff, side).key;

/** Exact sightings of every enemy unit, for the last few hours (the replay that "sees everything"). */
function seeAll(g, side) {
  for (let T = Math.max(0, g.t - 2); T <= g.t; T++) {
    const list = (g.seen[side][T] ||= []);
    for (const e of g.units) {
      if (e.side === side || !alive(e) || e.sec < 0) continue;
      list.push({ T, arr: T, id: e.id, sec: e.sec, type: e.type, str: e.str, hp: e.str0 ? e.str / e.str0 : null, exact: true, moving: !!e.moving });
    }
  }
}

/** A computer player for `side` at difficulty `diff`; profile: a campaign doctrine key (overrides the level's). */
export function aiPlayer(side, diff = 's', profile = null, o = {}) {
  const pol = AIM.aiPlayer({ diff, profile: profile || null });
  const fn = (g, s, phase) => { if (o.seer && phase !== 'plan') seeAll(g, s); return pol(g, s, phase); };
  fn.plan = (g, s, rng) => pol.plan(g, s, rng);
  fn.profile = profile || profileKey(diff, side);
  return fn;
}
