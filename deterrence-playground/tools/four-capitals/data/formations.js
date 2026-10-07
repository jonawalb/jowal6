// Named formations and the four logistics resources. Names are real public unit types; every strength, location,
// readiness figure and stock is notional game design, not an order of battle. No targeting detail.
import { SEA, AREAS, ISLAND } from './theater.js';

// Types: what a formation is and how it moves. lift = multiplier on the route cost when it moves.
export const TYPES = {
  naval:  { label: 'Naval',      lift: 1, text: 'Ships. Moves between sea areas; counts where it is.' },
  amph:   { label: 'Amphibious', lift: 1.5, text: 'Landing forces. Costs 1½ times the Lift to move; needed for a landing.' },
  air:    { label: 'Air',        lift: 1, text: 'Aircraft. Counts where it is, and once the shooting starts adds half its strength to neighbouring sea areas without moving.' },
  land:   { label: 'Land',       lift: 1, text: 'Ground forces. Cannot cross the Strait (China’s group armies only follow a landing as its second echelon).' },
  strike: { label: 'Strike',     lift: 0, text: 'Long-range fires. Stays home; aim it at one sea area. Counts there only once the shooting starts, and spends munitions when it fires.' },
};

// { id, name, short, type, str, at, focus? }. Starting totals roughly match the v2 force points.
export const FORMATIONS = {
  cn: [
    { id: 'cn_esf', name: 'East Sea Fleet surface group', short: 'East Sea Fleet', type: 'naval', str: 4, at: 'strait' },
    { id: 'cn_amph', name: 'Amphibious combined-arms brigades', short: 'Amphibious brigades', type: 'amph', str: 2, at: 'strait' },
    { id: 'cn_af', name: 'PLAAF Eastern Theater air', short: 'PLAAF East', type: 'air', str: 2, at: 'strait' },
    { id: 'cn_cv', name: 'PLAN carrier group', short: 'Carrier group', type: 'naval', str: 3, at: 'north' },
    { id: 'cn_ssf', name: 'South Sea Fleet surface group', short: 'South Sea Fleet', type: 'naval', str: 3, at: 'south' },
    { id: 'cn_nsf', name: 'North Sea Fleet surface group', short: 'North Sea Fleet', type: 'naval', str: 2, at: 'rear' },
    { id: 'cn_71', name: '71st Group Army', short: '71st GA', type: 'land', str: 1.5, at: 'rear' },
    { id: 'cn_72', name: '72nd Group Army', short: '72nd GA', type: 'land', str: 1.5, at: 'rear' },
    { id: 'cn_73', name: '73rd Group Army', short: '73rd GA', type: 'land', str: 1.5, at: 'rear' },
    { id: 'cn_rf', name: 'PLA Rocket Force', short: 'Rocket Force', type: 'strike', str: 2, at: 'rear', focus: 'strait' },
  ],
  us: [
    { id: 'us_csg1', name: 'Carrier Strike Group (first)', short: 'CSG 1', type: 'naval', str: 3, at: 'east' },
    { id: 'us_csg2', name: 'Carrier Strike Group (second)', short: 'CSG 2', type: 'naval', str: 3, at: 'rear' },
    { id: 'us_arg', name: 'Amphibious Ready Group / Marine Littoral Regiment', short: 'ARG / MLR', type: 'amph', str: 1, at: 'north' },
    { id: 'us_ssn', name: 'Submarine force', short: 'Submarines', type: 'naval', str: 1, at: 'south' },
    { id: 'us_5af', name: '5th Air Force (Kadena)', short: '5th AF', type: 'air', str: 2, at: 'rear' },
    { id: 'us_bmb', name: 'Bomber wing', short: 'Bombers', type: 'strike', str: 2, at: 'rear', focus: 'strait' },
  ],
  jp: [
    { id: 'jp_esc', name: 'JMSDF escort flotilla', short: 'Escort flotilla', type: 'naval', str: 3, at: 'north' },
    { id: 'jp_air', name: 'JASDF Southwestern air', short: 'JASDF SW', type: 'air', str: 1, at: 'north' },
    { id: 'jp_ardb', name: 'Amphibious Rapid Deployment Brigade', short: 'ARDB', type: 'amph', str: 2, at: 'rear' },
  ],
  tw: [
    { id: 'tw_6', name: '6th Army Corps', short: '6th Corps', type: 'land', str: 1.5, at: 'nw' },
    { id: 'tw_10', name: '10th Army Corps', short: '10th Corps', type: 'land', str: 1.5, at: 'cw' },
    { id: 'tw_8', name: '8th Army Corps', short: '8th Corps', type: 'land', str: 1.5, at: 'sw' },
    { id: 'tw_mc', name: 'ROC Marine Corps', short: 'Marines', type: 'land', str: 1, at: 'res' },
    { id: 'tw_af', name: 'ROC Air Force', short: 'ROCAF', type: 'air', str: 1.5, at: 'res' },
    { id: 'tw_navy', name: 'ROC Navy fleet', short: 'ROC Navy', type: 'naval', str: 1, at: 'strait' },
  ],
};
export const FBY = Object.fromEntries(Object.entries(FORMATIONS).flatMap(([w, l]) => l.map(f => [f.id, { ...f, who: w }])));

