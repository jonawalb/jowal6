// Cost Ratio Bargaining: case cards from the paper's Appendix A. "Load" places the case at a notional kappa.
import { CASES } from '../data/cases.js';

const TAU = { D: 'Denial', V: 'Survival' };
export function renderCases(root, onLoad) {
  root.innerHTML = `<div class="cases-h"><h2>The paper’s cases</h2>
    <p>Appendix A of the paper traces four conflicts through strategic type, target geometry, cost exchange and outcome. The codings below are the paper’s. The paper says only whether κ is above or below 1, so the κ each card loads is a <span class="notional">notional</span> placement on the right side of 1.</p></div>
    <div class="cgrid">${CASES.map(c => `<article class="ccard">
      <h3>${c.title}</h3>
      <p class="meta"><span class="dtag" data-t="${c.tau}">${TAU[c.tau]}</span><span>κ ${c.regime === 'high' ? '&gt; 1' : '&lt; 1'}</span><span>Outcome code ${c.outcome}</span><span class="ptag">Paper § ${c.sec}</span></p>
      <p class="reading">${c.reading}</p>
      ${c.links.length ? `<ul class="src">${c.links.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${t}</a></li>`).join('')}</ul>` : ''}
      <button type="button" class="btn" data-id="${c.id}">Load at κ = ${c.k} <span class="notional">notional</span></button>
    </article>`).join('')}</div>`;
  root.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => onLoad(CASES.find(c => c.id === b.dataset.id))));
}
