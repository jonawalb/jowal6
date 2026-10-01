// Drawing: tracks, partners, concession drivers, the quarter log and the end-of-game pain vs leakage chart.
import { P } from '../data/params.js';
import { PARTNERS, BY_PARTNER } from '../data/partners.js';
import { BY_MEASURE, LEVEL_LABEL, ENF_LABEL } from '../data/measures.js';
import { cohesion, threshold, pExpected, credibility } from './model.js';

const pct = x => `${Math.round(x * 100)}%`;
const r0 = x => Math.round(x);
const sgn = x => (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x);

/** The headline numbers for a state (after `rec`, the last quarter's record, if any). */
export function metrics(s) {
  const h = s.history[s.history.length - 1];
  return {
    revenue: s.tgt.revenue, economy: s.tgt.economy, leak: s.leak, cohesion: cohesion(s),
    own: s.ownCum, shock: s.shock, p: h ? h.pEst : 0,
  };
}

const TRACKS = [
  { id: 'revenue', label: 'Target revenue', max: 130, fmt: r0, unit: '', good: 'down', tip: 'Index, 100 = before sanctions' },
  { id: 'economy', label: 'Target economy', max: 100, fmt: r0, unit: '', good: 'down', tip: 'Index, 100 = before sanctions' },
  { id: 'leak', label: 'Leakage share', max: 1, fmt: pct, good: 'down', tip: 'Share of the pressure that slips around the sanctions' },
  { id: 'cohesion', label: 'Coalition cohesion', max: 100, fmt: r0, good: 'up', tip: 'Partners’ commitment, weighted by trade' },
  { id: 'own', label: 'Your economic cost', max: P.costScale, fmt: r0, good: 'down', tip: `Cumulative; ${P.costScale} scores zero` },
  { id: 'shock', label: 'Global price shock', max: 40, fmt: r0, good: 'down', tip: 'Index of world price pressure' },
  { id: 'p', label: 'Concession odds this quarter', max: 0.5, fmt: pct, good: 'up', tip: 'Your estimate, from your belief about the Target' },
];

export function paintTracks(div, now, prev, preview) {
  div.innerHTML = TRACKS.map(t => {
    const v = now[t.id], w = Math.max(0, Math.min(100, 100 * v / t.max));
    const d = prev ? v - prev[t.id] : 0;
    const delta = prev && Math.abs(t.max === 1 || t.max === 0.5 ? d * 100 : d) >= 1 ? ` <small class="${(d > 0) === (t.good === 'up') ? 'up' : 'dn'}">${sgn(t.max <= 1 ? Math.round(d * 100) : Math.round(d))}</small>` : '';
    const pv = preview ? ` <span class="sa-pv" title="If you end the quarter with these measures">→ ${t.fmt(preview[t.id])}</span>` : '';
    return `<div class="sa-track" title="${t.tip}"><div><span>${t.label}</span><b class="num">${t.fmt(v)}${delta}${pv}</b></div><div class="bar"><span style="width:${w}%"></span></div></div>`;
  }).join('');
}

export function paintPartners(table, s, rec) {
  const via = rec?.via || {};
  const rows = PARTNERS.map(d => {
    const st = s.partners[d.id];
    const status = st.member ? (st.exempt > 0 ? 'Member (carve-out)' : 'Member') : d.member ? 'Defected' : 'Outside';
    const strain = st.member && st.cost > d.tol;
    return `<tr class="${st.member ? '' : 'out'}"><th scope="row"><b>${d.name}</b><small>${status}</small></th>
      <td class="num">${pct(d.exposure)}</td>
      <td>${st.member ? `<span class="sa-mini"><span style="width:${st.commit}%"></span></span><span class="num">${r0(st.commit)}</span>` : '<span class="muted">–</span>'}</td>
      <td class="num ${strain ? 'bad' : ''}">${st.cost.toFixed(1)} / ${d.tol}</td>
      <td class="num">${via[d.id] ? pct(via[d.id]) : '–'}</td></tr>`;
  }).join('');
  table.innerHTML = `<caption class="sr-only">Coalition partners and neutral hubs</caption><thead><tr><th scope="col">Partner</th><th scope="col" title="Share of the Target's trade">Trade</th><th scope="col">Commitment</th><th scope="col" title="Cost last quarter / cost it tolerates">Cost / tol.</th><th scope="col" title="Leakage that ran through this partner last quarter">Leak via</th></tr></thead><tbody>${rows}</tbody>`;
}

