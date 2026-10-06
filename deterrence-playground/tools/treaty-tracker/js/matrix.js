// Treaty x state matrix. Rows are states, columns treaties. The table is rebuilt when filters change and
// only recoloured when the year changes, so dragging the slider stays fast with ~200 rows.
import { TREATIES, STATES } from '../data/treaties.js';
import { GROUPS, NUCLEAR_ARMED, statusAt, statusName, esc, T, stateName, dateText, BOUND } from './common.js';

export function visibleTreaties(state) {
  return TREATIES.filter(t => state.groups.has(t.group));
}

export function visibleStates(state) {
  const q = state.q.trim().toLowerCase();
  let list = STATES;
  if (state.preset === 'nuclear') list = list.filter(s => NUCLEAR_ARMED.includes(s.iso));
  if (state.preset === 'changed') list = list.filter(s => TREATIES.some(t => ['withdrawn', 'suspended', 'susppart', 'revoked', 'disputed', 'renounced'].includes(statusAt(t.id, s.iso, state.year).s)));
  if (state.preset === 'cfe') list = list.filter(s => statusAt('cfe', s.iso, 2026).s !== 'none' || statusAt('osk', s.iso, 2026).s !== 'none');
  if (q) list = list.filter(s => s.name.toLowerCase().includes(q) || s.iso.toLowerCase() === q);
  if (state.sort !== 'name' && T[state.sort]) {
    const rank = s => { const st = statusAt(state.sort, s.iso, state.year).s; return BOUND.has(st) ? 0 : st === 'ratified' ? 1 : st === 'signed' ? 2 : st === 'none' ? 4 : 3; };
    list = [...list].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }
  return list;
}

export function createMatrix(host, { onSelect, onSort }) {
  let key = '';
  function build(state) {
    const ts = visibleTreaties(state), ss = visibleStates(state);
    const k = ts.map(t => t.id).join() + '|' + ss.map(s => s.iso).join();
    if (k === key) return false;
    key = k;
    const fe = document.activeElement, refocus = host.contains(fe) ? (fe.dataset.sort ? `[data-sort="${fe.dataset.sort}"]` : fe.dataset.cell ? `[data-cell="${fe.dataset.cell}"]` : '') : '';
    if (!ts.length || !ss.length) { host.innerHTML = '<p class="fine tt-empty">No states or treaties match the filters.</p>'; return true; }
    const groupCells = GROUPS.filter(g => state.groups.has(g.id)).map(g => {
      const n = ts.filter(t => t.group === g.id).length;
      return `<th scope="colgroup" colspan="${n}" class="tt-g" data-g="${g.id}" title="${esc(g.name)}"><span aria-hidden="true">${esc(g.short || g.name)}</span><span class="sr-only">${esc(g.name)}</span></th>`;
    }).join('');
    const head = ts.map(t => `<th scope="col" class="tt-th"><button type="button" data-sort="${t.id}" title="${esc(t.name)}: sort states by status">${esc(t.short)}</button></th>`).join('');
    const rows = ss.map(s => `<tr data-iso="${s.iso}"><th scope="row" class="tt-rh">${esc(s.name)}</th>${ts.map(t =>
      `<td><button type="button" class="tt-c" data-cell="${t.id}.${s.iso}"></button></td>`).join('')}</tr>`).join('');
    host.innerHTML = `<table class="tt-matrix"><thead><tr class="tt-gr"><th></th>${groupCells}</tr><tr><th scope="col" class="tt-corner">State <small>${ss.length}</small></th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
    host.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => onSort(b.dataset.sort));
    host.querySelector('tbody').addEventListener('click', e => {
      const b = e.target.closest('[data-cell]'); if (b) onSelect(b.dataset.cell);
    });
    if (refocus) host.querySelector(refocus)?.focus({ preventScroll: true }); // keep keyboard focus across the rebuild
    return true;
  }
  function paint(state) {
    host.querySelectorAll('[data-cell]').forEach(b => {
      const [tid, iso] = b.dataset.cell.split('.');
      const st = statusAt(tid, iso, state.year);
      b.dataset.s = st.s;
      const sel = state.sel === b.dataset.cell;
      b.setAttribute('aria-pressed', sel);
      b.setAttribute('aria-label', `${stateName(iso)}, ${T[tid].short}, ${state.year}: ${statusName(st.s)}${st.d ? ' since ' + dateText(st.d) : ''}`);
      b.title = `${stateName(iso)} · ${T[tid].short}: ${statusName(st.s)}${st.d ? ' (' + dateText(st.d) + ')' : ''}`;
    });
    host.querySelectorAll('[data-sort]').forEach(b => b.setAttribute('aria-pressed', state.sort === b.dataset.sort));
  }
  return { draw(state) { build(state); paint(state); }, reset() { key = ''; } };
}
