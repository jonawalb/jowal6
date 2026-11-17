// Narrative Games and Models: one door to the disinformation games and models. The list lives in ../data/ so the
// build seals it with this section's password; the tools it links to share that password, which this tab then remembers.
import { INTRO, GROUPS, FOOT } from '../data/games.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
document.getElementById('ng-intro').textContent = INTRO;
document.getElementById('ng-foot').textContent = FOOT;
document.getElementById('ng-groups').innerHTML = GROUPS.map(g => `<section class="ng-group" aria-labelledby="ng-${esc(g.id)}">
  <h2 id="ng-${esc(g.id)}">${esc(g.name)}</h2><p>${esc(g.blurb)}</p>
  <ul class="ng-list">${g.tools.map(t => `<li><a href="../${esc(t.slug)}/">
    <span class="ng-kind">${esc(t.kind)}</span><h3>${esc(t.title)}</h3>
    <p class="ng-q"><span>Question: </span>${esc(t.question)}</p><p>${esc(t.line)}</p>
    <span class="ng-open" aria-hidden="true">Open →</span></a></li>`).join('')}</ul></section>`).join('');
