// Main chart: market prices (left axis), PLA aircraft 7-day mean (right axis), exercise bands,
// JCRP ticks, a volume strip for the focus market, and a hover crosshair.
import { el, escapeHtml } from '../../../shared/js/mapkit.js';
import { BY_ID, AIR7, AIR, JCRP, EX, priceAt, isoOf, nice } from './series.js';

const M = { l: 44, r: 44, t: 28 };
const PLOT_H = 270, GAP = 18, VOL_H = 44, AXIS_H = 26;
export const colorOf = i => `var(--c${(i % 8) + 1})`;

function niceMax(v) {
  const steps = [1, 2, 5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100];
  return steps.find(s => s >= v) ?? 100;
}

function ticks(a, b, W) {
  const span = b - a, out = [];
  const monthsStep = span > 900 ? 6 : span > 400 ? 3 : span > 150 ? 1 : 0;
  if (monthsStep) {
    const d0 = new Date(a * 864e5);
    let y = d0.getUTCFullYear(), m = d0.getUTCMonth() + 1;
    for (;;) {
      if (m > 11) { y++; m -= 12; }
      const t = Math.round(Date.UTC(y, m, 1) / 864e5);
      if (t > b) break;
      if (m % monthsStep === 0) out.push({ d: t, t: m === 0 ? String(y) : nice(t, { month: 'short' }) + (monthsStep >= 3 ? '' : '') });
      m++;
    }
  } else {
    const step = span > 60 ? 14 : span > 25 ? 7 : 2;
    for (let t = a; t <= b; t += step) out.push({ d: t, t: nice(t, { month: 'short', day: 'numeric' }) });
  }
  return W < 520 ? out.filter((_, i) => i % 2 === 0) : out;
}

