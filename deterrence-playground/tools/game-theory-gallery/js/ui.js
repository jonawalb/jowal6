// Small DOM and SVG helpers shared by every model view.
import { el } from '../../../shared/js/mapkit.js';

export { el };
const num = x => x == null || !Number.isFinite(x);
export const f2 = x => num(x) ? '–' : (Math.abs(x) < 5e-4 ? '0' : x.toFixed(2).replace('-', '−'));
export const f3 = x => num(x) ? '–' : (Math.abs(x) < 5e-5 ? '0' : x.toFixed(3).replace('-', '−'));
export const pct = x => num(x) ? '–' : (x > 0 && x < 0.005 ? '<1%' : `${Math.round(x * 100)}%`);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Render TeX into a node if KaTeX has loaded; otherwise show the source as plain text. */
export function tex(node, src, display = false) {
  if (window.katex) {
    try { window.katex.render(src, node, { displayMode: display, throwOnError: false }); return; } catch (e) { /* fall through */ }
  }
  node.textContent = src;
}

/** Panel section with an eyebrow title. */
export function sec(parent, title, cls = '') {
  const s = document.createElement('div');
  s.className = 'sec ' + cls;
  if (title) s.innerHTML = `<p class="eyebrow">${title}</p>`;
  parent.appendChild(s);
  return s;
}

/**
 * Plot frame: returns scale functions and a group to draw in.
 * box: { W, H, m: {l, r, t, b}, x: [x0, x1], y: [y0, y1] }
 */
export const vw = svg => { const cw = svg.getBoundingClientRect().width || 760; return cw < 640 ? Math.max(380, Math.round(cw * 1.1)) : 760; };
export function frame(svg, box) {
  if (box.W === 760) box = { ...box, W: vw(svg) };
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${box.W} ${box.H}`);
  const { m } = box, iw = box.W - m.l - m.r, ih = box.H - m.t - m.b;
  const sx = v => m.l + (v - box.x[0]) / (box.x[1] - box.x[0]) * iw;
  const sy = v => m.t + ih - (v - box.y[0]) / (box.y[1] - box.y[0]) * ih;
  const ix = px => box.x[0] + (px - m.l) / iw * (box.x[1] - box.x[0]);
  const iy = py => box.y[0] + (m.t + ih - py) / ih * (box.y[1] - box.y[0]);
  const g = el('g', {}, svg);
  return { g, sx, sy, ix, iy, iw, ih, m, box };
}

/** Axes with ticks and titles. */
export function axes(F, { xt = [], yt = [], xl = '', yl = '', xf = f2, yf = f2 }) {
  const { g, sx, sy, m, box } = F;
  const a = el('g', { class: 'axis' }, g);
  el('line', { x1: m.l, x2: box.W - m.r, y1: box.H - m.b, y2: box.H - m.b }, a);
  el('line', { x1: m.l, x2: m.l, y1: m.t, y2: box.H - m.b }, a);
  xt.forEach(v => { el('line', { x1: sx(v), x2: sx(v), y1: box.H - m.b, y2: box.H - m.b + 4 }, a); el('text', { x: sx(v), y: box.H - m.b + 17, 'text-anchor': 'middle' }, a, xf(v)); });
  yt.forEach(v => { el('line', { x1: m.l - 4, x2: m.l, y1: sy(v), y2: sy(v) }, a); el('text', { x: m.l - 7, y: sy(v) + 4, 'text-anchor': 'end' }, a, yf(v)); });
  if (xl) el('text', { x: m.l + F.iw / 2, y: box.H - 5, 'text-anchor': 'middle', class: 'ax-t' }, a, xl);
  if (yl) el('text', { x: 14, y: m.t + F.ih / 2, 'text-anchor': 'middle', class: 'ax-t', transform: `rotate(-90 14 ${m.t + F.ih / 2})` }, a, yl);
  return a;
}

/** Polyline path string from [x, y] data points through a frame. */
export const line = (F, pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${F.sx(x).toFixed(1)},${F.sy(y).toFixed(1)}`).join('');

/** Pointer drag on a plot that reports data coordinates. getF returns the current frame. */
export function dragPlot(svg, getF, onMove) {
  const pt = e => {
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    const px = (e.clientX - r.left) / r.width * vb.width, py = (e.clientY - r.top) / r.height * vb.height;
    const F = getF();
    if (F) onMove(F.ix(px), F.iy(py));
  };
  let down = false;
  svg.addEventListener('pointerdown', e => { down = true; svg.setPointerCapture(e.pointerId); pt(e); });
  svg.addEventListener('pointermove', e => { if (down) pt(e); });
  const up = () => { down = false; };
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
}

export function legend(node, entries) {
  node.innerHTML = entries.map(([col, label, dash]) =>
    `<span class="lg"><i style="background:var(${col})${dash ? ';opacity:.45' : ''}"></i>${label}</span>`).join('');
}

/** A figure card with an eyebrow and an SVG; returns { card, svg, note }. */
export function figCard(parent, id, title, aria, note = '') {
  const card = document.createElement('div');
  card.className = 'card fig';
  card.innerHTML = `<div class="fig-h"><p class="eyebrow">${title}</p>${note ? `<p class="fine">${note}</p>` : ''}</div>
    <svg id="${id}" role="img" aria-label="${esc(aria)}"></svg><div class="legend"></div>`;
  parent.appendChild(card);
  return { card, svg: card.querySelector('svg'), legend: card.querySelector('.legend') };
}

/** SVG text where "_X" or "_{XY}" renders X as a subscript. */
export function stext(parent, attrs, str) {
  const t = el('text', attrs, parent);
  const parts = String(str).split(/(_\{[^}]+\}|_[A-Za-z0-9ᵢ]+)/);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('_')) {
      const s = part.startsWith('_{') ? part.slice(2, -1) : part.slice(1);
      el('tspan', { 'baseline-shift': 'sub', 'font-size': '75%' }, t, s);
      el('tspan', {}, t, ' ');
    } else el('tspan', {}, t, part);
  }
  return t;
}
