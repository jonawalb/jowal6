// Small-multiple transit charts: one row per chokepoint, shared date cursor, before/after windows and event ticks.
import { el } from '../../../shared/js/mapkit.js';
import { NAMES, METRICS, smoothed, windowMean, idx, iso, clampIdx, pct, fmtPct, fmtVal, niceDate, LAST } from './series.js';

const H = 150, M = { t: 18, r: 12, b: 20, l: 40 };
const CAT_VAR = { attack: 'var(--bad)', coalition: 'var(--blue)', strike: 'var(--c6)', ceasefire: 'var(--good)', hormuz: 'var(--c2)', other: 'var(--faint)' };
export const catColor = c => CAT_VAR[c] || CAT_VAR.other;

export function createCharts(host, { onDate, onEvent }) {
  const rows = {};
  let S = null, EVENTS = [];

  function ensureRow(key) {
    if (rows[key]) return rows[key];
    const wrap = document.createElement('div');
    wrap.className = 'rs-row';
    wrap.innerHTML = `<div class="rs-row-h"><h3>${NAMES[key]}</h3><p class="rs-rv" aria-live="polite"></p></div>`;
    const svg = el('svg', { class: 'rs-chart', tabindex: 0, role: 'img' });
    svg.setAttribute('aria-label', `${NAMES[key]} daily transits. Arrow keys move the date; Shift+arrow moves a month.`);
    wrap.appendChild(svg);
    host.appendChild(wrap);
    const r = { key, wrap, svg, rv: wrap.querySelector('.rs-rv'), x: null };
    const pick = e => {
      if (!r.x) return;
      const b = svg.getBoundingClientRect();
      onDate(iso(clampIdx(Math.round(r.x.inv(e.clientX - b.left)))));
    };
    let drag = false;
    svg.addEventListener('pointerdown', e => {
      if (e.target.closest('.rs-ev')) return;
      drag = true; svg.setPointerCapture(e.pointerId); pick(e);
    });
    svg.addEventListener('pointermove', e => { if (drag) pick(e); });
    svg.addEventListener('pointerup', () => { drag = false; });
    svg.addEventListener('pointercancel', () => { drag = false; });
    svg.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const step = (e.shiftKey ? 30 : 1) * (e.key === 'ArrowLeft' ? -1 : 1);
      onDate(iso(clampIdx(idx(S.date) + step)));
    });
    rows[key] = r;
    return r;
  }

  function drawRow(r) {
    const { svg, key } = r;
    const W = Math.max(300, Math.round(svg.parentNode.clientWidth || 600));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.textContent = '';
    const i0 = idx(S.from), i1 = idx(LAST);
    const iw = W - M.l - M.r, ih = H - M.t - M.b;
    const X = i => M.l + (i - i0) / (i1 - i0) * iw;
    X.inv = px => i0 + (px - M.l) / iw * (i1 - i0);
    r.x = X;
    const ser = smoothed(key, S.metric, S.smooth);
    let ymax = 0;
    for (let i = i0; i <= i1; i++) if (ser[i] != null && ser[i] > ymax) ymax = ser[i];
    const step = niceStep(ymax / 3);
    ymax = Math.max(step, Math.ceil(ymax / step) * step);
    const Y = v => M.t + ih - v / ymax * ih;

    const g = el('g', {}, svg);
    for (let v = 0; v <= ymax; v += step) {
      el('line', { x1: M.l, x2: W - M.r, y1: Y(v), y2: Y(v), class: 'grid' }, g);
      el('text', { x: M.l - 5, y: Y(v) + 3.5, class: 'ax-t', 'text-anchor': 'end' }, g, v >= 1000 ? `${v / 1000}k` : v);
    }
    const y0 = +S.from.slice(0, 4), y1 = +LAST.slice(0, 4);
    const every = (y1 - y0) > 4 && W < 700 ? 2 : 1;
    for (let y = y0 + (S.from.endsWith('01-01') ? 0 : 1); y <= y1; y++) {
      const xi = idx(`${y}-01-01`); if (xi < i0) continue;
      el('line', { x1: X(xi), x2: X(xi), y1: M.t, y2: M.t + ih, class: 'grid yr' }, g);
      if ((y - y0) % every === 0) el('text', { x: X(xi) + 3, y: H - 6, class: 'ax-t' }, g, y);
    }
    // Before / after windows with their means
    [['b', S.before], ['a', S.after]].forEach(([k, w]) => {
      const a = Math.max(i0, idx(w[0])), b = Math.min(i1, idx(w[1]));
      if (b < a) return;
      el('rect', { x: X(a), y: M.t, width: Math.max(1, X(b) - X(a)), height: ih, class: `win win-${k}` }, g);
      const m = windowMean(key, S.metric, w);
      if (m != null) el('line', { x1: X(a), x2: X(b), y1: Y(m), y2: Y(m), class: `wmean wmean-${k}` }, g);
      if (key === S.firstKey) { const nearEnd = X(a) + 44 > W - M.r; el('text', { x: nearEnd ? X(b) - 2 : X(a) + 3, y: M.t - 5, 'text-anchor': nearEnd ? 'end' : 'start', class: `win-t win-t-${k}` }, g, k === 'b' ? 'Before' : 'After'); }
    });
    // Series
    let d = '', pen = false;
    for (let i = i0; i <= i1; i++) {
      const v = ser[i];
      if (v == null) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`; pen = true;
    }
    el('path', { d: `${d}L${X(i1).toFixed(1)} ${Y(0)}L${X(i0).toFixed(1)} ${Y(0)}Z`, class: 'area' }, g);
    el('path', { d, class: 'line' }, g);
    // Events for this chokepoint
    const evg = el('g', {}, g);
    EVENTS.filter(ev => ev.cp.includes(key) && S.cats.has(ev.cat)).forEach(ev => {
      const xi = idx(ev.date); if (xi < i0 || xi > i1) return;
      const on = ev.id === S.ev;
      const eg = el('g', { class: `rs-ev${on ? ' on' : ''}`, transform: `translate(${X(xi).toFixed(1)} 0)`, tabindex: -1 }, evg);
      el('line', { x1: 0, x2: 0, y1: M.t, y2: M.t + ih, class: 'ev-l', stroke: catColor(ev.cat) }, eg);
      el('circle', { cx: 0, cy: M.t, r: on ? 5.5 : 3.8, fill: catColor(ev.cat), class: 'ev-d' }, eg);
      el('circle', { cx: 0, cy: M.t, r: 9, class: 'ev-hit' }, eg);
      el('title', {}, eg, `${niceDate(ev.date)}: ${ev.title}`);
      eg.addEventListener('click', e => { e.stopPropagation(); onEvent(ev.id); });
    });
    // Cursor
    const ci = idx(S.date);
    if (ci >= i0 && ci <= i1) {
      el('line', { x1: X(ci), x2: X(ci), y1: M.t - 4, y2: M.t + ih, class: 'cur' }, g);
      const v = ser[ci];
      if (v != null) el('circle', { cx: X(ci), cy: Y(v), r: 4, class: 'cur-h' }, g);
    }
    // Header readout
    const v = ser[ci], mb = windowMean(key, S.metric, S.before), ma = windowMean(key, S.metric, S.after);
    const ch = pct(mb, ma), chNow = pct(mb, v);
    const tone = p => p == null ? '' : p <= -40 ? 'bad' : p <= -15 ? 'warn' : p >= 15 ? 'up' : '';
    r.rv.innerHTML = `<span><i>${niceDate(S.date)}</i> <b>${fmtVal(v, S.metric)}</b> <span class="d ${tone(chNow)}">${fmtPct(chNow)}</span></span>
      <span><i>Before</i> ${fmtVal(mb, S.metric)}</span>
      <span><i>After</i> ${fmtVal(ma, S.metric)} <span class="d ${tone(ch)}">${fmtPct(ch)}</span></span>`;
  }

  function draw(state, events) {
    S = state; EVENTS = events;
    const keys = S.cape ? ['bab', 'suez', 'hormuz', 'cape'] : ['bab', 'suez', 'hormuz'];
    S.firstKey = keys[0];
    Object.values(rows).forEach(r => { r.wrap.hidden = !keys.includes(r.key); });
    keys.forEach(k => { const r = ensureRow(k); host.appendChild(r.wrap); drawRow(r); });
  }
  let t = null;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => S && draw(S, EVENTS), 120); });
  return { draw, unit: () => METRICS[S.metric].unit };
}

function niceStep(x) {
  if (x <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(x)), f = x / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}
