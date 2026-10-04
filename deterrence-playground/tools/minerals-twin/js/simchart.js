// Simulator chart: monthly supply reaching buyers outside the restricting country, as % of pre-shock flow.
// Stacked areas: throughput (blue), inventory/stockpile draw (amber), shortfall (red); dashed line = demand.
import { HORIZON } from './model.js';
import { esc } from './flow.js';

const STAGE_COL = ['var(--c4)', 'var(--c3)', 'var(--c6)'];

export function drawSim(svg, tip, mineral, run, month, onScrub) {
  const box = svg.parentElement.getBoundingClientRect();
  const W = Math.max(330, Math.round(box.width || 900));
  const narrow = W < 620;
  const H = narrow ? 240 : 290;
  const m = { l: 40, r: 12, t: 12, b: 28 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const X = t => m.l + (t / (HORIZON - 1)) * iw;
  const Y = v => m.t + (1 - Math.max(0, Math.min(1, v))) * ih;
  let g = '';
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    g += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"></line><text class="ax-t" x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${v * 100}%</text>`;
  }
  const step = narrow ? 24 : 12;
  for (let t = 0; t < HORIZON; t += step) g += `<text class="ax-t" x="${X(t)}" y="${H - 8}" text-anchor="middle">${t === 0 ? '0' : 'yr ' + t / 12}</text>`;

  const area = (lo, hi) => {
    let d = `M${X(0)},${Y(hi(0))}`;
    for (let t = 1; t < HORIZON; t++) d += ` L${X(t)},${Y(hi(t))}`;
    for (let t = HORIZON - 1; t >= 0; t--) d += ` L${X(t)},${Y(lo(t))}`;
    return d + ' Z';
  };
  const line = f => { let d = `M${X(0)},${Y(f(0))}`; for (let t = 1; t < HORIZON; t++) d += ` L${X(t)},${Y(f(t))}`; return d; };
  const thr = t => Math.min(run.thr[t], run.dem[t]);
  g += `<path class="a-thr" d="${area(() => 0, thr)}"></path>`;
  g += `<path class="a-draw" d="${area(thr, t => thr(t) + run.draw[t])}"></path>`;
  g += `<path class="a-short" d="${area(t => thr(t) + run.draw[t], t => thr(t) + run.draw[t] + run.short[t])}"></path>`;
  run.hitStages.forEach((id, i) => {
    g += `<path class="l-st" style="stroke:${STAGE_COL[i % 3]}" d="${line(t => run.series[id][t])}"></path>`;
  });
  g += `<path class="l-thr" d="${line(t => run.thr[t])}"></path>`;
  g += `<path class="l-dem" d="${line(t => run.dem[t])}"></path>`;
  g += `<line class="cursor" x1="${X(month)}" x2="${X(month)}" y1="${m.t}" y2="${m.t + ih}"></line>`;
  g += `<rect class="hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent"></rect>`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = g;

  const hit = svg.querySelector('.hit');
  const toMonth = ev => {
    const r = svg.getBoundingClientRect();
    const x = (ev.clientX - r.left) * (W / r.width);
    return Math.max(0, Math.min(HORIZON - 1, Math.round(((x - m.l) / iw) * (HORIZON - 1))));
  };
  hit.addEventListener('pointermove', ev => {
    const t = toMonth(ev);
    const st = run.hitStages.map(id => `${esc(mineral.stages.find(s => s.id === id).label)}: ${pct(run.series[id][t])}`).join('<br>');
    tip.innerHTML = `<b>Month ${t}</b><small>Supply ${pct(run.thr[t])} · demand ${pct(run.dem[t])}</small><small>From stocks ${pct(run.draw[t])} · short ${pct(run.short[t])}</small>${st ? `<small>${st}</small>` : ''}`;
    tip.hidden = false;
    const r = svg.parentElement.getBoundingClientRect();
    tip.style.left = Math.min(ev.clientX - r.left + 12, r.width - 230) + 'px';
    tip.style.top = Math.max(4, ev.clientY - r.top - 60) + 'px';
    tip.style.maxWidth = '230px';
  });
  hit.addEventListener('pointerleave', () => { tip.hidden = true; });
  hit.addEventListener('click', ev => onScrub(toMonth(ev)));
}

export function simLegend(el, mineral, run) {
  const items = [
    '<li><span class="ln dash" style="border-color:var(--ink)"></span>Demand</li>',
    '<li><span class="ln" style="border-color:var(--blue)"></span>Supply that gets through</li>',
    '<li><span class="sw" style="background:var(--warn);opacity:.6"></span>Drawn from stocks</li>',
    '<li><span class="sw" style="background:var(--bad);opacity:.6"></span>Shortfall</li>',
    ...run.hitStages.map((id, i) => `<li><span class="ln" style="border-color:${STAGE_COL[i % 3]}"></span>${esc(mineral.stages.find(s => s.id === id).label)}</li>`),
  ];
  el.innerHTML = items.join('');
}

export const pct = v => `${Math.round(Math.max(0, v) * 1000) / 10}%`;