export function createChart(svg, tip, onHover) {
  let geom = null;

  function render(S) {
    const W = Math.max(320, Math.round(svg.clientWidth || 900));
    const H = M.t + PLOT_H + GAP + VOL_H + AXIS_H;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
    const [a, b] = S.win;
    const X = d => M.l + (d - a) / Math.max(1, b - a) * (W - M.l - M.r);
    const sel = S.markets.map(id => BY_ID.get(id)).filter(Boolean);
    let pmax = 1;
    sel.forEach(m => { for (let d = a; d <= b; d++) { const p = priceAt(m, d); if (p != null && p > pmax) pmax = p; } });
    pmax = niceMax(pmax * 1.08);
    const Y = p => M.t + PLOT_H - p / pmax * PLOT_H;
    let amax = 10;
    for (let d = a; d <= b; d++) if (AIR7.has(d)) amax = Math.max(amax, AIR7.get(d));
    amax = niceMax(amax * 1.1);
    const YA = v => M.t + PLOT_H - v / amax * PLOT_H;
    geom = { a, b, W, X, Y, YA, sel };

    // exercise bands
    if (S.show.ex) EX.filter(e => e.b >= a && e.a <= b).forEach(e => {
      const x1 = X(Math.max(a, e.a)), x2 = X(Math.min(b, e.b + 1));
      el('rect', { x: x1, y: M.t, width: Math.max(3, x2 - x1), height: PLOT_H, class: 'ex-band' }, svg);
    });
    // grid + left axis
    const g = el('g', { class: 'axis' }, svg);
    for (let i = 0; i <= 4; i++) {
      const p = pmax * i / 4, y = Y(p);
      el('line', { x1: M.l, x2: W - M.r, y1: y, y2: y, class: 'grid' }, g);
      el('text', { x: M.l - 6, y: y + 4, 'text-anchor': 'end' }, g, (p % 1 ? p.toFixed(1) : p) + '%');
      if (S.show.air) el('text', { x: W - M.r + 6, y: y + 4, class: 'ax-air' }, g, Math.round(amax * i / 4));
    }
    el('text', { x: M.l - 6, y: M.t - 14, 'text-anchor': 'end', class: 'ax-t' }, g, 'Price');
    if (S.show.air) el('text', { x: W - 4, y: M.t - 14, 'text-anchor': 'end', class: 'ax-t ax-air' }, g, 'Aircraft');
    ticks(a, b, W).forEach(t => {
      const x = X(t.d);
      el('line', { x1: x, x2: x, y1: M.t + PLOT_H, y2: M.t + PLOT_H + 4, class: 'tick' }, g);
      el('text', { x, y: H - 8, 'text-anchor': 'middle' }, g, t.t);
    });

    // aircraft 7-day mean as a soft area, broken at gaps
    if (S.show.air) {
      let d = '', open = false;
      for (let k = a; k <= b; k++) {
        if (AIR7.has(k)) { d += (open ? 'L' : 'M') + X(k).toFixed(1) + ' ' + YA(AIR7.get(k)).toFixed(1); open = true; }
        else open = false;
      }
      el('path', { d, class: 'air-line' }, svg);
    }
    // JCRP ticks
    if (S.show.jcrp) {
      let d = '';
      JCRP.filter(k => k >= a && k <= b).forEach(k => { d += `M${X(k).toFixed(1)} ${M.t + PLOT_H}v-7`; });
      el('path', { d, class: 'jcrp' }, svg);
    }
    // price lines (gaps longer than 3 days break the line)
    sel.forEach((m, i) => {
      let d = '', prev = null;
      for (let k = Math.max(a, m.first); k <= Math.min(b, m.last); k++) {
        const p = priceAt(m, k); if (p == null) continue;
        d += (prev != null && k - prev <= 3 ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(p).toFixed(1);
        prev = k;
      }
      el('path', { d, class: 'price' + (m.id === S.focus ? ' focus' : ''), stroke: colorOf(S.markets.indexOf(m.id)) }, svg);
      const dl = BY_ID.get(m.id).deadline;
      const dd = Date.parse(dl) / 864e5;
      if (dd >= a && dd <= b) el('line', { x1: X(dd), x2: X(dd), y1: M.t, y2: M.t + PLOT_H, class: 'deadline', stroke: colorOf(S.markets.indexOf(m.id)) }, svg);
    });

    // volume strip for the focus market
    const f = BY_ID.get(S.focus);
    const vy = M.t + PLOT_H + GAP;
    el('text', { x: M.l, y: vy - 5, class: 'ax-t' }, svg, f ? (W >= 640 ? `Daily dollar volume · ${f.label}` : 'Daily dollar volume, focus market') : '');
    if (f) {
      let vmax = 1;
      for (let k = a; k <= b; k++) { const r = f.byDay.get(k); if (r) vmax = Math.max(vmax, r.v); }
      const bw = Math.max(1, (W - M.l - M.r) / Math.max(1, b - a) - 0.5);
      let d = '';
      for (let k = a; k <= b; k++) {
        const r = f.byDay.get(k); if (!r || !r.v) continue;
        const h = Math.max(1, Math.sqrt(r.v / vmax) * VOL_H);
        d += `M${X(k).toFixed(1)} ${vy + VOL_H}v${-h.toFixed(1)}h${bw.toFixed(1)}v${h.toFixed(1)}z`;
      }
      el('path', { d, class: 'vol', fill: colorOf(S.markets.indexOf(f.id)) }, svg);
      if (W >= 640) el('text', { x: W - M.r, y: vy - 5, 'text-anchor': 'end', class: 'ax-t' }, svg, `peak $${Math.round(vmax).toLocaleString('en-US')} (bar height is square-root scaled)`);
    }

    const cross = el('line', { y1: M.t, y2: vy + VOL_H, class: 'cross' }, svg);
    cross.style.display = 'none';
    const dots = el('g', {}, svg);
    geom.cross = cross; geom.dots = dots;
  }

  function dayAt(e) {
    if (!geom) return null;
    const r = svg.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * geom.W;
    const d = Math.round(geom.a + (x - M.l) / (geom.W - M.l - M.r) * (geom.b - geom.a));
    return d < geom.a || d > geom.b ? null : d;
  }

  function hover(d, S) {
    if (!geom || d == null) { if (geom) geom.cross.style.display = 'none'; tip.hidden = true; onHover(null); return; }
    const { X, Y, YA, dots } = geom;
    geom.cross.style.display = ''; geom.cross.setAttribute('x1', X(d)); geom.cross.setAttribute('x2', X(d));
    dots.innerHTML = '';
    const rows = [];
    geom.sel.forEach(m => {
      const p = priceAt(m, d);
      const c = colorOf(S.markets.indexOf(m.id));
      if (p != null) el('circle', { cx: X(d), cy: Y(p), r: 3.5, class: 'dot', fill: c }, dots);
      const r = m.byDay.get(d);
      rows.push(`<div class="tt-row"><i style="background:${c}"></i>${escapeHtml(m.label)}<b class="num">${p != null ? p.toFixed(1) + '%' : d < m.first ? 'not yet traded' : d > m.last ? 'closed' : 'no trade'}</b>${r && r.n ? `<small>${r.n} fills</small>` : ''}</div>`);
    });
    const air = AIR.get(d), a7 = AIR7.get(d);
    if (S.show.air && a7 != null) el('circle', { cx: X(d), cy: YA(a7), r: 3, class: 'dot air' }, dots);
    const ex = EX.filter(e => d >= e.a && d <= e.b);
    tip.innerHTML = `<b>${nice(d)}</b>${rows.join('')}
      <div class="tt-air">PLA aircraft: <b class="num">${air ?? 'no report'}</b>${a7 != null ? ` · 7-day mean <b class="num">${a7.toFixed(1)}</b>` : ''}${JCRP.includes(d) ? '<br>Joint combat readiness patrol' : ''}</div>
      ${ex.map(e => `<div class="tt-ex">${escapeHtml(e.name)}</div>`).join('')}`;
    tip.hidden = false;
    const box = svg.getBoundingClientRect(), host = svg.parentElement.getBoundingClientRect();
    const px = box.left - host.left + X(d) / geom.W * box.width;
    const flip = px > host.width * 0.6;
    tip.style.left = (flip ? Math.max(4, px - tip.offsetWidth - 14) : Math.min(px + 14, host.width - tip.offsetWidth - 4)) + 'px';
    tip.style.top = '8px';
    onHover(isoOf(d));
  }

  return { render, dayAt, hover };
}
