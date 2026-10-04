// Shared data indexes, filters and small helpers for the Nuclear Signals Observatory.
import { ITEMS, BUILT, COUNTS } from '../data/events.js';
import { STATES, OTHERS, CATS, DYADS, RUNG_RULES } from './rules.js';

// The builder drops empty arrays to save space; restore the ones the views rely on.
for (const it of ITEMS) { it.st = it.st || []; it.dy = it.dy || []; }
export { ITEMS, BUILT, COUNTS };
export const byId = new Map(ITEMS.map(it => [it.id, it]));
export const LANES = [...STATES.map(s => s.id), 'NATO', 'MULTI'];
export const CAT_COL = { rhet: 'var(--c1)', force: 'var(--c2)', doct: 'var(--c4)', arms: 'var(--c3)', crisis: 'var(--red)' };
export const CAT_NAME = Object.fromEntries(CATS.map(c => [c.k, c.n]));
export const ORIGIN = {
  rns: { n: "Russia's Nuclear Signals", slug: 'russia-nuclear-signals' },
  dp: { n: 'Who Promises What', slug: 'declaratory-policy' },
  tt: { n: 'Treaty Tracker', slug: 'treaty-tracker' },
  nt: { n: 'Every Nuclear Test', slug: 'nuclear-tests' },
  ntm: { n: 'Every Nuclear Test (milestones)', slug: 'nuclear-tests' },
  nam: { n: 'Nuclear Arsenals (milestones)', slug: 'nuclear-arsenals' },
  k: { n: "Kahn's Escalation Ladder", slug: 'escalation-ladder-kahn' },
  cur: { n: 'Verified for this tool', slug: null },
  cx: { n: 'Rhetoric corpus sentence', slug: null },
};
export const RUNG_RULE = Object.fromEntries(RUNG_RULES.map(r => [r.id, r]));
export const dyadById = id => DYADS.find(d => d.id === id);
export const NOW = BUILT;

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = id => document.getElementById(id);
const MON = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
export function when(it) {
  const [y, m, d] = it.d.split('-').map(Number);
  if (it.prec === 'year') return String(y);
  if (it.prec === 'month') return `${MON[m - 1]} ${y}`;
  return `${MON[m - 1]} ${d}, ${y}`;
}
export const monthLabel = ym => { const [y, m] = ym.split('-').map(Number); return `${MON[m - 1]} ${y}`; };
// Decimal year for plotting.
export const yr = d => { const [y, m, dd] = d.split('-').map(Number); return y + ((m || 7) - 1) / 12 + ((dd || 15) - 1) / 365; };
export const addMonths = (ym, n) => { let [y, m] = ym.split('-').map(Number); m += n; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return `${y}-${String(m).padStart(2, '0')}`; };
export const monthsBetween = (a, b) => { const out = []; for (let m = a; m <= b; m = addMonths(m, 1)) out.push(m); return out; };

export const RANGES = [
  { k: 'now', n: '2021 to now', from: 2021, to: 2027 },
  { k: 'p98', n: 'Since 1998', from: 1998, to: 2027 },
  { k: 'cw', n: 'Cold War', from: 1945, to: 1992 },
  { k: 'all', n: '1945 to now', from: 1945, to: 2027 },
];

export function filterItems(S) {
  const q = S.q.trim().toLowerCase();
  return ITEMS.filter(it => {
    const y = +it.d.slice(0, 4);
    if (y < S.from || y >= S.to) return false;
    if (!S.cats.includes(it.cat)) return false;
    if (it.from === 'cx' && !S.corpus) return false;
    const lanes = it.st.length ? it.st : ['MULTI'];
    if (!lanes.some(s => S.states.includes(s))) return false;
    if (q && ![it.t, it.x, it.q, it.sub, it.who].some(v => v && v.toLowerCase().includes(q))) return false;
    return true;
  });
}

export function srcList(it) {
  return `<ol class="d-src">${it.src.map(([n, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(n || u)}</a></li>`).join('')}</ol>`;
}
export const glyph = (cat, size = 10) => {
  const r = size / 2;
  switch (cat) {
    case 'force': return `M0 ${-r}L${r} ${r * 0.8}L${-r} ${r * 0.8}Z`;
    case 'doct': return `M${-r * 0.85} ${-r * 0.85}H${r * 0.85}V${r * 0.85}H${-r * 0.85}Z`;
    case 'arms': return `M0 ${-r}L${r} 0L0 ${r}L${-r} 0Z`;
    case 'crisis': return `M${-r} ${-r * 0.35}H${-r * 0.35}V${-r}H${r * 0.35}V${-r * 0.35}H${r}V${r * 0.35}H${r * 0.35}V${r}H${-r * 0.35}V${r * 0.35}H${-r}Z`;
    default: return `M${-r} 0A${r} ${r} 0 1 0 ${r} 0A${r} ${r} 0 1 0 ${-r} 0Z`;
  }
};
export const glyphSvg = (cat, col) => `<svg viewBox="-6 -6 12 12" class="gl" aria-hidden="true"><path d="${glyph(cat, 10)}" style="fill:${col || CAT_COL[cat]}"/></svg>`;
export const laneName = id => (STATES.find(s => s.id === id) || OTHERS.find(s => s.id === id) || { short: id }).short;

// Shared tooltip.
export function tooltip(el) {
  return (e, html) => {
    if (!e) { el.hidden = true; return; }
    el.innerHTML = html; el.hidden = false;
    const box = el.offsetParent.getBoundingClientRect();
    const x = e.clientX - box.left, y = e.clientY - box.top;
    el.style.left = Math.max(4, Math.min(box.width - el.offsetWidth - 4, x + 12)) + 'px';
    el.style.top = (y + 14) + 'px';
  };
}
export const svgEl = (tag, attrs = {}, parent, text) => {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, v);
  if (text !== undefined) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
};
