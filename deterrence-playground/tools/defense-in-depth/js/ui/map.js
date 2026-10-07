// The map (SPEC §8.2): one SVG, one <g id="world"> moved by js/ui/mapview.js. setGame() draws the ground once
// per game (terrain, names, zone bands, sector hit areas); render(view) redraws the live layers from a view model
// built by js/ui/view.js, so this file holds no game logic. Below 28 screen px per sector the units collapse
// into one stack chip per side (level of detail); tapping a sector then opens the sector sheet.
import { el } from '../../../../shared/js/mapkit.js';
import { TERRAIN } from '../../data/terrain.js';
import { gridFor } from '../grid.js';
import { createView } from './mapview.js';

export const CELL = 60;
const LOD_PX = 28;
const ZONE_LABEL = { assembly: 'Assembly', nml: 'No-man’s land', outpost: 'Outpost zone', battle: 'Battle zone', switch: 'Switch line', second: 'Second position', rear: 'Rear zone' };
const LAYERS = ['zones', 'cover', 'guns', 'works', 'barrage', 'plan', 'obj', 'lanes', 'routes', 'hint', 'units', 'enemy', 'badges', 'fx'];

/** handlers: { onSector(sec, e), onUnit(id, e), onKey(e, sec), onZoom() } */
export function createMap(svg, handlers) {
  const m = { svg, handlers, G: null, flip: false, L: {}, secs: [], lod: false, view: null };
  svg.replaceChildren();
  m.world = el('g', { id: 'world' }, svg);
  m.base = el('g', { class: 'dd-base' }, m.world);
  for (const k of LAYERS.slice(0, 9)) m.L[k] = el('g', { class: `dd-l-${k}` }, m.world);
  m.hit = el('g', { class: 'dd-hits' }, m.world);          // hit areas: over the ground, under the unit chips
  for (const k of LAYERS.slice(9)) m.L[k] = el('g', { class: `dd-l-${k}` }, m.world);
  m.mv = createView(svg, m.world, () => {
    const lod = m.G ? CELL * m.mv.k < LOD_PX : false;
    if (lod !== m.lod) { m.lod = lod; svg.classList.toggle('dd-lod', lod); if (m.view) drawUnits(m, m.view); }
    handlers.onZoom && handlers.onZoom();
  });
  svg.addEventListener('click', e => {
    if (m.mv.dragged()) return;
    const u = e.target.closest('[data-u]');
    if (u && !m.lod) { handlers.onUnit(u.dataset.u, e); return; }
    const s = e.target.closest('[data-s]');
    if (s) handlers.onSector(+s.dataset.s, e);
  });
  svg.addEventListener('keydown', e => {
    const s = e.target.closest('[data-s]');
    if (s) handlers.onKey(e, +s.dataset.s);
  });
  return m;
}

/** Screen-grid position (column, row) of a sector: the board turns when you attack (D-06). */
export function cellXY(m, sec) {
  const G = m.G, r = G.row[sec], c = G.col[sec];
  return m.flip ? [(G.cols - 1 - c) * CELL, (G.rows - 1 - r) * CELL] : [c * CELL, r * CELL];
}
const mid = (m, sec) => { const [x, y] = cellXY(m, sec); return [x + CELL / 2, y + CELL / 2]; };

