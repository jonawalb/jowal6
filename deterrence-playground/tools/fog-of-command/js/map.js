// The valley map: a 4 x 4 grid of sectors and Tarn Crossing, with your units, what you have seen of the
// enemy (or, in the review, the truth), orders, the artillery target and fights. Two layouts: wide, and
// a taller one for phones. Colours come from shared tokens through CSS classes.
import { el } from '../../../shared/js/mapkit.js';
import { NODES, EDGES, NODE, COLS, ROWS } from '../data/map.js';
import { TYPES } from '../data/params.js';

const LAYOUTS = {
  wide:   { W: 960, top: 30, cw: 240, ch: 118, xh: 132, k: 1 },
  narrow: { W: 600, top: 34, cw: 150, ch: 176, xh: 150, k: 1.4 },
};

/**
 * Sector rectangles and centres for a layout. flip: the board turned 180 degrees (used when you attack),
 * so the north approach is at the bottom, Tarn Crossing at the top and West on the right. Only positions
 * move; every label is drawn upright.
 */
export function geometry(L, flip = false) {
  const H = L.top + 4 * L.ch + L.xh;
  const gy0 = flip ? L.xh : L.top;
  const G = { ...L, flip, cells: {}, H, gx0: 0, gy0, fy: y => (flip ? H - y : y) };
  for (const n of NODES) {
    if (n.id === 'x') {
      const w = L.cw * 1.3, x = (L.W - w) / 2, h = L.xh - 50, y = flip ? 38 : L.top + 4 * L.ch + 12;
      G.cells.x = { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
    } else {
      const dc = flip ? 3 - n.col : n.col, dr = flip ? 3 - n.row : n.row;
      const x = dc * L.cw, y = gy0 + dr * L.ch;
      G.cells[n.id] = { x, y, w: L.cw, h: L.ch, cx: x + L.cw / 2, cy: y + L.ch / 2 };
    }
  }
  return G;
}

export function createMap(svg, onSector, onKey, narrow, flip = false, onArty = null) {
  const G = geometry(narrow ? LAYOUTS.narrow : LAYOUTS.wide, flip);
  // Your artillery sits fixed in the bottom-right corner, behind your side of the board. Defending, that is
  // the band beside Tarn Crossing below Stonegate; attacking, a strip added below Red's entry edge.
  const pad = flip ? Math.round(46 * G.k) : 0;
  const by = flip ? G.H - G.top + 22 * G.k : G.top + 4 * G.ch + 34 * G.k;
  G.battery = { x: G.W - 64 * G.k, y: by };
  G.Hv = G.H + pad;
  svg.setAttribute('viewBox', `0 0 ${G.W} ${G.Hv}`);
  svg.replaceChildren();
  defs(svg);
  terrain(svg, G);
  const secs = el('g', { class: 'fc-secs' }, svg);
  const nodes = {};
  for (const n of NODES) {
    const c = G.cells[n.id];
    const label = n.id === 'x' ? `${n.name}, the objective` : `${n.name}, ${ROWS[n.row].toLowerCase()}, ${COLS[n.col]} road`;
    const g = el('g', { class: `fc-sec fc-r${n.row}${n.id === 'x' ? ' fc-obj' : ''}`, tabindex: 0, role: 'button', 'data-node': n.id, 'aria-label': label }, secs);
    el('rect', { x: c.x + 2, y: c.y + 2, width: c.w - 4, height: c.h - 4, rx: 3 }, g);
    const t = el('text', { x: n.id === 'x' ? c.cx : c.x + 9, y: c.y + (narrow ? 22 : 18), class: 'fc-name' }, g, n.name);
    if (n.id === 'x') t.setAttribute('text-anchor', 'middle');
    nodes[n.id] = g;
    g.addEventListener('click', () => onSector(n.id));
    g.addEventListener('keydown', e => onKey(e, n.id));
  }
  const layers = { routes: el('g', {}, svg), marks: el('g', {}, svg), foe: el('g', {}, svg), mine: el('g', {}, svg), top: el('g', {}, svg) };
  return { svg, G, nodes, layers, narrow, flip, onArty };
}

function defs(svg) {
  const d = el('defs', {}, svg);
  for (const [id, cls] of [['fc-head', 'fc-headp'], ['fc-head-foe', 'fc-headp foe']]) {
    const mk = el('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, d);
    el('path', { d: 'M0 0L10 5L0 10Z', class: cls }, mk);
  }
}

function terrain(svg, G) {
  const t = el('g', { class: 'fc-terrain', 'aria-hidden': 'true' }, svg);
  el('rect', { x: 0, y: 0, width: G.W, height: G.Hv, class: 'fc-ground' }, t);
  const fy = G.fy;
  const zy = Math.min(fy(0), fy(G.top + G.ch));
  el('rect', { x: 0, y: zy, width: G.W, height: G.top + G.ch + (G.Hv - G.H), class: 'fc-redzone' }, t);
  const z = el('text', { x: G.W / 2, y: G.flip ? G.H - 10 : G.top - 10, class: 'fc-zone' }, t, 'Red enters from the north');
  z.setAttribute('text-anchor', 'middle');
  // River and bridge at the crossing (drawn in unturned coordinates, then turned if needed).
  const ry = G.top + 4 * G.ch + G.xh - 26;
  const P = (x, y) => `${x} ${fy(y)}`;
  el('path', { d: `M${P(0, ry)} C${P(G.W * 0.2, ry - 16)} ${P(G.W * 0.35, ry + 12)} ${P(G.W / 2, ry - 2)} C${P(G.W * 0.65, ry - 14)} ${P(G.W * 0.8, ry + 10)} ${P(G.W, ry - 6)} L${P(G.W, G.H)} L${P(0, G.H)} Z`, class: 'fc-river' }, t);
  el('rect', { x: G.W / 2 - 13, y: G.flip ? fy(ry + 18) : ry - 22, width: 26, height: 40, class: 'fc-bridge' }, t);
  // Terrain hints inside each sector (kept to the lower corners so markers stay readable).
  for (const n of NODES) {
    if (n.id === 'x') continue;
    const c = G.cells[n.id], bx = c.x + c.w - 30, by = c.y + c.h - 16;
    if (n.terrain === 'woods') for (const [dx, dy, r] of [[0, 0, 7], [-12, 3, 6], [-6, -8, 5]]) el('circle', { cx: bx + dx, cy: by + dy, r, class: 'fc-wood' }, t);
    if (n.terrain === 'marsh') for (let i = 0; i < 3; i++) el('path', { d: `M${bx - 16 + i * 4} ${by - 8 + i * 6}h14`, class: 'fc-marsh' }, t);
    if (n.terrain === 'fields') for (let i = 0; i < 2; i++) el('rect', { x: bx - 20 + i * 18, y: by - 8, width: 15, height: 10, class: 'fc-field' }, t);
    if (n.terrain === 'hills') for (const r of [6, 11]) el('ellipse', { cx: bx, cy: by, rx: r * 1.6, ry: r * 0.7, class: 'fc-contour' }, t);
    if (n.terrain === 'village') for (const [dx, dy] of [[-14, -4], [-2, -8], [4, 0]]) el('rect', { x: bx + dx, y: by + dy, width: 8, height: 7, class: 'fc-house' }, t);
    if (n.terrain === 'pass') el('path', { d: `M${bx - 22} ${by + 4}l10 -12l8 7l9 -10l12 15`, class: 'fc-contour' }, t);
  }
  // Roads between sector centres; slow (2-hour) roads dashed; ridges as dotted bands.
  for (const cls of ['fc-road-case', 'fc-road']) for (const [a, b, h] of EDGES) {
    const A = G.cells[a], B = G.cells[b];
    el('path', { d: `M${A.cx} ${A.cy}L${B.cx} ${B.cy}`, class: `${cls}${h > 1 ? ' slow' : ''}` }, t);
  }
  for (const [a, b] of [['n0', 'n1'], ['n1', 'n2'], ['n2', 'n3'], ['f1', 'f2']]) {
    const A = G.cells[a], B = G.cells[b];
    el('path', { d: `M${(A.cx + B.cx) / 2} ${A.y + 8}V${A.y + A.h - 8}`, class: 'fc-ridge' }, t);
  }
  // Sector boundaries: one dashed grid (planning lines, not physical features). Row lines a little
  // stronger than column lines so the four bands read at a glance.
  const b = el('g', { class: 'fc-bounds' }, svg);
  const x1 = G.gx0 + 4 * G.cw, y0 = G.gy0, y1 = G.gy0 + 4 * G.ch;
  for (let i = 1; i < 4; i++) el('path', { d: `M${G.gx0 + i * G.cw} ${y0}V${y1}`, class: 'fc-bound col' }, b);
  for (let i = 1; i < 4; i++) el('path', { d: `M${G.gx0} ${y0 + i * G.ch}H${x1}`, class: 'fc-bound row' }, b);
  el('rect', { x: G.gx0 + 1, y: y0, width: 4 * G.cw - 2, height: 4 * G.ch, class: 'fc-bound edge' }, b);
}

const LETTER = t => TYPES[t]?.letter || '?';

/** Positions for n markers in rows of `per`, starting at (x0, y0), centred in width w. */
function slots(n, per, x0, y0, w, dx, dy) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / per), inRow = Math.min(per, n - r * per), k = i % per;
    out.push([x0 + w / 2 + (k - (inRow - 1) / 2) * dx, y0 + r * dy]);
  }
  return out;
}

