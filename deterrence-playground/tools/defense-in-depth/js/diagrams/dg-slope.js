// L4 (P2) Reverse slope (Hunzeker pp. 78-79; Biddle pp. 96-97). Cross-section: outposts on the forward slope,
// observers on the crest, the main line at least 200 m behind it, a second zone 1 km further, reserves 2-4 km back.
// Slide the enemy observer forward: the ground it can see is shaded. Vertical scale exaggerated.
import { SLOPE } from '../../data/hunzeker.js';
import { frame, s, txt, slider, seg, sized, pathD } from './dg-common.js';

const XMAX = 5200;   // metres
// Ground profile (height m) by distance (m): enemy flat, forward slope to a crest at 1500 m, reverse slope down.
export const ground = x => (x < 700 ? 0 : x < 1500 ? 40 * (x - 700) / 800 : x < 2300 ? 40 - 22 * (x - 1500) / 800 : 18 - Math.min(8, (x - 2300) / 300));
const POS = [
  { x: 1150, l: 'outposts', m: 'forward slope' },
  { x: 1500, l: 'observers', m: 'crest' },
  { x: 1500 + SLOPE.mlrBehindCrestM + 60, l: 'main line', m: '≥200 m behind the crest' },
  { x: 1760 + 1000, l: 'second zone', m: '≥1 km back' },
  { x: 4300, l: 'reserves', m: '2–4 km back' },
];

/** True if the observer at (ox, height oh above ground) can see ground point x. */
export function visible(ox, oh, x) {
  const y0 = ground(ox) + oh, y1 = ground(x) + 1.5;
  const a = Math.min(ox, x), b = Math.max(ox, x);
  for (let t = a + 20; t < b - 20; t += 20) { const yl = y0 + (y1 - y0) * (t - ox) / (x - ox); if (ground(t) > yl) return false; }
  return true;
}

export function mount(el, lesson, opts = {}) {
  const st = { ox: 300, oh: 2 };
  const f = frame(el, lesson, opts);
  slider(f.controls, 'Enemy observer at', { min: 0, max: 1400, step: 50, value: st.ox, fmt: v => v + ' m' }, v => { st.ox = v; sz.redraw(); });
  seg(f.controls, 'Observer', [{ v: 2, l: 'On the ground' }, { v: 120, l: 'Balloon / aircraft' }], st.oh, v => { st.oh = v; sz.redraw(); });

  function draw(W) {
    const H = 250, base = 180, vx = x => 10 + x / XMAX * (W - 20), vy = y => base - y * 2.6;
    const svg = f.svg(W, H, 'Cross-section of a slope position; shading shows what the enemy observer can see.');
    const pts = []; for (let x = 0; x <= XMAX; x += 25) pts.push([vx(x), vy(ground(x))]);
    s('path', { d: pathD(pts) + ` L${vx(XMAX)} ${H} L${vx(0)} ${H} Z`, class: 'dg-ground' }, svg);
    let seen = 0, tot = 0;
    for (let x = 0; x < XMAX; x += 50) {
      const v = visible(st.ox, st.oh, x); tot++; if (v) seen++;
      if (v) s('rect', { x: vx(x), y: vy(ground(x)) - 5, width: vx(50) - vx(0) + 0.5, height: 6, fill: 'var(--red)', 'fill-opacity': 0.45 }, svg);
    }
    const oy = vy(ground(st.ox) + st.oh);
    s('circle', { cx: vx(st.ox), cy: Math.max(10, oy), r: 6, fill: 'var(--red)' }, svg);
    txt(svg, vx(st.ox), Math.max(10, oy) - 12, 'enemy eyes', { anchor: st.ox < 400 ? 'start' : 'middle', cls: 'dg-small dg-red', weight: 600 });
    POS.forEach((p, i) => {
      const v = visible(st.ox, st.oh, p.x), x = vx(p.x), y = vy(ground(p.x));
      s('rect', { x: x - 6, y: y - 10, width: 12, height: 8, fill: 'var(--blue)', stroke: v ? 'var(--bad)' : 'var(--panel)', 'stroke-width': 2 }, svg);
      const ly = base + 16 + (i % 3) * 15;
      s('line', { x1: x, x2: x, y1: y, y2: ly - 6, stroke: 'var(--faint)', 'stroke-width': 1 }, svg);
      txt(svg, x, ly, p.l, { anchor: i === POS.length - 1 ? 'end' : 'middle', cls: 'dg-small' + (v ? ' dg-bad' : ''), weight: 600 });
    });
    const mlr = visible(st.ox, st.oh, POS[2].x);
    f.readout.innerHTML = `The enemy sees <b>${Math.round(100 * seen / tot)}%</b> of this ground. The main line is ${mlr ? '<b class="bad">visible</b>: from the air, the crest no longer hides it' : '<b class="good">hidden</b> behind the crest: their guns cannot register on it, and attackers crossing the crest are silhouetted at short range'}. ` +
      `Positions: ${POS.map(p => p.l + ' (' + p.m + ')').join(', ')}. ` + 'Outposts on the forward slope give warning; observers on the crest call the guns (Hunzeker pp. 78–79; Biddle pp. 96–97).';
  }
  const sz = sized(f.stage, draw);
  return { update() {}, destroy() { sz.destroy(); } };
}
