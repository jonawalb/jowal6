// Map: projection, basemap, the probability glow, footprint shapes and the placement preview.
// What goes on top (sensors, contacts, the true track) is drawn by layers.js.
import { createProjection, drawBasemap, el, circlePath, svgPoint } from '../../../shared/js/mapkit.js';
import { LAND, BOX } from '../data/land.js';
import { ROUTES, SENSORS, GAME } from '../data/params.js';
import { HEAT } from './filter.js';
import { lineEnds, buoyPoints } from './sensors.js';
import { step, bearing, dist, isLand } from './geo.js';

const KM = 1.852;
export const proj = createProjection({ lon0: BOX[0], lon1: BOX[2], lat0: BOX[1], lat1: BOX[3], width: 1000 });
export const P = p => proj.project(p);
export const ring = (c, nm) => circlePath(proj, c, nm * KM, 6);
export function boxPath(c, half) {
  const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => step(step(c, 90, sx * half), 0, sy * half));
  return proj.line(pts, true);
}
/** A bearing wedge from p along brg, ±spread degrees, out to nm. */
export function wedgePath(p, brg, spread, nm) {
  const pts = [p];
  for (let d = -spread; d <= spread + 1e-9; d += spread / 4) pts.push(step(p, brg + d, nm));
  return proj.line(pts, true);
}

let canvas = null;
function heatImage(heat, color) {
  canvas = canvas || document.createElement('canvas');
  canvas.width = HEAT.nx; canvas.height = HEAT.ny;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, HEAT.nx, HEAT.ny);
  let mx = 0;
  for (const v of heat) mx = Math.max(mx, v);
  if (mx <= 0) return canvas.toDataURL();
  ctx.fillStyle = color;
  for (let k = 0; k < heat.length; k++) {
    const a = Math.sqrt(heat[k] / mx);
    if (a < 0.03) continue;
    ctx.globalAlpha = Math.min(0.85, a * 0.85);
    ctx.fillRect(k % HEAT.nx, Math.floor(k / HEAT.nx), 1, 1);
  }
  return canvas.toDataURL();
}
export const setHeat = (m, heat, color) => m.heatImg.setAttribute('href', heatImage(heat, color));

/** Resolve a CSS custom property to a concrete colour string the canvas can use. */
export function tokenColor(name, host) {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  probe.hidden = true;
  host.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return c;
}

export function createMap(svg) {
  const { root } = drawBasemap(svg, proj, LAND, { gratStep: 0 });
  const grat = el('g', { class: 'tsm-grat' }, root);
  for (let lon = -15; lon <= 0; lon += 5) {
    const [x] = P([lon, 60]);
    el('line', { x1: x, y1: 0, x2: x, y2: proj.H }, grat);
    const t = lon === 0 ? '0°' : `${-lon}°W`;
    el('text', { x: x + 3, y: P([lon, 60.33])[1], class: 'sh-gw' }, grat, t);
    el('text', { x: x + 3, y: P([lon, 60.28])[1], class: 'sh-narrow' }, grat, t);
  }
  for (let lat = 61; lat <= 66; lat += 1) {
    const [, y] = P([0, lat]);
    el('line', { x1: 0, y1: y, x2: proj.W, y2: y }, grat);
    el('text', { x: P([-15.9, lat])[0], y: y - 3, class: 'sh-gw' }, grat, `${lat}°N`);
    el('text', { x: P([-14.4, lat])[0], y: y - 3, class: 'sh-narrow' }, grat, `${lat}°N`);
  }
  root.insertBefore(grat, root.querySelector('.tsm-land'));
  const heatImg = el('image', { x: 0, y: 0, width: proj.W, height: proj.H, preserveAspectRatio: 'none', class: 'sh-heat' });
  root.insertBefore(heatImg, root.querySelector('.tsm-land'));
  const names = el('g', { class: 'sh-names' }, root);
  [['Iceland', -17.2, 64.95, 'sh-mid sh-gw'], ['Faroes', -6.9, 62.5, 'sh-mid'], ['Shetland', -1.3, 60.95, 'sh-mid']]
    .forEach(([t, lon, lat, c]) => el('text', { x: P([lon, lat])[0], y: P([lon, lat])[1], class: `t-place ${c}` }, names, t));
  [['Norwegian Sea', -3.6, 66.45], ['North Atlantic', -11.5, 61.0]].forEach(([t, lon, lat]) =>
    el('text', { x: P([lon, lat])[0], y: P([lon, lat])[1], class: 't-sea sh-mid' }, names, t));
  const routes = el('g', { class: 'sh-routes' }, root);
  ROUTES.forEach(r => {
    const last = r.pts[r.pts.length - 1];
    el('path', { d: ring(last, 15), class: 'sh-exit' }, routes);
    const [x, y] = P([last[0], last[1] + (r.k === 'fs' ? 0.33 : -0.42)]);
    el('text', { x, y, class: 'sh-exitlab sh-mid' }, routes, `${r.name} exit`);
  });
  const [ex, ey] = P([-14.6, 66.5]);
  el('text', { x: ex, y: ey, class: 'sh-exitlab' }, routes, '← to the Denmark Strait');
  const layers = {};
  for (const k of ['datum', 'assets', 'ship', 'truth', 'contacts', 'cursor']) layers[k] = el('g', { class: `sh-${k}` }, root);
  return { svg, heatImg, layers, u: 1, point: e => proj.unproject(...svgPoint(svg, e)) };
}

