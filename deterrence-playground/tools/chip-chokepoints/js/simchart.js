// Simulator chart: world AI accelerator output that can still be made, month by month, as % of
// pre-shock output, under fast and slow substitution. Below the slow line: output in both cases.
// Between the lines: output that depends on how fast substitutes arrive. Above the fast line: lost in both.
import { HORIZON } from './model.js';
import { esc } from './flow.js';

const STAGE_COL = ['var(--c4)', 'var(--c3)', 'var(--c6)', 'var(--c5)', 'var(--c7)'];
export const pct = v => `${Math.round(Math.max(0, v) * 1000) / 10}%`;

export function drawSim(svg, tip, chain, run, month, onScrub) {
  const box = svg.parentElement.getBoundingClientRect();
  const W = Math.max(320, Math.round(box.width || 900));
  const narrow = W < 620;
  const H = narrow ? 230 : 280;
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
  const F = run.fast.thr, S = run.slow.thr;
  g += `<path class="a-thr" d="${area(() => 0, t => S[t])}"></path>`;
  g += `<path class="a-draw" d="${area(t => S[t], t => F[t])}"></path>`;
  g += `<path class="a-short" d="${area(t => F[t], () => 1)}"></path>`;
  run.hitIds.forEach((id, i) => { g += `<path class="l-st" style="stroke:${STAGE_COL[i % STAGE_COL.length]}" d="${line(t => run.slow.series[id][t])}"></path>`; });
  g += `<path class="l-fast" d="${line(t => F[t])}"></path>`;
  g += `<path class="l-thr" d="${line(t => S[t])}"></path>`;
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
    const lab = id => chain.stages.find(s => s.id === id).label;
    const st = run.hitIds.map(id => `${esc(lab(id))}: ${pct(run.slow.series[id][t])}`).join('<br>');
    tip.innerHTML = `<b>Month ${t}</b><small>Output, fast substitution ${pct(F[t])}</small><small>Output, slow substitution ${pct(S[t])}</small>${st ? `<small>Slow case by stage:<br>${st}</small>` : ''}`;
    tip.hidden = false;
    const r = svg.parentElement.getBoundingClientRect();
    tip.style.left = Math.min(ev.clientX - r.left + 12, r.width - 240) + 'px';
    tip.style.top = Math.max(4, ev.clientY - r.top - 60) + 'px';
    tip.style.maxWidth = '240px';
  });
  hit.addEventListener('pointerleave', () => { tip.hidden = true; });
  hit.addEventListener('click', ev => onScrub(toMonth(ev)));
}

export function simLegend(el, chain, run) {
  el.innerHTML = [
    '<li><span class="ln" style="border-color:var(--blue)"></span>Slow substitution</li>',
    '<li><span class="ln dash" style="border-color:var(--blue)"></span>Fast substitution</li>',
    '<li><span class="sw" style="background:var(--warn);opacity:.6"></span>Depends on speed</li>',
    '<li><span class="sw" style="background:var(--bad);opacity:.6"></span>Lost in both</li>',
    ...run.hitIds.map((id, i) => `<li><span class="ln" style="border-color:${STAGE_COL[i % STAGE_COL.length]}"></span>${esc(chain.stages.find(s => s.id === id).short)}</li>`),
  ].join('');
}