/**
 * Draw one moment. v = { me, units (live or snapshot rows with side/node/seg/str/str0/type),
 * pic (a picture of the enemy: belief or truth), mode 'belief'|'truth', routes: [{unit, path, pending}],
 * target (your artillery target), hits (sectors the enemy shelled this hour), fights (sectors), selected }.
 */
export function render(m, v) {
  const { G, layers: L, narrow } = m;
  for (const k in L) L[k].replaceChildren();
  const K = G.k;
  // Your units, grouped by sector (units on the move are drawn at the sector they left).
  const mine = {};
  for (const u of v.units) {
    if (u.side !== v.me || u.broken || u.type === 'arty' || u.node === 'gone') continue;
    const at = u.node && NODE[u.node] ? u.node : u.seg ? u.seg.from : null;
    if (at) (mine[at] ||= []).push(u);
  }
  const foe = {};
  for (const tr of v.pic.tracks) (foe[tr.node] ||= []).push(tr);
  const marks = new Set((v.pic.marks || []).map(x => x.node));
  // Routes first, under everything.
  for (const r of v.routes || []) {
    if (!r.path || r.path.length < 2) continue;
    const d = r.path.map((n, i) => `${i ? 'L' : 'M'}${G.cells[n].cx} ${G.cells[n].cy + 14}`).join('');
    el('path', { d, class: `fc-route${r.pending ? ' pending' : ''}${r.unit === v.selected ? ' sel' : ''}`, 'marker-end': 'url(#fc-head)' }, L.routes);
  }
  for (const n of NODES) {
    const c = G.cells[n.id];
    const own = mine[n.id] || [], seen = foe[n.id] || [];
    const top = c.y + (narrow ? 36 : 30);
    // Enemy row(s) near the top of the sector.
    const perF = narrow ? 3 : 5;
    const sc = seen.length > perF * 2 ? 0.8 : 1;
    const dxF = Math.min(44 * K * sc, (c.w - 12) / perF);
    slots(seen.length, perF, c.x, top + 14 * K, c.w, dxF, 38 * K * sc).forEach((p, i) => diamond(L.foe, p, seen[i], v.mode, K * sc));
    if (!seen.length && marks.has(n.id)) movement(L.marks, [c.cx, top + 14 * K], (v.pic.marks.find(x => x.node === n.id) || {}).age, K);
    // Your units in the lower part.
    const rowsF = seen.length ? Math.ceil(seen.length / perF) : marks.has(n.id) ? 1 : 0;
    const y0 = top + (rowsF ? rowsF * 38 * K * sc + 14 : 14) * 1;
    const per = narrow ? (own.length > 4 ? 3 : 2) : 4;
    const room = c.y + c.h - y0 - 6;
    const need = Math.ceil(own.length / per) * 42 * K;
    const s2 = own.length && need > room ? Math.max(0.5, room / need) : 1;
    const s3 = Math.min(s2, (c.w - 8) / per / (50 * K));
    slots(own.length, per, c.x, y0 + 14 * K * s3, c.w, Math.min(56 * K * s3, (c.w - 6) / per), 42 * K * s3).forEach((p, i) => unitBox(L.mine, p, own[i], v, K * s3, s3 > 0.75 && own.length <= (narrow ? 2 : 3)));
    if (v.fights && v.fights.includes(n.id)) {
      const g = el('g', { class: 'fc-fight', 'data-node': n.id, transform: `translate(${c.x + c.w - 16 * K} ${c.y + 16 * K}) scale(${K})` }, L.top);
      el('circle', { r: 10 }, g); el('path', { d: 'M-5 -5L5 5M5 -5L-5 5' }, g);
      el('title', {}, g, `Fighting in ${n.name}`);
    }
    if (v.hits && v.hits.includes(n.id)) {
      const g = el('g', { class: 'fc-hit', transform: `translate(${c.x + c.w - (v.fights?.includes(n.id) ? 40 : 16) * K} ${c.y + 16 * K}) scale(${K})` }, L.top);
      el('path', { d: 'M0 -10L3 -3L10 -3L4 2L6 10L0 5L-6 10L-4 2L-10 -3L-3 -3Z' }, g);
      el('title', {}, g, `Enemy artillery hit ${n.name} this hour`);
    }
  }
  const arty = v.units.find(u => u.side === v.me && u.type === 'arty' && !u.broken);
  if (arty) battery(m, arty, v);
  if (v.target) {
    const c = G.cells[v.target];
    const g = el('g', { class: 'fc-target', transform: `translate(${c.x + (v.target === 'x' ? 24 : c.w - 22 * K)} ${c.y + c.h - 20 * K}) scale(${K})` }, L.top);
    el('circle', { r: 11 }, g); el('circle', { r: 4 }, g); el('path', { d: 'M0 -16V-7M0 7V16M-16 0H-7M7 0H16' }, g);
    el('title', {}, g, `Your artillery fired on ${NODE[v.target].name} this hour`);
  }
}

