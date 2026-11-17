// Text and small charts: scoreboard, quarter log, case cards, end-of-game chart and tables.
import { P } from '../data/params.js';
import { BY_LEVER } from '../data/levers.js';
import { CASES } from '../data/cases.js';
import { escapeHtml } from '../../../shared/js/mapkit.js';
import { collateral } from './engine.js';

const r0 = v => Math.round(v);
export function metrics(s, base) {
  const done = s.history.length;
  const baseSoFar = base ? base.history.slice(0, done).reduce((a, h) => a + h.delivered, 0) : null;
  return { diverted: s.diverted, baseSoFar, seized: s.seized, blocked: s.blocked, revenue: s.revenue, goodwill: s.goodwill, capital: s.capital, cost: collateral(s).total };
}

export function paintTracks(el, m, pv) {
  const row = (label, val, max, extra = '', cls = '', help = '') => `<div class="cd-track ${cls}"><div><span>${label}${help ? ` <small class="muted">${help}</small>` : ''}</span><b class="num">${val}${extra}</b></div><div class="bar"><span style="width:${Math.max(0, Math.min(100, max))}%"></span></div></div>`;
  const pct = m.baseSoFar ? m.diverted / m.baseSoFar : null;
  el.innerHTML =
    row('Compute diverted', r0(m.diverted), pct == null ? 0 : pct * 100, pct == null ? '' : ` <small class="muted">${Math.round(pct * 100)}% of no-enforcement</small>`, 'bad', 'CU, total') +
    (pv ? `<p class="cd-pv full-only">This quarter, expected: <b class="num">${r0(pv.delivered)}</b> delivered, <b class="num">${r0(pv.seized)}</b> seized${pv.blocked ? `, <b class="num">${r0(pv.blocked)}</b> blocked` : ''}.</p>` : '') +
    row('Seized', r0(m.seized), m.seized / 4, '', 'good full-only', 'total') +
    row('Industry revenue', r0(m.revenue), m.revenue - 20, '', 'full-only', 'index, 100 = start') +
    row('Allied goodwill', r0(m.goodwill), m.goodwill, '', 'full-only', '0 to 100') +
    row('Political capital', r0(m.capital), m.capital, '', 'full-only', '') +
    row('Collateral cost', m.cost.toFixed(1), m.cost / 1.2, '', 'bad', 'lower is better');
}

export function inforceHTML(s) {
  const out = [];
  if (s.pol.agents) out.push(`Agents at level ${s.pol.agents}`);
  for (const h of Object.keys(s.hubs)) if (s.hubs[h].lvl) out.push(`Pressure on Hub ${h}, level ${s.hubs[h].lvl}`);
  if (s.pol.kyc != null) out.push(`Cloud KYC rule (started Q${s.pol.kyc + 1})`);
  if (s.pol.lv != null) out.push(`Location verification (started Q${s.pol.lv + 1})`);
  const listed = s.shells.filter(x => x.listed).length;
  if (listed) out.push(`${listed} front compan${listed === 1 ? 'y' : 'ies'} on the Entity List`);
  if (s.split) out.push(`<span class="warn">Network splitting shipments, level ${s.split}</span>`);
  return out.length ? out.map(t => `<li>${t}</li>`).join('') : '<li class="muted">Nothing yet</li>';
}

