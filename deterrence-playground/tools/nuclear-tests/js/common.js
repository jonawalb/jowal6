// Shared helpers: fixed colors by state and by environment, filtering, counting, formatting.
import { STATES, TESTS } from '../data/tests.js';

export const Y0 = 1945, Y1 = 2026;
// Same entity colors as the Nuclear Arsenals tool (USSR uses Russia's color).
export const STATE_COLOR = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c7)', 'var(--c8)', 'var(--ccg)'];
export const ENV_COLOR = ['var(--accent)', 'var(--c7)', 'var(--blue)', 'var(--c6)'];
export const SHORT = ['U.S.', 'USSR', 'UK', 'France', 'China', 'India', 'Pakistan', 'N. Korea'];

export const yearOf = t => Math.floor(t[0] / 10000);
export const fmt = v => (v == null ? 'n/a' : Math.round(v).toLocaleString('en-US'));
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const dateText = d => {
  const y = Math.floor(d / 10000), m = Math.floor(d / 100) % 100, day = d % 100;
  if (!m) return String(y);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
};
export const yieldText = t => {
  const [lo, hi] = [t[7], t[8]];
  if (hi == null || hi <= 0) return 'yield not published';
  const f = v => v >= 1000 ? `${+(v / 1000).toFixed(2)} Mt` : `${+v.toFixed(3)} kt`;
  if (!lo || lo <= 0.001) return `up to ${f(hi)}`;
  return lo === hi ? f(hi) : `${f(lo)} to ${f(hi)}`;
};

/** Tests that pass the state, environment and yield-class filters. */
export function filtered(state) {
  return TESTS.filter(t => state.st.has(t[1]) && state.env.has(t[2]) && state.yc.has(t[3]));
}

/** Count matrix [year][group] where group is a state or an environment index. */
export function byYear(rows, by) {
  const n = Y1 - Y0 + 1, k = by === 'env' ? 4 : STATES.length;
  const m = Array.from({ length: n }, () => new Array(k).fill(0));
  for (const t of rows) m[yearOf(t) - Y0][by === 'env' ? t[2] : t[1]]++;
  return m;
}

export const ALL_STATES = STATES.map((_, i) => i);
export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
