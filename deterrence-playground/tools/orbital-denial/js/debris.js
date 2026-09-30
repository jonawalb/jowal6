// Debris physics: NASA standard breakup model, kinetic-gas collision flux (Kessler & Cour-Palais 1978),
// atmospheric decay fitted per shell, and the post-war projection.
import { SHELLS, SHELL_KEYS, R_EARTH, MISSIONS, MISSION_KEYS, BACKGROUND, BG_MASS, DEBRIS0 } from '../data/params.js';

const KM_PER_YR = 3.15576e7; // seconds per year (km/s → km/yr)

/** Trackable fragments from a catastrophic breakup of total mass M (kg): N(≥Lc) = A · M^B · Lc^−C. */
export const breakup = (M, P) => P.sbmA * Math.pow(M, P.sbmB) * Math.pow(P.lcTrack, -P.sbmC) * P.fragMult;

/** Shell volume in km³ (a spherical band `band` km thick at the shell's altitude). */
export const volume = s => { const r = R_EARTH + SHELLS[s].alt; return 4 * Math.PI * r * r * SHELLS[s].band; };

/**
 * Hazard per satellite per year in shell s: collision rate with trackable fragments λ10 = n·v·σ (n = D/V),
 * split into catastrophic strikes (pCat), mission kills by non-catastrophic strikes and by 1–10 cm fragments.
 * `fresh` fragments count freshK times while the cloud is still concentrated.
 */
export function hazard(s, D, fresh, P) {
  const n = (D + (P.freshK - 1) * fresh) / volume(s);
  const lam10 = n * SHELLS[s].v * KM_PER_YR * P.sigma * 1e-6;
  const cat = lam10 * P.pCat;
  const mk = lam10 * (1 - P.pCat) + lam10 * (P.smallRatio - 1) * P.pSmallKill;
  return { cat, mk, total: cat + mk };
}

/** Where a breakup's fragments go: most stay; the rest scatter to the other LEO shell or leave the model. */
export function scatter(s, N, P) {
  const out = { low: 0, high: 0, meo: 0, geo: 0 };
  out[s] += N * P.stayShare;
  if (s === 'low') out.high += N * (1 - P.stayShare) * 0.4;
  if (s === 'high') out.low += N * (1 - P.stayShare) * 0.6;
  return out;
}

/** Decay one step of dt years. Fresh fragments disperse into the general population. */
export function decay(st, dt, P) {
  for (const s of SHELL_KEYS) {
    const k = Number.isFinite(SHELLS[s].tau) ? Math.exp(-dt / SHELLS[s].tau) : 1;
    const f = st.fresh[s] * Math.exp(-dt / P.freshTau);
    st.debris[s] *= k;
    st.fresh[s] = f * k;
  }
}

/** Satellites per shell for a population map {mission: count} of both sides plus the background. */
export function shellSats(sides) {
  const n = { ...BACKGROUND };
  for (const side of sides) for (const m of MISSION_KEYS) n[MISSIONS[m].shell] += side[m];
  return n;
}

/** Mean mass of an intact satellite in each shell (for catastrophic breakups). */
function shellMass(sides) {
  const out = {};
  for (const s of SHELL_KEYS) {
    let n = BACKGROUND[s], m = BACKGROUND[s] * BG_MASS;
    for (const side of sides) for (const k of MISSION_KEYS) if (MISSIONS[k].shell === s) { n += side[k]; m += side[k] * MISSIONS[k].mass; }
    out[s] = m / n;
  }
  return out;
}

/**
 * Deterministic post-war projection. Both sides keep their constellations at full strength (the
 * critical-density assumption in Kessler et al. 2010); losses are replaced. Returns yearly fragment
 * counts per shell and cumulative expected satellite losses for Blue, Red and everyone else.
 */
export function project(start, years, P, sides) {
  const st = { debris: { ...start.debris }, fresh: { ...start.fresh } };
  const n = shellSats(sides), mass = shellMass(sides);
  const share = s => { const b = { B: 0, R: 0 }; for (const k of MISSION_KEYS) if (MISSIONS[k].shell === s) { b.B += sides[0][k]; b.R += sides[1][k]; } return b; };
  const lost = { B: 0, R: 0, O: 0 }, series = [{ y: 0, ...st.debris, lost: { ...lost } }];
  const h = 0.25;
  for (let t = h; t <= years + 1e-9; t += h) {
    for (const s of SHELL_KEYS) {
      const z = hazard(s, st.debris[s], st.fresh[s], P);
      const b = share(s), all = n[s];
      const dLost = all * (1 - Math.exp(-z.total * h));
      lost.B += dLost * b.B / all; lost.R += dLost * b.R / all; lost.O += dLost * (all - b.B - b.R) / all;
      const cats = all * (1 - Math.exp(-z.cat * h));
      const add = scatter(s, cats * breakup(mass[s], P), P);
      for (const q of SHELL_KEYS) st.debris[q] += add[q];
    }
    decay(st, h, P);
    if (Math.abs(t - Math.round(t)) < 1e-6) series.push({ y: Math.round(t), ...st.debris, lost: { ...lost } });
  }
  return series;
}

export const initialDebris = () => ({ debris: { ...DEBRIS0 }, fresh: { low: 0, high: 0, meo: 0, geo: 0 } });
