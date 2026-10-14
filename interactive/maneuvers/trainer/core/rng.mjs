// Maneuver Trainer core: seeded random numbers.
// mulberry32 (same generator as kit/field.mjs fdRand), so every run is reproducible from
// (scenario, plan, seed). Pure, no dependencies.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A small helper object around one generator.
export function makeRng(seed) {
  const r = mulberry32(seed);
  return {
    next: r,
    range: (a, b) => a + (b - a) * r(),
    chance: (p) => r() < p,
    pick: (list) => list[Math.floor(r() * list.length) % list.length],
    int: (a, b) => a + Math.floor(r() * (b - a + 1)),
  };
}

// Stable string hash (for per-id phases that must not consume the main stream).
export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
