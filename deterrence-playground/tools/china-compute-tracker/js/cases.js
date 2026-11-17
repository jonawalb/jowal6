// Enforcement and diversion cases: DOJ and BIS public cases on advanced chips and chipmaking tools.
import { CASES, esc, fmtDate, statusClass, CASES_CHECKED, clip } from './common.js';

export const CASE_TYPES = [...new Set(CASES.map(c => c.type))];
export const STATUS_KEYS = [
  { k: 'alleged', n: 'Allegation' }, { k: 'convicted', n: 'Plea or conviction' }, { k: 'settled', n: 'Administrative settlement' }, { k: 'closed', n: 'Closed without conviction' },
];
const route = c => (c.route && c.route.length ? `<span class="route">${c.route.map(p => `<span>${esc(p)}</span>`).join('<i aria-hidden="true">→</i>')}</span>` : '');

export function filterCases(S) {
  const q = S.q.trim().toLowerCase();
  // With a search, title matches rank first, then newest first.
  const rank = c => (q && !c.title.toLowerCase().includes(q) ? 1 : 0);
  return CASES.filter(c => S.ctypes.includes(c.type) && S.cstat.includes(statusClass(c.status).k)
    && (!q || [c.title, c.items, c.hubs, (c.parties || []).join(' '), (c.route || []).join(' ')].some(v => v && v.toLowerCase().includes(q))))
    .sort((a, b) => rank(a) - rank(b) || b.date.localeCompare(a.date));
}

