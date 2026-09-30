// Small formatting helpers.
export const money = m => {
  if (m == null) return 'not priced';
  if (m === 0) return '$0';
  if (m < 1) return '$' + Math.round(m * 1000).toLocaleString('en-US') + 'k';
  return '$' + (m < 10 ? m.toFixed(1) : Math.round(m).toLocaleString('en-US')) + 'm';
};
export const range = (lo, hi) => (lo === hi ? money(lo) : `${money(lo)}–${money(hi)}`);
export const ratio = r => (r == null ? 'n/a' : r >= 10 ? Math.round(r) + ' : 1' : r.toFixed(1) + ' : 1');
export const clock = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Status class for a pair of cost-exchange ratios (spent per dollar destroyed). */
export function exchangeState(r) {
  if (r.lo == null) return 'warn';
  if (r.hi <= 1 && r.lo <= 1) return 'good';
  if (r.hi > 1 && r.lo > 1) return 'bad';
  return 'warn';
}
