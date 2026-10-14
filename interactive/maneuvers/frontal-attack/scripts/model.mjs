// The frontal-attack model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Notional, not doctrine. The press force is set as a ratio of the defender's
// holding strength (the springs' preload). Below 1 the wall holds and the press
// only pins it; above 1 the springs give and the wall is pushed back in
// proportion (Hooke's law); at the breach ratio the weakest block gives way.
// The thresholds are teaching values, stated as such on the page.

export const MODEL = {
  range: [0.5, 6],   // attacker:defender ratio the control can set
  hold: 1,           // ratio at which the springs' preload is matched: below it the wall does not move
  breach: 4.5,       // ratio at which the weakest block gives way (notional)
  push: 12,          // spring travel, model units, the wall gives before the breach
  gap: 14,           // extra travel of the block that gives way
  blocks: 6,         // blocks across the front
  weak: 2,           // index of the block that gives first (notional)
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Share (0..1) of the spring travel the whole wall has been pushed back.
export function pushShare(r, m = MODEL) {
  return clamp((r - m.hold) / (m.breach - m.hold), 0, 1);
}

// Wall travel in model units.
export const pushBack = (r, m = MODEL) => pushShare(r, m) * m.push;

export const breached = (r, m = MODEL) => r >= m.breach;

// Load each block carries as a share of the total: the platen is broad, so
// the press force is spread across the whole front.
export const perBlock = (m = MODEL) => 1 / m.blocks;

// Phase name for the readout.
export function phase(r, m = MODEL) {
  if (breached(r, m)) return "Breach";
  if (r <= m.hold) return "Wall holds, pinned";
  return "Pushing back";
}

// Which blue elements the ratio commits in the Battlefield view (notional): one rifle squad always,
// a machine-gun team at 1:1, a second squad at 1.5:1, a second machine-gun team at 2.5:1 and a
// third squad at 3:1. Men: nine per squad, two per gun team, plus the platoon leader and his RTO.
export const FORCE = { squads: [0, 1.5, 3], guns: [1, 2.5], enemy: 11 };
export function committed(r, f = FORCE) {
  const squads = f.squads.filter((t) => r >= t - 1e-9).length, guns = f.guns.filter((t) => r >= t - 1e-9).length;
  return { squads, guns, men: squads * 9 + guns * 2 + 2 };
}

// Casualties (notional, men down in the drawn engagement). Success is not free: the attacker's loss
// rate is highest at a low ratio, when a small force lies pinned under the defender's concentrated
// fire (30% of the men committed at 1:1 or below, falling 4 points per unit of ratio to 10% at 6:1);
// the defender's grows with how far its line has been pushed back (5% + 25% of the push share, plus
// 10% at the breach, of its 11 men).
export function casualties(r, m = MODEL, f = FORCE) {
  const rate = 0.3 - 0.04 * (clamp(r, 1, 6) - 1);
  const blue = Math.round(committed(r, f).men * rate);
  const red = Math.round(f.enemy * (0.05 + 0.25 * pushShare(r, m) + (breached(r, m) ? 0.1 : 0)));
  return { blue, red };
}

// The readout line, kept under 45 characters: phase, ratio, push-back, then blue vs red men down.
export function readoutOf(r, m = MODEL) {
  const ratio = (Math.round(r * 10) / 10).toFixed(1) + ":1";
  const c = casualties(r, m), down = `${c.blue} vs ${c.red} down`;
  if (breached(r, m)) return `Breach · ${ratio} · gap open · ${down}`;
  if (r <= m.hold) return `Pinned · ${ratio} · ${down}`;
  return `Pushing back ${Math.round(pushShare(r, m) * 100)}% · ${ratio} · ${down}`;
}
