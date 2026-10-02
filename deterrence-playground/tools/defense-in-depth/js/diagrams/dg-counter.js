// L9 The counterattack window (Hunzeker pp. 61-62, 79, 82; Biddle pp. 47-48). A fresh lodgment is disorganized
// and often beyond its own guns; it recovers cohesion and consolidates after 2 h. The game's counterattack
// multiplier (SPEC §3.7): CA = 1 + (1 − cohesion) + 0.5·[beyond its artillery] − 0.5·[consolidated], 0.6–2.5.
// Strength needed to retake, per holder: k1 (1 − f_e) / CA. Drag the Riposte and Counterstroke markers.
import { GAME } from '../../data/lessons.js';
import { COUNTERATTACKS } from '../../data/hunzeker.js';
import { frame, s, txt, seg, slider, sized, axes, pathD, fmt } from './dg-common.js';

const HMAX = 8, DELAY = 2;   // hours; DELAY = order delay without riposte authority (NOTIONAL)
const ORIG_FE = 0.1;         // the original attack hit dispersed / strongpoint holders (f_e ≈ 0.1)

export function model(st, h, kind) {
  const ca = GAME.ca, coh = Math.min(1, st.coh0 + GAME.cohesion.consolidate * h), cons = h >= ca.consolidateH;
  let m = kind === 'stroke' ? 1 + ca.beyondArty * (st.beyond ? 1 : 0)
    : 1 + ca.cohW * (1 - coh) + ca.beyondArty * (st.beyond ? 1 : 0) + (cons ? ca.consolidated : 0);
  m = Math.max(ca.min, Math.min(ca.max, m));
  if (kind === 'riposte' && !st.auth) m *= ca.noAuthority;
  const fe = cons ? GAME.fe.consolidated : GAME.fe.unconsolidated;
  return { coh, cons, ca: m, need: GAME.k1 * (1 - fe) / m };
}

