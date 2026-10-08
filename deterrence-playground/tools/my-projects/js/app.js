// My Projects: one door to Jonathan Walberg's working models. The list lives in ../data/ so the build seals it
// with this tool's password; the projects it links to share that password, which this tab then remembers.
import { PROJECTS } from '../data/projects.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
document.getElementById('mp-list').innerHTML = PROJECTS.map(p => `<li><a href="${esc(p.href)}">
  <h2>${esc(p.title)}</h2><p>${esc(p.blurb)}</p><p class="mp-meta">${esc(p.meta)}</p></a></li>`).join('');