/** Draw the ground for a game (once per game, or when the board turns). */
export function setGame(m, g, me) {
  const G = gridFor(g.scale);
  m.G = G; m.flip = me === 'att'; m.g = g;
  m.base.replaceChildren(); m.hit.replaceChildren();
  for (const k of LAYERS) m.L[k].replaceChildren();
  const W = G.cols * CELL, H = G.rows * CELL;
  el('rect', { x: 0, y: 0, width: W, height: H, class: 'dd-ground' }, m.base);
  const T = g.sectors.terrain, E = g.sectors.elev;
  for (let s = 0; s < G.n; s++) {
    const [x, y] = cellXY(m, s), t = TERRAIN[T[s]];
    el('rect', { x, y, width: CELL, height: CELL, class: `dd-t dd-t-${t.key} dd-e${E[s]}` }, m.base);
    if (t.key === 'woods') for (const [dx, dy] of [[16, 18], [38, 14], [27, 34], [44, 40], [14, 44]]) el('circle', { cx: x + dx, cy: y + dy, r: 6.5, class: 'dd-tree' }, m.base);
    if (t.key === 'village') for (const [dx, dy] of [[14, 16], [32, 12], [22, 32], [40, 30], [30, 46]]) el('rect', { x: x + dx, y: y + dy, width: 9, height: 8, class: 'dd-house' }, m.base);
    if (t.key === 'broken') for (const [dx, dy] of [[12, 40], [40, 20], [30, 48]]) el('circle', { cx: x + dx, cy: y + dy, r: 4, class: 'dd-crater' }, m.base);
  }
  // Ridge crest line along the crest row's enemy-facing edge, and the reverse slope behind it.
  const cy = m.flip ? (G.rows - 1 - G.crest) * CELL + CELL : G.crest * CELL;
  el('path', { d: `M0 ${cy}H${W}`, class: 'dd-ridge' }, m.base);
  el('text', { x: W - 6, y: cy + (m.flip ? 14 : -5), class: 'dd-ridge-l', 'text-anchor': 'end' }, m.base, g.sectors.ridge || 'the ridge');
  for (let s = 0; s < G.n; s++) {
    const nm = g.sectors.name[s];
    if (!nm) continue;
    const [x, y] = cellXY(m, s);
    nameLabel(m.base, x, y, nm);
  }
  for (let s = 0; s < G.n; s++) {
    const [x, y] = cellXY(m, s);
    const gr = el('g', { class: 'dd-sec', 'data-s': s, tabindex: -1, role: 'button', 'aria-label': secLabel(g, s) }, m.hit);
    el('rect', { x, y, width: CELL, height: CELL }, gr);
  }
  m.secs = [...m.hit.children];
  m.mv.setWorld(W, H, m.flip ? 'bottom' : 'top');
}

// 2026-10-06 audit: place names ran into the next box ("HAZEL SPINNEYWILLOW WOOD" on phones) and were cut off at
// the board's edges. A name now stays inside its own box: two lines when it is two words and too wide for one,
// and a line still too wide is squeezed to fit. Widths are estimated per character (the Trailer graphics' capitals
// are the wider case), so the fit does not depend on fonts having loaded.
const NAME_MAX = CELL - 6, NAME_CH = 6.8, NAME_LH = 11;
function nameLabel(parent, x, y, nm) {
  const w = t => t.length * NAME_CH, words = nm.split(' ');
  let lines = [nm];
  if (words.length > 1 && w(nm) > NAME_MAX) {
    let best = null;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      if (!best || Math.max(w(a), w(b)) < Math.max(w(best[0]), w(best[1]))) best = [a, b];
    }
    lines = best;
  }
  lines.forEach((ln, i) => {
    const at = { x: x + CELL / 2, y: y + CELL - 5 - (lines.length - 1 - i) * NAME_LH, class: 'dd-name', 'text-anchor': 'middle' };
    if (w(ln) > NAME_MAX) Object.assign(at, { textLength: NAME_MAX, lengthAdjust: 'spacingAndGlyphs' });
    el('text', at, parent, ln);
  });
}

const COLN = i => (i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(39 + i));
export function secLabel(g, s) {
  const G = gridFor(g.scale), nm = g.sectors.name[s];
  return `${nm ? nm + ', ' : ''}sector ${COLN(G.col[s])}${G.row[s] + 1}, ${TERRAIN[g.sectors.terrain[s]].label.toLowerCase()}, ${ZONE_LABEL[G.zone[s]].toLowerCase()}`;
}