/** Concession drivers: pressure parts against what each type would need. */
export function paintDrivers(div, s, rec) {
  const pr = rec?.pressure || { stock: 0, cred: credibility(cohesion(s)), elite: 0, rally: 0, total: 0 };
  const thr = P.types.map(k => ({ k, v: threshold(s, k), b: s.belief[k] }));
  const top = Math.max(thr[2].v * 1.1, pr.stock * pr.cred + pr.elite + 1);
  const x = v => Math.max(0, Math.min(100, 100 * v / top));
  const est = pExpected(s, pr.total);
  div.innerHTML = `<h3>Why the Target might give way</h3>
    <ul class="sa-drv">
      <li><span>Pain, accumulated</span><b class="num">${r0(pr.stock)}</b></li>
      <li><span>× credibility (from cohesion)</span><b class="num">× ${pr.cred.toFixed(2)}</b></li>
      <li><span>+ elite pressure</span><b class="num">+ ${r0(pr.elite)}</b></li>
      <li><span>− rally round the flag</span><b class="num">− ${r0(pr.rally)}</b></li>
      <li class="tot"><span>Pressure</span><b class="num">${r0(pr.total)}</b></li>
    </ul>
    <div class="sa-scale" role="img" aria-label="Pressure ${r0(pr.total)} against thresholds: ${thr.map(t => `${P.typeLabel[t.k]} ${r0(t.v)}`).join(', ')}">
      <span class="fill" style="width:${x(pr.total)}%"></span>
      ${thr.map(t => `<i style="left:${x(t.v)}%" title="${P.typeLabel[t.k]}: ${r0(t.v)}"><em>${P.typeLabel[t.k][0]}</em></i>`).join('')}
    </div>
    <p class="fine">Marks show the pressure each type of Target needs for a 25% chance of conceding in a quarter (B brittle, P pragmatic, F firm), for a ${s.ambition} demand to ${P.demands[s.demand].label.toLowerCase()}. Your belief: ${thr.map(t => `${P.typeLabel[t.k]} ${pct(t.b)}`).join(', ')}. Estimated odds this quarter: <b>${pct(est)}</b>.</p>`;
}

export function policyText(s) {
  const p = s.pol, out = [];
  if (p.energy.lvl) out.push(`Energy ${p.energy.mode === 'cap' ? 'price cap' : 'embargo'} (${LEVEL_LABEL[p.energy.lvl]})`);
  if (p.finance.lvl) out.push(`${p.finance.mode === 'cb' ? 'Central bank' : 'Major banks'} (${LEVEL_LABEL[p.finance.lvl]})`);
  for (const k of ['tech', 'elites', 'shipping']) if (p[k].lvl) out.push(`${BY_MEASURE[k].label} (${LEVEL_LABEL[p[k].lvl]})`);
  for (const k of ['secondary', 'maritime', 'customs']) if (p[k]) out.push(`${{ secondary: 'Secondary sanctions', maritime: 'Maritime enforcement', customs: 'Customs data sharing' }[k]} (${ENF_LABEL[p[k]]})`);
  return out;
}

export function actionText(x) {
  if (x.m === 'coalition') return `${{ reassure: 'Reassure', compensate: 'Compensate', exempt: 'Carve-out for', court: 'Court' }[x.b]} the ${BY_PARTNER[x.a].name}`;
  if (x.m === 'enforce') return `${{ secondary: 'Secondary sanctions', maritime: 'Maritime enforcement', customs: 'Customs data sharing' }[x.a]}: ${ENF_LABEL[x.b]}`;
  const mode = x.m === 'energy' ? (x.a === 'cap' ? 'price cap, ' : 'embargo, ') : x.m === 'finance' ? (x.a === 'cb' ? 'central bank, ' : 'major banks, ') : '';
  return `${BY_MEASURE[x.m].label}: ${mode}${LEVEL_LABEL[x.b]}`;
}

