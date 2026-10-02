// Unit filters for the command aids (SPEC §8.4) and the small per-unit facts the list, the map and the panels
// share: letters, posture marks, idle and late flags. Reads only your own units and your own orders.
import { TYPES } from '../../data/units.js';
import { fighting, alive, isBattery, isCompany } from '../forces.js';
import { inContact } from '../move.js';
import { underGuns } from '../arty.js';

/** The first two show as chips; the rest sit under the Filter menu (Detailed view only). */
export const FILTERS = [
  { id: 'idle', label: 'Needs orders' },
  { id: 'all', label: 'All' },
  { id: 'contact', label: 'In contact' },
  { id: 'stalled', label: 'Stalled / pinned' },
  { id: 'weak', label: 'Below 60%' },
  { id: 'guns', label: 'Outside artillery cover' },
  { id: 'pairs', label: 'Leapfrog pairs' },
];

/** The order still in transit for a unit (sent, not yet started). */
export const pendingOrder = (g, u) => g.orders.find(o => o.unit === u.id && !o.done && !o.cancelled);
/** Its order starts next hour or later (a clock on the chip). */
export const isLate = (g, u) => { const o = pendingOrder(g, u); return !!o && o.due > g.t; };

/** A unit waiting for orders: an attacking company stopped short of its goal, or a defender held in reserve. */
export function isIdle(g, u) {
  if (!fighting(u) || g.phase !== 'battle' || g.over || pendingOrder(g, u) || u.path.length) return false;
  if (u.type === 'mg' && u.lane == null && u.laneWant == null && u.laneLost) return true;   // moved off its lane: lay it again
  if (u.side === 'att') return !['hold', 'consolidate'].includes(u.posture) && (u.dest == null || u.dest === u.sec || u.stalled || u.pinned > g.t);
  return u.stance === 'reserve' && !u.cs;
}

export function matches(g, u, f) {
  if (!alive(u)) return f === 'all';
  switch (f) {
    case 'idle': return isIdle(g, u);
    case 'contact': return isCompany(u) && u.sec >= 0 && inContact(g, u);
    case 'stalled': return !!(u.stalled || u.wasStalled || u.pinned > g.t);
    case 'weak': return isCompany(u) && u.str0 > 0 && u.str / u.str0 < 0.6;
    case 'guns': return isCompany(u) && u.sec >= 0 && !underGuns(g, u.side, u.sec);
    case 'pairs': return u.pair != null;
    default: return true;
  }
}

export const letterOf = u => TYPES[u.type].letter;

/** Posture mark on a chip: ① overwatch / ② bounding (leapfrog), ⇢ infiltrate, ⚑ hold, ↺ riposte. */
export function markOf(u) {
  if (u.pair != null) return u.lfOw ? '①' : '②';
  if (u.posture === 'infil') return '⇢';
  if (u.side === 'def' && u.stance === 'riposte') return '↺';
  if (u.side === 'def' && u.stance === 'hold' && !isBattery(u)) return '⚑';
  if (u.posture === 'consolidate') return '▣';
  return '';
}

/** Words for a unit's posture / stance (lists and panels). */
export const POSTURE_WORD = { rush: 'Rush', bound: 'Leapfrog', infil: 'Infiltrate', hold: 'Hold', consolidate: 'Consolidate', withdraw: 'Withdraw' };
export const STANCE_WORD = { hold: 'Hold', elastic: 'Give ground', delay: 'Delay', riposte: 'Local counterattack', reserve: 'Reserve' };