/** Redraw the live layers. v: view model from js/ui/view.js. */
export function render(m, v) {
  m.view = v;
  const on = k => v.layers.has(k);
  drawZones(m, v, on('zones'));
  drawCover(m, v, on('cover'));
  drawGuns(m, v, on('guns'));
  drawWorks(m, v, on('obst'));
  drawBarrage(m, v, on('barrage'));
  drawPlan(m, v);
  drawObj(m, v);
  drawLanes(m, v, on('lanes'));
  drawRoutes(m, v);
  drawUnits(m, v);
  drawEnemy(m, v, on('enemy'));
  drawBadges(m, v, on('windows'), on('race'));
  drawHint(m, v);
}

function drawZones(m, v, on) {
  const L = m.L.zones; L.replaceChildren();
  if (!on) return;
  const G = m.G, S = G.S, W = G.cols * CELL;
  const oy = v.obj ? objY(m, v.obj.row) : null;
  for (const z of ['assembly', 'nml', 'outpost', 'battle', 'switch', 'second', 'rear']) {
    const b = S.bands[z];
    if (!b) continue;
    const r0 = m.flip ? G.rows - 1 - b[1] : b[0], h = (b[1] - b[0] + 1) * CELL;
    el('rect', { x: 0, y: r0 * CELL, width: W, height: h, class: `dd-zone dd-z-${z}` }, L);
    el('path', { d: `M0 ${r0 * CELL}H${W}`, class: 'dd-zline' }, L);
    // The objective's name sits just below its line, at the left: a zone label starting on that line goes under it.
    el('text', { x: 6, y: r0 * CELL + 15 + (r0 * CELL === oy ? 16 : 0), class: 'dd-zlab' }, L, ZONE_LABEL[z]);
  }
}

function drawCover(m, v, on) {
  const L = m.L.cover; L.replaceChildren();
  if (!on || !v.cover) return;
  for (let s = 0; s < m.G.n; s++) {
    const n = v.cover[s];
    if (!n) continue;
    const [x, y] = cellXY(m, s);
    el('rect', { x: x + 1, y: y + 1, width: CELL - 2, height: CELL - 2, class: `dd-cov c${Math.min(3, n)}` }, L);
    el('text', { x: x + CELL - 5, y: y + 13, class: 'dd-covn', 'text-anchor': 'end' }, L, n >= 3 ? '3+' : String(n));
  }
}

function drawGuns(m, v, on) {
  const L = m.L.guns; L.replaceChildren();
  if (!on || !v.outGuns) return;
  for (let s = 0; s < m.G.n; s++) if (v.outGuns[s]) { const [x, y] = cellXY(m, s); el('rect', { x, y, width: CELL, height: CELL, class: 'dd-outguns' }, L); }
}

function drawWorks(m, v, on) {
  const L = m.L.works; L.replaceChildren();
  const w = v.works;
  if (!w || !on) return;
  for (let s = 0; s < m.G.n; s++) {
    const k = w[s];
    if (!k) continue;
    const [x, y] = cellXY(m, s), fy = m.flip ? y + CELL - 8 : y + 8;   // the enemy-facing edge
    if (k.trench) {
      const d = k.trench === 2 ? `M${x + 30} ${y + 6}l-5 8l10 8l-10 8l10 8l-10 8l5 8` : `M${x + 4} ${y + 30}l8 -5l8 10l8 -10l8 10l8 -10l8 5`;
      el('path', { d, class: `dd-trench${k.own ? '' : ' seen'}` }, L);
    }
    if (k.comm) el('path', { d: `M${x + 46} ${y}V${y + CELL}`, class: 'dd-comm' }, L);
    if (k.obst) el('path', { d: Array.from({ length: 6 }, (_, i) => `M${x + 6 + i * 8} ${fy - 3}l5 6M${x + 11 + i * 8} ${fy - 3}l-5 6`).join(''), class: `dd-wire${k.obstC ? ' hidden' : ''}` }, L);
    if (k.strong) el('path', { d: `M${x + 18} ${y + 18}h24v24h-24z`, class: `dd-strong${k.strong === 2 ? ' concrete' : ''}${k.dummy ? ' dummy' : ''}${k.exposed ? ' exposed' : ''}` }, L);
    if (k.dugout) el('path', { d: `M${x + 8} ${y + 52}a5 5 0 0 1 10 0M${x + 20} ${y + 52}a5 5 0 0 1 10 0`, class: 'dd-dug' }, L);
  }
}

