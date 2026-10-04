// Scripted Blue strategies (for the balance check), alternative plans for the after-action review,
// and Monte Carlo replays.
import { CRISIS_TURNS, MISSION_KEYS, MISSIONS, TURNS, DT } from '../data/params.js';
import { playGame, newGame, POSTURES } from './model.js';
import { project, decay } from './debris.js';
import { valid, isKinetic, ACTS } from './actions.js';
import { runSeed } from './rng.js';

const pick = (g, wants) => {
  const out = [];
  for (const x of wants) if (out.length < 2 && valid(g, 'B', x, out)) out.push(x);
  while (out.length < 2) out.push({ a: 'hold', m: null });
  return out;
};
const war = g => g.turn + 1 > CRISIS_TURNS;
const redKinetic = g => (g.lastActs.R || []).some(x => isKinetic(x.a));

export const STRATEGIES = {
  passive: { t: 'Do nothing', f: g => pick(g, []) },
  allout: { t: 'All-out kinetic', f: g => pick(g, [{ a: 'asat', m: 'isr' }, { a: 'asat', m: 'isr' }, { a: 'coorb', m: 'ew' }, { a: 'coorb', m: 'ew' }, { a: 'asat', m: 'com' }, { a: 'coorb', m: 'nav' }]) },
  reversible: { t: 'Reversible only', f: g => pick(g, war(g)
    ? [{ a: 'dazzle', m: 'isr' }, { a: 'jam', m: 'com' }]
    : [{ a: 'harden', m: 'isr' }, { a: 'harden', m: 'com' }, { a: 'jam', m: 'nav' }, { a: 'cyber', m: 'com' }]) },
  limited: { t: 'Kinetic on reconnaissance only', f: g => pick(g, war(g)
    ? [{ a: 'asat', m: 'isr' }, { a: 'dazzle', m: 'isr' }, { a: 'jam', m: 'com' }]
    : [{ a: 'harden', m: 'isr' }, { a: 'harden', m: 'com' }, { a: 'jam', m: 'nav' }]) },
  surprise: { t: 'Reversible, one kinetic strike at war\'s start', f: g => pick(g, g.turn + 1 === CRISIS_TURNS + 1
    ? [{ a: 'asat', m: 'isr' }, { a: 'asat', m: 'isr' }]
    : war(g) ? [{ a: 'dazzle', m: 'isr' }, { a: 'jam', m: 'com' }]
      : [{ a: 'harden', m: 'isr' }, { a: 'harden', m: 'com' }, { a: 'jam', m: 'nav' }, { a: 'cyber', m: 'com' }]) },
  defend: { t: 'Defend and relaunch', f: g => {
    const B = g.sides.B, w = [];
    for (const m of ['isr', 'com']) if (!B.hard[m]) w.push({ a: 'harden', m });
    for (const m of ['isr', 'com', 'nav', 'ew']) if (B.alive[m] < MISSIONS[m].need) w.push({ a: 'reconst', m });
    if (redKinetic(g)) w.push({ a: 'maneuver', m: 'isr' });
    if (war(g)) w.push({ a: 'prolif', m: 'com' });
    return pick(g, [...w, { a: 'jam', m: 'nav' }, { a: 'jam', m: 'com' }]);
  } },
  tit: { t: 'Reversible, answer kinetic in kind', f: g => {
    const w = [];
    if (!war(g)) for (const m of ['isr', 'com']) if (!g.sides.B.hard[m]) w.push({ a: 'harden', m });
    if (redKinetic(g)) w.push({ a: 'asat', m: 'isr' }, { a: 'maneuver', m: 'isr' });
    if (g.sides.B.alive.isr < MISSIONS.isr.need) w.push({ a: 'reconst', m: 'isr' });
    return pick(g, [...w, { a: 'dazzle', m: 'isr' }, { a: 'jam', m: 'com' }]);
  } },
};

// ---- Plans derived from the player's game --------------------------------------------------------------
const REV_FOR = { isr: { a: 'dazzle', m: 'isr' }, com: { a: 'jam', m: 'com' }, nav: { a: 'jam', m: 'nav' }, ew: { a: 'cyber', m: 'ew' } };
/** Same months, same targets, but every destructive attack replaced by the reversible means for that target. */
export const toReversible = plan => plan.map(turn => turn.map(x => (isKinetic(x.a) ? { ...REV_FOR[x.m] } : x)));
/** Same defenses, no attacks. */
export const toHoldFire = plan => plan.map(turn => turn.map(x => (ACTS[x.a] && ACTS[x.a].on === 'enemy' ? { a: 'hold', m: null } : x)));
export const planPolicy = plan => g => (plan[g.turn] || []).map(x => ({ ...x }));

// ---- Post-war projection and summary -------------------------------------------------------------------
const FULL = () => Object.fromEntries(MISSION_KEYS.map(m => [m, MISSIONS[m].n0]));
let BASE = null;
/** Satellites lost to debris over `years` after the war, minus what a no-war world loses anyway.
 *  `at` is the month the projection starts from (the live outlook passes the current month, so the
 *  no-war baseline has decayed for the same number of months). */
export function legacy(g, P, years = 25, at = TURNS) {
  const sides = [FULL(), FULL()];
  sides[0].com += 12 * (2 - g.sides.B.stock.prolif); sides[1].com += 12 * (2 - g.sides.R.stock.prolif);
  const key = JSON.stringify(P) + years + ':' + at;
  if (!BASE || BASE.key !== key) {
    const w = newGame(1); decay(w, at * DT, P);
    BASE = { key, s: project(w, years, P, [FULL(), FULL()]) };
  }
  const s = project(g, years, P, sides), end = s[s.length - 1], b = BASE.s[BASE.s.length - 1];
  return { series: s, base: BASE.s, extra: { B: end.lost.B - b.lost.B, R: end.lost.R - b.lost.R, O: end.lost.O - b.lost.O },
    frags: end.low + end.high + end.meo + end.geo, baseFrags: b.low + b.high + b.meo + b.geo };
}

/** Replay a policy on n seeds. posture 'unknown' draws Red's posture from each seed. */
export function monteCarlo(policy, P, { n = 1000, seed = 1, posture = 'unknown', years = 25 } = {}) {
  const out = { n, blue: 0, draw: 0, red: 0, escalation: 0, cumP: 0, extraB: 0, extraAll: 0, frags: 0, kills: 0, byPosture: {} };
  for (const p of POSTURES) out.byPosture[p] = { n: 0, blue: 0, escalation: 0 };
  for (let i = 0; i < n; i++) {
    const g = playGame(runSeed(seed, i), posture, policy, P);
    out[g.outcome]++;
    const L = legacy(g, P, years);
    out.cumP += 1 - Math.exp(-g.cumH); out.extraB += L.extra.B; out.extraAll += L.extra.B + L.extra.R + L.extra.O; out.frags += L.frags;
    out.kills += g.sides.B.kills + g.sides.R.kills;
    const bp = out.byPosture[g.posture]; bp.n++; if (g.outcome === 'blue') bp.blue++; if (g.outcome === 'escalation') bp.escalation++;
  }
  for (const k of ['cumP', 'extraB', 'extraAll', 'frags', 'kills']) out[k] /= n;
  return out;
}
