// Small hand-built SVG chart helpers. No dependencies.

const NS = 'http://www.w3.org/2000/svg';

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function svgEl(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDay(s) {
  const [, m, d] = s.split('-');
  return `${MONTHS[+m - 1]} ${+d}`;
}
export const pct = (v, d = 1) => (v == null || Number.isNaN(v) ? 'n/a' : `${(v * 100).toFixed(d)}%`);
export const num = (v, d = 0) => (v == null || Number.isNaN(v) ? 'n/a' : Number(v).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }));

function niceStep(range, count) {
  const raw = range / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const r = raw / mag;
  return (r >= 5 ? 10 : r >= 2 ? 5 : r >= 1 ? 2 : 1) * mag;
}
function ticks(min, max, count = 4) {
  const step = niceStep(max - min, count);
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

// ---------------------------------------------------------------- tooltip
let tipEl;
function tip() {
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'tip';
    tipEl.hidden = true;
    tipEl.setAttribute('role', 'status');
    document.body.appendChild(tipEl);
  }
  return tipEl;
}
function showTip(html, x, y) {
  const t = tip();
  t.innerHTML = html;
  t.hidden = false;
  const w = t.offsetWidth, h = t.offsetHeight;
  let left = x + 14, top = y - h - 10;
  if (left + w > window.innerWidth - 8) left = x - w - 14;
  if (left < 8) left = 8;
  if (top < 8) top = y + 16;
  t.style.left = `${left}px`;
  t.style.top = `${top}px`;
}
export function hideTip() { if (tipEl) tipEl.hidden = true; }

function frame(container, height, margin) {
  container.innerHTML = '';
  const width = Math.max(280, container.clientWidth || 600);
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, width, height, role: 'img' }, container);
  const iw = width - margin.l - margin.r;
  const ih = height - margin.t - margin.b;
  const g = svgEl('g', { transform: `translate(${margin.l},${margin.t})` }, svg);
  return { svg, g, width, height, iw, ih };
}

function yAxis(g, iw, y, tickVals, fmt) {
  for (const t of tickVals) {
    svgEl('line', { x1: 0, x2: iw, y1: y(t), y2: y(t), stroke: cssVar('--grid'), 'stroke-width': 1 }, g);
    const tx = svgEl('text', { x: -6, y: y(t), 'text-anchor': 'end', 'dominant-baseline': 'middle', 'font-size': 11, fill: cssVar('--muted') }, g);
    tx.textContent = fmt(t);
  }
}

function xLabels(g, labels, xAt, ih, iw, fmt) {
  const maxLabels = Math.max(2, Math.floor(iw / 62));
  const every = Math.ceil(labels.length / maxLabels);
  labels.forEach((l, i) => {
    if (i % every !== 0) return;
    const tx = svgEl('text', { x: xAt(i), y: ih + 16, 'text-anchor': 'middle', 'font-size': 11, fill: cssVar('--muted') }, g);
    tx.textContent = fmt(l);
  });
  svgEl('line', { x1: 0, x2: iw, y1: ih, y2: ih, stroke: cssVar('--border') }, g);
}

// Pointer + keyboard inspection along an indexed x axis.
function attachIndexHover(container, svg, g, m, n, xAt, ih, tipHtml, step) {
  const guide = svgEl('line', { y1: 0, y2: ih, stroke: cssVar('--muted'), 'stroke-dasharray': '3 3', visibility: 'hidden' }, g);
  let cur = -1;
  const show = (i, cx, cy) => {
    cur = Math.max(0, Math.min(n - 1, i));
    guide.setAttribute('x1', xAt(cur));
    guide.setAttribute('x2', xAt(cur));
    guide.setAttribute('visibility', 'visible');
    if (cx == null) {
      const r = svg.getBoundingClientRect();
      const scale = r.width / svg.viewBox.baseVal.width;
      cx = r.left + (m.l + xAt(cur)) * scale;
      cy = r.top + (m.t + ih / 3) * scale;
    }
    showTip(tipHtml(cur), cx, cy);
  };
  const hide = () => { guide.setAttribute('visibility', 'hidden'); hideTip(); };
  svg.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect();
    const scale = r.width / svg.viewBox.baseVal.width;
    const x = (e.clientX - r.left) / scale - m.l;
    show(Math.round((x - xAt(0)) / step), e.clientX, e.clientY);
  });
  svg.addEventListener('pointerleave', hide);
  container.tabIndex = 0;
  container.onkeydown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      show(cur < 0 ? 0 : cur + (e.key === 'ArrowRight' ? 1 : -1));
    } else if (e.key === 'Home') { e.preventDefault(); show(0); }
    else if (e.key === 'End') { e.preventDefault(); show(n - 1); }
    else if (e.key === 'Escape') hide();
  };
  container.onblur = hide;
}

