// The Forces step: your formations (where, strength, readiness) with one order each, a summary of the stance per sea
// area (set on the map, js/area-pop.js), and for Beijing, Taipei and Washington the coast of Taiwan they put their
// emphasis on. Costs come from the ledger.
import { SEA, COAST, AREA_LABEL, AREA_TEXT, moveCost } from '../data/theater.js';
import { FBY, TYPES, placesFor } from '../data/formations.js';
import { orderCheck, arrivalDelay, etaText } from './forces.js';
import { infoBtn } from './tips.js';
import { stanceSummary } from './area-pop.js';

const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n1 = x => +(+x).toFixed(1);
export const EMPH = {
  cn: ['Landing emphasis', 'The coast a landing goes for, and where air-defence strikes hit hardest. The others do not see it until you use it. It matters from Limited strikes up.'],
  tw: ['Reserve emphasis', 'If China lands here, your inland reserve counts in full; elsewhere it counts 40%. China does not see this choice.'],
  us: ['Fires emphasis', 'From Limited strikes up, U.S. fires meet a landing on this coast (−10 to its odds, 1 munition). China does not see this choice.'],
};

/** Order options for one formation, each with its cost and whether you can still afford it. */
export function orderOptions(G, u) {
  const me = G.player, s = G.s, f = FBY[u.id], o = G.choice.orders.moves.find(m => m[0] === u.id);
  if (f.type === 'strike') return ['none', ...SEA].map(a => ({ to: a, label: a === 'none' ? 'Hold fire' : `Aim: ${AREA_LABEL[a]}`, cost: { lift: 0, fuel: 0 }, ok: true }));
  if (u.at === 'transit') return [];
  const own = o ? orderCheck(s, me, o, null) : {};
  const avail = { lift: G.L.free.lift + (own.lift || 0), fuel: G.L.free.fuel + (own.fuel || 0) };
  return placesFor(u.id).filter(a => a !== u.at && moveCost(u.at, a) != null).map(a => {
    const c = orderCheck(s, me, [u.id, a], null);
    const wait = me === 'us' && u.at === 'rear' ? arrivalDelay(s, me, G.choice.actions.includes('us_surge')) : 0;
    return { to: a, label: `→ ${AREA_LABEL[a]}${wait ? ` (${etaText(s.turn + wait).replace('arrives ', '')})` : ''}`, cost: { lift: c.lift, fuel: c.fuel }, ok: !c.why && c.lift <= avail.lift + 1e-9 && c.fuel <= avail.fuel + 1e-9 };
  });
}

