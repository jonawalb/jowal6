// Aggregation over the Kiel Ukraine Support Tracker rows in data/aid.js.
// All sums are EUR million (current euros). Nothing here adds data: it only filters and sums Kiel's figures.
import { META, MONTHS, DONORS, ROWS } from '../data/aid.js';

export { META, MONTHS, DONORS };
export const TYPES = [
  { k: 'mil', n: 'Military', col: 'var(--c2)' },
  { k: 'hum', n: 'Humanitarian', col: 'var(--c3)' },
  { k: 'fin', n: 'Financial', col: 'var(--c1)' },
];
export const GROUPS = [
  { k: 'eu', n: 'EU members', d: 'The 27 EU member states, as bilateral donors' },
  { k: 'eur', n: 'Other Europe', d: 'United Kingdom, Norway, Switzerland, Iceland' },
  { k: 'oth', n: 'Rest of world', d: 'United States, Canada, Japan, Australia, South Korea and others' },
  { k: 'inst', n: 'EU institutions', d: 'EU Commission and Council, and the European Investment Bank' },
];
// Periods: calendar years by month index into MONTHS. Index -1 rows (no single month) count only in "all".
const yr = y => [MONTHS.indexOf(`${y}-01`), MONTHS.lastIndexOf(MONTHS.filter(m => m.startsWith(String(y))).pop())];
export const PERIODS = [
  { k: 'all', n: 'All', span: [-1, MONTHS.length - 1] },
  ...[2022, 2023, 2024, 2025, 2026].map(y => ({ k: String(y), n: y === 2026 ? '2026 (Jan–Jun)' : String(y), span: yr(y) })),
];

const inPeriod = (m, P) => P.k === 'all' || (m >= P.span[0] && m <= P.span[1]);
export const periodOf = k => PERIODS.find(p => p.k === k) || PERIODS[0];
const typeIdx = S => S.types.map(k => TYPES.findIndex(t => t.k === k));

/** Donor totals for the current view: [{i, d, a:[mil,hum,fin], c:[...], A, C}] with A/C summed over types in view. */
export function donorTotals(S) {
  const P = periodOf(S.period), ti = typeIdx(S);
  const out = DONORS.map((d, i) => ({ i, d, a: [0, 0, 0], c: [0, 0, 0], A: 0, C: 0 }));
  for (const [di, m, t, a, c] of ROWS) {
    if (!inPeriod(m, P)) continue;
    out[di].a[t] += a; out[di].c[t] += c;
  }
  for (const o of out) {
    o.A = ti.reduce((s, t) => s + o.a[t], 0);
    o.C = ti.reduce((s, t) => s + o.c[t], 0);
  }
  return out.filter(o => S.groups.includes(o.d.g));
}

/** Value used for ranking: EUR bn, or percent of 2021 GDP (null when the donor has no GDP, e.g. EU institutions). */
export function metricValue(o, S, which = S.measure === 'c' ? 'C' : 'A') {
  const v = o[which] / 1000;
  if (S.scale === 'eur') return v;
  if (!o.d.gdp) return null;
  const extra = which === 'C' && eucApplies(S) && o.d.euc ? o.d.euc : 0;
  return ((v + extra) / o.d.gdp) * 100;
}

/** Kiel's imputed EU-level commitment shares are all-period, all-type totals: only add them in that view. */
export const eucApplies = S => S.euc && S.scale === 'gdp' && S.period === 'all' && S.types.length === 3 && S.measure !== 'a';

/** Donors' amounts in one month (types in view), largest first. */
export function monthDonors(S, mi) {
  const ti = typeIdx(S), set = new Set(donorTotals({ ...S, period: 'all' }).map(o => o.i));
  const acc = new Map();
  for (const [di, m, t, a, c] of ROWS) {
    if (m !== mi || !ti.includes(t) || !set.has(di)) continue;
    const o = acc.get(di) || { i: di, d: DONORS[di], A: 0, C: 0 };
    o.A += a; o.C += c; acc.set(di, o);
  }
  return [...acc.values()];
}

/** Ranked list for the bar chart. Sorted by allocations in "both" mode (Kiel's primary metric). */
export function ranking(S) {
  const rows = donorTotals(S).filter(o => o.A > 0.05 || o.C > 0.05);
  const key = S.measure === 'c' ? 'C' : 'A';
  const withV = rows.map(o => ({ ...o, v: metricValue(o, S, key), va: metricValue(o, S, 'A'), vc: metricValue(o, S, 'C') }))
    .filter(o => o.v !== null);
  withV.sort((x, y) => y.v - x.v || y.vc - x.vc);
  return withV;
}

/** Monthly series for the donors in view (or one donor): [{m, a:[..], c:[..]}] plus the undated remainder. */
export function monthly(S, donor = S.donor) {
  const ti = typeIdx(S);
  const set = new Set(donorTotals({ ...S, period: 'all' }).map(o => o.i));
  const bins = MONTHS.map((m, i) => ({ i, m, a: [0, 0, 0], c: [0, 0, 0] }));
  const undated = { a: [0, 0, 0], c: [0, 0, 0] };
  for (const [di, m, t, a, c] of ROWS) {
    if (donor !== null ? di !== donor : !set.has(di)) continue;
    if (!ti.includes(t)) continue;
    const b = m < 0 ? undated : bins[m];
    b.a[t] += a; b.c[t] += c;
  }
  return { bins, undated };
}

/** Cumulative allocations and commitments (types in view) through each month. */
export function cumulative(series) {
  let A = 0, C = 0;
  return series.bins.map(b => {
    A += b.a.reduce((s, x) => s + x, 0); C += b.c.reduce((s, x) => s + x, 0);
    return { i: b.i, m: b.m, A, C };
  });
}

/** Summary numbers for the panel. */
export function summary(S) {
  const rows = donorTotals(S);
  const pick = S.donor !== null ? rows.find(o => o.i === S.donor) || donorTotals({ ...S, groups: GROUPS.map(g => g.k) }).find(o => o.i === S.donor) : null;
  const sum = k => rows.reduce((s, o) => s + o[k], 0);
  const byType = k => [0, 1, 2].map(t => rows.reduce((s, o) => s + o[k][t], 0));
  const all = { A: sum('A'), C: sum('C'), a: byType('a'), c: byType('c'), n: rows.filter(o => o.A > 0.05 || o.C > 0.05).length };
  let rank = null;
  if (pick) {
    const r = ranking(S);
    const idx = r.findIndex(o => o.i === pick.i);
    rank = idx >= 0 ? { pos: idx + 1, of: r.length } : null;
  }
  return { all, pick, rank };
}

export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthLabel = m => `${MON[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`;
/** Format EUR million as a readable amount. */
export function eur(mn) {
  const v = Math.abs(mn);
  if (v >= 1000) return `€${(mn / 1000).toFixed(v >= 10000 ? 1 : 2)} bn`;
  if (v >= 1) return `€${Math.round(mn)} m`;
  if (v > 0) return '< €1 m';
  return '€0';
}
export const pctGdp = p => p === null ? 'n/a' : p >= 0.1 ? `${p.toFixed(2)}%` : p > 0 ? `${p.toFixed(3)}%` : '0%';
export const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const donorBySlug = s => DONORS.findIndex(d => slug(d.n) === s);
