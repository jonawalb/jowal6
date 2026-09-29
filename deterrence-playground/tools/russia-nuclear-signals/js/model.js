// Filtering and helpers for Russia's Nuclear Signals.
import { EVENTS } from '../data/events.js';
import { TYPES, LEVELS, OTHER } from '../data/coding.js';

export { EVENTS, TYPES, LEVELS, OTHER };
export const TYPE_KEYS = TYPES.map(t => t.k);
export const byId = new Map(EVENTS.map(e => [e.id, e]));

export const RANGES = [
  { k: 'all', n: 'Feb 2022 to now', from: '2022-01-15', to: '2026-10-15' },
  { k: 'y22', n: '2022', from: '2022-01-15', to: '2022-12-31' },
  { k: 'y23', n: '2023', from: '2023-01-01', to: '2023-12-31' },
  { k: 'y24', n: '2024', from: '2024-01-01', to: '2024-12-31' },
  { k: 'y25', n: '2025–26', from: '2025-01-01', to: '2026-10-15' },
];

/** Midpoint date for month-precision items so they sit mid-month on the axis. */
export const when = e => (e.date.length === 7 ? e.date + '-15' : e.date);
export const t = d => Date.parse(d + 'T00:00:00Z');

export function colorOf(e) {
  if (e.group === 'russia') return TYPES.find(x => x.k === e.type)?.col || 'var(--ink)';
  return OTHER[e.group === 'west' ? 'response' : 'battle'].col;
}
const WEST_SUB = { statement: 'statement', exercise: 'exercise', treaty: 'treaty step', deployment: 'deployment' };
export const typeName = e => (e.group === 'russia' ? TYPES.find(x => x.k === e.type)?.n
  : e.group === 'west' ? 'Western response' + (WEST_SUB[e.type] ? ` (${WEST_SUB[e.type]})` : '') : OTHER.battle.n);

export function fdate(e) {
  const d = new Date(t(when(e)));
  const o = e.date.length === 7 ? { month: 'long', year: 'numeric', timeZone: 'UTC' } : { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' };
  return d.toLocaleDateString('en-GB', o);
}

/** Does an item pass the current filters? */
export function visible(e, S) {
  const d = when(e);
  if (d < S.from || d > S.to) return false;
  if (e.group === 'russia' && (!S.types.includes(e.type) || e.level < S.min)) return false;
  if (e.group === 'west' && !S.west) return false;
  if (e.group === 'battle' && !S.battle) return false;
  if (S.q) {
    const hay = `${e.title} ${e.summary} ${e.actor} ${e.quote || ''}`.toLowerCase();
    if (!S.q.toLowerCase().split(/\s+/).filter(Boolean).every(w => hay.includes(w))) return false;
  }
  return true;
}

export const filtered = S => EVENTS.filter(e => visible(e, S));

/** Count of Russian items per level and type, for the summary. */
export function tally(list) {
  const lv = Object.fromEntries(LEVELS.map(l => [l.v, 0]));
  const ty = Object.fromEntries(TYPE_KEYS.map(k => [k, 0]));
  list.filter(e => e.group === 'russia').forEach(e => { lv[e.level]++; ty[e.type]++; });
  return { lv, ty };
}
