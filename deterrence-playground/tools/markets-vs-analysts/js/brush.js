// Overview strip across the full record with a draggable window (brush) that sets the date range.
import { el } from '../../../shared/js/mapkit.js';
import { BY_ID, AIR7, EX, priceAt, DATA_FIRST, DATA_LAST, nice } from './series.js';
import { colorOf } from './chart.js';

const H = 74, L = 44, R = 44, T = 6, B = 20;
const MIN_SPAN = 14;

export function createBrush(svg, onChange) {
  let S = null, W = 900;
  const lo = DATA_FIRST - 7, hi = DATA_LAST;
  const X = d => L + (d - lo) / (hi - lo) * (W - L - R);
  const D = x => Math.round(lo + (x - L) / (W - L - R) * (hi - lo));
  let win, hl, hr;

  function render(state) {
    S = state;
    W = Math.max(320, Math.round(svg.clientWidth || 900));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
    const Y = p => T + (H - T - B) * (1 - Math.min(1, p / 40));
    EX.filter(e => e.b >= lo).forEach(e => el('rect', { x: X(e.a), y: T, width: Math.max(2, X(e.b + 1) - X(e.a)), height: H - T - B, class: 'ex-band' }, svg));
    let d = '', open = false;
    for (let k = lo; k <= hi; k++) {
      if (AIR7.has(k)) { d += (open ? 'L' : 'M') + X(k).toFixed(1) + ' ' + (T + (H - T - B) * (1 - Math.min(1, AIR7.get(k) / 60))).toFixed(1); open = true; } else open = false;
    }
    el('path', { d, class: 'air-line thin' }, svg);
    S.markets.forEach((id, i) => {
      const m = BY_ID.get(id); if (!m) return;
      let p = '', prev = null;
      for (let k = m.first; k <= m.last; k++) {
        const v = priceAt(m, k); if (v == null) continue;
        p += (prev != null && k - prev <= 3 ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(v).toFixed(1); prev = k;
      }
      el('path', { d: p, class: 'price thin', stroke: colorOf(i) }, svg);
    });
    for (let y = 2024; y <= 2026; y++) {
      const x = X(Math.round(Date.UTC(y, 0, 1) / 864e5));
      el('line', { x1: x, x2: x, y1: T, y2: H - B + 4, class: 'tick' }, svg);
      el('text', { x: x + 3, y: H - 6, class: 'axis-t' }, svg, y);
    }
    win = el('rect', { y: T - 2, height: H - T - B + 4, class: 'brush-win', tabindex: 0, role: 'slider',
      'aria-label': 'Date window. Arrow keys move it, Shift plus arrow keys widen or narrow it.' }, svg);
    hl = el('rect', { y: T + 8, width: 6, height: H - T - B - 12, rx: 2, class: 'brush-h' }, svg);
    hr = el('rect', { y: T + 8, width: 6, height: H - T - B - 12, rx: 2, class: 'brush-h' }, svg);
    place();
    win.onkeydown = e => {
      const step = e.altKey ? 30 : 7;
      let [a, b] = S.win;
      if (e.key === 'ArrowLeft') { if (e.shiftKey) b -= step; else { a -= step; b -= step; } }
      else if (e.key === 'ArrowRight') { if (e.shiftKey) b += step; else { a += step; b += step; } }
      else return;
      e.preventDefault(); set(a, b, true);
    };
  }

  function place() {
    const [a, b] = S.win;
    win.setAttribute('x', X(a)); win.setAttribute('width', Math.max(4, X(b) - X(a)));
    win.setAttribute('aria-valuetext', `${nice(a)} to ${nice(b)}`);
    hl.setAttribute('x', X(a) - 3); hr.setAttribute('x', X(b) - 3);
  }

  function set(a, b, done) {
    if (b - a < MIN_SPAN) { if (a !== S.win[0]) a = b - MIN_SPAN; else b = a + MIN_SPAN; }
    if (a < lo) { b += lo - a; a = lo; }
    if (b > hi) { a -= b - hi; b = hi; }
    a = Math.max(lo, a);
    S.win = [a, b]; place(); onChange(done);
  }

  const px = e => { const r = svg.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; };
  let drag = null;
  svg.addEventListener('pointerdown', e => {
    if (!S) return;
    const x = px(e), xa = X(S.win[0]), xb = X(S.win[1]);
    svg.setPointerCapture(e.pointerId);
    if (Math.abs(x - xa) < 8) drag = { k: 'l' };
    else if (Math.abs(x - xb) < 8) drag = { k: 'r' };
    else if (x > xa && x < xb) drag = { k: 'm', x0: x, w: [...S.win] };
    else drag = { k: 'new', d0: D(x) };
  });
  svg.addEventListener('pointermove', e => {
    if (!S) return;
    const x = px(e), xa = X(S.win[0]), xb = X(S.win[1]);
    svg.style.cursor = Math.abs(x - xa) < 8 || Math.abs(x - xb) < 8 ? 'ew-resize' : x > xa && x < xb ? 'grab' : 'crosshair';
    if (!drag) return;
    const d = D(x);
    if (drag.k === 'l') set(Math.min(d, S.win[1] - MIN_SPAN), S.win[1]);
    else if (drag.k === 'r') set(S.win[0], Math.max(d, S.win[0] + MIN_SPAN));
    else if (drag.k === 'm') { const dd = Math.round((x - drag.x0) / (W - L - R) * (hi - lo)); set(drag.w[0] + dd, drag.w[1] + dd); }
    else set(Math.min(drag.d0, d), Math.max(drag.d0, d));
  });
  const end = () => { if (drag) { drag = null; onChange(true); } };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);

  return { render, place: () => S && place() };
}
