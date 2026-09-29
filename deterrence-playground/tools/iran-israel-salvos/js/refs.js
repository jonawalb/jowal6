// Numbered source references: [n] links to the numbered list under "Sources".
import { SRC } from '../data/sources.js';
import { EPISODES, PROVISIONAL_2026 } from '../data/episodes.js';
import { INTERCEPTORS, THREATS } from '../data/costs.js';

const ORDER = [];
const add = keys => (keys || []).forEach(k => { if (SRC[k] && !ORDER.includes(k)) ORDER.push(k); });
EPISODES.forEach(e => {
  Object.values(e.launched).forEach(f => add(f.src));
  e.funnel.forEach(f => add(f.src));
  add(e.drones?.src); add(e.rate.src); add(e.casualties.src);
  e.disagree.forEach(d => add(d.src)); e.defenders.forEach(d => add(d.src));
  Object.values(e.systems).forEach(s => add(s.src)); e.costs.forEach(c => add(c.src));
});
add(PROVISIONAL_2026.src);
INTERCEPTORS.forEach(i => add(i.src)); THREATS.forEach(t => add(t.src));
Object.keys(SRC).forEach(k => add([k]));

export const refNum = k => ORDER.indexOf(k) + 1;
/** Superscript-style reference links for a list of source keys. */
export const refs = keys => (keys || []).filter(k => SRC[k]).map(k =>
  `<a class="ii-src-ref" href="#src-${k}" title="${SRC[k].t.replace(/"/g, '&quot;')}">[${refNum(k)}]</a>`).join('');

export function renderSources(ol) {
  ol.innerHTML = ORDER.map(k => `<li id="src-${k}"><a href="${SRC[k].u}" target="_blank" rel="noopener">${SRC[k].t}</a></li>`).join('');
}
