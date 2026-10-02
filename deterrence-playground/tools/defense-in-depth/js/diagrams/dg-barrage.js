// L5 The barrage and the infantry. Tab 1 (minutes, the history): a creeping barrage walks forward at a set rate
// while the infantry follow ~100 yd behind (Hunzeker p. 110). Too fast a barrage leaves a gap and the defenders
// man the parapet; too slow and the infantry walk into it (p. 52; Biddle p. 31). Tab 2 (game hours): the game's
// timetable rule (SPEC §3.8) with on-time / early / gap / late cells, optionally overlaying the player's battle.
import { BARRAGE } from '../../data/hunzeker.js';
import { GAME } from '../../data/lessons.js';
import { frame, s, h, txt, seg, slider, player, sized, reducedMotion, axes, pathD, fmt } from './dg-common.js';

const TRENCH = 600, START = -100, CLOSE = 50, FAR = 200;   // yards; the start gap is the 100 yd of p. 110

export function mount(el, lesson, opts = {}) {
  const reduced = reducedMotion(opts);
  const st = { tab: 'min', rate: BARRAGE.rates[1].ydMin, pace: 20, t: 0, rho: 1, v: 0.5, r0: 1, model: opts.model };
  const f = frame(el, lesson, opts);
  seg(f.controls, 'View', [{ v: 'min', l: 'Minutes (history)' }, { v: 'hour', l: 'Game hours' }], st.tab, v => { st.tab = v; build(); });
  const ctl = h('div', { class: 'dg-ctl' }, f.controls);
  let pl = null;
  const tEnd = () => Math.max((TRENCH - START) / st.pace, TRENCH / st.rate) + 4;

  function build() {
    pl?.stop(); ctl.textContent = '';
    if (st.tab === 'min') {
      seg(ctl, 'Barrage rate', BARRAGE.rates.map(r => ({ v: r.ydMin, l: r.label })), st.rate, v => { st.rate = v; st.t = 0; sz.redraw(); });
      slider(ctl, 'Infantry pace', { min: 10, max: 80, step: 1, value: st.pace, fmt: v => `${v} yd/min` }, v => { st.pace = v; st.t = 0; sz.redraw(); });
      if (reduced) slider(ctl, 'Minute', { min: 0, max: 60, step: 0.5, value: st.t, fmt: v => `${v} min` }, v => { st.t = Math.min(v, tEnd()); paint(); });
      else pl = player(ctl, { reduced, tick: dt => { st.t += dt * 3; if (st.t > tEnd()) st.t = 0; paint(); }, step: () => { st.t = Math.min(tEnd(), st.t + 2); paint(); } });
    } else {
      slider(ctl, 'Barrage lift rate', { min: 0.5, max: 2, step: 0.5, value: st.rho, fmt: v => `${v} rows/h` }, v => { st.rho = v; sz.redraw(); });
      slider(ctl, 'Infantry pace', { min: 0.25, max: 2, step: 0.25, value: st.v, fmt: v => `${v} rows/h` }, v => { st.v = v; sz.redraw(); });
    }
    sz.redraw();
  }

  let L = null, dyn = null;
  function draw(W) { return st.tab === 'min' ? drawMin(W) : drawHour(W); }

  // ---- Minutes tab --------------------------------------------------------------------------------------------
  function drawMin(W) {
    const narrow = W < 520, stripH = 70, cH = narrow ? 210 : 240, H = stripH + cH + 60;
    const svg = f.svg(W, H, 'A strip shows the barrage, the infantry and the enemy trench; below, a time-distance chart of both.');
    const box = { x: 46, y: stripH + 14, w: W - 60, h: cH };
    const T = tEnd(), sx = v => 14 + (v - START) / (TRENCH + 200 - START) * (W - 28);
    L = { W, H, stripH, box, T, sx };
    // Strip: ground, enemy trench.
    s('rect', { x: 0, y: 0, width: W, height: stripH, class: 'dg-ground' }, svg);
    s('line', { x1: sx(TRENCH), x2: sx(TRENCH), y1: 8, y2: stripH - 8, stroke: 'var(--blue)', 'stroke-width': 4, 'stroke-dasharray': '6 2' }, svg);
    txt(svg, sx(TRENCH) + 6, 12, 'enemy trench', { cls: 'dg-small dg-blue' });
    txt(svg, sx(0), stripH - 8, 'start line', { anchor: 'middle', cls: 'dg-tick' });
    // Time-distance chart.
    const g = s('g', {}, svg);
    const { sx: X, sy: Y } = axes(g, box, { x: [0, T], y: [START, TRENCH + 200], xTicks: ticks(T), yTicks: [0, 200, 400, 600], xLabel: 'minutes after zero hour', yLabel: 'yards', fmtY: v => String(v) });
    L.X = X; L.Y = Y;
    s('line', { x1: box.x, x2: box.x + box.w, y1: Y(TRENCH), y2: Y(TRENCH), stroke: 'var(--blue)', 'stroke-width': 2, 'stroke-dasharray': '6 3' }, g);
    // Gap band coloured by state, sampled each half minute.
    for (let t = 0; t < T; t += 0.5) {
      const b = Math.min(st.rate * t, TRENCH + 200), i = START + st.pace * t, gap = b - i, past = st.rate * t > TRENCH && i < TRENCH;
      const col = gap < CLOSE ? 'var(--warn)' : (gap > FAR || past) ? 'var(--bad)' : 'var(--good)';
      s('rect', { x: X(t), y: Y(Math.max(b, i)), width: X(t + 0.5) - X(t) + 0.3, height: Math.abs(Y(i) - Y(b)), fill: col, 'fill-opacity': 0.22 }, g);
    }
    const bl = [], il = [];
    for (let t = 0; t <= T; t += 0.25) { bl.push([X(t), Y(Math.min(st.rate * t, TRENCH + 200))]); il.push([X(t), Y(Math.min(START + st.pace * t, TRENCH + 200))]); }
    s('path', { d: pathD(bl), stroke: 'var(--accent)', 'stroke-width': 3, fill: 'none' }, g);
    s('path', { d: pathD(il), stroke: 'var(--red)', 'stroke-width': 3, fill: 'none' }, g);
    const lb = Math.min(T * 0.92, (TRENCH + 150) / st.rate), li = Math.min(T * 0.92, (TRENCH + 150 - START) / st.pace);
    txt(g, X(lb) - 4, Y(Math.min(st.rate * lb, TRENCH + 200)) - 10, 'barrage', { anchor: 'end', cls: 'dg-acc', weight: 700 });
    txt(g, X(li) + 4, Y(Math.min(START + st.pace * li, TRENCH + 200)) + 14, 'infantry', { anchor: X(li) > W - 80 ? 'end' : 'start', cls: 'dg-red', weight: 700 });
    dyn = s('g', {}, svg);
    paint();
  }
  const ticks = T => { const step = T > 40 ? 10 : 5, out = []; for (let t = 0; t <= T; t += step) out.push(t); return out; };

  function paint() {
    if (st.tab !== 'min' || !dyn) return;
    dyn.textContent = '';
    const { sx, stripH, X, box, T } = L, t = Math.min(st.t, T);
    const b = Math.min(st.rate * t, TRENCH + 200), i = START + st.pace * t;
    s('line', { x1: X(t), x2: X(t), y1: box.y, y2: box.y + box.h, stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, dyn);
    for (let k = 0; k < 7; k++) {   // shell bursts along the barrage line
      const y = 14 + k * (stripH - 28) / 6, r = 5 + ((k * 7 + Math.floor(t * 4)) % 4);
      s('circle', { cx: sx(b) + ((k * 13) % 9) - 4, cy: y, r, fill: 'var(--accent)', 'fill-opacity': 0.55, class: 'dg-live' }, dyn);
    }
    for (let k = 0; k < 5; k++) s('circle', { cx: sx(Math.min(i, TRENCH)) - (k % 2) * 6, cy: 16 + k * (stripH - 32) / 4, r: 4, fill: 'var(--red)' }, dyn);
    const lifted = st.rate * t > TRENCH, arrived = i >= TRENCH;
    if (lifted && !arrived) {
      for (let k = 0; k < 3; k++) txt(dyn, sx(TRENCH) + 12, 26 + k * 14, '▲', { cls: 'dg-blue', size: 12 });
      txt(dyn, sx(TRENCH) + 26, stripH - 10, 'defenders man the parapet', { cls: 'dg-small dg-bad', weight: 700 });
    }
    const gap = b - i;
    txt(dyn, 14, 12, `${t.toFixed(1)} min · gap ${Math.round(gap)} yd`, { cls: 'dg-small', weight: 600 });
    readMin();
  }

  function readMin() {
    const tb = TRENCH / st.rate, ti = (TRENCH - START) / st.pace, wait = ti - tb, ideal = (TRENCH - START) / st.rate;
    let msg;
    if (st.pace > st.rate * 1.15 && (TRENCH - START) / st.pace < ideal - 100 / st.rate * 0.5) msg = `<b class="warn">Too slow a barrage for this pace:</b> the infantry close to under ${CLOSE} yd of their own shells and take losses (late lift).`;
    else if (wait > 100 / st.rate + 2) msg = `<b class="bad">Gap:</b> the barrage leaves the enemy trench at ${tb.toFixed(1)} min but the infantry arrive at ${ti.toFixed(1)} min. The defenders have <b>${(wait).toFixed(1)} minutes</b> to climb out and man the parapet.`;
    else msg = `<b class="good">On time:</b> the infantry reach the trench ${Math.max(0, wait).toFixed(1)} min after the barrage lifts off it, before the defenders can recover.`;
    f.readout.innerHTML = msg + ` The ideal is to stay about ${BARRAGE.aheadYd} yd behind the bursts (p. ${BARRAGE.page}). Real rates: ${BARRAGE.rates.map(r => r.label).join('; ')}.`;
  }

  // ---- Game-hours tab -----------------------------------------------------------------------------------------
  function drawHour(W) {
    const tt = st.model?.timetable;
    const rows = tt?.rows ?? 8, hours = tt?.hours ?? 8, r0 = tt?.r0 ?? st.r0, rho = tt?.rho ?? st.rho;
    const cw = Math.min(54, Math.floor((W - 70) / hours)), ch = 26, gx = 56, gy = 22, H = gy + rows * ch + 46;
    const svg = f.svg(W, H, 'Rows ahead of the start line by hour: barrage cells and the infantry arrival marker in each row, coloured by the coordination check.');
    const barr = (h0, r) => { const lo = r0 + Math.floor(rho * (h0 - 1)) + (h0 ? 1 : 0), hi = r0 + Math.floor(rho * h0); return h0 === 0 ? r === r0 : r >= Math.min(lo, hi) && r <= hi; };
    const hb = r => { let last = null; for (let k = 0; k < hours + 6; k++) if (barr(k, r)) last = k; return last; };
    for (let hh = 0; hh < hours; hh++) txt(svg, gx + hh * cw + cw / 2, gy - 10, `H+${hh}`, { anchor: 'middle', cls: 'dg-tick' });
    for (let r = 0; r < rows; r++) {
      const y = gy + (rows - 1 - r) * ch;
      txt(svg, gx - 6, y + ch / 2, `row ${r}`, { anchor: 'end', cls: 'dg-tick' });
      for (let hh = 0; hh < hours; hh++) s('rect', { x: gx + hh * cw, y, width: cw, height: ch, class: 'dg-cell', fill: barr(hh, r) ? 'var(--accent)' : 'transparent', 'fill-opacity': 0.5 }, svg);
    }
    const arrivals = tt?.arrivals ?? Array.from({ length: rows }, (_, r) => ({ row: r, hour: Math.ceil(r / st.v) })).filter(a => a.row >= 1 && a.hour < hours);
    const counts = { on: 0, early: 0, gap: 0, late: 0 };
    for (const a of arrivals) {
      const b = hb(a.row);
      const k = b == null ? 'gap' : a.hour === b ? 'on' : a.hour === b + 1 ? 'early' : a.hour >= b + 2 ? 'gap' : 'late';
      counts[k]++;
      const col = { on: 'var(--good)', early: 'var(--warn)', gap: 'var(--bad)', late: 'var(--c6, var(--warn))' }[k];
      const cx = gx + a.hour * cw + cw / 2, cy = gy + (rows - 1 - a.row) * ch + ch / 2;
      s('circle', { cx, cy, r: 8, fill: col, stroke: 'var(--panel)', 'stroke-width': 1.5 }, svg);
      txt(svg, cx, cy + 1, { on: '✓', early: '1', gap: '!', late: '×' }[k], { anchor: 'middle', size: 10, weight: 700, fill: 'var(--panel)', on: true });
    }
    txt(svg, gx, H - 26, '■ barrage   ✓ on time   1 lifted 1 h early   ! gap   × late (own fire)', { cls: 'dg-small dg-mute' });
    f.readout.innerHTML = `${tt ? 'Your last battle: ' : ''}<b>${counts.on}</b> on time, <b>${counts.early}</b> one hour early (defenders keep ${fmt.pct(1 - GAME.residual.early1)} of their fire), <b>${counts.gap}</b> gaps (no suppression), <b>${counts.late}</b> late (the infantry take about ${fmt.pct(GAME.lateLoss)} friendly-fire losses). ` +
      'In the game the barrage steps a row per hour at its lift rate; changing it after zero hour needs a runner (1917–18) or the radio.';
  }

  const sz = sized(f.stage, draw);
  build();
  return { update(model) { st.model = model; if (st.tab === 'hour') sz.redraw(); }, destroy() { pl?.stop(); sz.destroy(); } };
}
