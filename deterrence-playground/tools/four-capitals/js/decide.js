// The decision panel: posture, the DIMEFIL move menu with follow-up questions, and the Forces panel.
import { P } from '../data/params.js';
import { POSTURES, BY_ID, LINES, LINE_SHORT, posturesFor, escRoom, isEsc, menu, answers, ACTIONS } from '../data/actions.js';
import { AREA_LABEL, AREA_TEXT, STANCE_LABEL, STANCE_TEXT, LOGISTICS, moveCost } from '../data/theater.js';
import { IDS } from '../data/countries.js';
import { oddsFor, blockedWhy } from './engine.js';
import { applyOrders, areasOf } from './forces.js';
import { pulse } from '../../../shared/js/motion.js';

const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let G = null, onChange = () => {};

export const emptyChoice = s => ({ posture: 'hold', actions: [], follow: {}, orders: { moves: [], stance: {} } });
/** Everyone's moves for the odds preview: you as chosen, the others repeating last month. */
const preview = () => Object.fromEntries(IDS.map(w => [w, w === G.player ? G.choice : (G.s.last[w] || { posture: 'hold', actions: [] })]));
const bonus = () => G.choice.actions.reduce((t, id) => t + (BY_ID[id].deploy || 0), 0);

export function paintDecide(g) {
  G = g;
  paintPostures(); paintTabs(); paintActions(); paintForces();
}

function paintPostures() {
  const ok = posturesFor(G.player, G.s).map(p => p.id);
  const why = p => p.only && !p.only.includes(G.player) ? 'Only nuclear-armed states can make a nuclear signal' : `Needs the crisis at ${P.ladder[p.minRung]} or above`;
  $('postures').innerHTML = POSTURES.map(p => `<button type="button" role="radio" data-posture="${p.id}" aria-checked="${G.choice.posture === p.id}" ${ok.includes(p.id) ? '' : `disabled title="${why(p)}"`}>${p.label}</button>`).join('');
  $('pexp').textContent = POSTURES.find(p => p.id === G.choice.posture).explain;
}

function paintTabs() {
  const avail = menu(G.s, G.player);
  $('tabs').innerHTML = Object.keys(LINES).map(k => {
    const n = G.choice.actions.filter(id => BY_ID[id].line === k).length;
    const opp = avail.some(a => a.line === k && a.opp);
    return `<button type="button" role="tab" data-line="${k}" aria-selected="${G.line === k}" title="${LINES[k]}">${LINE_SHORT[k]}${opp ? '<i class="k4-dot" title="Opportunity"></i>' : ''}${n ? ` <small>(${n})</small>` : ''}</button>`;
  }).join('');
  $('count').textContent = `${G.choice.actions.length} of 3`;
}

function followHTML(a) {
  const o = answers(a.id, G.choice.follow[a.id]);
  return (a.follow || []).map(q => `<fieldset class="k4-fq"><legend>${esc(q.text)}</legend>${q.opts.map(x =>
    `<label class="${o[q.id] === x.id ? 'on' : ''}"><input type="radio" name="fq-${a.id}-${q.id}" data-fa="${a.id}" data-fq="${q.id}" value="${x.id}" ${o[q.id] === x.id ? 'checked' : ''}><b>${esc(x.label)}</b><span>${esc(x.explain)}</span></label>`).join('')}</fieldset>`).join('');
}

function paintActions() {
  const mv = preview();
  const list = ACTIONS[G.player].filter(a => a.line === G.line);
  const shown = list.filter(a => !a.avail || a.avail(G.s));
  $('actions').innerHTML = shown.map(a => {
    const on = G.choice.actions.includes(a.id);
    const escUsed = G.choice.actions.filter(isEsc).length;
    const why = blockedWhy(G.s, a.id, answers(a.id, G.choice.follow[a.id])) || (!on && isEsc(a.id) && escUsed >= escRoom(G.choice.posture)
      ? `your posture (${POSTURES.find(p => p.id === G.choice.posture).label}) allows ${escRoom(G.choice.posture) === 0 ? 'no' : 'only one'} escalatory move${escRoom(G.choice.posture) === 0 ? 's' : ''}` : null);
    const full = !on && G.choice.actions.length >= 3;
    const { p, factors } = oddsFor(G.s, mv, G.player, a.id);
    const tag = a.tags.includes('esc') ? 'tag-esc' : a.tags.includes('soft') ? 'tag-soft' : '';
    const fac = factors.map(([l, d]) => `${l} ${d > 0 ? '+' : ''}${d}`).join(' · ');
    const extra = [a.opp && '<em class="k4-opp">Opportunity</em>', a.deploy && `<em class="k4-dep">+${a.deploy} logistics</em>`].filter(Boolean).join(' ');
    return `<div class="k4-act ${on ? 'on' : ''} ${why && !on ? 'off' : ''} ${tag}"><label class="k4-acth"><input type="checkbox" data-act="${a.id}" ${on ? 'checked' : ''} ${(why && !on) || full ? 'disabled' : ''}>
      <b>${esc(a.label)}</b><span class="p">${why && !on ? '—' : Math.round(p * 100) + '%'}</span></label><small>${esc(a.explain)} ${extra}</small>
      ${why && !on ? `<span class="why">Not now: ${esc(why)}.</span>` : fac ? `<span class="why">${esc(fac)}</span>` : ''}
      ${on && a.follow ? `<div class="k4-follow">${followHTML(a)}</div>` : ''}</div>`;
  }).join('') || '<p class="fine">No moves on this line this month.</p>';
}