// ---------------------------------------------------------------- line chart
export function lineChart(container, o) {
  const height = o.height || 230;
  const m = { l: o.ml || 46, r: 14, t: 10, b: 26 };
  const { svg, g, iw, ih } = frame(container, height, m);
  svg.setAttribute('aria-label', o.aria || '');
  const n = o.labels.length;
  const step = o.categorical ? iw / n : iw / Math.max(1, n - 1);
  const xAt = o.categorical ? (i) => step * (i + 0.5) : (i) => step * i;
  const all = [];
  for (const s of o.series) for (const v of s.values) if (v != null && !Number.isNaN(v)) all.push(v);
  if (o.band) for (const v of [...o.band.lo, ...o.band.hi]) if (v != null) all.push(v);
  for (const h of o.hlines || []) all.push(h.y);
  let ymin = o.yMin ?? Math.min(0, ...all);
  let ymax = o.yMax ?? Math.max(...all) * 1.08;
  if (ymax === ymin) ymax = ymin + 1;
  const tv = ticks(ymin, ymax, 4);
  ymax = Math.max(ymax, tv[tv.length - 1]);
  const y = (v) => ih - ((v - ymin) / (ymax - ymin)) * ih;
  yAxis(g, iw, y, tv, o.yFormat || ((v) => v));
  xLabels(g, o.labels, xAt, ih, iw, o.xFormat || ((l) => l));

  let labelEnd = -Infinity, labelRow = 0;
  for (const sh of o.shade || []) {
    const x0 = xAt(sh.from) - step / 2, x1 = xAt(sh.to) + step / 2;
    svgEl('rect', { x: Math.max(0, x0), y: 0, width: Math.min(iw, x1) - Math.max(0, x0), height: ih, fill: cssVar('--alert'), opacity: 0.08 }, g);
    if (sh.label) {
      const lx = Math.max(0, x0) + 4;
      labelRow = lx < labelEnd ? labelRow + 1 : 0;
      const t = svgEl('text', { x: lx, y: 11 + labelRow * 13, 'font-size': 10.5, fill: cssVar('--alert') }, g);
      t.textContent = sh.label;
      labelEnd = Math.max(labelEnd, lx + sh.label.length * 5.6);
    }
  }
  if (o.band) {
    let d = '';
    o.band.hi.forEach((v, i) => { d += `${i ? 'L' : 'M'}${xAt(i)},${y(v)}`; });
    for (let i = n - 1; i >= 0; i--) d += `L${xAt(i)},${y(o.band.lo[i])}`;
    svgEl('path', { d: d + 'Z', fill: cssVar('--g600'), opacity: 0.12 }, g);
  }
  for (const h of o.hlines || []) {
    svgEl('line', { x1: 0, x2: iw, y1: y(h.y), y2: y(h.y), stroke: h.color || cssVar('--muted'), 'stroke-dasharray': h.dash || '4 3', 'stroke-width': 1 }, g);
    if (h.label) {
      const t = svgEl('text', { x: iw - 2, y: y(h.y) + (h.below ? 13 : -4), 'text-anchor': 'end', 'font-size': 10.5, fill: h.color || cssVar('--muted') }, g);
      t.textContent = h.label;
    }
  }
  for (const s of o.series) {
    if (s.fill) {
      let d = `M${xAt(0)},${y(ymin)}`;
      s.values.forEach((v, i) => { d += `L${xAt(i)},${y(v ?? 0)}`; });
      d += `L${xAt(n - 1)},${y(ymin)}Z`;
      svgEl('path', { d, fill: s.color, opacity: s.fillOpacity ?? 0.25 }, g);
    }
    if (s.line !== false) {
      let d = '', pen = false;
      s.values.forEach((v, i) => {
        if (v == null || Number.isNaN(v)) { pen = false; return; }
        d += `${pen ? 'L' : 'M'}${xAt(i)},${y(v)}`;
        pen = true;
      });
      svgEl('path', { d, fill: 'none', stroke: s.color, 'stroke-width': s.width || 2, 'stroke-dasharray': s.dash, 'stroke-linejoin': 'round' }, g);
    }
    if (s.points) {
      s.values.forEach((v, i) => {
        if (v == null) return;
        svgEl('circle', { cx: xAt(i), cy: y(v), r: s.r || 3, fill: (s.pointColors && s.pointColors[i]) || s.color, stroke: cssVar('--surface'), 'stroke-width': 1 }, g);
      });
    }
  }
  for (const mk of o.markers || []) {
    const v = mk.y;
    svgEl('circle', { cx: xAt(mk.i), cy: y(v), r: 6, fill: 'none', stroke: mk.color || cssVar('--alert'), 'stroke-width': 2 }, g);
  }
  const tipHtml = o.tip || ((i) => `<b>${(o.xFormat || ((l) => l))(o.labels[i])}</b>` +
    o.series.map((s) => `<div class="row"><span>${s.name}</span><span>${(o.yFormat || ((v) => v))(s.values[i])}</span></div>`).join(''));
  attachIndexHover(container, svg, g, m, n, xAt, ih, tipHtml, step);
}