export function logHTML(rec, s) {
  const out = [];
  out.push(`<li class="${rec.delivered > rec.demand * 0.6 ? 'bad' : 'warn'}"><b>${r0(rec.delivered)}</b> compute units reached restricted users (demand ${r0(rec.demand)}). You seized <b>${r0(rec.seized)}</b>${rec.blocked ? ` and location checks blocked <b>${r0(rec.blocked)}</b>` : ''}.${rec.deter > 0.005 ? ` Enforcement deterred about ${Math.round(rec.deter * 100)}% of attempts.` : ''}</li>`);
  const by = {};
  for (const l of rec.log) (by[l.kind] ||= []).push(l);
  if (by.case) for (const l of by.case) out.push(`<li class="good"><b>Prosecution.</b> Charges against a ring at Hub ${l.hub} expose ${l.exposed} more front compan${l.exposed === 1 ? 'y' : 'ies'} and cut the hub’s volume. +${P.caseCapital} capital.</li>`);
  if (by.detect) out.push(`<li class="good"><b>Identified:</b> ${by.detect.map(l => `Shell ${l.id.slice(1)} (Hub ${l.hub})`).join(', ')}. You can list ${by.detect.length === 1 ? 'it' : 'them'} next quarter.</li>`);
  if (by.spawn) out.push(`<li class="bad"><b>New front companies:</b> ${by.spawn.length} registered${[...new Set(by.spawn.map(l => l.hub))].length ? ' at Hub ' + [...new Set(by.spawn.map(l => l.hub))].join(', ') : ''}.</li>`);
  if (by.shift) for (const l of by.shift) out.push(`<li class="bad"><b>Rerouting.</b> The network moves volume from Hub ${l.from} to Hub ${l.to}${s.hubs[l.to] && rec.before.hubs[l.to].cap <= 0 ? ', opening a new hub' : ''}.</li>`);
  if (by.split) out.push(`<li class="warn"><b>Split shipments.</b> Under end-use checks the network breaks orders into smaller consignments (level ${by.split[0].level}). Seizures fall; so does its throughput.</li>`);
  if (by.unsplit) out.push(`<li class="muted">With no checks for a while, the network goes back to larger shipments.</li>`);
  if (by.cloud) out.push(`<li class="bad"><b>Rented compute.</b> With physical routes harder, the network rents more cloud capacity (now ${r0(by.cloud[0].cap)}).</li>`);
  if (rec.tags.includes('offshore')) out.push(`<li class="warn">Some rented compute moves to providers outside US jurisdiction (${Math.round(s.offshore * 100)}% of the KYC rule’s effect lost).</li>`);
  if (rec.tags.includes('spoof')) out.push(`<li class="warn">Diverters learn to spoof location checks (${Math.round(s.spoof * 100)}% of the effect lost).</li>`);
  return out.join('');
}

/** Pick a case card for a quarter, matched to what the network did. Deterministic per seed and quarter. */
const TAG_FOR = { shell: ['shell-company', 'front-company', 'false-end-user'], transship: ['transshipment'], split: ['split-shipments', 'mislabeling'], case: null, cloud: ['cloud-remote-access'] };
export function pickCase(s, rec, seen) {
  const want = rec.tags.flatMap(t => TAG_FOR[t] || []);
  let pool = CASES.filter(c => !seen.includes(c.id) && (!want.length || c.tactics.some(t => want.includes(t))));
  if (!pool.length) pool = CASES.filter(c => !seen.includes(c.id));
  if (!pool.length) return null;
  const h = (s.seed * 31 + rec.turn * 17) >>> 0;
  return pool[h % pool.length];
}

export function caseHTML(c, why) {
  if (!c) return '';
  return `<article class="cd-case" aria-label="Case card">
    <p class="eyebrow">Case card · ${escapeHtml(c.agency)} · ${escapeHtml(c.date)}</p>
    <h3>${escapeHtml(c.title)}</h3>
    ${why ? `<p class="fine muted">${why}</p>` : ''}
    <dl class="cd-dl">
      <dt>What</dt><dd>${escapeHtml(c.items)}${c.value ? ` (${escapeHtml(c.value)})` : ''}</dd>
      <dt>Alleged route</dt><dd>${escapeHtml(c.route)}</dd>
      <dt>Methods</dt><dd>${c.tactics.map(t => `<span class="pill">${escapeHtml(t.replace(/-/g, ' '))}</span>`).join(' ')}</dd>
      <dt>Status</dt><dd>${escapeHtml(c.status)}</dd>
    </dl>
    ${c.quote ? `<blockquote>“${escapeHtml(c.quote)}”</blockquote>` : ''}
    <p class="fine"><a href="${c.url}" target="_blank" rel="noopener">Official release</a>${c.statusUrl && c.statusUrl !== c.url ? ` · <a href="${c.statusUrl}" target="_blank" rel="noopener">Latest status</a>` : ''} · checked ${c.checked}</p>
  </article>`;
}

