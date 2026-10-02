// L16 (P2) The attacker's dilemmas (Hunzeker pp. 53-54; Biddle pp. 42-44, 120). Depth: an objective beyond the
// guns' reach meets the counterattack without support. Breadth: a narrow front makes a salient whose flanks the
// defender sweeps from three sides. Two small multiples with sliders. All distances NOTIONAL.
import { DILEMMA } from '../../data/hunzeker.js';
import { frame, s, txt, slider, sized, arrowDefs, uid } from './dg-common.js';

const RANGE_KM = 4;   // friendly field-gun reach beyond the start line (NOTIONAL)

export function mount(el, lesson, opts = {}) {
  const st = { depth: 3, width: 1.5 };
  const f = frame(el, lesson, opts);
  slider(f.controls, 'Objective depth', { min: 1, max: 8, step: 0.5, value: st.depth, fmt: v => v + ' km' }, v => { st.depth = v; sz.redraw(); });
  slider(f.controls, 'Attack frontage', { min: 0.5, max: 4, step: 0.5, value: st.width, fmt: v => v + ' km' }, v => { st.width = v; sz.redraw(); });

  function draw(W) {
    const narrow = W < 600, pw = narrow ? W - 20 : (W - 30) / 2, ph = 230, H = narrow ? ph * 2 + 20 : ph;
    const svg = f.svg(W, H, 'Two panels: objective depth against the reach of your guns, and frontage against flank exposure.');
    const ra = arrowDefs(svg, uid(lesson, 'r'), 'red'), ba = arrowDefs(svg, uid(lesson, 'b'), 'blue');
    // Depth panel (attack goes up).
    const p1 = { x: 10, y: 0 }, k1 = (ph - 50) / 8.5, base = p1.y + ph - 20, Y = km => base - km * k1;
    s('rect', { x: p1.x, y: p1.y + 18, width: pw, height: ph - 38, class: 'dg-ground' }, svg);
    txt(svg, p1.x, p1.y + 9, 'Depth: bite and hold, or go deep?', { weight: 700, cls: 'dg-small' });
    s('rect', { x: p1.x, y: Y(RANGE_KM), width: pw, height: RANGE_KM * k1, fill: 'var(--good)', 'fill-opacity': 0.12 }, svg);
    s('path', { d: `M${p1.x} ${Y(RANGE_KM)} h${pw}`, stroke: 'var(--good)', 'stroke-width': 2, 'stroke-dasharray': '6 3' }, svg);
    txt(svg, p1.x + pw - 6, Y(RANGE_KM) + 11, 'reach of your guns', { anchor: 'end', cls: 'dg-small dg-good', weight: 600 });
    const cx = p1.x + pw / 2, beyond = st.depth > RANGE_KM;
    s('line', { x1: cx, y1: base, x2: cx, y2: Y(st.depth), stroke: 'var(--red)', 'stroke-width': 4, 'marker-end': ra }, svg);
    if (beyond) {
      s('rect', { x: cx - 30, y: Y(st.depth), width: 60, height: (st.depth - RANGE_KM) * k1, fill: 'var(--bad)', 'fill-opacity': 0.25 }, svg);
      for (const sg of [-1, 1]) s('line', { x1: cx + sg * pw * 0.42, y1: Y(st.depth) - 6, x2: cx + sg * 34, y2: Y(st.depth) + 6, stroke: 'var(--blue)', 'stroke-width': 2.5, 'marker-end': ba }, svg);
      txt(svg, cx, Y(st.depth) - 12, 'counterattack, no fire support', { anchor: 'middle', cls: 'dg-small dg-bad', weight: 700 });
    } else txt(svg, cx + 8, Y(st.depth) + 2, 'hold under your guns', { cls: 'dg-small dg-good', weight: 700 });
    txt(svg, p1.x + 6, base + 10, 'start line', { cls: 'dg-tick' });
    // Breadth panel (plan of the salient).
    const p2 = narrow ? { x: 10, y: ph + 20 } : { x: 20 + pw, y: 0 }, pen = 2, kk = (pw - 30) / 5, by = p2.y + ph - 30;
    s('rect', { x: p2.x, y: p2.y + 18, width: pw, height: ph - 38, class: 'dg-ground' }, svg);
    txt(svg, p2.x, p2.y + 9, 'Breadth: narrow salient or broad front?', { weight: 700, cls: 'dg-small' });
    const mx = p2.x + pw / 2, hw = st.width * kk / 2, top = by - pen * kk * 0.9;
    s('path', { d: `M${mx - hw} ${by} V${top} H${mx + hw} V${by} Z`, fill: 'var(--red)', 'fill-opacity': 0.3, stroke: 'var(--red)', 'stroke-width': 1.5 }, svg);
    const ratio = (2 * pen) / st.width;
    for (const sg of [-1, 1]) for (let i = 0; i < 3; i++) {
      const yy = top + (by - top) * (0.2 + 0.3 * i);
      s('line', { x1: mx + sg * (hw + 40), y1: yy, x2: mx + sg * (hw + 4), y2: yy, stroke: 'var(--blue)', 'stroke-width': 2, 'marker-end': ba }, svg);
    }
    s('line', { x1: mx, y1: top - 34, x2: mx, y2: top - 4, stroke: 'var(--blue)', 'stroke-width': 2, 'marker-end': ba }, svg);
    txt(svg, mx, by + 12, `${st.width} km front, ${pen} km deep`, { anchor: 'middle', cls: 'dg-small', weight: 600 });
    f.readout.innerHTML = `${DILEMMA.depth} ${beyond ? `<b class="bad">${(st.depth - RANGE_KM).toFixed(1)} km of the advance lies beyond your guns.</b>` : '<b class="good">The objective stays under your guns.</b>'} ` +
      `${DILEMMA.breadth} Here each kilometre of front carries <b>${ratio.toFixed(1)} km</b> of exposed flank, swept by enfilading fire (Hunzeker pp. ${DILEMMA.pages}; Biddle p. 120).`;
  }
  const sz = sized(f.stage, draw);
  return { update() {}, destroy() { sz.destroy(); } };
}
