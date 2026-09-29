// Derived series for the chart and panel. Everything here is arithmetic on the IAEA figures in
// data/stockpile.js: sums of reported levels, differences between reports, and ratios to the JCPOA limit.
import { REPORTS, LIMIT_KG_U } from '../data/stockpile.js';

export const LEVELS = [
  { k: 'le2', label: 'Up to 2%', color: 'var(--c7)' },
  { k: 'le5', label: 'Up to 5%', color: 'var(--c1)' },
  { k: 'le20', label: 'Up to 20%', color: 'var(--c5)' },
  { k: 'le60', label: 'Up to 60%', color: 'var(--bad)' },
];
export const VIEWS = {
  all: { label: 'All levels', keys: ['le2', 'le5', 'le20', 'le60'] },
  heu: { label: '20% and 60%', keys: ['le20', 'le60'] },
  sixty: { label: '60% only', keys: ['le60'] },
};

export const t = d => Date.parse(d + 'T00:00:00Z');
export const DAY = 864e5;
const r1 = v => Math.round(v * 10) / 10;

/** One row per report, with bands in kg of uranium. Pre-2021 levels (3.67% and 4.5%) go in the "up to 5%" band,
 * less the part of the 4.5% stock that 2020 reports say was enriched only up to 2%. */
export const ROWS = REPORTS.map((r, i) => {
  const lv = r.lv || {};
  const has = r.lv != null;
  const band = has ? {
    le2: lv.le2 ?? lv.le2of45 ?? 0,
    le5: r1((lv.le5 ?? 0) + (lv.le367 ?? 0) + (lv.le45 ?? 0) - (lv.le2of45 ?? 0)),
    le20: lv.le20 ?? 0,
    le60: lv.le60 ?? 0,
  } : null;
  const levelSum = has ? r1(band.le2 + band.le5 + band.le20 + band.le60) : null;
  const total = r.total ?? (has ? levelSum : null); // 2018-2019: the single 3.67% figure is the stockpile
  return {
    ...r, i, band, levelSum, total,
    totalFromLevels: r.total == null && has,
    split: has && lv.le2 != null ? 'fine' : has ? 'coarse' : null,
    uf6Only: r.uf6 != null && lv.le2 != null, // from 2021 the level split covers only the UF6 part
    multiple: total != null ? total / LIMIT_KG_U : null,
  };
});

export const NUM = ROWS.filter(r => r.band);
export const byId = id => ROWS.find(r => r.id === id);
export const slug = id => id.replace(/\//g, '-');
export const fromSlug = s => ROWS.find(r => slug(r.id) === s);

/** The numeric report before this one, for change readouts. */
export function prevNum(r) {
  const k = NUM.indexOf(r);
  return k > 0 ? NUM[k - 1] : null;
}

export const fmtKg = v => v == null ? 'n/a' : v >= 1000 ? Math.round(v).toLocaleString('en-US') : (Math.round(v * 10) / 10).toLocaleString('en-US');
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function niceDate(d, long = false) {
  const [y, m, dd] = d.split('-').map(Number);
  return `${dd} ${(long ? MONTHS_LONG : MONTHS)[m - 1]} ${y}`;
}
export const daysBetween = (a, b) => Math.round((t(b) - t(a)) / DAY);
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export { LIMIT_KG_U };
