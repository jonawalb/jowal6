// Computer-opponent profiles (SPEC §5.1-5.2; Biddle brief §6.1). A profile is a setting of Biddle's force-
// employment variables for one side, plus the reaction latency of the difficulty level. Difficulty changes
// doctrine and reaction only, never dice or information (D-16). The campaign's doctrine keys
// (js/campaign.js profileFor: elastic, forwardHeavy, modernAssault, massedWaves, quickRupture) map onto the
// same profiles; difficulty then only adds the Hard extras to a good doctrine and sets latency.
// Every number here is NOTIONAL (design), tuned in W2-AI/W3 balance runs (the "AI thresholds" knob, SPEC §9.2).
// Attacker fields: prep, front (broad | narrow | main | single), width (main-effort columns override), form,
//   leapfrog / pairing (pairs with overwatch, or lone bounding), bound (short | long), rushSafe + rushRule (when to
//   Rush instead of bound: safe | loose | held; rushSafe true | 'w' = only in 1917-18, W3: in Modern, ground believed
//   clear is not safe enough to run upright across), rate (barrage rows/h), barrage (false = none), resync (re-base the
//   barrage on the lead: true | 'w' | false), fixing, reserves (success | timer | all), infil, infilReserves, allInfil,
//   flankGuards, shiftEvery, consolidate, lanes (extra follow-on columns), fires, cb, gas, smoke, feint, drones, ds,
//   engineers, tanks. Defender fields: fwdShare, fr, lanes (lateral | frontal | greedy), riposte, timedRipostes,
//   ripMargin, cs (window | deliberate | late), csExtra, csStance, csPosture, movePosture, reserveMode, dummies,
//   holdForMain, fill (objective garrisons), block (companies shifted per hour), garrison, stack, fires, cb, gas, drones.
import { AI } from '../../data/params.js';

/** Attacker profiles. */
const ATT = {
  // Easy: massed waves (Biddle pp. 32-33): methodical preparation (full warning), broad front,
  // waves + rush, creeping barrage at 2 rows/h, reserves fed in piecemeal on a timer, no flank guards.
  massedWaves: {
    side: 'att', key: 'massedWaves', prep: 'methodical', front: 'broad', form: 'waves', leapfrog: false, infil: false,
    rate: 2, fixing: false, reserves: 'timer', timerEvery: 2, flankGuards: 0, shiftEvery: 0, consolidate: false,
    fires: 'spread', cb: false, gas: false, smoke: false, feint: false, drones: 'spread', ds: false, engineers: false, tanks: 'lead',
    rushSafe: true, bound: 'short', resync: false, pairing: false,
  },
  // Easy (W3, DECISIONS): a bad layout (one narrow column, waves, no fixing attacks, a 2 rows/h creeper) with the
  // Standard commander's hourly reactions, two hours late. A gentle opponent that still fights back.
  easyAssault: { side: 'att', key: 'easyAssault', planAs: { base: 'modernSystem', form: 'waves', fixing: false, rate: 2, front: 'narrow' }, prep: 'hurricane', front: 'main', form: 'groups', leapfrog: true, infil: true,
    rate: 1, fixing: true, reserves: 'success', flankGuards: 1, shiftEvery: 4, consolidate: true,
    fires: 'lead', cb: true, gas: true, smoke: false, feint: false, drones: 'main', ds: true, engineers: true, tanks: 'support',
    rushSafe: 'w', bound: 'long', resync: false, pairing: true },
  // Campaign false lesson FL1: a quick rupture behind a fast creeper, still in waves (W1-C tweakPlan).
  quickRupture: {
    side: 'att', key: 'quickRupture', prep: 'hurricane', front: 'narrow', form: 'waves', leapfrog: false, infil: true,
    rate: 2, fixing: true, reserves: 'timer', timerEvery: 3, flankGuards: 0, shiftEvery: 0, consolidate: false,
    fires: 'spread', cb: false, gas: false, smoke: false, feint: false, drones: 'spread', ds: false, engineers: false, tanks: 'lead',
    rushSafe: true, bound: 'short', resync: false, pairing: false,
  },
  // Standard: the modern-system assault (Biddle pp. 33-38): hurricane, fixing attacks, main effort where cover
  // is best and the believed defense weakest, small groups + leapfrog, storm infiltration, a 1 row/h creeper on
  // the main effort, flank guards (A.7), second echelon follows success, consolidates on the objective.
  modernSystem: {
    side: 'att', key: 'modernSystem', prep: 'hurricane', front: 'main', form: 'groups', leapfrog: true, infil: true,
    rate: 1, fixing: true, reserves: 'success', flankGuards: 1, shiftEvery: 4, consolidate: true,
    fires: 'lead', cb: true, gas: true, smoke: false, feint: false, drones: 'main', ds: true, engineers: true, tanks: 'support',
    rushSafe: 'w', bound: 'long', resync: false, pairing: true,
  },
  // Hard: Standard plus a feint barrage on a second axis, faster main-effort shifts, smoke on enfilading MG
  // positions, drones and EW massed on the main effort, and follow-on companies spread over two more columns so
  // the assault does not jam (W3: counter-battery-first and infiltrating reserves dropped; both lost ground).
  modernSystemPlus: {
    side: 'att', key: 'modernSystemPlus', prep: 'hurricane', front: 'main', form: 'groups', leapfrog: true, infil: true,
    rate: 1, fixing: true, reserves: 'success', flankGuards: 1, shiftEvery: 2, consolidate: true,
    fires: 'lead', cb: true, gas: true, smoke: true, feint: true, drones: 'mass', ds: true, engineers: true, tanks: 'support',
    rushSafe: 'w', bound: 'long', resync: 'w', pairing: true, infilReserves: false, lanesPlus: { d: 2, c: 0, a: 0 },
  },
};

