// Side panel: headline status, readouts for the view or the selected donor, and the picked month.
import { escapeHtml } from '../../../shared/js/mapkit.js';
import { TYPES, MONTHS, DONORS, GROUPS, eur, pctGdp, monthLabel, periodOf, monthDonors, eucApplies } from './model.js';

const $ = id => document.getElementById(id);
const share = (a, c) => c > 0 ? `${Math.round((a / c) * 100)}%` : 'n/a';
const typeRows = (a, c, S) => S.types.map(k => TYPES.findIndex(t => t.k === k)).map(t =>
  `<tr><td><i class="key" style="background:${TYPES[t].col}"></i>${TYPES[t].n}</td><td class="num">${eur(a[t])}</td><td class="num">${eur(c[t])}</td></tr>`).join('');

export function renderPanel(S, sum) {
  const P = periodOf(S.period);
  const when = P.k === 'all' ? 'January 2022 to June 2026' : P.n;
  const types = S.types.length === 3 ? 'all aid' : S.types.map(k => TYPES.find(t => t.k === k).n.toLowerCase()).join(' and ') + ' aid';
  const o = sum.pick;
  if (o) {
    const gdp = o.d.gdp;
    const gname = GROUPS.find(g => g.k === o.d.g).n;
    $('st-b').textContent = `${o.d.n}: ${eur(o.A)} allocated`;
    $('st-s').textContent = `${eur(o.C)} committed, ${types}, ${when}.`;
    const euc = eucApplies(S) && o.d.euc ? `<dt>With EU-level share</dt><dd>${pctGdp(((o.C / 1000 + o.d.euc) / gdp) * 100)} of 2021 GDP committed (Kiel imputation)</dd>` : '';
    $('summary').innerHTML = `
      <dt>Allocated</dt><dd>${eur(o.A)}${gdp ? ` <small>${pctGdp((o.A / 1000 / gdp) * 100)} of 2021 GDP</small>` : ''}</dd>
      <dt>Committed</dt><dd>${eur(o.C)}${gdp ? ` <small>${pctGdp((o.C / 1000 / gdp) * 100)} of 2021 GDP</small>` : ''}</dd>
      ${euc}
      <dt>Allocated ÷ committed</dt><dd>${share(o.A, o.C)}</dd>
      <dt>Rank in view</dt><dd>${sum.rank ? `${sum.rank.pos} of ${sum.rank.of}` : 'not ranked in this view'}</dd>
      <dt>Group</dt><dd>${gname}${gdp ? '' : ' (no GDP, left out of per-GDP views)'}</dd>`;
    $('split').innerHTML = `<table class="tt wide"><tr><th></th><th>Allocated</th><th>Committed</th></tr>${typeRows(o.a, o.c, S)}</table>`;
  } else {
    const a = sum.all;
    $('st-b').textContent = `${eur(a.A)} allocated`;
    $('st-s').textContent = `${eur(a.C)} committed by ${a.n} donors in view, ${types}, ${when}.`;
    $('summary').innerHTML = `
      <dt>Allocated</dt><dd>${eur(a.A)}</dd>
      <dt>Committed</dt><dd>${eur(a.C)}</dd>
      <dt>Allocated ÷ committed</dt><dd>${share(a.A, a.C)}</dd>
      <dt>Donors in view</dt><dd>${a.n}</dd>`;
    $('split').innerHTML = `<table class="tt wide"><tr><th></th><th>Allocated</th><th>Committed</th></tr>${typeRows(a.a, a.c, S)}</table>`;
  }
  $('clear-donor').hidden = S.donor === null;
}

export function renderMonth(host, S, series, onPickDonor) {
  if (S.month === null) {
    host.innerHTML = `<p class="eyebrow">A month</p><p class="fine">Click a month in the timeline to list who allocated and committed aid that month.</p>`;
    return;
  }
  const m = MONTHS[S.month], b = series.bins[S.month];
  const ti = S.types.map(k => TYPES.findIndex(t => t.k === k));
  const tot = k => ti.reduce((s, t) => s + b[k][t], 0);
  let list = '';
  if (S.donor === null) {
    const rows = monthDonors(S, S.month).sort((x, y) => (y.A + y.C / 10) - (x.A + x.C / 10)).slice(0, 8);
    list = rows.length ? `<table class="tt wide"><tr><th>Donor</th><th>Allocated</th><th>Committed</th></tr>${rows.map(r =>
      `<tr><td><button type="button" class="lnk" data-i="${r.i}">${escapeHtml(r.d.n)}</button></td><td class="num">${eur(r.A)}</td><td class="num">${eur(r.C)}</td></tr>`).join('')}</table>`
      : '<p class="fine">Nothing recorded for the donors and aid types in view.</p>';
  }
  host.innerHTML = `<p class="eyebrow">${monthLabel(m)}${S.donor !== null ? `, ${escapeHtml(DONORS[S.donor].n)}` : ''}</p>
    <dl class="readout"><dt>Allocated</dt><dd>${eur(tot('a'))}</dd><dt>Committed</dt><dd>${eur(tot('c'))}</dd></dl>
    ${list}<button type="button" class="btn small" id="clear-month">Clear month</button>`;
  host.querySelectorAll('.lnk').forEach(el => { el.onclick = () => onPickDonor(+el.dataset.i); });
}
