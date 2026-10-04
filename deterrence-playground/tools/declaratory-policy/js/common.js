// Shared helpers for Who Promises What: lookups of the policy in force at a date, formatting, escaping.
import { STATES, ELEMENTS, QUOTES } from '../data/policies.js';

export const STATE_COLOR = { USA: 'var(--c1)', RUS: 'var(--c2)', GBR: 'var(--c3)', FRA: 'var(--c4)', CHN: 'var(--c5)',
  ISR: 'var(--c6)', IND: 'var(--c7)', PAK: 'var(--c8)', PRK: 'var(--ccg)' };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const dateText = d => {
  const [y, m, day] = d.split('-').map(Number);
  if (!m) return String(y);
  return new Date(Date.UTC(y, m - 1, day || 1)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', ...(day ? { day: 'numeric' } : {}), timeZone: 'UTC' });
};
export const stateName = id => STATES.find(s => s.id === id)?.name || id;
export const elName = id => ELEMENTS.find(e => e.id === id)?.name || id;
export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** All quotes for a state and element, newest first. */
export const history = (st, el) => QUOTES.filter(q => q.state === st && q.el === el).sort((a, b) => b.date.localeCompare(a.date));

/** The latest statement on record for a state and element on or before `asOf` (a year), or null if none. */
export function inForce(st, el, asOf) {
  return history(st, el).find(q => !q.supp && Number(q.date.slice(0, 4)) <= asOf) || null;
}

/** Label for an empty cell: "Not declared", or "None quoted before <year>" when a later statement exists. */
export function emptyLabel(st, el, asOf) {
  const later = history(st, el).filter(q => !q.supp).map(q => Number(q.date.slice(0, 4))).sort((a, b) => a - b)[0];
  return later ? `None quoted before ${later}` : 'Not declared';
}

/** Quote block with its citation. `mark` highlights a search term. */
export function quoteHTML(q, mark = '') {
  if (!q) return '';
  const re = mark ? new RegExp('(' + mark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi') : null;
  // Split the raw text on the term, then escape each piece, so a term can never land inside an HTML entity.
  const hl = t => (re ? String(t).split(re).map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part))).join('') : esc(t));
  const text = q.parts.map(p => `<span class="dp-part">“${hl(p)}”</span>`).join('');
  const links = [`<a href="${esc(q.url)}" target="_blank" rel="noopener">${esc(q.doc)}</a>`];
  if (q.archive) links.push(`<a href="${esc(q.archive)}" target="_blank" rel="noopener">archived copy</a>`);
  return `<blockquote class="dp-q">${text}<cite>${esc(q.issuer)} · ${dateText(q.date)} · ${links.join(' · ')}${q.page ? ` · ${esc(q.page)}` : ''}</cite>${q.note ? `<p class="fine">${esc(q.note)}</p>` : ''}</blockquote>`;
}

export const ALL_STATES = STATES.map(s => s.id);
export const ALL_ELS = ELEMENTS.map(e => e.id);
