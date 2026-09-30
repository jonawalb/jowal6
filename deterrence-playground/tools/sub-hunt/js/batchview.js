// The "Run 200 hunts" card: progress and a stacked bar per sprint rate.
import { el } from '../../../shared/js/mapkit.js';
import { BEHAVIOURS } from '../data/params.js';
import { runBatch, PER } from './batch.js';

const $ = id => document.getElementById(id);
const KINDS = [['found', 'Found'], ['missed', 'Attack missed'], ['escaped', 'Slipped out'], ['timeout', 'Ran out of time']];

function draw(rows) {
  const svg = $('bt-chart');
  svg.removeAttribute('hidden');
  svg.replaceChildren();
  const W = Math.max(300, Math.round(svg.getBoundingClientRect().width) || 640);
  const narrow = W < 520;
  const x0 = narrow ? 118 : 160, x1 = W - 16, bh = 26, gap = 14, y0 = narrow ? 62 : 40;
  const sx = n => x0 + n / PER * (x1 - x0);
  const lg = el('g', { class: 'sh-lg' }, svg);
  let lx = 8, ly = 8;
  KINDS.forEach(([k, t]) => {
    const w = t.length * 7 + 34;
    if (lx + w > W) { lx = 8; ly += 20; }
    el('rect', { x: lx, y: ly, width: 12, height: 12, class: `sh-bk ${k}` }, lg); el('text', { x: lx + 16, y: ly + 10 }, lg, t); lx += w;
  });
  rows.forEach((r, i) => {
    const y = y0 + i * (bh + gap);
    el('text', { x: x0 - 8, y: y + bh / 2 + 4, 'text-anchor': 'end', class: 'sh-bl' }, svg, narrow ? `sprints ${Math.round(r.share * 100)}%` : `sprints ${Math.round(r.share * 100)}% of hours`);
    let acc = 0;
    for (const [k] of KINDS) {
      if (!r[k]) continue;
      el('rect', { x: sx(acc), y, width: sx(acc + r[k]) - sx(acc), height: bh, class: `sh-bk ${k}` }, svg);
      if (r[k] >= 4) el('text', { x: (sx(acc) + sx(acc + r[k])) / 2, y: y + bh / 2 + 4, 'text-anchor': 'middle', class: `sh-bn ${k}` }, svg, `${r[k]}`);
      acc += r[k];
    }
  });
  const ax = el('g', { class: 'tsm-axis' }, svg);
  const yb = y0 + rows.length * (bh + gap) - gap + 16;
  svg.setAttribute('viewBox', `0 0 ${W} ${yb + 24}`);
  for (const n of [0, 25, 50]) el('text', { x: sx(n), y: yb, 'text-anchor': 'middle' }, ax, `${n}`);
  el('text', { x: x1, y: yb + 16, 'text-anchor': 'end' }, ax, `hunts out of ${PER}`);
}

export function createBatch(getOpts) {
  let ctl = null, last = null;
  new ResizeObserver(() => { if (last) draw(last); }).observe($('bt-chart'));
  $('bt-run').onclick = async () => {
    if (ctl) { ctl.abort(); return; }
    const { seed, beh } = getOpts();
    ctl = new AbortController();
    $('bt-run').textContent = 'Stop';
    $('bt-note').textContent = '';
    const rows = await runBatch(seed, beh, (d, n) => { $('bt-prog').textContent = `${d} / ${n} hunts`; }, ctl.signal);
    ctl = null;
    $('bt-run').textContent = 'Run 200 hunts';
    if (!rows) { $('bt-prog').textContent = 'Stopped.'; return; }
    last = rows;
    draw(rows);
    const heard = rows.map(r => `${Math.round(r.share * 100)}%: ${r.heard}`).join(', ');
    $('bt-note').innerHTML = `Behaviour: ${BEHAVIOURS[beh].label}. Seeds derive from seed ${seed}, so the same settings give the same bars.
      Hunts with at least one real contact, by sprint rate: ${heard} of ${PER}. With 50 hunts a bar, differences of a few hunts are noise.
      The hunter follows a fixed rule of thumb, so read the bars as a baseline to compare your own hunts against.`;
  };
}
