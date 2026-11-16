// Debates: the live arguments inside each country and between them. Camps, named holders, sources.
import { DEBATES } from '../data/policy.js';
import { C, esc, ext, host, noteHTML } from './common.js';

export const SCOPES = [
  { id: 'all', name: 'All' },
  { id: 'US', name: 'Inside the US' },
  { id: 'CN', name: 'Inside China' },
  { id: 'RU', name: 'Inside Russia' },
  { id: 'INTL', name: 'Between them' },
];

export function debatesHTML(scope, open) {
  const list = DEBATES.filter(d => scope === 'all' || d.scope === scope);
  if (!list.length) return '<p class="fine">No debates in this group.</p>';
  return list.map(d => {
    const c = C[d.scope];
    const camps = d.camps.map((cp, i) => `<div class="ap-camp" data-i="${i}">
      <h4>${esc(cp.label)}</h4>
      <p>${esc(cp.view)}</p>
      <ul class="ap-holders">${cp.holders.map(h => `<li><b>${esc(h.name)}</b>${h.note ? ` ${noteHTML(h.note, h.noteEn)}` : ''} ${ext(h.source, host(h.source) || 'source')}</li>`).join('')}</ul>
    </div>`).join('');
    return `<article class="card ap-debate" id="deb-${esc(d.id)}">
      <header><p class="eyebrow"><span class="ap-cdot" style="background:${c.color}"></span>${esc(c.id === 'INTL' ? 'Between governments' : 'Inside ' + (c.id === 'US' ? 'the United States' : c.name))}</p>
      <h3>${esc(d.title)}</h3><p class="ap-dq">${esc(d.question)}</p></header>
      <div class="ap-camps" style="--n:${Math.min(3, d.camps.length)}">${camps}</div>
      ${d.status ? `<p class="ap-dstat"><b>Where it stands.</b> ${esc(d.status)}</p>` : ''}
      ${d.sources?.length ? `<details${open ? ' open' : ''}><summary>Sources (${d.sources.length})</summary><ul class="src">${d.sources.map(u => `<li>${ext(u, u)}</li>`).join('')}</ul></details>` : ''}
    </article>`;
  }).join('');
}
