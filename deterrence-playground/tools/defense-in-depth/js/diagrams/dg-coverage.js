// L2 Interlocking fields and dead ground (SPEC §3.4). A 6 × 6 block of sectors; place up to three machine guns
// and turn their lanes. Each sector shows how many directions it is covered from (dirs) and the usable dead
// ground left to an attacker: D = g0 × max(0, 1 − 0.35 (dirs − 1)) × use(posture) × scout.
// Drag an MG (pointer) or focus it and use the arrow keys; R / Shift+R turns its lane.
import { GAME } from '../../data/lessons.js';
import { frame, s, txt, seg, button, sized, svgButton, keepFocus, fmt } from './dg-common.js';

const C = 6, R = 6, LANE = 3, RIFLE_ROWS = [3, 4];   // the rifle trench on row 6 covers the two rows in front
const DIRS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];   // N NE E SE S SW W NW
const DIR_NAME = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
// Base dead ground per sector (folds, sunken lanes): fixed and NOTIONAL; Biddle p. 36 has most ground invisible.
const G0 = Array.from({ length: C * R }, (_, i) => { const c = i % C, r = Math.floor(i / C); return 0.3 + 0.35 * Math.abs(Math.sin(c * 1.7 + r * 2.3)); });
const PRESETS = {
  frontal: [{ c: 1, r: 5, d: 0 }, { c: 4, r: 5, d: 0 }],
  interlock: [{ c: 0, r: 3, d: 2 }, { c: 5, r: 4, d: 6 }, { c: 5, r: 2, d: 6 }],
};

