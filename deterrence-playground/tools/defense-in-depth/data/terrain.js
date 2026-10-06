// Defense in Depth: terrain and field works (SPEC §2.3, §1.2). All values NOTIONAL. The dead-ground
// figures g0 are shaped by Biddle's "more than 65% ... more than 85%" of ground within 1,000 m invisible to a
// typical position (p. 36); per-sector values are lower because a sector is only 500 m. Directional cover
// follows Biddle: "most natural cover is directional" (p. 44). Data only: imports nothing.

// id: index stored in the sector array. front = directional (frontal) cover, all = all-round cover,
// g0 = dead ground, move = movement cost, sig = signature multiplier.
export const TERRAIN = [
  { id: 0, key: 'open',    label: 'Open',              front: 0,    all: 0,    g0: 0.25, move: 1.0, sig: 1.0 },
  { id: 1, key: 'broken',  label: 'Broken / cratered', front: 0.30, all: 0,    g0: 0.50, move: 1.3, sig: 0.8 },
  { id: 2, key: 'woods',   label: 'Woods',             front: 0,    all: 0.35, g0: 0.40, move: 1.4, sig: 0.6 },
  { id: 3, key: 'village', label: 'Village',           front: 0,    all: 0.45, g0: 0.45, move: 1.2, sig: 0.7 },
  { id: 4, key: 'crest',   label: 'Crest',             front: 0.15, all: 0,    g0: 0.15, move: 1.0, sig: 1.2 },
  { id: 5, key: 'reverse', label: 'Reverse slope',     front: 0.20, all: 0,    g0: 0.35, move: 1.0, sig: 1.0, sigBeyond: 0.6 },
  { id: 6, key: 'valley',  label: 'Stream valley',     front: 0,    all: 0,    g0: 0.35, move: 1.3, sig: 0.9 },
];
export const T = Object.fromEntries(TERRAIN.map(t => [t.key, t.id]));

// Field works built by the defender (SPEC §1.2). wp = work points. NOTIONAL.
export const WORKS = {
  trench:   { wp: 2, label: 'Trench', cover: 0.6 },                 // frontal cover 0.6, axis across the front
  comm:     { wp: 1, label: 'Communication trench' },              // covered N-S movement
  obst:     { wp: 2, label: 'Wire / minefield (surface)' },
  obstC:    { wp: 4, label: 'Wire / minefield (concealed)' },
  strong:   { wp: 6, label: 'Strongpoint', cover: 0.75 },          // all-round cover 0.75
  concrete: { wp: 4, label: 'Concrete (strongpoint)' },            // halves artillery losses; needs a strongpoint
  dugout:   { wp: 3, label: 'Dugouts' },                           // artillery losses -60% for units not moving
  dummy:    { wp: 1, label: 'Dummy position' },                    // looks like a strongpoint to the enemy
};
export const WORK_KEYS = Object.keys(WORKS);

// Churned ground after Destroy fire: movement cost +0.3 (Hunzeker pp. 52-53). NOTIONAL.
export const CHURN = { move: 0.3 };
