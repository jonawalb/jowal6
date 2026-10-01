// Scoring: calibration (Brier), outcome (readiness if attacked, minus what the warnings cost) and the
// decision-maker's remaining trust. All weights are illustrative and live in data/params.js.
import { P } from '../data/params.js';

const clamp = x => Math.max(0, Math.min(100, x));

/** Mean squared error of probability forecasts (0..1) against a 0/1 outcome. Lower is better. */
export const brier = (ps, y) => (ps.length ? ps.reduce((s, p) => s + (p - y) ** 2, 0) / ps.length : 0);

export function score(s) {
  const attack = !!s.over?.attack;
  const B = brier(s.hist.map(h => h.p / 100), attack ? 1 : 0);
  const cal = clamp(100 * (1 - 2 * B));
  const base = attack ? s.ready : 100;
  const outcome = clamp(base - s.cost * P.costScale);
  const trust = clamp(s.trust);
  const W = P.weights;
  return {
    total: Math.round(W.cal * cal + W.outcome * outcome + W.trust * trust),
    brier: B,
    parts: [
      { id: 'cal', label: 'Calibration', value: Math.round(cal), weight: W.cal, note: `Brier score ${B.toFixed(3)} (0 is perfect; always saying 50% gives 0.250)` },
      { id: 'outcome', label: 'Outcome', value: Math.round(outcome), weight: W.outcome, note: attack ? `readiness ${Math.round(s.ready)} when the attack came, minus ${Math.round(s.cost)} in response costs` : `no attack; 100 minus ${Math.round(s.cost)} in response costs` },
      { id: 'trust', label: 'Trust left', value: Math.round(trust), weight: W.trust, note: `${s.falseAlarms} false alarm${s.falseAlarms === 1 ? '' : 's'}` },
    ],
  };
}

export const percentile = (total, runs) => (runs.length ? Math.round(100 * runs.filter(r => r < total).length / runs.length + 50 * runs.filter(r => r === total).length / runs.length) : 50);
