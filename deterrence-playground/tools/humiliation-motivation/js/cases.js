// Humiliation to Motivation: case cards from the paper. "Place on the map" loads a notional (s, lambda) point.
import { CASES } from '../data/cases.js';
import { KINDS } from './model.js';

export function renderCases(root, onLoad) {
  root.innerHTML = `<div class="cases-h"><h2>The paper’s cases</h2>
    <p>The paper illustrates the model with Germany, Japan, China and Russia. It describes severity and legitimacy in words (“λ approximately zero”), so each card places the case at a <span class="notional">notional</span> point on the map that matches the paper’s reading. The cases illustrate the mechanism; they are not tests.</p></div>
    <div class="cgrid">${CASES.map(c => `<article class="ccard">
      <h3>${c.title}</h3>
      <p class="meta"><span class="dtag" data-k="${c.eq}">${KINDS[c.eq].label}</span><span class="ptag">Paper ${c.sec}</span></p>
      <p class="reading">${c.reading}</p>
      <ul class="src">${c.links.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${t}</a></li>`).join('')}</ul>
      <button type="button" class="btn" data-id="${c.id}">Place on the map <span class="notional">notional</span></button>
    </article>`).join('')}</div>`;
  root.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => onLoad(CASES.find(c => c.id === b.dataset.id))));
}
