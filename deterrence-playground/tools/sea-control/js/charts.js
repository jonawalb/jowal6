// Main chart: share of sea traffic D keeps open (y) against D's battle-fleet share m (x). Thin lines show the
// outcome under each challenger strategy; the thick line follows the strategy the challenger actually picks.
// The chart is also the control for m: click, drag or use the arrow keys.
import { el } from '../../../shared/js/mapkit.js';
import { OPTS } from './model.js';

const width = svg => Math.max(280, Math.round(svg.clientWidth || svg.parentElement.clientWidth || 600));
const pct = v => Math.round(v * 100) + '%';

export function drawMain(svg, R, S, onPick) {
  const W = width(svg), narrow = W < 560;
  const H = narrow ? Math.round(W * 0.92) : Math.min(470, Math.round(W * 0.56));
  const P = { l: 46, r: narrow ? 12 : 22, t: 26, b: 46 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const X = v => P.l + v * (W - P.l - P.r), Y = v => H - P.b - v * (H - P.t - P.b);
  const g = el('g', {}, svg);
  el('rect', { x: P.l, y: P.t, width: W - P.l - P.r, height: H - P.t - P.b, class: 'plotbg' }, g);

  // Bands: which strategy the challenger picks at each m.
  let s = 0;
  const C = R.curve;
  for (let i = 1; i <= C.length; i++) {
    if (i === C.length || C[i].br !== C[s].br) {
      const x0 = X(C[s].m), x1 = X(C[Math.min(i, C.length - 1)].m);
      el('rect', { x: x0, y: P.t, width: Math.max(0, x1 - x0), height: H - P.t - P.b, class: 'band band-' + C[s].br }, g);
      if (x1 - x0 > (narrow ? 56 : 80)) {
        const o = OPTS.find(q => q.k === C[s].br);
        el('text', { x: (x0 + x1) / 2, y: P.t - 8, class: 'band-t band-t-' + o.k, 'text-anchor': 'middle' }, g, 'C: ' + o.short);
      }
      s = i;
    }
  }
  for (let i = 0; i <= 4; i++) {
    const v = i / 4;
    el('line', { x1: X(v), x2: X(v), y1: P.t, y2: H - P.b, class: 'grid' }, g);
    el('line', { x1: P.l, x2: W - P.r, y1: Y(v), y2: Y(v), class: 'grid' }, g);
    el('text', { x: X(v), y: H - P.b + 15, class: 'ax-t', 'text-anchor': 'middle' }, g, pct(v));
    el('text', { x: P.l - 6, y: Y(v) + 4, class: 'ax-t', 'text-anchor': 'end' }, g, pct(v));
  }
  el('text', { x: (P.l + W - P.r) / 2, y: H - 8, class: 'ax-l', 'text-anchor': 'middle' }, g,
    narrow ? 'D\'s budget in the battle fleet (m)' : 'Share of D\'s budget in the concentrated battle fleet (m); the rest buys distributed forces');
  const yl = (P.t + H - P.b) / 2;
  el('text', { x: 12, y: yl, class: 'ax-l', 'text-anchor': 'middle', transform: `rotate(-90 12 ${yl})` }, g, 'Sea traffic D keeps open');

  const line = key => C.map((c, i) => `${i ? 'L' : 'M'}${X(c.m).toFixed(1)},${Y(c[key]).toFixed(1)}`).join('');
  OPTS.forEach(o => el('path', { d: line(o.k), class: 'opt opt-' + o.k }, g));
  // Thick envelope, coloured by the strategy in play.
  s = 0;
  for (let i = 1; i <= C.length; i++) {
    if (i === C.length || C[i].br !== C[s].br) {
      const d = C.slice(s, i).map((c, j) => `${j ? 'L' : 'M'}${X(c.m).toFixed(1)},${Y(c[C[s].br]).toFixed(1)}`).join('');
      el('path', { d, class: 'env env-' + C[s].br }, g);
      s = i;
    }
  }
  // Optimum and locked-in mix.
  const vline = (m, cls, label, anchor) => {
    el('line', { x1: X(m), x2: X(m), y1: P.t, y2: H - P.b, class: 'vl ' + cls }, g);
    el('text', { x: X(m) + (anchor === 'end' ? -5 : 5), y: H - P.b - 8, class: 'vl-t ' + cls + '-t', 'text-anchor': anchor }, g, label);
  };
  const lockOn = S.theta > 0 || S.beta > 0;
  const starAnchor = R.mStar > 0.8 || (lockOn && R.mL > R.mStar) ? 'end' : 'start';
  vline(R.mStar, 'vl-star', narrow ? 'm*' : 'Best mix m*', starAnchor);
  if (lockOn && Math.abs(R.mL - R.mStar) > 0.004) vline(R.mL, 'vl-lock', narrow ? 'mL' : 'Locked-in mix', R.mL > 0.8 ? 'end' : 'start');
  el('circle', { cx: X(R.mStar), cy: Y(R.openStar), r: 5, class: 'dot-star' }, g);
  if (lockOn) el('circle', { cx: X(R.mL), cy: Y(R.openL), r: 5, class: 'dot-lock' }, g);

  // Current choice: draggable handle.
  const cx = X(S.m), cy = Y(R.open);
  el('line', { x1: cx, x2: cx, y1: P.t, y2: H - P.b, class: 'cur' }, g);
  el('circle', { cx, cy, r: 8, class: 'cur-h' }, g);
  const flip = cx > W * (narrow ? 0.5 : 0.7);
  const lab = el('text', { x: cx + (flip ? -12 : 12), y: Math.max(P.t + 14, cy - 12), class: 'cur-t', 'text-anchor': flip ? 'end' : 'start' }, g,
    `m = ${pct(S.m)} · ${pct(R.open)} open`);
  lab.setAttribute('aria-hidden', 'true');

  const toM = ev => {
    const r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) * W / r.width;
    return Math.max(0, Math.min(1, Math.round((x - P.l) / (W - P.l - P.r) * 100) / 100));
  };
  let drag = false;
  svg.onpointerdown = ev => { drag = true; try { svg.setPointerCapture(ev.pointerId); } catch { /* synthetic event */ } onPick(toM(ev)); };
  svg.onpointermove = ev => { if (drag) onPick(toM(ev)); };
  svg.onpointerup = svg.onpointercancel = () => { drag = false; };
}
