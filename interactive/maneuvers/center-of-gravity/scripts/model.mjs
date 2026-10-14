// The arch model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Real statics, notional numbers. Cut a half arch free at the crown: it is held by the
// crown thrust H (horizontal) and its own weight. The force on the joint below stone i is
// the vector sum of H and the weight of everything between that joint and the crown.
// H, the stone weights and the way contact fades as the keystone rises are teaching
// values, stated as such on the page.

export const MODEL = {
  H: 2,            // crown thrust, in stone weights (notional)
  w: 1,            // weight of one stone (the unit)
  stones: 4,       // voussoirs on each side of the keystone
  R1: 34,          // intrados radius, mm
  R2: 46,          // extrados radius, mm
  half: 10,        // half the wedge angle of every stone, degrees (9 stones over 180°)
  EC: 12,          // lift at which the keystone clears its seat and the arch fails, mm
  EMAX: 18,        // full travel of the puller, mm
  pitch: 2,        // lead of the puller screw, mm per turn
};

const RAD = Math.PI / 180;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Force on the lower joint of stone i (0 = keystone, 1..4 outward), in stone weights.
// The keystone's own joints carry H and half its weight.
export function jointLoad(i, m = MODEL) {
  const above = m.w * (0.5 + i);
  return Math.hypot(m.H, above);
}
export const loads = (m = MODEL) => Array.from({ length: m.stones + 1 }, (_, i) => jointLoad(i, m));

// Share of the ring's thrust the keystone still carries at lift e (mm). Notional: contact
// falls linearly from full seat to none at EC.
export const bearing = (e, m = MODEL) => clamp01(1 - e / m.EC);

// Side clearance the rising wedge opens on each face, mm.
export const clearance = (e, m = MODEL) => e * Math.tan(m.half * RAD);

// How far each half arch leans in (radians) about its springing to follow the keystone:
// 90% of the clearance at the top inner corner of the first stone, so the stones never touch it.
export function lean(e, m = MODEL) {
  const corner = m.R2 * Math.cos(m.half * RAD);
  return (0.9 * clearance(Math.min(e, m.EC), m)) / corner;
}

// Turns of the hand wheel for a lift of e mm.
export const turns = (e, m = MODEL) => e / m.pitch;

// Does a lift of e collapse the arch?
export const fails = (e, m = MODEL) => e >= m.EC;

// Battlefield view only: notional losses, counted in vehicles (one per platoon). Red: the reserve's
// tanks knocked out as the strike goes in (its fighting share is bearing(e)), plus vehicles the
// forward battalions abandon when they fall back. Blue: strike-force vehicles hit by the reserve's
// return fire, and one fixing-force vehicle hit once the reserve is down by half. Teaching values.
export const LOSS = { reserve: 9, front: 3, strike: 3, fix: 1 };
export function losses(e, collapsed, m = MODEL) {
  const gone = 1 - (collapsed ? 0 : bearing(e, m));
  const reserve = Math.round(LOSS.reserve * gone);
  const front = collapsed ? LOSS.front : 0;
  const strike = Math.round(LOSS.strike * gone);
  const fix = Math.round(LOSS.fix * gone);
  return { reserve, front, strike, fix, red: reserve + front, blue: strike + fix };
}
