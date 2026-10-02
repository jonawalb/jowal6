// L10 The race (Biddle Fig. A.1, p. 211; equations A.14-A.19, p. 214). The invader pushes into the prepared zone
// at V_a while the defender's reserves converge on the breach, thinned on the road by P_s (A.5). The attack halts
// when its strength r_t falls to H × b_t. Breakthrough iff the penetration G passes the depth d first.
// The attacker picks its best speed (p. 216). Sliders: depth, reserve fraction, reserve speed, era.
import { bestResponse, racePoint } from '../biddle.js';
import { frame, s, txt, seg, slider, player, sized, reducedMotion, arrowDefs, uid, fmt } from './dg-common.js';

export function mount(el, lesson, opts = {}) {
  const reduced = reducedMotion(opts);
  const st = { d: 10, fr: 0.45, Vr: 100, era: 1910, u: reduced ? 1 : 0 };
  const f = frame(el, lesson, opts);
  const re = () => { o = solve(); st.u = reduced ? 1 : 0; sz.redraw(); };
  slider(f.controls, 'Depth of prepared defenses d', { min: 2, max: 50, step: 1, value: st.d, fmt: v => v + ' km' }, v => { st.d = v; re(); });
  slider(f.controls, 'Reserve fraction f_r', { min: 0.05, max: 0.95, step: 0.05, value: st.fr, fmt: v => v.toFixed(2) }, v => { st.fr = v; re(); });
  slider(f.controls, 'Reserve speed V_r', { min: 5, max: 100, step: 5, value: st.Vr, fmt: v => v + ' km/day' }, v => { st.Vr = v; re(); });
  seg(f.controls, 'Weapons of', [{ v: 1910, l: 'ca. 1910' }, { v: 1930, l: 'ca. 1930' }, { v: 2000, l: 'ca. 2000' }], st.era, v => { st.era = v; re(); });
  if (reduced) slider(f.controls, 'Time', { min: 0, max: 1, step: 0.05, value: 1, fmt: v => fmt.pct(v) + ' of t*' }, v => { st.u = v; paint(); });
  const pl = player(f.controls, { reduced, tick: dt => { st.u += dt / 4; if (st.u > 1.35) st.u = 0; paint(); }, step: () => { st.u = Math.min(1, st.u + 0.1); paint(); } });

  const solve = () => bestResponse({ d: st.d, fr: st.fr, Vr: st.Vr, tR: st.era, tB: st.era });
  let o = solve(), L = null, dyn = null;

  function draw(W) {
    const narrow = W < 560, H = narrow ? 330 : 300;
    const xb = W * (narrow ? 0.62 : 0.6), kmPx = (xb - 40) / 55, mapH = H - 70;
    L = { W, H, xb, kmPx, mapH, mid: 18 + mapH / 2 };
    const svg = f.svg(W, H, 'Theater geometry: the invader drives into the defender’s prepared zone while reserves converge on the breach.');
    L.ra = arrowDefs(svg, uid(lesson, 'r'), 'red'); L.ba = arrowDefs(svg, uid(lesson, 'b'), 'blue');
    const top = 18, bot = 18 + mapH;
    s('rect', { x: xb - st.d * kmPx, y: top, width: st.d * kmPx, height: mapH, fill: 'var(--blue)', 'fill-opacity': 0.12 }, svg);
    s('path', { d: `M${xb} ${top} C${xb - 8} ${top + mapH * 0.35} ${xb + 8} ${top + mapH * 0.65} ${xb} ${bot}`, stroke: 'var(--ink)', 'stroke-width': 3, fill: 'none' }, svg);
    s('line', { x1: xb - st.d * kmPx, x2: xb - st.d * kmPx, y1: top, y2: bot, stroke: 'var(--blue)', 'stroke-width': 1.5, 'stroke-dasharray': '5 3' }, svg);
    txt(svg, xb - st.d * kmPx / 2, top + 10, `d = ${st.d} km`, { anchor: 'middle', cls: 'dg-small dg-blue', weight: 700 });
    txt(svg, 10, top + 10, 'DEFENDER', { cls: 'dg-small dg-blue', weight: 700 });
    txt(svg, W - 10, top + 10, 'INVADER', { anchor: 'end', cls: 'dg-small dg-red', weight: 700 });
    // Assault frontage and the converging invader units.
    s('line', { x1: xb + 10, x2: xb + 10, y1: L.mid - 22, y2: L.mid + 22, stroke: 'var(--red)', 'stroke-width': 2, 'stroke-dasharray': '3 2' }, svg);
    txt(svg, xb + 14, L.mid + 34, 'w_a', { cls: 'dg-small dg-red' });
    [[-0.3, 0], [0, 1], [0.3, 2]].forEach(([dy, i]) => {
      const x = W - 40 - (i % 2) * 14, y = L.mid + dy * mapH;
      s('rect', { x: x - 14, y: y - 9, width: 28, height: 18, fill: 'var(--red)', 'fill-opacity': 0.8 }, svg);
      s('path', { d: `M${x - 16} ${y} Q${(x + xb) / 2} ${y} ${xb + 16} ${L.mid + dy * 30}`, stroke: 'var(--red)', 'stroke-width': 1.8, fill: 'none', 'marker-end': L.ra }, svg);
    });
    txt(svg, W - 10, bot - 6, 'not to scale: theater front ≈ 500 km', { anchor: 'end', cls: 'dg-tick' });
    dyn = s('g', {}, svg);
    paint();
  }

  function paint() {
    if (!dyn) return;
    dyn.textContent = '';
    const { xb, kmPx, mid, mapH, H, W } = L, u = Math.min(1, st.u), tStar = Math.max(0, o.t), t = u * tStar;
    const Gt = Math.max(0, o.Va * t), gx = xb - Math.min(Gt, 55) * kmPx;
    s('path', { d: `M${xb} ${mid - 16} L${gx} ${mid} L${xb} ${mid + 16} Z`, fill: 'var(--red)', 'fill-opacity': 0.35, stroke: 'var(--red)' }, dyn);
    s('line', { x1: xb, y1: mid, x2: gx - 2, y2: mid, stroke: 'var(--red)', 'stroke-width': 3, 'marker-end': L.ra, class: 'dg-live' }, dyn);
    txt(dyn, Math.max(gx, 30), mid - 24, `G ${Gt.toFixed(1)} km`, { anchor: 'start', cls: 'dg-red', weight: 700 });
    // Reserves: four groups spread along the theater, arriving over [0, w_th / V_r] (A.14-A.15).
    const tA = o.tArrive;
    [-0.42, -0.2, 0.2, 0.42].forEach((dy, i) => {
      const y0 = mid + dy * mapH, x0 = 26, frac = Math.min(1, t / (tA * (0.35 + 0.18 * i)));
      const x = x0 + (gx - 10 - x0) * frac, y = y0 + (mid - y0) * frac * frac;
      s('path', { d: `M${x0} ${y0} Q${gx - 30} ${y0} ${gx - 10} ${mid + dy * 20}`, stroke: 'var(--blue)', 'stroke-width': 1.2, 'stroke-dasharray': '4 3', fill: 'none', opacity: 0.6 }, dyn);
      s('ellipse', { cx: x, cy: y, rx: 13, ry: 8, fill: 'var(--blue)', 'fill-opacity': (0.25 + 0.7 * (frac < 1 ? 1 : o.Ps)).toFixed(2) }, dyn);
    });
    // Strength race bars: r_t against H × b_t.
    const rp = racePoint(o, t), max = Math.max(o.r0, racePoint(o, tStar).hb, 1);
    const bw = W - 180, by = H - 40;
    txt(dyn, 10, by, 'invader at the point', { cls: 'dg-small dg-red' });
    s('rect', { x: 150, y: by - 6, width: Math.max(1, bw * rp.rt / max), height: 10, fill: 'var(--red)' }, dyn);
    txt(dyn, 10, by + 18, 'H × defenders', { cls: 'dg-small dg-blue' });
    s('rect', { x: 150, y: by + 12, width: Math.max(1, bw * rp.hb / max), height: 10, fill: 'var(--blue)' }, dyn);
    if (st.u >= 1) txt(dyn, W / 2 - 40, 30, o.brk ? 'BREAKTHROUGH' : 'HALTED', { anchor: 'middle', cls: o.brk ? 'dg-bad dg-big' : 'dg-good dg-big' });
    const days = t.toFixed(t < 10 ? 2 : 0);
    f.readout.innerHTML = `Day ${days} of ${tStar.toFixed(tStar < 10 ? 2 : 0)}. The invader chooses <b>${o.Va.toFixed(2)} km/day</b>; reserves surviving the move: <b>${fmt.pct(o.Ps)}</b>. ` +
      `Halt at t* = ${tStar.toFixed(2)} days with G = <b>${o.G.toFixed(1)} km</b> against d = ${st.d} km: ` +
      (o.brk ? '<b class="bad">breakthrough</b>.' : '<b class="good">contained</b>.') +
      (o.capped ? ' Every reserve had already arrived, so the invader creeps forward as slowly as it can (A.24).' : '') +
      ' Computed with Biddle’s baseline constants (Table A.1, p. 218).';
  }

  const sz = sized(f.stage, draw);
  return { update() {}, destroy() { pl.stop(); sz.destroy(); } };
}
