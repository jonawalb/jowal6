// Schematic corridor map (not to scale): bases in the British and U.S. zones, the three corridors and
// Berlin's three airfields, with a day's landings against each airfield's slots.
import { fmt } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs, parent, text) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
};

const P = {
  north: 'M 150 78 C 280 70 380 88 468 128',
  south: 'M 142 262 C 300 262 430 238 530 208',
  ret: 'M 448 168 C 380 168 300 168 236 168',
  retN: 'M 236 168 C 205 150 180 110 160 88',
  retS: 'M 236 168 C 205 190 175 235 150 252',
};
const FIELDS = [
  { k: 'teg', name: 'Tegel', sector: 'French sector', x: 520, y: 112, ly: -18 },
  { k: 'gat', name: 'Gatow', sector: 'British sector', x: 468, y: 176, ly: 40 },
  { k: 'thf', name: 'Tempelhof', sector: 'U.S. sector', x: 566, y: 204, ly: 40 },
];
const WX = ['Good', 'Cloud', 'Fog'];

export function drawMap(svg, view) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  svg.textContent = '';
  el('rect', { x: 0, y: 0, width: 640, height: 330, class: 'mp-soviet' }, svg);
  el('text', { x: 300, y: 318, class: 'mp-zt' }, svg, 'Soviet zone');
  el('rect', { x: 8, y: 8, width: 228, height: 150, rx: 4, class: 'mp-zone' }, svg);
  el('rect', { x: 8, y: 178, width: 228, height: 144, rx: 4, class: 'mp-zone' }, svg);
  el('text', { x: 18, y: 28, class: 'mp-zt' }, svg, 'British zone');
  el('text', { x: 18, y: 312, class: 'mp-zt' }, svg, 'U.S. zone');
  // Corridors
  for (const k of ['north', 'south', 'ret']) el('path', { d: P[k], class: 'mp-cor' }, svg);
  for (const k of ['retN', 'retS']) el('path', { d: P[k], class: 'mp-cor', 'stroke-width': 10 }, svg);
  const lines = {};
  for (const k of Object.keys(P)) lines[k] = el('path', { d: P[k], class: 'mp-cl', id: 'mp-' + k }, svg);
  const nar = view.narrow;
  el('text', { x: 250, y: nar ? 60 : 64, class: 'mp-ct' }, svg, nar ? 'North, in' : 'Northern corridor, inbound');
  el('text', { x: 250, y: 158, class: 'mp-ct' }, svg, nar ? 'Center, out' : 'Central corridor, return');
  el('text', { x: 250, y: nar ? 284 : 276, class: 'mp-ct' }, svg, nar ? 'South, in' : 'Southern corridor, inbound');
  if (!nar) el('text', { x: 262, y: 290, class: 'mp-ct' }, svg, 'Each corridor 20 miles wide');
  // Bases
  const base = (x, y, lines2, anchor = 'start') => {
    el('circle', { cx: x, cy: y, r: 6, class: 'mp-base' }, svg);
    lines2.forEach((t, i) => el('text', { x: anchor === 'start' ? x + 10 : x - 10, y: y + 4 + i * (view.narrow ? 18 : 13) - (view.narrow ? 12 : 0), class: 'mp-bt', 'text-anchor': anchor }, svg, t));
  };
  base(150, 78, view.northBases, 'end');
  base(142, 262, ['Rhein-Main', 'Wiesbaden'], 'end');
  // Berlin
  el('circle', { cx: 518, cy: 165, r: 92, class: 'mp-berlin' }, svg);
  el('text', { x: 518, y: 62, class: 'mp-zt', 'text-anchor': 'middle' }, svg, 'Berlin');
  for (const f of FIELDS) {
    const land = view.land[f.k] || 0, slots = view.slots[f.k] || 0;
    el('circle', { cx: f.x, cy: f.y, r: 7, class: 'mp-base' }, svg);
    const ty = f.y + (f.ly < 0 ? f.ly : 20);
    el('text', { x: f.x, y: ty, class: 'mp-ft', 'text-anchor': 'middle' }, svg, f.name);
    if (!view.open[f.k]) { el('text', { x: f.x, y: ty + 13, class: 'mp-closed', 'text-anchor': 'middle' }, svg, view.openNote[f.k]); continue; }
    const bw = 64, bx = f.x - bw / 2, by = f.ly < 0 ? f.y + 11 : ty + 5;
    el('rect', { x: bx, y: by, width: bw, height: 6, rx: 3, class: 'mp-slot' }, svg);
    const u = slots > 0 ? Math.min(1, land / slots) : 0;
    el('rect', { x: bx, y: by, width: bw * u, height: 6, rx: 3, class: 'mp-use' + (u > 0.97 ? ' full' : '') }, svg);
    el('text', { x: f.x, y: by + 17, class: 'mp-fs', 'text-anchor': 'middle' }, svg, `${fmt(land)} / ${fmt(slots)}`);
  }
  // Weather tags
  const wx = (x, y, w, lbl) => el('text', { x, y, class: `mp-wx w${w}` }, svg, `${lbl}: ${WX[w]}`);
  if (view.wx) {
    wx(18, 146, view.wx[1], nar ? 'Wx' : 'Weather');
    wx(18, 196, view.wx[0], nar ? 'Wx' : 'Weather');
    if (!nar) wx(456, 288, view.wx[0], 'Berlin');
  }
  // Traffic dots: one dot per ~40 landings a day.
  const flows = [['north', view.flowN, 'br'], ['south', view.flowS, ''], ['ret', view.flowN + view.flowS, 'ret']];
  for (const [k, n, cls] of flows) {
    const count = Math.max(0, Math.min(12, Math.round(n / 40)));
    const path = lines[k], len = path.getTotalLength ? path.getTotalLength() : 0;
    for (let i = 0; i < count; i++) {
      const dot = el('circle', { r: 3.2, class: 'mp-dot ' + cls }, svg);
      if (reduce || !len) {
        const pt = len ? path.getPointAtLength(len * (i + 0.5) / count) : { x: 0, y: 0 };
        dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
      } else {
        const am = el('animateMotion', { dur: '6s', repeatCount: 'indefinite', begin: `${-(6 * i / count).toFixed(2)}s` }, dot);
        el('mpath', { href: '#mp-' + k }, am);
      }
    }
  }
}
