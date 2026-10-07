// Data preparation and aggregation for Ukraine's Air War.
import { META, GROUPS, MODELS, MODEL_GROUP, REPORTS, ROWS } from '../data/attacks.js';

export { META, GROUPS };
export const HIDE_FROM = '2026-08-10';   // Air Force stopped publishing some missile counts (dataset note)
// Missile groups whose counts are withheld from HIDE_FROM; their monthly rates are blanked from that month on.
export const WITHHELD_GROUPS = ['cruise', 'ballistic'];
const WITHHELD_MONTH = HIDE_FROM.slice(0, 7);

/** Display name for a dataset model string: Latin transliterations (Kh-101, S-300, Molniya) for Cyrillic-style names. */
const CYR = { 'Молнія': 'Molniya', 'Фенікс': 'Feniks', 'Картограф': 'Kartograf', 'Привет-82': 'Privet-82', 'X-35Y': 'Kh-35U' };
export const modelName = m => m.split(' and ').map(p => CYR[p] || p.replace(/(^|\/)X-(?=\d)/g, '$1Kh-').replace(/(^|\/)C-(?=[34]00)/g, '$1S-')).join(' and ');

/** One object per dataset row. */
export const RECS = ROWS.map(([d, h, m, l, x, nr, hid, rep, tm]) => ({
  d, h, tm, model: MODELS[m], g: GROUPS[MODEL_GROUP[m]], l: hid ? null : l, x: hid ? null : x,
  nr: hid ? null : nr, hid: !!hid, rep,
}));

