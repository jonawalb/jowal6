// "Whose count?": this tool's totals beside each published tally, and the rules that explain the gaps.
import { COUNTS, NOTES } from '../data/reconcile.js';
import { STATE_COLOR, SHORT, fmt, esc } from './common.js';

export function renderRecon(host, tests) {
  const mine = SHORT.map((_, i) => tests.filter(t => t[1] === i).length);
  const cell = (v, ref) => `<td class="num${ref != null && v != null && v !== ref ? ' diff' : ''}">${v == null ? '–' : fmt(v)}</td>`;
  const rows = [{ src: 'This tool', note: 'SIPRI/FOA list minus combat uses, plus the 1972 gap row and six USGS-recorded North Korean tests.', total: tests.length, by: mine, hl: true }, ...COUNTS];
  host.innerHTML = `<p class="fine">The same tests, counted by different rules. Figures that differ from this tool's are marked.</p>
    <div class="tablewrap"><table>
      <thead><tr><th>Source</th><th class="num">Total</th>${SHORT.map((s, i) => `<th class="num"><span class="sw-dot" style="background:${STATE_COLOR[i]}"></span>${s}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr class="${r.hl ? 'hl' : ''}"><td>${r.url ? `<a href="${r.url}" target="_blank" rel="noopener">${esc(r.src)}</a>` : esc(r.src)}<br><small class="fine">${esc(r.note)}</small></td>
        ${cell(r.total, r.hl ? null : tests.length)}${r.by.map((v, i) => cell(v, r.hl ? null : mine[i])).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <ul>${NOTES.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`;
}
