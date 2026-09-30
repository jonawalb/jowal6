// The action menu. Categories follow SWF (2026) and CSIS (2025): electronic warfare, directed energy and
// cyber are reversible here; direct-ascent and co-orbital attacks are destructive and permanent.
import { MISSION_KEYS } from '../data/params.js';

export const ACTS = {
  jam:      { t: 'Jam', kind: 'rev', on: 'enemy', ms: ['com', 'nav', 'ew'], d: 'Blocks their signals this month. Reversible.' },
  dazzle:   { t: 'Dazzle', kind: 'rev', on: 'enemy', ms: ['isr'], d: 'Blinds their imaging satellites this month with a laser. Reversible, rarely damages.' },
  cyber:    { t: 'Cyber', kind: 'rev', on: 'enemy', ms: ['isr', 'com', 'nav', 'ew'], d: 'Hits their ground network. Half the time it works, for two months.' },
  asat:     { t: 'Missile (ASAT)', kind: 'kin', on: 'enemy', ms: ['isr', 'com'], stock: 'asat', d: 'Direct-ascent missile. Destroys one satellite in low orbit and makes a debris cloud.' },
  coorb:    { t: 'Co-orbital', kind: 'kin', on: 'enemy', ms: ['isr', 'com', 'nav', 'ew'], stock: 'coorb', d: 'A killer satellite. Disables one satellite in any orbit, with little debris.' },
  maneuver: { t: 'Maneuver', kind: 'def', on: 'own', ms: MISSION_KEYS, stock: 'maneuver', d: 'Your satellites in that orbit dodge this month: half the hit chance and half the debris risk.' },
  harden:   { t: 'Backups', kind: 'def', on: 'own', ms: MISSION_KEYS, d: 'Ground and airborne backups for one mission. Halves jamming, dazzling and cyber for the rest of the game.' },
  reconst:  { t: 'Relaunch', kind: 'def', on: 'own', ms: MISSION_KEYS, stock: 'reconst', d: 'Launch three replacement satellites. They arrive next month.' },
  prolif:   { t: 'Proliferate', kind: 'def', on: 'own', ms: ['com'], stock: 'prolif', d: 'Add 12 small communications satellites next month. More targets for them, more exposure to debris.' },
  hold:     { t: 'Hold', kind: 'none', on: 'none', ms: [null], d: 'Do nothing with this action.' },
};
export const ACT_KEYS = ['jam', 'dazzle', 'cyber', 'asat', 'coorb', 'maneuver', 'harden', 'reconst', 'prolif', 'hold'];
export const isOffense = a => ACTS[a] && ACTS[a].on === 'enemy';
export const isKinetic = a => ACTS[a] && ACTS[a].kind === 'kin';

/** Can side X take action x now? Counts a second use of the same stock within the month. */
export function valid(g, X, x, taken = []) {
  const A = ACTS[x.a];
  if (!A) return false;
  if (x.a === 'hold') return true;
  if (!A.ms.includes(x.m)) return false;
  const sd = g.sides[X], tg = g.sides[X === 'B' ? 'R' : 'B'];
  if (A.stock) { const used = taken.filter(y => y.a === x.a).length; if (sd.stock[A.stock] - used <= 0) return false; }
  if (x.a === 'harden' && (sd.hard[x.m] || taken.some(y => y.a === 'harden' && y.m === x.m))) return false;
  if (A.on === 'enemy' && tg.alive[x.m] <= 0) return false;
  return true;
}
