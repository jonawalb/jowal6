// Lookups and scores computed in the browser from data/markets.js.
import { BUILT, DATA_LAST, CASES, MARKETS, EVENTS } from '../data/markets.js';
import { dayOf, isoOf } from './util.js';

export { BUILT, DATA_LAST, CASES, MARKETS, EVENTS };
export const CASE_BY = new Map(CASES.map(c => [c.k, c]));
const PRICE = new Map(Object.values(MARKETS).map(m => [m.id, new Map(m.series.map(r => [dayOf(r[0]), r[1]]))]));

/** Daily YES price (cents) for a market on a day number, or null. */
export const priceOn = (id, d) => PRICE.get(id).get(d) ?? null;

/** Last price on or before day d, with the day it came from. */
export function priceAsOf(id, d) {
  const s = MARKETS[id].series;
  let hit = null;
  for (const r of s) { if (dayOf(r[0]) <= d) hit = r; else break; }
  return hit ? { p: hit[1], day: hit[0] } : null;
}

/** When the outcome was decided: the day prices settled at Yes, or the deadline for a No. */
export function decisionDay(m) {
  const k = m.known ? dayOf(m.known) : null, dl = m.deadline ? dayOf(m.deadline) : null;
  if (m.res === 'yes') return k ?? dl;
  if (m.res === 'no') return dl ?? k;
  return null;
}

/**
 * What the market priced a week before the outcome was settled, and how far off it was.
 * Returns null for open or unclear contracts. `early` is true when the archive starts after that day.
 */
export function weekBefore(m) {
  const d = decisionDay(m);
  if (d == null) return null;
  const target = d - 7;
  let hit = priceAsOf(m.id, target), early = false;
  if (!hit && m.series.length) { hit = { p: m.series[0][1], day: m.series[0][0] }; early = true; }
  if (!hit) return null;
  const y = m.res === 'yes' ? 1 : 0;
  return { p: hit.p, day: hit.day, target: isoOf(target), early, err: (hit.p / 100 - y) ** 2 };
}

/** Mean daily Brier score over the contract's life, up to the settle day. */
export function brier(m) {
  const d = decisionDay(m);
  if (d == null) return null;
  const y = m.res === 'yes' ? 1 : 0;
  const rows = m.series.filter(r => dayOf(r[0]) < d);
  if (!rows.length) return null;
  return rows.reduce((s, r) => s + (r[1] / 100 - y) ** 2, 0) / rows.length;
}

/** Case window as day numbers. */
export function caseWindow(c) {
  const a = dayOf(c.win[0]);
  const last = Math.max(...c.ids.map(id => { const s = MARKETS[id].series; return s.length ? dayOf(s[s.length - 1][0]) : a; }));
  const deadlines = c.ids.map(id => MARKETS[id].deadline).filter(Boolean).map(dayOf);
  const b = c.win[1] ? dayOf(c.win[1]) : Math.min(dayOf(DATA_LAST), Math.max(last, ...deadlines.filter(x => x <= dayOf(DATA_LAST))));
  return [a, Math.max(b, a + 14)];
}

/** Events from the case's theater inside a window. */
export const caseEvents = (c, w) => (EVENTS[c.theater] || []).filter(e => { const d = dayOf(e.date); return d >= w[0] && d <= w[1]; });

export const RES_LABEL = { yes: 'Resolved Yes', no: 'Resolved No', open: 'Still open', unclear: 'Outcome unclear' };
