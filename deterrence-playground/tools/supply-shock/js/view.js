// Drawing: the minerals dashboard, the Supplier read, the year's results table and the debrief chart.
import { P, yearOf } from '../data/params.js';
import { MINERALS, IDS, BY, SOURCES } from '../data/minerals.js';
import { parts } from './market.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, a, parent) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (parent) parent.appendChild(n); return n; };
export const MCOL = { li: 'var(--blue)', gr: 'var(--warn)', re: 'var(--bad)', ga: 'var(--roc)', ge: 'var(--jp)', co: 'var(--ally)' };
export const CTRL = { open: 'Open', lic: 'Licensing', ban: 'Ban' };
const pct = x => `${Math.round(x * 100)}%`;
const real = (v, note) => v == null ? `<span class="muted" title="${note || 'No verified figure'}">n/a</span>` : `<span title="${note}">${v}%</span>`;

/** One row per mineral: real concentration, your reliance, pipeline, stockpile, controls. */
export function paintDashboard(div, s, plan = []) {
  const last = s.history[s.history.length - 1];
  div.innerHTML = `<div class="ss-row ss-head" aria-hidden="true"><span>Mineral</span><span>China’s real share of world output<br><small>mining · refining</small></span><span>Your supply (${yearOf(s.t)})</span><span>Projects in the pipeline</span><span>Stock</span></div>`
    + MINERALS.map(({ id, name, use, real: r }) => {
      const p = parts(s, id), sec = p.secure / p.D, ctrl = s.ctrl[id], x = s.m[id];
      const lastMet = last ? last.rows.find(w => w.m === id).met : null;
      const builds = s.projects.filter(q => q.m === id && q.status === 'build');
      const on = s.projects.filter(q => q.m === id && q.status === 'online');
      const offs = s.offtakes.filter(o => o.m === id && (o.on || (!o.ended && o.start === s.t - 1)));
      const planned = plan.filter(a => a.m === id);
      const chips = builds.map(q => {
        const done = Math.max(0, q.lead - q.left), tot = Math.max(q.lead, done + q.left);
        return `<li class="ss-proj ${q.site}" title="${q.site === 'dom' ? 'Domestic' : 'Allied'} ${q.kind}, started ${yearOf(q.start)}${q.slips ? `, slipped ${q.slips}×` : ''}${q.floor ? ', price floor' : ''}"><span>${q.kind === 'mine' ? 'Mine' : 'Refinery'} · ${q.site === 'dom' ? 'dom' : 'ally'}${q.floor ? ' ⛉' : ''}</span><i><b style="width:${(100 * done / tot).toFixed(0)}%"></b></i><em class="num">${q.left}y</em></li>`;
      }).join('') + (on.length ? `<li class="ss-online">${on.length} online · +${on.reduce((t, q) => t + q.cap, 0)}</li>` : '')
        + (offs.length ? `<li class="ss-online">offtake${offs.some(o => o.on) ? '' : ' (next year)'}</li>` : '')
        + (x.recycleOn ? `<li class="ss-online">recycling ${Math.round(x.recycled)}%</li>` : '')
        + (x.thriftOn ? `<li class="ss-online">R&amp;D${x.thrift > 0 ? ` −${Math.round(x.thrift * 100)}% demand` : s.t - x.thriftAt >= P.thrift.lag && !x.thriftOk ? ' failed' : ' pending'}</li>` : '')
        + planned.map(a => `<li class="ss-plan">planned: ${a.id === 'stock' ? 'stockpile' : a.id}</li>`).join('');
      const idle = p.oreIdle > 0.5 ? `<small class="ss-idle" title="Ore you can reach outside the Supplier but cannot refine">${Math.round(p.oreIdle)} ore idle: no refining</small>` : '';
      return `<div class="ss-row" style="--mc:${MCOL[id]}">
        <span class="ss-name"><b>${name}</b><small>${use}</small></span>
        <span class="ss-real num">${real(r.mine, r.mineNote)} · ${real(r.refine, r.refineNote)}</span>
        <span class="ss-supply">
          <span class="ss-sbar" role="img" aria-label="${name}: ${pct(sec)} of demand secure, ${pct(1 - sec)} through the Supplier"><b style="width:${pct(sec)}"></b></span>
          <span class="ss-sub"><span>${pct(sec)} secure · <b>${pct(1 - sec)}</b> via Supplier</span>
          <span class="ss-ctrl ${ctrl}">${CTRL[ctrl]}${x.dump > 0 ? ' · dumping' : ''}</span>${lastMet != null && lastMet < 0.999 ? `<span class="ss-met">last year ${pct(lastMet)} met</span>` : ''}</span>${idle}
        </span>
        <ul class="ss-pipe">${chips || '<li class="muted">nothing building</li>'}</ul>
        <span class="ss-stock num"><b>${Math.round(x.stock)}</b> mo</span>
      </div>`;
    }).join('');
}

