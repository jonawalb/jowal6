// Map rendering: basemap, probability map, search assets, contacts and (after the hunt) the truth.
import { createProjection, drawBasemap, el, circlePath, svgPoint } from '../../../shared/js/mapkit.js';
import { LAND, BOX } from '../data/land.js';
import { ROUTES, SENSORS, GAME } from '../data/params.js';
import { HEAT } from './filter.js';
import { activeAt } from './sensors.js';
import { step } from './geo.js';

const KM = 1.852;
export const proj = createProjection({ lon0: BOX[0], lon1: BOX[2], lat0: BOX[1], lat1: BOX[3], width: 1000 });
const P = p => proj.project(p);
const ring = (c, nm) => circlePath(proj, c, nm * KM, 6);

function boxPath(c, half) {
  const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => step(step(c, 90, sx * half), 0, sy * half));
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
  for (let lon = -30; lon <= 0; lon += 10) {
    const [x] = P([lon, 60]);
    el('line', { x1: x, y1: 0, x2: x, y2: proj.H }, grat);
    const t = lon === 0 ? '0°' : `${-lon}°W`;
    el('text', { x: x + 3, y: P([lon, 59.05])[1], class: 'sh-gw' }, grat, t);
    if (lon > -20) el('text', { x: x + 3, y: P([lon, 67.3])[1], class: 'sh-narrow' }, grat, t);
  }
  for (let lat = 60; lat <= 68; lat += 4) {
    const [, y] = P([0, lat]);
    el('line', { x1: 0, y1: y, x2: proj.W, y2: y }, grat);
    el('text', { x: P([-25.8, lat])[0], y: y - 3, class: 'sh-gw' }, grat, `${lat}°N`);
    if (lat > 60) el('text', { x: P([-19.8, lat])[0], y: y - 3, class: 'sh-narrow' }, grat, `${lat}°N`);
  }
  root.insertBefore(grat, root.querySelector('.tsm-land'));
  const heatImg = el('image', { x: 0, y: 0, width: proj.W, height: proj.H, preserveAspectRatio: 'none', class: 'sh-heat' });
  root.insertBefore(heatImg, root.querySelector('.tsm-land'));
  const names = el('g', { class: 'sh-names' }, root);
  [['Greenland', -23.2, 68.75, 'sh-mid'], ['Iceland', -18.6, 64.9, 'sh-mid'], ['Faroes', -6.9, 62.55, 'sh-mid'], ['Shetland', -1.2, 60.9, 'sh-mid'],
    ['Scotland', -4.3, 57.9, 'sh-mid'], ['Norway', 2.9, 61.6, 'sh-end']]
    .forEach(([t, lon, lat, c]) => el('text', { x: P([lon, lat])[0], y: P([lon, lat])[1], class: `t-place ${c}` }, names, t));
  [['Norwegian Sea', -3.5, 68.3], ['North Atlantic', -18.5, 59.4]].forEach(([t, lon, lat]) =>
    el('text', { x: P([lon, lat])[0], y: P([lon, lat])[1], class: 't-sea sh-mid' }, names, t));
  const routes = el('g', { class: 'sh-routes' }, root);
  ROUTES.forEach(r => {
    const last = r.pts[r.pts.length - 1];
    el('path', { d: ring(last, 15), class: 'sh-exit' }, routes);
    const [x, y] = P(last);
    el('text', { x, y: y + 34, class: 'sh-exitlab sh-mid' }, routes, `${r.name} exit`);
  });
  const [ex, ey] = P([-19.6, 66.9]);
  el('text', { x: ex, y: ey, class: 'sh-exitlab' }, routes, '← to the Denmark Strait');
  const layers = {};
  for (const k of ['datum', 'assets', 'ship', 'truth', 'contacts', 'cursor']) layers[k] = el('g', { class: `sh-${k}` }, root);
  return { svg, heatImg, layers, point: e => proj.unproject(...svgPoint(svg, e)) };
}

/**
 * Draw one state of a hunt.
 * @param view { hour, snap, reveal }: hour is the hour shown; reveal draws the true track up to that hour.
 */
