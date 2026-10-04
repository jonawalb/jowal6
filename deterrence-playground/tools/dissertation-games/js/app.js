// Jon Dissertation Games: a list of game trees and a viewer. All content lives in ../data/ so the
// build seals it with this tool's own password.
import { GAMES } from '../data/games.js';

const list = document.getElementById('dg-list');
const view = document.getElementById('dg-view');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const blobs = {};

/** Fetch a data file (decrypted by the gate on the published site) and return an object URL for it. */
async function fileUrl(name) {
  if (!blobs[name]) {
    const r = await fetch(new URL(`../data/${name}`, import.meta.url));
    if (!r.ok) throw new Error(`${name}: ${r.status}`);
    blobs[name] = URL.createObjectURL(await r.blob());
  }
  return blobs[name];
}

async function show(id) {
  const g = GAMES.find(x => x.id === id) || GAMES[0];
  list.querySelectorAll('button').forEach(b => b.setAttribute('aria-current', String(b.dataset.id === g.id)));
  history.replaceState(null, '', `#${g.id}`);
  view.innerHTML = `<h2>${esc(g.title)}</h2>
    <p class="dg-meta">${esc(g.status)} · version ${esc(g.version)} · ${esc(g.date)}</p>
    ${g.summary.map(p => `<p>${esc(p)}</p>`).join('')}
    <div class="dg-actions"><a class="btn" id="dg-pdf" download="${esc(g.pdf)}" href="#">Download the PDF</a></div>
    <figure class="dg-fig"><div class="dg-scroll" tabindex="0" role="region" aria-label="Game tree figure (scrolls sideways on small screens)"><img id="dg-img" alt="${esc(g.alt)}"></div>
      <figcaption class="dg-cap"><span class="dg-narrow">Swipe sideways to read the tree, or </span><a id="dg-full" href="#" target="_blank" rel="noopener">open the figure full size</a>.</figcaption></figure>
    <h3>Variables</h3>
    <table class="dg-vars"><tbody>${g.variables.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
    <h3>How it plays</h3>
    ${g.notes.map(p => `<p>${esc(p)}</p>`).join('')}`;
  try {
    document.getElementById('dg-img').src = await fileUrl(g.image);
    document.getElementById('dg-full').href = await fileUrl(g.image);
    document.getElementById('dg-pdf').href = await fileUrl(g.pdf);
  } catch (e) {
    view.insertAdjacentHTML('beforeend', `<p class="dg-note">Could not load the figure (${esc(e.message)}).</p>`);
  }
}

list.innerHTML = GAMES.map(g => `<button type="button" data-id="${esc(g.id)}"><b>${esc(g.title)}</b><span>${esc(g.short)}</span></button>`).join('');
list.addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(b.dataset.id); });
show(location.hash.slice(1));