function diamond(parent, [x, y], tr, mode, k) {
  const truth = mode === 'truth';
  const cls = ['fc-trk', truth ? 'truth' : ''];
  if (tr.type === 'decoy') cls.push('decoy');
  if (!truth && tr.age > 0) cls.push('old');
  if (!truth && !tr.exact) cls.push('rough');
  const g = el('g', { class: cls.join(' '), transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k})` }, parent);
  if (tr.elem) g.dataset.elem = tr.elem;
  el('path', { d: 'M0 -13L13 0L0 13L-13 0Z' }, g);
  const t = el('text', { y: 4.5, class: 'fc-trk-l' }, g, LETTER(tr.type));
  t.setAttribute('text-anchor', 'middle');
  const lab = tr.type === 'decoy' ? 'decoy' : truth || tr.exact ? `${Math.round(tr.str)}${tr.hp !== undefined && tr.hp < 0.995 ? ` (${Math.round(100 * tr.hp)}%)` : ''}` : `~${tr.str}`;
  const n = el('text', { y: 25, class: 'fc-trk-n' }, g, lab);
  n.setAttribute('text-anchor', 'middle');
  const what = TYPES[tr.type]?.word || 'unit';
  el('title', {}, g, truth ? `${what}, true strength ${Math.round(tr.str)}`
    : tr.type === 'decoy' ? 'Exposed decoy group' : `${what}${tr.exact ? `, strength ${Math.round(tr.str)}${tr.hp !== undefined ? ` (${Math.round(100 * tr.hp)}%)` : ''}` : `, full strength ${tr.str} if not yet hit`}${tr.age > 0 ? `, seen ${tr.age} h ago` : ''}`);
}

function movement(parent, [x, y], age, k) {
  const g = el('g', { class: 'fc-move', transform: `translate(${x} ${y}) scale(${k})` }, parent);
  el('circle', { r: 12 }, g);
  const t = el('text', { y: 4.5, class: 'fc-trk-l' }, g, '?');
  t.setAttribute('text-anchor', 'middle');
  const n = el('text', { y: 25, class: 'fc-trk-n' }, g, 'movement');
  n.setAttribute('text-anchor', 'middle');
  el('title', {}, g, `Movement reported by recon${age ? `, ${age} h old` : ''}. Type and size unknown.`);
}

function unitBox(parent, [x, y], u, v, k, labels) {
  const moving = !!u.seg || (v.routes || []).some(r => r.unit === u.id && !r.pending);
  const g = el('g', { class: `fc-unit ${u.side}${u.id === v.selected ? ' sel' : ''}${moving ? ' moving' : ''}${u.stance === 'give' ? ' give' : ''}`, transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k})`, 'data-unit': u.id }, parent);
  el('rect', { x: -21, y: -13, width: 42, height: 26, rx: 2, class: 'fc-ubox' }, g);
  const t = u.type;
  if (t === 'mech' || t === 'armor') el('ellipse', { cx: 0, cy: 0, rx: 12, ry: 6.5, class: 'glyph' }, g);
  if (t === 'mech') el('path', { d: 'M-21 -13L21 13M21 -13L-21 13', class: 'glyph' }, g);
  if (t === 'recon') el('path', { d: 'M-21 13L21 -13', class: 'glyph' }, g);
  if (t === 'weapons') el('path', { d: 'M-10 8L0 -8L10 8', class: 'glyph' }, g);
  if (t === 'decoy') { const d = el('text', { y: 5, class: 'fc-dl' }, g, 'D'); d.setAttribute('text-anchor', 'middle'); }
  const f = u.str0 ? Math.max(0, u.str / u.str0) : 1;
  if (u.str0) {
    el('rect', { x: -21, y: -19, width: 42, height: 4, class: 'fc-bar0' }, g);
    el('rect', { x: -21, y: -19, width: (42 * f).toFixed(1), height: 4, class: `fc-bar${f < 0.7 ? ' low' : ''}` }, g);
  }
  if (u.key) { const kk = el('text', { x: 17, y: 10, class: 'fc-ukey' }, g, u.key.toUpperCase()); kk.setAttribute('text-anchor', 'end'); }
  if (labels) { const l = el('text', { y: 26, class: 'fc-ulab' }, g, u.short); l.setAttribute('text-anchor', 'middle'); }
  el('title', {}, g, `${u.name}: strength ${u.str.toFixed(1)} of ${u.str0}${u.stance === 'give' ? ', gives ground' : ''}${moving ? ', on the move' : ''}`);
}

