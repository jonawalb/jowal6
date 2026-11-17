// Understanding AI Policy: shared constants and helpers.
import { DOCS } from '../data/policy.js';

export const COUNTRIES = [
  { id: 'US', name: 'United States', short: 'US', color: 'var(--us)' },
  { id: 'CN', name: 'China', short: 'China', color: 'var(--prc)' },
  { id: 'RU', name: 'Russia', short: 'Russia', color: 'var(--c6)' },
  { id: 'INTL', name: 'Between them', short: 'Between them', color: 'var(--c3)' },
];
export const C = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));

export const THEMES = [
  { id: 'security', name: 'Security & military' },
  { id: 'industry', name: 'Industry & compute' },
  { id: 'content', name: 'Content & speech' },
  { id: 'safety', name: 'Safety' },
  { id: 'international', name: 'International' },
];

// Status: `live` decides whether a node is drawn solid (still has effect) or hollow (no longer does).
export const STATUS = {
  'in-force': { name: 'In force', live: true, s: 'good' },
  'amended': { name: 'In force, amended', live: true, s: 'good' },
  'non-binding': { name: 'Non-binding, current', live: true, s: 'good' },
  'revoked': { name: 'Revoked', live: false, s: 'bad' },
  'rescinded': { name: 'Rescinded', live: false, s: 'bad' },
  'superseded': { name: 'Superseded', live: false, s: 'warn' },
  'expired': { name: 'Expired', live: false, s: 'warn' },
  'proposed': { name: 'Proposed', live: null, s: 'warn' },
  'draft': { name: 'Draft', live: null, s: 'warn' },
  'released': { name: 'Released, not yet in force', live: null, s: 'warn' },
  'signed': { name: 'Signed, not yet in force', live: null, s: 'warn' },
  'suspended': { name: 'Suspended', live: false, s: 'warn' },
  'notenforced': { name: 'Not enforced, rescission pending', live: false, s: 'bad' },
  'unclear': { name: 'Status unclear', live: 'unclear', s: 'warn' },
};
// Today's date in Washington (YYYY-MM-DD). Statuses below are judged against it, so they stay true without edits.
export function todayET(now = new Date()) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
  catch { return now.toISOString().slice(0, 10); }
}
const TODAY = todayET();
/** The status key in effect on `today`: a scheduled change (statusFrom) applies from its date on. */
export const statusKey = (d, today = TODAY) => d.statusFrom && d.statusFrom.date <= today ? d.statusFrom.status : d.status;
/** The status note in effect on `today`. */
export const statusNoteOf = (d, today = TODAY) => d.statusFrom && d.statusFrom.date <= today ? d.statusFrom.note : d.statusNote;
// A released or signed text whose effective date has passed is shown as in force, so the label stays true after that date.
export const statusOf = (d, today = TODAY) => {
  const k = statusKey(d, today);
  return (k === 'released' || k === 'signed') && d.effective && d.effective <= today
    ? STATUS['in-force']
    : STATUS[k] || { name: k, live: true, s: 'warn' };
};

export const REL = {
  revokes: { verb: 'Revokes', back: 'Revoked by', color: 'var(--bad)' },
  rescinds: { verb: 'Rescinds', back: 'Rescinded by', color: 'var(--bad)' },
  supersedes: { verb: 'Supersedes', back: 'Superseded by', color: 'var(--warn)' },
  amends: { verb: 'Amends', back: 'Amended by', color: 'var(--warn)' },
  suspends: { verb: 'Suspends', back: 'Suspended by', color: 'var(--warn)' },
  implements: { verb: 'Implements', back: 'Implemented by', color: 'var(--muted)' },
};

export const KIND = {
  'executive-order': 'Executive order', law: 'Law', regulation: 'Regulation', standard: 'Standard',
  strategy: 'Strategy', plan: 'Plan', statement: 'Official statement', guidance: 'Guidance',
  resolution: 'UN resolution', declaration: 'Declaration', decree: 'Decree',
  proclamation: 'Proclamation', agreement: 'Agreement (treaty)', bill: 'Bill (not enacted)',
};

export const D = Object.fromEntries(DOCS.map(d => [d.id, d]));
export const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function dateText(s, prec) {
  if (!s) return '';
  if (prec === 'month') s = s.slice(0, 7);
  const [y, m, d] = s.split('-').map(Number);
  return d ? `${d} ${MON[m - 1]} ${y}` : m ? `${MON[m - 1]} ${y}` : String(y);
}
export const ext = (url, text) => url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>` : '';
export const host = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };

/** Incoming and outgoing relations for a document id. */
export function relationsOf(id) {
  const out = (D[id]?.rel || []).filter(r => D[r.target]).map(r => ({ dir: 'out', type: r.type, id: r.target }));
  const inc = [];
  for (const d of DOCS) for (const r of d.rel || []) if (r.target === id) inc.push({ dir: 'in', type: r.type, id: d.id });
  return [...out, ...inc];
}

const langOf = s => /[Ѐ-ӿ]/.test(s) ? 'ru' : /[一-鿿]/.test(s) ? 'zh' : 'en';
/** A quoted passage. Chinese and Russian passages show our English rendering first, the original below. */
export function quoteHTML(q, en, cite = '') {
  if (!q) return '';
  if (!en) return `<blockquote class="ap-q">“${esc(q)}”${cite}</blockquote>`;
  return `<blockquote class="ap-q">“${esc(en)}”<span class="ap-orig-q" lang="${langOf(q)}">${esc(q)}</span><span class="ap-tr">Unofficial translation by this tool; the original text governs.</span>${cite}</blockquote>`;
}
/** A debate holder's note, with the same treatment when it is in Chinese or Russian. */
export const noteHTML = (n, en) => !n ? '' : en ? `${esc(en)} <span class="ap-orig-q ap-inl" lang="${langOf(n)}">(${esc(n)})</span>` : esc(n);
