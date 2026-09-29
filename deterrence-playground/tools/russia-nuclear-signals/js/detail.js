// Chronological list and the detail panel for one item.
import { escapeHtml as esc } from '../../../shared/js/mapkit.js';
import { LEVELS, when, colorOf, typeName, fdate } from './model.js';

const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const lvl = v => LEVELS.find(l => l.v === v);

export function renderList(el, list, S, onPick) {
  const sorted = [...list].sort((a, b) => (when(a) < when(b) ? -1 : 1));
  if (!sorted.length) { el.innerHTML = '<li class="none">Nothing matches the filters.</li>'; return; }
  el.innerHTML = sorted.map(e => `<li class="it it-${e.group}${e.id === S.sel ? ' on' : ''}">
    <button type="button" data-id="${e.id}" aria-pressed="${e.id === S.sel}">
      <span class="it-d num">${fdate(e)}</span>
      <span class="it-k"><i style="background:${colorOf(e)}"></i>${esc(typeName(e))}${e.group === 'russia' ? ` <b class="lvpill">L${e.level}</b>` : ''}</span>
      <span class="it-t">${esc(e.title)}</span>
      <span class="it-a">${esc(e.actor)}</span>
    </button></li>`).join('');
  el.querySelectorAll('button').forEach(b => { b.onclick = () => onPick(b.dataset.id); });
}

export function renderDetail(el, e, nav) {
  if (!e) {
    el.innerHTML = `<p class="eyebrow">Selected item</p><p class="fine">Click a mark on the timeline or a row in the list. Circles are Russian signals, placed by the level in the coding scheme. Squares are Western and NATO responses. Diamonds are battlefield moments.</p>`;
    return;
  }
  const L = e.group === 'russia' ? lvl(e.level) : null;
  el.innerHTML = `<div class="d-nav"><p class="eyebrow">${fdate(e)}</p>
      <span><button type="button" class="btn" data-n="-1" aria-label="Previous item">‹</button><button type="button" class="btn" data-n="1" aria-label="Next item">›</button></span></div>
    <h3 class="d-h">${esc(e.title)}</h3>
    <p class="d-meta"><span class="pill" style="color:${colorOf(e)}">${esc(typeName(e))}</span> ${esc(e.actor)}</p>
    ${L ? `<div class="d-lv"><div class="lvbar" aria-hidden="true">${LEVELS.filter(l => l.v > 0).map(l => `<i class="${l.v <= e.level ? 'on' : ''}"></i>`).join('')}</div>
      <p><b>Level ${L.v}: ${L.n}.</b> <span class="fine">${L.d}</span></p>
      ${e.why ? `<p class="fine"><b>Coding note:</b> ${esc(e.why)}</p>` : ''}</div>` : ''}
    <p>${esc(e.summary)}</p>
    ${e.quote ? `<blockquote>“${esc(e.quote)}”</blockquote>` : ''}
    <p class="eyebrow">Sources</p>
    <ul class="d-src">${e.src.map(([n, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a> <span class="fine">${esc(host(u))}</span></li>`).join('')}</ul>`;
  el.querySelectorAll('[data-n]').forEach(b => { b.onclick = () => nav(+b.dataset.n); });
}