export function reportUrl(i) {
  const s = REPORTS[i] || '';
  if (!s) return '';
  if (/^https?:/.test(s)) return s;
  if (/^[a-z0-9-]+\.[a-z.]+\//i.test(s)) return 'https://' + s;
  return 'https://www.facebook.com/' + s;
}

// ---- Periods ------------------------------------------------------------------------------
const ms = d => Date.parse(d + 'T00:00:00Z');
const iso = t => new Date(t).toISOString().slice(0, 10);
export const weekday = d => (new Date(ms(d)).getUTCDay() + 6) % 7;     // 0 = Monday
export function periodKey(d, res) {
  if (res === 'day') return d;
  if (res === 'month') return d.slice(0, 7);
  return iso(ms(d) - weekday(d) * 864e5);                             // Monday of the week
}
export function periodEnd(k, res) {
  if (res === 'day') return k;
  if (res === 'week') return iso(ms(k) + 6 * 864e5);
  const [y, m] = k.split('-').map(Number);
  return iso(Date.UTC(y, m, 0));
}
export function periodStart(k, res) { return res === 'month' ? k + '-01' : k; }
/** Every period key between two dates, inclusive, so empty periods show as gaps. */
export function periodKeys(from, to, res) {
  const out = [];
  let k = periodKey(from, res);
  while (periodStart(k, res) <= to) {
    out.push(k);
    const next = iso(ms(periodEnd(k, res)) + 864e5);
    k = periodKey(next, res);
  }
  return out;
}
export function periodLabel(k, res) {
  const f = d => new Date(ms(d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  if (res === 'day') return new Date(ms(k)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  if (res === 'month') return new Date(ms(k + '-01')).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return `Week of ${f(k)}`;
}

// ---- Ranges ---------------------------------------------------------------------------------
export const RANGES = [
  { k: 'all', n: 'Whole war', from: META.first, to: META.last, res: 'week' },
  { k: 'y22', n: '2022–23', from: META.first, to: '2023-12-31', res: 'week' },
  { k: 'y24', n: '2024', from: '2024-01-01', to: '2024-12-31', res: 'week' },
  { k: 'y25', n: '2025', from: '2025-01-01', to: '2025-12-31', res: 'week' },
  { k: 'y26', n: '2026', from: '2026-01-01', to: META.last, res: 'week' },
  { k: 'last90', n: 'Last 90 days', from: iso(ms(META.last) - 89 * 864e5), to: META.last, res: 'day' },
];

// ---- Aggregation ----------------------------------------------------------------------------
export const inRange = (r, S) => r.d >= S.from && r.d <= S.to && S.groups.includes(r.g);
const zero = () => Object.fromEntries(GROUPS.map(g => [g, 0]));

/** Per-period totals by group for a metric: 'l' launched, 'x' destroyed, 'thru' not reported stopped. */
export function series(S) {
  const keys = periodKeys(S.from, S.to, S.res);
  const idx = new Map(keys.map((k, i) => [k, i]));
  const bins = keys.map(k => ({ k, v: zero(), l: 0, x: 0, n: 0, hid: 0 }));
  for (const r of RECS) {
    if (!inRange(r, S)) continue;
    const b = bins[idx.get(periodKey(r.d, S.res))];
    if (!b) continue;
    if (r.hid) { b.hid++; continue; }
    const v = S.metric === 'x' ? (r.x || 0) : S.metric === 'thru' ? passed(r, S.lost) : (r.l || 0);
    b.v[r.g] += v; b.l += r.l || 0; b.x += r.x || 0; b.n++;
  }
  bins.forEach(b => { b.tot = GROUPS.reduce((s, g) => s + b.v[g], 0); });
  return bins;
}

/** Launched minus reported stopped (destroyed, plus "lost" when that switch is on); never below 0. */
export function passed(r, lost) {
  if (r.l == null || r.x == null) return 0;
  return Math.max(0, r.l - r.x - (lost ? (r.nr || 0) : 0));
}

/** Monthly interception rate for one group: rows with both numbers published. */
export function rateSeries(S, g, minN = 5) {
  const keys = periodKeys(S.from, S.to, 'month');
  const m = new Map(keys.map(k => [k, { k, l: 0, s: 0 }]));
  for (const r of RECS) {
    if (r.g !== g || r.d < S.from || r.d > S.to || r.hid || r.l == null || r.x == null || !r.l) continue;
    const b = m.get(r.d.slice(0, 7));
    if (!b) continue;
    b.l += r.l; b.s += Math.min(r.l, r.x + (S.lost ? (r.nr || 0) : 0));
  }
  const cut = WITHHELD_GROUPS.includes(g);
  return keys.map(k => { const b = m.get(k); return { k, l: b.l, rate: b.l >= minN && !(cut && k >= WITHHELD_MONTH) ? b.s / b.l : null }; });
}

/** Attack reports (one Air Force post) ranked by total launched. */
export function salvos(S, n = 12) {
  const by = new Map();
  for (const r of RECS) {
    if (!inRange(r, S) || r.hid || r.l == null) continue;
    let a = by.get(r.rep);
    if (!a) by.set(r.rep, a = { rep: r.rep, d: r.d, tm: r.tm, v: zero(), l: 0, x: 0, nr: 0, models: [] });
    if (r.d < a.d) { a.d = r.d; a.tm = r.tm; }
    a.v[r.g] += r.l; a.l += r.l; a.x += r.x || 0; a.nr += r.nr || 0;
    a.models.push([r.model, r.l, r.x]);
  }
  return [...by.values()].sort((a, b) => b.l - a.l || (a.d < b.d ? 1 : -1)).slice(0, n);
}

/** Weekday x start-hour grid of launched weapons (rows that give a start time). */
export function clockGrid(S) {
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const wd = new Array(7).fill(0);
  let timed = 0, untimed = 0;
  for (const r of RECS) {
    if (!inRange(r, S) || r.hid || !r.l) continue;
    wd[weekday(r.d)] += r.l;
    if (r.h >= 0) { grid[weekday(r.d)][r.h] += r.l; timed += r.l; } else untimed += r.l;
  }
  return { grid, wd, timed, untimed };
}

/** Totals for the current filters. */
export function totals(S) {
  const t = { l: 0, x: 0, nr: 0, lr: 0, hid: 0, by: zero(), days: new Map() };
  for (const r of RECS) {
    if (!inRange(r, S)) continue;
    if (r.hid) { t.hid++; continue; }
    t.l += r.l || 0; t.by[r.g] += r.l || 0;
    if (r.l != null && r.x != null) { t.lr += r.l; t.x += r.x; t.nr += r.nr || 0; }
    t.days.set(r.d, (t.days.get(r.d) || 0) + (r.l || 0));
  }
  let top = null;
  for (const [d, v] of t.days) if (!top || v > top[1]) top = [d, v];
  t.top = top;
  return t;
}

/** Rows inside one period, for the detail panel. */
export function periodRows(S, k) {
  const a = periodStart(k, S.res), b = periodEnd(k, S.res);
  return RECS.filter(r => r.d >= a && r.d <= b && S.groups.includes(r.g));
}
