// Nuclear Entanglement: stage figures. Campaign planner grid, phase-by-phase risk chart, and channel breakdown.
import { CATS, CHANNELS, PHASES } from './model.js';
import { el, pct, frame, axes } from './ui.js';

const PHASE_LBL = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'];
const vw = svg => ((svg.clientWidth || 760) < 560 ? 360 : 760);

/** Planner: rows are asset categories, columns are campaign phases; each cell toggles strikes in that phase. */
export function drawPlanner(node, S, R, onToggle, onRow) {
  const head = `<div class="pl-h"></div>${PHASE_LBL.map((p, i) => `<div class="pl-h ph">${p}<span>${['opening', 'widening', 'sustained', 'late'][i]}</span></div>`).join('')}`;
  const rows = R.cats.map(c => {
    const cells = [];
    for (let t = 0; t < PHASES; t++) {
      const on = !!S.plan[c.id][t], dmg = R.phases[t].D[c.id];
      cells.push(`<button type="button" class="pl-c" data-c="${c.id}" data-t="${t}" aria-pressed="${on}"
        aria-label="${c.short}, ${PHASE_LBL[t]}: ${on ? 'strike' : 'no strike'}. Damage after this phase ${pct(dmg)}.">
        <span class="pl-strike">${on ? 'Strike' : '·'}</span>
        <span class="pl-bar" style="width:${(dmg * 100).toFixed(1)}%"></span><span class="pl-d num">${dmg > 0.005 ? pct(dmg) : ''}</span></button>`);
    }
    return `<div class="pl-r"><p class="pl-n">${c.name}<span class="fine">${c.help}</span>
      <span class="pl-meta"><span class="pill" title="Share of this category that serves nuclear forces">${pct(c.n)} nuclear role</span>
      <button type="button" class="pl-all" data-row="${c.id}">${S.plan[c.id].every(Boolean) ? 'Clear row' : 'All phases'}</button></span></p>${cells.join('')}</div>`;
  }).join('');
  node.innerHTML = `<div class="planner" role="group" aria-label="Campaign plan: which asset categories to strike in which phase">${head}${rows}</div>`;
  node.querySelectorAll('.pl-c').forEach(b => b.addEventListener('click', () => onToggle(b.dataset.c, +b.dataset.t)));
  node.querySelectorAll('.pl-all').forEach(b => b.addEventListener('click', () => onRow(b.dataset.row)));
}

