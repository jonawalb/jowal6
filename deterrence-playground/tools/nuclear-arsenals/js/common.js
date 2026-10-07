// Shared helpers: fixed series colors (by entity, never by rank), number formatting, escaping.
export const COLOR = {
  USA: 'var(--c1)', RUS: 'var(--c2)', GBR: 'var(--c3)', FRA: 'var(--c4)', CHN: 'var(--c5)',
  ISR: 'var(--c6)', IND: 'var(--c7)', PAK: 'var(--c8)', PRK: 'var(--na-prk)', ZAF: 'var(--na-zaf)',
};
export const fmt = v => (v == null ? 'n/a' : Math.round(v).toLocaleString('en-US'));
export const pct = (a, b) => (b ? `${a >= b ? '+' : ''}${Math.round((a - b) / b * 100)}%` : 'n/a');
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
