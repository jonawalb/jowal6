// L8 Infiltration and mop-up (Hunzeker pp. 55-58, 71-72; Biddle pp. 33, 55). Storm squads slip up the gaps
// between strongpoints; mop-up units follow to clear what they bypassed. Each hour a squad in a watched sector
// risks detection: p = 1 − Π(1 − d_k) (SPEC §3.6). Toggle the outpost overlap, morning fog and the mop-up.
import { GAME } from '../../data/lessons.js';
import { INFIL } from '../../data/hunzeker.js';
import { frame, s, txt, seg, player, sized, reducedMotion, legend, fmt } from './dg-common.js';

const C = 7, R = 7, LAST = 5;   // rows: 6 start line … 0 rear; squads climb one row per hour
const SP = [[1, 2], [3, 2], [5, 2]];   // strongpoints (col, row), each with an MG lane along its row
const SQUADS = [2, 4];   // the squads' columns (the gaps)

export function mount(el, lesson, opts = {}) {
  const reduced = reducedMotion(opts);
  const st = { overlap: false, fog: false, mop: true, h: 0, t: 0 };
  const f = frame(el, lesson, opts);
  seg(f.controls, 'Outpost zone', [{ v: false, l: 'Sparse posts' }, { v: true, l: 'Overlapping watch' }], st.overlap, v => { st.overlap = v; sz.redraw(); });
  seg(f.controls, 'Weather', [{ v: false, l: 'Clear' }, { v: true, l: 'Morning fog' }], st.fog, v => { st.fog = v; sz.redraw(); });
  seg(f.controls, 'Mop-up', [{ v: true, l: 'Follows' }, { v: false, l: 'None' }], st.mop, v => { st.mop = v; sz.redraw(); });
  const pl = player(f.controls, { reduced, autoplay: !reduced, tick: dt => { st.t += dt; const h = Math.floor(st.t / 1.4) % (LAST + 2); if (h !== st.h) { st.h = h; sz.redraw(); } },
    step: () => { st.h = (st.h + 1) % (LAST + 2); sz.redraw(); }, back: () => { st.h = (st.h + LAST + 1) % (LAST + 2); sz.redraw(); } });

  const posts = () => (st.overlap ? [[0, 4], [1, 4], [3, 4], [5, 4], [6, 4]] : [[1, 4], [5, 4]]);
  // Detection chance for a squad in sector (c, r) this hour.
  function pDetect(c, r) {
    const d = GAME.detect, watchers = [];
    for (const [pc, pr] of [...posts(), ...SP]) {
      if (pc === c && pr === r) watchers.push(d.same);
      else if (Math.max(Math.abs(pc - c), Math.abs(pr - r)) === 1) watchers.push(d.adjacent * (st.overlap ? d.overlap : 1));
    }
    for (const [, pr] of SP) if (pr === r) watchers.push(d.lane);   // MG lanes sweep the strongpoint row
    let miss = 1; for (const w of watchers) miss *= 1 - Math.min(1, w);
    return (1 - miss) * (st.fog ? d.fog : 1);
  }
  const rowAt = h => R - 1 - h;   // squad row at hour h

  function draw(W) {
    const cell = Math.floor(Math.min(64, (W - 20) / C)), gx = Math.round((W - cell * C) / 2), gy = 26, H = gy + cell * R + 30;
    const svg = f.svg(W, H, 'Storm squads climb the gaps between three strongpoints while outposts and machine-gun lanes watch for them.');
    const X = c => gx + (c + 0.5) * cell, Y = r => gy + (r + 0.5) * cell;
    txt(svg, W / 2, 12, '▲ Defender’s rear ▲', { anchor: 'middle', cls: 'dg-small dg-blue', weight: 600 });
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const p = r >= 1 && r <= 5 ? pDetect(c, r) : 0;
      s('rect', { x: gx + c * cell, y: gy + r * cell, width: cell, height: cell, class: 'dg-cell', fill: 'var(--blue)', 'fill-opacity': (0.04 + p * 0.45).toFixed(3) }, svg);
    }
    const zl = (r, l) => txt(svg, gx + 4, gy + r * cell + 9, l, { cls: 'dg-tick' });
    zl(1, 'rear trench'); zl(2, 'battle zone'); zl(4, 'outpost zone'); zl(6, 'start line');
    s('path', { d: `M${gx} ${gy + cell * 1.5} h${cell * C}`, stroke: 'var(--blue)', 'stroke-width': 3, 'stroke-dasharray': '8 3', opacity: 0.6 }, svg);
    // MG lanes along the strongpoint row.
    s('path', { d: `M${X(1)} ${Y(2)} H${X(5)}`, stroke: 'var(--accent)', 'stroke-width': cell * 0.3, opacity: 0.15 }, svg);
    for (const [c, r] of SP) s('rect', { x: X(c) - 9, y: Y(r) - 9, width: 18, height: 18, fill: 'var(--blue)', stroke: 'var(--panel)', 'stroke-width': 1.5 }, svg);
    for (const [c, r] of posts()) s('circle', { cx: X(c), cy: Y(r), r: 5, fill: 'var(--blue)' }, svg);
    // Squads up to the current hour.
    const results = SQUADS.map(c => {
      let hidden = 1; const trail = [];
      for (let h = 0; h <= Math.min(st.h, LAST); h++) { const r = rowAt(h); if (h > 0) hidden *= 1 - pDetect(c, r); trail.push([X(c), Y(r)]); }
      return { c, hidden, trail };
    });
    for (const q of results) {
      s('path', { d: 'M' + q.trail.map(p => p.join(' ')).join(' L'), stroke: 'var(--red)', 'stroke-width': 2, 'stroke-dasharray': '4 3', fill: 'none' }, svg);
      const [x, y] = q.trail.at(-1);
      s('path', { d: `M${x} ${y - 9} l7 12 h-14 z`, fill: 'var(--red)' }, svg);
      if (q.hidden < 0.5) s('circle', { cx: x, cy: y, r: 13, fill: 'none', stroke: 'var(--bad)', 'stroke-width': 2, class: 'dg-live' }, svg);
      txt(svg, x + (q.c < 3 ? -12 : 12), y + 1, fmt.pct(q.hidden), { anchor: q.c < 3 ? 'end' : 'start', weight: 700, cls: q.hidden < 0.5 ? 'dg-bad' : 'dg-red', size: 12 });
    }
    // Second wave and mop-up, one hour behind.
    const h2 = st.h - 2;
    if (h2 >= 0) {
      const r2 = rowAt(Math.min(h2, LAST));
      for (const c of [1, 3, 5]) s('circle', { cx: X(c), cy: Y(r2) + (r2 === 2 ? cell * 0.35 : 0), r: 5, fill: 'var(--red)', 'fill-opacity': 0.7 }, svg);
      if (r2 <= 3) {
        if (st.mop) for (const [c] of SP) txt(svg, X(c), Y(2) - cell * 0.38, 'cleared', { anchor: 'middle', cls: 'dg-small dg-red', weight: 700 });
        else for (const [c] of SP) for (const dx of [-0.6, 0.6]) s('line', { x1: X(c), y1: Y(2), x2: X(c) + dx * cell, y2: Y(r2) + cell * 0.55, stroke: 'var(--blue)', 'stroke-width': 1.5, class: 'dg-live' }, svg);
      }
    }
    txt(svg, gx, H - 10, `Hour ${Math.min(st.h, LAST + 1)}`, { weight: 700, cls: 'dg-small' });
    const meanHidden = results.reduce((a, q) => a + q.hidden, 0) / results.length;
    f.readout.innerHTML = `Chance each squad is still unseen: <b>${results.map(q => fmt.pct(q.hidden)).join(' and ')}</b>. ` +
      (st.overlap ? 'Overlapping posts watch every gap and see each one from two sides: the squads are caught in the outpost zone, which is its job (Biddle p. 55). ' : 'Sparse posts leave gaps the squads walk through unseen until the machine-gun row. ') +
      (st.fog ? 'Fog halves every chance of being seen (Biddle p. 104). ' : '') +
      (st.mop ? INFIL.mopUp : 'With no mop-up the bypassed strongpoints keep firing into the second wave.') +
      ` Shading = chance a squad there is seen this hour (mean still hidden: ${fmt.pct(meanHidden)}).`;
  }

  legend(f, [{ label: 'Strongpoint (MG lane along its row)', color: 'blue' }, { label: 'Outpost', color: 'blue', soft: true }, { label: 'Storm squad', color: 'red' }, { label: 'MG lane', color: 'accent', soft: true }]);
  const sz = sized(f.stage, draw);
  return { update() {}, destroy() { pl.stop(); sz.destroy(); } };
}
