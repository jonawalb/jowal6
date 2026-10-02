// Shared helpers for the Lessons diagrams: SVG/DOM builders, halo text, controls, resize-driven redraw,
// reduced-motion-aware animation, chart axes. Pure DOM; colours come from CSS tokens (var(--…)) so both
// skins and dark mode restyle the diagrams with no redraw.
import { captionFor } from '../../data/lessons.js';

export const NS = 'http://www.w3.org/2000/svg';
const STYLE_KEYS = new Set(['fill', 'stroke', 'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-width', 'stroke-dasharray', 'font-size', 'font-weight']);

/** Create an SVG element. Paint keys go into style so var(--token) works everywhere. */
export function s(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(NS, tag);
  let style = '';
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'text') e.textContent = v;
    else if (STYLE_KEYS.has(k)) style += `${k}:${v};`;
    else e.setAttribute(k, v);
  }
  if (style) e.setAttribute('style', style + (attrs.style || ''));
  if (parent) parent.appendChild(e);
  return e;
}

/** Create an HTML element. */
export function h(tag, attrs = {}, parent = null, text = null) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else e.setAttribute(k, v === true ? '' : v);
  }
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

/** Halo text (paint-order: stroke, see dd-lessons.css .dg-t). */
export function txt(parent, x, y, str, o = {}) {
  return s('text', { x, y, text: str, class: 'dg-t' + (o.on ? ' dg-on' : '') + (o.cls ? ' ' + o.cls : ''), 'text-anchor': o.anchor || 'start',
    'dominant-baseline': o.base || 'middle', fill: o.fill, 'font-size': o.size ? o.size + 'px' : null,
    'font-weight': o.weight, transform: o.rotate ? `rotate(${o.rotate} ${x} ${y})` : null }, parent);
}

export const reducedMotion = (opts = {}) => !!opts.reduced ||
  (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

/** Apply colour overrides ({blue: '#…'}) as CSS custom properties on the figure. */
function applyColors(root, colors) {
  for (const [k, v] of Object.entries(colors || {})) root.style.setProperty('--' + k, v);
}

/**
 * Build the figure shell: title, lesson line, controls row, drawing stage, live readout, caption.
 * Returns parts plus svg(w, h, label) which (re)creates the stage SVG at true pixel size.
 */
export function frame(el, lesson, opts = {}) {
  el.textContent = '';
  const root = h('figure', { class: 'dg', 'data-dg': lesson.id, id: 'dg-' + lesson.id }, el);
  applyColors(root, opts.colors);
  const head = h('div', { class: 'dg-head' }, root);
  h('h3', { class: 'dg-title', id: `dg-${lesson.id}-t` }, head, lesson.title);
  h('p', { class: 'dg-lesson' }, head, lesson.lesson);
  const controls = h('div', { class: 'dg-ctl' }, root);
  const stage = h('div', { class: 'dg-stage' }, root);
  const readout = h('p', { class: 'dg-read', 'aria-live': 'polite' }, root);
  const extra = h('div', { class: 'dg-extra' }, root);
  h('p', { class: 'dg-cap' }, root, captionFor(lesson));
  const svg = (w, ht, label) => {
    stage.textContent = '';
    const e = s('svg', { width: w, height: ht, viewBox: `0 0 ${w} ${ht}`, role: 'img', 'aria-labelledby': `dg-${lesson.id}-t dg-${lesson.id}-d`, class: 'dg-svg' }, stage);
    s('desc', { id: `dg-${lesson.id}-d`, text: label }, e);
    return e;
  };
  return { root, head, controls, stage, readout, extra, svg };
}

/** Segmented control (buttons with aria-pressed). options: [{v, l, title?}]. */
export function seg(parent, label, options, value, onChange) {
  const w = h('div', { class: 'dg-seg', role: 'group', 'aria-label': label }, parent);
  h('span', { class: 'dg-seg-l', 'aria-hidden': 'true' }, w, label);
  const btns = options.map(o => {
    const b = h('button', { type: 'button', class: 'dg-btn', 'data-v': String(o.v), title: o.title || null }, w, o.l);
    b.addEventListener('click', () => { api.set(o.v); onChange(o.v); });
    return b;
  });
  const api = { el: w, set(v) { btns.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i].v === v))); } };
  api.set(value);
  return api;
}

