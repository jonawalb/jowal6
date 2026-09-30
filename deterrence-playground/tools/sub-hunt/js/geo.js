// Flat-earth navigation helpers in nautical miles, and the land mask. Good enough for a notional game
// at these latitudes; distances are exact to within a few percent over the ranges used here.
import { BOX } from '../data/land.js';
import { MASK } from '../data/mask.js';

const RAD = Math.PI / 180;
const NX = Math.round((BOX[2] - BOX[0]) / MASK.dlon);
const NY = MASK.rows.length;
const GRID = new Uint8Array(NX * NY);
MASK.rows.forEach((row, j) => {
  let i = 0, land = 0;
  for (const n of row.split('.').map(Number)) {
    if (land) GRID.fill(1, j * NX + i, j * NX + i + n);
    i += n; land ^= 1;
  }
});

/** True on land or outside the game box. */
export function isLand(lon, lat) {
  const i = Math.floor((lon - BOX[0]) / MASK.dlon), j = Math.floor((BOX[3] - lat) / MASK.dlat);
  if (i < 0 || j < 0 || i >= NX || j >= NY) return true;
  return GRID[j * NX + i] === 1;
}

/** East/north offset in nm from a to b. */
export function offset(a, b) {
  const c = Math.cos((a[1] + b[1]) / 2 * RAD);
  return [(b[0] - a[0]) * 60 * c, (b[1] - a[1]) * 60];
}
export function dist(a, b) { const [x, y] = offset(a, b); return Math.hypot(x, y); }
export function bearing(a, b) { const [x, y] = offset(a, b); return (Math.atan2(x, y) / RAD + 360) % 360; }

/** Point reached from p after nm on heading hdg (degrees true). */
export function step(p, hdg, nm) {
  const lat = p[1] + nm * Math.cos(hdg * RAD) / 60;
  const lon = p[0] + nm * Math.sin(hdg * RAD) / (60 * Math.cos((p[1] + lat) / 2 * RAD));
  return [lon, lat];
}

/**
 * Move nm along hdg in 4 nm substeps, bending around land. Returns [lon, lat, finalHeading].
 * Tries the heading, then swings left and right in 30 degree steps; stops if boxed in.
 */
export function sail(p, hdg, nm) {
  let cur = p, h = hdg, left = nm;
  while (left > 1e-6) {
    const d = Math.min(4, left);
    let moved = false;
    for (const dh of [0, 30, -30, 60, -60, 90, -90, 120, -120]) {
      const q = step(cur, h + dh, d);
      if (!isLand(q[0], q[1])) { cur = q; h = (h + dh + 360) % 360; moved = true; break; }
    }
    if (!moved) break;
    left -= d;
  }
  return [cur[0], cur[1], h];
}

/** Distance in nm from point p to the segment a-b. */
export function distToSegment(p, a, b) {
  const [bx, by] = offset(a, b), [px, py] = offset(a, p);
  const L2 = bx * bx + by * by;
  const t = L2 ? Math.max(0, Math.min(1, (px * bx + py * by) / L2)) : 0;
  return Math.hypot(px - t * bx, py - t * by);
}

/** Random sea point within r nm of c. */
export function seaPointNear(rng, c, r) {
  for (let k = 0; k < 200; k++) {
    const q = step(c, rng.u() * 360, r * Math.sqrt(rng.u()));
    if (!isLand(q[0], q[1])) return q;
  }
  return c.slice();
}
export { BOX };
