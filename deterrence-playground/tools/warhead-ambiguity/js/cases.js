// Case cards for Is It a Nuke? Sourced false alarms and ambiguous-missile episodes; some load a model setup.
import { CASES } from '../data/cases.js';
import { escapeHtml as esc } from '../../../shared/js/mapkit.js';

const FILTERS = [['all', 'All'], ['post', 'Incoming warning'], ['pre', 'Before launch']];

export function renderCases(root, onLoad) {
  root.innerHTML = `<div class="cases-h"><div><h2>Cases</h2>
    <p>False alarms and ambiguous launches from the public record. Cases with a setup load an approximation of the observer’s position into the model; the setup is this tool’s reading, not the sources’. Two pre-launch cases from Acton show the same errors before anything is fired.</p></div>
    <div class="seg" role="group" aria-label="Filter cases">${FILTERS.map(([v, t], i) => `<button type="button" data-f="${v}" aria-pressed="${i === 0}">${t}</button>`).join('')}</div></div>
    <div class="cgrid">${CASES.map(card).join('')}</div>`;
  root.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
    root.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const f = b.dataset.f;
    root.querySelectorAll('.ccard').forEach(c => { c.hidden = !(f === 'all' || c.dataset.k === f); });
  }));
  root.querySelectorAll('[data-load]').forEach(b => b.addEventListener('click', () => onLoad(CASES.find(c => c.id === b.dataset.load).preset)));
}

function card(c) {
  return `<article class="ccard" data-k="${c.preset ? 'post' : 'pre'}">
    <div class="meta"><span class="num">${esc(c.year)}</span><span>${esc(c.who)}</span><span class="dtag" data-k="${c.preset ? 'post' : 'pre'}">${esc(c.kind)}</span></div>
    <h3>${esc(c.title)}</h3>
    <p>${esc(c.text)}</p>
    <p class="reading"><b>Model reading.</b> ${esc(c.reading)}</p>
    ${c.preset ? `<button type="button" class="btn" data-load="${c.id}">Load this setup</button>` : ''}
    <ul class="src">${c.sources.map(s => `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a></li>`).join('')}</ul>
  </article>`;
}
