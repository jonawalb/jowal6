// Side panel (year readout, country toggles, view options, milestone card), the then-vs-now cards and
// the per-country page.
import { COUNTRIES, WORLD, Y0, Y1 } from '../data/stockpiles.js';
import { STATUS } from '../data/status.js';
import { NOTES, FAS_URL } from '../data/notes.js';
import { MILESTONES } from '../data/milestones.js';
import { COLOR, fmt, pct, esc } from './common.js';

const PEAK_YEAR = WORLD.indexOf(Math.max(...WORLD)) + Y0;
const val = (c, y) => c.v[y - Y0];
const sumOn = (on, y) => COUNTRIES.filter(c => on.has(c.iso)).reduce((s, c) => s + val(c, y), 0);

export function panelHTML() {
  return `
  <div class="sec">
    <p class="eyebrow">Selected year</p>
    <p class="na-year num" id="p-year">1986</p>
    <div class="na-kpis">
      <div class="na-kpi"><b id="p-sum">0</b><span>Stockpiles of the countries shown</span></div>
      <div class="na-kpi"><b id="p-world">0</b><span>Global total, incl. retired warheads</span></div>
    </div>
    <p class="fine" id="p-peak"></p>
  </div>
  <div class="sec">
    <p class="eyebrow">Countries</p>
    <div class="na-quick">
      <button type="button" class="btn" data-q="all">All</button>
      <button type="button" class="btn" data-q="big2">U.S. and Russia</button>
      <button type="button" class="btn" data-q="others">Everyone else</button>
    </div>
    <ul class="na-clist" id="p-clist"></ul>
    <p class="fine">Click a name's value to open its country page below.</p>
  </div>
  <div class="sec">
    <p class="eyebrow">View</p>
    <div class="choices" role="group" aria-label="Chart type">
      <button type="button" data-view="stack" aria-pressed="true">Stacked area<br><small class="muted">How the world total splits</small></button>
      <button type="button" data-view="lines" aria-pressed="false">Lines<br><small class="muted">Compare countries directly</small></button>
    </div>
    <label class="tg"><input type="checkbox" id="o-log"><span class="sw"></span><span class="t">Log scale<small>Lines view only. Makes arsenals of 60 and 6,000 readable on one chart.</small></span></label>
    <label class="tg"><input type="checkbox" id="o-world" checked><span class="sw"></span><span class="t">Global total line<small>FAS global inventory, which also counts retired warheads awaiting dismantlement.</small></span></label>
    <label class="tg"><input type="checkbox" id="o-ms" checked><span class="sw"></span><span class="t">Arms-control milestones<small>Markers under the time axis. Click one for dates and the primary source.</small></span></label>
  </div>
  <div class="sec" id="p-ms"></div>`;
}

export function renderPanel(root, state, act) {
  const y = state.year;
  root.querySelector('#p-year').textContent = y;
  root.querySelector('#p-sum').textContent = fmt(sumOn(state.on, y));
  root.querySelector('#p-world').textContent = fmt(WORLD[y - Y0]);
  const w = WORLD[y - Y0], pk = WORLD[PEAK_YEAR - Y0];
  root.querySelector('#p-peak').textContent = y === PEAK_YEAR
    ? `${PEAK_YEAR} is the peak of the global series: ${fmt(pk)} warheads.`
    : `The global total is ${Math.round(w / pk * 100)}% of its ${PEAK_YEAR} peak of ${fmt(pk)}.`;

  const maxV = Math.max(1, ...COUNTRIES.map(c => val(c, y)));
  const list = root.querySelector('#p-clist');
  list.innerHTML = [...COUNTRIES].sort((a, b) => val(b, y) - val(a, y) || a.name.localeCompare(b.name)).map(c => {
    const v = val(c, y), on = state.on.has(c.iso);
    return `<li class="${on ? '' : 'off'}">
      <input type="checkbox" id="cb-${c.iso}" data-iso="${c.iso}" ${on ? 'checked' : ''}>
      <label for="cb-${c.iso}"><span class="sw-dot" style="background:${COLOR[c.iso]}"></span>${esc(c.name)}</label>
      <button type="button" class="btn v" data-page="${c.iso}" style="padding:1px 6px;font-weight:500" aria-label="Open ${esc(c.name)} country page">${fmt(v)}</button>
      <span class="bar"><i style="width:${v / maxV * 100}%;background:${COLOR[c.iso]}"></i></span></li>`;
  }).join('');
  list.querySelectorAll('input').forEach(i => i.onchange = () => act.toggle(i.dataset.iso, i.checked));
  list.querySelectorAll('[data-page]').forEach(b => b.onclick = () => act.page(b.dataset.page, true));
  root.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === state.view));
  const log = root.querySelector('#o-log');
  log.checked = state.log; log.disabled = state.view !== 'lines';
  root.querySelector('#o-world').checked = state.world;
  root.querySelector('#o-ms').checked = state.ms;

  const ms = MILESTONES.find(m => m.id === state.msId) || nearestMilestone(y);
  const box = root.querySelector('#p-ms');
  box.innerHTML = ms ? `<p class="eyebrow">${state.msId ? 'Milestone' : 'Nearest milestone'}</p>${milestoneCard(ms)}` : '';
}

