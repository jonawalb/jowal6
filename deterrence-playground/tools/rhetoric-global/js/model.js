// Data model: weeks, ranges, row layout and cell values for the rhetoric-global heatmap.
import { META, COUNTRIES } from '../data/corpus.js';

export { META, COUNTRIES };
export const CC = ['ru', 'ir'];
export const DAY = 864e5;
const T0 = Date.parse(META.t0 + 'T00:00:00Z');
export const weekOf = iso => Math.floor((Date.parse(iso + 'T00:00:00Z') - T0) / (7 * DAY));
export const weekStart = w => new Date(T0 + w * 7 * DAY).toISOString().slice(0, 10);
export const N_WEEKS = META.nWeeks;
export const MIN_WORDS = 300; // weeks with fewer words are drawn but flagged as thin

export const RANGES = {
  all: { label: 'All (2021 on)', from: META.t0 },
  war: { label: 'Since Feb 2022', from: '2022-02-14' },
  y25: { label: 'Since 2025', from: '2024-12-30' },
};
export const METRICS = {
  rate: { label: 'Per 1,000 words', unit: 'uses per 1,000 words' },
  share: { label: 'Share of statements', unit: 'of the week\'s statements' },
};

export const fmtDate = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const fmtN = n => n.toLocaleString('en-US');

/** Rows for a country: category headers and phrases, optionally filtered to one category. */
export function rowsOf(cc, cat) {
  const C = COUNTRIES[cc];
  const rows = [];
  for (const c of C.cats) {
    if (cat !== 'all' && cat !== c) continue;
    rows.push({ kind: 'cat', label: c });
    C.phrases.forEach((p, k) => { if (p.cat === c) rows.push({ kind: 'phrase', k, p }); });
  }
  return rows;
}

/** Cell value: uses per 1,000 words, or the share of statements that use the phrase. null = no text held. */
export function value(cc, k, w, metric) {
  const C = COUNTRIES[cc], p = C.phrases[k];
  if (!C.ndocs[w]) return null;
  return metric === 'share' ? p.docs[w] / C.ndocs[w] : (p.hits[w] / C.words[w]) * 1000;
}

/** A robust top of the colour scale: the 97th percentile of non-zero visible values. */
export function scaleMax(cc, rows, w0, w1, metric) {
  if (metric === 'share') return 1;
  const vals = [];
  for (const r of rows) {
    if (r.kind !== 'phrase') continue;
    for (let w = w0; w <= w1; w++) {
      const v = value(cc, r.k, w, metric);
      if (v) vals.push(v);
    }
  }
  if (!vals.length) return 1;
  vals.sort((a, b) => a - b);
  return vals[Math.min(vals.length - 1, Math.floor(vals.length * 0.97))];
}

export function fmtValue(v, metric) {
  if (v == null) return 'no text';
  if (metric === 'share') return `${Math.round(v * 100)}%`;
  return v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2);
}

/** Case-insensitive global RegExp from a dictionary pattern (for highlighting quotes). */
export const phraseRe = src => new RegExp(src, 'gi');

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Escape text and wrap every match of re in <mark>. */
export function mark(text, re) {
  re.lastIndex = 0;
  let out = '', last = 0, m;
  while ((m = re.exec(text))) {
    if (!m[0]) { re.lastIndex++; continue; }
    out += escapeHtml(text.slice(last, m.index)) + '<mark>' + escapeHtml(m[0]) + '</mark>';
    last = m.index + m[0].length;
  }
  return out + escapeHtml(text.slice(last));
}

/** Busiest week for a phrase within [w0, w1]: the most uses, ties broken by rate (thin weeks skipped). */
export function peakWeek(cc, k, w0, w1, metric) {
  const C = COUNTRIES[cc], p = C.phrases[k];
  let best = null;
  for (let w = w0; w <= w1; w++) {
    if (C.words[w] < MIN_WORDS || !p.hits[w]) continue;
    const score = (metric === 'share' ? p.docs[w] : p.hits[w]) + value(cc, k, w, metric) * 1e-6;
    if (!best || score > best.s) best = { w, s: score };
  }
  return best ? best.w : null;
}