/** Labelled range slider with a live output. fmt(v) → text. */
export function slider(parent, label, { min, max, step, value, fmt = String }, onInput) {
  const id = 'dgs-' + Math.random().toString(36).slice(2, 8);
  const w = h('label', { class: 'dg-sl', for: id }, parent);
  const top = h('span', { class: 'dg-sl-h' }, w);
  h('span', {}, top, label);
  const out = h('output', { for: id }, top, fmt(value));
  const input = h('input', { type: 'range', id, min, max, step, value }, w);
  const upd = () => { const v = +input.value; out.textContent = fmt(v); input.setAttribute('aria-valuetext', fmt(v)); return v; };
  input.addEventListener('input', () => onInput(upd()));
  upd();
  return { input, set(v) { input.value = v; upd(); } };
}

/** Legend row under the stage. items: [{label, color (token name), dash?, square?}] */
export function legend(f, items) {
  const ul = h('ul', { class: 'dg-legend' });
  f.stage.after(ul);
  for (const it of items) {
    const li = h('li', {}, ul);
    const i = h('i', { 'aria-hidden': 'true' }, li);
    i.style.background = it.dash ? `repeating-linear-gradient(90deg, var(--${it.color}) 0 5px, transparent 5px 8px)` : `var(--${it.color})`;
    if (it.soft) i.style.opacity = '.35';
    if (it.line) { i.style.height = '3px'; i.style.verticalAlign = '3px'; }
    li.append(it.label);
  }
  return ul;
}

/** Plain button. */
export function button(parent, label, onClick, attrs = {}) {
  const b = h('button', { type: 'button', class: 'dg-btn', ...attrs }, parent, label);
  b.addEventListener('click', onClick);
  return b;
}

/**
 * Play / Pause / Step controls. With reduced motion there is no Play: only Step (and Back).
 * tick(dt) advances the animation by dt seconds and returns false to stop.
 */
export function player(parent, { reduced, tick, step, back, autoplay = true }) {
  const w = h('div', { class: 'dg-play' }, parent);
  let raf = 0, last = 0, playing = false;
  const playBtn = reduced ? null : button(w, 'Pause', () => (playing ? stop() : start()), { 'aria-pressed': 'false' });
  if (back) button(w, '◀ Back', () => { stop(); back(); }, { 'aria-label': 'Step back' });
  button(w, 'Step ▶', () => { stop(); step(); }, { 'aria-label': 'Step forward' });
  const loop = ts => {
    if (!w.isConnected) return stop();
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts;
    if (tick(dt) === false) return stop();
    raf = requestAnimationFrame(loop);
  };
  function start() { if (reduced || playing) return; playing = true; last = 0; raf = requestAnimationFrame(loop); if (playBtn) playBtn.textContent = 'Pause'; }
  function stop() { playing = false; cancelAnimationFrame(raf); if (playBtn) playBtn.textContent = 'Play'; }
  if (playBtn) playBtn.textContent = 'Play';
  if (autoplay && !reduced) start();
  return { start, stop, get playing() { return playing; }, el: w };
}

/** Redraw on container resize. draw(width) is called now and on each width change. */
export function sized(stage, draw) {
  let w = 0;
  const go = () => { const nw = Math.max(300, Math.round(stage.clientWidth || 640)); if (nw !== w) { w = nw; draw(w); } };
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(go) : null;
  if (ro) ro.observe(stage);
  go();
  return { redraw: () => draw(w || 640), get width() { return w || 640; }, destroy: () => ro && ro.disconnect() };
}

/** Linear or log scale. */
export function scale([d0, d1], [r0, r1], log = false) {
  const f = log ? v => Math.log10(v) : v => v;
  const a = f(d0), b = f(d1);
  const fn = v => r0 + (f(v) - a) / (b - a) * (r1 - r0);
  fn.inv = p => { const t = a + (p - r0) / (r1 - r0) * (b - a); return log ? Math.pow(10, t) : t; };
  return fn;
}