export function mount(el, lesson, opts = {}) {
  const st = { coh0: 0.55, beyond: true, auth: true, rip: 1, march: 2, scale: 'division' };
  const f = frame(el, lesson, opts);
  slider(f.controls, 'Lodgment cohesion on arrival', { min: 0.3, max: 1, step: 0.05, value: st.coh0, fmt: fmt.pct }, v => { st.coh0 = v; sz.redraw(); });
  seg(f.controls, 'Lodgment', [{ v: true, l: 'Beyond its guns' }, { v: false, l: 'Under its guns' }], st.beyond, v => { st.beyond = v; sz.redraw(); });
  seg(f.controls, 'Riposte authority', [{ v: true, l: 'Local leaders may strike' }, { v: false, l: 'Wait for orders' }], st.auth, v => { st.auth = v; sz.redraw(); });
  const ripS = slider(f.controls, 'Riposte ordered at', { min: 0, max: HMAX - DELAY, step: 0.5, value: st.rip, fmt: v => `H+${v}` }, v => { st.rip = v; sz.redraw(); });
  const marS = slider(f.controls, 'Counterstroke march', { min: 0, max: 6, step: 0.5, value: st.march, fmt: v => `${v} h (+${GAME.planningH.division} h planning)` }, v => { st.march = v; sz.redraw(); });

  let geo = null;
  function draw(W) {
    const narrow = W < 520, H = narrow ? 300 : 320, box = { x: 46, y: 18, w: W - (narrow ? 58 : 150), h: H - 70 };
    const svg = f.svg(W, H, 'Strength needed to retake a lodgment, by hours since it was captured, for a riposte and a counterstroke.');
    const { sx, sy } = axes(svg, box, { x: [0, HMAX], y: [0, 3], xTicks: [0, 1, 2, 3, 4, 5, 6, 7, 8], yTicks: [0, 1, 2, 3], xLabel: 'hours since the attacker took the ground', yLabel: 'strength needed', fmtX: v => 'H+' + v, fmtY: v => v + '×' });
    geo = { sx, box };
    // Window bands: green while CA ≥ 1.6 and h ≤ 3, amber while unconsolidated, grey once consolidated.
    for (let h = 0; h < HMAX; h += 0.25) {
      const m = model({ ...st, auth: true }, h, 'riposte');
      const col = m.cons ? 'var(--muted)' : m.ca >= GAME.ca.window && h <= 3 ? 'var(--good)' : 'var(--warn)';
      s('rect', { x: sx(h), y: box.y, width: sx(h + 0.25) - sx(h) + 0.2, height: 8, fill: col, opacity: 0.75 }, svg);
    }
    const orig = GAME.k1 * (1 - ORIG_FE);
    s('line', { x1: box.x, x2: box.x + box.w, y1: sy(orig), y2: sy(orig), stroke: 'var(--red)', 'stroke-dasharray': '6 4', 'stroke-width': 1.5 }, svg);
    txt(svg, box.x + box.w - 4, sy(orig) - 9, `the original attack needed ${orig.toFixed(2)}×`, { anchor: 'end', cls: 'dg-small dg-red' });
    const curve = kind => { const pts = []; for (let h = 0; h <= HMAX; h += 0.125) pts.push([sx(h), sy(Math.min(3, model(st, h, kind).need))]); return pts; };
    s('path', { d: pathD(curve('riposte')), stroke: 'var(--blue)', 'stroke-width': 3, fill: 'none' }, svg);
    s('path', { d: pathD(curve('stroke')), stroke: 'var(--c3, var(--good))', 'stroke-width': 2.5, 'stroke-dasharray': '7 4', fill: 'none' }, svg);
    // Markers.
    const rHit = Math.min(HMAX, st.rip + (st.auth ? 0 : DELAY)), cHit = Math.min(HMAX, GAME.planningH.division + st.march);
    const rm = model(st, rHit, 'riposte'), cm = model(st, cHit, 'stroke');
    const mark = (h, m, lab, col, dy) => {
      s('circle', { cx: sx(h), cy: sy(Math.min(3, m.need)), r: 7, fill: col, stroke: 'var(--panel)', 'stroke-width': 2, class: 'dg-live' }, svg);
      txt(svg, sx(h) + (h > HMAX * 0.7 ? -10 : 10), sy(Math.min(3, m.need)) + dy, `${lab} ${m.need.toFixed(2)}×`, { anchor: h > HMAX * 0.7 ? 'end' : 'start', weight: 700, cls: 'dg-small', fill: col });
    };
    const dy = Math.abs(rm.need - cm.need) < 0.3 ? 16 : 0;
    mark(rHit, rm, 'Riposte', 'var(--blue)', -dy - 12);
    mark(cHit, cm, 'Counterstroke', 'var(--c3, var(--good))', dy + 12);
    if (!narrow) {
      txt(svg, box.x + box.w + 8, box.y + 4, 'window', { cls: 'dg-small', weight: 700 });
      [['open', 'good'], ['closing', 'warn'], ['shut', 'mute']].forEach(([l, c], i) => txt(svg, box.x + box.w + 8, box.y + 22 + i * 16, '■ ' + l, { cls: 'dg-small dg-' + c }));
    }
    svg.addEventListener('pointerdown', e => {
      const b = svg.getBoundingClientRect(), h = Math.max(0, Math.min(HMAX, geo.sx.inv(e.clientX - b.left)));
      if (Math.abs(h - rHit) <= Math.abs(h - cHit)) { st.rip = Math.max(0, Math.min(HMAX - DELAY, Math.round((h - (st.auth ? 0 : DELAY)) * 2) / 2)); ripS.set(st.rip); }
      else { st.march = Math.max(0, Math.min(6, Math.round((h - GAME.planningH.division) * 2) / 2)); marS.set(st.march); }
      sz.redraw();
    });
    f.readout.innerHTML = `A riposte striking at <b>H+${rHit}</b> meets cohesion ${fmt.pct(rm.coh)} and a multiplier of ${rm.ca.toFixed(2)}: it needs <b>${rm.need.toFixed(2)}×</b> the holders’ strength` +
      (rm.cons ? ', because the lodgment has consolidated' : ', far less than the attack that took the ground') + '. ' +
      `The Counterstroke, at H+${cHit}, needs ${cm.need.toFixed(2)}×. ` +
      (st.auth ? `Leaders on the spot may launch the riposte ${COUNTERATTACKS.riposte.when} without asking (p. 82).` : `Waiting for orders costs ${DELAY} h and a quarter of the effect; real orders took 8 hours or more (p. 80).`) +
      ' Biddle: counterattacks retake ground for fewer losses than the original attack cost (pp. 47–48).';
  }

  const sz = sized(f.stage, draw);
  return { update() {}, destroy() { sz.destroy(); } };
}
