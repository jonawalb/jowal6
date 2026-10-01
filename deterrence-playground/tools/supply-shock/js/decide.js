// The action panel: pick an action, answer its follow-up questions (mineral, site, price floor), add it to
// this year's plan. Native buttons, radios and checkboxes keep it keyboard operable.
import { P } from '../data/params.js';
import { MINERALS } from '../data/minerals.js';
import { ACTIONS, ACT, cost, pc, blocked } from '../data/actions.js';
import { actionLabel } from './engine.js';

const $ = id => document.getElementById(id);
let G = null, changed = () => {};

const range = k => `${k.lead[0]}–${k.lead[2]} yrs (usually ~${k.lead[1]})`;
const price = (a, s) => `${cost(a, s)} pt${cost(a, s) === 1 ? '' : 's'}${pc(a) ? ` + ${pc(a)} PC` : ''}`;
const fullDraft = d => ({ id: d.id, ...(ACT[d.id].mineral ? { m: d.m } : {}), ...(ACT[d.id].site ? { site: d.site } : {}), ...(ACT[d.id].floor && d.floor ? { floor: true } : {}) });

export function paintDecide(g) {
  G = g;
  const s = g.s, plan = g.plan, d = g.draft;
  const spent = plan.reduce((t, a) => t + cost(a, s), 0), pcs = plan.reduce((t, a) => t + pc(a), 0);
  $('money').innerHTML = `<span><b class="num">${(s.budget - spent).toFixed(s.budget % 1 ? 1 : 0)}</b> of ${s.budget % 1 ? s.budget.toFixed(1) : s.budget} points left${s.upkeep ? ` <small class="muted">(stockpile upkeep took ${s.upkeep.toFixed(1)})</small>` : ''}</span><span><b class="num">${s.pc - pcs}</b> of ${s.pc} political capital</span><span><b class="num">${plan.length}</b> of ${P.maxActions} actions</span>`;
  $('kinds').innerHTML = ACTIONS.map(a => {
    const sample = { id: a.id, m: d.m || 'li', site: d.site || 'ally' };
    return `<button type="button" class="ss-kind" data-kind="${a.id}" aria-pressed="${d.id === a.id}"><b>${a.label}</b><small>${a.site ? `from ${Math.min(cost({ ...sample, site: 'ally' }, s), cost({ ...sample, site: 'dom' }, s))} pts` : price(sample, s)}</small></button>`;
  }).join('');
  const f = $('form');
  if (!d.id) { f.innerHTML = '<p class="fine">Pick an action above. Each asks a follow-up question or two.</p>'; }
  else {
    const def = ACT[d.id], a = fullDraft(d), why = blocked(a, s, plan);
    const site = def.site ? P[d.id] : null;
    f.innerHTML = `<p class="ss-desc">${def.text}</p>`
      + (def.mineral ? `<fieldset class="ss-fq"><legend>Which mineral?</legend><div class="ss-mins">${MINERALS.map(m => `<label class="${d.m === m.id ? 'on' : ''}"><input type="radio" name="dm" value="${m.id}" ${d.m === m.id ? 'checked' : ''}>${m.name}</label>`).join('')}</div></fieldset>` : '')
      + (def.site ? `<fieldset class="ss-fq"><legend>Where?</legend>
          <label class="${d.site === 'dom' ? 'on' : ''}"><input type="radio" name="ds" value="dom" ${d.site === 'dom' ? 'checked' : ''}><b>Domestic</b> <span>${site.dom.cost} pts + ${site.dom.pc} PC · +${site.dom.cap} · ${range(site.dom)}${s.permit ? ', 30% faster after reform' : ''} · local opposition risk</span></label>
          <label class="${d.site === 'ally' ? 'on' : ''}"><input type="radio" name="ds" value="ally" ${d.site === 'ally' ? 'checked' : ''}><b>Allied</b> <span>${site.ally.cost} pts · +${site.ally.cap} · ${range(site.ally)} · cheaper, slightly likelier to fail</span></label></fieldset>` : '')
      + (def.floor ? `<label class="ss-floor"><input type="checkbox" id="dfloor" ${d.floor ? 'checked' : ''}> Price-floor guarantee (+${P.floorCost} pt): the project survives if the Supplier dumps prices</label>` : '')
      + (d.id === 'stock' && d.m && s.ctrl[d.m] === 'lic' ? `<p class="fine">Under licensing, stockpile purchases cost ${P.stock.licensedMult}×.</p>` : '')
      + `<div class="ss-add"><span class="${why ? 'bad' : ''}">${why && !/^Pick/.test(why) ? why : `Cost: ${price(a, s)}`}</span><button type="button" class="btn solid" id="add" ${why ? 'disabled' : ''}>Add to plan</button></div>`;
  }
  $('plan').innerHTML = plan.length ? plan.map((a, i) => `<li><span>${actionLabel(a)} <small class="muted">${price(a, s)}</small></span><button type="button" class="ss-x" data-rm="${i}" aria-label="Remove ${actionLabel(a)}">×</button></li>`).join('')
    : '<li class="muted">Nothing planned. Ending the year with no actions keeps the money.</li>';
}

export function wireDecide(onChange) {
  changed = onChange;
  $('kinds').addEventListener('click', e => {
    const b = e.target.closest('[data-kind]'); if (!b || !G) return;
    const id = b.dataset.kind;
    G.draft = { ...G.draft, id, site: G.draft.site || (ACT[id].site ? 'ally' : undefined) };
    paintDecide(G); changed();
    const first = $('form').querySelector('input:checked, input, button'); if (first) first.focus();
  });
  $('form').addEventListener('change', e => {
    if (!G) return;
    if (e.target.name === 'dm') G.draft.m = e.target.value;
    if (e.target.name === 'ds') G.draft.site = e.target.value;
    if (e.target.id === 'dfloor') G.draft.floor = e.target.checked;
    const keep = e.target.name || e.target.id, val = e.target.value;
    paintDecide(G); changed();
    const back = $('form').querySelector(e.target.name ? `input[name="${keep}"][value="${val}"]` : `#${keep}`); if (back) back.focus();
  });
  $('form').addEventListener('click', e => {
    if (e.target.id !== 'add' || !G) return;
    const a = fullDraft(G.draft);
    if (blocked(a, G.s, G.plan)) return;
    G.plan.push(a);
    G.draft = { m: G.draft.m, site: G.draft.site };
    paintDecide(G); changed(true);
    $('kinds').querySelector('button')?.focus();
  });
  $('plan').addEventListener('click', e => {
    const b = e.target.closest('[data-rm]'); if (!b || !G) return;
    G.plan.splice(+b.dataset.rm, 1); paintDecide(G); changed();
    ($('plan').querySelector('button') || $('end-year')).focus();
  });
}
