// Small helpers shared by the Coercion Without Concession modules.
export const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';

/** Create an SVG element with attributes, optionally appended to a parent and given text. */
export function el(tag, attrs = {}, parent = null, text = null) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** '202011' or '2020-11' -> 'Nov 2020'. */
export const monthLabel = ym => { const s = ym.replace('-', ''); return `${MON[+s.slice(4, 6) - 1]} ${s.slice(0, 4)}`; };
/** '2020-05-19' -> '19 May 2020'. */
export const dayLabel = d => `${+d.slice(8, 10)} ${MON[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
/** Month index since Jan 2000, for x scales. */
export const mIndex = ym => { const s = ym.replace('-', ''); return (+s.slice(0, 4) - 2000) * 12 + (+s.slice(4, 6) - 1); };
/** Fractional month index for a YYYY-MM-DD date. */
export const dIndex = d => mIndex(d.slice(0, 7)) + (+d.slice(8, 10) - 1) / 31;

export function fmtUSD(m) {
  if (m == null || Number.isNaN(m)) return '–';
  const a = Math.abs(m);
  if (a >= 1000) return `$${(m / 1000).toFixed(a >= 10000 ? 1 : 2)}bn`;
  if (a >= 10) return `$${Math.round(m)}m`;
  return `$${m.toFixed(1)}m`;
}
export function fmtT(t) {
  if (t == null || Number.isNaN(t)) return '–';
  const a = Math.abs(t);
  if (a >= 1e6) return `${(t / 1e6).toFixed(1)}Mt`;
  if (a >= 1e3) return `${(t / 1e3).toFixed(a >= 1e4 ? 0 : 1)}kt`;
  return `${Math.round(t)}t`;
}
export const fmtN = n => (n == null ? '–' : Math.round(n).toLocaleString('en-US'));
export const pct = (x, d = 0) => (x == null || !Number.isFinite(x) ? '–' : `${(x * 100).toFixed(d)}%`);
export const signed = (x, f) => (x == null ? '–' : (x > 0 ? '+' : x < 0 ? '−' : '') + f(Math.abs(x)));

/** Round-number ticks for [0, max]. */
export function niceTicks(max, n = 4) {
  if (!(max > 0)) return [0];
  const raw = max / n, p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw);
  const out = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

/** Position a tooltip near a pointer inside a positioned wrapper, kept on screen. */
export function placeTip(tip, wrap, x, y) {
  const w = wrap.clientWidth;
  tip.hidden = false;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let left = x + 14, top = y - th - 10;
  if (left + tw > w) left = Math.max(0, x - tw - 14);
  if (top < 0) top = y + 16;
  tip.style.left = `${left}px`; tip.style.top = `${top}px`;
}