export function logHTML(rec) {
  const li = [];
  li.push(`<li><b>Your measures:</b> ${rec.actions.length ? rec.actions.map(actionText).join('; ') : 'no change'}.</li>`);
  for (const l of rec.log) {
    if (l.kind === 'court') li.push(`<li class="${l.ok ? 'good' : 'bad'}">Courting the ${BY_PARTNER[l.who].name} (${pct(l.p)} chance): ${l.ok ? 'it joins the coalition.' : 'it declines.'}</li>`);
    else li.push(`<li class="bad">${l.text}</li>`);
  }
  li.push(`<li>Pain imposed <b class="num">${r0(rec.grossPain)}</b>, landed <b class="num">${r0(rec.pain)}</b>; leakage <b class="num">${pct(rec.leak)}</b>. Price shock <b class="num">${r0(rec.shock)}</b>. Your cost this quarter <b class="num">${rec.own.toFixed(1)}</b>.</li>`);
  li.push(`<li>Chance the Target conceded this quarter: <b class="num">${pct(rec.pTrue)}</b> (true); you estimated <b class="num">${pct(rec.pEst)}</b>. ${rec.conceded ? '<b>It concedes.</b>' : 'It holds out.'}</li>`);
  for (const r of rec.responses) li.push(`<li class="warn"><b>Target:</b> ${r.text}.</li>`);
  return li.join('');
}

export function feedHTML(s) {
  const h = s.history[s.history.length - 1];
  if (!h) return '<h3>The situation</h3><p class="fine">The Target State has crossed a line. You lead a coalition of four partners; two neutral hubs sit outside it and will carry whatever trade you push their way. Nothing is in force yet.</p>';
  const rs = h.responses.map(r => `<li>${r.text}</li>`).join('');
  return `<h3>Last quarter</h3><ul>${rs || '<li>The Target conceded.</li>'}</ul>`;
}

/** Pain imposed vs pain that landed (bars) and leakage share (line), by quarter. */
export function paintChart(svg, hist) {
  const W = Math.round(Math.max(320, Math.min(640, svg.getBoundingClientRect?.().width || 640))), H = 220, L = 34, R = 38, T = 12, B = 22, n = Math.max(hist.length, 1);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const maxP = Math.max(10, ...hist.map(h => h.grossPain)) * 1.1;
  const bw = (W - L - R) / n, y = v => T + (H - T - B) * (1 - v / maxP), yl = v => T + (H - T - B) * (1 - v);
  let g = `<rect x="0" y="0" width="${W}" height="${H}" fill="none"/>`;
  for (let i = 0; i <= 4; i++) {
    const v = maxP * i / 4, yy = y(v);
    g += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" stroke="var(--rule)"/><text x="${L - 6}" y="${yy + 4}" text-anchor="end" style="font:var(--axis-font);fill:var(--axis-ink)">${Math.round(v)}</text><text x="${W - R + 6}" y="${yl(i / 4) + 4}" style="font:var(--axis-font);fill:var(--axis-ink)">${i * 25}%</text>`;
  }
  hist.forEach((h, i) => {
    const x = L + i * bw + bw * 0.18, w = bw * 0.64;
    g += `<rect x="${x}" y="${y(h.grossPain)}" width="${w}" height="${y(0) - y(h.grossPain)}" fill="var(--chip)" stroke="var(--c1)" stroke-dasharray="3 2"><title>Imposed ${Math.round(h.grossPain)}</title></rect>`;
    g += `<rect x="${x}" y="${y(h.pain)}" width="${w}" height="${y(0) - y(h.pain)}" fill="var(--c1)" opacity=".85"><title>Landed ${Math.round(h.pain)}</title></rect>`;
    g += `<text x="${x + w / 2}" y="${H - B + 16}" text-anchor="middle" style="font:var(--axis-font);fill:var(--axis-ink)">${n > 6 && W < 420 ? String(h.turn + 1) : P.quarter(h.turn).replace(' Year ', '/Y')}</text>`;
  });
  const pts = hist.map((h, i) => `${L + i * bw + bw / 2},${yl(h.leak)}`).join(' ');
  g += `<polyline points="${pts}" fill="none" stroke="var(--bad)" stroke-width="2.5"/>`;
  g += hist.map((h, i) => `<circle cx="${L + i * bw + bw / 2}" cy="${yl(h.leak)}" r="4" fill="var(--bad)"><title>Leakage ${pct(h.leak)}</title></circle>`).join('');
  svg.innerHTML = g;
  svg.setAttribute('aria-label', 'Pain imposed, pain landed and leakage by quarter: ' + hist.map(h => `${P.quarter(h.turn)} imposed ${Math.round(h.grossPain)}, landed ${Math.round(h.pain)}, leakage ${pct(h.leak)}`).join('; '));
}
