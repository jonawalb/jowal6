// Largest salvos list, weekday/hour grid, and the selected-period detail panel.
import { fmt, escapeHtml as esc } from '../../../shared/js/mapkit.js';
import { GROUPS, reportUrl, periodLabel, periodRows, passed, modelName } from './model.js';
import { GROUP_INFO } from '../data/groups.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const fdate = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : 'n/a');

export function renderSalvos(host, list, onPick, lost) {
  if (!list.length) { host.innerHTML = '<li class="none">No attacks match the filters.</li>'; return; }
  const max = list[0].l;
  host.innerHTML = list.map((a, i) => {
    const segs = GROUPS.filter(g => a.v[g]).map(g => `<span style="width:${(a.v[g] / max * 100).toFixed(2)}%;background:${GROUP_INFO[g].col}" title="${GROUP_INFO[g].short}: ${fmt(a.v[g])}"></span>`).join('');
    const url = reportUrl(a.rep);
    return `<li><button type="button" class="sv" data-d="${a.d}" aria-label="Show ${fdate(a.d)} in the timeline">
      <span class="sv-r num">${i + 1}</span><span class="sv-d">${fdate(a.d)}${a.tm ? ` <small>from ${a.tm}</small>` : ''}</span>
      <span class="sv-bar">${segs}</span><span class="sv-n num">${fmt(a.l)}</span></button>
      <span class="sv-m">${lost ? `${pct(Math.min(a.l, a.x + a.nr), a.l)} reported stopped${a.nr ? `, including ${fmt(a.nr)} lost` : ''}` : `${pct(a.x, a.l)} reported stopped${a.nr ? `, ${fmt(a.nr)} more lost` : ''}`}${url ? ` · <a href="${url}" target="_blank" rel="noopener">Air Force report</a>` : ''}</span></li>`;
  }).join('');
  host.querySelectorAll('.sv').forEach(b => { b.onclick = () => onPick(b.dataset.d); });
}

export function renderClock(host, cg, note) {
  const max = Math.max(1, ...cg.grid.flat());
  const cells = cg.grid.map((row, d) => `<div class="ck-row"><span class="ck-l">${DAYS[d]}</span>${row.map((v, h) =>
    `<span class="ck-c" style="--a:${(v / max).toFixed(3)}" title="${DAYS[d]} ${String(h).padStart(2, '0')}:00, ${fmt(v)} launched"></span>`).join('')}</div>`).join('');
  const hrs = `<div class="ck-row ck-h"><span class="ck-l"></span>${Array.from({ length: 24 }, (_, h) => `<span>${h % 6 === 0 ? String(h).padStart(2, '0') : ''}</span>`).join('')}</div>`;
  const wmax = Math.max(1, ...cg.wd);
  const wd = cg.wd.map((v, d) => `<li><span>${DAYS[d]}</span><span class="wd-b"><i style="width:${(v / wmax * 100).toFixed(1)}%"></i></span><span class="num">${fmt(v)}</span></li>`).join('');
  host.innerHTML = `<div class="ck">${cells}${hrs}</div>
    <div class="wd"><p class="fine">All reports, by weekday the attack began</p><ul>${wd}</ul></div>`;
  note.textContent = cg.timed + cg.untimed
    ? `The grid counts ${fmt(cg.timed)} weapons from reports that give a start time (${pct(cg.timed, cg.timed + cg.untimed)} of those in view). Hours are as the reports give them.`
    : 'No reports in view.';
}

/** Right-panel detail for one period. */
export function renderDetail(host, S, key) {
  if (!key) {
    host.innerHTML = `<p class="eyebrow">Selected period</p><p class="fine">Click a bar in the timeline, or a salvo in the list, to see what the Air Force reported that ${S.res}.</p>`;
    return;
  }
  const rows = periodRows(S, key);
  const pub = rows.filter(r => !r.hid);
  const hid = rows.length - pub.length;
  const byModel = new Map();
  for (const r of pub) {
    const m = byModel.get(r.model) || { g: r.g, l: 0, x: 0, nr: 0, thru: 0 };
    m.l += r.l || 0; m.x += r.x || 0; m.nr += r.nr || 0; m.thru += passed(r, S.lost);
    byModel.set(r.model, m);
  }
  const L = pub.reduce((s, r) => s + (r.l || 0), 0), X = pub.reduce((s, r) => s + (r.x || 0), 0);
  const reps = [...new Set(pub.map(r => r.rep))].map(i => [i, reportUrl(i)]).filter(([, u]) => u);
  const mrows = [...byModel].sort((a, b) => b[1].l - a[1].l).map(([m, v]) =>
    `<tr><td><i class="key" style="background:${GROUP_INFO[v.g].col}"></i>${esc(modelName(m))}</td><td class="num">${fmt(v.l)}</td><td class="num">${fmt(v.x)}</td><td class="num">${v.nr ? fmt(v.nr) : ''}</td></tr>`).join('');
  host.innerHTML = `<p class="eyebrow">Selected ${S.res}</p>
    <h3 class="d-h">${periodLabel(key, S.res)}</h3>
    <dl class="readout"><dt>Launched</dt><dd>${fmt(L)}</dd><dt>Reported stopped</dt><dd>${fmt(X)} (${pct(X, L)})</dd>
    <dt>Reports</dt><dd>${new Set(rows.map(r => r.rep)).size}${hid ? `, ${hid} row${hid > 1 ? 's' : ''} withheld` : ''}</dd></dl>
    ${mrows ? `<div class="tablewrap"><table class="mt-tbl"><thead><tr><th>Weapon, as reported</th><th>Launched</th><th>Stopped</th><th>Lost</th></tr></thead><tbody>${mrows}</tbody></table></div>` : '<p class="fine">Nothing reported for the weapon types switched on.</p>'}
    ${reps.length ? `<p class="fine">Air Force posts: ${reps.slice(0, 12).map(([, u], i) => `<a href="${u}" target="_blank" rel="noopener">${i + 1}</a>`).join(' · ')}${reps.length > 12 ? ` and ${reps.length - 12} more` : ''}</p>` : ''}`;
}