/**
 * Placement preview for the selected tool at p. ship = ship position (for the helicopter range and
 * the ship's path); ang = buoy line axis. A buoy line previews its buoys (hollow where they would fall on
 * land or off the game area) and its axis.
 */
export function drawCursor(m, p, tool, { ship, ang = 0 } = {}) {
  const L = m.layers.cursor;
  L.replaceChildren();
  if (!tool) return;
  if (tool === 'helo' && ship) el('path', { d: ring(ship, SENSORS.helo.range), class: 'sh-range' }, L);
  if (!p) return;
  if (tool === 'circle') el('path', { d: ring(p, SENSORS.circle.r), class: 'sh-cur' }, L);
  else if (tool === 'helo') el('path', { d: ring(p, SENSORS.helo.r), class: `sh-cur${ship && dist(p, ship) > SENSORS.helo.range ? ' bad' : ''}` }, L);
  else if (tool === 'air') el('path', { d: boxPath(p, SENSORS.air.half), class: 'sh-cur' }, L);
  else if (tool === 'line') {
    const ends = lineEnds(p, ang);
    el('path', { d: proj.line(ends), class: 'sh-cur line' }, L);
    for (const q of buoyPoints(p, ang)) el('circle', { cx: P(q)[0], cy: P(q)[1], r: 2.6 * m.u, class: `sh-buoy${isLand(q[0], q[1]) ? ' dry' : ''}` }, L);
    const [lx, ly] = P(ends[0]);
    el('text', { x: lx + 6 * m.u, y: ly - 6 * m.u, class: 'sh-lab' }, L, `Axis ${axisLabel(ang)}`);
  }
  else if (tool === 'attack') el('path', { d: ring(p, GAME.prosR), class: 'sh-cur attack' }, L);
  else if ((tool === 'move' || tool === 'dash') && ship) {
    const cap = (tool === 'dash' ? SENSORS.ship.sprint : SENSORS.ship.speed) * GAME.turnHours;
    const q = dist(ship, p) > cap ? step(ship, bearing(ship, p), cap) : p;
    el('path', { d: proj.line([ship, q]), class: 'sh-cur move' }, L);
  }
  const [x, y] = P(p), k = 6 * m.u;
  el('path', { d: `M${x - k} ${y}H${x + k}M${x} ${y - k}V${y + k}`, class: 'sh-cross' }, L);
}

const DIRS = ['N–S', 'NNE–SSW', 'NE–SW', 'ENE–WSW', 'E–W', 'ESE–WNW', 'SE–NW', 'SSE–NNW'];
/** A buoy line axis as text: "45°", "22.5°". */
export const axisLabel = ang => `${Number.isInteger(ang) ? ang : ang.toFixed(1)}°`;
/** The compass name of an axis: "NE–SW". */
export const axisDir = ang => DIRS[Math.round(ang / 22.5) % 8];

/**
 * Crop the view to the water where a 24-hour hunt plays out: the report area, the two southern gaps and
 * the ship. Phones get a slightly tighter crop. The Denmark Strait route leaves off the top-left edge.
 */
export function fitView(m, narrow) {
  const [a, b] = narrow ? [[-14.8, 66.8], [-0.6, 60.2]] : [[-19.5, 66.8], [2.0, 60.25]];
  const [x0, y0] = P(a), [x1, y1] = P(b);
  m.svg.setAttribute('viewBox', `${x0.toFixed(1)} ${y0.toFixed(1)} ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}`);
  m.svg.classList.toggle('narrow', narrow);
  scale(m);
}

/** SVG units per screen pixel, kept in m.u and the CSS variable --u so marks and text stay a fixed size. */
export function scale(m) {
  const px = m.svg.getBoundingClientRect().width;
  m.u = px > 0 ? m.svg.viewBox.baseVal.width / px : 1;
  m.svg.style.setProperty('--u', m.u.toFixed(3));
  return m.u;
}

/** Position of [lon, lat] as percentages of the map box's current view, for HTML overlays. */
export function toPct(m, p) {
  const [x, y] = P(p), vb = m.svg.viewBox.baseVal;
  return [(x - vb.x) / vb.width * 100, (y - vb.y) / vb.height * 100];
}