/** Defender profiles. */
const DEF = {
  // Easy: forward-heavy (Biddle pp. 96-99; Hunzeker p. 117): >= 60% forward, Hold at all
  // costs, frontal lanes, f_r ~ 0.2, no ripostes, the counterstroke only deliberate with +2 h planning, road march.
  forwardHeavy: {
    side: 'def', key: 'forwardHeavy', fwdShare: 0.6, fr: 0.2, stance: 'hold', lanes: 'frontal', riposte: false,
    cs: 'deliberate', csExtra: 2, reserveMode: 'road', reverse: false, dummies: 0, holdForMain: false, timedRipostes: false,
    fires: 'spread', cb: false, gas: false, drones: 'spread', fill: false, block: 0, csStance: 'reserve',
  },
  // Standard: elastic depth (Biddle pp. 44-48, 55; Hunzeker pp. 81-82): thin outposts on Delay, strongpoint MGs on
  // the flanks of likely axes with lateral lanes, dispersed companies on Elastic, f_r 0.35-0.45, reverse slope, SOS
  // on the outpost and first battle rows, Riposte stance in the battle zone, counterstroke when CA_mult >= 1.6 or
  // the race clock is lost, covered moves in Modern.
  elasticDepth: {
    side: 'def', key: 'elasticDepth', fwdShare: 0, fr: 0.4, stance: 'elastic', lanes: 'lateral', riposte: true,
    cs: 'window', csExtra: 0, reserveMode: 'era', reverse: true, dummies: 0, holdForMain: false, timedRipostes: false,
    fires: 'focus', cb: true, gas: true, drones: 'focus', fill: true, block: 3, csStance: 'elastic', csPosture: 'bound', movePosture: 'bound',
  },
  // Easy (W3): a forward-heavy layout (65% forward, Hold; lanes left lateral) with the Standard hourly reactions, 2 h late.
  easyDefense: {
    side: 'def', key: 'easyDefense', planAs: { base: 'forwardHeavy', lanes: 'lateral', fwdShare: 0.65 }, fwdShare: 0, fr: 0.4, stance: 'elastic', lanes: 'lateral', riposte: true,
    cs: 'window', csExtra: 0, reserveMode: 'era', reverse: true, dummies: 0, holdForMain: false, timedRipostes: false,
    fires: 'focus', cb: true, gas: true, drones: 'focus', fill: true, block: 3, csStance: 'elastic', csPosture: 'bound', movePosture: 'bound',
  },
  // Hard: Standard plus greedy lane optimization, dummy positions forward, holds the counterstroke until a lodgment
  // is confirmed as the main effort (resists feints, Biddle p. 66), times ripostes to the window.
  elasticDepthPlus: {
    side: 'def', key: 'elasticDepthPlus', fwdShare: 0, fr: 0.4, stance: 'elastic', lanes: 'greedy', riposte: true,
    cs: 'window', csExtra: 0, reserveMode: 'era', reverse: true, dummies: 3, holdForMain: true, timedRipostes: true, ripMargin: 8,
    fires: 'focus', cb: 'first', gas: true, drones: 'focus', fill: true, block: 3, csStance: 'elastic', csPosture: 'bound', movePosture: 'bound',
  },
};