// ---------------------------------------------------------------- stacked bars
export function stackedBars(container, o) {
  const height = o.height || 230;
  const m = { l: 46, r: 10, t: 10, b: 26 };
  const { svg, g, iw, ih } = frame(container, height, m);
  svg.setAttribute('aria-label', o.aria || '');
  const n = o.labels.length;
  const totals = o.labels.map((_, i) => o.series.reduce((a, s) => a + (s.values[i] || 0), 0));
  let ymax = Math.max(...totals) * 1.05;
  const tv = ticks(0, ymax, 4);
  ymax = Math.max(ymax, tv[tv.length - 1]);
  const y = (v) => ih - (v / ymax) * ih;
  yAxis(g, iw, y, tv, o.yFormat || num);
  const step = iw / n;
  const xAt = (i) => step * (i + 0.5);
  const bw = Math.max(2, step * 0.72);
  o.labels.forEach((_, i) => {
    let acc = 0;
    for (const s of o.series) {
      const v = s.values[i] || 0;
      svgEl('rect', { x: xAt(i) - bw / 2, y: y(acc + v), width: bw, height: Math.max(0, y(acc) - y(acc + v)), fill: s.color }, g);
      acc += v;
    }
  });
  xLabels(g, o.labels, xAt, ih, iw, o.xFormat || ((l) => l));
  const tipHtml = (i) => `<b>Week of ${fmtDay(o.labels[i])}</b>` +
    [...o.series].reverse().map((s) => `<div class="row"><span>${s.name}</span><span>${num(s.values[i])}</span></div>`).join('') +
    `<div class="row"><span><b>Total</b></span><span><b>${num(totals[i])}</b></span></div>`;
  attachIndexHover(container, svg, g, m, n, xAt, ih, tipHtml, step);
}

// ---------------------------------------------------------------- horizontal bars (label above bar)
export function hbars(container, o) {
  const narrow = (container.clientWidth || 600) < 480;
  const rowH = narrow ? 56 : 44;
  const off = narrow ? 12 : 0;
  const height = o.rows.length * rowH + 22;
  const m = { l: 4, r: 52, t: 4, b: 18 };
  const { svg, g, iw } = frame(container, height, m);
  svg.setAttribute('aria-label', o.aria || '');
  const [d0, d1] = o.domain || [0, 1];
  const x = (v) => ((v - d0) / (d1 - d0)) * iw;
  o.rows.forEach((r, i) => {
    const top = i * rowH;
    const lt = svgEl('text', { x: 0, y: top + 13, 'font-size': 12, fill: cssVar('--text') }, g);
    lt.textContent = r.label;
    if (r.sub) {
      const st = narrow
        ? svgEl('text', { x: 0, y: top + 26, fill: cssVar('--muted'), 'font-size': 11 }, g)
        : svgEl('tspan', { fill: cssVar('--muted'), 'font-size': 11 }, lt);
      st.textContent = narrow ? r.sub : `  ${r.sub}`;
    }
    svgEl('rect', { x: 0, y: top + 20 + off, width: iw, height: 14, fill: cssVar('--grid'), rx: 2 }, g);
    svgEl('rect', { x: 0, y: top + 20 + off, width: Math.max(1, x(r.value)), height: 14, fill: r.color || cssVar('--c1'), rx: 2 }, g);
    const vt = svgEl('text', { x: iw + 6, y: top + 31 + off, 'font-size': 12, 'font-weight': 600, fill: cssVar('--text') }, g);
    vt.textContent = (o.format || ((v) => v))(r.value);
  });
  for (const r of o.refs || []) {
    o.rows.forEach((_, i) => svgEl('line', { x1: x(r.x), x2: x(r.x), y1: i * rowH + 17 + off, y2: i * rowH + 37 + off, stroke: cssVar('--muted'), 'stroke-dasharray': '3 3' }, g));
    const t = svgEl('text', { x: x(r.x), y: o.rows.length * rowH + 13, 'text-anchor': 'middle', 'font-size': 10.5, fill: cssVar('--muted') }, g);
    t.textContent = r.label;
  }
}