/** Stacked bars of each channel's hazard per phase, with the cumulative escalation probability as a line. */
export function drawTimeline(svg, R, B) {
  const VW = vw(svg), narrow = VW < 760;
  const hmax = Math.max(0.05, ...R.phases.map(p => p.H)) * 1.15;
  const F = frame(svg, { W: VW, H: narrow ? 300 : 280, m: { l: narrow ? 40 : 52, r: narrow ? 40 : 52, t: narrow ? 30 : 16, b: 44 }, x: [0, PHASES], y: [0, hmax] });
  const { g, sx, sy, box } = F;
  const bw = (sx(1) - sx(0)) * 0.46;
  R.phases.forEach((ph, t) => {
    const cx = sx(t + 0.5);
    let y0 = 0;
    const segs = [['base', ph.H - ph.h.ci - ph.h.mw - ph.h.dl - ph.h.wa, '--faint'], ...CHANNELS.map(c => [c.id, ph.h[c.id], c.col])];
    for (const [k, v, col] of segs) {
      if (v <= 0) continue;
      el('rect', { x: cx - bw / 2, y: sy(y0 + v), width: bw, height: Math.max(0, sy(y0) - sy(y0 + v)), fill: `var(${col})`, class: 'hz', 'data-k': k }, g);
      y0 += v;
    }
    el('text', { x: cx, y: sy(y0) - 5, 'text-anchor': 'middle', class: 'tk' }, g, narrow ? pct(ph.p) : `${pct(ph.p)} this phase`);
  });
  // cumulative probability on right axis (0-1)
  const syP = v => sy(v * hmax);
  const line = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(i + 0.5).toFixed(1)} ${syP(p).toFixed(1)}`).join('');
  el('path', { d: line(B.phases.map(p => p.pCum)), class: 'cum base' }, g);
  el('path', { d: line(R.phases.map(p => p.pCum)), class: 'cum' }, g);
  R.phases.forEach((p, i) => el('circle', { cx: sx(i + 0.5), cy: syP(p.pCum), r: 4.5, class: 'cumdot' }, g));
  const lastY = syP(R.pEsc);
  el('text', { x: sx(PHASES - 0.5) - 10, y: lastY + 4, class: 'cuml' }, g, narrow ? `${pct(R.pEsc)} total` : `${pct(R.pEsc)} by the end`);
  // axes
  const yt = [0, hmax / 2, hmax].map(v => +v.toFixed(3));
  axes(F, { xt: [], yt, yl: narrow ? '' : 'Escalation hazard per phase', yf: v => v.toFixed(2) });
  const a = el('g', { class: 'axis' }, g);
  el('line', { x1: box.W - F.m.r, x2: box.W - F.m.r, y1: F.m.t, y2: box.H - F.m.b }, a);
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    el('line', { x1: box.W - F.m.r, x2: box.W - F.m.r + 4, y1: syP(v), y2: syP(v) }, a);
    el('text', { x: box.W - F.m.r + 7, y: syP(v) + 4 }, a, pct(v));
  }
  if (!narrow) el('text', { x: box.W - 8, y: F.m.t + F.ih / 2, 'text-anchor': 'middle', class: 'ax-t', transform: `rotate(90 ${box.W - 8} ${F.m.t + F.ih / 2})` }, a, 'Cumulative Pr(nuclear use)');
  PHASE_LBL.forEach((p, i) => el('text', { x: sx(i + 0.5), y: box.H - F.m.b + 18, 'text-anchor': 'middle' }, a, p));
  if (narrow) el('text', { x: 0, y: 11, class: 'ax-t' }, a, 'Bars: hazard per phase. Line: cumulative (right)');
}

/** Four channel cards, each with its share of total hazard and last-phase level. */
export function drawChannels(node, R, P) {
  const last = R.phases[PHASES - 1];
  node.innerHTML = CHANNELS.map(c => {
    const share = R.share[c.id] || 0;
    const off = c.id === 'dl' && !P.dlDoc;
    return `<article class="ch${off ? ' off' : ''}" style="--chc:var(${c.col})">
      <p class="ch-t"><i></i>${c.name}</p>
      <p class="ch-v num">${off ? 'off' : pct(share)}<span>${off ? 'target has no damage-limitation doctrine' : 'of total hazard'}</span></p>
      <div class="ch-bar"><span style="width:${(share * 100).toFixed(1)}%"></span></div>
      <p class="ch-x">${c.text}</p>
      <p class="fine">${c.term === c.name ? '' : `Literature term: ${c.term}. `}Source: ${c.src}. Final-phase hazard ${last.h[c.id].toFixed(3)}.</p>
    </article>`;
  }).join('') + `<article class="ch fogc"><p class="ch-t"><i></i>Fog of war</p>
    <p class="ch-v num">×${last.mult.toFixed(2)}<span>multiplier on perceived threat</span></p>
    <div class="ch-bar"><span style="width:${(last.fog * 100).toFixed(1)}%"></span></div>
    <p class="ch-x">Degraded warning, communications and surveillance leave the target less able to see what is happening. It fills the gap with worst-case assumptions, which amplifies the first, second and fourth channels.</p>
    <p class="fine">Source: Talmadge 2017 on wartime perceptual dynamics; Acton 2020 on leaders assuming the worst when weapons cannot be characterized. Fog level ${pct(last.fog)}.</p></article>`;
}
