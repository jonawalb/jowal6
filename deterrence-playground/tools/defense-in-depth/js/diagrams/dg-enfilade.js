// L1 Enfilade vs frontal fire. A machine gun's beaten zone is long and narrow along its line of fire: from the
// front it crosses a line of men and catches one or two; from the flank it runs along the line and catches most.
// Toggles: Frontal / Flanking, Waves / Small groups, cover fold on/off. Animated bursts (or Step with reduced motion).
import { GAME } from '../../data/lessons.js';
import { frame, s, txt, seg, player, sized, reducedMotion, uid, arrowDefs } from './dg-common.js';

const N = 10;

export function mount(el, lesson, opts = {}) {
  const reduced = reducedMotion(opts);
  const st = { mode: 'flank', form: 'waves', cover: true, t: 0, bursts: 0, hitsSum: 0, lastHits: 0, phase: 0 };
  const f = frame(el, lesson, opts);
  seg(f.controls, 'MG position', [{ v: 'front', l: 'Frontal' }, { v: 'flank', l: 'Flanking' }], st.mode, v => { st.mode = v; reset(); });
  seg(f.controls, 'Attacker formation', [{ v: 'waves', l: 'Waves' }, { v: 'groups', l: 'Small groups' }], st.form, v => { st.form = v; reset(); });
  seg(f.controls, 'Fold in the ground', [{ v: true, l: 'Cover on' }, { v: false, l: 'Off' }], st.cover, v => { st.cover = v; reset(); });
  const pl = player(f.controls, { reduced, tick: dt => { st.t += dt; const ph = Math.floor(st.t / 0.7); if (ph !== st.phase) { st.phase = ph; burst(); } paint(); }, step: () => { st.t = (st.phase + 1) * 0.7; st.phase++; burst(); paint(); } });

  let L = null, dyn = null;
  function layout(W) {
    const H = Math.round(Math.min(360, Math.max(270, W * 0.5)));
    const x0 = W * (W < 480 ? 0.2 : 0.26), x1 = W * 0.88, yRow = H * 0.6;
    const pos = [];
    for (let i = 0; i < N; i++) {
      if (st.form === 'waves') pos.push([x0 + (x1 - x0) * i / (N - 1), yRow]);
      else { const grp = i < 3 ? 0 : i < 7 ? 1 : 2, k = i < 3 ? i : i < 7 ? i - 3 : i - 7;
        const gx = x0 + (x1 - x0) * [0.08, 0.5, 0.9][grp], gy = yRow + [-34, 22, -10][grp];
        pos.push([gx + (k % 2 ? 9 : -9) + (k > 1 ? 4 : 0), gy + (k > 1 ? 13 : 0)]); }
    }
    const mg = st.mode === 'front' ? [W * 0.57, H * 0.13] : [W * 0.07, yRow];
    const fold = { x: x0 + (x1 - x0) * 0.32, w: (x1 - x0) * 0.36, y: yRow - 24 };
    return { W, H, x0, x1, yRow, pos, mg, fold, spacing: (x1 - x0) / (N - 1) };
  }

  // Beaten zone: centre, half-length along the line of fire, half-width across it.
  function zone() {
    const { mg, x0, x1, yRow, spacing } = L, sw = Math.sin(st.t * 1.6);
    if (st.mode === 'front') return { cx: (x0 + x1) / 2 + sw * (x1 - x0) * 0.45, cy: yRow, along: 48, across: spacing * 0.75, ang: Math.atan2(yRow - mg[1], ((x0 + x1) / 2) - mg[0]) };
    return { cx: x0 + (x1 - x0) * (0.45 + sw * 0.12), cy: yRow + sw * 6, along: (x1 - x0) * 0.42, across: 15, ang: 0 };
  }
  const inside = (z, p) => {
    const dx = p[0] - z.cx, dy = p[1] - z.cy, c = Math.cos(-z.ang), sn = Math.sin(-z.ang);
    const u = dx * c - dy * sn, v = dx * sn + dy * c;
    return (u * u) / (z.along * z.along) + (v * v) / (z.across * z.across) <= 1;
  };
  const shielded = p => st.cover && st.mode === 'front' && p[0] >= L.fold.x && p[0] <= L.fold.x + L.fold.w;
  function hits() { const z = zone(); return L.pos.map(p => inside(z, p) && !shielded(p)); }
  function burst() { const h = hits().filter(Boolean).length; st.bursts++; st.hitsSum += h; st.lastHits = h; }
  function reset() { st.t = 0; st.phase = 0; st.bursts = 0; st.hitsSum = 0; st.lastHits = 0; sz.redraw(); }

  function draw(W) {
    L = layout(W);
    const svg = f.svg(W, L.H, 'A machine gun fires at a line of ten attackers. From the front its beaten zone crosses the line; from the flank it runs along it.');
    const ar = arrowDefs(svg, uid(lesson, 'a'), 'red');
    s('rect', { x: 0, y: 0, width: W, height: L.H, class: 'dg-ground' }, svg);
    // Defender trench along the top; the attack moves up the screen.
    s('path', { d: `M${W * 0.04} ${L.H * 0.13} h${W * 0.92}`, stroke: 'var(--blue)', 'stroke-width': 5, 'stroke-dasharray': '14 4', fill: 'none', opacity: 0.55 }, svg);
    txt(svg, W * 0.96, L.H * 0.13 - 13, 'Defender trench', { anchor: 'end', cls: 'dg-small dg-blue' });
    s('line', { x1: L.x1 + 14, y1: L.yRow + 26, x2: L.x1 + 14, y2: L.yRow - 40, stroke: 'var(--red)', 'stroke-width': 2, 'marker-end': ar }, svg);
    txt(svg, L.x1 + 6, L.yRow + 40, 'Attack', { anchor: 'middle', cls: 'dg-small dg-red' });
    if (st.cover) {
      const { x, w, y } = L.fold;
      s('path', { d: `M${x} ${y + 8} q ${w / 2} -16 ${w} 0`, fill: 'var(--coast)', stroke: 'var(--muted)', 'stroke-width': 1.5, opacity: 0.85 }, svg);
      txt(svg, x + w / 2, y - 12, 'fold: hides from the front only', { anchor: 'middle', cls: 'dg-small dg-mute' });
    }
    dyn = s('g', {}, svg);
    paint();
  }

  function paint() {
    if (!dyn) return;
    dyn.textContent = '';
    const z = zone(), hit = hits(), { mg, W } = L;
    const firing = reduced || (st.t % 0.7) < 0.32;
    // Beaten zone ellipse and its axis.
    s('ellipse', { cx: z.cx, cy: z.cy, rx: z.along, ry: z.across, transform: `rotate(${z.ang * 180 / Math.PI} ${z.cx} ${z.cy})`, fill: 'var(--blue)', 'fill-opacity': 0.16, stroke: 'var(--blue)', 'stroke-dasharray': '4 3' }, dyn);
    if (firing) for (let k = -1; k <= 1; k++) {
      const tx = z.cx + Math.cos(z.ang) * z.along * k * 0.8, ty = z.cy + Math.sin(z.ang) * z.along * k * 0.8;
      s('line', { x1: mg[0], y1: mg[1], x2: tx, y2: ty, stroke: 'var(--accent)', 'stroke-width': 1.5, opacity: 0.8, class: 'dg-live' }, dyn);
    }
    // The machine gun.
    s('circle', { cx: mg[0], cy: mg[1], r: 10, fill: 'var(--blue)', stroke: 'var(--panel)', 'stroke-width': 2 }, dyn);
    txt(dyn, mg[0], mg[1], 'MG', { anchor: 'middle', size: 9, weight: 700, fill: 'var(--panel)', on: true });
    const lbl = st.mode === 'front' ? 'Frontal MG' : 'Flanking MG';
    txt(dyn, st.mode === 'front' ? mg[0] + 15 : mg[0] - 4, st.mode === 'front' ? mg[1] + 1 : mg[1] - 22, lbl, { cls: 'dg-blue', weight: 600 });
    // Attackers: hit figures get a ring.
    L.pos.forEach((p, i) => {
      const g = s('g', { transform: `translate(${p[0]} ${p[1]})` }, dyn);
      if (hit[i] && firing) s('circle', { r: 10, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5, class: 'dg-live' }, g);
      s('circle', { cy: -6, r: 3.3, fill: 'var(--red)' }, g);
      s('path', { d: 'M0 -3 v8 M-4 1 h8 M0 5 l-3 5 M0 5 l3 5', stroke: 'var(--red)', 'stroke-width': 2, 'stroke-linecap': 'round', fill: 'none' }, g);
      if (shielded(p)) s('circle', { r: 2, cy: 13, fill: 'var(--muted)' }, g);
    });
    const avg = st.bursts ? st.hitsSum / st.bursts : hit.filter(Boolean).length;
    txt(dyn, 10, L.H - 14, `In the beaten zone this burst: ${hit.filter(Boolean).length} of ${N}`, { cls: 'dg-small', weight: 600 });
    if (W >= 420) txt(dyn, W - 10, L.H - 14, `average ${avg.toFixed(1)} per burst`, { anchor: 'end', cls: 'dg-small dg-mute' });
    readout(avg);
  }

  function readout(avg) {
    const enf = st.mode !== 'flank' ? GAME.ENF.none : st.form === 'waves' ? GAME.ENF.waves : GAME.ENF.groups;
    const cover = st.mode === 'front' && st.cover ? GAME.coverDirFront : 0;
    const G = (1 - cover) * enf;
    const why = st.mode === 'flank'
      ? (st.form === 'waves' ? 'Fire runs along the line, so the fold faces the wrong way and every burst sweeps most of the wave.' : 'Small groups still advance abreast, so the burst runs along their frontage too, but they are spaced and use the ground: it finds fewer men than in a wave.')
      : (st.cover ? 'Fire crosses the line: each burst finds one or two men, and the fold stops it for the men behind it.' : 'Fire crosses the line: each burst finds one or two men.');
    f.readout.innerHTML = `<b>${avg.toFixed(1)} men per burst</b> on average. ${why} ` +
      `In the game this is the geometry factor G = (1 − cover ${cover}) × enfilade ${enf.toFixed(1)} = <b>${G.toFixed(1)}</b>` +
      ` (frontal into cover 0.5; flanking small groups ${GAME.ENF.groups}; flanking a wave ${GAME.ENF.waves}).`;
  }

  const sz = sized(f.stage, draw);
  if (reduced) burst();
  return { update() {}, destroy() { pl.stop(); sz.destroy(); } };
}
