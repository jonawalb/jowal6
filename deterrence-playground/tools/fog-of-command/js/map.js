// The valley map: terrain art, clickable sectors, Blue units, Red tracks (your picture or the truth),
// orders in transit, the drone and fights. Colours come from shared tokens through CSS classes.
import { el } from '../../../shared/js/mapkit.js';
import { NODES, EDGES, W, H } from '../data/map.js';

const C = Object.fromEntries(NODES.map(n => [n.id, n.c]));
const NORTH_IDS = new Set(NODES.filter(n => n.row === 'north').map(n => n.id));
const LETTER = { armor: 'T', mech: 'M', recon: 'R', decoy: 'D' };
const lerp = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
const pts = p => p.map(q => q.join(',')).join(' ');

export function createMap(svg, onSector) {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  terrain(svg);
  const secs = el('g', { class: 'fc-secs' }, svg);
  const nodes = {};
  for (const n of NODES) {
    const g = el('g', { class: `fc-sec fc-${n.row}`, tabindex: 0, role: 'button', 'data-node': n.id, 'aria-label': n.name }, secs);
    el('polygon', { points: pts(n.poly) }, g);
    const lab = el('text', { x: n.c[0], y: n.poly.reduce((m, p) => Math.min(m, p[1]), 999) + 22, class: 'fc-name' }, g, n.name);
    lab.setAttribute('text-anchor', 'middle');
    nodes[n.id] = g;
    g.addEventListener('click', () => onSector(n.id));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSector(n.id); } });
  }
  const layers = { est: el('g', { class: 'fc-est' }, svg), arrows: el('g', {}, svg), red: el('g', {}, svg), fights: el('g', {}, svg), blue: el('g', {}, svg), drone: el('g', {}, svg) };
  return { svg, nodes, layers };
}

function terrain(svg) {
  const t = el('g', { class: 'fc-terrain', 'aria-hidden': 'true' }, svg);
  el('rect', { x: 0, y: 0, width: W, height: H, class: 'fc-ground' }, t);
  el('rect', { x: 0, y: 0, width: W, height: 44, class: 'fc-redzone' }, t);
  const rz = el('text', { x: W / 2, y: 28, class: 'fc-zone' }, t, 'Red approaches from the north');
  rz.setAttribute('text-anchor', 'middle');
  // Ridges between the passes.
  for (const x of [298, 604]) el('path', { d: `M${x - 18} 48 C${x + 10} 90 ${x - 16} 150 ${x + 6} 214`, class: 'fc-ridge' }, t);
  // Woods, fields, hills.
  for (const [x, y, r] of [[60, 280, 16], [96, 300, 20], [210, 350, 18], [240, 300, 14], [70, 360, 17], [130, 380, 13], [180, 260, 12]]) el('circle', { cx: x, cy: y, r, class: 'fc-wood' }, t);
  for (let i = 0; i < 4; i++) el('rect', { x: 330 + i * 62, y: 346, width: 52, height: 34, class: 'fc-field' }, t);
  for (const r of [26, 46, 66]) el('ellipse', { cx: 800, cy: 356, rx: r * 1.4, ry: r * 0.6, class: 'fc-contour' }, t);
  // River and bridge.
  el('path', { d: `M0 590 C160 570 300 600 450 584 C600 570 760 600 ${W} 580 L${W} ${H} L0 ${H} Z`, class: 'fc-river' }, t);
  el('rect', { x: 436, y: 562, width: 28, height: 44, class: 'fc-bridge' }, t);
  for (const [x, y] of [[400, 510], [424, 522], [480, 508], [500, 524], [452, 530]]) el('rect', { x, y, width: 16, height: 12, class: 'fc-house' }, t);
  const rear = el('text', { x: W / 2, y: 626, class: 'fc-zone' }, t, 'Rear area');
  rear.setAttribute('text-anchor', 'middle');
  // Roads.
  for (const cls of ['fc-road-case', 'fc-road']) for (const [a, b, h] of EDGES) el('path', { d: `M${C[a].join(' ')}L${C[b].join(' ')}`, class: `${cls}${h > 1 ? ' slow' : ''}` }, t);
}

