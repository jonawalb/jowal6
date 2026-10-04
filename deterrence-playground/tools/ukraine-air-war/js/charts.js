// SVG charts: stacked timeline and monthly interception rate.
import { el, fmt } from '../../../shared/js/mapkit.js';
import { GROUPS, HIDE_FROM, periodLabel, periodStart, periodEnd } from './model.js';
import { GROUP_INFO } from '../data/groups.js';

const niceMax = v => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
const width = svg => Math.max(300, Math.round(svg.parentNode.clientWidth - 2));
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function xTicks(g, keys, res, x, bw, H, narrow) {
  let lastY = null, lastM = null, lastX = -99, lastMonth = null;
  keys.forEach((k, i) => {
    const d = periodStart(k, res), y = d.slice(0, 4), m = +d.slice(5, 7);
    const px = x(i);
    const yearTick = y !== lastY, monthTick = m !== lastM;
    lastM = m;
    if (yearTick) {
      lastY = y;
      el('line', { x1: px, x2: px, y1: 0, y2: H + 4, class: 'yr-l' }, g);
      // Years win over a month label placed just before them.
      if (px - lastX <= 34 && lastMonth) { lastMonth.remove(); lastX = -99; }
      if (px - lastX > 34) { el('text', { x: px + 3, y: H + 16, class: 'ax-t yr' }, g, y); lastX = px; }
      lastMonth = null;
    } else if (monthTick && keys.length <= 120 && !narrow && (res !== 'week' || keys.length < 70) && px - lastX > 30) {
      lastMonth = el('text', { x: px + 3, y: H + 16, class: 'ax-t' }, g, MON[m - 1]); lastX = px;
    } else if (res === 'day' && monthTick && px - lastX > 30) {
      lastMonth = el('text', { x: px + 3, y: H + 16, class: 'ax-t' }, g, MON[m - 1]); lastX = px;
    }
  });
}