function drawBarrage(m, v, on) {
  const L = m.L.barrage; L.replaceChildren();
  if (!on || !v.barrage) return;
  for (const [cls, list] of [['now', v.barrage.now], ['next', v.barrage.next], ['sos', v.barrage.sos || []], ['mission', v.barrage.missions || []]]) {
    for (const s of list) { const [x, y] = cellXY(m, s); el('rect', { x: x + 2, y: y + 2, width: CELL - 4, height: CELL - 4, class: `dd-bar ${cls}` }, L); }
  }
}

function drawPlan(m, v) {
  const L = m.L.plan; L.replaceChildren();
  const p = v.plan;
  if (!p) return;
  const G = m.G;
  if (p.mainCols) for (const c of p.mainCols) {
    const x = (m.flip ? G.cols - 1 - c : c) * CELL;
    el('rect', { x, y: 0, width: CELL, height: G.rows * CELL, class: 'dd-main' }, L);
  }
  if (p.fixCols) for (const c of p.fixCols) { const x = (m.flip ? G.cols - 1 - c : c) * CELL; el('rect', { x, y: 0, width: CELL, height: G.rows * CELL, class: 'dd-fixcol' }, L); }
  for (const s of p.marks || []) { const [x, y] = cellXY(m, s.sec); el('text', { x: x + 4, y: y + CELL - 6, class: `dd-pmark ${s.cls || ''}` }, L, s.text); }
  for (const r of p.paths || []) pathLine(m, L, r.path, `dd-proute ${r.cls || ''}`);
}

function drawObj(m, v) {
  const L = m.L.obj; L.replaceChildren();
  const o = v.obj;
  if (!o) return;
  const G = m.G, y = objY(m, o.row);
  el('path', { d: `M0 ${y}H${G.cols * CELL}`, class: 'dd-objline' }, L);
  // 2026-10-06 audit: at the left edge, below the line (clear of the zoom buttons at the top right of the map and of
  // the place names along the bottom of the boxes above the line); the zone label that starts here moves down a line.
  el('text', { x: 6, y: y + 16, class: 'dd-objname' }, L, `Objective: ${o.name}`);
  (o.held || []).forEach((h, c) => {
    if (!h) return;
    const [x, yy] = cellXY(m, G.idx(o.row, c));
    el('rect', { x: x + 2, y: yy + 2, width: CELL - 4, height: CELL - 4, class: 'dd-objheld' }, L);
  });
}

/** Screen y of the objective line: the enemy-facing edge of the objective row (it turns with the board). */
const objY = (m, row) => (m.flip ? m.G.rows - 1 - row : row) * CELL + (m.flip ? CELL : 0);

function pathLine(m, L, path, cls) {
  if (!path || path.length < 2) return null;
  return el('path', { d: path.map((s, i) => { const [x, y] = mid(m, s); return `${i ? 'L' : 'M'}${x} ${y}`; }).join(''), class: cls }, L);
}

function drawLanes(m, v, on) {
  const L = m.L.lanes; L.replaceChildren();
  if (!on) return;
  for (const ln of v.lanes || []) {
    if (!ln.cells.length) continue;
    const [x0, y0] = mid(m, ln.from), [x1, y1] = mid(m, ln.cells[ln.cells.length - 1]);
    const ang = Math.atan2(y1 - y0, x1 - x0), w = 0.13, len = Math.hypot(x1 - x0, y1 - y0) + CELL * 0.35;
    const p = a => `${x0 + Math.cos(a) * len} ${y0 + Math.sin(a) * len}`;
    el('path', { d: `M${x0} ${y0}L${p(ang - w)}L${p(ang + w)}Z`, class: `dd-lane ${ln.enf}${ln.sel ? ' sel' : ''}${ln.foe ? ' foe' : ''}` }, L);
    if (ln.enf === 'enf') el('path', { d: `M${p(ang)}m-6 -6l6 6l-6 6m-6 -12l6 6l-6 6`, class: 'dd-chev', transform: `rotate(${ang * 180 / Math.PI} ${p(ang).split(' ').join(' ')})` }, L);
  }
}