/** Positions of up to n markers in a row centred on (x, y). */
const row = (x, y, n, gap) => Array.from({ length: n }, (_, i) => [x + (i - (n - 1) / 2) * gap, y]);

function diamond(g, [x, y], tr, mode, k = 1) {
  const s = 15, cls = ['fc-trk', mode];
  if (tr.falseC) cls.push('false');
  if (tr.type === 'decoy') cls.push('decoy');
  const a = mode === 'belief' ? Math.max(0.35, 1 - tr.age / 5) : 1;
  const d = el('g', { class: cls.join(' '), transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k})`, opacity: a.toFixed(2) }, g);
  el('path', { d: `M0 ${-s}L${s} 0L0 ${s}L${-s} 0Z` }, d);
  const letter = el('text', { y: 5, class: 'fc-trk-l' }, d, tr.type ? LETTER[tr.type] : '?');
  letter.setAttribute('text-anchor', 'middle');
  const lab = mode === 'truth' ? `${Math.round(tr.est)}` : tr.type === 'decoy' ? '' : tr.str != null ? `~${tr.str}` : '';
  if (lab) { const t = el('text', { y: s + 13, class: 'fc-trk-n' }, d, lab); t.setAttribute('text-anchor', 'middle'); }
  const title = mode === 'truth' ? `${tr.name || tr.type} (true), strength ${Math.round(tr.est)}`
    : `${tr.type ? tr.type : 'Unidentified contact'}${tr.str != null ? `, about ${tr.str}` : ''}, seen ${tr.age.toFixed(1)} h ago (${tr.word})`;
  el('title', {}, d, title);
}

/**
 * Draw one moment. view = { units (live or snapshot), pic (belief or truth summary), mode: 'belief'|'truth'|'both',
 * truthPic (for 'both'), orders (pending), drone, fights (this hour), selected }.
 */
export function render(m, v) {
  const L = m.layers, K = v.narrow ? 1.5 : 1;
  for (const k in L) L[k].replaceChildren();
  // Red estimate per sector.
  const pic = v.mode === 'truth' ? v.truthPic : v.pic;
  for (const n of NODES) {
    const val = pic.node[n.id];
    if (!val && v.mode !== 'truth') continue;
    if (!val) continue;
    const [x, y] = [n.c[0], n.poly.reduce((mm, p) => Math.min(mm, p[1]), 999) + 42];
    const t = el('text', { x, y, class: `fc-estt ${v.mode === 'truth' ? 'truth' : ''}` }, L.est, v.mode === 'truth' ? `Red ${Math.round(val)}` : `Red est. ${Math.round(val)}`);
    t.setAttribute('text-anchor', 'middle');
  }
  // Red markers, grouped by sector.
  const draw = (p, mode, dy, sc = 1) => {
    const by = {};
    for (const tr of p.tracks) (by[tr.node] ||= []).push(tr);
    for (const [node, list] of Object.entries(by)) {
      const [x, y] = C[node];
      const perRow = v.narrow ? 4 : 6;
      list.forEach((tr, i) => {
        const r = Math.floor(i / perRow), inRow = Math.min(perRow, list.length - r * perRow);
        const pos = row(x, y + dy + r * 40 * K * sc - (v.narrow ? 14 : 0), inRow, 36 * K * sc)[i % perRow];
        diamond(L.red, pos, tr, mode, K * sc);
      });
    }
  };
  L.red.setAttribute('class', v.mode === 'both' ? 'fc-both' : '');
  if (v.mode === 'both') { draw(v.truthPic, 'truth', -12 * K, 0.8); draw(v.pic, 'belief', 16 * K, 0.8); }
  else draw(pic, v.mode === 'truth' ? 'truth' : 'belief', -6);
  // Fights this hour.
  for (const f of v.fights || []) {
    const [x, y] = C[f.node];
    const g = el('g', { class: 'fc-fight', transform: `translate(${x + 118} ${y - 36 - (K - 1) * 20}) scale(${K})` }, L.fights);
    el('circle', { r: 13 }, g);
    el('path', { d: 'M-6 -6L6 6M6 -6L-6 6' }, g);
    el('title', {}, g, `Fighting in ${NODES.find(n => n.id === f.node).name}`);
  }
  // Orders: dashed = sent, not yet received; solid = received, moving.
  for (const o of v.orders || []) {
    const u = v.units.find(x => x.id === o.unit);
    const from = u.node && C[u.node] ? C[u.node] : u.seg ? lerp(C[u.seg.from], C[u.seg.to], 0.5) : null;
    if (!from) continue;
    const to = C[o.dest];
    el('path', { d: `M${from[0]} ${from[1] + 34}L${to[0]} ${to[1] + 30}`, class: `fc-arrow ${o.state}`, 'marker-end': 'url(#fc-head)' }, L.arrows);
  }
  // Blue units.
  const byNode = {};
  for (const u of v.units) if (u.side === 'blue') {
    if (u.broken || u.node === 'rear') continue;
    const key = u.node || `${u.seg.from}>${u.seg.to}`;
    (byNode[key] ||= []).push(u);
  }
  for (const [key, list] of Object.entries(byNode)) {
    const base = key.includes('>') ? lerp(C[key.split('>')[0]], C[key.split('>')[1]], 0.5) : C[key];
    row(base[0], base[1] + (v.narrow ? 28 : NORTH_IDS.has(key) ? 54 : 40), list.length, 58 * K).forEach((p, i) => blueUnit(L.blue, p, list[i], v.selected, !!key.includes('>'), K));
  }
  if (v.drone) {
    const [x, y] = C[v.drone];
    const g = el('g', { class: 'fc-drone', transform: `translate(${x - 118} ${y - 36 - (K - 1) * 20}) scale(${K})` }, L.drone);
    el('circle', { r: 14 }, g);
    el('path', { d: 'M-9 0H9M0 -9V9' }, g);
    el('title', {}, g, 'Drone tasked here this hour');
  }
}

export const INFO = {
  a: { t: 'mech', n: '1 Mech' }, b: { t: 'mech', n: '2 Mech' }, e: { t: 'mech', n: '3 Mech' },
  c: { t: 'recon', n: 'Recon' }, d: { t: 'armor', n: 'Armor' },
};

function blueUnit(g, [x, y], u, selected, moving, k = 1) {
  const info = INFO[u.id];
  const s = el('g', { class: `fc-blue${u.id === selected ? ' sel' : ''}${moving ? ' moving' : ''}`, transform: `translate(${x} ${y}) scale(${k})`, 'data-unit': u.id }, g);
  el('rect', { x: -22, y: -14, width: 44, height: 28, rx: 2 }, s);
  if (info.t === 'mech' || info.t === 'armor') el('ellipse', { cx: 0, cy: 0, rx: 13, ry: 7, class: 'glyph' }, s);
  if (info.t === 'mech') el('path', { d: 'M-22 -14L22 14M22 -14L-22 14', class: 'glyph' }, s);
  if (info.t === 'recon') el('path', { d: 'M-22 14L22 -14', class: 'glyph' }, s);
  const t = el('text', { y: 28, class: 'fc-blue-l' }, s, info.n);
  t.setAttribute('text-anchor', 'middle');
  const f = Math.max(0, u.str / (u.str0 || 1));
  el('rect', { x: -22, y: -20, width: 44, height: 4, class: 'fc-bar0' }, s);
  el('rect', { x: -22, y: -20, width: (44 * f).toFixed(1), height: 4, class: `fc-bar${f < 0.7 ? ' low' : ''}` }, s);
  el('title', {}, s, `${info.n}: strength ${u.str.toFixed(1)} of ${u.str0}${moving ? ', on the move' : ''}`);
}

export function addDefs(svg) {
  const defs = el('defs', {}, null);
  const mk = el('marker', { id: 'fc-head', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
  el('path', { d: 'M0 0L10 5L0 10Z', class: 'fc-headp' }, mk);
  svg.insertBefore(defs, svg.firstChild);
}
