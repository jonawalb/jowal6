// Compare two states element by element, using the statements on record as of the chosen year.
import { STATES, ELEMENTS, GAPS } from '../data/policies.js';
import { STATE_COLOR, esc, inForce, quoteHTML, emptyLabel } from './common.js';

export function fillSelects(a, b) {
  const opts = STATES.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  a.innerHTML = opts; b.innerHTML = opts;
}

export function renderCompare(host, state) {
  const [A, B] = state.cmp;
  const sa = STATES.find(s => s.id === A), sb = STATES.find(s => s.id === B);
  const cell = (st, el) => {
    const q = inForce(st, el, state.asOf);
    if (q) return `<span class="dp-tag" data-k="${esc(q.kind || 'stmt')}">${esc(q.tag)}</span>${quoteHTML(q)}`;
    const gap = GAPS.find(g => g.state === st && g.el === el);
    const lbl = emptyLabel(st, el, state.asOf);
    return `<span class="dp-tag" data-k="none">${lbl}</span>${gap && lbl === 'Not declared' ? `<p class="fine">${esc(gap.note)}</p>` : ''}`;
  };
  const head = s => `<span class="sw-dot" style="background:${STATE_COLOR[s.id]}"></span>${esc(s.name)}`;
  host.innerHTML = `<div class="dp-cmp">
    <div class="dp-cmp-h"><span></span><h3>${head(sa)}</h3><h3>${head(sb)}</h3></div>
    ${ELEMENTS.filter(e => state.els.has(e.id)).map(e => `<div class="dp-cmp-r">
      <h4>${esc(e.name)}</h4>
      <div><p class="dp-cmp-who">${head(sa)}</p>${cell(A, e.id)}</div>
      <div><p class="dp-cmp-who">${head(sb)}</p>${cell(B, e.id)}</div></div>`).join('')}
  </div>`;
}
