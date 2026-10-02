// L11-L14: Biddle's model charts, computed live from js/biddle.js with his baseline constants (Table A.1, p. 218).
// L11 Fig. A.2/A.3 (pp. 220-221): depth × reserve fraction breakthrough map, f_e 0 / 0.33, keyboard probe.
// L12 Fig. A.8/A.14 (pp. 226, 234): gain against assault speed, by era. L13 Fig. A.13 (p. 233): gain against
// reserve speed, by era. L14 Table 4.1 (p. 74) with Table A.3 gains (p. 235). The attacker always picks its best
// speed (p. 216); in L12/L13 the defender uses the era's minimax reserve speed where the figure holds it fixed.
import { run, bestResponse, containBoundary, curve, minimaxVr, range } from '../biddle.js';
import { frame, s, txt, seg, slider, sized, axes, pathD, decollide, fmt } from './dg-common.js';

const ERA_LBL = { 1910: 'ca. 1910', 1930: 'ca. 1930', 2000: 'ca. 2000' };
const ERA_COL = { 1910: 'var(--c1, var(--blue))', 1930: 'var(--c5, var(--warn))', 2000: 'var(--c2, var(--red))' };
const cache = new Map();
const memo = (k, fn) => { if (!cache.has(k)) cache.set(k, fn()); return cache.get(k); };
const era = e => ({ tR: e, tB: e });

export function mount(el, lesson, opts = {}) {
  return ({ L11: breakMap, L12: speedHump, L13: reserveU, L14: matrix })[lesson.id](el, lesson, opts);
}

/** Probe readout helper. */
const verdict = o => (o.brk ? '<b class="bad">breakthrough</b>' : '<b class="good">contained</b>');

