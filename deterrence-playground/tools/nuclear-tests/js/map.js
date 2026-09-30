// Test-site map: one circle per named test site, sized by the number of tests through the selected year
// that pass the filters. Sites without a fixed location (open ocean, scattered Soviet PNE locations) are listed.
import { createProjection, drawBasemap, el } from '../../../shared/js/mapkit.js';
import { SITES, STATES, ENVS } from '../data/tests.js';
import { LAND } from '../data/land.js';
import { STATE_COLOR, yearOf, fmt, esc } from './common.js';
import { grow, onFirstView, ping } from './fx.js';

const proj = createProjection({ lon0: -180, lon1: 180, lat0: -52, lat1: 80, width: 1000 });

export function siteStats(rows, year) {
  const s = SITES.map(() => ({ n: 0, now: 0, first: 9999, last: 0, states: new Set(), env: [0, 0, 0, 0] }));
  for (const t of rows) {
    const y = yearOf(t);
    if (y > year) continue;
    const o = s[t[4]];
    o.n++; if (y === year) o.now++;
    o.first = Math.min(o.first, y); o.last = Math.max(o.last, y);
    o.states.add(t[1]); o.env[t[2]]++;
  }
  return s;
}

export function createMap(host, listHost, { onSite }) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', 'World map of named nuclear test sites');
  host.appendChild(svg);
  drawBasemap(svg, proj, LAND, { gratStep: 0 });
  const layer = el('g', { class: 'nt-sites' }, svg);
  const tip = document.createElement('div');
  tip.className = 'tooltip'; tip.hidden = true;
  host.appendChild(tip);

  // Motion: sites pop in on first view; when the year steps, each site with a test that year sends a ping.
  let lastYear = null, seen = false;
  onFirstView(host, () => { seen = true; grow(layer.querySelectorAll('.dot'), { axis: 'xy', ms: 480, stagger: 18 }); });

  function draw(state, rows) {
    const stats = siteStats(rows, state.year);
    const stepped = seen && lastYear !== null && state.year !== lastYear;
    lastYear = state.year;
    layer.replaceChildren();
    const order = SITES.map((s, k) => k).filter(k => SITES[k].pos && stats[k].n).sort((a, b) => stats[b].n - stats[a].n);
    for (const k of order) {
      const s = SITES[k], o = stats[k], [px, py] = proj.project(s.pos);
      const r = 3 + Math.sqrt(o.n) * 1.25;
      const main = [...o.states].sort((a, b) => a - b)[0];
      const g = el('g', { class: 'nt-site' + (state.site === s.id ? ' on' : '') + (o.now ? ' now' : ''), tabindex: 0, role: 'button',
        'aria-label': `${s.name}: ${o.n} tests through ${state.year}` }, layer);
      if (o.now) el('circle', { cx: px, cy: py, r: r + 5, class: 'ring' }, g);
      const c = el('circle', { cx: px, cy: py, r, class: 'dot' }, g);
      c.style.fill = STATE_COLOR[main];
      if (stepped && o.now) ping(svg, px, py, { color: STATE_COLOR[main], r: r + 16, ms: 700, width: 1.5 });
      if (o.n >= 40 || state.site === s.id) {
        const left = px > proj.W - 160;
        el('text', { x: left ? px - r - 3 : px + r + 3, y: py + 4, class: 'lab', 'text-anchor': left ? 'end' : 'start' }, g, s.name.split(' (')[0].split(',')[0]);
      }
      g.addEventListener('click', () => onSite(s.id));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSite(s.id); } });
      g.addEventListener('pointerenter', ev => showTip(s, o, ev));
      g.addEventListener('pointerleave', () => { tip.hidden = true; });
    }
    const off = SITES.map((s, k) => [s, stats[k]]).filter(([s, o]) => !s.pos && o.n);
    listHost.innerHTML = off.length ? `<p class="fine">Not mapped (no single site):</p>` + off.map(([s, o]) =>
      `<button type="button" class="btn nt-offsite" data-site="${s.id}" aria-pressed="${state.site === s.id}">${esc(s.name)} <span class="num">${o.n}</span></button>`).join('') : '';
    listHost.querySelectorAll('[data-site]').forEach(b => b.onclick = () => onSite(b.dataset.site));
    return stats;
  }

  function showTip(s, o, ev) {
    tip.innerHTML = `<b>${esc(s.name)}</b><small>${esc(s.where)}</small><small>${fmt(o.n)} tests, ${o.first}–${o.last}</small>`
      + `<small>${[...o.states].map(i => STATES[i].name).join(', ')}</small>`;
    const r = host.getBoundingClientRect();
    let x = ev.clientX - r.left + 12;
    if (x > r.width - 220) x = ev.clientX - r.left - 230;
    tip.style.left = Math.max(0, x) + 'px';
    tip.style.top = Math.max(0, ev.clientY - r.top - 10) + 'px';
    tip.hidden = false;
  }

  return { draw };
}

/** Site detail card: counts by environment and state, years, and the largest published yields. */
export function siteCard(siteId, rows, year) {
  const k = SITES.findIndex(s => s.id === siteId);
  if (k < 0) return '<p class="fine">Click a site on the map, or a button under it, for its record.</p>';
  const s = SITES[k], mine = rows.filter(t => t[4] === k && yearOf(t) <= year);
  if (!mine.length) return `<h3>${esc(s.name)}</h3><p class="fine">${esc(s.where)}. No tests here match the filters through ${year}.</p>`;
  const env = [0, 0, 0, 0], st = new Map();
  for (const t of mine) { env[t[2]]++; st.set(t[1], (st.get(t[1]) || 0) + 1); }
  const big = mine.filter(t => t[8] > 0).sort((a, b) => b[8] - a[8]).slice(0, 3);
  const first = yearOf(mine[0]), last = yearOf(mine[mine.length - 1]);
  return `<h3>${esc(s.name)}</h3><p class="fine">${esc(s.where)} · ${mine.length} test${mine.length === 1 ? '' : 's'} matching the filters, ${first}${last !== first ? '–' + last : ''}${year < 2026 ? ` (through ${year})` : ''}</p>
    <dl class="readout">${[...st].map(([i, n]) => `<dt><span class="sw-dot" style="background:${STATE_COLOR[i]}"></span> ${esc(STATES[i].name)}</dt><dd>${n}</dd>`).join('')}
    ${env.map((n, i) => n ? `<dt>${ENVS[i]}</dt><dd>${n}</dd>` : '').join('')}</dl>
    ${big.length ? `<p class="fine nt-big">Largest published upper-bound yields here: ${big.map(t => `${t[6] ? esc(t[6]) + ', ' : ''}${Math.floor(t[0] / 10000)} (${t[8] >= 1000 ? +(t[8] / 1000).toFixed(1) + ' Mt' : +t[8].toFixed(1) + ' kt'})`).join('; ')}.</p>` : ''}`;
}
