// Shared helpers: dates, formatting, sources.

export const DAY = 86400000;
export const parse = (d) => new Date(d.slice(0, 10) + 'T00:00:00Z');
export const iso = (t) => new Date(t).toISOString().slice(0, 10);
export const addDays = (d, n) => iso(parse(d).getTime() + n * DAY);
export const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / DAY);

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(d, opts = {}) {
  if (!d) return '';
  const [y, m, dd] = d.slice(0, 10).split('-').map(Number);
  if (opts.short) return `${dd} ${MON[m - 1]}`;
  return `${dd} ${MON[m - 1]} ${y}`;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function fmtNum(v) {
  if (v == null || v === '') return '–';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : esc(v);
}

// A source is {a, t, y, p, u} (author, title, year, page, url) or a plain string.
export function srcText(s) {
  if (!s) return '';
  if (typeof s === 'string') return esc(s);
  const parts = [s.a, s.t ? `<i>${esc(s.t)}</i>` : '', s.y].filter(Boolean);
  let out = parts.map((p, i) => (i === 1 ? p : esc(p))).join(', ');
  if (s.p && !/^https?:/.test(s.p)) out += `, ${esc(s.p)}`;
  const url = s.u || (s.p && /^https?:/.test(s.p) ? s.p : null);
  if (url) out += ` <a href="${esc(url)}" target="_blank" rel="noopener">link</a>`;
  return out;
}

export function srcInline(list) {
  if (!list || !list.length) return '';
  return `<span class="src">${list.map(srcText).join('; ')}</span>`;
}

export function sourcesBlock(list, label = 'Sources') {
  if (!list || !list.length) return '';
  return `<details class="sources"><summary>${esc(label)} (${list.length})</summary><ol>${list
    .map((s) => `<li>${srcText(s)}</li>`).join('')}</ol></details>`;
}

export function confBadge(c) {
  if (!c || /^(agreed|high)$/i.test(c)) return '';
  return `<span class="badge conf" title="${esc(c)}">${esc(String(c).split(':')[0])}</span>`;
}

export const sideName = { FR: 'French Union', VM: 'Viet Minh', both: 'Both sides' };