/* ---------- Forces ---------- */
function trial() {
  const s = JSON.parse(JSON.stringify(G.s));
  const r = applyOrders(s, G.player, G.choice.orders, bonus());
  return { s, r };
}
function paintForces() {
  const me = G.player, s = G.s, { r } = trial(), areas = areasOf(me), budget = LOGISTICS[me] + bonus();
  const st = a => G.choice.orders.stance[a] || s.stance[me][a];
  const rows = areas.map(a => `<tr><th title="${esc(AREA_TEXT[a])}">${AREA_LABEL[a]}</th><td class="num">${+(s.f[me][a] || 0).toFixed(1)}</td>
    <td>${me === 'tw' || a === 'rear' ? '' : `<span class="k4-seg" role="group" aria-label="Stance in ${AREA_LABEL[a]}">${['defend', 'contest', 'attack'].map(x => `<button type="button" data-stance="${a}" data-v="${x}" aria-pressed="${st(a) === x}" title="${esc(STANCE_TEXT[x])}">${STANCE_LABEL[x]}</button>`).join('')}</span>`}</td></tr>`).join('');
  const orders = G.choice.orders.moves.map(([f, t, n], i) => {
    const res = r.log[i];
    return `<li class="${res && !res.ok ? 'bad' : ''}">${n} × ${AREA_LABEL[f]} → ${AREA_LABEL[t]} <span class="muted">(${moveCost(f, t) * n} log.)</span>${res && !res.ok ? ` <em>${esc(res.text.split(': ')[1] || '')}</em>` : ''} <button type="button" class="k4-x" data-del="${i}" aria-label="Remove order">×</button></li>`;
  }).join('');
  const opts = areas.map(a => `<option value="${a}">${AREA_LABEL[a]}</option>`).join('');
  $('forces').innerHTML = `<div class="k4-lineh"><p class="eyebrow">Forces</p><p class="fine k4-log-left">Logistics <b class="num">${r.left}</b> of ${budget} left</p></div>
    <table class="k4-ftab"><tr><th>Area</th><th>Yours</th><th>${me === 'tw' ? '' : 'Stance'}</th></tr>${rows}</table>
    <div class="k4-order"><label>Move <input type="number" id="o-n" min="1" max="9" value="1"></label>
      <label>from <select id="o-from">${opts}</select></label><label>to <select id="o-to">${opts}</select></label>
      <button type="button" class="btn" id="o-add">Add order</button></div>
    ${orders ? `<ol class="k4-orders">${orders}</ol>` : ''}
    <p class="fine">${me === 'tw' ? 'Taiwan’s forces shift between its coasts and centre: 1 logistics per point per step.' : 'Neighbouring areas cost 1 logistics per point, the Rear 2.'}${me === 'us' ? ' Points leaving the Rear arrive next month (this month with a surge).' : ''} Military moves marked “+ logistics” add to the budget.</p>`;
  const to = $('o-to'); if (to) to.selectedIndex = Math.min(1, areas.length - 1);
}

export function wireDecide(change) {
  onChange = change;
  $('postures').addEventListener('click', e => {
    const b = e.target.closest('[data-posture]'); if (!b || b.disabled) return;
    G.choice.posture = b.dataset.posture;
    let room = escRoom(G.choice.posture);
    G.choice.actions = G.choice.actions.filter(id => !isEsc(id) || room-- > 0);
    paintDecide(G); pulse(b); onChange();
  });
  $('tabs').addEventListener('click', e => { const b = e.target.closest('[data-line]'); if (!b) return; G.line = b.dataset.line; paintTabs(); paintActions(); });
  $('actions').addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.act) {
      const id = t.dataset.act, a = G.choice.actions;
      G.choice.actions = t.checked ? [...a, id].slice(0, 3) : a.filter(x => x !== id);
      if (t.checked && BY_ID[id].follow) G.choice.follow[id] = answers(id, G.choice.follow[id]);
      if (!t.checked) delete G.choice.follow[id];
    } else if (t.dataset.fa) {
      G.choice.follow[t.dataset.fa] = { ...answers(t.dataset.fa, G.choice.follow[t.dataset.fa]), [t.dataset.fq]: t.value };
    } else return;
    paintTabs(); paintActions(); paintForces(); onChange();
  });
  $('forces').addEventListener('click', e => {
    const st = e.target.closest('[data-stance]');
    if (st) { G.choice.orders.stance[st.dataset.stance] = st.dataset.v; paintForces(); onChange(); return; }
    const del = e.target.closest('[data-del]');
    if (del) { G.choice.orders.moves.splice(+del.dataset.del, 1); paintForces(); onChange(); return; }
    if (e.target.id === 'o-add') {
      const n = Math.max(1, Math.min(9, +$('o-n').value || 1)), f = $('o-from').value, t = $('o-to').value;
      if (moveCost(f, t) == null) { $('o-add').textContent = 'Not a route'; setTimeout(() => { if ($('o-add')) $('o-add').textContent = 'Add order'; }, 1200); return; }
      G.choice.orders.moves.push([f, t, n]); paintForces(); onChange();
    }
  });
}
