// The defeat-mechanism model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Notional, not doctrine. Doctrine (ADP 3-0, 2025, para 4-38) says one mechanism used
// alone "achieves results relative to how much effort is expended", and that combining
// mechanisms "creates multiple dilemmas for enemy forces that magnify their effects significantly". The bench
// gives that a shape: each tool, fully applied, takes the same share off the target's
// capability, and every tool beyond the first adds a dilemma factor. The numbers are a
// teaching shape, stated as such on the page.

export const MODEL = {
  per: 0.3,       // share of remaining capability one mechanism removes at full effort
  dilemma: 0.15,  // extra share removed for each mechanism beyond the first, applied together
};

export const NAMES = ["Destroy", "Dislocate", "Disintegrate", "Isolate"];

// Capability left, 0..1, for effort levels a[i] in 0..1 (one per mechanism).
export function capability(a, m = MODEL) {
  let left = 1;
  let n = 0;
  for (const e of a) { left *= 1 - m.per * e; n += e; }
  return left * (1 - m.dilemma * Math.max(0, n - 1));
}

// The same tools with no dilemma term: what the parts would do one after another.
export function separately(a, m = MODEL) {
  return capability(a, { ...m, dilemma: 0 });
}

// The readout text for a set of switched-on mechanisms and the capability shown.
export function readoutText(on, left) {
  const n = on.filter(Boolean).length;
  const pct = Math.round(left * 100);
  if (n === 0) return `No mechanism · ${pct}% capability left`;
  if (n === 1) return `${NAMES[on.indexOf(true)]} alone · ${pct}% capability left`;
  return `${n} of 4 mechanisms · ${pct}% capability left`;
}

// Battlefield view only: notional losses, counted in vehicles (one per platoon; trucks and command
// vehicles one each). Teaching values, labeled notional on the page.
// Red (enemy) losses by mechanism at full effort: destroy knocks out 5 of the 9 company vehicles,
// dislocate catches 1 as it turns out of its position, disintegrate knocks out the 2 command-post
// vehicles, isolate stops the lead supply truck. Each scales with that mechanism's effort.
// Blue (friendly) losses: the elements exposed to return fire (attack-by-fire company 2, maneuver
// company 1, artillery 1 to counter-battery fire, blocking company 1), scaled by how much fight the
// enemy has left: floor + (1 - floor) * capability. So combining mechanisms costs fewer blue
// vehicles than the same mechanisms would cost one by one (in this model).
export const LOSS = { red: [5, 1, 2, 1], blue: [2, 1, 1, 1], floor: 0.4 };

export function losses(a, m = MODEL, l = LOSS) {
  const redBy = a.map((e, i) => Math.round(l.red[i] * e));
  const f = l.floor + (1 - l.floor) * capability(a, m);
  const raw = a.map((e, i) => l.blue[i] * e * f);
  const blue = Math.round(raw.reduce((s, v) => s + v, 0));
  // share the rounded total out by largest remainder, so each element's losses add up to it
  const blueBy = raw.map(Math.floor);
  let left = blue - blueBy.reduce((s, v) => s + v, 0);
  raw.map((v, i) => [v - Math.floor(v), i]).sort((p, q) => q[0] - p[0] || p[1] - q[1]).forEach(([, i]) => { if (left > 0) { blueBy[i]++; left--; } });
  return { redBy, blueBy, red: redBy.reduce((s, v) => s + v, 0), blue };
}

// The Battlefield readout: the switched-on set, capability left, then "blue vs red down".
export function fieldText(on, left, L) {
  const n = on.filter(Boolean).length;
  const head = n === 0 ? "No mechanism" : n === 1 ? `${NAMES[on.indexOf(true)]} alone` : `${n} of 4 mechanisms`;
  return `${head} · ${Math.round(left * 100)}% left · ${L.blue} vs ${L.red} down`;
}
