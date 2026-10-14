// The interior/exterior lines model. Pure: no DOM, no kit. Inlined into the page by
// build.mjs, so the figure, the counters, the readout and the tests run this one file.
//
// Geometry is real (lengths of the tracks as drawn). Speeds and the hub's indexing
// rate are notional bench values, stated as such on the page.

export const MODEL = {
  stations: [15, 75, 135, 195, 255, 315], // station bearings, degrees round the hub
  spoke: 80,        // hub centre to the shuttle's stop on every spoke, world units
  rim: 100,         // radius of the rim track's centre line, world units
  speed: 70,        // travel speed of both forces at rim speed ×1, units per second (notional)
  index: 360,       // how fast the hub turntable turns to a new spoke, degrees per second (notional)
  rimSpeeds: [0.5, 2], // range of the rim speed control (×)
};

const RAD = Math.PI / 180;

// Signed shortest turn from a to b, degrees in (-180, 180].
export function wrap(d) {
  const w = ((((d + 180) % 360) + 360) % 360) - 180;
  return w === -180 ? 180 : w;
}

// Bearings of the n lugs on the belt when the belt stands at phi.
export const lugsAt = (phi, n) => Array.from({ length: n }, (_, k) => phi + (k * 360) / n);

// The belt's move to bring its nearest lug to a station: signed degrees (shorter way).
export function beltTurn(phi, n, station) {
  let best = 360;
  for (const a of lugsAt(phi, n)) {
    const d = wrap(station - a);
    if (Math.abs(d) < Math.abs(best) - 1e-9) best = d;
  }
  return best;
}

// Rim travel: arc length of that turn on the rim's centre line, and the time it takes.
export function rimPlan(phi, n, station, k = 1, m = MODEL) {
  const turn = beltTurn(phi, n, station);
  const dist = m.rim * Math.abs(turn) * RAD;
  return { turn, dist, time: dist / (m.speed * k) };
}

// Hub travel from the shuttle's state (r out along the spoke at bearing psi) to a station:
// run in to the hub if it is on another spoke, index the turntable, run out to the stop.
export function hubPlan(r, psi, station, m = MODEL) {
  const same = Math.abs(wrap(station - psi)) < 1e-6;
  const inward = same ? 0 : r;
  const turn = same ? 0 : wrap(station - psi);
  const outward = same ? Math.max(0, m.spoke - r) : m.spoke;
  const dist = inward + outward;
  const time = dist / m.speed + Math.abs(turn) / m.index;
  return { inward, turn, outward, dist, time };
}

// Where the shuttle is t seconds into a hub plan that started at (r0, psi0).
export function hubAt(plan, r0, psi0, t, m = MODEL) {
  const tIn = plan.inward / m.speed;
  const tTurn = Math.abs(plan.turn) / m.index;
  if (t <= tIn) return { r: r0 - t * m.speed, psi: psi0 };
  if (t <= tIn + tTurn) return { r: 0, psi: psi0 + Math.sign(plan.turn) * (t - tIn) * m.index };
  const start = plan.inward > 0 || Math.abs(plan.turn) > 0 ? 0 : r0;
  const out = Math.min(plan.outward, (t - tIn - tTurn) * m.speed);
  return { r: start + out, psi: psi0 + plan.turn };
}

// NOTIONAL losses at the called station (Battlefield view and the losses line under the card; not
// data). Whoever reaches the station first holds it; the side that arrives second attacks it. With
// at least `ready` seconds to deploy before the other side arrives, the holder fights from prepared
// positions and the attacker loses two company vehicles; with less, one. The holder always loses one,
// so holding is not free. A level race (inside the readout's 0.005 s) is a meeting engagement: one each.
// Counts are vehicles knocked out, one vehicle per company, out of a battalion of three on each side.
export const LOSS = { ready: 0.5, level: 0.005 };
export function losses(hubTime, rimTime, L = LOSS) {
  const gap = rimTime - hubTime;
  if (Math.abs(gap) < L.level) return { first: "level", blue: 1, red: 1 };
  const attacker = Math.abs(gap) >= L.ready ? 2 : 1;
  return gap > 0 ? { first: "hub", blue: 1, red: attacker } : { first: "rim", blue: attacker, red: 1 };
}
