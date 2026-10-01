// Exact Bayes over the attack timing. Hypotheses: "no attack", or "attack at the end of week a" for each
// possible a. Each hypothesis fixes the phase of every week, so a week's reports have a known likelihood.
// The true posterior path at the end of a game is this, run on exactly what the player saw.
import { P } from '../data/params.js';
import { EXERCISE, CATS, ALL } from '../data/indicators.js';
import { phaseOf } from './world.js';

export const HYP = [null];
for (let a = P.attackFirst; a <= P.attackLast; a++) HYP.push(a);

/** Log prior weights for a base rate. */
export function prior(rate) {
  const n = HYP.length - 1;
  return HYP.map(a => Math.log(a == null ? 1 - rate : rate / n));
}

/** Log likelihood of week t's reports under each phase. */
export function weekLogLik(wk) {
  return [0, 1, 2].map(ph => {
    let l = Math.log(wk.ex ? EXERCISE.p[ph] : 1 - EXERCISE.p[ph]);
    CATS.forEach((c, i) => { const p = (wk.ex ? c.exercise : c.normal)[ph]; l += Math.log(wk.obs[i] ? p : 1 - p); });
    return l;
  });
}
/** Log likelihood of a sharper look at category index k (in ALL) with result `found`, per phase. */
export const lookLogLik = (k, found) => [0, 1, 2].map(ph => Math.log(found ? ALL[k].look[ph] : 1 - ALL[k].look[ph]));

/** Start of week t: no attack has happened yet, so attacks before week t are ruled out. */
export const startWeek = (lw, t) => lw.map((l, i) => (HYP[i] != null && HYP[i] < t ? -Infinity : l));

/** Add per-phase log likelihoods for week t. */
export const update = (lw, t, perPhase) => lw.map((l, i) => {
  if (l === -Infinity) return l;
  const ph = phaseOf(t, HYP[i]);
  return ph == null ? -Infinity : l + perPhase[ph];
});

function norm(lw) {
  const m = Math.max(...lw);
  const w = lw.map(l => Math.exp(l - m));
  const s = w.reduce((a, b) => a + b, 0);
  return w.map(x => x / s);
}
/** P(the Neighbor attacks before the game ends). */
export const pAttack = lw => { const w = norm(lw); return 1 - w[0]; };
/** P(the attack comes at the end of one of weeks t .. t+k-1): how imminent it is. */
export const pWithin = (lw, t, k) => norm(lw).reduce((s, x, i) => s + (HYP[i] != null && HYP[i] >= t && HYP[i] < t + k ? x : 0), 0);
/** P(phase of week t = 0, 1, 2). */
export function phaseDist(lw, t) {
  const w = norm(lw), d = [0, 0, 0];
  w.forEach((x, i) => { const ph = phaseOf(t, HYP[i]); if (ph != null) d[ph] += x; });
  return d;
}
/** Mutual information (nats) between a sharper look at ALL[k] and this week's phase. */
export function lookValue(lw, t, k) {
  const pi = phaseDist(lw, t), q = ALL[k].look;
  let mi = 0;
  for (const found of [true, false]) {
    const pk = q.map(x => (found ? x : 1 - x));
    const pd = pk.reduce((s, x, i) => s + x * pi[i], 0);
    pk.forEach((x, i) => { if (pi[i] > 0 && x > 0) mi += pi[i] * x * Math.log(x / pd); });
  }
  return mi;
}

/** The true posterior path given a world and the sharper looks taken (looks[t-1] = index in ALL, or -1). */
export function posteriorPath(world, looks = []) {
  let lw = prior(world.rate);
  const out = [];
  for (let t = 1; t <= world.last; t++) {
    const wk = world.weeks[t - 1];
    lw = update(startWeek(lw, t), t, weekLogLik(wk));
    const k = looks[t - 1] ?? -1;
    if (k >= 0) lw = update(lw, t, lookLogLik(k, wk.look[k]));
    out.push(pAttack(lw));
  }
  return out;
}