function drawRoutes(m, v) {
  const L = m.L.routes; L.replaceChildren();
  for (const r of v.routes || []) pathLine(m, L, r.path, `dd-route${r.pending ? ' pending' : ''}${r.sel ? ' sel' : ''}${r.cs ? ' cs' : ''}`);
}

/** Slots for n chips in a sector: 2 x 2 up to 4, 3 x 3 up to 9. */
const slots = n => (n <= 4 ? [[3, 3], [31, 3], [3, 31], [31, 31]].map(([x, y]) => [x, y, 26]) : Array.from({ length: 9 }, (_, i) => [2 + (i % 3) * 19, 2 + Math.floor(i / 3) * 19, 18]));

function drawUnits(m, v) {
  const L = m.L.units; L.replaceChildren();
  const by = new Map();
  for (const u of v.units || []) { if (!by.has(u.sec)) by.set(u.sec, []); by.get(u.sec).push(u); }
  for (const [sec, list] of by) {
    const [x, y] = cellXY(m, sec);
    if (m.lod || list.length > 9) { stackChip(L, x, y, list, false); continue; }
    const sl = slots(list.length);
    list.forEach((u, i) => chip(L, x + sl[i][0], y + sl[i][1], sl[i][2], u));
  }
}

function stackChip(L, x, y, list, foe) {
  const hp = list.reduce((a, u) => a + (u.hp ?? 1), 0) / list.length, sel = list.some(u => u.sel);
  const g = el('g', { class: `dd-stack ${foe ? 'foe' : 'mine'}${sel ? ' sel' : ''}${list.every(u => u.dim) ? ' dim' : ''}` }, L);
  const ox = foe ? 30 : 4, oy = foe ? 4 : 30;
  el('rect', { x: x + ox, y: y + oy, width: 26, height: 26, rx: 3, class: 'dd-ubox' }, g);
  el('text', { x: x + ox + 13, y: y + oy + 17, class: 'dd-glyph', 'text-anchor': 'middle' }, g, String(list.length));
  hpBar(g, x + ox + 2, y + oy + 22, 22, hp);
}

function hpBar(g, x, y, w, hp) {
  el('rect', { x, y, width: w, height: 3.5, class: 'dd-hp0' }, g);
  el('rect', { x, y, width: Math.max(0, Math.min(1, hp)) * w, height: 3.5, class: 'dd-hp' }, g);
}

function chip(L, x, y, s, u) {
  const g = el('g', { class: `dd-unit mine${u.sel ? ' sel' : ''}${u.dim ? ' dim' : ''}${u.idle ? ' idle' : ''}${u.bat ? ' bat' : ''}`, 'data-u': u.id }, L);
  el('rect', { x, y, width: s, height: s, rx: u.bat ? s / 2 : 3, class: 'dd-ubox' }, g);
  el('text', { x: x + s / 2, y: y + s * 0.62, class: 'dd-glyph', 'text-anchor': 'middle', style: `font-size:${Math.round(s * 0.5)}px` }, g, u.letter);
  if (u.hp != null) hpBar(g, x + 2, y + s - 5, s - 4, u.hp);
  if (u.mark) el('text', { x: x + s - 1, y: y + 8, class: 'dd-umark', 'text-anchor': 'end' }, g, u.mark);
  if (u.late) el('circle', { cx: x + 3, cy: y + 3, r: 3.5, class: 'dd-late' }, g);
  if (u.idle) el('text', { x: x + 2, y: y + 9, class: 'dd-idle' }, g, '!');
  el('title', {}, g, u.title || u.id);
}