export function nearestMilestone(y) {
  return [...MILESTONES].sort((a, b) => Math.abs(a.year - y) - Math.abs(b.year - y))[0];
}

export function milestoneCard(ms) {
  return `<div class="na-ms-card"><h3>${esc(ms.label)}</h3><p class="d">${esc(ms.when)}</p><p>${ms.text}</p>
    <div class="xlinks">${ms.src.map(s => `<a class="xlink" href="${s.url}" target="_blank" rel="noopener">${esc(s.t)}</a>`).join('')}</div></div>`;
}

export function wirePanel(root, act) {
  root.querySelectorAll('[data-q]').forEach(b => b.onclick = () => act.quick(b.dataset.q));
  root.querySelectorAll('[data-view]').forEach(b => b.onclick = () => act.set({ view: b.dataset.view }));
  root.querySelector('#o-log').onchange = e => act.set({ log: e.target.checked });
  root.querySelector('#o-world').onchange = e => act.set({ world: e.target.checked });
  root.querySelector('#o-ms').onchange = e => act.set({ ms: e.target.checked });
}

/** Then-vs-now cards: the chosen "then" year against the latest year. */
export function renderCompare(root, then) {
  const now = Y1;
  const groups = [
    { name: 'World (all warheads)', sw: 'var(--ink)', a: WORLD[then - Y0], b: WORLD[now - Y0] },
    ...['USA', 'RUS'].map(iso => { const c = COUNTRIES.find(k => k.iso === iso); return { name: c.name, sw: COLOR[iso], a: val(c, then), b: val(c, now) }; }),
    { name: 'All other states', sw: 'var(--muted)', a: COUNTRIES.filter(c => !['USA', 'RUS'].includes(c.iso)).reduce((s, c) => s + val(c, then), 0),
      b: COUNTRIES.filter(c => !['USA', 'RUS'].includes(c.iso)).reduce((s, c) => s + val(c, now), 0) },
    { name: 'China', sw: COLOR.CHN, a: val(COUNTRIES.find(c => c.iso === 'CHN'), then), b: val(COUNTRIES.find(c => c.iso === 'CHN'), now) },
  ];
  const nuc = y => COUNTRIES.filter(c => val(c, y) > 0).length;
  groups.push({ name: 'States holding warheads', sw: 'var(--brand-ink)', a: nuc(then), b: nuc(now), plain: true });
  root.innerHTML = groups.map(g => `<div class="na-card"><h3><span class="sw-dot" style="background:${g.sw}"></span>${esc(g.name)}</h3>
    <div class="row"><span>${then}</span><b>${fmt(g.a)}</b></div>
    <div class="row"><span>${now}</span><b>${fmt(g.b)}</b></div>
    <p class="chg">${g.plain ? (g.b - g.a >= 0 ? '+' : '') + (g.b - g.a) : `${pct(g.b, g.a)} (${g.b - g.a >= 0 ? '+' : ''}${fmt(g.b - g.a)})`}</p></div>`).join('');
}

