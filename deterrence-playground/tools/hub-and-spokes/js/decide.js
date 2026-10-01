// The yearly allocation panel: one tab per ally, actions grouped by category with follow-up questions, and
// the running plan. Keyboard: arrow keys move between tabs; everything else is native buttons and inputs.
import { ALLIES, IDS, BY } from '../data/allies.js';
import { ACTIONS, CATS, BY_ID, costOf, defaultFollow } from '../data/actions.js';
import { budgetOf } from './engine.js';

const $ = id => document.getElementById(id);
export const planCost = plan => plan.reduce((t, a) => t + costOf(a.id, a.f), 0);
const sign = v => (v > 0 ? `+${v}` : `${v}`);
const FX = { A: 'assurance', entrap: 'entrapment', effort: 'own effort', coh: 'cohesion', strain: 'strain' };
const fxText = fx => Object.entries(fx).filter(([k]) => FX[k]).map(([k, v]) => `${FX[k]} ${sign(v)}`).join(', ');

let G = null, onChange = () => {};
export function wireDecide(cb) {
  onChange = cb;
  $('tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { G.tab = b.dataset.tab; paintDecide(G); $('tabs').querySelector(`[data-tab="${G.tab}"]`).focus(); } });
  $('tabs').addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const i = IDS.indexOf(G.tab), n = IDS.length;
    G.tab = IDS[e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (i + (e.key === 'ArrowRight' ? 1 : n - 1)) % n];
    paintDecide(G); $('tabs').querySelector(`[data-tab="${G.tab}"]`).focus();
  });
  $('actions').addEventListener('change', e => {
    const t = e.target, ally = G.tab;
    if (t.dataset.act) {
      const id = t.dataset.act;
      if (t.checked) G.plan.push({ ally, id, f: defaultFollow(id, ally, IDS) });
      else G.plan = G.plan.filter(a => !(a.ally === ally && a.id === id));
    } else if (t.dataset.follow) {
      const a = G.plan.find(p => p.ally === ally && p.id === t.dataset.follow);
      if (a) { a.f = t.value; if (planCost(G.plan) > budgetOf(G.s)) a.f = defaultFollow(a.id, ally, IDS); }
    }
    paintDecide(G);
    const again = $('actions').querySelector(t.dataset.act ? `[data-act="${t.dataset.act}"]` : `[data-follow="${t.dataset.follow}"][value="${t.value}"]`) || $('actions').querySelector(`[data-act="${t.dataset.follow}"]`);
    if (again) again.focus();
    onChange();
  });
  $('plan').addEventListener('click', e => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    const [ally, id] = b.dataset.rm.split(':');
    G.plan = G.plan.filter(a => !(a.ally === ally && a.id === id));
    paintDecide(G); onChange();
  });
}

export function paintDecide(g) {
  G = g;
  const s = g.s, budget = budgetOf(s), left = budget - planCost(g.plan), ally = g.tab, x = s.allies[ally];
  $('tabs').innerHTML = ALLIES.map(a => {
    const n = g.plan.filter(p => p.ally === a.id).length;
    return `<button type="button" role="tab" id="tab-${a.id}" aria-controls="actions" aria-selected="${a.id === ally}" tabindex="${a.id === ally ? 0 : -1}" data-tab="${a.id}" style="--c:${a.col}">${a.short}${n ? ` <small>(${n})</small>` : ''}</button>`;
  }).join('');
  $('actions').setAttribute('aria-labelledby', `tab-${ally}`);
  $('actions').innerHTML = CATS.map(c => `<p class="eyebrow">${c.label}</p>` + ACTIONS.filter(a => a.cat === c.id).map(a => {
    const on = g.plan.find(p => p.ally === ally && p.id === a.id);
    const cost = on ? costOf(a.id, on.f) : a.cost;
    const off = !on && cost > left;
    const tired = x.last.includes(a.id) && a.cat === 'reassure';
    let follow = '';
    if (on && a.follow) {
      const opts = a.follow.partner
        ? IDS.filter(i => i !== ally).map(i => ({ id: i, label: BY[i].short, note: s.allies[ally].links.includes(i) ? 'Already linked: reinforces the tie.' : `Cohesion ${Math.round(s.allies[i].coh)}. Both need 35+ for a full link.` }))
        : a.follow.opts;
      follow = `<fieldset class="hs-fq"><legend>${a.follow.q}</legend>${opts.map(o => {
        const extra = o.extra ? ` (+${o.extra} capital)` : '';
        const dis = o.extra && !(on.f === o.id) && o.extra > left;
        return `<label class="${on.f === o.id ? 'on' : ''}"><input type="radio" name="f-${a.id}" value="${o.id}" data-follow="${a.id}" ${on.f === o.id ? 'checked' : ''} ${dis ? 'disabled' : ''}><b>${o.label}${extra}</b><span>${o.note}${o.fx ? ' · ' + fxText(o.fx) : ''}</span></label>`;
      }).join('')}</fieldset>`;
    }
    return `<div class="hs-act ${on ? 'on' : ''} ${off ? 'off' : ''}">
      <label class="hs-acth"><input type="checkbox" data-act="${a.id}" ${on ? 'checked' : ''} ${off ? 'disabled' : ''}><b>${a.label}</b><span class="p num">${cost}</span></label>
      <small>${a.text} ${fxText(a.fx || {}) ? '<span class="fx">' + fxText(a.fx) + '</span>' : ''}${tired ? ' <i class="hs-tired">used last year: 60%</i>' : ''}</small>${follow}</div>`;
  }).join('')).join('');
  $('plan').innerHTML = g.plan.length ? g.plan.map(p => {
    const a = BY_ID[p.id], o = a.follow && !a.follow.partner ? a.follow.opts.find(q => q.id === p.f) : null;
    const what = a.follow?.partner ? `${a.label} (with ${BY[p.f].short})` : o ? `${a.label} (${o.label.toLowerCase()})` : a.label;
    return `<li><span><b style="color:${BY[p.ally].col}">${BY[p.ally].short}</b>: ${what} <span class="num muted">${costOf(p.id, p.f)}</span></span><button type="button" class="hs-x" data-rm="${p.ally}:${p.id}" aria-label="Remove ${what} for ${BY[p.ally].short}">×</button></li>`;
  }).join('') : '<li class="muted">Nothing planned. Doing nothing is a choice too: assurance decays every year.</li>';
  $('left').textContent = `${left} of ${budget}`;
}
