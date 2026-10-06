// Compare two states treaty by treaty at the chosen year, with the date behind each status.
import { TREATIES, STATES } from '../data/treaties.js';
import { infoBtn, explainHTML } from './explain.js';
import { when, statusAt, statusName, esc, dateText, stateName, BOUND } from './common.js';

export function fillSelects(a, b) {
  const opts = STATES.map(s => `<option value="${s.iso}">${esc(s.name)}</option>`).join('');
  a.innerHTML = opts; b.innerHTML = opts;
}

export function renderCompare(host, state) {
  const [A, B] = state.cmp, year = state.year;
  const ts = TREATIES.filter(t => state.groups.has(t.group));
  const cell = (tid, iso) => {
    const st = statusAt(tid, iso, year);
    return `<span class="tt-sw" data-s="${st.s}"></span>${esc(statusName(st.s))}${st.d ? ` <span class="num fine">${dateText(st.d)}</span>` : ''}`;
  };
  let same = 0, boundA = 0, boundB = 0;
  const rows = ts.map(t => {
    const sa = statusAt(t.id, A, year).s, sb = statusAt(t.id, B, year).s;
    if (sa === sb) same++;
    if (BOUND.has(sa)) boundA++;
    if (BOUND.has(sb)) boundB++;
    return `<tr class="${sa === sb ? '' : 'diff'}"><th scope="row"><span class="tt-named"><button type="button" class="linkish" data-t="${t.id}">${esc(t.short)}</button>${infoBtn(t.id, 'cmp-' + t.id)}</span></th>
      <td data-label="${esc(stateName(A))}">${cell(t.id, A)}</td><td data-label="${esc(stateName(B))}">${cell(t.id, B)}</td></tr>${explainHTML(t.id, 'cmp-' + t.id, 'tr', 3)}`;
  }).join('');
  host.innerHTML = `<p class="fine">${when(year).replace(/^./, c => c.toUpperCase())}, ${esc(stateName(A))} was bound by ${boundA} and ${esc(stateName(B))} by ${boundB} of the ${ts.length} treaties shown. They differ on ${ts.length - same}; differing rows are marked.</p>
    <div class="tablewrap"><table class="tt-cmp"><thead><tr><th scope="col">Treaty</th><th scope="col">${esc(stateName(A))}</th><th scope="col">${esc(stateName(B))}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
