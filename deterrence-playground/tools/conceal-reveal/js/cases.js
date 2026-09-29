// Case cards: historical disclosure decisions, filterable, each linked to a cell of the type grid.
import { CASES } from '../data/cases.js';
import { escapeHtml as esc } from '../../../shared/js/mapkit.js';

const DLABEL = { reveal: 'Revealed', conceal: 'Concealed', partial: 'Partial', deny: 'Detected, denied' };
const FILTERS = [['all', 'All'], ['reveal', 'Revealed'], ['conceal', 'Concealed'], ['partial', 'Partial or denied'], ['paper', 'Cases in the paper']];

export function renderCases(root, onShow) {
  root.innerHTML = `<div class="cases-h"><div><h2>Cases</h2>
    <p>Episodes the paper uses, and others with public records. The reading line says where each sits in the model. Readings for cases outside the paper are this tool’s, not the paper’s coding.</p></div>
    <div class="seg" role="group" aria-label="Filter cases">${FILTERS.map(([v, t], i) => `<button type="button" data-f="${v}" aria-pressed="${i === 0}">${t}</button>`).join('')}</div></div>
    <div class="cgrid">${CASES.map(card).join('')}</div>`;
  root.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
    root.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const f = b.dataset.f;
    root.querySelectorAll('.ccard').forEach(c => {
      const d = c.dataset.d, paper = c.dataset.paper === '1';
      c.hidden = !(f === 'all' || (f === 'paper' ? paper : f === 'partial' ? (d === 'partial' || d === 'deny') : d === f));
    });
  }));
  root.querySelectorAll('[data-show]').forEach(b => b.addEventListener('click', () => onShow(b.dataset.show.split(','))));
}

function card(c) {
  return `<article class="ccard" data-d="${c.disclosure}" data-paper="${c.inPaper ? 1 : 0}">
    <div class="meta"><span class="num">${esc(c.year)}</span><span>${esc(c.actor)}</span><span class="dtag" data-d="${c.disclosure}">${DLABEL[c.disclosure]}</span>
      <span class="ptag">${c.inPaper ? 'In the paper' : 'Added here'}</span></div>
    <h3>${esc(c.title)}</h3>
    <p>${c.summary}</p>
    <p class="reading"><b>Model reading.</b> ${c.reading}</p>
    ${c.cells ? `<button type="button" class="btn" data-show="${c.cells.join(',')}">Show in the type grid</button>` : ''}
    <ul class="src">${c.sources.map(s => `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a></li>`).join('')}</ul>
  </article>`;
}
