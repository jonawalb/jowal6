// Timeline view: one lane per state, marks shaped and colored by category, sized by ladder rung.
import { LANES, CAT_COL, glyph, yr, esc, when, laneName, svgEl, CAT_NAME } from './common.js';

const OFF = { rhet: -7, force: -2.5, doct: 2, arms: 6.5, crisis: 0 };

export function drawTimeline(svg, list, S, { onPick, tip }) {
  const W = Math.max(320, svg.parentElement.clientWidth || 800);
  const narrow = W < 560;
  const lanes = LANES.filter(l => S.states.includes(l));
  const LH = narrow ? 30 : 34, L = narrow ? 58 : 92, R = 12, T = 24, B = 26;
  const H = T + lanes.length * LH + B;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  const x0 = S.from, x1 = Math.min(S.to, 2026 + 10 / 12);
  const X = v => L + (v - x0) / (x1 - x0) * (W - L - R);
  // Lanes
  lanes.forEach((l, i) => {
    const y = T + i * LH;
    svgEl('rect', { x: L, y: y + 2, width: W - L - R, height: LH - 4, class: 'lane', rx: 3 }, svg);
    svgEl('text', { x: L - 8, y: y + LH / 2 + 4, 'text-anchor': 'end', class: 'lane-t' }, svg, narrow && l === 'MULTI' ? 'Multi.' : laneName(l));
  });
  // Year ticks
  const span = x1 - x0;
  const step = span > 60 ? 10 : span > 25 ? 5 : span > 10 ? 2 : 1;
  for (let y = Math.ceil(x0 / step) * step; y <= x1; y += step) {
    const x = X(y);
    svgEl('line', { x1: x, x2: x, y1: T, y2: H - B + 2, class: 'yr-l' }, svg);
    svgEl('text', { x, y: H - 8, 'text-anchor': 'middle', class: 'ax-t' }, svg, String(y));
  }
  svgEl('text', { x: L, y: 14, class: 'ax-t' }, svg, narrow ? 'Larger mark = higher rung' : 'Each mark is an item; larger marks sit higher on Kahn’s ladder. Faint dots are corpus sentences.');
  // Marks: corpus sentences first so events draw on top.
  const order = [...list].sort((a, b) => (a.from === 'cx') - (b.from === 'cx') || (a.rung || 0) - (b.rung || 0)).reverse();
  const g = svgEl('g', {}, svg);
  for (const it of order) {
    const xs = X(yr(it.d));
    for (const s of (it.st.length ? it.st : ['MULTI'])) {
      const li = lanes.indexOf(s);
      if (li < 0) continue;
      const y = T + li * LH + LH / 2 + OFF[it.cat];
      const cx = it.from === 'cx';
      const size = cx ? 4 : 7 + Math.min(it.rung || 0, 12) * 0.55;
      const p = svgEl('path', { d: glyph(it.cat, size), transform: `translate(${xs.toFixed(1)},${y.toFixed(1)})`,
        class: `mk${cx ? ' mk-cx' : ''}${it.id === S.sel ? ' sel' : ''}`, style: `fill:${CAT_COL[it.cat]}`, 'data-id': it.id,
        role: 'img', 'aria-label': `${when(it)}: ${it.t}` }, g);
      p.addEventListener('click', () => onPick(it.id, true));
      p.addEventListener('mousemove', e => tip(e, `<b>${esc(when(it))}</b> · ${esc(CAT_NAME[it.cat])}<br>${esc(it.t)}${it.rung ? `<br><span class="fine">Rung ${it.rung}</span>` : ''}`));
      p.addEventListener('mouseleave', () => tip(null));
    }
  }
  // Selected item: bring to front with a guide line.
  const sel = list.find(it => it.id === S.sel);
  if (sel) {
    const x = X(yr(sel.d));
    svgEl('line', { x1: x, x2: x, y1: T, y2: H - B, class: 'selline' }, svg);
    svg.querySelectorAll(`[data-id="${CSS.escape(sel.id)}"]`).forEach(n => svg.appendChild(n));
  }
}
