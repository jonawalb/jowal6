// The lever panel: pending choices for this quarter, kept legal against budget and political capital.
import { P } from '../data/params.js';
import { LEVERS } from '../data/levers.js';
import { BY_POLICY } from '../data/policies.js';
import { normalize, upkeep } from './engine.js';
import { HUB_IDS, inForce } from './network.js';
import { escapeHtml } from '../../../shared/js/mapkit.js';

export const emptyChoice = s => ({ agents: s.pol.agents, list: [], euc: {}, hub: {}, kyc: false, lv: false, relax: false });

export function chosen(c) {
  const out = [];
  out.push({ k: 'agents', v: c.agents });
  if (c.relax) out.push({ k: 'relax' });
  for (const id of c.list) out.push({ k: 'list', t: id });
  for (const [h, n] of Object.entries(c.euc)) for (let i = 0; i < n; i++) out.push({ k: 'euc', t: h });
  for (const h of Object.keys(c.hub)) if (c.hub[h]) out.push({ k: 'hub', t: h });
  if (c.kyc) out.push({ k: 'kyc' });
  if (c.lv) out.push({ k: 'lv' });
  return out;
}
const count = acts => acts.filter(a => a.k !== 'agents').length + (acts.some(a => a.k === 'agents') ? 1 : 0);

/** Try a change; keep it only if every chosen action is still affordable. Returns a message if refused. */
export function tryChange(s, c, mutate) {
  const before = JSON.stringify(c);
  const nBefore = count(chosen(c).filter(a => !(a.k === 'agents' && a.v === s.pol.agents)));
  mutate(c);
  const want = chosen(c).filter(a => !(a.k === 'agents' && a.v === s.pol.agents));
  const got = normalize(s, chosen(c)).acts;
  if (count(got) < count(want)) {
    if (count(want) <= nBefore) {   // a removal (e.g. dropping a relaxation) made other choices unaffordable: drop them
      const keep = { ...emptyChoice(s), agents: c.agents };
      for (const a of got) {
        if (a.k === 'list') keep.list.push(a.t);
        else if (a.k === 'euc') keep.euc[a.t] = (keep.euc[a.t] || 0) + 1;
        else if (a.k === 'hub') keep.hub[a.t] = true;
        else if (a.k === 'agents') keep.agents = a.v;
        else keep[a.k] = true;
      }
      Object.keys(c).forEach(k => delete c[k]); Object.assign(c, keep);
      return 'Some choices no longer fit the budget or capital and were dropped.';
    }
    Object.keys(c).forEach(k => delete c[k]);
    Object.assign(c, JSON.parse(before));
    const n = normalize(s, chosen(c));
    return n.budget < 2 ? 'Not enough budget left this quarter.' : 'Not enough budget or political capital.';
  }
  return null;
}

const costs = L => [L.budget ? `<span class="cd-cost b">${L.budget} budget</span>` : '', L.capital ? `<span class="cd-cost c">${L.capital} capital</span>` : ''].join('')
  + (L.id === 'agents' ? '<span class="cd-cost b">2 budget per level each quarter</span>' : '')
  + (L.id === 'relax' ? `<span class="cd-cost g">+${P.fx.relax.cap} capital</span>` : '');

function policyHTML(id, note) {
  const p = BY_POLICY[id];
  if (!p) return '';
  return `<details class="cd-pol"><summary>Real tool: ${escapeHtml(p.name)}</summary>${note ? `<p class="fine"><i>${escapeHtml(note)}</i></p>` : ''}<p>${escapeHtml(p.what)}</p>
    <p class="fine"><b>Legal basis:</b> ${escapeHtml(p.legalBasis)}. <b>Status:</b> ${escapeHtml(p.status)}. <a href="${p.url}" target="_blank" rel="noopener">Source</a>${p.url2 ? `, <a href="${p.url2}" target="_blank" rel="noopener">more</a>` : ''}. Checked ${p.checked}.</p></details>`;
}

