// Derived series for the Australia view, computed from data/trade.js in the browser.
import { TRADE } from '../data/trade.js';
import { TOURISM } from '../data/tourism.js';

export { TRADE, TOURISM };
export const PRODUCT_KEYS = ['barley', 'wine', 'coal', 'beef', 'lobster', 'timber', 'cotton', 'ironore'];
// Baseline: the average of the two full years before the measures, 2018 and 2019.
export const BASE_YEARS = ['2018', '2019'];
export const BASE_YEAR = '2018–19';
export const FIRST_M = TRADE.months[0];
export const LAST_M = TRADE.months[1];
// Years with a full twelve months of monthly data after the baseline.
export const YEARS = [...new Set(TRADE.monthly.barley.map(r => r[0].slice(0, 4)))]
  .filter(y => y > '2019' && TRADE.monthly.barley.filter(r => r[0].startsWith(y) && r[1] != null).length === 12);

/** Monthly rows for a product in the chosen unit: [ym, world, china, rest] (null where unreported). */
export function monthly(p, unit) {
  return TRADE.monthly[p].map(([ym, uw, uc, tw, tc]) => {
    const w = unit === 't' ? tw : uw, c = unit === 't' ? tc : uc;
    return [ym, w, c, w == null || c == null ? null : Math.max(0, w - c)];
  });
}

/** Calendar-year totals {world, china, rest, months}; the baseline label averages BASE_YEARS. */
export function yearTotal(p, unit, year) {
  if (year === BASE_YEAR) {
    const ts = BASE_YEARS.map(y => yearTotal(p, unit, y));
    const avg = k => ts.reduce((s, t) => s + t[k], 0) / ts.length;
    return { world: avg('world'), china: avg('china'), rest: avg('rest'), months: Math.min(...ts.map(t => t.months)) };
  }
  const rows = monthly(p, unit).filter(r => r[0].startsWith(year));
  const ok = rows.filter(r => r[1] != null);
  const sum = i => ok.reduce((s, r) => s + (r[i] || 0), 0);
  return { world: sum(1), china: sum(2), rest: sum(3), months: ok.length };
}

/**
 * How much of the lost China trade the rest of the world replaced, baseline year vs `year`.
 * Returns shares, changes and a verdict key, or null when China trade did not fall.
 */
export function redirection(p, unit, year) {
  const b = yearTotal(p, unit, BASE_YEAR), y = yearTotal(p, unit, year);
  const chinaLoss = b.china - y.china, restGain = y.rest - b.rest;
  const shareB = b.world ? b.china / b.world : null, shareY = y.world ? y.china / y.world : null;
  const ratio = chinaLoss > 0 ? restGain / chinaLoss : null;
  let verdict = 'none';
  if (chinaLoss <= 0) verdict = 'nofall';
  else if (ratio >= 0.9) verdict = 'full';
  else if (ratio >= 0.4) verdict = 'part';
  return { b, y, chinaLoss, restGain, shareB, shareY, ratio, verdict, totalChange: b.world ? y.world / b.world - 1 : null };
}

/** World export unit value (US$ per tonne) in the baseline year and `year`, from monthly totals. */
export function unitValue(p, year) {
  const f = y => { const v = yearTotal(p, 'usd', y), t = yearTotal(p, 't', y); return t.world > 0 && t.months === 12 ? v.world * 1e6 / t.world : null; };
  return { b: f(BASE_YEAR), y: f(year) };
}

/** Top partners by value (US$m) in the baseline year and `year`, excluding World. */
export function destinations(p, year, n = 8) {
  const A = TRADE.annual[p] || {};
  const y = A[year] || {}, b = {};
  for (const by of BASE_YEARS) for (const [k, v] of Object.entries(A[by] || {})) b[k] = (b[k] || 0) + v / BASE_YEARS.length;
  const codes = new Set();
  const top = o => Object.entries(o).filter(([k]) => k !== '0').sort((a, c) => c[1] - a[1]).slice(0, n).map(([k]) => k);
  top(b).forEach(k => codes.add(k)); top(y).forEach(k => codes.add(k));
  const rows = [...codes].map(k => ({ code: k, name: TRADE.partners[k] || k, base: b[k] || 0, now: y[k] || 0 }));
  rows.sort((a, c) => c.now - a.now || c.base - a.base);
  return { rows: rows.slice(0, n + 2), hasYear: !!A[year], worldB: b['0'] || 0, worldY: y['0'] || 0 };
}

/** Korea: {ym, china, japan, others} rows. */
export const KR_ROWS = TOURISM.rows.map(([ym, c, j, t]) => ({ ym, china: c, japan: j, others: t - c - j, total: t }));
export function krYear(y) {
  const rs = KR_ROWS.filter(r => r.ym.startsWith(y));
  return { china: rs.reduce((s, r) => s + r.china, 0), total: rs.reduce((s, r) => s + r.total, 0), months: rs.length };
}