export function render(m, g, view, color) {
  const { layers: L } = m, h = view.hour;
  Object.values(L).forEach(n => { if (n !== L.cursor) n.replaceChildren(); });
  m.heatImg.setAttribute('href', heatImage(view.snap.heat, color));
  el('path', { d: ring(g.datum, GAME.datumR), class: 'sh-datum' }, L.datum);
  const [dx, dy] = P(step(g.datum, 0, GAME.datumR));
  el('text', { x: dx, y: dy - 5, class: 'sh-lab sh-mid' }, L.datum, 'Opening report, hour 0');

  for (const a of g.assets) {
    if (a.t0 - 1 > h) continue;
    const live = activeAt(a, h + 1) || activeAt(a, h), pending = a.t0 > h + 1, done = a.t1 <= h;
    const cls = `sh-asset sh-${a.type}${pending ? ' pending' : ''}${done ? ' done' : ''}${live ? ' live' : ''}`;
    const d = a.type === 'buoy' ? ring(a.p, SENSORS.buoy.fieldR) : boxPath(a.p, SENSORS.mpa.half);
    el('path', { d, class: cls }, L.assets);
    const edge = a.type === 'buoy' ? P(step(a.p, 180, SENSORS.buoy.fieldR)) : P(step(a.p, 0, SENSORS.mpa.half));
    const lab = done ? a.name : `${a.name} · ${a.t1 - h}h left`;
    if (!done || view.reveal) el('text', { x: edge[0], y: a.type === 'buoy' ? edge[1] + 13 : edge[1] - 5, class: `sh-lab sh-mid sh-alab${done ? ' done' : ''}` }, L.assets, lab);
  }

  const trk = g.ship.track.slice(0, h + 1);
  el('path', { d: proj.line(trk), class: 'sh-shiptrack' }, L.ship);
  const sp = trk[trk.length - 1];
  const [sx, sy] = P(sp);
  el('path', { d: `M${sx} ${sy - 8}L${sx + 6} ${sy + 6}L${sx - 6} ${sy + 6}Z`, class: 'sh-shipicon' }, L.ship);
  el('text', { x: sx + 9, y: sy + 4, class: 'sh-lab' }, L.ship, 'Ship');

  if (view.reveal) {
    const tr = g.subTrack.slice(0, h + 1);
    for (let i = 1; i < tr.length; i++) {
      el('path', { d: proj.line([tr[i - 1].p, tr[i].p]), class: `sh-truth${tr[i].sprint ? ' sprint' : ''}` }, L.truth);
    }
    tr.forEach((s, i) => el('circle', { cx: P(s.p)[0], cy: P(s.p)[1], r: i === tr.length - 1 ? 6 : 2.2, class: i === tr.length - 1 ? 'sh-truthnow' : 'sh-truthdot' }, L.truth));
  }

  for (const c of g.contacts.filter(c => c.h <= h)) {
    const [x, y] = P(c.p), age = h - c.h;
    const cls = `sh-contact${view.reveal ? (c.real ? ' real' : ' false') : ''}${age > 3 ? ' old' : ''}`;
    const gC = el('g', { class: cls }, L.contacts);
    if (view.reveal && !c.real) el('path', { d: `M${x - 5} ${y - 5}L${x + 5} ${y + 5}M${x + 5} ${y - 5}L${x - 5} ${y + 5}`, class: 'sh-x' }, gC);
    else el('path', { d: `M${x} ${y - 7}L${x + 7} ${y}L${x} ${y + 7}L${x - 7} ${y}Z` }, gC);
    if (age <= 3 || view.reveal) el('text', { x: x + 9, y: y - 6, class: 'sh-lab' }, gC, `C${c.n}`);
  }

  if (g.over?.p) {
    el('path', { d: ring(g.over.p, GAME.prosR), class: `sh-pros ${g.over.kind}` }, L.contacts);
  }
}

/** Cursor ring (placement preview) or nothing. */
export function drawCursor(m, p, tool) {
  const L = m.layers.cursor;
  L.replaceChildren();
  if (!p || !tool) return;
  if (tool === 'buoy') el('path', { d: ring(p, SENSORS.buoy.fieldR), class: 'sh-cur' }, L);
  else if (tool === 'mpa') el('path', { d: boxPath(p, SENSORS.mpa.half), class: 'sh-cur' }, L);
  else if (tool === 'pros') el('path', { d: ring(p, GAME.prosR), class: 'sh-cur pros' }, L);
  const [x, y] = P(p);
  el('path', { d: `M${x - 6} ${y}H${x + 6}M${x} ${y - 6}V${y + 6}`, class: 'sh-cross' }, L);
}

/**
 * Crop the view to the water where a 24-hour hunt plays out. Phones get a tighter crop so labels stay
 * legible. The Denmark Strait exit lies off the left edge in both: no sub reaches it within 24 hours.
 */
export function fitView(m, narrow) {
  const [a, b] = narrow ? [[-20, 68.5], [1, 59.9]] : [[-26, 69.3], [3, 58.9]];
  const [x0, y0] = P(a), [x1, y1] = P(b);
  m.svg.setAttribute('viewBox', `${x0.toFixed(1)} ${y0.toFixed(1)} ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}`);
  m.svg.classList.toggle('narrow', narrow);
}

/** Position of [lon, lat] as percentages of the map box's current view, for HTML overlays. */
export function toPct(m, p) {
  const [x, y] = P(p), vb = m.svg.viewBox.baseVal;
  return [(x - vb.x) / vb.width * 100, (y - vb.y) / vb.height * 100];
}
