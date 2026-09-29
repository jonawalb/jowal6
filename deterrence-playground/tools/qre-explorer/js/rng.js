// Seeded randomness. mulberry32 is a small, fast 32-bit generator; every draw in the tool comes from it,
// so a seed in the URL reproduces a run exactly.

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Standard normal draw (Box-Muller). */
export function normal(r) {
  let u = 0;
  while (u === 0) u = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

/** One uniform draw keyed to (seed, a, b): the same key always gives the same number. */
export function keyed(seed, a, b) {
  const h = Math.imul(seed + 0x9E3779B9, 2654435761) ^ Math.imul(a + 1, 40503) ^ Math.imul(b + 7, 2246822519);
  return mulberry32(h)();
}