function control(L, s, c) {
  const hubs = HUB_IDS.filter(h => s.hubs[h].cap > 0);
  if (L.id === 'list') {
    const ids = s.shells.filter(x => x.seen && !x.listed);
    if (!ids.length) return '<p class="fine muted">No front company identified yet. End-use checks, agents and heavy use expose them.</p>';
    return `<div class="cd-chips">${ids.map(x => `<button type="button" class="cd-chip" data-act="list" data-t="${x.id}" aria-pressed="${c.list.includes(x.id)}">Shell ${x.id.slice(1)} <small>Hub ${x.hub}</small></button>`).join('')}</div>`;
  }
  if (L.id === 'euc') return `<div class="cd-chips">${hubs.map(h => `<button type="button" class="cd-chip" data-act="euc" data-t="${h}" aria-pressed="${!!c.euc[h]}" aria-label="End-use checks at Hub ${h}: ${c.euc[h] || 0} of 2">Hub ${h} <small class="num">${c.euc[h] ? '×' + c.euc[h] : '+'}</small></button>`).join('')}</div>`;
  if (L.id === 'hub') return `<div class="cd-chips">${hubs.map(h => {
    const lvl = s.hubs[h].lvl, max = lvl >= 2;
    return `<button type="button" class="cd-chip" data-act="hub" data-t="${h}" aria-pressed="${!!c.hub[h]}"${max ? ' disabled' : ''}>Hub ${h} <small>level ${lvl}${c.hub[h] ? '→' + (lvl + 1) : ''}</small></button>`;
  }).join('')}</div>`;
  if (L.id === 'agents') return `<div class="cd-seg" role="radiogroup" aria-label="Standing enforcement level">${[0, 1, 2, 3].map(v => `<button type="button" role="radio" class="cd-chip" data-act="agents" data-v="${v}" aria-checked="${c.agents === v}">${v}</button>`).join('')}</div>
    <p class="fine muted">Upkeep at this level: ${upkeep(c.agents)} budget a quarter.${s.pol.agents && s.agentsSince != null ? ` Standing since ${'Quarter ' + (s.agentsSince + 1)}; prosecutions possible ${s.turn - s.agentsSince >= 2 ? 'now' : 'from Quarter ' + (s.agentsSince + 3)}.` : ''}</p>`;
  if (L.id === 'kyc' || L.id === 'lv') {
    const k = L.id, lag = k === 'kyc' ? P.kycLag : P.lvLag;
    if (s.pol[k] != null) return `<p class="fine"><span class="status" data-s="${inForce(s, k) ? 'good' : 'warn'}">${inForce(s, k) ? 'In force' : 'Rulemaking'}</span> Started Quarter ${s.pol[k] + 1}; bites from Quarter ${s.pol[k] + lag + 1}.${k === 'kyc' && s.offshore ? ` ${Math.round(s.offshore * 100)}% of the effect lost to offshore providers.` : ''}${k === 'lv' && s.spoof ? ` ${Math.round(s.spoof * 100)}% lost to spoofing.` : ''}</p>`;
    return `<button type="button" class="cd-chip wide" data-act="${k}" aria-pressed="${c[k]}">${c[k] ? 'Starting this quarter' : 'Start rulemaking'} <small>bites after ${lag} quarters</small></button>`;
  }
  if (L.id === 'relax') return `<button type="button" class="cd-chip wide" data-act="relax" aria-pressed="${c.relax}">${c.relax ? 'Relaxing this quarter' : 'Relax this quarter'}</button>`;
  return '';
}

export function paintDecide(el, s, c, msg) {
  el.innerHTML = (msg ? `<p class="cd-msg" role="alert">${escapeHtml(msg)}</p>` : '') + LEVERS.map(L => {
    const on = (L.id === 'list' && c.list.length) || (L.id === 'euc' && Object.keys(c.euc).length) || (L.id === 'hub' && Object.values(c.hub).some(Boolean))
      || (L.id === 'agents' && c.agents !== s.pol.agents) || c[L.id] === true;
    return `<div class="cd-lever${on ? ' on' : ''}" data-lever="${L.id}">
      <div class="cd-lh"><b>${L.name}</b><span>${costs(L)}</span></div>
      <p class="cd-lt">${L.text}</p>
      ${control(L, s, c)}
      ${policyHTML(L.policy, L.note)}
    </div>`;
  }).join('');
}

/** Wire clicks once. get() returns { s, c }; changed(msg) repaints. */
export function wireDecide(el, get, changed) {
  el.addEventListener('click', e => {
    const b = e.target.closest('button[data-act]');
    if (!b || b.disabled) return;
    const { s, c } = get();
    const act = b.dataset.act, t = b.dataset.t;
    const msg = tryChange(s, c, c => {
      if (act === 'list') c.list = c.list.includes(t) ? c.list.filter(x => x !== t) : [...c.list, t];
      if (act === 'euc') { const n = ((c.euc[t] || 0) + 1) % 3; if (n) c.euc[t] = n; else delete c.euc[t]; }
      if (act === 'hub') c.hub[t] = !c.hub[t];
      if (act === 'agents') c.agents = +b.dataset.v;
      if (act === 'kyc' || act === 'lv' || act === 'relax') c[act] = !c[act];
    });
    changed(msg, act, t);
  });
}
