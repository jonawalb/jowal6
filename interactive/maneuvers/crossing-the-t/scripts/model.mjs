// The crossing-the-T model. Pure: no DOM, no kit, no drawing geometry. Inlined into
// the page by build.mjs, so the figure, the readout and the tests all run this file.
//
// Plan view in units of one ship spacing. The column (4 ships) heads along +x with its
// lead at the origin. The crossing line (4 ships) sits on a pivot D spacings ahead of
// the lead; `phi` is its heading off the column's course (0 = end-on in line ahead of
// the column, 90 = square across the column's head). Everything returned is plain
// numbers (positions in spacings, angles in degrees); scene.mjs turns it into parts.
//
// Notional, not history: every ship, turret, arc and distance below is a teaching value.
// Each ship carries two twin main turrets (fore and aft). A turret bears on an enemy
// ship when the enemy lies inside its arc and the line of fire passes clear of every
// other ship of its own side.

export const MODEL = {
  ships: 4,          // ships per side
  gunsPerTurret: 2,  // twin turrets
  D: 2.7,            // pivot of the crossing line, spacings ahead of the column's lead
  turretAt: 0.25,    // fore and aft turrets sit this far from the ship's centre, spacings
  foreArc: 135,      // fore turret bears from dead ahead to 135° either side
  aftArc: 45,        // aft turret bears from 45° off the bow round to dead astern
  mask: 0.45,        // a line of fire passing this close to a friendly ship's centre is masked
  range: [0, 90],    // phi the controls allow, degrees
};

const RAD = Math.PI / 180;
const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180;

// Ships of both sides for a crossing-line heading phi. Positions in spacings, heading in degrees.
export function fleets(phi, m = MODEL) {
  const column = [], line = [];
  for (let i = 0; i < m.ships; i++) column.push({ x: i ? -i : 0, y: 0, heading: 0 });
  const c = Math.cos(phi * RAD), s = Math.sin(phi * RAD);
  for (let i = 0; i < m.ships; i++) {
    const t = i - (m.ships - 1) / 2;
    line.push({ x: m.D + t * c, y: t * s, heading: phi });
  }
  return { column, line };
}

// Distance from point p to the segment a→b.
function toSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const L = dx * dx + dy * dy;
  const u = L ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L)) : 0;
  return Math.hypot(a.x + u * dx - p.x, a.y + u * dy - p.y);
}

// One turret's answer: can it bear, on which enemy ship, at what absolute bearing.
function turret(own, i, end, enemies, m) {
  const ship = own[i];
  const h = ship.heading * RAD;
  const at = { x: ship.x + end * m.turretAt * Math.cos(h), y: ship.y + end * m.turretAt * Math.sin(h) };
  let best = null;
  enemies.forEach((e, j) => {
    const brg = Math.atan2(e.y - at.y, e.x - at.x) / RAD;
    const rel = Math.abs(wrap(brg - ship.heading));
    const inArc = end > 0 ? rel <= m.foreArc : rel >= m.aftArc;
    if (!inArc) return;
    const masked = own.some((f, k) => k !== i && toSegment(f, at, e) < m.mask);
    if (masked) return;
    const d = Math.hypot(e.x - at.x, e.y - at.y);
    if (!best || d < best.d) best = { d, target: j, bearing: brg };
  });
  return { x: at.x, y: at.y, end: end > 0 ? "fore" : "aft", bears: !!best, target: best ? best.target : -1,
    bearing: best ? best.bearing : wrap(ship.heading + (end > 0 ? 0 : 180)) };
}

function sideTurrets(own, enemies, m) {
  const out = [];
  own.forEach((_, i) => { out.push(turret(own, i, 1, enemies, m)); out.push(turret(own, i, -1, enemies, m)); });
  return out;
}

// Full state for heading phi: ships, every turret, and the guns-bearing count per side.
export function stateAt(phi, m = MODEL) {
  const { column, line } = fleets(phi, m);
  const lineTurrets = sideTurrets(line, column, m);
  const columnTurrets = sideTurrets(column, line, m);
  const guns = (list) => list.filter((t) => t.bears).length * m.gunsPerTurret;
  return {
    phi, column, line, lineTurrets, columnTurrets,
    lineGuns: guns(lineTurrets), columnGuns: guns(columnTurrets),
    maxGuns: m.ships * 2 * m.gunsPerTurret,
  };
}

// Notional damage for the Battlefield view (added 2026-10-13). In a notional exchange every turret
// that bears lands one hit on the enemy ship it is aimed at (its nearest reachable target, above), so
// hits taken by a side equal the enemy's turrets bearing. A teaching value, not a hit rate from history.
export const HITS_PER_TURRET = 1;
export function hitsAt(phi, m = MODEL) {
  const s = stateAt(phi, m);
  const tally = (turrets, n) => {
    const out = new Array(n).fill(0);
    turrets.forEach((t) => { if (t.bears) out[t.target] += HITS_PER_TURRET; });
    return out;
  };
  const column = tally(s.lineTurrets, m.ships), line = tally(s.columnTurrets, m.ships);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  return { line, column, lineTaken: sum(line), columnTaken: sum(column) };
}
