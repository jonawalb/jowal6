// Real-world examples panel for Nuclear Entanglement: sourced cards, filterable by asset category.
import { EXAMPLES } from '../data/examples.js';
import { CATS } from './model.js';
import { escapeHtml as esc } from '../../../shared/js/mapkit.js';

export function renderWorld(root, onShow) {
  const filters = [['all', 'All'], ...CATS.map(c => [c.id, c.short])];
  root.innerHTML = `<div class="cases-h"><div><h2>Entanglement in real forces</h2>
    <p>Public, sourced examples of assets and forces that serve both conventional and nuclear missions. Each card names the model category it illustrates. The reading line is this tool’s interpretation.</p></div>
    <div class="seg" role="group" aria-label="Filter examples by category">${filters.map(([v, t], i) => `<button type="button" data-f="${v}" aria-pressed="${i === 0}">${t}</button>`).join('')}</div></div>
    <div class="cgrid">${EXAMPLES.map(card).join('')}</div>`;
  root.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
    root.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const f = b.dataset.f;
    root.querySelectorAll('.ccard').forEach(c => { c.hidden = !(f === 'all' || c.dataset.cats.split(',').includes(f)); });
  }));
  root.querySelectorAll('[data-show]').forEach(b => b.addEventListener('click', () => onShow(b.dataset.show.split(','))));
}

function card(x) {
  const names = x.cats.map(id => CATS.find(c => c.id === id).short).join(', ');
  return `<article class="ccard" data-cats="${x.cats.join(',')}">
    <div class="meta"><span class="num">${esc(x.year)}</span><span>${esc(x.who)}</span><span class="dtag">${esc(x.kind)}</span></div>
    <h3>${esc(x.title)}</h3>
    <p>${esc(x.text)}</p>
    <p class="reading"><b>Model reading.</b> ${esc(x.reading)}</p>
    <button type="button" class="btn" data-show="${x.cats.join(',')}">Show ${esc(names)} in the planner</button>
    <ul class="src">${x.sources.map(s => `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a></li>`).join('')}</ul>
  </article>`;
}
