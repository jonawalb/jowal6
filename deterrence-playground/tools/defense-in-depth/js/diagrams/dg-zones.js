// L3 Elastic defense in depth (Hunzeker pp. 81-82): outpost, battle and rear zones, the Riposte and the
// Counterstroke. Hover, tap or focus a zone for its depth, garrison and role. Toggle "Copied the form, not the
// rules" (p. 117): too many men forward, hold at all costs, a slow counterstroke, a rear zone only on maps.
import { ZONES, ZONE_TOTAL_KM, COUNTERATTACKS, FORM_NOT_RULES } from '../../data/hunzeker.js';
import { frame, s, h, txt, seg, sized, svgButton, keepFocus, arrowDefs, uid, legend } from './dg-common.js';

const KM = ZONE_TOTAL_KM;

export function mount(el, lesson, opts = {}) {
  const st = { copy: false, zone: 'battle' };
  const f = frame(el, lesson, opts);
  seg(f.controls, 'Doctrine', [{ v: false, l: 'Elastic (the rules)' }, { v: true, l: 'Copied the form, not the rules' }], st.copy, v => { st.copy = v; sz.redraw(); });
  const zs = seg(f.controls, 'Zone', ZONES.map(z => ({ v: z.id, l: z.name.replace(' zone', '') })), st.zone, v => { st.zone = v; keepFocus(f.stage, () => sz.redraw()); });

  // Deterministic scatter (no RNG dependency).
  const hash = i => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };

  function draw(W) {
    const narrow = W < 520, top = 34, pxk = narrow ? 44 : 46, H = top + KM * pxk + 18;
    const x0 = narrow ? 34 : 64, x1 = W - 10, mid = (x0 + x1) / 2, y = km => top + km * pxk;
    const svg = f.svg(W, H, 'Plan of an elastic defense in depth: outpost, battle and rear zones, with riposte and counterstroke arrows into a penetration.');
    const blue = arrowDefs(svg, uid(lesson, 'b'), 'blue'), red = arrowDefs(svg, uid(lesson, 'r'), 'red');
    const zones = st.copy ? ZONES.map(z => z.id === 'outpost' ? { ...z, to: FORM_NOT_RULES.battleZoneStartKm } : z.id === 'battle' ? { ...z, from: FORM_NOT_RULES.battleZoneStartKm, to: 5.5 } : { ...z, from: 5.5, to: 8 }) : ZONES;
    s('rect', { x: x0, y: 0, width: x1 - x0, height: top, fill: 'var(--red)', 'fill-opacity': 0.08 }, svg);
    txt(svg, mid, 12, 'Enemy attacks from here', { anchor: 'middle', cls: 'dg-small dg-red', weight: 600 });
    const tint = { outpost: 0.07, battle: 0.15, rear: 0.24 };
    zones.forEach(z => {
      const g = svgButton(svg, `${z.name}: ${z.depth}. ${z.garrison} ${z.role}`, () => { st.zone = z.id; zs.set(z.id); keepFocus(f.stage, () => sz.redraw()); }, { 'data-key': 'z-' + z.id, class: st.zone === z.id ? 'sel' : '' });
      g.addEventListener('focus', () => { if (st.zone !== z.id) { st.zone = z.id; zs.set(z.id); info(); } });
      g.addEventListener('pointerenter', () => { st.zone = z.id; zs.set(z.id); info(); });
      const dashed = st.copy && z.id === 'rear';
      s('rect', { x: x0, y: y(z.from), width: x1 - x0, height: (z.to - z.from) * pxk, fill: 'var(--blue)', 'fill-opacity': dashed ? 0.03 : tint[z.id], stroke: dashed ? 'var(--muted)' : 'var(--rule)', 'stroke-dasharray': dashed ? '6 4' : null }, g);
      s('rect', { x: x0 + 2, y: y(z.from) + 2, width: x1 - x0 - 4, height: (z.to - z.from) * pxk - 4, class: 'dg-focus' }, g);
      txt(g, x0 + 8, y(z.from) + 12, z.name.toUpperCase() + (dashed ? ' (only on maps)' : ''), { cls: 'dg-small', weight: 700 });
    });
    // Depth scale.
    for (const k of [0, 1, 3.5, 7, 10]) { s('line', { x1: x0 - 5, x2: x0, y1: y(k), y2: y(k), stroke: 'var(--muted)' }, svg); txt(svg, x0 - 7, y(k), k + (narrow ? '' : ' km'), { anchor: 'end', cls: 'dg-tick' }); }
    if (narrow) txt(svg, 4, top - 8, 'km', { cls: 'dg-tick' });
    const span = x1 - x0, X = t => x0 + span * t;
    // Outpost posts: sparse (elastic) or dense (the copy).
    const nPosts = st.copy ? 26 : 7;
    for (let i = 0; i < nPosts; i++) s('circle', { cx: X(0.08 + 0.84 * hash(i + 1)), cy: y((st.copy ? 0.3 + 3.4 * hash(i + 50) : 0.25 + 0.6 * hash(i + 50))), r: 3.2, fill: 'var(--blue)' }, svg);
    const bz = zones.find(z => z.id === 'battle');
    // Trench series at the front and the rear of the battle zone.
    for (const k of [bz.from + 0.12, bz.to - 0.2]) s('path', { d: `M${X(0.04)} ${y(k)} h${span * 0.92}`, stroke: 'var(--blue)', 'stroke-width': 3, 'stroke-dasharray': '9 3', fill: 'none', opacity: 0.7 }, svg);
    // Strongpoints with MG lanes that fire into the flanks of a penetration.
    const sps = [[0.24, bz.from + 0.9], [0.76, bz.from + 0.9], [0.3, bz.from + 1.8], [0.7, bz.from + 1.8]];
    sps.forEach(([t, k], i) => {
      const cx = X(t), cy = y(k), dir = t < 0.5 ? 1 : -1;
      s('path', { d: `M${cx} ${cy} l${dir * span * 0.16} -9 v18 z`, fill: 'var(--accent)', 'fill-opacity': 0.22, stroke: 'var(--accent)', 'stroke-width': 1 }, svg);
      s('rect', { x: cx - 6, y: cy - 6, width: 12, height: 12, fill: 'var(--blue)', stroke: 'var(--panel)', 'stroke-width': 1.5 }, svg);
      if (st.copy) txt(svg, cx, cy - 15, '⚑', { anchor: 'middle', cls: 'dg-red', size: 13 });
    });
    // The penetration: a bulge from the top into the battle zone.
    const pTip = y(st.copy ? bz.from + 0.6 : bz.from + 1.2), pw = span * 0.13;
    s('path', { d: `M${mid - pw} ${top} C${mid - pw} ${pTip - 30} ${mid - pw * 0.6} ${pTip} ${mid} ${pTip} C${mid + pw * 0.6} ${pTip} ${mid + pw} ${pTip - 30} ${mid + pw} ${top} Z`, fill: 'var(--red)', 'fill-opacity': 0.22, stroke: 'var(--red)', 'stroke-width': 1.5 }, svg);
    for (const dx of [-0.5, 0, 0.5]) s('line', { x1: mid + dx * pw, y1: top - 4, x2: mid + dx * pw * 0.7, y2: pTip - 20, stroke: 'var(--red)', 'stroke-width': 2, 'marker-end': red }, svg);
    txt(svg, mid, pTip + 12, 'penetration', { anchor: 'middle', cls: 'dg-small dg-red', weight: 600 });
    // Counterattacks.
    const rz = zones.find(z => z.id === 'rear'), csY = y(st.copy ? 7.2 : 8.6);
    s('rect', { x: mid - 52, y: csY - 13, width: 104, height: 26, rx: 3, fill: 'var(--blue)', 'fill-opacity': 0.85 }, svg);
    txt(svg, mid, csY, 'Counterstroke Group', { anchor: 'middle', size: 11, weight: 700, fill: 'var(--panel)', on: true });
    if (!st.copy) txt(svg, mid, csY + 24, 'behind the rear zone', { anchor: 'middle', cls: 'dg-small dg-mute' });
    s('path', { d: `M${mid} ${csY - 15} C${mid + span * 0.18} ${csY - 70} ${mid + pw * 1.6} ${pTip + 60} ${mid + pw * 0.4} ${pTip + 22}`, fill: 'none', stroke: 'var(--blue)', 'stroke-width': 3, 'stroke-dasharray': st.copy ? '7 6' : null, 'marker-end': blue }, svg);
    txt(svg, mid + span * 0.17, (csY + pTip) / 2 + 20, st.copy ? 'Counterstroke: 8+ h' : 'Counterstroke', { anchor: 'start', cls: 'dg-blue', weight: 700 });
    txt(svg, mid + span * 0.17, (csY + pTip) / 2 + 36, st.copy ? 'orders too slow' : (narrow ? 'deliberate' : 'deliberate, when no riposte can'), { anchor: 'start', cls: 'dg-small dg-mute' });
    if (!st.copy) {
      for (const sgn of [-1, 1]) s('path', { d: `M${mid + sgn * span * 0.26} ${y(bz.from + 1.4)} Q${mid + sgn * pw * 1.3} ${y(bz.from + 1.4)} ${mid + sgn * pw * 0.75} ${pTip - 10}`, fill: 'none', stroke: 'var(--blue)', 'stroke-width': 2.5, 'marker-end': blue }, svg);
      txt(svg, x0 + 8, y(bz.from + 1.4), narrow ? 'Riposte' : 'Riposte (24 h)', { cls: 'dg-blue dg-small', weight: 700 });
    }
    void rz;
    info();
  }

  function info() {
    const z = ZONES.find(q => q.id === st.zone);
    f.extra.textContent = '';
    const box = h('div', { class: 'dg-info' }, f.extra);
    h('h4', {}, box, `${z.name} · ${z.depth}`);
    h('p', {}, box, `${z.garrison} ${z.role} (Hunzeker pp. ${z.pages})`);
    f.readout.innerHTML = st.copy
      ? `<b>The copy kept the zones but not the rules.</b> ${FORM_NOT_RULES.faults.join('; ')} (p. ${FORM_NOT_RULES.page}). The guns now fall on a crowded front, and the counterstroke arrives after the attacker has dug in.`
      : `<b>Thin forward, strong in depth.</b> Outposts warn and fall back; strongpoints hold and fire into the flanks of a penetration; nearby units <b>riposte</b> ${COUNTERATTACKS.riposte.when} and the <b>Counterstroke Group</b> follows (p. ${COUNTERATTACKS.riposte.page}). ${COUNTERATTACKS.timing.text}`;
  }

  legend(f, [{ label: 'Outpost / sentry group', color: 'blue' }, { label: 'Trench line', color: 'blue', dash: true, line: true },
    { label: 'Strongpoint with MG lane into the flank', color: 'accent' }, { label: 'Attacker penetration', color: 'red', soft: true }]);
  const sz = sized(f.stage, draw);
  return { update() {}, destroy() { sz.destroy(); } };
}
