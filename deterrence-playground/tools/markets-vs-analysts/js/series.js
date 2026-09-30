// Data preparation: markets, TSM aircraft series, exercises and JCRP markers on a common day index.
import { MARKETS, BUILT } from '../data/markets.js';
import { EXERCISES } from '../data/exercises.js';
import { TSM } from '../../../shared/data/tsm.js';

export const DAY = 86400000;
export const dayOf = iso => Math.round(Date.parse(iso + 'T00:00:00Z') / DAY);
export const isoOf = d => new Date(d * DAY).toISOString().slice(0, 10);
export const nice = (d, opts = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  new Date(d * DAY).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });

export { MARKETS, BUILT, EXERCISES, TSM };
export const BY_ID = new Map(MARKETS.map(m => [m.id, m]));
export const FAMILIES = [
  { k: 'invade', t: 'Invasion' },
  { k: 'blockade', t: 'Blockade' },
  { k: 'clash', t: 'Military clash' },
];

// Market series as Map(day -> {p, v, n}).
MARKETS.forEach(m => {
  m.byDay = new Map(m.series.map(([d, p, v, n]) => [dayOf(d), { p, v, n }]));
  m.first = dayOf(m.series[0][0]);
  m.last = dayOf(m.series[m.series.length - 1][0]);
  m.days = m.series.length;
  m.medianVol = median(m.series.map(r => r[2]));
});

function median(a) {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

// Aircraft: daily counts and a trailing 7-day mean over reported days (needs at least 4 reports).
export const AIR = new Map();
TSM.daily.forEach(r => { if (r[1] != null) AIR.set(dayOf(r[0]), r[1]); });
export const AIR7 = new Map();
{
  const keys = [...AIR.keys()];
  const lo = Math.min(...keys), hi = Math.max(...keys);
  for (let d = lo; d <= hi; d++) {
    let s = 0, n = 0;
    for (let k = d - 6; k <= d; k++) if (AIR.has(k)) { s += AIR.get(k); n++; }
    if (n >= 4) AIR7.set(d, s / n);
  }
}
export const AIR_FIRST = Math.min(...AIR.keys());
export const AIR_LAST = dayOf(TSM.asOf);
export const JCRP = TSM.daily.filter(r => String(r[5] ?? '').includes('J')).map(r => dayOf(r[0]));
export const EX = EXERCISES.map(e => ({ ...e, a: dayOf(e.start), b: dayOf(e.end) }));

export const DATA_FIRST = Math.min(...MARKETS.map(m => m.first));
export const DATA_LAST = Math.max(...MARKETS.map(m => m.last));

/** Price in percent for a market on a day, or null. */
export const priceAt = (m, d) => (m.byDay.has(d) ? m.byDay.get(d).p * 100 : null);

/** Most recent price on or before day d (within 7 days), for readouts. */
export function priceNear(m, d) {
  for (let k = d; k >= d - 7; k--) if (m.byDay.has(k)) return { d: k, ...m.byDay.get(k) };
  return null;
}
