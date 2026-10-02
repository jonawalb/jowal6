// Making and rebuilding games for the page and the review's replays: single battles and campaign battles, the
// human's plan, replay of a share link (plan + action log through hour n), and the share-link state. No DOM,
// so the replay Worker imports it too.
import { newGame, applyPlan, advance, issue, index } from '../engine.js';
import { battleSetup, applyDoctrine } from '../campaign.js';
import { aiPlayer } from './ai-bridge.js';

const other = s => (s === 'def' ? 'att' : 'def');

/**
 * A new game in the planning phase for the human on side ch.side (ch.dice: fresh dice for a replay). The
 * computer's plan is applied at once (it plans from its own knowledge, SPEC §1.2). setup: a campaign
 * battleSetup(C) or null. o: { foeDiff, seer, mePlayer } for the review's replays: the opponent's difficulty
 * flipped, an opponent that sees everything, or the computer in your place.
 */
export function makeGame(ch, setup = null, o = {}) {
  const me = ch.side, foe = other(me);
  const ai = aiPlayer(foe, o.foeDiff || ch.diff, o.foeDiff ? null : setup ? setup.profile.ai : null, { seer: !!o.seer });
  const base = setup ? { ...setup.opts } : { seed: ch.seed, scale: ch.scale, era: ch.era, mode: 's', diff: ch.diff, od: ch.od };
  if (o.era) base.era = o.era;
  const players = { [me]: o.mePlayer || null, [foe]: ai };
  const g = newGame({ ...base, dice: ch.dice || 0, telemetry: o.telemetry !== false, players, standing: !o.mePlayer });   // W3: standing orders for the human side
  if (setup) {
    applyDoctrine(g, me, setup.doctrine.me);
    applyDoctrine(g, foe, setup.doctrine.ai);
    index(g);
  }
  g.ui = { me, aiProfile: ai.profile, battle: setup ? setup.index : null, ammo0: { ...g.ammo } };
  return g;
}

/** Start the battle with the human's plan. Returns the checklist the engine computed. */
export const beginBattle = (g, plan) => applyPlan(g, g.ui.me, plan);

/** Rebuild a game from a share link: plan + log, played through hour n (o: makeGame options). */
export function rebuild(ch, setup, plan, log, n, o = {}) {
  const g = makeGame(ch, setup, o);
  if (!plan) return g;
  beginBattle(g, plan);
  const apply = () => { for (const a of log) if (a.t === g.t) issue(g, a); };
  while (!g.over && g.t < n) { apply(); advance(g); }
  if (!g.over) apply();
  return g;
}

/** Campaign battle setup for the current battle, or null in a single battle. */
export const setupFor = C => (C ? battleSetup(C) : null);

/** The choices a campaign implies (side, scale, era, difficulty and balance carry over, SPEC §6.1). */
export function campaignChoices(C) {
  const o = C.opts;
  return { side: o.role, seed: o.seed, scale: o.scale, era: o.era === 'modern' ? 'm' : o.era === 'ww1' ? 'w' : o.era, mode: 'c', diff: o.diff, od: o.od };
}

/** Share-link state (js/hash.js encode). */
export function linkState(S) {
  const ch = S.choices, g = S.g;
  const battle = g && g.phase === 'battle';
  return {
    side: ch.side, seed: ch.seed, scale: ch.scale, era: ch.era, mode: ch.mode, diff: ch.diff, od: ch.od,
    n: battle ? g.t : 0, plan: battle ? g.plans[ch.side] || null : null, log: battle ? g.log : [],
    campaign: S.campaign ? S.campaignToken : null,
  };
}
