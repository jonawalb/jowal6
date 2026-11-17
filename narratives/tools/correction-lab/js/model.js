// Correction Lab's notional model. It combines meta-analytic contrasts with Walberg's Sticky Affect
// retraction condition. Nothing here is an estimate from any single study.
//
// A person revises a false belief only if  α(E)·evidence > (1 − α(E))·U_I + C   (Walberg, Sticky Affect).
//   α(E) = 1/(1 + E)          weight on accuracy; falls as emotional activation E rises (form notional)
//   U_I                        identity value of the false claim, spread across a population of 200
//   C                          cost of abandoning the belief
// Meta-analytic contrasts from Walter & Tukachinsky (2020) move evidence and C. Each lever's shift is
// Δz = atanh(r_level) − atanh(r_overall), scaled by a single notional constant κ:
//   evidence = e0 · exp(κ·Σ Δz_evidence)   (source, alternative explanation, myth restated)
//   C        = C0 · exp(−κ·Σ Δz_cost)      (timing, repetitions of the myth before correction)
// e0 is calibrated so that the average correction (every Δz = 0, E = 1, default identity) leaves the share
// that Chan et al. (2017) imply: persistence d / misinformation d = 0.97 / 3.08 ≈ 31%.
import { WT_OVERALL, WT_MODERATORS, WT_REPETITION, ANCHOR } from '../data/evidence.js';

export const N = 200;
export const DEFAULTS = { e: 1, tm: 'd', src: 'o', rep: 1, rs: 1, alt: 0, id: 1, sa: 1, k: 2.5 };
export const NOTIONAL = { C0: 0.3, sdI: 1.3, Eref: 1, e0: null };

const z0 = Math.atanh(WT_OVERALL.r);
const mod = lever => WT_MODERATORS.find(m => m.lever === lever);
export const dz = (lever, level) => Math.atanh(mod(lever).levels[level].r) - z0;

/** Logistic quantiles: a fixed, evenly spread population of identity values around the mean id. */
const QU = Array.from({ length: N }, (_, i) => { const u = (i + 0.5) / N; return Math.log(u / (1 - u)); });
export const identities = id => QU.map(q => id + NOTIONAL.sdI * q);

export const alphaOf = (E, sa) => 1 / (1 + (sa ? E : NOTIONAL.Eref));

/** Lever shifts (Δz) for a state. */
export function shifts(s) {
  return {
    tm: dz('tm', s.tm),
    src: dz('src', s.src),
    alt: dz('alt', String(s.alt)),
    rs: dz('rs', String(s.rs)),
    rep: WT_REPETITION.b * (s.rep - 1),
  };
}

/** Evidence strength and abandonment cost for state s. */
export function terms(s) {
  const d = shifts(s);
  const ev = NOTIONAL.e0 * Math.exp(s.k * (d.src + d.alt + d.rs));
  const C = NOTIONAL.C0 * Math.exp(-s.k * (d.tm + d.rep));
  return { ev, C, d };
}

/** Run the population. Returns per-person thresholds and whether each revises, plus the persisting share. */
export function run(s) {
  const a = alphaOf(s.e, s.sa), { ev, C } = terms(s);
  const ids = identities(s.id);
  const bar = ids.map(u => (1 - a) * u + C);
  const lhs = a * ev;
  const revise = bar.map(b => lhs > b);
  const persist = revise.filter(r => !r).length / N;
  return { a, ev, C, lhs, bar, revise, persist, ids };
}

/** Smooth persistence (continuous in the levers) for charts: share with (1−α)U_I + C ≥ α·ev. */
export function persistShare(s) {
  const a = alphaOf(s.e, s.sa), { ev, C } = terms(s);
  const cut = (a * ev - C) / (1 - a); // revise iff U_I < cut
  const zc = (cut - s.id) / NOTIONAL.sdI;
  return 1 - 1 / (1 + Math.exp(-zc));
}

/** Calibrate e0 so the average correction leaves ANCHOR (≈31%) persisting. */
function calibrate() {
  const ref = { ...DEFAULTS, e: 1, id: DEFAULTS.id, sa: 1 };
  const at = e0 => {
    NOTIONAL.e0 = e0;
    const a = alphaOf(ref.e, 1), C = NOTIONAL.C0;
    const cut = (a * e0 - C) / (1 - a), zc = (cut - ref.id) / NOTIONAL.sdI;
    return 1 - 1 / (1 + Math.exp(-zc));
  };
  let lo = 0, hi = 50;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (at(m) > ANCHOR) lo = m; else hi = m; }
  NOTIONAL.e0 = (lo + hi) / 2;
}
calibrate();

/** Sequential contribution of each lever, from the average correction to the current setting. */
export const LEVER_ORDER = [
  { key: 'tm', t: 'Timing' }, { key: 'src', t: 'Source' }, { key: 'alt', t: 'Alternative explanation' },
  { key: 'rs', t: 'Myth restated' }, { key: 'rep', t: 'Prior repetitions' }, { key: 'id', t: 'Identity stake' },
  { key: 'e', t: 'Emotion (Sticky Affect)' },
];
export function waterfall(s) {
  // Start from a neutral state: all Δz = 0 (the "average" correction), E = 1, default identity.
  const base = { ...s, e: NOTIONAL.Eref, id: DEFAULTS.id };
  const neutral = { tm: 0, src: 0, alt: 0, rs: 0, rep: 0 };
  const f = (st, on) => {
    const d = shifts(st);
    for (const k of Object.keys(neutral)) if (!on.has(k)) d[k] = 0;
    const a = alphaOf(on.has('e') ? st.e : NOTIONAL.Eref, st.sa);
    const ev = NOTIONAL.e0 * Math.exp(st.k * (d.src + d.alt + d.rs));
    const C = NOTIONAL.C0 * Math.exp(-st.k * (d.tm + d.rep));
    const idv = on.has('id') ? st.id : DEFAULTS.id;
    const cut = (a * ev - C) / (1 - a), zc = (cut - idv) / NOTIONAL.sdI;
    return 1 - 1 / (1 + Math.exp(-zc));
  };
  const on = new Set();
  const steps = [{ t: 'Average correction', v: f(base, on), start: true }];
  for (const l of LEVER_ORDER) { on.add(l.key); steps.push({ t: l.t, v: f(s, on) }); }
  return steps;
}
