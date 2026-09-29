// Drawing for Correction Lab: the population, the retraction condition, the emotion sweep,
// the lever waterfall and the meta-analytic forest plot.
import { el, pct, esc } from './ui.js';
import { N, persistShare } from './model.js';
import { WT_OVERALL, WT_MODERATORS } from '../data/evidence.js';

const narrowOf = svg => (svg.getBoundingClientRect().width || 640) < 520;

/** 200 people. Filled dots still hold the false belief; open dots revised it. */
export function drawPeople(svg, res) {
  const narrow = narrowOf(svg), cols = narrow ? 16 : 25, rows = Math.ceil(N / cols), sz = 22;
  const W = cols * sz, H = rows * sz;
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  // Believers first, left to right, so the share reads as a filled block.
  const order = res.bar.map((b, i) => i).sort((a, b) => res.bar[b] - res.bar[a]);
  order.forEach((i, k) => {
    const x = (k % cols) * sz + sz / 2, y = Math.floor(k / cols) * sz + sz / 2;
    el('circle', { cx: x, cy: y, r: 7.5, class: res.revise[i] ? 'pp rev' : 'pp hold' }, svg);
  });
}

/** Each person's bar (1 − α)·U_I + C against the single left-hand side α·evidence. */
export function drawThreshold(svg, res) {
  const narrow = narrowOf(svg), W = narrow ? 420 : 640, H = 190, m = { l: 12, r: 12, t: 28, b: 34 };
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const sorted = [...res.bar].sort((a, b) => a - b);
  let x0 = Math.min(sorted[4], res.lhs) - 0.3, x1 = Math.max(sorted[N - 5], res.lhs) + 0.3;
  const X = v => m.l + ((W - m.l - m.r) * (v - x0)) / (x1 - x0);
  const nb = narrow ? 24 : 36, bins = Array.from({ length: nb }, () => ({ rev: 0, hold: 0 }));
  for (let i = 0; i < N; i++) {
    const b = Math.max(0, Math.min(nb - 1, Math.floor(((res.bar[i] - x0) / (x1 - x0)) * nb)));
    bins[b][res.revise[i] ? 'rev' : 'hold']++;
  }
  const mx = Math.max(...bins.map(b => b.rev + b.hold)), bw = (W - m.l - m.r) / nb;
  const Y = c => ((H - m.t - m.b) * c) / mx;
  bins.forEach((b, k) => {
    const x = m.l + k * bw;
    if (b.rev) el('rect', { x: x + 1, y: H - m.b - Y(b.rev), width: bw - 2, height: Y(b.rev), class: 'hb rev' }, svg);
    if (b.hold) el('rect', { x: x + 1, y: H - m.b - Y(b.rev + b.hold), width: bw - 2, height: Y(b.hold), class: 'hb hold' }, svg);
  });
  el('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: 'base' }, svg);
  const lx = X(res.lhs);
  el('line', { x1: lx, x2: lx, y1: m.t - 8, y2: H - m.b, class: 'lhs' }, svg);
  el('text', { x: lx, y: m.t - 12, class: 'lhs-t', 'text-anchor': lx > W * 0.7 ? 'end' : 'start' }, svg, `α(E)·evidence = ${res.lhs.toFixed(2)}`);
  el('text', { x: m.l, y: H - 10, class: 'ax-t' }, svg, 'Each person’s bar: (1 − α)·U_I + C  →');
  el('text', { x: W - m.r, y: H - 10, class: 'ax-t', 'text-anchor': 'end' }, svg, 'higher bar, harder to move');
}

/** Persistence as emotional activation rises, with and without the Sticky Affect weight. */
export function drawSweep(svg, s, onE) {
  const narrow = narrowOf(svg), W = narrow ? 420 : 980, H = narrow ? 230 : 240, m = { l: 42, r: 14, t: 12, b: 36 };
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const e0 = 0.25, e1 = 3;
  const X = e => m.l + ((W - m.l - m.r) * (e - e0)) / (e1 - e0), Y = p => m.t + (H - m.t - m.b) * (1 - p);
  const ax = el('g', { class: 'tsm-axis axis' }, svg);
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    el('line', { x1: m.l, x2: W - m.r, y1: Y(p), y2: Y(p), class: 'grid' }, ax);
    el('text', { x: m.l - 6, y: Y(p) + 4, 'text-anchor': 'end' }, ax, pct(p));
  }
  for (const e of [0.25, 1, 2, 3]) el('text', { x: X(e), y: H - m.b + 15, 'text-anchor': 'middle' }, ax, String(e));
  el('text', { x: (m.l + W - m.r) / 2, y: H - 3, 'text-anchor': 'middle', class: 'ax-t' }, ax, 'Emotional activation E (calm → fear, anger)');
  const line = sa => Array.from({ length: 56 }, (_, i) => e0 + ((e1 - e0) * i) / 55)
    .map((e, i) => `${i ? 'L' : 'M'}${X(e).toFixed(1)},${Y(persistShare({ ...s, e, sa })).toFixed(1)}`).join('');
  el('path', { d: line(0), class: 'sw off' }, svg);
  el('path', { d: line(1), class: 'sw on' }, svg);
  const cur = persistShare(s);
  el('line', { x1: X(s.e), x2: X(s.e), y1: m.t, y2: H - m.b, class: 'now' }, svg);
  el('circle', { cx: X(s.e), cy: Y(cur), r: 5, class: 'mark' }, svg);
  const hit = el('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, class: 'hit' }, svg);
  const toE = ev => { const r = svg.getBoundingClientRect(), x = ((ev.clientX - r.left) / r.width) * W; return Math.max(e0, Math.min(e1, e0 + ((x - m.l) / (W - m.l - m.r)) * (e1 - e0))); };
  let drag = false;
  hit.addEventListener('pointerdown', ev => { drag = true; hit.setPointerCapture(ev.pointerId); onE(toE(ev)); });
  hit.addEventListener('pointermove', ev => { if (drag) onE(toE(ev)); });
  hit.addEventListener('pointerup', () => { drag = false; });
}

/** Horizontal waterfall: from the average correction to this one, one lever at a time. */
export function drawWaterfall(box, steps) {
  let prev = steps[0].v;
  box.innerHTML = steps.map((st, i) => {
    const a = i === 0 ? 0 : Math.min(prev, st.v), b = i === 0 ? st.v : Math.max(prev, st.v);
    const dir = i === 0 ? 'base' : st.v > prev + 0.0005 ? 'up' : st.v < prev - 0.0005 ? 'down' : 'flat';
    const delta = i === 0 ? pct(st.v) : `${st.v >= prev ? '+' : '−'}${Math.abs(Math.round((st.v - prev) * 100))} pts`;
    prev = st.v;
    return `<div class="wf-r"><span class="wf-t">${esc(st.t)}</span><span class="wf-bar"><i class="${dir}" style="left:${(a * 100).toFixed(1)}%;width:${Math.max(0.4, (b - a) * 100).toFixed(1)}%"></i></span><span class="wf-v">${delta}</span></div>`;
  }).join('') + `<div class="wf-r tot"><span class="wf-t">This correction</span><span class="wf-bar"><i class="tot" style="left:0;width:${(prev * 100).toFixed(1)}%"></i></span><span class="wf-v">${pct(prev)}</span></div>`;
}

/** Forest plot of Walter & Tukachinsky subgroup estimates, current choices highlighted. */
export function drawForest(svg, s) {
  const narrow = narrowOf(svg), W = narrow ? 360 : 980, rowH = narrow ? 24 : 26, lab = narrow ? 170 : 300, m = { t: 20, b: narrow ? 44 : 34, r: narrow ? 10 : 70 };
  const rows = [{ head: 'Overall, after any correction', r: WT_OVERALL.r, lo: WT_OVERALL.lo, hi: WT_OVERALL.hi, on: true, overall: true }];
  const chosen = { tm: s.tm, src: s.src, alt: String(s.alt), rs: String(s.rs), wv: null, e: null };
  for (const mo of WT_MODERATORS) {
    rows.push({ head: narrow && mo.short ? mo.short : mo.name, group: true, ctx: chosen[mo.lever] == null });
    for (const [k, lv] of Object.entries(mo.levels)) rows.push({ head: lv.t, ...lv, on: chosen[mo.lever] === k, ctx: chosen[mo.lever] == null });
  }
  const H = m.t + rows.length * rowH + m.b, r0 = -0.35, r1 = 0.2;
  const X = r => lab + ((W - lab - m.r) * (r - r0)) / (r1 - r0);
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const ax = el('g', { class: 'tsm-axis axis' }, svg);
  for (const r of narrow ? [-0.2, 0, 0.2] : [-0.3, -0.2, -0.1, 0, 0.1, 0.2]) {
    el('line', { x1: X(r), x2: X(r), y1: m.t - 6, y2: H - m.b, class: r === 0 ? 'zero' : 'grid' }, ax);
    el('text', { x: X(r), y: H - m.b + 14, 'text-anchor': 'middle' }, ax, r.toFixed(1).replace('-', '−'));
  }
  el('text', { x: narrow ? 4 : X(r0), y: H - 4, class: 'ax-t' }, ax, '← belief persists');
  el('text', { x: W - 4, y: H - 4, class: 'ax-t', 'text-anchor': 'end' }, ax, 'erased →');
  rows.forEach((rw, i) => {
    const y = m.t + i * rowH + rowH / 2;
    if (rw.group) { el('text', { x: 4, y: y + 4, class: 'fp-g' }, svg, rw.head + (rw.ctx ? ' (context)' : '')); return; }
    el('text', { x: rw.overall ? 4 : 16, y: y + 4, class: `fp-l${rw.on ? ' on' : ''}${rw.overall ? ' ov' : ''}` }, svg, rw.head);
    el('line', { x1: X(rw.lo), x2: X(rw.hi), y1: y, y2: y, class: `fp-ci${rw.on ? ' on' : ''}${rw.ctx ? ' ctx' : ''}` }, svg);
    el('rect', { x: X(rw.r) - 5, y: y - 5, width: 10, height: 10, class: `fp-pt${rw.on ? ' on' : ''}${rw.ctx ? ' ctx' : ''}${rw.overall ? ' ov' : ''}` }, svg);
    if (!narrow) el('text', { x: W - 4, y: y + 4, class: 'fp-n', 'text-anchor': 'end' }, svg, `r = ${rw.r.toFixed(2).replace('-', '−')}`);
  });
}