/**
 * Chart axes in box {x, y, w, h}. Returns {sx, sy}. Ticks are drawn with halo labels; axis titles outside.
 */
export function axes(g, box, o) {
  const sx = scale(o.x, [box.x, box.x + box.w], o.xLog), sy = scale(o.y, [box.y + box.h, box.y], o.yLog);
  s('rect', { x: box.x, y: box.y, width: box.w, height: box.h, class: 'dg-plot' }, g);
  for (const t of o.xTicks || []) {
    const X = sx(t);
    s('line', { x1: X, x2: X, y1: box.y, y2: box.y + box.h, class: 'dg-grid' }, g);
    txt(g, X, box.y + box.h + 12, (o.fmtX || String)(t), { anchor: 'middle', cls: 'dg-tick' });
  }
  for (const t of o.yTicks || []) {
    const Y = sy(t);
    s('line', { x1: box.x, x2: box.x + box.w, y1: Y, y2: Y, class: 'dg-grid' }, g);
    txt(g, box.x - 5, Y, (o.fmtY || String)(t), { anchor: 'end', cls: 'dg-tick' });
  }
  if (o.xLabel) txt(g, box.x + box.w / 2, box.y + box.h + 28, o.xLabel, { anchor: 'middle', cls: 'dg-axis' });
  if (o.yLabel) txt(g, box.x - 34, box.y + box.h / 2, o.yLabel, { anchor: 'middle', cls: 'dg-axis', rotate: -90 });
  return { sx, sy };
}

/** SVG path through points [[x, y], …] (already in pixels). */
export const pathD = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');

/** Push labels apart vertically so none overlap. items: [{y, h}] (mutated: y). Keeps them within [lo, hi]. */
export function decollide(items, gap = 2, lo = -Infinity, hi = Infinity) {
  const arr = [...items].sort((a, b) => a.y - b.y);
  for (let i = 1; i < arr.length; i++) {
    const need = arr[i - 1].y + (arr[i - 1].h + arr[i].h) / 2 + gap;
    if (arr[i].y < need) arr[i].y = need;
  }
  const over = arr.length ? arr[arr.length - 1].y + arr[arr.length - 1].h / 2 - hi : 0;
  if (over > 0) arr.forEach(a => { a.y -= over; });
  for (let i = arr.length - 2; i >= 0; i--) {
    const max = arr[i + 1].y - (arr[i + 1].h + arr[i].h) / 2 - gap;
    if (arr[i].y > max) arr[i].y = max;
  }
  if (arr.length && arr[0].y - arr[0].h / 2 < lo) { const d = lo - (arr[0].y - arr[0].h / 2); arr.forEach(a => { a.y += d; }); }
  return items;
}

/** Arrowhead marker defs; returns url() for a marker of the given token colour. */
export function arrowDefs(svg, id, colorVar) {
  const defs = svg.querySelector('defs') || s('defs', {}, svg);
  const m = s('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
  s('path', { d: 'M0 0 L10 5 L0 10 z', fill: `var(--${colorVar})` }, m);
  return `url(#${id})`;
}

/** Unique-per-figure id prefix for defs. */
export const uid = (lesson, k) => `dg${lesson.id}-${k}`;

export const fmt = {
  km: v => (v >= 100 ? v.toFixed(0) : v.toFixed(1)) + ' km',
  pct: v => Math.round(v * 100) + '%',
  x: v => v.toFixed(2) + '×',
  n1: v => v.toFixed(1), n2: v => v.toFixed(2),
};

/** A focusable SVG group that acts like a button (Enter/Space), with an accessible name. */
export function svgButton(parent, label, onAct, attrs = {}) {
  const g = s('g', { tabindex: 0, role: 'button', 'aria-label': label, ...attrs, class: 'dg-hit ' + (attrs.class || '') }, parent);
  g.addEventListener('click', onAct);
  g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAct(e); } });
  return g;
}

/** Restore keyboard focus to the element with the same data-key after a redraw. */
export function keepFocus(container, fn) {
  const k = document.activeElement && container.contains(document.activeElement) ? document.activeElement.getAttribute('data-key') : null;
  fn();
  if (k) container.querySelector(`[data-key="${k}"]`)?.focus();
}
