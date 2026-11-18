// Range math for the capacity-estimate panel. Pure functions, tested in scripts/range.test.mjs.

export const GRADES = ['A', 'B', 'C', 'D'];

/** Estimates for one metric and period whose grade is in `grades`. */
export function pick(estimates, metric, period, grades) {
  const on = new Set(grades);
  return estimates.filter(e => e.metric === metric && e.period === period && on.has(e.grade));
}

/**
 * Envelope across sources: lowest low to highest high, plus the median of source midpoints
 * and the high/low spread. Returns null when no source is included.
 */
export function envelope(list) {
  const ok = list.filter(e => Number.isFinite(e.low) && Number.isFinite(e.high));
  if (!ok.length) return null;
  const low = Math.min(...ok.map(e => e.low));
  const high = Math.max(...ok.map(e => e.high));
  const mids = ok.map(e => (e.low + e.high) / 2).sort((a, b) => a - b);
  const m = mids.length;
  const median = m % 2 ? mids[(m - 1) / 2] : (mids[m / 2 - 1] + mids[m / 2]) / 2;
  // n counts publications, not rows: two figures from one paper (an estimate and a case tally) are one source
  const n = new Set(ok.map((e, i) => e.url || e.source || i)).size;
  return { low, high, median, n, figures: ok.length, spread: low > 0 ? high / low : null };
}

/** Periods present for a metric, most-covered first, ties broken by latest period. */
export function periods(estimates, metric) {
  const c = new Map();
  for (const e of estimates) if (e.metric === metric) c.set(e.period, (c.get(e.period) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1] || String(b[0]).localeCompare(String(a[0]))).map(x => x[0]);
}

/** Compact number for readouts: 1,234 -> "1,234"; 1.2e6 -> "1.2 million". */
export function fmtNum(v) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '–';
  const a = Math.abs(v);
  if (a >= 1e9) return `${+(v / 1e9).toFixed(a >= 1e10 ? 0 : 1)} billion`;
  if (a >= 1e6) return `${+(v / 1e6).toFixed(a >= 1e7 ? 0 : 2)} million`;
  if (a >= 1e4) return Math.round(v).toLocaleString('en-US');
  return (+v.toFixed(a < 10 ? 2 : 0)).toLocaleString('en-US');
}

/** Log-scale domain padded to whole powers of ten, for a common axis across estimates. */
export function logDomain(list) {
  const vals = list.flatMap(e => [e.low, e.high]).filter(v => Number.isFinite(v) && v > 0);
  if (!vals.length) return [1, 10];
  let lo = 10 ** Math.floor(Math.log10(Math.min(...vals)));
  let hi = 10 ** Math.ceil(Math.log10(Math.max(...vals)));
  if (hi <= lo) hi = lo * 10;
  return [lo, hi];
}
