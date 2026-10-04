// SVG timeline: battlefield lane, Russian signals by escalation level, Western responses lane.
import { el } from '../../../shared/js/mapkit.js';
import { LEVELS, when, t, colorOf, fdate } from './model.js';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function drawTimeline(svg, list, S, { onPick, tip }) {
  svg.innerHTML = '';
  const W = Math.max(300, Math.round(svg.parentNode.clientWidth - 2)), narrow = W < 600;
  const L = narrow ? 30 : 150, R = 12, T = 8;
  const laneB = 34, band = narrow ? 30 : 36, laneW = 34, B = 22;
  const yB = T + laneB / 2, y0 = T + laneB + 8, yW = y0 + band * 6 + 8 + laneW / 2;
  const H = y0 + band * 6 + 8 + laneW + B;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const t0 = t(S.from), t1 = t(S.to), x = d => L + ((t(d) - t0) / (t1 - t0)) * (W - L - R);
  const g = el('g', {}, svg);

  // Lanes and level bands.
  el('rect', { x: L, y: T, width: W - L - R, height: laneB, class: 'lane' }, g);
  el('rect', { x: L, y: yW - laneW / 2, width: W - L - R, height: laneW, class: 'lane' }, g);
  LEVELS.forEach(l => {
    const y = y0 + band * (5 - l.v);
    el('rect', { x: L, y, width: W - L - R, height: band, class: 'lvband', style: `opacity:${0.04 + l.v * 0.035}` }, g);
    el('text', { x: L - 6, y: y + band / 2 + 4, class: 'lv-t', 'text-anchor': 'end' }, g, narrow ? String(l.v) : `${l.v} ${l.n.length > 18 ? l.n.split(' ')[0] + ' use' : l.n}`);
  });
  if (!narrow) {
    el('text', { x: L - 6, y: yB + 4, class: 'lane-t', 'text-anchor': 'end' }, g, 'Battlefield');
    el('text', { x: L - 6, y: yW + 4, class: 'lane-t', 'text-anchor': 'end' }, g, 'West / NATO');
  } else {
    // No room for lane names at phone width: label the lanes with the legend's shapes in the gutter.
    const gx = L - 12;
    el('path', { d: `M${gx} ${yB - 5}L${gx + 5} ${yB}L${gx} ${yB + 5}L${gx - 5} ${yB}Z`, class: 'lane-k k-d' }, g);
    el('rect', { x: gx - 4, y: yW - 4, width: 8, height: 8, class: 'lane-k k-s' }, g);
  }

  // Month and year ticks.
  const ax = el('g', {}, svg);
  const yAx = H - B;
  const span = (t1 - t0) / 864e5;
  if (S.from.slice(5) !== '01-01') el('text', { x: L + 3, y: yAx + 15, class: 'ax-t yr' }, ax, S.from.slice(0, 4));
  for (let y = +S.from.slice(0, 4); y <= +S.to.slice(0, 4); y++) {
    for (let m = 0; m < 12; m++) {
      const d = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      if (d < S.from || d > S.to) continue;
      const px = x(d);
      if (m === 0) {
        el('line', { x1: px, x2: px, y1: T, y2: yAx + 4, class: 'yr-l' }, ax);
        el('text', { x: px + 3, y: yAx + 15, class: 'ax-t yr' }, ax, String(y));
      } else if (span < 500 && (!narrow || m % 3 === 0)) {
        el('line', { x1: px, x2: px, y1: yAx, y2: yAx + 4, class: 'ax' }, ax);
        el('text', { x: px + 2, y: yAx + 15, class: 'ax-t' }, ax, MON[m]);
      }
    }
  }

  // Marks. Items close in time on the same row are nudged vertically so each stays clickable.
  const rows = new Map();
  const place = (key, px, base, step, spread) => {
    const xs = rows.get(key) || [];
    let k = 0;
    while (xs.some(([ox, ok]) => ok === k && Math.abs(ox - px) < 9) && k < 6) k++;
    xs.push([px, k]); rows.set(key, xs);
    const off = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * step;
    return base + Math.max(-spread, Math.min(spread, off));
  };
  const marks = el('g', { class: 'marks' }, svg);
  const sorted = [...list].sort((a, b) => (when(a) < when(b) ? -1 : 1));
  for (const e of sorted) {
    const px = x(when(e));
    let py, shape;
    if (e.group === 'battle') { py = place('b', px, yB, 8, laneB / 2 - 6); shape = 'diamond'; }
    else if (e.group === 'west') { py = place('w', px, yW, 8, laneW / 2 - 6); shape = 'square'; }
    else { py = place('l' + e.level, px, y0 + band * (5 - e.level) + band / 2, 8, band / 2 - 5); shape = 'circle'; }
    const sel = e.id === S.sel;
    const r = sel ? 7.5 : 5.5;
    const a = { class: 'mk' + (sel ? ' sel' : '') + (e.group === 'battle' ? ' mk-b' : ''), style: `fill:${colorOf(e)}`, tabindex: 0, role: 'button',
      'aria-label': `${fdate(e)}: ${e.title}` };
    const m = shape === 'circle' ? el('circle', { cx: px, cy: py, r, ...a }, marks)
      : shape === 'square' ? el('rect', { x: px - r + 1, y: py - r + 1, width: 2 * r - 2, height: 2 * r - 2, ...a }, marks)
        : el('path', { d: `M${px} ${py - r}L${px + r} ${py}L${px} ${py + r}L${px - r} ${py}Z`, ...a }, marks);
    m.addEventListener('pointerenter', ev => tip(ev, `<b>${e.title}</b><small>${fdate(e)} · ${e.actor}</small>`));
    m.addEventListener('pointerleave', () => tip(null));
    m.addEventListener('click', () => onPick(e.id));
    m.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onPick(e.id); } });
  }
  // Selected item: a guide line through all lanes.
  const s = list.find(e => e.id === S.sel);
  if (s) el('line', { x1: x(when(s)), x2: x(when(s)), y1: T, y2: yAx, class: 'selline' }, svg, null);
  if (s) svg.insertBefore(svg.lastChild, marks);
}
