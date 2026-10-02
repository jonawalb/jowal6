// L7 Leapfrog (Hunzeker p. 56; 50-100-yd bounds p. 70; Biddle pp. 31, 37-38). Two elements: one overwatches and
// fires while the other bounds, then they swap each hour. Toggle overwatch and bound length; the meter uses the
// game's exposure values (SPEC §3.6) and the bars compare exposure per sector gained with a straight rush.
import { GAME } from '../../data/lessons.js';
import { LEAPFROG } from '../../data/hunzeker.js';
import { frame, s, txt, seg, player, sized, reducedMotion, fmt } from './dg-common.js';

const HOUR = 1.5;   // seconds of animation per game hour
const S_OW = GAME.owCap.rifle;   // overwatch suppression on the target at a favourable ratio (cap 0.6, §3.6)

/** Per-hour exposure and progress for a method (pair of elements). */
export function method(ow, short) {
  const k = short ? GAME.shortBound.x : 1, prog = (short ? GAME.shortBound.progress : 1) * 0.5;
  if (ow === 'rush') return { x: 2 * GAME.X.rush, supp: 0, prog: 1 };
  if (!ow) return { x: GAME.X.noPartner * k + GAME.X.hold, supp: 0, prog };
  return { x: GAME.X.bound * k + GAME.X.overwatch, supp: S_OW, prog };
}
const perSector = m => (m.x * (1 - m.supp)) / m.prog;