/** Where a formation may be: Taiwan's ground and air forces stay on the island, its navy at sea; other ground
 * forces and strike forces stay in the Rear; ships, amphibious forces and aircraft use the sea areas and the Rear. */
export function placesFor(id) {
  const f = FBY[id];
  if (f.who === 'tw') return f.type === 'naval' ? SEA : ISLAND;
  if (f.type === 'land' || f.type === 'strike') return ['rear'];
  return AREAS;
}

// The four resources. Lift is a monthly flow (unspent Lift is lost); fuel and munitions are stocks that
// regenerate by `regen` a month up to `cap`; readiness (0–100) belongs to each formation.
export const RES = ['lift', 'fuel', 'mun', 'ready'];
export const RES_LABEL = { lift: 'Lift', fuel: 'Fuel', mun: 'Munitions', ready: 'Readiness' };
export const RES_SHORT = { lift: 'Lift', fuel: 'Fuel', mun: 'Mun', ready: 'Ready' };
export const RES_TEXT = {
  lift: 'Sealift and airlift for moving formations. Refills every month; what you do not use is lost.',
  fuel: 'Burned by every formation move and every month a formation sits at sea in Contest (½) or Attack (1); Taiwan’s island forces burn ¼ each from Blockade up. A stock that refills slowly, and a blockade cuts Taiwan’s refill.',
  mun: 'Spent by strikes, blockade enforcement and combat. A stockpile, slow to rebuild: China’s is largest, Taiwan’s and Japan’s smallest.',
  ready: 'Each formation’s readiness drains while it stays forward, faster in Attack and in combat, and recovers in the Rear. Low readiness cuts its strength.',
};
export const SUPPLY = {
  cn: { lift: 3, fuel: { start: 8, regen: 3.5, cap: 10 }, mun: { start: 14, regen: 1, cap: 18 } },
  us: { lift: 2, fuel: { start: 7, regen: 2.5, cap: 9 }, mun: { start: 6, regen: 0.75, cap: 8 } },
  jp: { lift: 3, fuel: { start: 3, regen: 1, cap: 4 }, mun: { start: 4, regen: 0.5, cap: 5 } },
  tw: { lift: 2, fuel: { start: 4, regen: 1.5, cap: 5 }, mun: { start: 4, regen: 0.5, cap: 6 } },
};
export const UPKEEP = {
  move: 1,                                        // fuel per formation move
  fuel: { defend: 0, contest: 0.5, attack: 1 },   // per formation at sea, per month
  island: 0.25,                                   // per Taiwan island formation a month from Blockade up (forces on alert)
  mun: { defend: 0.5, contest: 0.5, attack: 1, strike: 1, support: 0.5, coast: 0.25 }, // per formation per month in combat
};
export const READY = {
  defend: -3, contest: -6, attack: -10,   // per month at sea, by the area's stance
  engaged: -6,                            // extra in a month of fighting
  rear: 20,                               // recovery in the Rear
  island: 5, alert: -2, dry: -8,          // Taiwan's island forces: recover at Coercion or below, wear from Blockade up, more without fuel
  strike: -8, idle: 10,                   // strike forces firing at war, or resting
  floor: 20, min: 40,                     // readiness never drops below floor; moves costing readiness need min left
};
/** Combat strength multiplier from readiness: 1 at 100, 0.5 at 0. */
export const readyFactor = r => 0.5 + 0.5 * r / 100;