export const PROFILES = { ...ATT, ...DEF };

/** Campaign doctrine keys (js/campaign.js profileFor) and data/params.js AI.profiles names -> profile keys. */
export const ALIASES = {
  elastic: 'elasticDepth', forwardHeavy: 'forwardHeavy', modernAssault: 'modernSystem', massedWaves: 'massedWaves',
  quickRupture: 'quickRupture', modernSystem: 'modernSystem', modernSystemPlus: 'modernSystemPlus',
  elasticDepth: 'elasticDepth', elasticDepthPlus: 'elasticDepthPlus', easyAssault: 'easyAssault', easyDefense: 'easyDefense',
};
const PLUS = { modernSystem: 'modernSystemPlus', elasticDepth: 'elasticDepthPlus' };
const LEVEL = { e: 'e', s: 's', h: 'h', easy: 'e', standard: 's', hard: 'h' };

/**
 * The profile for a side. diff: 'e' | 's' | 'h' (default 's'). doctrine: optional campaign key or profile key;
 * without it the difficulty's default doctrine is used. A profile object passes through (with defaults filled).
 * Returns a fresh object: { ...profile, diff, latency, shiftEvery }.
 */
export function profileFor(diff = 's', side = 'att', doctrine = null) {
  if (doctrine && typeof doctrine === 'object') {
    // { base?: key, ...overrides }: a named profile with some fields changed (scripted proxies, tests).
    if (doctrine.side === side && doctrine.key && doctrine.latency != null && !doctrine.base) return { ...doctrine };
    return { ...profileFor(diff, side, doctrine.base || doctrine.key || null), ...doctrine };
  }
  const d = LEVEL[diff] || 's', P = AI.profiles[d];
  let key = ALIASES[doctrine] || ALIASES[side === 'def' ? P.def : P.att];
  if (doctrine && d === 'h' && PLUS[key]) key = PLUS[key];   // Hard adds its extras to a good campaign doctrine
  const base = PROFILES[key] && PROFILES[key].side === side ? PROFILES[key] : PROFILES[side === 'def' ? 'elasticDepth' : 'modernSystem'];
  return { ...base, diff: d, latency: P.latency, shiftEvery: base.shiftEvery ? (P.shiftEvery || base.shiftEvery) : 0 };
}

/** Resolve whatever a caller passes as `profile` (undefined, a key, a level, or an object) for a side. */
export function resolve(profile, side, diff = 's') {
  if (profile && typeof profile === 'object') return profileFor(profile.diff || diff, side, profile);
  if (typeof profile === 'string' && LEVEL[profile]) return profileFor(profile, side);
  return profileFor(diff, side, profile || null);
}