/** Your artillery battalion, fixed in the bottom-right corner. Clicking it (or Enter) arms a fire mission. */
function battery(m, u, v) {
  const { x, y } = m.G.battery, k = m.G.k;
  const fired = !!v.target;
  const live = typeof m.onArty === 'function' && v.mode === 'belief' && v.live;
  const g = el('g', { class: `fc-unit fc-bat ${u.side}${u.id === v.selected ? ' sel' : ''}${fired ? ' fired' : ''}`, transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k})`, 'data-unit': u.id }, m.layers.mine);
  if (live) {
    g.setAttribute('tabindex', 0); g.setAttribute('role', 'button');
    g.setAttribute('aria-label', fired ? 'Your artillery (fixed): it has fired this hour' : 'Your artillery (fixed): press to choose a sector to fire on');
    g.addEventListener('click', () => m.onArty(u.id));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); m.onArty(u.id); } });
  }
  el('rect', { x: -21, y: -13, width: 42, height: 26, rx: 2, class: 'fc-ubox' }, g);
  el('circle', { cx: 0, cy: 0, r: 4.5, class: 'glyph fc-batdot' }, g);
  if (u.key) { const kk = el('text', { x: 17, y: 10, class: 'fc-ukey' }, g, u.key.toUpperCase()); kk.setAttribute('text-anchor', 'end'); }
  const l = el('text', { y: 26, class: 'fc-ulab' }, g, 'Artillery (fixed)');
  l.setAttribute('text-anchor', 'middle');
  el('title', {}, g, `${u.name}: fixed behind your line; it cannot move or be attacked. ${fired ? 'It has fired this hour.' : live ? 'Click it, or press A, then click a sector to fire.' : ''}`.trim());
}
