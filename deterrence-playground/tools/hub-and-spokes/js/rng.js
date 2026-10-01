// Seeded random numbers. Separate streams keep events, dice and each AI's choices independent,
// so replaying the same choices with the same seed gives the same game.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed, stream = 0, dice = 0) {
  const u = mulberry32((Math.imul(seed, 2654435761) ^ Math.imul(stream + 1, 40503) ^ Math.imul(dice + 7, 97531)) >>> 0);
  for (let i = 0; i < 4; i++) u();
  let spare = null;
  const normal = () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let a, b, r;
    do { a = u() * 2 - 1; b = u() * 2 - 1; r = a * a + b * b; } while (r >= 1 || r === 0);
    const f = Math.sqrt(-2 * Math.log(r) / r);
    spare = b * f;
    return a * f;
  };
  const pick = w => { let x = u() * w.reduce((s, v) => s + v, 0); for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return i; } return w.length - 1; };
  return { u, normal, pick };
}

export const STREAM = { setup: 1, event: 100, probe: 150, crisis: 200, war: 250, intel: 400, ai: 300 };
