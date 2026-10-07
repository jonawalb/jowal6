// Donor ranking (HTML bars) and the monthly / cumulative timeline (SVG).
import { el, escapeHtml } from '../../../shared/js/mapkit.js';
import { TYPES, MONTHS, eur, pctGdp, monthLabel, periodOf } from './model.js';

const niceMax = v => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
const width = svg => Math.max(280, Math.round(svg.parentNode.clientWidth - 2));
const fmtV = (v, S) => S.scale === 'gdp' ? pctGdp(v) : eur(v * 1000);

/** Horizontal bars, one per donor. Allocations are stacked by aid type; commitments show as an outline. */
export function renderRanking(host, list, S, { onPick, limit }) {
  const shown = limit ? list.slice(0, limit) : list;
  const max = Math.max(1e-9, ...shown.map(o => Math.max(o.va ?? 0, S.measure === 'a' ? 0 : o.vc ?? 0)));
  const scale = S.scale === 'gdp' ? o => (o.d.gdp ? 100 / 1000 / o.d.gdp : 0) : () => 1 / 1000;
  const key = S.measure === 'c' ? 'c' : 'a';
  host.innerHTML = shown.map((o, n) => {
    const f = scale(o);
    const segs = S.types.map(k => TYPES.findIndex(t => t.k === k)).map(t => {
      const w = (o[key][t] * f) / max * 100;
      return w > 0 ? `<span style="width:${w.toFixed(3)}%;background:${TYPES[t].col}"></span>` : '';
    }).join('');
    const outline = S.measure === 'b' && o.vc > 0
      ? `<i class="cm" style="width:${Math.min(100, (o.vc / max) * 100).toFixed(3)}%" aria-hidden="true"></i>` : '';
    const val = S.measure === 'b'
      ? `${fmtV(o.va, S)}<small> of ${fmtV(o.vc, S)}</small>` : fmtV(o.v, S);
    const label = `${o.d.n}: ${S.measure === 'b' ? `allocated ${fmtV(o.va, S)}, committed ${fmtV(o.vc, S)}` : fmtV(o.v, S)}`;
    return `<li><button type="button" class="rk${o.i === S.donor ? ' on' : ''}" data-i="${o.i}" aria-pressed="${o.i === S.donor}" aria-label="${escapeHtml(label)}">
      <span class="rk-n">${n + 1}</span><span class="rk-d" title="${escapeHtml(o.d.n)}">${escapeHtml(o.d.short || o.d.n)}</span>
      <span class="rk-bar">${segs}${outline}</span><span class="rk-v num">${val}</span></button></li>`;
  }).join('') || '<li class="none">No donor in view. Switch on more groups or aid types.</li>';
  host.querySelectorAll('.rk').forEach(b => { b.onclick = () => onPick(+b.dataset.i); });
}

function axisX(g, n, x, H, narrow) {
  let lastX = -99;
  MONTHS.forEach((m, i) => {
    if (!m.endsWith('-01') && i !== 0) return;
    const px = x(i);
    el('line', { x1: px, x2: px, y1: 0, y2: H + 4, class: 'yr-l' }, g);
    if (px - lastX > (narrow ? 30 : 36)) { el('text', { x: px + 3, y: H + 16, class: 'ax-t yr' }, g, m.slice(0, 4)); lastX = px; }
  });
}

function yGrid(g, max, y, L, W, R, fmt) {
  for (let k = 0; k <= 4; k++) {
    const v = (max / 4) * k;
    el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid' }, g);
    el('text', { x: L - 5, y: y(v) + 3.5, class: 'ax-t', 'text-anchor': 'end' }, g, fmt(v));
  }
}

const bn = v => v === 0 ? '0' : v >= 10 ? `${Math.round(v)}` : `${+v.toFixed(1)}`;