function spark(c) {
  const W = 520, H = 120, m = { l: 34, r: 8, t: 8, b: 18 };
  const mx = Math.max(...c.v, 1);
  const x = i => m.l + i / (c.v.length - 1) * (W - m.l - m.r);
  const y = v => m.t + (1 - v / mx) * (H - m.t - m.b);
  const pts = c.v.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('L');
  const pk = c.v.indexOf(mx);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.name)} stockpile, ${Y0} to ${Y1}, peak ${fmt(mx)} in ${Y0 + pk}">
    <path class="sp-area" d="M${x(0)},${y(0)}L${pts}L${x(c.v.length - 1)},${y(0)}Z" style="fill:${COLOR[c.iso]}"/>
    <path class="sp-line" d="M${pts}" style="stroke:${COLOR[c.iso]}"/>
    <text x="${m.l - 4}" y="${y(mx) + 4}" text-anchor="end">${mx >= 1000 ? Math.round(mx / 1000) + 'k' : mx}</text>
    <text x="${m.l - 4}" y="${y(0)}" text-anchor="end">0</text>
    <text x="${x(0)}" y="${H - 3}">${Y0}</text><text x="${x(c.v.length - 1)}" y="${H - 3}" text-anchor="end">${Y1}</text>
    <circle cx="${x(pk)}" cy="${y(mx)}" r="4" style="fill:${COLOR[c.iso]};stroke:var(--panel);stroke-width:2"/></svg>`;
}

/** Per-country page. */
export function renderCountry(root, iso) {
  const c = COUNTRIES.find(k => k.iso === iso) || COUNTRIES[0];
  const n = NOTES[c.iso], s = STATUS[c.iso];
  const first = c.v.findIndex(v => v > 0), mx = Math.max(...c.v), pk = c.v.indexOf(mx);
  const now = val(c, Y1);
  let status = '<p class="fine">No 2026 status breakdown: this state is not in the 2026 FAS table.</p>';
  if (s) {
    const parts = [['st-ds', 'Deployed strategic', s.deployed_strategic], ['st-dn', 'Deployed nonstrategic', s.deployed_nonstrategic],
      ['st-rs', 'Reserve / nondeployed', s.reserve_nondeployed], ['st-rt', 'Retired, awaiting dismantlement', s.retired]];
    const tot = parts.reduce((a, p) => a + p[2], 0) || 1;
    status = `<p class="eyebrow">Warheads by status, ${s.year} (FAS)</p>
      <div class="na-statbar" role="img" aria-label="${parts.map(p => `${p[1]} ${p[2]}`).join(', ')}">${parts.filter(p => p[2] > 0).map(p => `<i class="${p[0]}" style="flex:${p[2] / tot}" title="${p[1]}: ${fmt(p[2])}"></i>`).join('')}</div>
      <div class="na-statleg">${parts.map(p => `<span class="sw-dot ${p[0]}"></span><span>${p[1]}</span><span class="n">${fmt(p[2])}</span>`).join('')}
      <span></span><span><b>Military stockpile</b> (FAS table)</span><span class="n"><b>${fmt(n.stockpile)}</b></span>
      <span></span><span><b>Total inventory</b> (FAS table)</span><span class="n"><b>${fmt(n.inventory)}</b></span></div>`;
  }
  root.innerHTML = `<div><h3><span class="sw-dot" style="background:${COLOR[c.iso]};width:14px;height:14px"></span> ${esc(c.name)}</h3>
      <div class="na-spark">${spark(c)}</div>
      <dl class="readout facts">
        <dt>First warheads in series</dt><dd>${first >= 0 ? Y0 + first : 'none'}</dd>
        <dt>Peak stockpile</dt><dd>${fmt(mx)} in ${Y0 + pk}</dd>
        <dt>${Y1} stockpile</dt><dd>${fmt(now)}${mx ? ` (${Math.round(now / mx * 100)}% of peak)` : ''}</dd>
      </dl></div>
    <div>${status}<p style="margin-top:10px">${esc(n.text)}</p>
      <a class="xlink" href="${FAS_URL}" target="_blank" rel="noopener">FAS, Status of World Nuclear Forces 2026</a></div>`;
}
