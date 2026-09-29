// Drawing: the network, the reach-over-time chart and the "what is being shared" bars.
import { el, pct, esc } from './ui.js';
import { W, H, MAXV } from './model.js';
import { CLAIMS, PARAMS_NOTIONAL as P } from '../data/claims.js';

export const VCOL = ['--c1', '--c5', '--c2', '--c4', '--bad'];

/** Draw the static network once per seed; returns an updater for node states. */
export function drawNetwork(svg, net, onHover) {
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const eg = el('g', { class: 'edges' }, svg);
  for (const [a, b] of net.edges) {
    const A = net.nodes[a], B = net.nodes[b];
    el('line', { x1: A.x.toFixed(1), y1: A.y.toFixed(1), x2: B.x.toFixed(1), y2: B.y.toFixed(1) }, eg);
  }
  const ring = el('g', { class: 'rings' }, svg);
  const ng = el('g', { class: 'nodes' }, svg);
  const dots = net.nodes.map((q, i) => {
    const c = el('circle', { cx: q.x.toFixed(1), cy: q.y.toFixed(1), r: 5.2, 'data-i': i }, ng);
    c.addEventListener('pointerenter', () => onHover(i, c));
    c.addEventListener('pointerleave', () => onHover(-1, c));
    return c;
  });
  return function update(frame, reach, showReach) {
    ring.innerHTML = '';
    frame.state.forEach((s, i) => {
      const d = dots[i];
      if (s === 1) { d.setAttribute('class', 'nd sh'); d.style.fill = `var(${VCOL[frame.ver[i]]})`; }
      else if (s === 2) { d.setAttribute('class', 'nd rt'); d.style.fill = ''; }
      else { d.setAttribute('class', frame.inoc[i] > 0 ? 'nd si pb' : 'nd si'); d.style.fill = ''; }
      if (showReach && reach.has(i)) el('circle', { cx: net.nodes[i].x.toFixed(1), cy: net.nodes[i].y.toFixed(1), r: 9, class: 'reach' }, ring);
    });
  };
}

/** Share sharing over time: this run, the no-correction run, the correction round and the current round. */
export function drawChart(svg, run, ghost, p, onScrub) {
  const Wc = 640, Hc = 200, m = { l: 40, r: 12, t: 12, b: 30 };
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${Wc} ${Hc}`);
  const T = P.steps, n = P.nodes;
  const sx = t => m.l + t / T * (Wc - m.l - m.r), sy = v => Hc - m.b - v * (Hc - m.t - m.b);
  const ax = el('g', { class: 'axis' }, svg);
  [0, 0.25, 0.5, 0.75, 1].forEach(v => {
    el('line', { x1: m.l, x2: Wc - m.r, y1: sy(v), y2: sy(v), class: 'grid' }, ax);
    el('text', { x: m.l - 6, y: sy(v) + 4, 'text-anchor': 'end' }, ax, `${v * 100}%`);
  });
  for (let t = 0; t <= T; t += 5) el('text', { x: sx(t), y: Hc - m.b + 16, 'text-anchor': 'middle' }, ax, t);
  el('text', { x: m.l + (Wc - m.l - m.r) / 2, y: Hc - 2, 'text-anchor': 'middle', class: 'ax-t' }, ax, 'Round');
  const line = (fr, key, cls) => el('path', { d: fr.map((f, t) => `${t ? 'L' : 'M'}${sx(t).toFixed(1)},${sy(f[key] / n).toFixed(1)}`).join(''), class: cls }, svg);
  if (p.cor) {
    el('line', { x1: sx(p.tc), x2: sx(p.tc), y1: m.t, y2: Hc - m.b, class: 'tc' }, svg);
    el('text', { x: sx(p.tc) + 4, y: m.t + 10, class: 'tcl' }, svg, 'correction');
    line(ghost.frames, 'sharing', 'ln ghost');
  }
  line(run.frames, 'retracted', 'ln ret');
  line(run.frames, 'sharing', 'ln main');
  el('line', { x1: sx(p.t), x2: sx(p.t), y1: m.t, y2: Hc - m.b, class: 'now' }, svg);
  const f = run.frames[p.t];
  el('circle', { cx: sx(p.t), cy: sy(f.sharing / n), r: 4.5, class: 'mark' }, svg);
  const pick = e => {
    const r = svg.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * Wc;
    onScrub(Math.max(0, Math.min(T, Math.round((x - m.l) / (Wc - m.l - m.r) * T))));
  };
  let down = false;
  svg.onpointerdown = e => { down = true; svg.setPointerCapture(e.pointerId); pick(e); };
  svg.onpointermove = e => { if (down) pick(e); };
  svg.onpointerup = svg.onpointercancel = () => { down = false; };
}

/** Horizontal bars: how many people are sharing each version at the current round. */
export function drawVersions(node, frame) {
  const total = frame.sharing || 1;
  node.innerHTML = CLAIMS.map((c, v) => {
    const k = frame.vc[v];
    return `<li><span class="vl"><i style="background:var(${VCOL[v]})"></i>${v === 0 ? 'Accurate report' : `Retelling ${v}`}</span>
      <span class="vq">“${esc(c.text)}”</span>
      <span class="vb"><span style="width:${(k / total * 100).toFixed(1)}%;background:var(${VCOL[v]})"></span></span>
      <span class="vn">${k}</span></li>`;
  }).join('');
}

/** The most-shared version this round, for the headline. */
export function topVersion(frame) {
  let best = -1, k = 0;
  frame.vc.forEach((c, v) => { if (c > k || (c === k && c > 0)) { k = c; best = v; } });
  return best;
}

export function legendHtml() {
  return `<span class="lg"><i class="d sil"></i>Not sharing</span>
    ${CLAIMS.map((c, v) => `<span class="lg"><i style="background:var(${VCOL[v]})"></i>${esc(c.short)}</span>`).join('')}
    <span class="lg"><i class="d ret"></i>Retracted</span><span class="lg"><i class="d pb"></i>Prebunked</span>`;
}

export function chartLegendHtml(cor) {
  return `<span class="lg"><i class="ln-k main"></i>Sharing</span><span class="lg"><i class="ln-k ret"></i>Retracted</span>
    ${cor ? '<span class="lg"><i class="ln-k ghost"></i>Sharing with no correction</span>' : ''}`;
}

export { pct, MAXV };
