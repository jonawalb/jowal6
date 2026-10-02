// The logistics table (Have / Committed / Left / Next month for Lift, fuel, munitions and readiness) and the
// warnings when your choices cannot all be paid for. Repaints live. (What is left also shows in the Forces step's
// counter and the step bar, js/steps.js; each move and order shows its own cost.)
import { RES, RES_LABEL, RES_TEXT } from '../data/formations.js';
import { BY_ID } from '../data/actions.js';

const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n1 = x => { const v = Math.round(x * 10) / 10; return Object.is(v, -0) ? 0 : v; };
const sign = x => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(n1(x));

function tableHTML(L) {
  const cell = (k, v, kind) => (k === 'ready' && kind !== 'have' && kind !== 'left' ? sign(kind === 'committed' ? -v : v) : n1(v));
  return `<div class="k4-scroll"><table class="k4-logi"><caption>Logistics this month</caption>
    <thead><tr><th scope="col">Resource</th><th scope="col">Have</th><th scope="col">Committed</th><th scope="col">Left</th><th scope="col">Next<span class="k4-long"> month</span></th></tr></thead><tbody>
    ${RES.map(k => { const r = L.rows[k]; return `<tr><th scope="row" title="${esc(RES_TEXT[k])}">${RES_LABEL[k]}${k === 'ready' ? ' <small>avg</small>' : ''}</th>
      <td class="num">${cell(k, r.have, 'have')}</td><td class="num">${cell(k, r.committed, 'committed')}</td>
      <td class="num ${r.left < 0 || (k === 'ready' && r.left < 50) ? 'bad' : ''}">${cell(k, r.left, 'left')}</td><td class="num">${k === 'lift' ? n1(r.next) : sign(r.next)}</td></tr>`; }).join('')}
    </tbody></table></div>`;
}

function summary(G) {
  const L = G.L, r = L.rows, warn = [];
  if (r.fuel.left < 0) warn.push('Not enough fuel for this month’s upkeep: your stances will fall back a step.');
  for (const [id, k] of Object.entries(L.refused)) warn.push(`${BY_ID[id].label}: not enough ${RES_LABEL[k].toLowerCase()} with your other choices, so it will not be carried out.`);
  for (const l of L.orderLog) if (!l.ok) warn.push(`Order ${l.text}.`);
  const combat = L.upkeep.mun ? `Munitions left allow for an expected ${n1(L.upkeep.mun)} spent in combat.` : '';
  return [combat, warn.length ? '<b class="bad">' + warn.map(esc).join(' ') + '</b>' : ''].filter(Boolean).join(' ');
}

export function paintLogi(G) {
  $('logi').innerHTML = tableHTML(G.L);
  const sum = summary(G);
  if ($('logi-sum').innerHTML !== sum) $('logi-sum').innerHTML = sum;   // a persistent live region: only changes are announced
}
