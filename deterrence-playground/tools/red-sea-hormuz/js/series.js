// Date and series helpers for the PortWatch daily transit data.
import { PORTWATCH } from '../data/transits.js';

export const KEYS = ['bab', 'suez', 'hormuz', 'cape'];
export const NAMES = { bab: 'Bab el-Mandeb', suez: 'Suez Canal', hormuz: 'Strait of Hormuz', cape: 'Cape of Good Hope' };
export const METRICS = {
  total: { label: 'All ships', unit: 'ships/day', short: 'ships' },
  tanker: { label: 'Tankers', unit: 'tankers/day', short: 'tankers' },
  container: { label: 'Container ships', unit: 'container ships/day', short: 'boxships' },
  dwt: { label: 'Capacity', unit: 'thousand dwt/day', short: 'k dwt' },
};

const DAY = 86400000;
const START = Date.parse(PORTWATCH.series.bab.start + 'T00:00:00Z');
export const N = PORTWATCH.series.bab.total.length;
export const FIRST = PORTWATCH.series.bab.start;
export const LAST = iso(N - 1);

export function idx(d) { return Math.round((Date.parse(d + 'T00:00:00Z') - START) / DAY); }
export function iso(i) { return new Date(START + i * DAY).toISOString().slice(0, 10); }
export const clampIdx = i => Math.max(0, Math.min(N - 1, i));
export const validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && !isNaN(Date.parse(d)) && idx(d) >= 0 && idx(d) < N;

export function raw(key, metric) { return PORTWATCH.series[key][metric]; }

const cache = new Map();
/** Trailing moving average over `w` days (w = 1 returns the raw series). Nulls are skipped. */
export function smoothed(key, metric, w) {
  const k = `${key}|${metric}|${w}`;
  if (cache.has(k)) return cache.get(k);
  const a = raw(key, metric);
  let out = a;
  if (w > 1) {
    out = new Array(a.length);
    let sum = 0, cnt = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] != null) { sum += a[i]; cnt++; }
      const j = i - w;
      if (j >= 0 && a[j] != null) { sum -= a[j]; cnt--; }
      out[i] = cnt ? sum / cnt : null;
    }
  }
  cache.set(k, out);
  return out;
}

/** Mean of the raw daily series between two ISO dates, inclusive. */
export function windowMean(key, metric, [d0, d1]) {
  const a = raw(key, metric);
  let s = 0, n = 0;
  for (let i = clampIdx(idx(d0)); i <= clampIdx(idx(d1)); i++) if (a[i] != null) { s += a[i]; n++; }
  return n ? s / n : null;
}

export const pct = (b, a) => (b == null || a == null || b === 0) ? null : (a - b) / b * 100;
export const fmtPct = p => p == null ? 'n/a' : `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(Math.round(p))}%`;
export const fmtVal = (v, metric) => v == null ? 'n/a' : metric === 'dwt' ? Math.round(v).toLocaleString('en-US') : (v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en-US'));

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function niceDate(d, short = false) {
  const [y, m, dd] = d.split('-').map(Number);
  return short ? `${MON[m - 1]} ${y}` : `${dd} ${MON[m - 1]} ${y}`;
}
