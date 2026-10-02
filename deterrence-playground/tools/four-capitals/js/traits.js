// Hidden leader traits (Batch C, optional). When the player says yes, every leader gets one trait, drawn per game
// from its own random stream (so a game without traits is exactly the v5 game). The player never picks or sees
// them until the after-action replay. A trait does two things, both illustrative game design:
//   1. the computer's choices: a term added to its one-month utility (js/ai.js);
//   2. the peace-forum equation: a term added to z when that leader weighs a forum (s.traitForum, js/forum.js).
// The human's own seat gets no trait (the player makes those choices), so the benchmark's computer in that seat
// plays without one too.
import { makeRng, STREAM } from './rng.js';
import { IDS } from '../data/countries.js';
import { BY_ID } from '../data/actions.js';

export const TRAITS = {
  risk: {
    label: 'Risk-taking', text: 'Likes bold moves: the computer gives each step of intensity +1.2. Wants to fight on: −0.4 on a forum’s z.',
    taste: 1.2, forum: () => -0.4,
  },
  face: {
    label: 'Face-saving', text: 'Hates to be seen backing down: −3 for each accommodating move or step-back posture once the crisis is under way. Slow to accept a forum: −0.5 on z.',
    soft: 3, forum: () => -0.5,
  },
  impatient: {
    label: 'Impatient', text: 'Wants results now: discounts payoffs that land after this month by 60% and, from June, +1 for each escalatory move. Grows keener on a forum as the months pass: z −0.3 in March, rising 0.15 a month.',
    later: 0.6, push: 1, from: 3, forum: s => -0.3 + 0.15 * s.turn,
  },
  prudent: {
    label: 'Prudent', text: 'Steady and careful with stocks: −1.2 for each step of intensity and spending fuel and munitions counts 1.5×. Open to a way out: +0.5 on z.',
    taste: -1.2, scarcity: 0.5, forum: () => 0.5,
  },
};
export const TRAIT_IDS = Object.keys(TRAITS);

/** Draw a trait for every leader (uniform), on its own stream; the human's seat has none. */
export function drawTraits(s) {
  const r = makeRng(s.seed, STREAM.traits);
  s.traits = Object.fromEntries(IDS.map(w => [w, TRAIT_IDS[r.pick(TRAIT_IDS.map(() => 1))]]));
  if (s.human) s.traits[s.human] = null;
  traitsMonth(s);
  return s;
}

/** Refresh the forum hook for this month (the impatient leader's term grows with time). */
export function traitsMonth(s) {
  if (!s.traits) return;
  s.traitForum = Object.fromEntries(IDS.map(w => [w, s.traits[w] ? TRAITS[s.traits[w]].forum(s) : 0]));
}

/**
 * The trait's term in the computer's utility for `move`. `p`: the utility's parts { later, scar }, and `int`, the
 * move's intensity (js/ai.js). Zero without traits.
 */
export function traitUtility(s, who, move, p, int) {
  const k = s.traits?.[who]; if (!k) return 0;
  const t = TRAITS[k];
  if (k === 'risk' || k === 'prudent') return t.taste * int - (t.scarcity || 0) * p.scar;
  if (k === 'face') {
    const soft = move.actions.filter(id => BY_ID[id].tags.includes('soft')).length + (['stand', 'deesc'].includes(move.posture) ? 1 : 0);
    return s.rung >= 1 ? -t.soft * soft : 0;
  }
  const esc = move.actions.filter(id => BY_ID[id].tags.includes('esc')).length;   // impatient
  return -t.later * p.later + (s.turn >= t.from ? t.push * esc : 0);
}
