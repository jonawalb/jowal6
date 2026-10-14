// The flank model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Notional, not doctrine: a defender's weapons are sited to cover its front,
// so the share that can bear on an attacker falls as the attacker's bearing
// moves off the front. The curve is a teaching shape, stated as such on the page.

export const MODEL = {
  floor: 0.15,      // share that bears straight from behind (all-round defense, local reserves)
  power: 3,         // how fast the frontal arc falls away
  turnRate: 40,     // degrees per second the defender can re-face when it is not fixed
  arc: [24, 164],   // where the maneuver force can stand on its rail, degrees off the defender's front
};

const RAD = Math.PI / 180;

// Relative bearing in degrees, 0 to 180, between the attacker and the defender's front.
export function offFront(theta, psi) {
  const d = Math.abs((((theta - psi) % 360) + 540) % 360 - 180);
  return d;
}

// Share of the defender's fire that can reach an attacker at that relative bearing.
export function bearing(off, m = MODEL) {
  const head = (1 + Math.cos(off * RAD)) / 2;
  return m.floor + (1 - m.floor) * Math.pow(head, m.power);
}

// Where the defender wants to face. Fixed: its front, toward the fixing force (0 degrees).
// Free: toward the maneuver force.
export const wantFacing = (fixed, theta) => (fixed ? 0 : theta);

// One step of the defender's turn, rate-limited and eased at the end.
export function turnToward(psi, want, dt, m = MODEL) {
  const gap = want - psi;
  const eased = gap * (1 - Math.exp(-dt / 0.35));
  const cap = m.turnRate * dt;
  return psi + Math.max(-cap, Math.min(cap, eased));
}

// Battlefield view only: notional losses, men down, for the share of the enemy's fire that bears
// on the assault (f, from bearing()). Success is not free: the assault element (two rifle squads,
// the platoon leader and his RTO, 20 men) loses 5% plus 30% times f, so attacking into the enemy's
// front costs about three times what a flank attack costs; the enemy (11 men) loses 8% plus 40%
// times the share of its fire that cannot bear. Each side always loses at least one. Teaching values.
export const LOSS = { assault: 20, enemy: 11 };
export function losses(f, l = LOSS) {
  const blue = Math.max(1, Math.round(l.assault * (0.05 + 0.3 * f)));
  const red = Math.max(1, Math.round(l.enemy * (0.08 + 0.4 * (1 - f))));
  return { blue, red };
}