function drawEnemy(m, v, on) {
  const L = m.L.enemy; L.replaceChildren();
  if (!on) return;
  const by = new Map();
  for (const t of v.tracks || []) { if (!by.has(t.sec)) by.set(t.sec, []); by.get(t.sec).push(t); }
  for (const [sec, list] of by) {
    const [x, y] = cellXY(m, sec);
    if (m.lod || list.length > 3) { stackChip(L, x, y, list, true); continue; }
    list.forEach((t, i) => {
      const cx = x + 44 - i * 15, cy = y + 16 + i * 6;
      const g = el('g', { class: `dd-trk${t.exact ? ' exact' : ''}${t.age ? ' old' : ''}${t.truth ? ' truth' : ''}` }, L);
      el('path', { d: `M${cx} ${cy - 12}l12 12l-12 12l-12 -12z`, class: 'dd-tbox' }, g);
      el('text', { x: cx, y: cy + 4, class: 'dd-tl', 'text-anchor': 'middle' }, g, t.exact || t.truth ? t.letter : `${t.letter}~`);
      if (t.hp != null) hpBar(g, cx - 10, cy + 14, 20, t.hp);
      el('title', {}, g, t.title || 'Enemy unit');
    });
  }
  for (const mk of v.marks || []) {
    const [x, y] = mid(m, mk.sec);
    const g = el('g', { class: 'dd-move' }, L);
    el('circle', { cx: x, cy: y, r: 13 }, g);
    el('text', { x, y: y + 5, class: 'dd-tl', 'text-anchor': 'middle' }, g, '?');
  }
}

function drawBadges(m, v, wins, race) {
  const L = m.L.badges; L.replaceChildren();
  if (wins) for (const b of v.lodg || []) {
    const [x, y] = cellXY(m, b.sec);
    const g = el('g', { class: `dd-win ${b.badge}` }, L);
    // Top-right corner (2026-10-06: at the bottom right it covered the place name).
    el('circle', { cx: x + CELL - 10, cy: y + 10, r: 8 }, g);
    el('path', { d: `M${x + CELL - 10} ${y + 5}v5l3.5 2.5`, class: 'dd-hand' }, g);
    el('title', {}, g, b.title);
  }
  if (race && v.race) {
    const [x, y] = cellXY(m, v.race.sec);
    const g = el('g', { class: `dd-race ${v.race.first}` }, L);
    el('rect', { x: x - 2, y: y - 18, width: CELL + 4, height: 16, rx: 3 }, g);
    el('text', { x: x + CELL / 2, y: y - 6, 'text-anchor': 'middle' }, g, v.race.text);
  }
}

function drawHint(m, v) {
  const L = m.L.hint; L.replaceChildren();
  for (const s of v.hint || []) { const [x, y] = cellXY(m, s); el('rect', { x: x + 1.5, y: y + 1.5, width: CELL - 3, height: CELL - 3, class: 'dd-hintc' }, L); }
  for (const s of v.focus || []) { const [x, y] = cellXY(m, s); el('rect', { x: x + 1, y: y + 1, width: CELL - 2, height: CELL - 2, class: 'dd-hl' }, L); }
}

/** Roving tabindex: make sector s the one Tab reaches, and focus it if asked. */
export function focusSector(m, s, focus = true) {
  if (!m.secs.length || s < 0) return;
  for (const n of m.secs) if (n.tabIndex === 0) n.tabIndex = -1;
  const n = m.secs[s];
  n.tabIndex = 0;
  if (focus) { n.focus({ preventScroll: true }); m.mv.ensure(...cellXY(m, s), CELL); }
}

/** Screen-direction arrow keys to a sector step (the board may be turned). */
export function stepSector(m, s, key) {
  const d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[key];
  if (!d) return -1;
  const f = m.flip ? -1 : 1;
  return m.G.idx(m.G.row[s] + d[0] * f, m.G.col[s] + d[1] * f);
}