export function mount(el, lesson, opts = {}) {
  const st = { mgs: PRESETS.frontal.map(m => ({ ...m })), sel: 0, posture: 'leapfrog', scouted: true };
  const f = frame(el, lesson, opts);
  const pre = seg(f.controls, 'Layout', [{ v: 'frontal', l: 'Lanes straight ahead' }, { v: 'interlock', l: 'Interlocking' }], 'frontal', v => { st.mgs = PRESETS[v].map(m => ({ ...m })); st.sel = 0; sz.redraw(); });
  seg(f.controls, 'Attacker moves by', [{ v: 'leapfrog', l: 'Leapfrog' }, { v: 'rush', l: 'Rush' }], st.posture, v => { st.posture = v; sz.redraw(); });
  seg(f.controls, 'Ground scouted', [{ v: true, l: 'Yes' }, { v: false, l: 'No' }], st.scouted, v => { st.scouted = v; sz.redraw(); });
  const ed = h2(f.controls);
  const addB = button(ed, '+ MG', () => { if (st.mgs.length < 3) { st.mgs.push({ c: 2, r: 3, d: 2 }); st.sel = st.mgs.length - 1; pre.set(null); sz.redraw(); } });
  const delB = button(ed, '− MG', () => { if (st.mgs.length > 1) { st.mgs.splice(st.sel, 1); st.sel = 0; pre.set(null); sz.redraw(); } });
  button(ed, 'Turn ⟳', () => turn(1), { 'aria-label': 'Turn the selected lane clockwise' });
  button(ed, 'Turn ⟲', () => turn(-1), { 'aria-label': 'Turn the selected lane anticlockwise' });
  function h2(p) { const d = document.createElement('div'); d.className = 'dg-play'; p.appendChild(d); return d; }
  function turn(k) { const m = st.mgs[st.sel]; if (!m) return; m.d = (m.d + k + 8) % 8; pre.set(null); sz.redraw(); }

  function coverage() {
    const bits = new Array(C * R).fill(0);
    for (let c = 0; c < C; c++) for (const r of RIFLE_ROWS) bits[r * C + c] |= 1;   // rifle trench fires straight ahead (north)
    for (const m of st.mgs) {
      const [dx, dy] = DIRS[m.d];
      for (let k = 1; k <= LANE; k++) { const c = m.c + dx * k, r = m.r + dy * k; if (c >= 0 && c < C && r >= 0 && r < R) bits[r * C + c] |= 1 << m.d; }
    }
    return bits.map(b => { let n = 0; for (let x = b; x; x >>= 1) n += x & 1; return n; });
  }
  const deadGround = (i, dirs) => G0[i] * Math.min(1, Math.max(0, 1 - GAME.deadGround.perDir * (dirs - 1))) *
    GAME.deadGround.use[st.posture] * (st.scouted ? 1 : GAME.deadGround.unscouted);

  let geo = null;
  function draw(W) {
    const side = Math.min(W - 20, 470), cell = Math.floor(side / C), gx = Math.round((W - cell * C) / 2), gy = 34;
    const H = gy + cell * R + 64;
    geo = { cell, gx, gy };
    const svg = f.svg(W, H, 'A six by six block of sectors with machine-gun fire lanes. Each sector shows the number of directions it is covered from and the dead ground left to the attacker.');
    const dirs = coverage();
    txt(svg, W / 2, 14, '▼  Enemy attacks from this side  ▼', { anchor: 'middle', cls: 'dg-small dg-red', weight: 600 });
    const shade = ['transparent', 'var(--blue)', 'var(--blue)', 'var(--blue)'], op = [0, 0.14, 0.32, 0.5];
    dirs.forEach((n, i) => {
      const c = i % C, r = Math.floor(i / C), x = gx + c * cell, y = gy + r * cell, k = Math.min(3, n);
      s('rect', { x, y, width: cell, height: cell, class: 'dg-cell', fill: n ? shade[k] : 'var(--chip)', 'fill-opacity': n ? op[k] : 0.5 }, svg);
      if (n >= 2) s('path', { d: `M${x + 4} ${y + cell - 4} l${cell * 0.25} -${cell * 0.25}`, stroke: 'var(--blue)', 'stroke-width': 1.5, opacity: 0.7 }, svg);
      txt(svg, x + 5, y + 10, String(n), { cls: 'dg-small dg-blue', weight: 700, size: 11 });
      const D = deadGround(i, n);
      txt(svg, x + cell / 2, y + cell - 10, fmt.pct(D), { anchor: 'middle', cls: D > 0.3 ? 'dg-red' : 'dg-mute', size: cell < 50 ? 11 : 12, weight: 600 });
    });
    // Lanes as tapered fans.
    st.mgs.forEach(m => {
      const [dx, dy] = DIRS[m.d], cx = gx + (m.c + 0.5) * cell, cy = gy + (m.r + 0.42) * cell;
      const ex = cx + dx * LANE * cell, ey = cy + dy * LANE * cell, nx = -dy, ny = dx, len = Math.hypot(dx, dy), w = cell * 0.38 / len;
      s('path', { d: `M${cx} ${cy} L${ex + nx * w} ${ey + ny * w} L${ex - nx * w} ${ey - ny * w} Z`, fill: 'var(--accent)', 'fill-opacity': 0.16, stroke: 'var(--accent)', 'stroke-width': 1.2 }, svg);
      if (dy === 0) {   // runs across the front, along an attacking wave: enfilade (double chevron)
        const mx = cx + dx * cell * 1.6;
        for (const o of [0, 7]) s('path', { d: `M${mx + dx * o - dx * 5} ${cy - 6} l${dx * 6} 6 l${-dx * 6} 6`, stroke: 'var(--accent)', 'stroke-width': 2, fill: 'none' }, svg);
      }
    });
    st.mgs.forEach((m, i) => {
      const cx = gx + (m.c + 0.5) * cell, cy = gy + (m.r + 0.42) * cell;
      const g = svgButton(svg, `Machine gun ${i + 1} in column ${m.c + 1}, row ${m.r + 1}, lane facing ${DIR_NAME[m.d]}. Arrow keys move it, R turns it.`, () => { st.sel = i; keepFocus(f.stage, () => sz.redraw()); }, { 'data-key': 'mg' + i, class: i === st.sel ? 'sel' : '' });
      s('circle', { cx, cy, r: Math.min(13, cell * 0.22), fill: 'var(--blue)', stroke: 'var(--panel)', 'stroke-width': 2 }, g);
      txt(g, cx, cy + 1, 'MG', { anchor: 'middle', size: 9, weight: 700, fill: 'var(--panel)', on: true });
      s('circle', { cx, cy, r: Math.min(13, cell * 0.22) + 4, class: 'dg-focus' }, g);
      g.addEventListener('keydown', e => keyMove(e, i));
      g.addEventListener('pointerdown', e => dragStart(e, i, svg));
    });
    s('path', { d: `M${gx} ${gy + cell * R - 5} h${cell * C}`, stroke: 'var(--blue)', 'stroke-width': 4, 'stroke-dasharray': '10 3', opacity: 0.6 }, svg);
    txt(svg, gx + cell * C, gy + cell * R + 10, 'rifle trench: fires 2 sectors ahead', { anchor: 'end', cls: 'dg-small dg-blue' });
    const two = dirs.filter(n => n >= 2).length / dirs.length;
    const meanD = dirs.reduce((a, n, i) => a + deadGround(i, n), 0) / dirs.length;
    txt(svg, gx, H - 28, `Covered from 2+ directions: ${fmt.pct(two)}`, { weight: 600, cls: 'dg-small' });
    txt(svg, gx, H - 12, `Mean usable dead ground: ${fmt.pct(meanD)}`, { weight: 600, cls: 'dg-small dg-red' });
    f.readout.innerHTML = `<b>${fmt.pct(two)}</b> of these sectors are covered from two or more directions; the attacker can use <b>${fmt.pct(meanD)}</b> of the ground on average. ` +
      (two < 0.4 ? 'Lanes that all point the same way leave folds the attacker can crawl along. Site the guns on the flanks so the lanes cross.' : 'Crossing lanes see into each other’s dead ground: the fold that hides a man from one gun lies open to the other.') +
      ` Small digit = directions; % = usable dead ground. Rush uses only ${fmt.pct(GAME.deadGround.use.rush)} of it; unscouted ground counts half.`;
    addB.disabled = st.mgs.length >= 3; delB.disabled = st.mgs.length <= 1;
  }

  function place(i, c, r) {
    c = Math.max(0, Math.min(C - 1, c)); r = Math.max(0, Math.min(R - 1, r));
    if (st.mgs.some((m, j) => j !== i && m.c === c && m.r === r)) return;
    st.mgs[i].c = c; st.mgs[i].r = r; st.sel = i; pre.set(null);
    keepFocus(f.stage, () => sz.redraw());
  }
  function keyMove(e, i) {
    const m = st.mgs[i], mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (mv) { e.preventDefault(); place(i, m.c + mv[0], m.r + mv[1]); }
    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); st.sel = i; turn(e.shiftKey ? -1 : 1); f.stage.querySelector(`[data-key="mg${i}"]`)?.focus(); }
  }
  function dragStart(e, i, svg) {
    e.preventDefault(); st.sel = i;
    const move = ev => {
      const b = f.stage.querySelector('svg').getBoundingClientRect(), x = ev.clientX - b.left, y = ev.clientY - b.top;
      const c = Math.floor((x - geo.gx) / geo.cell), r = Math.floor((y - geo.gy) / geo.cell);
      if (c !== st.mgs[i].c || r !== st.mgs[i].r) place(i, c, r);
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  }

  const sz = sized(f.stage, draw);
  return { update() {}, destroy() { sz.destroy(); } };
}
