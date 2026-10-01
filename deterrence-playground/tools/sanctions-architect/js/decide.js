// The quarterly decision panel: up to three measures, each with follow-up questions. Native checkboxes and
// radios, so it is keyboard operable as is.
import { P } from '../data/params.js';
import { MEASURES, BY_MEASURE, LEVEL_LABEL, ENF_LABEL } from '../data/measures.js';
import { PARTNERS } from '../data/partners.js';
import { weakestMember } from './target.js';
import { courtOdds } from './engine.js';

const $ = id => document.getElementById(id);

/** Default answers for a fresh quarter: one step up from what is in force. */
export function emptyChoice(s) {
  const p = s.pol, ans = {};
  for (const m of ['energy', 'finance', 'tech', 'elites', 'shipping']) ans[m] = { a: p[m].mode, b: Math.min(3, p[m].lvl + 1) };
  const tool = ['customs', 'secondary', 'maritime'].find(k => p[k] === 0) || 'customs';
  ans.enforce = { a: tool, b: Math.min(2, p[tool] + 1) };
  const w = weakestMember(s) || 'hub';
  ans.coalition = { a: w, b: s.partners[w].member ? 'reassure' : 'court' };
  return { on: {}, ans };
}

export const chosen = c => MEASURES.filter(m => c.on[m.id]).map(m => ({ m: m.id, a: c.ans[m.id].a, b: c.ans[m.id].b }));

function nowText(s, m) {
  const p = s.pol;
  if (m.id === 'energy') return p.energy.lvl ? `${p.energy.mode === 'cap' ? 'cap' : 'embargo'}, ${LEVEL_LABEL[p.energy.lvl]}` : 'off';
  if (m.id === 'finance') return p.finance.lvl ? `${p.finance.mode === 'cb' ? 'central bank' : 'banks'}, ${LEVEL_LABEL[p.finance.lvl]}` : 'off';
  if (m.sector) return LEVEL_LABEL[p[m.id].lvl];
  if (m.id === 'enforce') return ['secondary', 'maritime', 'customs'].filter(k => p[k]).map(k => `${k} ${ENF_LABEL[p[k]]}`).join(', ') || 'none';
  return `${PARTNERS.filter(d => s.partners[d.id].member).length} members`;
}

function opts(s, m, q, c) {
  if (m.id === 'coalition' && q.id === 'a') {
    return PARTNERS.map(d => {
      const st = s.partners[d.id];
      const tag = st.member ? `member, commitment ${Math.round(st.commit)}` : d.member ? 'defected' : 'outside';
      return { id: d.id, label: d.name, text: tag };
    });
  }
  if (m.id === 'coalition' && q.id === 'b') {
    const member = s.partners[c.ans.coalition.a].member;
    return q.opts.map(o => ({ ...o, disabled: member ? o.id === 'court' : o.id !== 'court', text: o.id === 'court' && !member ? `${o.text} Chance now about ${Math.round(100 * courtOdds(s, c.ans.coalition.a))}%.` : o.text }));
  }
  return q.opts;
}

export function paintDecide(s, c) {
  const n = chosen(c).length;
  $('count').textContent = `${n} of ${P.maxMeasures}`;
  $('measures').innerHTML = MEASURES.map(m => {
    const on = !!c.on[m.id], off = !on && n >= P.maxMeasures;
    const qs = on ? `<div class="sa-follow">${m.ask.map(q => `<fieldset class="sa-fq"><legend>${q.label}</legend>${opts(s, m, q, c).map(o => {
      const sel = String(c.ans[m.id][q.id]) === String(o.id);
      return `<label class="${sel ? 'on' : ''}${o.disabled ? ' dis' : ''}"><input type="radio" name="${m.id}-${q.id}" value="${o.id}" data-m="${m.id}" data-q="${q.id}"${sel ? ' checked' : ''}${o.disabled ? ' disabled' : ''}><b>${o.label}</b><span>${o.text}</span></label>`;
    }).join('')}</fieldset>`).join('')}</div>` : '';
    return `<div class="sa-m${on ? ' on' : ''}${off ? ' off' : ''}"><label class="sa-mh"><input type="checkbox" data-pick="${m.id}"${on ? ' checked' : ''}${off ? ' disabled' : ''}><b>${m.label}</b><span class="now">now: ${nowText(s, m)}</span></label><small>${m.text}</small>${qs}</div>`;
  }).join('');
}

/** Wire events once. `get()` returns { s, c }; `changed()` repaints. */
export function wireDecide(get, changed) {
  $('measures').addEventListener('change', e => {
    const { s, c } = get();
    const t = e.target;
    if (t.dataset.pick) {
      c.on[t.dataset.pick] = t.checked;
      paintDecide(s, c); changed();
      const f = document.querySelector(`[data-pick="${t.dataset.pick}"]`); if (f) f.focus();
      return;
    }
    if (t.dataset.m) {
      const m = t.dataset.m, q = t.dataset.q;
      const v = BY_MEASURE[m].ask.find(x => x.id === q).opts.some(o => typeof o.id === 'number') ? +t.value : t.value;
      c.ans[m][q] = v;
      if (m === 'coalition' && q === 'a') c.ans.coalition.b = s.partners[v].member ? (c.ans.coalition.b === 'court' ? 'reassure' : c.ans.coalition.b) : 'court';
      if (m === 'enforce' && q === 'a') c.ans.enforce.b = Math.min(2, s.pol[v] + 1);
      paintDecide(s, c); changed();
      const f = document.querySelector(`input[name="${m}-${q}"][value="${t.value}"]`); if (f) f.focus();
    }
  });
}
