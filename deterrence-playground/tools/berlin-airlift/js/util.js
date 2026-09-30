// Date, schedule and random-number helpers shared by the model and the page.

const DAY = 86400000;
export const START = '1948-06-26';
export const END = '1949-05-12';
export const N_DAYS = Math.round((Date.parse(END) - Date.parse(START)) / DAY); // 320

export const iso = t => new Date(t).toISOString().slice(0, 10);
export const dateOf = day => iso(Date.parse(START) + day * DAY);
export const dayOf = d => Math.round((Date.parse(d) - Date.parse(START)) / DAY);
export const monthOf = d => Number(d.slice(5, 7));

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = d => `${Number(d.slice(8, 10))} ${MON[monthOf(d) - 1]} ${d.slice(0, 4)}`;
export const fmtShort = d => `${Number(d.slice(8, 10))} ${MON[monthOf(d) - 1]}`;
export const monLabel = m => `${MON[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;

/** Linear interpolation on [[date, value], ...]; flat before the first and after the last point. */
export function interp(points, d) {
  const t = Date.parse(d);
  if (t <= Date.parse(points[0][0])) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const t1 = Date.parse(points[i][0]);
    if (t <= t1) {
      const t0 = Date.parse(points[i - 1][0]);
      const f = (t - t0) / (t1 - t0);
      return points[i - 1][1] + f * (points[i][1] - points[i - 1][1]);
    }
  }
  return points[points.length - 1][1];
}

/** Step function on [[date, value], ...]: the last value whose date is on or before d (0 before the first). */
export function stepVal(points, d) {
  let v = 0;
  for (const [pd, pv] of points) if (d >= pd) v = pv;
  return v;
}

/** Seeded PRNG (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Poisson draw (small means only). */
export function poisson(r, mean) {
  if (mean <= 0) return 0;
  const L = Math.exp(-mean);
  let k = 0, p = 1;
  do { k++; p *= r(); } while (p > L && k < 50);
  return k - 1;
}

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const fmt = (x, d = 0) => Number(x).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
