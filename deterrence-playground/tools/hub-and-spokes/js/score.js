// Scoring (0–100) and the debrief: where abandonment and entrapment fears peaked.
import { P } from '../data/params.js';
import { IDS } from '../data/allies.js';

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

/** Weighted score from a finished (or unfinished) game. */
export function score(s) {
  const yrs = s.track.slice(1);
  const avgCoh = mean(yrs.map(t => mean(IDS.map(id => t.allies[id].coh))));
  const finCoh = mean(IDS.map(id => s.allies[id].coh));
  const cohesion = clamp(0.5 * (yrs.length ? avgCoh : finCoh) + 0.5 * finCoh);
  const peace = clamp(100 - P.warPenalty * s.wars.length - 0.4 * mean(s.track.map(t => t.war)));
  const burden = clamp((mean(IDS.map(id => s.allies[id].effort)) - 25) * 2);
  const cred = clamp(s.cred);
  const W = P.weights;
  const parts = [
    { id: 'cohesion', label: 'Alliance cohesion', value: Math.round(cohesion), weight: W.cohesion },
    { id: 'peace', label: 'Wars avoided', value: Math.round(peace), weight: W.peace },
    { id: 'burden', label: 'Burden sharing', value: Math.round(burden), weight: W.burden },
    { id: 'cred', label: 'Hub credibility', value: Math.round(cred), weight: W.cred },
  ];
  const total = Math.round(cohesion * W.cohesion + peace * W.peace + burden * W.burden + cred * W.cred);
  return { total, parts };
}

/** For each ally, the year abandonment fear and entrapment risk peaked (from the true, hidden values). */
export function peaks(s) {
  return Object.fromEntries(IDS.map(id => {
    let fear = { v: -1, turn: 0 }, entrap = { v: -1, turn: 0 };
    s.track.forEach((t, i) => {
      if (i === 0) return;
      const a = t.allies[id];
      if (a.fear > fear.v) fear = { v: a.fear, turn: t.turn };
      if (a.entrap > entrap.v) entrap = { v: a.entrap, turn: t.turn };
    });
    return [id, { fear, entrap }];
  }));
}

export const percentile = (total, runs) => runs.length
  ? Math.round(100 * runs.filter(r => r < total).length / runs.length + 50 * runs.filter(r => r === total).length / runs.length)
  : 50;
