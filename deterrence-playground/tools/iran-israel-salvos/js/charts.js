// Stage charts: salvo composition bars, interception funnel, defenders matrix and three-episode comparison.
import { escapeHtml, fmt } from '../../../shared/js/mapkit.js';
import { EPISODES, TYPES, SYSTEMS, PROVISIONAL_2026 } from '../data/episodes.js';
import { refs } from './refs.js';

const MAX = Math.max(...EPISODES.map(e => TYPES.reduce((s, t) => s + (e.launched[t.k].hi ?? e.launched[t.k].v ?? 0), 0)));
const SPAN = MAX * 1.32; // leave room for the total label
const pc = v => `${(v / SPAN * 100).toFixed(2)}%`;

export function renderComp(host, S) {
  const rows = EPISODES.map(e => {
    let x = 0;
    const segs = TYPES.map(t => {
      const f = e.launched[t.k]; if (!f.v) return '';
      const s = `<span class="seg t-${t.k}" style="left:${pc(x)};width:${pc(f.v)}" title="${t.label}: ${escapeHtml(f.txt)}">${f.v / SPAN > 0.12 ? escapeHtml(f.txt) : ''}</span>`;
      x += f.v; return s;
    }).join('');
    const bm = e.launched.bm, others = x - bm.v;
    const rng = bm.lo != null && bm.hi !== bm.lo ? `<span class="rng" style="left:${pc(bm.lo + others)};width:${pc(bm.hi - bm.lo)}" title="Range across sources"></span>` : '';
    const hiTot = (bm.hi ?? bm.v) + others;
    const tot = `<span class="tot" style="left:${pc(Math.max(x, hiTot))}">${escapeHtml(e.totShort)}</span>`;
    const sub = TYPES.filter(t => e.launched[t.k].v).map(t => `${t.short} ${escapeHtml(e.launched[t.k].txt)}`).join(' · ');
    return `<button type="button" class="ii-crow" data-ep="${e.id}" aria-pressed="${e.id === S.ep}">
      <span class="nm">${e.short}<small>${e.name}</small></span>
      <span class="ii-track">${segs}${rng}${tot}</span>
      <span class="sub">${sub}</span></button>`;
  }).join('');
  const ticks = [0, 500, 1000, 1500].filter(v => v <= MAX).map(v => `<span style="left:${pc(v)}">${fmt(v)}</span>`).join('');
  host.innerHTML = rows + `<div class="ii-axis" aria-hidden="true"><i></i><div>${ticks}</div></div>`;
  const e = EPISODES.find(x => x.id === S.ep);
  document.getElementById('ii-comp-note').innerHTML = Object.entries(e.launched).filter(([, f]) => f.note)
    .map(([, f]) => `${escapeHtml(f.note)} ${refs(f.src)}`).join(' ') + ' No source reports cruise missiles or drones in October 2024, or cruise missiles in June 2025.';
}

export function renderFunnel(host, dis, S) {
  const e = EPISODES.find(x => x.id === S.ep);
  const top = e.funnel[0].v;
  document.getElementById('ii-fun-h').textContent = `From launch to impact: ${e.short}`;
  host.innerHTML = e.funnel.map(f => `<div class="ii-fs" data-k="${f.k}">
      <span class="lb">${escapeHtml(f.label)}<small>${f.derived ? 'bar derived, see note' : 'as reported'}</small></span>
      <span class="ii-fbar"><span style="width:${Math.max(4, f.v / top * 100).toFixed(1)}%">${escapeHtml(f.txt)}</span></span>
      <span class="src-n">${escapeHtml(f.note)} ${refs(f.src)}</span></div>`).join('')
    + (e.drones ? `<p class="fine">Drones: ${escapeHtml(e.drones.txt)} ${refs(e.drones.src)}</p>` : '')
    + `<p class="fine">Casualties: ${escapeHtml(e.casualties.txt)} ${refs(e.casualties.src)}</p>`;
  dis.innerHTML = `<b>Where sources disagree</b><ul>${e.disagree.map(d => `<li>${escapeHtml(d.txt)} ${refs(d.src)}</li>`).join('')}</ul>`;
}

export function renderMatrix(table, S) {
  const head = `<thead><tr><th>System</th>${EPISODES.map(e => `<th class="${e.id === S.ep ? 'col-sel' : ''}">${e.short}</th>`).join('')}</tr></thead>`;
  const sys = SYSTEMS.map(s => `<tr><td><b>${s.name}</b><small>${s.who}, ${s.role}</small></td>${EPISODES.map(e => {
    const c = e.systems[s.k];
    return `<td class="${e.id === S.ep ? 'col-sel ' : ''}${c ? 'on' : 'no'}">${c ? `✓<small>${escapeHtml(c.txt)} ${refs(c.src)}</small>` : '<small>no source</small>'}</td>`;
  }).join('')}</tr>`).join('');
  const countries = ['Israel', 'United States', 'United Kingdom', 'France', 'Jordan'];
  const ctry = countries.map(c => `<tr><td><b>${c}</b><small>defending state</small></td>${EPISODES.map(e => {
    const d = e.defenders.find(x => x.c === c);
    return `<td class="${e.id === S.ep ? 'col-sel ' : ''}${d ? 'on' : 'no'}">${d ? `✓<small>${escapeHtml(d.role)} ${refs(d.src)}</small>` : '<small>no source</small>'}</td>`;
  }).join('')}</tr>`).join('');
  table.innerHTML = head + `<tbody>${ctry}${sys}</tbody>`;
}

export function renderCompare(table, S) {
  const cell = (e, h) => `<td class="${e.id === S.ep ? 'col-sel' : ''}">${h}</td>`;
  const row = (label, fn) => `<tr><td>${label}</td>${EPISODES.map(e => cell(e, fn(e))).join('')}</tr>`;
  const L = (e, k) => { const f = e.launched[k]; return f.v ? `${escapeHtml(f.txt)}${f.lo != null && f.lo !== f.hi ? `<small>${fmt(f.lo)}–${fmt(f.hi)}</small>` : ''}` : '<small>none reported</small>'; };
  const through = e => e.funnel.find(f => f.k === 'through');
  table.innerHTML = `<thead><tr><th></th>${EPISODES.map(e => `<th class="${e.id === S.ep ? 'col-sel' : ''}">${e.short}</th>`).join('')}</tr></thead><tbody>
    ${row('Ballistic missiles', e => L(e, 'bm'))}
    ${row('Cruise missiles', e => L(e, 'cm'))}
    ${row('Drones', e => L(e, 'uav'))}
    ${row('Interception', e => `${escapeHtml(e.rate.txt)} ${refs(e.rate.src)}`)}
    ${row('Got through', e => `${escapeHtml(through(e).txt)} ${refs(through(e).src)}`)}
    ${row('Casualties', e => `<small>${escapeHtml(e.casualties.txt)}</small> ${refs(e.casualties.src)}`)}
    ${row('Defended by', e => `<small>${e.defenders.filter(d => !/no interceptions/.test(d.role)).map(d => d.c).join(', ')}</small>`)}
  </tbody>`;
  const n = document.getElementById('ii-prov');
  if (n) n.innerHTML = `<b>2026, provisional:</b> ${escapeHtml(PROVISIONAL_2026.txt)} ${refs(PROVISIONAL_2026.src)}`;
}
