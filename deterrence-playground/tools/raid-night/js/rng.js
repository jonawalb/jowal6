// Seeded random numbers. mulberry32 drives the raid schedule; hash01 gives each engagement its own draw,
// keyed by (seed, threat id, shot number on that threat), so the player and the heuristic replays roll the
// same dice for the same shot at the same track.
export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function hash01(seed, id, n) {
  let h = (seed ^ Math.imul(id, 0x9E3779B1) ^ Math.imul(n + 1, 0x85EBCA77)) >>> 0;
  h = Math.imul(h ^ h >>> 16, 0x7FEB352D); h = Math.imul(h ^ h >>> 15, 0x846CA68B); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export const randomSeed = () => 1000 + Math.floor(Math.random() * 899000);
