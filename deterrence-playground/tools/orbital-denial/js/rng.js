// Seeded random numbers. Each (stream, turn) pair gets its own generator, so two plans played on the
// same seed see the same dice for the same event (common random numbers).

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rng(seed, stream, turn = 0) {
  return mulberry32((Math.imul(seed, 2654435761) + Math.imul(stream, 40503) + Math.imul(turn + 1, 69069) + 12345) >>> 0);
}

export const STREAM = { posture: 1, blue: 2, red: 3, redPick: 4, debrisB: 5, debrisR: 6, esc: 7 };

/** Seed for replay i of a batch. */
export const runSeed = (seed, i) => ((Math.imul(seed ^ 0x9E3779B9, 2654435761) + Math.imul(i + 1, 40503)) >>> 0) % 999983 + 1;
