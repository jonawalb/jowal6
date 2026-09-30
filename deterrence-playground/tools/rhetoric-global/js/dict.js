// Below-the-fold readouts: the phrase dictionary with its corpus evidence, and the key-event list.
import { COUNTRIES, CC, fmtN, fmtDate, phraseRe, mark, escapeHtml } from './model.js';

function example([d, q, u, t], re) {
  return `<span class="num">${d}</span> <a href="${escapeHtml(u)}" target="_blank" rel="noopener" title="${escapeHtml(t)}">source</a><br><q>${mark(q, re)}</q>`;
}

export function renderDictionary(box) {
  box.innerHTML = CC.map(cc => {
    const C = COUNTRIES[cc];
    const rows = C.cats.map(cat => C.phrases.filter(p => p.cat === cat).map((p, i) => {
      const re = phraseRe(p.re);
      return `<tr>${i === 0 ? `<th scope="rowgroup" rowspan="${C.phrases.filter(x => x.cat === cat).length}" class="d-cat">${escapeHtml(cat)}</th>` : ''}
        <th scope="row">${escapeHtml(p.label)}<br><code>${escapeHtml(p.re)}</code></th>
        <td class="num">${fmtN(p.nDocs)}<br><span class="fine">${fmtN(p.total)} uses</span></td>
        <td class="ex">${example(p.ex[0], re)}</td><td class="ex">${example(p.ex[1], re)}</td></tr>`;
    }).join('')).join('');
    const dropped = C.dropped.length
      ? `<p class="fine">Tested and left out (fewer than 8 ${C.stream.unit}s): ${C.dropped.map(d => `${escapeHtml(d.label)} (${d.nDocs})`).join(', ')}.</p>` : '';
    return `<h3 class="mt">${escapeHtml(C.name)}: ${escapeHtml(C.stream.name)}</h3>
      <div class="tablewrap"><table class="dict"><thead><tr><th>Category</th><th>Phrase and pattern</th><th>${escapeHtml(C.stream.unit[0].toUpperCase() + C.stream.unit.slice(1))}s</th><th>Earliest use in corpus</th><th>Latest use</th></tr></thead>
      <tbody>${rows}</tbody></table></div>${dropped}`;
  }).join('');
}

export function renderEvents(list, EVENTS, cc, onPick) {
  list.innerHTML = `<p class="fine">${escapeHtml(COUNTRIES[cc].name)}. Click an event to move the selection to its week.</p>` + EVENTS[cc].map((e, i) => `<li>
    <button type="button" class="ev-go" data-i="${i}"><span class="num">${fmtDate(e.date)}${e.end ? ' – ' + fmtDate(e.end) : ''}</span> <b>${escapeHtml(e.name)}</b></button>
    <span class="ev-src">${e.src.map(([n, u]) => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(n)}</a>`).join(' · ')}</span></li>`).join('');
  list.querySelectorAll('.ev-go').forEach(b => b.addEventListener('click', () => onPick(EVENTS[cc][+b.dataset.i])));
}