// ---- L11 -------------------------------------------------------------------------------------------------------
function breakMap(el, lesson, opts) {
  const st = { fe: 0, fr: 0.45, d: 15, model: opts.model };
  const f = frame(el, lesson, opts);
  seg(f.controls, 'Forward garrison exposed (f_e)', [{ v: 0, l: '0 (Fig. A.2)' }, { v: 0.33, l: '0.33 (Fig. A.3)' }], st.fe, v => { st.fe = v; sz.redraw(); });
  const frS = slider(f.controls, 'Probe: reserve fraction', { min: 0, max: 0.99, step: 0.01, value: st.fr, fmt: v => v.toFixed(2) }, v => { st.fr = v; sz.redraw(); });
  const dS = slider(f.controls, 'Probe: depth', { min: 1, max: 50, step: 1, value: st.d, fmt: v => v + ' km' }, v => { st.d = v; sz.redraw(); });
  const frs = range(0, 0.99, 0.01);
  function draw(W) {
    const H = W < 520 ? 300 : 330, box = { x: 46, y: 12, w: W - 60, h: H - 56 };
    const svg = f.svg(W, H, 'Breakthrough region by reserve fraction and depth of prepared defenses.');
    const { sx, sy } = axes(svg, box, { x: [0, 0.99], y: [0, 50], xTicks: [0, 0.2, 0.4, 0.6, 0.8, 0.99], yTicks: [0, 10, 20, 30, 40, 50], xLabel: 'fraction of defender forces in reserve', yLabel: 'depth (km)', fmtX: v => v.toFixed(2).replace(/^0/, '') });
    const poly = fe => { const b = memo('b' + fe, () => containBoundary({ fe }, frs)); return pathD([[sx(0), sy(0)], ...b.map(p => [sx(p.fr), sy(p.d)]), [sx(0.99), sy(0)]]) + ' Z'; };
    const defs = s('defs', {}, svg), pat = s('pattern', { id: 'dgL11h', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    s('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'var(--red)', 'stroke-width': 2 }, pat);
    if (st.fe) s('path', { d: poly(st.fe), fill: 'url(#dgL11h)', stroke: 'var(--red)', 'stroke-width': 1.2 }, svg);
    s('path', { d: poly(0), fill: 'var(--red)', 'fill-opacity': 0.55, stroke: 'var(--red)', 'stroke-width': 1.5 }, svg);
    txt(svg, sx(0.08), sy(8), 'Breakthrough', { weight: 700, cls: 'dg-big', fill: 'var(--panel)', on: true });
    txt(svg, sx(0.66), sy(38), 'Contained offensive', { anchor: 'middle', weight: 700, cls: 'dg-big dg-good' });
    if (st.fe) txt(svg, sx(0.66), sy(24), 'extra breakthrough at f_e .33', { anchor: 'middle', cls: 'dg-small dg-red', weight: 600 });
    const plan = st.model?.sector || st.model?.plan;
    if (plan && plan.fr != null) {
      s('line', { x1: sx(plan.fr), x2: sx(plan.fr), y1: box.y, y2: box.y + box.h, stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-dasharray': '5 3' }, svg);
      txt(svg, sx(plan.fr) + 5, box.y + 12, `your f_r ${plan.fr.toFixed(2)}`, { cls: 'dg-small dg-acc', weight: 700 });
    }
    // Probe (focusable: arrows move it).
    const pg = s('g', { tabindex: 0, role: 'slider', 'aria-label': 'Probe point: arrow keys change reserve fraction and depth', 'aria-valuetext': `f_r ${st.fr.toFixed(2)}, ${st.d} km`, class: 'dg-hit', 'data-key': 'probe' }, svg);
    s('circle', { cx: sx(st.fr), cy: sy(st.d), r: 7, fill: 'var(--ink)', stroke: 'var(--panel)', 'stroke-width': 2 }, pg);
    s('circle', { cx: sx(st.fr), cy: sy(st.d), r: 11, class: 'dg-focus' }, pg);
    pg.addEventListener('keydown', e => {
      const k = { ArrowLeft: [-0.01, 0], ArrowRight: [0.01, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]; if (!k) return;
      e.preventDefault(); st.fr = Math.max(0, Math.min(0.99, +(st.fr + k[0] * (e.shiftKey ? 5 : 1)).toFixed(2))); st.d = Math.max(1, Math.min(50, st.d + k[1] * (e.shiftKey ? 5 : 1)));
      frS.set(st.fr); dS.set(st.d); sz.redraw(); f.stage.querySelector('[data-key="probe"]')?.focus();
    });
    svg.addEventListener('pointerdown', e => {
      const b = svg.getBoundingClientRect(), fr = sx.inv(e.clientX - b.left), d = sy.inv(e.clientY - b.top);
      if (fr < 0 || fr > 0.99 || d < 0 || d > 50) return;
      st.fr = +fr.toFixed(2); st.d = Math.max(1, Math.round(d)); frS.set(st.fr); dS.set(st.d); sz.redraw();
    });
    const o = bestResponse({ fr: st.fr, d: st.d, fe: st.fe });
    f.readout.innerHTML = `At f_r ${st.fr.toFixed(2)} and ${st.d} km: the invader gains <b>${o.G.toFixed(1)} km</b> in ${o.t.toFixed(1)} days, ${verdict(o)}. ` +
      'Below 5 km nothing contains; small reserves need enormous depth; very large reserves leave the front hollow (p. 220). Exposed defenders need far more of both (p. 221).';
  }
  const sz = sized(f.stage, draw);
  return { update(m) { st.model = m; sz.redraw(); }, destroy() { sz.destroy(); } };
}

// ---- L12 -------------------------------------------------------------------------------------------------------
const POSTURE_VA = { rush: 15, leapfrog: 4.5, infiltrate: 1.5, hold: 0.3 };   // NOTIONAL mapping of a posture mix to km/day
export const mixToVa = mix => { const tot = Object.values(mix).reduce((a, b) => a + b, 0) || 1; return Object.entries(mix).reduce((a, [k, v]) => a + (POSTURE_VA[k] ?? 0) * v / tot, 0); };

function speedHump(el, lesson, opts) {
  const st = { era: 1910, cas: false, va: 4.5, model: opts.model };
  const f = frame(el, lesson, opts);
  seg(f.controls, 'Weapons of', [{ v: 1910, l: 'ca. 1910 (Fig. A.8)' }, { v: 2000, l: 'ca. 2000 (Fig. A.14)' }], st.era, v => { st.era = v; sz.redraw(); });
  seg(f.controls, 'Attacker casualties', [{ v: false, l: 'Hide' }, { v: true, l: 'Show' }], st.cas, v => { st.cas = v; sz.redraw(); });
  slider(f.controls, 'Assault speed', { min: 0.1, max: 20, step: 0.1, value: st.va, fmt: v => v.toFixed(1) + ' km/day' }, v => { st.va = v; sz.redraw(); });
  const xs = range(0.1, 20, 0.05);
  const data = e => memo('hump' + e, () => { const Vr = minimaxVr(era(e)).Vr; return { Vr, c: curve('Va', xs, { ...era(e), Vr }) }; });
  function draw(W) {
    const H = W < 520 ? 290 : 320, box = { x: 46, y: 14, w: W - (st.cas ? 110 : 64), h: H - 60 };
    const svg = f.svg(W, H, 'Territorial gain against assault velocity, for 1910 and 2000 weapons.');
    const { sx, sy } = axes(svg, box, { x: [0.1, 20], xLog: true, y: [0, 14], xTicks: [0.1, 0.3, 1, 3, 10, 20], yTicks: [0, 2, 4, 6, 8, 10, 12, 14], xLabel: 'assault velocity (km/day, log scale)', yLabel: 'gain (km)' });
    const labels = [];
    for (const e of [1910, 2000]) {
      const { c } = data(e), on = e === st.era;
      s('path', { d: pathD(c.map(p => [sx(p.x), sy(Math.min(14, p.G))])), stroke: ERA_COL[e], 'stroke-width': on ? 3.2 : 1.8, opacity: on ? 1 : 0.45, fill: 'none' }, svg);
      const pk = c.reduce((a, b) => (b.G > a.G ? b : a));
      labels.push({ x: sx(pk.x), y: sy(Math.min(14, pk.G)) - 14, h: 14, t: `${ERA_LBL[e]}: peak ${pk.G.toFixed(1)} km at ${pk.x.toFixed(1)}`, e, on });
    }
    decollide(labels, 2, box.y + 8, box.y + box.h);
    labels.forEach(l => txt(svg, Math.min(Math.max(l.x, box.x + 60), box.x + box.w - 60), l.y, l.t, { anchor: 'middle', cls: 'dg-small', weight: l.on ? 700 : 500, fill: ERA_COL[l.e] }));
    const { c, Vr } = data(st.era);
    if (st.cas) {
      const maxC = Math.max(...c.map(p => p.CR)), sc = v => box.y + box.h - v / maxC * box.h;
      s('path', { d: pathD(c.map(p => [sx(p.x), sc(p.CR)])), stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-dasharray': '6 4', fill: 'none' }, svg);
      txt(svg, box.x + box.w + 4, box.y + 8, 'casualties', { cls: 'dg-small dg-mute' });
      txt(svg, box.x + box.w + 4, box.y + 22, `max ${Math.round(maxC / 1000)}k`, { cls: 'dg-tick' });
    }
    const o = run({ ...era(st.era), Vr, Va: st.va });
    s('line', { x1: sx(st.va), x2: sx(st.va), y1: box.y, y2: box.y + box.h, stroke: 'var(--ink)', 'stroke-dasharray': '3 3' }, svg);
    s('circle', { cx: sx(st.va), cy: sy(Math.min(14, Math.max(0, o.G))), r: 6, fill: 'var(--ink)', stroke: 'var(--panel)', 'stroke-width': 2 }, svg);
    let mixTxt = '';
    if (st.model?.mix) {
      const va = Math.max(0.1, Math.min(20, mixToVa(st.model.mix)));
      s('path', { d: `M${sx(va)} ${box.y + box.h} l-7 12 h14 z`, fill: 'var(--accent)' }, svg);
      mixTxt = ` Your battle’s posture mix plots at about ${va.toFixed(1)} km/day (▲, an illustrative mapping).`;
    }
    f.readout.innerHTML = `At ${st.va.toFixed(1)} km/day (${ERA_LBL[st.era]}, reserves at ${Vr} km/day) the invader gains <b>${Math.max(0, o.G).toFixed(1)} km</b> for ${Math.round(o.CR / 1000)}k casualties. ` +
      'Too slow and the reserves arrive first; too fast and the attack bleeds out. With deadlier weapons the best speed falls and the penalty for rushing grows (pp. 226, 234).' + mixTxt;
  }
  const sz = sized(f.stage, draw);
  return { update(m) { st.model = m; sz.redraw(); }, destroy() { sz.destroy(); } };
}

// ---- L13 -------------------------------------------------------------------------------------------------------
function reserveU(el, lesson, opts) {
  const st = { era: 2000, vr: 40 };
  const f = frame(el, lesson, opts);
  seg(f.controls, 'Highlight', [1910, 1930, 2000].map(e => ({ v: e, l: ERA_LBL[e] })), st.era, v => { st.era = v; sz.redraw(); });
  slider(f.controls, 'Reserve speed', { min: 1, max: 100, step: 1, value: st.vr, fmt: v => v + ' km/day' }, v => { st.vr = v; sz.redraw(); });
  const xs = range(1, 100, 1);
  const data = e => memo('u' + e, () => curve('Vr', xs, era(e), undefined, true));
  function draw(W) {
    const H = W < 520 ? 290 : 320, box = { x: 46, y: 14, w: W - 64, h: H - 60 };
    const svg = f.svg(W, H, 'Attacker gain against defender reserve velocity for three eras.');
    const { sx, sy } = axes(svg, box, { x: [0, 100], y: [0, 100], xTicks: [0, 20, 40, 60, 80, 100], yTicks: [0, 20, 40, 60, 80, 100], xLabel: 'defender reserve velocity (km/day)', yLabel: 'attacker gain (km)' });
    const labels = [];
    for (const e of [1910, 1930, 2000]) {
      const c = data(e), on = e === st.era;
      s('path', { d: pathD(c.map(p => [sx(p.x), sy(Math.min(100, p.G))])), stroke: ERA_COL[e], 'stroke-width': on ? 3.2 : 1.8, opacity: on ? 1 : 0.5, fill: 'none' }, svg);
      const best = c.reduce((a, b) => (b.G < a.G ? b : a));
      s('circle', { cx: sx(best.x), cy: sy(best.G), r: 4, fill: ERA_COL[e] }, svg);
      labels.push({ y: sy(Math.min(100, c[c.length > 60 ? 60 : 0].G)), h: 14, t: `${ERA_LBL[e]}: best ${best.x} km/day`, e, on });
    }
    decollide(labels, 3, box.y + 8, box.y + box.h - 8);
    labels.forEach(l => txt(svg, box.x + box.w - 6, l.y, l.t, { anchor: 'end', cls: 'dg-small', weight: l.on ? 700 : 500, fill: ERA_COL[l.e] }));
    const p = data(st.era)[st.vr - 1];
    s('line', { x1: sx(st.vr), x2: sx(st.vr), y1: box.y, y2: box.y + box.h, stroke: 'var(--ink)', 'stroke-dasharray': '3 3' }, svg);
    f.readout.innerHTML = `${ERA_LBL[st.era]}, reserves at ${st.vr} km/day: <b>${fmt.pct(p.Ps)}</b> survive the move (P_s, A.5) and the invader gains <b>${p.G.toFixed(1)} km</b>. ` +
      'Too slow and they never arrive; too fast and they are destroyed on the road. The deadlier the weapons, the slower the best speed (p. 233). Dots mark each era’s best speed.';
  }
  const sz = sized(f.stage, draw);
  return { update() {}, destroy() { sz.destroy(); } };
}

// ---- L14 (P2) ---------------------------------------------------------------------------------------------------
const CELLS = [
  { a: 'M', d: 'M', g: 11.6, t: 'Contained offensive. Moderate casualties on both sides; moderate gain; potentially long.' },
  { a: 'N', d: 'M', g: 3.2, t: 'Contained offensive. Very high attacker casualties, very low defender casualties; low gain; short.' },
  { a: 'M', d: 'N', g: 200.9, t: 'Breakthrough. Low attacker casualties; exploitation prospects improve with technology.' },
  { a: 'N', d: 'N', g: 0.1, t: 'Conditionally contained. Outcomes turn on numbers and technology; high losses for both.' },
];
function matrix(el, lesson, opts) {
  const st = { sel: 0, model: opts.model };
  const f = frame(el, lesson, opts);
  function draw(W) {
    const cw = Math.min(220, (W - 110) / 2), ch = 96, x0 = 100, y0 = 40, H = y0 + ch * 2 + 14;
    const svg = f.svg(W, H, 'Two by two table: modern-system or not, for attacker and defender, with Biddle’s computed gains.');
    txt(svg, x0 + cw, 12, 'Attacker', { anchor: 'middle', weight: 700, cls: 'dg-red' });
    ['Modern system', 'Not modern'].forEach((l, i) => { txt(svg, x0 + cw * i + cw / 2, 30, l, { anchor: 'middle', cls: 'dg-small' }); txt(svg, x0 - 8, y0 + ch * i + ch / 2, l, { anchor: 'end', cls: 'dg-small' }); });
    txt(svg, 12, y0 + ch, 'Defender', { weight: 700, cls: 'dg-blue', rotate: -90, anchor: 'middle' });
    CELLS.forEach((c, i) => {
      const col = c.a === 'M' ? 0 : 1, row = c.d === 'M' ? 0 : 1, x = x0 + col * cw, y = y0 + row * ch;
      const g = s('g', { tabindex: 0, role: 'button', 'aria-label': `Attacker ${c.a === 'M' ? 'modern' : 'not modern'}, defender ${c.d === 'M' ? 'modern' : 'not modern'}: gain ${c.g} km`, class: 'dg-hit' + (st.sel === i ? ' sel' : ''), 'data-key': 'c' + i }, svg);
      s('rect', { x, y, width: cw, height: ch, fill: c.g > 50 ? 'var(--red)' : 'var(--blue)', 'fill-opacity': c.g > 50 ? 0.3 : 0.1, class: 'dg-cell' }, g);
      s('rect', { x: x + 3, y: y + 3, width: cw - 6, height: ch - 6, class: 'dg-focus' }, g);
      txt(g, x + cw / 2, y + ch / 2, `${c.g} km`, { anchor: 'middle', cls: 'dg-big' });
      const act = () => { st.sel = i; sz.redraw(); f.stage.querySelector(`[data-key="c${i}"]`)?.focus(); };
      g.addEventListener('click', act); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    });
    for (const b of st.model?.battles || []) {
      const col = b.a === 'M' ? 0 : 1, row = b.d === 'M' ? 0 : 1;
      txt(svg, x0 + col * cw + 10, y0 + row * ch + 14, '● ' + (b.label || 'your battle'), { cls: 'dg-small dg-acc', weight: 700 });
    }
    f.readout.innerHTML = `<b>${CELLS[st.sel].g} km.</b> ${CELLS[st.sel].t} Modern against modern is the saddle point: neither side gains by changing method (p. 236).`;
  }
  const sz = sized(f.stage, draw);
  return { update(m) { st.model = m; sz.redraw(); }, destroy() { sz.destroy(); } };
}
