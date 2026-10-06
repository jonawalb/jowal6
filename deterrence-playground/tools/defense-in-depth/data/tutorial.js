// Defense in Depth: the "Learn to play" battle (2026-10-04). A small real battle for a first-time player: a
// 4-column by 7-row front, a handful of companies a side and a few hours, played by the real engine against a
// scripted attacker (js/tutorial.js). Everything here is NOTIONAL and fictional, chosen so that the lessons
// happen in a few hours: the enemy shells a crowded front box, breaks in at one outpost, and the player can
// throw him out while his window is open. Data only: imports nothing.

/** The tutorial scale (registered as SCALES.t by js/tutorial.js; never offered on the start screen or in links). */
export const TUTORIAL_SCALE = {
  id: 't', label: 'Learn to play', note: '', cols: 4, rows: 7, turns: 5,
  obj: { row: 5, name: 'the Brannoch Line', need: 2 },
  bands: { assembly: [0, 0], nml: [1, 1], outpost: [2, 2], battle: [3, 4], switch: null, second: null, rear: [5, 6] },
  freeTrench: [2, 3, 5], commEvery: 2, commRows: [2, 5],
  wp: 0, csPlan: 1,
  ammo: { w: { att: 80, def: 40 }, m: { att: 80, def: 40 } },
  units: { w: { def: 7, att: 9 } }, divs: 1, colGroups: 2,
};

/** Seed of the tutorial map and dice: the same battle every time (the steps were checked against it). */
export const TUTORIAL_SEED = 4242;

// The player's (defender's) companies, [row, col] on the board (row 0 is the enemy's side). Four companies start
// crowded into one front box on purpose: the lesson is to thin it out.
export const TUTORIAL_DEF = [
  { type: 'rifle', name: 'A Coy', at: [2, 1] }, { type: 'rifle', name: 'B Coy', at: [2, 1] },
  { type: 'rifle', name: 'C Coy', at: [2, 1] }, { type: 'rifle', name: 'D Coy', at: [2, 1] },
  { type: 'rifle', name: 'E Coy', at: [2, 2], stance: 'delay' },
  { type: 'rifle', name: 'F Coy', at: [3, 2] },
  { type: 'mg', name: '1st MG Coy', at: [3, 0] },
];

// The scripted attacker: rifle companies in no-man's land and the assembly area, aimed at column 2, two field
// batteries off the map (one fires the creeping barrage, one shells the crowded box).
export const TUTORIAL_ATT = [
  { type: 'rifle', name: '1st Coy', at: [1, 2] }, { type: 'rifle', name: '2nd Coy', at: [1, 2] },
  { type: 'rifle', name: '3rd Coy', at: [1, 2] }, { type: 'rifle', name: '4th Coy', at: [0, 2] },
  { type: 'rifle', name: '5th Coy', at: [0, 2] },
  { type: 'field', name: '1st Field Bty', at: null }, { type: 'field', name: '2nd Field Bty', at: null },
];

/**
 * The attacking companies start the battle tired (cohesion 0.45 of 1: they have marched up and fought through
 * the night). Only this scenario: it is what lets the counterattack window open (green) inside a five-hour
 * lesson, as it does after a deep advance in the real battles. NOTIONAL.
 */
export const TUTORIAL_ATT_COHESION = 0.45;

/** The column the attack comes down, and the box the second battery shells every hour (the crowded one). */
export const TUTORIAL_AXIS = { col: 2, shell: [2, 1] };

export const TUTORIAL_FMNS = { def: 'Your Battalion', att: 'Orvane Assault Battalion' };
