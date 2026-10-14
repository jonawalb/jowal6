// The prop model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Notional numbers throughout. Four pinned props carry part of the arch's load. Each pin
// pulled sends that prop's share back into the ring, and the ring's load passes through the
// keystone. The keystone fails when its load reaches its capacity (100%). The base load and
// the shares are teaching values, stated as such on the page.

export const MODEL = {
  base: 30,                  // keystone load with every prop pinned, % of its capacity
  shares: [15, 35, 35, 15],  // load each prop carries, % of keystone capacity: left outer, left inner, right inner, right outer
  cap: 100,                  // keystone capacity, %
  drop: 8,                   // how far a prop's head drops when its pin is pulled, mm
  dialMax: 150,              // full scale of the dial, %
};

export const NAMES = ["left outer", "left inner", "right inner", "right outer"];

// Keystone load (% of capacity) for each prop's state: out[i] is 0 (pinned) to 1 (dropped clear).
export function keyLoad(out, m = MODEL) {
  return m.base + m.shares.reduce((sum, s, i) => sum + s * (out[i] || 0), 0);
}

// Does this set of pulled pins break the keystone?
export const fails = (out, m = MODEL) => keyLoad(out, m) >= m.cap - 1e-9;

// Every set of pulled pins (as 0/1 arrays) that breaks the keystone.
export function failingSets(m = MODEL) {
  const out = [];
  for (let b = 0; b < 16; b++) {
    const set = [0, 1, 2, 3].map((i) => (b >> i) & 1);
    if (fails(set, m)) out.push(set);
  }
  return out;
}

// Dial needle position, 0..1 of the sweep.
export const dialShare = (load, m = MODEL) => Math.min(1, Math.max(0, load / m.dialMax));

// Casualties in the Battlefield view, added 2026-10-13. Notional teaching values, not data: the
// casualties (soldiers) each side takes when a decisive point changes hands, attacker (blue) and
// defender (red), left outer to right outer as above, plus the defender's extra losses when the
// center of gravity gives and its forces pull back under pressure.
export const LOSSES = {
  atk: [14, 18, 18, 10],
  def: [12, 16, 16, 9],
  collapse: 30,
};

// Casualties so far for each prop's state out[i] (0..1) and whether the keystone has failed.
export function losses(out, failed, l = LOSSES) {
  const atk = l.atk.reduce((sum, c, i) => sum + c * (out[i] || 0), 0);
  const def = l.def.reduce((sum, c, i) => sum + c * (out[i] || 0), 0) + (failed ? l.collapse : 0);
  return { atk: Math.round(atk), def: Math.round(def) };
}
