// Matrix of states x policy elements. Each cell shows the statement on record as of the chosen year,
// or "Not declared". Clicking a cell opens its full quote and history in the side panel.
import { STATES, ELEMENTS, GAPS } from '../data/policies.js';
import { STATE_COLOR, esc, dateText, inForce, history, quoteHTML, stateName, elName, emptyLabel } from './common.js';

const clip = (s, n) => (s.length > n ? s.slice(0, s.lastIndexOf(' ', n)) + ' …' : s);

export function renderMatrix(host, state, onSelect) {
  const states = STATES.filter(s => state.states.has(s.id));
  const els = ELEMENTS.filter(e => state.els.has(e.id));
  const term = state.q.trim().toLowerCase();
  let shown = 0;
  const rows = states.map(s => {
    const cells = els.map(e => {
      const q = inForce(s.id, e.id, state.asOf);
      const hit = !term || (q && (q.quote.toLowerCase().includes(term) || q.doc.toLowerCase().includes(term)));
      if (q && hit) shown++;
      const sel = state.sel === `${s.id}.${e.id}`;
      const body = q
        ? `<span class="dp-tag" data-k="${esc(q.kind || 'stmt')}">${esc(q.tag)}</span>
           <span class="dp-snip">“${esc(state.full ? q.quote : clip(q.quote, 110))}”</span>
           <span class="dp-when">${esc(q.short || q.doc)}, ${q.date.slice(0, 4)}</span>`
        : `<span class="dp-tag" data-k="none">${emptyLabel(s.id, e.id, state.asOf)}</span>`;
      return `<td data-label="${esc(e.name)}" class="${q ? '' : 'nd'}${hit ? '' : ' dim'}${sel ? ' sel' : ''}">
        <button type="button" class="dp-cell" data-sel="${s.id}.${e.id}" aria-pressed="${sel}" aria-label="${esc(s.name)}, ${esc(e.name)}: ${q ? esc(q.tag) : emptyLabel(s.id, e.id, state.asOf)}">${body}</button></td>`;
    }).join('');
    return `<tr><th scope="row"><span class="sw-dot" style="background:${STATE_COLOR[s.id]}"></span>${esc(s.name)}<small>${esc(s.status)}</small></th>${cells}</tr>`;
  }).join('');
  host.innerHTML = states.length && els.length
    ? `<table class="dp-matrix"><thead><tr><th scope="col">State</th>${els.map(e => `<th scope="col" title="${esc(e.help)}">${esc(e.name)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`
    : '<p class="fine">No states or elements selected. Use the filters to add some back.</p>';
  host.querySelectorAll('[data-sel]').forEach(b => b.onclick = () => onSelect(b.dataset.sel));
  return shown;
}

/** Side-panel detail for the selected cell: in-force quote, earlier and later statements, and gap notes. */
export function detailHTML(sel, asOf, mark = '') {
  if (!sel) return '<p class="fine">Click any cell in the matrix to read the full statement, its source and what came before it.</p>';
  const [st, el] = sel.split('.');
  const q = inForce(st, el, asOf), all = history(st, el);
  const gap = GAPS.find(g => g.state === st && g.el === el);
  const others = all.filter(x => x !== q);
  return `<p class="eyebrow">${esc(stateName(st))} · ${esc(elName(el))}</p>
    ${q ? `<h3 class="dp-dh">${esc(q.tag)}</h3>${quoteHTML(q, mark)}` : `<h3 class="dp-dh">${emptyLabel(st, el, asOf)}</h3>`}
    ${!q && !all.length && gap ? `<p class="fine">${esc(gap.note)}</p>` : ''}
    ${!q && all.length ? `<p class="fine">This tool quotes no document on this element dated ${asOf} or earlier. Move the year forward, or see the timeline for earlier documents that are listed but not quoted.</p>` : ''}
    ${others.length ? `<p class="eyebrow dp-mt">Other statements on this element</p>${others.map(x => `<details><summary>${dateText(x.date)}: ${esc(x.tag)}${x.supp ? ' (statement, not doctrine)' : ''}</summary>${quoteHTML(x, mark)}</details>`).join('')}` : ''}`;
}