export function renderCases(root, S, { onPick, set, rerender }) {
  const filtered = S.ctypes.length !== CASE_TYPES.length || S.cstat.length !== STATUS_KEYS.length || S.q.trim();
  const list = filterCases(S);
  const hubs = new Map();
  for (const c of list) for (const p of (c.route || []).slice(1, -1)) hubs.set(p, (hubs.get(p) || 0) + 1);
  const anyStat = filterCases({ ...S, cstat: STATUS_KEYS.map(s => s.k) });
  const byStat = STATUS_KEYS.map(s => [s, anyStat.filter(c => statusClass(c.status).k === s.k).length]);
  root.innerHTML = `
    <div class="row qrow"><label class="vh" for="cq">Search cases</label><input id="cq" class="search" type="search" placeholder="Search: H100, Malaysia, Singapore, Applied Materials" value="${esc(S.q)}" autocomplete="off"></div>
    <div class="card${S.ctypes.length !== CASE_TYPES.length || S.cstat.length !== STATUS_KEYS.length ? '' : ' full-only'}"><p class="eyebrow">Filter cases</p>
      <div class="gchips" role="group" aria-label="Case type">${CASE_TYPES.map(t => `<button type="button" class="gchip st" data-t="${esc(t)}" aria-pressed="${S.ctypes.includes(t)}">${esc(t)}</button>`).join('')}</div>
      <div class="gchips mt-s" role="group" aria-label="Case status">${STATUS_KEYS.map(s => `<button type="button" class="gchip st" data-s="${s.k}" aria-pressed="${S.cstat.includes(s.k)}"><span class="st-pill st-${s.k}">${esc(s.n)}</span></button>`).join('')}</div>
    </div>
    <div class="stat-row" role="group" aria-label="Show only cases with this status">
      ${byStat.map(([s, n]) => { const only = S.cstat.length === 1 && S.cstat[0] === s.k; return `<button type="button" class="stat stat-btn" data-only="${s.k}" aria-pressed="${only}" title="${only ? 'Show all statuses' : 'Show only this status'}"><span class="big">${n}</span><span><span class="st-pill st-${s.k}">${esc(s.n)}</span></span></button>`; }).join('')}
    </div>
    ${hubs.size ? `<div class="card full-only"><p class="eyebrow">Transit points alleged in these cases</p><p class="route">${[...hubs.entries()].sort((a, b) => b[1] - a[1]).map(([h, n]) => `<span>${esc(h)} · ${n}</span>`).join(' ')}</p>
      <p class="fine">Places between origin and final destination as stated in the charging documents or releases. Counts are cases, not shipments.</p></div>` : ''}
    <div class="card"><p class="eyebrow">${S.q.trim() ? `${list.length} match${list.length === 1 ? '' : 'es'}, title matches first` : 'Cases, newest first'} · status as of ${esc(fmtDate(CASES_CHECKED))}</p><ol class="list" id="cl"></ol></div>`;
  const tog = (arr, k) => (arr.includes(k) ? (arr.length > 1 ? arr.filter(x => x !== k) : arr) : [...arr, k]);
  root.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => set({ ctypes: tog(S.ctypes, b.dataset.t) }); });
  root.querySelectorAll('[data-s]').forEach(b => { b.onclick = () => set({ cstat: tog(S.cstat, b.dataset.s) }); });
  root.querySelectorAll('[data-only]').forEach(b => { b.onclick = () => {
    const k = b.dataset.only;
    set({ cstat: S.cstat.length === 1 && S.cstat[0] === k ? STATUS_KEYS.map(x => x.k) : [k] });
  }; });
  let qt; root.querySelector('#cq').oninput = e => { clearTimeout(qt); qt = setTimeout(() => { set({ q: e.target.value }); const i = document.getElementById('cq'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); };
  const cl = root.querySelector('#cl');
  cl.innerHTML = list.length ? list.map(c => { const st = statusClass(c.status); return `<li class="it case-it${S.sel === 'c:' + c.id ? ' on' : ''}"><button type="button" data-id="c:${esc(c.id)}">
    <span class="it-d">${esc(fmtDate(c.date))}</span>
    <span class="it-t">${esc(c.title)}<br><span class="fine">${esc(c.type)} · ${esc(c.agency)}</span> ${route(c)}</span>
    <span class="it-a"><span class="st-pill st-${st.k}">${esc(c.status)}</span></span></button></li>`; }).join('') : '<li class="none">No case matches these filters.</li>';
  cl.querySelectorAll('[data-id]').forEach(b => { b.onclick = () => onPick(b.dataset.id, true); });
  if (!filtered) clip(cl, 'cases', 6, 'cases', rerender);
}

export function caseDetail(c) {
  const st = statusClass(c.status);
  return `<p class="eyebrow">${esc(c.agency)} case · ${esc(c.type)}${c.official_release === false ? ' · <span class="unv">no official release found</span>' : ''}</p>
    <h3 class="d-h">${esc(c.title)}</h3>
    <p class="d-meta">Announced ${esc(fmtDate(c.date))} · ${esc(c.venue || '')}</p>
    <div class="d-lv"><p><span class="st-pill st-${st.k}">${esc(c.status)}</span> ${esc(fmtDate(c.status_date))}</p>
      <p class="fine">${esc(c.status_note || '')}</p>
      ${st.k === 'alleged' ? '<p class="fine"><b>These are allegations.</b> Defendants are presumed innocent unless and until proven guilty.</p>' : ''}</div>
    <p><b>Items:</b> ${esc(c.items)}</p>
    ${c.route && c.route.length ? `<p><b>Route alleged:</b> ${route(c)}</p>` : ''}
    ${c.hubs ? `<p class="fine">${esc(c.hubs)}</p>` : ''}
    ${c.penalty ? `<p><b>Penalty or outcome:</b> ${esc(c.penalty)}</p>` : ''}
    ${c.parties && c.parties.length ? `<p class="fine"><b>Named in the release:</b> ${c.parties.map(esc).join('; ')}</p>` : ''}
    ${c.quote ? `<blockquote>${esc(c.quote)}</blockquote>` : ''}
    <p class="eyebrow">Sources</p><ol class="d-src">${c.sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>${s.supports ? `<br><span class="fine">${esc(s.supports)}</span>` : ''}</li>`).join('')}</ol>`;
}