/** Monthly stacked bars (mode 'month') or cumulative allocations vs commitments (mode 'cum'). Values EUR m in, EUR bn on axis. */
export function drawTimeline(svg, series, cum, S, { tip, onPick }) {
  svg.innerHTML = '';
  const W = width(svg), narrow = W < 560, H = narrow ? 190 : 240, L = narrow ? 34 : 44, R = 10, T = 22, B = 24;
  svg.setAttribute('viewBox', `0 0 ${W} ${H + T + B}`);
  const n = MONTHS.length, iw = W - L - R, bw = iw / n, x = i => L + i * bw;
  const ti = S.types.map(k => TYPES.findIndex(t => t.k === k));
  const key = S.measure === 'c' ? 'c' : 'a';
  const g = el('g', {}, svg);
  if (S.period !== 'all') {
    const [p0, p1] = periodOf(S.period).span;
    el('rect', { x: x(p0), y: T, width: x(p1 + 1) - x(p0), height: H, class: 'pband' }, g);
  }
  let max, y;
  if (S.tl === 'cum') {
    max = niceMax(Math.max(1, ...cum.map(p => Math.max(S.measure !== 'c' ? p.A : 0, S.measure !== 'a' ? p.C : 0))) / 1000);
    y = v => T + H - (v / max) * H;
    yGrid(g, max, y, L, W, R, bn);
    const line = k => cum.map((p, i) => `${i ? 'L' : 'M'}${(x(i) + bw).toFixed(1)},${y(p[k] / 1000).toFixed(1)}`).join('');
    if (S.measure === 'b') {
      const top = cum.map((p, i) => `${i ? 'L' : 'M'}${(x(i) + bw).toFixed(1)},${y(Math.max(p.A, p.C) / 1000).toFixed(1)}`).join('');
      const bot = cum.map((p, i) => [x(i) + bw, y(Math.min(p.A, p.C) / 1000)]).reverse().map(([a, b]) => `L${a.toFixed(1)},${b.toFixed(1)}`).join('');
      el('path', { d: top + bot + 'Z', class: 'gap' }, g);
    }
    if (S.measure !== 'a') el('path', { d: line('C'), class: 'cline' }, g);
    if (S.measure !== 'c') el('path', { d: line('A'), class: 'aline' }, g);
  } else {
    const tot = series.bins.map(b => ti.reduce((s, t) => s + b[key][t], 0));
    const ctot = series.bins.map(b => ti.reduce((s, t) => s + b.c[t], 0));
    max = niceMax(Math.max(1, ...tot, ...(S.measure === 'b' ? ctot : [])) / 1000);
    y = v => T + H - (v / max) * H;
    yGrid(g, max, y, L, W, R, bn);
    const gap = bw > 5 ? 1.5 : 0.5;
    series.bins.forEach((b, i) => {
      let acc = 0;
      for (const t of ti) {
        const v = b[key][t] / 1000;
        if (v <= 0) continue;
        el('rect', { x: x(i) + gap / 2, y: y(acc + v), width: Math.max(0.8, bw - gap), height: Math.max(0.6, y(acc) - y(acc + v)), style: `fill:${TYPES[t].col}` }, g);
        acc += v;
      }
      if (S.measure === 'b' && ctot[i] > 0) el('line', { x1: x(i) + 1, x2: x(i) + bw - 1, y1: y(ctot[i] / 1000), y2: y(ctot[i] / 1000), class: 'ctick' }, g);
    });
  }
  const ax = el('g', { transform: `translate(0,${T})` }, svg);
  el('line', { x1: L, x2: W - R, y1: H, y2: H, class: 'ax' }, ax);
  axisX(ax, n, x, H, narrow);
  el('text', { x: 4, y: 11, class: 'ax-t' }, svg, '€ billion');
  if (S.month !== null) el('rect', { x: x(S.month) - 1, y: T - 2, width: bw + 2, height: H + 4, class: 'selbox' }, svg);

  // Interaction: hover for the tooltip, click or arrow keys to pick a month.
  const hit = el('rect', { x: L, y: T, width: iw, height: H, class: 'hit', tabindex: 0, role: 'slider',
    'aria-label': 'Timeline by month. Arrow keys pick a month.', 'aria-valuemin': 0, 'aria-valuemax': n - 1,
    'aria-valuenow': S.month ?? 0, 'aria-valuetext': S.month !== null ? monthLabel(MONTHS[S.month]) : 'none' }, svg);
  const idxAt = e => {
    const r = svg.getBoundingClientRect();
    return Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - r.left) * (W / r.width) - L) / bw)));
  };
  const tipHtml = i => {
    const b = series.bins[i], c = cum[i];
    const rows = ti.map(t => `<tr><td><i class="key" style="background:${TYPES[t].col}"></i>${TYPES[t].n}</td><td class="num">${eur(b.a[t])}</td><td class="num">${eur(b.c[t])}</td></tr>`).join('');
    return `<b>${monthLabel(b.m)}</b><table class="tt"><tr><th></th><th>Allocated</th><th>Committed</th></tr>${rows}</table>
      <span class="fine">Running total: ${eur(c.A)} allocated, ${eur(c.C)} committed</span>`;
  };
  hit.addEventListener('pointermove', e => tip(e, tipHtml(idxAt(e))));
  hit.addEventListener('pointerleave', () => tip(null));
  hit.addEventListener('click', e => onPick(idxAt(e)));
  hit.addEventListener('keydown', e => {
    const cur = S.month ?? -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onPick(Math.max(0, Math.min(n - 1, cur + (e.key === 'ArrowRight' ? 1 : -1))), true);
    } else if (e.key === 'Escape' && S.month !== null) onPick(S.month);
  });
}