/** Stacked bars per period. onPick(key|null) on click/keys; onHover for the tooltip. */
export function drawTimeline(svg, bins, S, { onPick, tip }) {
  svg.innerHTML = '';
  const W = width(svg), narrow = W < 560, H = narrow ? 200 : 250, L = narrow ? 38 : 48, R = 8, T = 10, B = 24;
  svg.setAttribute('viewBox', `0 0 ${W} ${H + T + B}`);
  const iw = W - L - R, n = bins.length, bw = iw / Math.max(1, n);
  const max = niceMax(Math.max(1, ...bins.map(b => b.tot)));
  const y = v => T + H - (v / max) * H, x = i => L + i * bw;
  const g = el('g', {}, svg);
  for (let k = 0; k <= 4; k++) {
    const v = (max / 4) * k;
    el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid' }, g);
    el('text', { x: L - 5, y: y(v) + 3.5, class: 'ax-t', 'text-anchor': 'end' }, g, v >= 1000 ? (v / 1000) + 'k' : fmt(v));
  }
  // Band where the Air Force stopped publishing some missile counts.
  const hi = bins.findIndex(b => periodEnd(b.k, S.res) >= HIDE_FROM);
  if (hi >= 0) {
    el('rect', { x: x(hi), y: T, width: W - R - x(hi), height: H, class: 'hideband' }, g);
    if (W - R - x(hi) > 70) el('text', { x: W - R - 4, y: T + 12, class: 'band-t', 'text-anchor': 'end' }, g, 'Some counts withheld');
  }
  const bars = el('g', {}, svg);
  const gap = bw > 4 ? Math.min(1.5, bw * 0.15) : 0;
  bins.forEach((b, i) => {
    let acc = 0;
    for (const gk of GROUPS) {
      const v = b.v[gk];
      if (!v) continue;
      el('rect', { x: x(i) + gap / 2, y: y(acc + v), width: Math.max(0.6, bw - gap), height: Math.max(0.5, y(acc) - y(acc + v)), style: `fill:${GROUP_INFO[gk].col}`, class: 'bar' }, bars);
      acc += v;
    }
  });
  const ax = el('g', { transform: `translate(0,${T})` }, svg);
  el('line', { x1: L, x2: W - R, y1: H, y2: H, class: 'ax' }, ax);
  xTicks(ax, bins.map(b => b.k), S.res, x, bw, H, narrow);
  // Selection marker.
  const si = bins.findIndex(b => b.k === S.sel);
  if (si >= 0) el('rect', { x: x(si) - 1, y: T - 2, width: Math.max(3, bw + 2), height: H + 4, class: 'selbox' }, svg);
  // Interaction layer.
  const hit = el('rect', { x: L, y: T, width: iw, height: H, class: 'hit', tabindex: 0, role: 'slider',
    'aria-label': 'Timeline. Arrow keys move the selected period.', 'aria-valuemin': 0, 'aria-valuemax': n - 1, 'aria-valuenow': Math.max(0, si) }, svg);
  const idxAt = e => {
    const r = svg.getBoundingClientRect();
    const px = (e.clientX - r.left) * (W / r.width);
    return Math.max(0, Math.min(n - 1, Math.floor((px - L) / bw)));
  };
  hit.addEventListener('pointermove', e => {
    const b = bins[idxAt(e)];
    tip(e, `<b>${periodLabel(b.k, S.res)}</b>${GROUPS.filter(k => b.v[k]).map(k => `<small>${GROUP_INFO[k].short}: ${fmt(b.v[k])}</small>`).join('') || '<small>Nothing reported</small>'}`
      + (b.hid ? `<small>${b.hid} report${b.hid > 1 ? 's' : ''} with numbers withheld</small>` : ''));
  });
  hit.addEventListener('pointerleave', () => tip(null));
  hit.addEventListener('click', e => onPick(bins[idxAt(e)].k));
  hit.addEventListener('keydown', e => {
    const d = { ArrowRight: 1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
    if (e.key === 'Escape') { onPick(null); return; }
    if (!d) return;
    e.preventDefault();
    const i = Math.max(0, Math.min(n - 1, (si < 0 ? (d > 0 ? -1 : n) : si) + d));
    onPick(bins[i].k, true);
  });
}

/** Monthly interception-rate lines, one per group. Point size shows volume. */
export function drawRate(svg, lines, S, tip) {
  svg.innerHTML = '';
  svg.onpointerdown = () => tip(null);
  const W = width(svg), narrow = W < 560, H = narrow ? 170 : 200, L = 40, R = 10, T = 10, B = 24;
  svg.setAttribute('viewBox', `0 0 ${W} ${H + T + B}`);
  const keys = lines[0]?.pts.map(p => p.k) || [];
  const n = keys.length, bw = (W - L - R) / Math.max(1, n);
  const x = i => L + (i + 0.5) * bw, y = v => T + H - v * H;
  const g = el('g', {}, svg);
  [0, 0.25, 0.5, 0.75, 1].forEach(v => {
    el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid' }, g);
    el('text', { x: L - 5, y: y(v) + 3.5, class: 'ax-t', 'text-anchor': 'end' }, g, (v * 100) + '%');
  });
  const ax = el('g', { transform: `translate(0,${T})` }, svg);
  el('line', { x1: L, x2: W - R, y1: H, y2: H, class: 'ax' }, ax);
  xTicks(ax, keys, 'month', i => L + i * bw, bw, H, narrow);
  const vmax = Math.max(1, ...lines.flatMap(l => l.pts.map(p => p.l)));
  for (const ln of lines) {
    const col = GROUP_INFO[ln.g].col;
    let d = '', pen = false;
    ln.pts.forEach((p, i) => {
      if (p.rate == null) { pen = false; return; }
      d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.rate).toFixed(1); pen = true;
    });
    el('path', { d, class: 'rline', style: `stroke:${col}` }, svg);
    ln.pts.forEach((p, i) => {
      if (p.rate == null) return;
      const c = el('circle', { cx: x(i), cy: y(p.rate), r: 1.8 + 4.5 * Math.sqrt(p.l / vmax), class: 'rdot', style: `fill:${col}` }, svg);
      const show = e => tip(e, `<b>${GROUP_INFO[ln.g].n}</b><small>${periodLabel(p.k, 'month')}</small><small>${Math.round(p.rate * 100)}% of ${fmt(p.l)} stopped</small>`);
      c.addEventListener('pointerenter', show);
      // Touch has no hover: a tap shows the tooltip and it stays until the next tap elsewhere.
      c.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { e.stopPropagation(); show(e); } });
      c.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') tip(null); });
    });
  }
}
