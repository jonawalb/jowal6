// Compare: one issue, three countries side by side, each with the passages its official texts contain.
import { ISSUES, POSITIONS } from '../data/policy.js';
import { C, D, esc, dateText, ext, host, quoteHTML } from './common.js';

export function issueButtons(sel) {
  return ISSUES.map(i => `<button type="button" data-issue="${i.id}" aria-pressed="${i.id === sel}"><b>${esc(i.name)}</b><small>${esc(i.help)}</small></button>`).join('');
}

export function compareHTML(issueId) {
  const issue = ISSUES.find(i => i.id === issueId) || ISSUES[0];
  const pos = POSITIONS[issue.id] || {};
  const cols = ['US', 'CN', 'RU'].map(k => {
    const p = pos[k];
    const c = C[k];
    if (!p) return `<article class="ap-col" style="--col:${c.color}"><h3>${esc(c.name)}</h3><p class="fine">No entry.</p></article>`;
    const cites = (p.cites || []).map(ci => {
      const d = D[ci.doc];
      return `<li>${quoteHTML(ci.quote, ci.quoteEn)}
        <p class="fine">${d ? `<a href="#" class="ap-jump" data-id="${esc(d.id)}" title="Show on the timeline">${esc(d.title)}</a>, ${esc(dateText(d.date, d.datePrecision))}` : ''}${ci.where ? `, ${esc(ci.where)}` : ''}. ${ext(ci.url, host(ci.url) || 'Source')}</p></li>`;
    }).join('');
    return `<article class="ap-col" style="--col:${c.color}">
      <h3><span class="ap-cdot" style="background:${c.color}"></span>${esc(c.name)}</h3>
      <p class="ap-stance">${esc(p.stance)}</p>
      ${cites ? `<ol class="ap-cites">${cites}</ol>` : '<p class="fine">No official text cited.</p>'}
    </article>`;
  }).join('');
  return `<p class="ap-issue-lede">${esc(issue.lede || issue.help)}</p><div class="ap-cols">${cols}</div>`;
}
