// Computer players. Red: a hidden intent and a deception strategy that adapts to how suspicious it thinks Blue is.
// Blue: a Bayesian that spends collection where it best separates "attack" from "exercise" and warns on its posterior.
import { P } from '../data/params.js';
import { makeRng, STREAM } from './rng.js';
import { inWindow, sigmoid, sens, greedyCollect, attackOdds, mobRate } from './model.js';
import { emptyRed, canAttack } from './engine.js';

/** Order preparation activities from least to most visible to the sources Red believes Blue relies on. */
function quietestPrep(s) {
  const w = Object.fromEntries(P.sources.map(k => [k, 0.25 + s.exposure[k]]));
  const vis = a => P.sources.reduce((v, k) => v + w[k] * sens(s, k, a), 0);
  return [...P.prep].sort((a, b) => vis(a) - vis(b));
}
function spread(m, n, order) {
  for (let i = 0; i < n; i++) m.a[order[i % order.length]]++;
}

/** Red's weekly move. */
export function redAI(s) {
  const r = makeRng(s.seed, STREAM.ai + s.week);
  const m = emptyRed();
  const win = inWindow(s), last = s.week === P.weeks - 1;

  if (s.intent === 'exercise') {
    if (win) { m.a.tempo = 4; m.a.deception = 1; m.a.units = r.u() < 0.5 ? 1 : 0; }
    else if (s.feint && r.u() < 0.45) { m.a.reserves = 2; m.a.units = 1; m.a.tempo = 1; m.cover = r.u() < 0.5 ? 'snap' : 'open'; }
    else { m.a.tempo = 1 + (r.u() < 0.4 ? 1 : 0); }
    return m;
  }

  // Attack intent: strike when waiting no longer pays.
  if (canAttack(s)) {
    const now = attackOdds(s.R, s.M);
    const next = attackOdds(Math.min(100, s.R + 14), s.mobilized ? s.M + mobRate(s.C) : s.M);
    if (s.R >= 100 || last || (now >= next && now >= 0.2)) return { ...m, attack: true };
  }

  const suspicion = sigmoid(s.zRed);
  const order = quietestPrep(s);
  let prep, hide, quiet, tempo;
  if (s.strategy === 'rush') { prep = win ? 4 : 5; hide = 1; quiet = 0; tempo = win ? 1 : 0; m.cover = win ? 'cycle' : 'open'; }
  else if (s.strategy === 'cycle') {
    if (win) { prep = 3; hide = 1; quiet = 0; tempo = 2; m.cover = 'cycle'; }
    else { prep = 2; hide = 1; quiet = 1; tempo = 1; }
  } else { // quiet
    if (win) { prep = 2; hide = 1; quiet = 1; tempo = 2; m.cover = 'cycle'; }
    else { prep = 3; hide = 2; quiet = 1; tempo = 0; }
  }
  // Adapt: more cover when Blue looks suspicious, more speed when it does not or time is short.
  if (suspicion > 0.6 && prep > 2 && !s.mobilized) { prep--; hide = Math.min(3, hide + 1); }
  if ((suspicion < 0.3 || s.week >= P.weeks - 4) && hide > 0) { hide--; prep++; }
  if (s.mobilized && s.R < P.readiness.attackMin && attackOdds(P.readiness.attackMin, s.M + 2 * mobRate(s.C)) < 0.2) {
    // Blue is mobilizing and an attack is already hopeless: go quiet and look like an exercise.
    m.a.tempo = win ? 4 : 1; m.a.deception = 1; m.cover = 'open';
    return m;
  }
  spread(m, prep, r.u() < 0.25 ? [...order].reverse() : order);
  m.a.deception = hide; m.a.comms = quiet; m.a.tempo = tempo;
  return m;
}

/** Blue's collection plan. */
export const blueCollectAI = s => greedyCollect(s);

/** Blue's decision after this week's readings. */
export function blueDecideAI(s) {
  const p = sigmoid(s.z), A = P.ai;
  const belief = Math.round(p * 100);
  if (!s.mobilized) {
    const late = s.week >= P.weeks - 4;
    if (p >= A.warnAt || (p >= A.warnAtReady && s.readyEst >= A.readyEst) || (late && p >= A.lateWarn)) return { act: 'warn', belief };
    return { act: 'hold', belief };
  }
  return { act: p < A.standDownAt ? 'stand' : 'hold', belief };
}