export const WHY = { shell: 'The network registered new front companies this quarter. Real cases show how fronts and false end users work:', transship: 'The network moved volume to another hub this quarter. A real routing case:', split: 'The network split its shipments this quarter. Real cases show how orders get disguised:', case: 'Your agents landed a prosecution. A real one:', cloud: 'The network rented more cloud compute this quarter. Real enforcement has so far centered on physical hardware:' };

/** End chart: diverted share of baseline (y) against collateral cost (x). pts: [{label, x, y, you}] */
export function paintScatter(svg, pts) {
  const W = 640, H = 300, m = { l: 56, r: 20, t: 16, b: 44 };
  const xMax = Math.max(60, ...pts.map(p => p.x)) * 1.1;
  const X = v => m.l + (v / xMax) * (W - m.l - m.r), Y = v => m.t + (v) * (H - m.t - m.b);
  let h = '';
  for (const t of [0, 0.25, 0.5, 0.75, 1]) h += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/><text x="${m.l - 6}" y="${Y(t) + 4}" class="ax" text-anchor="end">${Math.round((1 - t) * 100)}%</text>`;
  const step = xMax > 120 ? 40 : 20;
  for (let v = 0; v <= xMax; v += step) h += `<text x="${X(v)}" y="${H - m.b + 16}" class="ax" text-anchor="middle">${v}</text>`;
  h += `<text x="${(W + m.l) / 2}" y="${H - 6}" class="ax" text-anchor="middle">Collateral cost to legitimate trade, industry and allies (notional)</text>`;
  h += `<text transform="translate(14 ${(H - m.b + m.t) / 2}) rotate(-90)" class="ax" text-anchor="middle">Diverted, % of no enforcement</text>`;
  // Nudge labels apart so close dots stay readable
  const placed = [];
  const lab = pts.map(p => ({ p, cx: X(p.x), cy: Y(1 - p.y) })).sort((a, b) => a.cy - b.cy);
  for (const l of lab) {
    l.ly = l.cy - 8;
    while (placed.some(o => Math.abs(o.ly - l.ly) < 14 && Math.abs(o.cx - l.cx) < 170)) l.ly += 14;
    placed.push(l);
  }
  for (const { p, cx, cy, ly } of lab) {
    h += `<g class="pt${p.you ? ' you' : ''}"><circle cx="${cx}" cy="${cy}" r="${p.you ? 8 : 6}"/>${Math.abs(ly - cy + 8) > 1 ? `<line x1="${cx}" y1="${cy}" x2="${cx + (cx > W - 160 ? -8 : 8)}" y2="${ly - 4}" class="grid"/>` : ''}<text x="${cx + (cx > W - 160 ? -10 : 10)}" y="${ly}" text-anchor="${cx > W - 160 ? 'end' : 'start'}">${escapeHtml(p.label)}</text></g>`;
  }
  svg.innerHTML = h;
}

export function attrHTML(rows) {
  if (!rows.length) return '<tr><td>You used no levers.</td></tr>';
  return `<thead><tr><th scope="col">Lever</th><th scope="col">Uses</th><th scope="col">Diversion it prevented</th><th scope="col">Collateral cost it added</th></tr></thead><tbody>` +
    rows.map(r => `<tr><th scope="row">${BY_LEVER[r.k].name}</th><td class="num">${r.used}</td><td class="num ${r.dDiverted > 0 ? 'good' : 'bad'}">${r.dDiverted >= 0 ? '' : '−'}${Math.abs(r0(r.dDiverted))} CU</td><td class="num">${r.dCost >= 0 ? '+' : '−'}${Math.abs(r.dCost).toFixed(1)}</td></tr>`).join('') + '</tbody>';
}
