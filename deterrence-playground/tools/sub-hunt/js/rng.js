// Seeded random numbers. Separate streams keep the submarine's path independent of the search:
// the same seed gives the same sub decisions whatever the player does (except the evader's reactions).

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

/** A generator with uniform, normal and Poisson draws. */
export function makeRng(seed, stream = 0) {
  const u = mulberry32((seed * 2654435761 + stream * 40503 + 12345) >>> 0);
  let spare = null;
  const normal = () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let a, b, r;
    do { a = u() * 2 - 1; b = u() * 2 - 1; r = a * a + b * b; } while (r >= 1 || r === 0);
    const f = Math.sqrt(-2 * Math.log(r) / r);
    spare = b * f;
    return a * f;
  };
  const poisson = lam => { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= u(); } while (p > L); return k - 1; };
  const pick = w => { let x = u() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return i; } return w.length - 1; };
  return { u, normal, poisson, pick };
}

export const STREAM = { sub: 1, detect: 2, falseAlarm: 3, filter: 4, setup: 6 };
