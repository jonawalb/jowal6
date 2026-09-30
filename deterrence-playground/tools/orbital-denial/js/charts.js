// Small SVG line charts for the after-action review. x values are already scaled to 0..1.
const NS = 'http://www.w3.org/2000/svg';
const W = 640, H = 230, L = 52, R = 14, T = 14, B = 34;
const el = (tag, attrs, parent, text) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
};

/**
 * series: [{ pts: [[x0to1, y]], cls, dash }]; xticks: [[x0to1, label]]; ymax; yfmt; marks: [[x0to1, label]] vertical lines.
 * hover(x0to1) returns text for the readout line under the chart.
 */
export function lineChart(svg, { series, xticks, ymax, yfmt = v => v, marks = [], ylabel = '', hover, out }) {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.textContent = '';
  const X = x => L + x * (W - L - R), Y = y => T + (1 - y / ymax) * (H - T - B);
  const ax = el('g', { class: 'tsm-axis' }, svg);
  for (let i = 0; i <= 4; i++) {
    const v = ymax * i / 4;
    el('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: 'od-grid' }, ax);
    el('text', { x: L - 6, y: Y(v) + 4, 'text-anchor': 'end' }, ax, yfmt(v));
  }
  for (const [x, t] of xticks) el('text', { x: X(x), y: H - B + 16, 'text-anchor': 'middle' }, ax, t);
  if (ylabel) el('text', { x: L, y: T - 3 }, ax, ylabel);
  for (const [x, t] of marks) {
    el('line', { x1: X(x), x2: X(x), y1: T, y2: H - B, class: 'od-mark' }, svg);
    el('text', { x: X(x) + 4, y: T + 10, class: 'od-mark-t' }, svg, t);
  }
  for (const s of series) {
    if (!s.pts.length) continue;
    el('path', { d: s.pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(Math.min(ymax, p[1])).toFixed(1)}`).join(''),
      class: `od-line ${s.cls}${s.dash ? ' dash' : ''}` }, svg);
  }
  if (!hover || !out) return;
  const cur = el('line', { x1: 0, x2: 0, y1: T, y2: H - B, class: 'od-cursor', visibility: 'hidden' }, svg);
  const at = e => {
    const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W;
    const x = Math.max(0, Math.min(1, (px - L) / (W - L - R)));
    cur.setAttribute('x1', X(x)); cur.setAttribute('x2', X(x)); cur.setAttribute('visibility', 'visible');
    out.textContent = hover(x);
  };
  svg.onpointermove = at; svg.onpointerdown = at;
  svg.onpointerleave = () => cur.setAttribute('visibility', 'hidden');
}

export const niceMax = v => { const p = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1e-9)))); for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p; return 10 * p; };