// ---------------------------------------------------------------- dot rows (several metrics per row)
export function dotRows(container, o) {
  const rowH = 40;
  const height = o.rows.length * rowH + 26;
  const m = { l: 4, r: 14, t: 4, b: 22 };
  const { svg, g, iw } = frame(container, height, m);
  svg.setAttribute('aria-label', o.aria || '');
  const [d0, d1] = o.domain;
  const x = (v) => ((v - d0) / (d1 - d0)) * iw;
  const bottom = o.rows.length * rowH;
  for (const t of ticks(d0, d1, 5)) {
    svgEl('line', { x1: x(t), x2: x(t), y1: 0, y2: bottom, stroke: cssVar('--grid') }, g);
    const tx = svgEl('text', { x: x(t), y: bottom + 14, 'text-anchor': 'middle', 'font-size': 11, fill: cssVar('--muted') }, g);
    tx.textContent = (o.format || ((v) => v))(t);
  }
  o.rows.forEach((r, i) => {
    const top = i * rowH;
    const lt = svgEl('text', { x: 0, y: top + 12, 'font-size': 12, fill: cssVar('--text') }, g);
    lt.textContent = r.label;
    const vals = o.keys.map((k) => r.vals[k.key]).filter((v) => v != null);
    const cy = top + 27;
    svgEl('line', { x1: x(Math.min(...vals)), x2: x(Math.max(...vals)), y1: cy, y2: cy, stroke: cssVar('--border'), 'stroke-width': 3 }, g);
    for (const k of o.keys) {
      const v = r.vals[k.key];
      if (v == null) continue;
      const attrs = { fill: k.color, stroke: cssVar('--surface'), 'stroke-width': 1.2 };
      let mk;
      if (k.shape === 'square') mk = svgEl('rect', { ...attrs, x: x(v) - 5, y: cy - 5, width: 10, height: 10 }, g);
      else if (k.shape === 'diamond') mk = svgEl('path', { ...attrs, d: `M${x(v)},${cy - 7}L${x(v) + 7},${cy}L${x(v)},${cy + 7}L${x(v) - 7},${cy}Z` }, g);
      else mk = svgEl('circle', { ...attrs, cx: x(v), cy, r: 5.5 }, g);
      const t = svgEl('title', {}, mk);
      t.textContent = `${r.label}: ${k.name} ${(o.format || ((q) => q))(v)}`;
    }
  });
}

// ---------------------------------------------------------------- heatmap (x = weeks, y = bins)
export function heatmap(container, o) {
  const height = o.height || 250;
  const m = { l: 46, r: 10, t: 8, b: 26 };
  const { svg, g, iw, ih } = frame(container, height, m);
  svg.setAttribute('aria-label', o.aria || '');
  const nx = o.xLabels.length, ny = o.yLabels.length;
  const cw = iw / nx, ch = ih / ny;
  let vmax = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) vmax = Math.max(vmax, o.value(i, j) || 0);
  const lo = Math.log10(o.floor || 1e-3), hi = Math.log10(vmax);
  const c = cssVar('--c1');
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const v = o.value(i, j) || 0;
      const t = v <= 0 ? 0 : Math.max(0.03, Math.min(1, (Math.log10(v) - lo) / (hi - lo)));
      svgEl('rect', { x: i * cw, y: ih - (j + 1) * ch, width: cw + 0.5, height: ch + 0.5, fill: c, 'fill-opacity': t.toFixed(3) }, g);
    }
  }
  if (o.hline != null) {
    const yy = ih - o.hline * ny * ch;
    svgEl('line', { x1: 0, x2: iw, y1: yy, y2: yy, stroke: cssVar('--alert'), 'stroke-dasharray': '4 3' }, g);
    const t = svgEl('text', { x: iw - 2, y: yy - 4, 'text-anchor': 'end', 'font-size': 10.5, fill: cssVar('--alert') }, g);
    t.textContent = o.hlineLabel || '';
  }
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    const tx = svgEl('text', { x: -6, y: ih - v * ih, 'text-anchor': 'end', 'dominant-baseline': 'middle', 'font-size': 11, fill: cssVar('--muted') }, g);
    tx.textContent = v.toFixed(2);
  }
  xLabels(g, o.xLabels, (i) => cw * (i + 0.5), ih, iw, fmtDay);
  const cell = svgEl('rect', { fill: 'none', stroke: cssVar('--text'), 'stroke-width': 1.5, visibility: 'hidden', width: cw, height: ch }, g);
  svg.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect();
    const scale = r.width / svg.viewBox.baseVal.width;
    const px = (e.clientX - r.left) / scale - m.l, py = (e.clientY - r.top) / scale - m.t;
    const i = Math.floor(px / cw), j = ny - 1 - Math.floor(py / ch);
    if (i < 0 || i >= nx || j < 0 || j >= ny) { cell.setAttribute('visibility', 'hidden'); hideTip(); return; }
    cell.setAttribute('x', i * cw); cell.setAttribute('y', ih - (j + 1) * ch); cell.setAttribute('visibility', 'visible');
    showTip(o.tip(i, j), e.clientX, e.clientY);
  });
  svg.addEventListener('pointerleave', () => { cell.setAttribute('visibility', 'hidden'); hideTip(); });
}
