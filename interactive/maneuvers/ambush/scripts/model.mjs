// The ambush model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so the figure, the
// readout and the tests all run this one file.
//
// Doctrine (ATP 3-21.8, FM 3-90) supplies the structure: three elements, a kill zone, the leader
// initiating "when most of the enemy force is in the kill zone", linear or L-shaped formations.
// Everything numeric below is NOTIONAL (a teaching shape, labelled so on the page): the column's
// size and spacing, the kill zone's length, and the share of the men in the kill zone that fall.

export const MODEL = {
  n: 10,                  // enemy column: ten men (ten cars on the bench)
  gap: 12,                // spacing in the column, notional units
  kz: [-48, 48],          // the kill zone along the route
  stops: [-76, 110],      // the two security positions that block the route (rear, forward)
  range: [-60, 100],     // where the column's head can be when the leader decides
  start: -60,            // the head's position at the start
  share: { linear: 0.7, L: 0.85 },   // notional: share of the men inside the kill zone that fall
  survivorFire: 0.25,     // notional: friendly men down per surviving man in the kill zone
  outsideFire: 0.1,       // notional: friendly men down per man outside the kill zone
};
export const FORMS = ["linear", "L"];
export const formName = (f) => (f === "L" ? "L-shaped" : "Linear");

// Position along the route of each man, lead first.
export const column = (head, m = MODEL) => Array.from({ length: m.n }, (_, i) => head - i * m.gap);
export const isInside = (s, m = MODEL) => s >= m.kz[0] && s <= m.kz[1];
export const inside = (head, m = MODEL) => column(head, m).filter((s) => isInside(s, m)).length;
// ATP 3-21.8 para 7-153: the leader initiates "when most of the enemy force is in the kill zone".
// In this model "most" is more than half.
export const criterion = (head, m = MODEL) => inside(head, m) > m.n / 2;

// What initiating at this head position does, for a formation (final counts).
export function outcome(form, head, m = MODEL) {
  const col = column(head, m);
  const idx = [];
  col.forEach((s, i) => { if (isInside(s, m)) idx.push(i); });
  const inN = idx.length;
  const killed = Math.round(m.share[form] * inN);
  // the men nearest the middle of the kill zone fall first
  const order = idx.slice().sort((a, b) => Math.abs(col[a]) - Math.abs(col[b]) || a - b);
  const down = order.slice(0, killed);
  const outside = m.n - inN;
  // nobody in the kill zone: nothing to fire on, so no one is hit on either side
  const blue = inN === 0 ? 0 : Math.max(1, Math.round(m.survivorFire * (inN - killed) + m.outsideFire * outside));
  return { inside: inN, outside, killed, down, blue, red: killed };
}

// Progress of the ambush, seconds after initiation (notional timing, eased in the page).
export const TIMING = {
  fall: 0.45,             // first man falls
  step: 0.28,             // between men falling
  shift: 2.8,             // the support element ceases or shifts fire; the assault begins
  cross: 3.2,             // seconds the assault takes to cross the kill zone
};
// How many of the final casualties have fallen by tf seconds after initiation.
export const fallen = (out, tf, t = TIMING) => Math.max(0, Math.min(out.killed, Math.floor((tf - t.fall) / t.step) + 1));
// Friendly men down so far (they fall as the enemy's return fire builds, after the first volley).
export const fallenBlue = (out, tf, t = TIMING) => (tf < t.fall + 1.2 ? 0 : Math.min(out.blue, Math.floor((tf - t.fall - 1.2) / 0.9) + 1));

export function readout(form, head, fired, tf, m = MODEL) {
  const inN = inside(head, m);
  const name = formName(form);
  if (!fired) return `${name} · ${inN}/${m.n} in kill zone · ${criterion(head, m) ? "initiate" : "hold fire"}`;
  const o = outcome(form, head, m);
  return `${name} · ${o.inside}/${m.n} in kill zone · ${fallenBlue(o, tf)} vs ${fallen(o, tf)} down`;
}
