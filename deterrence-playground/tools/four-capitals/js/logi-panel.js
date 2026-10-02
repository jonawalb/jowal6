// The logistics table (Have / Committed / Left / Next month for Lift, fuel, munitions and readiness) and the list
// of every decision still open this month with its cost, greyed when you cannot afford it. Repaints live.
import { SEA, AREA_LABEL, STANCE_LABEL } from '../data/theater.js';
import { RES, RES_LABEL, RES_TEXT, UPKEEP, FBY } from '../data/formations.js';
import { ACTIONS, BY_ID, LINE_SHORT, MAX_MOVES, answers } from '../data/actions.js';
import { costOf, costText } from './logistics.js';
import { addWhy } from './decide.js';
import { orderOptions, EMPH } from './forces-panel.js';

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
  return `Left after your choices: Lift ${n1(r.lift.left)}, fuel ${n1(r.fuel.left)} after upkeep, munitions ${n1(r.mun.left)}${L.upkeep.mun ? ` (after an expected ${n1(L.upkeep.mun)} in combat)` : ''}, readiness ${Math.round(r.ready.left)} on average.${warn.length ? ' <b class="bad">' + warn.map(esc).join(' ') + '</b>' : ''}`;
}

function openHTML(G) {
  const me = G.player, ch = G.choice, L = G.L, left = MAX_MOVES - ch.actions.length;
  const moves = ACTIONS[me].filter(a => !ch.actions.includes(a.id) && (!a.avail || a.avail(G.s)) && (a.unlock == null || G.s.rung >= a.unlock) && (a.maxRung == null || G.s.rung <= a.maxRung));
  const mv = moves.map(a => {
    const w = addWhy(G, L, a.id), ct = costText(costOf(a.id, answers(a.id, ch.follow[a.id]))) || 'free';
    return `<li class="${w ? 'off' : ''}"><span class="ln">${LINE_SHORT[a.line]}</span> ${esc(a.label)} <span class="c">${ct}</span>${w ? ` <em>${esc(w.kind === 'cost' ? 'can’t afford' : w.why)}</em>` : ` <button type="button" class="k4-add" data-add="${a.id}" aria-label="Add: ${esc(a.label)}">Add</button>`}</li>`;
  }).join('');
  const t = L.trial;
  const fo = G.s.units[me].map(u => {
    const o = ch.orders.moves.find(m => m[0] === u.id), f = FBY[u.id];
    const opts = orderOptions(G, u).filter(x => !(f.type === 'strike' && (u.focus || 'none') === x.to));
    if (!opts.length) return '';
    return `<li><b>${esc(f.short)}</b> <span class="muted">(${u.at === 'transit' ? 'in transit' : AREA_LABEL[u.at]}${o ? `, ordered to the ${AREA_LABEL[o[1]] || o[1]}` : ''})</span>: ${opts.map(x =>
      `<span class="${x.ok ? '' : 'off'}">${esc(x.label.replace(/^→ /, ''))} <span class="c">${x.cost.lift || x.cost.fuel ? `Lift ${n1(x.cost.lift)} · Fuel ${n1(x.cost.fuel)}` : 'free'}</span>${x.ok ? '' : ' <em>can’t afford</em>'}</span>`).join(' · ')}</li>`;
  }).join('');
  const st = SEA.filter(a => t.units[me].some(u => u.at === a && u.str > 0)).map(a => {
    const cur = ch.orders.stance[a] || G.s.stance[me][a], k = t.units[me].filter(u => u.at === a && u.str > 0).length;
    return `<li><b>${AREA_LABEL[a]}</b> <span class="muted">(${STANCE_LABEL[cur]})</span>: ${['defend', 'contest', 'attack'].filter(x => x !== cur).map(x => {
      const d = k * (UPKEEP.fuel[x] - UPKEEP.fuel[cur]), ok = d <= Math.max(0, L.rows.fuel.left) + 1e-9;
      return `<span class="${ok ? '' : 'off'}">${STANCE_LABEL[x]} <span class="c">Fuel ${sign(d)}/mo</span>${ok ? '' : ' <em>can’t afford</em>'}</span>`;
    }).join(' · ')}</li>`;
  }).join('');
  const em = EMPH[me];
  return `<details class="k4-open" open><summary>Everything else you could still do this month</summary>
    <h4>Moves <span class="muted">(${left} of ${MAX_MOVES} left)</span></h4>${left > 0 ? `<ul>${mv || '<li>None on the menu.</li>'}</ul>` : `<p class="fine">You have chosen ${MAX_MOVES} moves. Remove one to add another.</p>`}
    ${fo ? `<h4>Force orders</h4><ul>${fo}</ul>` : ''}${st ? `<h4>Stances</h4><ul>${st}</ul>` : ''}
    ${em ? `<h4>${em[0]}</h4><p class="fine">Free. Now: ${AREA_LABEL[ch.orders.emph || G.s.emph[me]]}.</p>` : ''}</details>`;
}

export function paintLogi(G) {
  $('logi').innerHTML = tableHTML(G.L);
  const sum = summary(G);
  if ($('logi-sum').innerHTML !== sum) $('logi-sum').innerHTML = sum;   // a persistent live region: only changes are announced
  $('logi-open').innerHTML = openHTML(G);
}