export function paintForces(G) {
  const me = G.player, s = G.s, ch = G.choice;
  const rows = s.units[me].map(u => {
    const f = FBY[u.id], o = ch.orders.moves.find(m => m[0] === u.id), opts = orderOptions(G, u);
    const where = u.at === 'transit' ? `In transit to the ${AREA_LABEL[u.to]}, ${etaText(u.eta ?? s.turn)}` : f.type === 'strike' ? `Rear, aimed at ${u.focus && u.focus !== 'none' ? 'the ' + AREA_LABEL[u.focus] : 'nothing'}` : AREA_LABEL[u.at];
    const cur = o ? o[1] : f.type === 'strike' ? (u.focus || 'none') : '';
    const sel = !opts.length ? `<span class="muted">${u.at === 'transit' ? etaText(u.eta ?? s.turn).replace(/^a/, 'A') : f.type === 'land' ? 'Stays home; can follow a landing' : 'Cannot move'}</span>`
      : `<select data-ord="${u.id}" aria-label="Order for ${esc(f.name)}">${f.type === 'strike' ? '' : `<option value="">Stay</option>`}${opts.map(x =>
        `<option value="${x.to}" ${cur === x.to ? 'selected' : ''} ${x.ok || cur === x.to ? '' : 'disabled'}>${esc(x.label)}${x.cost.lift || x.cost.fuel ? ` · ${[x.cost.lift ? `${n1(x.cost.lift)} lift` : '', x.cost.fuel ? `${n1(x.cost.fuel)} fuel` : ''].filter(Boolean).join(', ')}` : ''}${x.ok ? '' : ' (can’t afford)'}</option>`).join('')}</select>`;
    return `<tr><th scope="row"><span title="${esc(TYPES[f.type].text)}">${esc(f.name)}</span><small>${TYPES[f.type].label} · ${esc(where)}</small></th><td class="num">${n1(u.str)}</td>
      <td class="num ${u.ready < 50 ? 'low' : ''}">${u.ready}</td><td>${sel}</td></tr>`;
  }).join('');
  const em = EMPH[me];
  const emph = ch.orders.emph || s.emph[me];
  const r = G.L.rows;
  $('left-count').innerHTML = `Lift ${n1(r.lift.left)} · Fuel ${n1(r.fuel.left)} <span class="muted">left</span>`;
  const how = $('forces-how');
  if (how.dataset.me !== me) { how.dataset.me = me; how.innerHTML = infoBtn(FORCES_HOW(me), 'How forces work', 'How this works', 'k4-how'); }
  $('forces').innerHTML = `<div class="k4-scroll"><table class="k4-ftab k4-units"><caption class="sr-only">Your formations and their orders</caption>
      <thead><tr><th scope="col">Formation <small>(type · where)</small></th><th scope="col">Str</th><th scope="col">Ready</th><th scope="col">Order <small>(cost)</small></th></tr></thead><tbody>${rows}</tbody></table></div>
    ${stanceSummary(G)}
    ${em ? `<fieldset class="k4-emph"><legend>${em[0]} <span class="muted">(free)</span> ${infoBtn({ title: em[0], lines: [em[1]], notes: [] }, `${em[0]}: what it does`)}</legend>${COAST.map(c => `<label class="${emph === c ? 'on' : ''}"><input type="radio" name="emph" data-emph="${c}" ${emph === c ? 'checked' : ''}> ${AREA_LABEL[c]} <span class="muted">${esc(AREA_TEXT[c])}</span></label>`).join('')}</fieldset>` : ''}
    ${me === 'jp' && s.rung >= 3 && !s.jpDeclared ? '<p class="fine bad">No survival-threatening situation declared: your forces hold to self-defence (Defend) until you declare one (Information line).</p>' : ''}`;
}

/** The text that used to sit under the Forces panel, now behind a "How this works" button. */
const FORCES_HOW = me => ({ title: 'How forces work', lines: [
  'Moving a formation costs Lift (1 to a neighbouring area, 2 to or from the Rear; amphibious forces 1½×) and 1 fuel. One order per formation a month. Each order shows its cost; one you cannot afford is greyed out.',
  ...(me === 'us' ? ['Formations leaving the Rear (the continental United States, Hawaii) take two months to arrive (one with a surge): decide early.'] : []),
  ...(me === 'tw' ? ['Your ground and air forces stay on the island; the navy moves at sea.'] : []),
  'Ground forces cannot cross the Strait; strike forces stay home and are aimed instead.',
  'Stance is set per sea area on the map (tap or press Enter on an area): Defend, Contest or Attack. Contest and Attack burn fuel every month for each formation there.',
], notes: [] });

export function wireForces(getG, repaint) {
  $('forces').addEventListener('change', e => {
    const G = getG(), t = e.target;
    if (t.dataset.ord) {
      const id = t.dataset.ord, list = G.choice.orders.moves.filter(m => m[0] !== id);
      const u = G.s.units[G.player].find(x => x.id === id);
      if (t.value && !(FBY[id].type === 'strike' && (u.focus || 'none') === t.value)) list.push([id, t.value]);
      G.choice.orders.moves = list; repaint();
      document.querySelector(`[data-ord="${id}"]`)?.focus();
    } else if (t.dataset.emph) { G.choice.orders.emph = t.dataset.emph; repaint(); document.querySelector(`[data-emph="${t.dataset.emph}"]`)?.focus(); }
  });
}
