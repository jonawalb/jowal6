// TPP vs performance density chart with the 3A090.a / .b regions. Plain SVG, tokens only.
import { T, fmt } from './model.js';

const NS = 'http://www.w3.org/2000/svg';
const X0 = 300, X1 = 60000, Y0 = 0.3, Y1 = 40;
let W = 560;
const H = 384, M = { l: 54, r: 14, t: 14, b: 84 };
const BAND = 26; // strip for chips with unknown die area

function el(tag, attrs, parent, text) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}
const lx = (v) => M.l + (Math.log(v / X0) / Math.log(X1 / X0)) * (W - M.l - M.r);
const plotB = H - M.b;
const ly = (v) => plotB - (Math.log(v / Y0) / Math.log(Y1 / Y0)) * (plotB - M.t);
const clampX = (v) => Math.min(X1, Math.max(X0, v));
const clampY = (v) => Math.min(Y1, Math.max(Y0, v));

export function drawChart(host, { presets, current, onPick }) {
  W = Math.max(330, Math.min(640, host.clientWidth || 560));
  host.textContent = '';
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'tpp-chart', role: 'group', 'aria-label': 'Chips plotted by TPP and performance density' }, host);
  const poly = (pts, cls) => el('polygon', { points: pts.map(([x, y]) => `${lx(x)},${ly(y)}`).join(' '), class: cls }, svg);

  // regions (datacenter chips)
  poly([[T.A_TPP, Y0], [X1, Y0], [X1, Y1], [T.A_TPP_LOW, Y1], [T.A_TPP_LOW, T.A_PD], [T.A_TPP, T.A_PD]], 'rg-a');
  poly([[T.A_TPP_LOW, T.B2_PD], [T.A_TPP, T.B2_PD], [T.A_TPP, T.A_PD], [T.A_TPP_LOW, T.A_PD]], 'rg-b');
  poly([[T.B1_TPP, T.B1_PD], [T.A_TPP, T.B1_PD], [T.A_TPP, T.B2_PD], [T.B1_TPP, T.B2_PD]], 'rg-b');

  // grid + axes
  const xt = [500, 1000, 1600, 2400, 4800, 10000, 21000, 50000];
  const yt = [0.5, 1, 1.6, 3.2, 5.92, 10, 20, 40];
  xt.forEach(v => {
    const key = v === 1600 || v === 2400 || v === 4800;
    el('line', { x1: lx(v), x2: lx(v), y1: M.t, y2: plotB, class: key ? 'gl key' : v === 21000 ? 'gl cap' : 'gl' }, svg);
    if (W < 450 && (v === 500 || v === 1000)) return;
    el('text', { x: lx(v), y: plotB + 14, class: 'tk', 'text-anchor': 'middle' }, svg, v >= 1000 ? `${v / 1000}k` : String(v));
  });
  yt.forEach(v => {
    const key = v === 1.6 || v === 3.2 || v === 5.92;
    el('line', { x1: M.l, x2: W - M.r, y1: ly(v), y2: ly(v), class: key ? 'gl key' : 'gl' }, svg);
    el('text', { x: M.l - 6, y: ly(v) + 4, class: 'tk', 'text-anchor': 'end' }, svg, String(v));
  });
  el('text', { x: lx(X1) - 6, y: ly(0.45), class: 'rl', 'text-anchor': 'end' }, svg, '3A090.a');
  el('text', { x: lx(2650), y: ly(3.7), class: 'rl sm', 'text-anchor': 'middle' }, svg, '.b');
  el('text', { x: lx(21000) - 4, y: M.t + 12, class: 'tk cap', 'text-anchor': 'end' }, svg, 'China case-by-case line');
  el('text', { x: (M.l + W - M.r) / 2, y: H - 6, class: 'ax', 'text-anchor': 'middle' }, svg, 'Total processing performance (TPP)');
  el('text', { x: 12, y: (M.t + plotB) / 2, class: 'ax', 'text-anchor': 'middle', transform: `rotate(-90 12 ${(M.t + plotB) / 2})` }, svg, 'Perf. density');

  // strip for unknown PD
  const sy = plotB + 36;
  el('text', { x: M.l - 6, y: sy + 4, class: 'tk', 'text-anchor': 'end' }, svg, 'n/a');
  el('line', { x1: M.l, x2: W - M.r, y1: sy, y2: sy, class: 'gl strip' }, svg);

  let stripN = 0;
  const dot = (c, isCur) => {
    if (!(c.tpp > 0)) return;
    const x = lx(clampX(c.tpp));
    const y = c.pd > 0 ? ly(clampY(c.pd)) : sy;
    const g = el('g', { class: 'dot' + (isCur ? ' cur' : ''), tabindex: isCur ? -1 : 0, role: isCur ? 'img' : 'button',
      'aria-label': `${c.name}: TPP ${fmt(c.tpp)}, performance density ${c.pd > 0 ? c.pd.toFixed(2) : 'not published'}` }, svg);
    el('title', {}, g, `${c.name}\nTPP ${fmt(c.tpp)}${c.pd > 0 ? `, PD ${c.pd.toFixed(2)}` : ''}`);
    el('circle', { cx: x, cy: y, r: isCur ? 8 : 5, class: c.datacenter ? 'dc' : 'ndc' }, g);
    if (!isCur) {
      const onStrip = !(c.pd > 0);
      const ly2 = onStrip ? (stripN++ % 2 ? y + 16 : y - 8) : c.below ? y + 16 : y - 6;
      const left = !onStrip && c.left;
      const lab = el('text', { x: onStrip ? x : left ? x - 7 : x + 7, y: ly2, class: 'dl', 'text-anchor': onStrip ? 'middle' : left ? 'end' : 'start' }, g, c.short || c.name);
      if (!onStrip && x > W - 90) { lab.setAttribute('x', x - 7); lab.setAttribute('text-anchor', 'end'); }
      const pick = () => onPick(c.id);
      g.addEventListener('click', pick);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    }
  };
  [...presets].sort((a, b) => (a.tpp || 0) - (b.tpp || 0)).forEach(c => dot(c, false));
  if (current && current.tpp > 0) dot({ ...current, name: 'Current entry' }, true);
}
