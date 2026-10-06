// Defense in Depth: the Practice field (an explainer before the first game). A 3-row by 4-column board with no
// enemy, no combat and no losing, where a new player practises moving troops with the real game's map, popover
// and orders. Two MG companies, two rifle companies and one of every other unit type of the chosen era.
// Everything here is NOTIONAL and fictional. Data only: imports data/ files, never js/.
import { TYPE_KEYS } from './units.js';
import { ERAS } from './eras.js';

/** The practice scale (registered as SCALES.p by js/practice.js; never offered on the start screen or in links). */
export const PRACTICE_SCALE = {
  id: 'p', label: 'Practice field', note: '', cols: 4, rows: 3, turns: 99,
  obj: { row: -1, name: 'no objective', need: 1 },
  // No zones on the practice field: every band sits off the board, so every box reads as one open area.
  bands: { assembly: [-9, -9], nml: [-9, -9], outpost: [-9, -9], battle: [-9, -9], switch: null, second: null, rear: [0, 2] },
  freeTrench: [], commEvery: 99, commRows: [0, -1],
  wp: 0, csPlan: 2,
  ammo: { w: { att: 999, def: 999 }, m: { att: 999, def: 999 } },
  units: {}, divs: 1, colGroups: 1,
};

/** Terrain of the practice boxes by [row, col] (defender's view; the attacker's board is the same ground). */
export const PRACTICE_GROUND = {
  woods: { at: [1, 2], name: 'Callow Wood' },
  village: { at: [0, 3], name: 'Wendrel' },
};

/** Unit types that exist in an era (the real orders of battle use these; Modern heavy batteries are rockets). */
export function eraTypes(era) {
  const E = ERAS[era];
  return TYPE_KEYS.filter(t => (t === 'drone' ? E.drones : t === 'ew' ? E.ew : t === 'rocket' ? E.precision : t === 'heavy' ? !E.precision : true));
}

// Fictional practice names. {n} is the era's word for the type (data/eras.js names).
const NAME = {
  rifle: ['A Coy', 'B Coy'], mg: ['1st MG Coy', '2nd MG Coy'], storm: ['Storm Coy'], mortar: ['Mortar Coy'], pioneer: ['Pioneer Coy'],
  tank: ['Tank Section'], field: ['1st Field Bty'], heavy: ['Heavy Bty'], rocket: ['Rocket Bty'], drone: ['Drone Team'], ew: ['EW Team'],
};
const NAME_M = { rifle: ['A Coy', 'B Coy'], mg: ['1st Weapons Coy', '2nd Weapons Coy'], storm: ['Raid Coy'], pioneer: ['Engineer Coy'], tank: ['Tank Coy'], field: ['1st Tube Bty'] };

// Where each unit starts, [row, col] in the defender's view (row 0 faces the enemy). The attacker's start is the
// mirror image (row 2 - r), so on both sides the units start on the edge nearest the player.
const START = {
  rifle: [[2, 0], [2, 1]], mg: [[2, 0], [2, 1]], storm: [[2, 2]], mortar: [[2, 2]], pioneer: [[2, 3]], tank: [[2, 3]],
  field: [[2, 2]], heavy: [[2, 3]], rocket: [[2, 3]], drone: [[2, 1]], ew: [[2, 0]],
};

/** The rifle and MG companies form one battalion (the formation drill); everything else is the support group. */
export const PRACTICE_FMNS = { bn: '1st Battalion', support: 'Support Group', top: 'Practice Detachment' };

/**
 * The practice roster for an era: [{ type, name, typeName, at: [row, col], fmn: 'bn' | 'support' }], two MG and two
 * rifle companies and exactly one of every other type of the era.
 */
export function practiceRoster(era) {
  const E = ERAS[era], out = [];
  for (const type of eraTypes(era)) {
    const n = type === 'mg' || type === 'rifle' ? 2 : 1;
    const names = (era === 'm' && NAME_M[type]) || NAME[type];
    for (let i = 0; i < n; i++) {
      const typeName = E.names[type] || (type === 'rocket' ? ERAS.m.names.heavy : type);
      out.push({ type, name: names[i], typeName, at: START[type][i], fmn: type === 'mg' || type === 'rifle' ? 'bn' : 'support' });
    }
  }
  return out;
}
