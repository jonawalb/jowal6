// Small DOM helpers: SVG elements, number formats, labeled sliders, plot frames.
const SVGNS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, parent = null, text = null) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
export const pct = x => (x == null || !Number.isFinite(x)) ? '–' : `${Math.round(x * 100)}%`;
export const f2 = x => (x == null || !Number.isFinite(x)) ? '–' : x.toFixed(2);
export const fh = x => (x == null || !Number.isFinite(x)) ? '–' : `${+x.toFixed(1)}`;

/** Labeled range slider. spec: { key, label, sym, min, max, step, help, fmt, toVal, fromVal } (toVal/fromVal map a log scale). */
export function slider(parent, spec, value, onInput) {
  const id = 'sl-' + spec.key;
  const wrap = document.createElement('div');
  wrap.className = 'slider' + (spec.cls ? ' ' + spec.cls : '');
  wrap.innerHTML = `<div class="sl-h"><label for="${id}">${spec.label}${spec.sym ? ` <span class="sym">${spec.sym}</span>` : ''}</label><output for="${id}"></output></div>
    <input type="range" id="${id}" min="${spec.min}" max="${spec.max}" step="${spec.step}">
    ${spec.help ? `<small>${spec.help}</small>` : ''}`;
  parent.appendChild(wrap);
  const input = wrap.querySelector('input'), out = wrap.querySelector('output');
  const toVal = spec.toVal || (v => v), fromVal = spec.fromVal || (v => v);
  const fmt = spec.fmt || (v => (+v).toFixed(2));
  const show = () => { out.textContent = fmt(toVal(+input.value)); };
  input.value = fromVal(value); show();
  input.addEventListener('input', () => { show(); onInput(toVal(+input.value)); });
  return { input, wrap, set(v) { input.value = fromVal(v); show(); } };
}

/** Plot frame. box: { W, H, m, x:[a,b], y:[a,b], xlog, xrev } */
export function frame(svg, box, g0 = null) {
  if (!g0) { svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${box.W} ${box.H}`); }
  const { m } = box, iw = box.W - m.l - m.r, ih = box.H - m.t - m.b;
  const lx = v => box.xlog ? Math.log10(v) : v;
  let [x0, x1] = box.x.map(lx);
  if (box.xrev) [x0, x1] = [x1, x0];
  const sx = v => m.l + (lx(v) - x0) / (x1 - x0) * iw;
  const sy = v => m.t + ih - (v - box.y[0]) / (box.y[1] - box.y[0]) * ih;
  return { g: el('g', {}, g0 || svg), sx, sy, iw, ih, m, box };
}
export function axes(F, { xt = [], yt = [], xl = '', yl = '', xf = String, yf = String, grid = true, noX = false }) {
  const { g, sx, sy, m, box } = F;
  const a = el('g', { class: 'axis' }, g);
  if (grid) yt.forEach(v => el('line', { x1: m.l, x2: box.W - m.r, y1: sy(v), y2: sy(v), class: 'grid' }, a));
  el('line', { x1: m.l, x2: box.W - m.r, y1: box.H - m.b, y2: box.H - m.b }, a);
  el('line', { x1: m.l, x2: m.l, y1: m.t, y2: box.H - m.b }, a);
  if (!noX) xt.forEach(v => { el('line', { x1: sx(v), x2: sx(v), y1: box.H - m.b, y2: box.H - m.b + 4 }, a); el('text', { x: sx(v), y: box.H - m.b + 16, 'text-anchor': 'middle' }, a, xf(v)); });
  yt.forEach(v => el('text', { x: m.l - 6, y: sy(v) + 4, 'text-anchor': 'end' }, a, yf(v)));
  if (xl) el('text', { x: m.l + F.iw / 2, y: box.H - 3, 'text-anchor': 'middle', class: 'ax-t' }, a, xl);
  if (yl) el('text', { x: m.l, y: m.t - 6, 'text-anchor': 'start', class: 'ax-t' }, a, yl);
}
export const path = (pts, sx, sy) => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join('');
export const narrow = svg => (svg.clientWidth || 800) < 560;
