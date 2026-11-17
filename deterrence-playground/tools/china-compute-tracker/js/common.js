// Shared helpers and data indexes for the China Compute Tracker.
import { EL_RULES, EL_BUILT } from '../data/entity_list.js';
import { POLICY } from '../data/policy.js';
import { CASES, CASES_CHECKED } from '../data/cases.js';
import { METRICS, ESTIMATES, EST_CHECKED } from '../data/estimates.js';

export { EL_RULES, EL_BUILT, POLICY, CASES, CASES_CHECKED, METRICS, ESTIMATES, EST_CHECKED };
export const AS_OF = '2026-11-16';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = id => document.getElementById(id);
const MON = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
export function fmtDate(d) {
  if (!d) return '';
  const [y, m, dd] = d.split('-').map(Number);
  if (!m) return String(y);
  if (!dd) return `${MON[m - 1]} ${y}`;
  return `${MON[m - 1]} ${dd}, ${y}`;
}
export const yr = d => { const [y, m, dd] = d.split('-').map(Number); return y + ((m || 7) - 1) / 12 + ((dd || 15) - 1) / 365; };

export const SECTORS = [
  { k: 'ai', n: 'AI chips and models', d: 'AI chip designers and AI model developers' },
  { k: 'hpc', n: 'Supercomputing and servers', d: 'Supercomputer builders, server makers and computing platforms' },
  { k: 'semi', n: 'Chipmaking and chip design', d: 'Fabs, tool makers, materials, lithography, memory and IC designers' },
  { k: 'div', n: 'Diversion fronts', d: 'Firms listed for buying or routing U.S. items to listed PRC chip end users' },
];
export const SEC_COL = { ai: 'var(--c1)', hpc: 'var(--c4)', semi: 'var(--c2)', div: 'var(--c3)', other: 'var(--faint)' };
export const GRADE_INFO = {
  A: { n: 'Official U.S. government', d: 'Statement, testimony or report by a U.S. government body or official' },
  B: { n: 'Company filing or statement', d: 'SEC filing, earnings call or official company statement' },
  C: { n: 'Named analyst with method', d: 'Named research firm or think tank that states how it got the number' },
  D: { n: 'Unnamed sources', d: 'Press report citing people familiar, or no named source' },
};
export const GRADE_COL = { A: 'var(--c1)', B: 'var(--c2)', C: 'var(--c4)', D: 'var(--c3)' };

// Case status classes. Charges are allegations unless a court has convicted.
export function statusClass(s) {
  const t = (s || '').toLowerCase();
  if (/dismiss|acquit/.test(t)) return { k: 'closed', n: 'Closed without conviction' };
  if (/settled|administrative/.test(t)) return { k: 'settled', n: 'Settled (administrative)' };
  if (/guilty|convicted|sentenced|plea|resolution/.test(t)) return { k: 'convicted', n: 'Plea or conviction' };
  return { k: 'alleged', n: 'Allegation (not convicted)' };
}

export function srcList(src) {
  return `<ol class="d-src">${src.map(([n, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(n || u)}</a></li>`).join('')}</ol>`;
}

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
/** Make an SVG mark reachable and operable by keyboard. */
export function keyable(node, label, fn) {
  node.setAttribute('tabindex', '0');
  node.setAttribute('role', 'button');
  node.setAttribute('aria-label', label);
  node.addEventListener('click', fn);
  node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
}

// Simple mode: show the first n children of a long list, with a "Show all" button. Full detail shows everything.
const OPEN = new Set();
let focusKey = null;
export function clip(list, key, n, noun, rerender) {
  const items = [...list.children];
  if (items.length <= n) return;
  items.slice(n).forEach(li => li.classList.add('xtra'));
  if (OPEN.has(key)) {
    if (focusKey === key) { focusKey = null; items[n].querySelector('button, [tabindex]')?.focus(); }
    return;
  }
  list.classList.add('clip');
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn showall simple-only';
  b.textContent = `Show all ${items.length} ${noun}`;
  b.onclick = () => { OPEN.add(key); focusKey = key; rerender(); };
  list.after(b);
}