/** The read of the Supplier's type, tension and the buyers' coalition. */
export function paintRead(div, s) {
  const b = s.belief, best = P.types.reduce((a, t) => (b[t] > b[a] ? t : a));
  div.innerHTML = `<h3>Reading the Supplier</h3>
    <p class="fine">It looks most like <b>${P.typeLabel[best].toLowerCase()}</b> (${pct(b[best])}). The read updates by Bayes’ rule from what it does.</p>
    <div class="ss-stack" role="img" aria-label="${P.types.map(t => `${P.typeLabel[t]} ${pct(b[t])}`).join(', ')}">${P.types.map(t => `<span class="${t}" style="width:${(b[t] * 100).toFixed(1)}%"></span>`).join('')}</div>
    <p class="ss-key">${P.types.map(t => `<span><i class="${t}"></i>${P.typeLabel[t]} ${pct(b[t])}</span>`).join('')}</p>
    <div class="ss-meter"><span>Tension</span><span class="bar"><b style="width:${Math.round(s.tension)}%"></b></span><span class="num">${Math.round(s.tension)}</span></div>
    <div class="ss-meter"><span>Buyers’ coalition</span><span class="dots">${Array.from({ length: P.diplo.max }, (_, i) => `<i class="${i < s.coalition ? 'on' : ''}"></i>`).join('')}</span><span class="num">${s.coalition}/${P.diplo.max}</span></div>`;
}

/** This year's supply, mineral by mineral. */
export function resultsTable(h) {
  const r = x => Math.round(x);
  return `<table class="ss-res"><caption class="fine">Units: each mineral’s 2027 demand = 100 (illustrative).</caption>
    <thead><tr><th scope="col">Mineral</th><th scope="col">Supplier</th><th scope="col">Demand</th><th scope="col">Secure</th><th scope="col">Via Supplier</th><th scope="col">Withheld</th><th scope="col">Stockpile draw</th><th scope="col">Shortfall</th><th scope="col">Met</th></tr></thead><tbody>`
    + h.rows.map(w => `<tr class="${w.shortfall > 0.5 ? 'short' : ''}"><th scope="row" style="--mc:${MCOL[w.m]}">${BY[w.m].name}</th><td><span class="ss-ctrl ${w.ctrl}">${CTRL[w.ctrl]}</span></td><td class="num">${r(w.D)}</td><td class="num">${r(w.secure)}</td><td class="num">${r(w.dep)}</td><td class="num">${r(w.withheld)}</td><td class="num">${r(w.draw)}</td><td class="num">${r(w.shortfall)}</td><td class="num"><b>${pct(w.met)}</b></td></tr>`).join('')
    + `</tbody></table>`;
}

/** Debrief: share of demand met per mineral by year, with controlled years marked. */
export function paintChart(svg, s) {
  svg.innerHTML = '';
  const W = 640, H = 260, L = 44, R = 92, T = 12, B = 30, n = s.history.length;
  const x = i => L + (n <= 1 ? 0 : (i / (n - 1)) * (W - L - R)), y = v => T + (1 - v) * (H - T - B);
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: 'var(--rule)' }, svg);
    el('text', { x: L - 6, y: y(v) + 4, 'font-size': 11, 'text-anchor': 'end', fill: 'var(--muted)', 'font-family': 'var(--mono)' }, svg).textContent = `${v * 100}%`;
  }
  s.history.forEach((h, i) => { el('text', { x: x(i), y: H - 10, 'font-size': 11, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-family': 'var(--mono)' }, svg).textContent = `’${String(yearOf(h.t)).slice(2)}`; });
  const used = [];
  const labelY = v => { while (used.some(u => Math.abs(u - v) < 13)) v += 13; used.push(v); return v; };
  for (const m of IDS) {
    const pts = s.history.map(h => h.rows.find(r => r.m === m));
    el('polyline', { points: pts.map((r, i) => `${x(i)},${y(r.met)}`).join(' '), fill: 'none', stroke: MCOL[m], 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, svg);
    pts.forEach((r, i) => { if (r.ctrl !== 'open') el('circle', { cx: x(i), cy: y(r.met), r: r.ctrl === 'ban' ? 4.5 : 3.5, fill: r.ctrl === 'ban' ? MCOL[m] : 'var(--panel)', stroke: MCOL[m], 'stroke-width': 1.8 }, svg); });
    const ly = labelY(y(pts[pts.length - 1].met) + 4);
    el('text', { x: W - R + 8, y: ly, 'font-size': 11.5, 'font-weight': 600, fill: MCOL[m] }, svg).textContent = BY[m].name.replace('Magnet rare earths', 'Rare earths');
  }
}

/** Plain table of the same series, for screen readers and anyone who prefers numbers. */
export const chartTable = s => `<table class="ss-res"><thead><tr><th scope="col">Year</th>${IDS.map(m => `<th scope="col">${BY[m].name}</th>`).join('')}<th scope="col">Output</th></tr></thead><tbody>`
  + s.history.map(h => `<tr><th scope="row">${yearOf(h.t)}</th>${IDS.map(m => { const r = h.rows.find(w => w.m === m); return `<td class="num">${pct(r.met)}${r.ctrl !== 'open' ? ` <small>${r.ctrl === 'ban' ? 'ban' : 'lic'}</small>` : ''}</td>`; }).join('')}<td class="num">${h.output.toFixed(1)}</td></tr>`).join('') + '</tbody></table>';

export const sourceLinks = () => Object.values(SOURCES).map(x => `<a href="${x.url}" target="_blank" rel="noopener">${x.short}</a>`).join(' · ');