export function mount(el, lesson, opts = {}) {
  const reduced = reducedMotion(opts);
  const st = { ow: true, short: true, t: 0 };
  const f = frame(el, lesson, opts);
  seg(f.controls, 'Overwatch partner', [{ v: true, l: 'On' }, { v: false, l: 'Off' }], st.ow, v => { st.ow = v; st.t = 0; paint(); });
  seg(f.controls, 'Bounds', [{ v: true, l: 'Short (50–100 yd)' }, { v: false, l: 'Long' }], st.short, v => { st.short = v; st.t = 0; paint(); });
  const pl = player(f.controls, { reduced, tick: dt => { st.t += dt; if (st.t > HOUR * 12) st.t = 0; paint(); }, step: () => { st.t = (Math.floor(st.t / HOUR) + 1) * HOUR; paint(); } });

  let L = null, dyn = null;
  function draw(W) {
    const narrow = W < 560, fieldW = narrow ? W - 20 : Math.round(W * 0.5), H = narrow ? 560 : 330;
    const field = { x: 10, y: 10, w: fieldW, h: narrow ? 300 : 310 };
    const bars = narrow ? { x: 10, y: field.y + field.h + 30, w: W - 20, h: 200 } : { x: fieldW + 40, y: 30, w: W - fieldW - 56, h: 260 };
    L = { W, H, field, bars };
    const svg = f.svg(W, H, 'Two infantry elements advance toward an enemy trench, one firing while the other bounds; bars compare exposure per sector gained.');
    s('rect', { x: field.x, y: field.y, width: field.w, height: field.h, class: 'dg-ground' }, svg);
    s('path', { d: `M${field.x + 10} ${field.y + 26} h${field.w - 20}`, stroke: 'var(--blue)', 'stroke-width': 5, 'stroke-dasharray': '12 4', opacity: 0.6 }, svg);
    txt(svg, field.x + field.w - 12, field.y + 12, 'enemy trench', { anchor: 'end', cls: 'dg-small dg-blue' });
    dyn = s('g', {}, svg);
    drawBars(svg);
    paint();
  }

  function drawBars(svg) {
    const { bars } = L, g = s('g', {}, svg);
    const rows = [
      { l: 'Rush (both move)', m: method('rush') },
      { l: 'Leapfrog, no overwatch', m: method(false, st.short) },
      { l: 'Leapfrog, long bounds', m: method(true, false) },
      { l: 'Leapfrog, short bounds', m: method(true, true) },
    ];
    const max = Math.max(...rows.map(r => perSector(r.m)));
    txt(g, bars.x, bars.y - 12, 'Exposure per sector gained (pair)', { weight: 700, cls: 'dg-small' });
    const rh = bars.h / rows.length;
    rows.forEach((r, i) => {
      const y = bars.y + i * rh + 8, v = perSector(r.m), w = Math.max(2, (bars.w - 60) * v / max);
      const cur = (i === 1 && !st.ow) || (i === 2 && st.ow && !st.short) || (i === 3 && st.ow && st.short);
      txt(g, bars.x, y + 6, r.l, { cls: 'dg-small' + (cur ? '' : ' dg-mute'), weight: cur ? 700 : 500 });
      s('rect', { x: bars.x, y: y + 15, width: w, height: 14, rx: 2, fill: i === 0 ? 'var(--red)' : 'var(--accent)', 'fill-opacity': cur ? 0.95 : 0.45, stroke: cur ? 'var(--ink)' : null }, g);
      txt(g, bars.x + w + 5, y + 22, v.toFixed(2), { cls: 'dg-small', weight: 600 });
      txt(g, bars.x, y + 40, `${(1 / r.m.prog).toFixed(1)} h per sector`, { cls: 'dg-tick' });
    });
  }

  function paint() {
    if (!dyn) return;
    dyn.textContent = '';
    const { field } = L, hour = Math.floor(st.t / HOUR), frac = reduced ? 1 : Math.min(1, (st.t % HOUR) / (HOUR * 0.6));
    const m = method(st.ow, st.short), bound = (st.short ? GAME.shortBound.progress : 1);
    const unit = (field.h - 80) / 6, baseY = field.y + field.h - 22, xs = [field.x + field.w * 0.35, field.x + field.w * 0.62];
    // Progress of each element: element (hour % 2) bounds this hour.
    const prog = [0, 0];
    for (let k = 0; k < hour; k++) prog[k % 2] += bound;
    const mover = hour % 2;
    prog[mover] += bound * frac;
    const lead = Math.max(...prog);
    if (lead > 6) { st.t = 0; return paint(); }
    prog.forEach((p, i) => {
      const x = xs[i], y = baseY - p * unit, moving = i === mover;
      if (!moving && st.ow) {
        for (const dx of [-30, 0, 30]) s('line', { x1: x, y1: y - 8, x2: xs[mover] + dx, y2: field.y + 26, stroke: 'var(--accent)', 'stroke-width': 1.3, opacity: 0.8, class: 'dg-live' }, dyn);
      }
      if (moving) s('line', { x1: x, y1: y + 18, x2: x, y2: y + 6 + bound * unit * frac, stroke: 'var(--red)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, dyn);
      for (let k = 0; k < 4; k++) s('circle', { cx: x - 9 + (k % 2) * 18, cy: y + (k > 1 ? 7 : -3), r: 4, fill: 'var(--red)', opacity: moving ? 1 : 0.75 }, dyn);
      txt(dyn, x + 18, y - 8, i ? '②' : '①', { size: 15, weight: 700, cls: 'dg-red' });
      txt(dyn, x + 18, y + 10, moving ? 'bounds' : st.ow ? 'fires' : 'waits', { cls: 'dg-small', weight: 600 });
    });
    if (st.ow) txt(dyn, field.x + field.w / 2, field.y + 44, `defenders’ fire cut ${fmt.pct(S_OW)}`, { anchor: 'middle', cls: 'dg-small dg-acc', weight: 700 });
    txt(dyn, field.x + 8, field.y + field.h - 8, `Hour ${hour + 1}`, { cls: 'dg-small', weight: 700 });
    const xb = (st.ow ? GAME.X.bound : GAME.X.noPartner) * (st.short ? GAME.shortBound.x : 1);
    f.readout.innerHTML = `This hour ${mover ? '②' : '①'} bounds at exposure <b>X = ${xb.toFixed(2)}</b>` +
      (st.ow ? ` while ${mover ? '①' : '②'} overwatches at X = ${GAME.X.overwatch} and suppresses the trench.` : ' with no one firing for it: no suppression.') +
      ` Per sector gained the pair takes <b>${perSector(m).toFixed(2)}</b> exposure, against <b>${perSector(method('rush')).toFixed(2)}</b> for a rush, but needs ${(1 / m.prog).toFixed(1)} h instead of 1: slower attacks give the defender time.` +
      ` “${LEAPFROG.quote}” (Hunzeker p. ${LEAPFROG.quotePage}).`;
  }

  const sz = sized(f.stage, w => draw(w));
  const redrawAll = () => sz.redraw();
  f.controls.addEventListener('click', e => { if (e.target.closest('.dg-seg')) redrawAll(); });
  return { update() {}, destroy() { pl.stop(); sz.destroy(); } };
}
