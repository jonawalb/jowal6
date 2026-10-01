// Outcomes and 0-100 scores for both sides, full computer play-outs, and the benchmark.
import { P } from '../data/params.js';
import { newGame, runWeek } from './engine.js';
import { redAI, blueCollectAI, blueDecideAI } from './ai.js';

const clamp01 = x => Math.max(0, Math.min(1, x));
const falseAlarm = s => s.intent === 'exercise' && s.warnings > 0;

/** Who won, in a sentence. */
export function outcome(s) {
  const o = s.over;
  if (!o) return null;
  if (o.reason === 'attack') return o.success
    ? { winner: 'red', key: 'surprise', title: 'Red’s attack succeeded', text: s.warnings ? 'Blue warned, but not early enough for mobilization to tell.' : 'Blue never warned. The exercise covered the build-up.' }
    : { winner: 'blue', key: 'defeated', title: 'Red’s attack failed', text: s.M >= 50 ? 'Blue warned in time and was mobilized when Red moved.' : 'Blue was not ready, but the attack failed anyway.' };
  if (s.intent === 'attack') return { winner: 'blue', key: s.warnings ? 'deterred' : 'stalled', title: 'Red never attacked', text: s.warnings ? 'Blue’s warning and mobilization kept the window shut.' : `Red’s preparations reached ${Math.round(s.R)} of 100 and ran out of weeks.` };
  return falseAlarm(s)
    ? { winner: 'red', key: 'falsealarm', title: 'It was only an exercise', text: `Blue warned ${s.warnings > 1 ? s.warnings + ' times' : ''} against an exercise. Red learned something about Blue’s sources, and Blue’s word is worth less next time.`.replace('  ', ' ') }
    : { winner: 'blue', key: 'calm', title: 'It was only an exercise, and Blue kept its nerve', text: 'Blue read the exercise for what it was and never cried wolf.' };
}

/** Score for one side, with its parts. */
export function score(s, side) {
  const parts = side === 'blue' ? blueParts(s) : redParts(s);
  return { total: Math.round(parts.reduce((t, p) => t + p.value, 0)), parts };
}
/** Mobilized weeks that bought nothing: all of them against an exercise; against an attack, all but the
 * `P.score.usefulMob` weeks before it (or before the end, if the warning deterred it). */
export const costlyWeeks = s => Math.max(0, s.mobWeeks - (s.intent === 'attack' ? P.score.usefulMob : 0));
function blueParts(s) {
  const o = s.over, ex = s.intent === 'exercise';
  let res, label;
  if (o.reason === 'attack') { res = o.success ? 25 * s.M / 100 : 60; label = o.success ? 'Attack succeeded (credit for mobilization)' : 'Attack defeated'; }
  else if (!ex) { res = s.warnings ? 55 : 50; label = s.warnings ? 'Attack deterred after warning' : 'Red never got ready'; }
  else { res = s.warnings ? 20 : 60; label = s.warnings ? 'False alarm' : 'Correctly did not warn'; }
  const k = o.reason === 'attack' && o.success ? 0.5 : 1;   // after a successful surprise, the rest counts half
  return [
    { label, value: res, max: 60 },
    { label: 'Credibility kept' + (k < 1 ? ' (half after a surprise)' : ''), value: k * 20 * s.C / 100, max: 20 },
    { label: 'Mobilization not wasted' + (k < 1 ? ' (half after a surprise)' : ''), value: k * 20 * clamp01(1 - costlyWeeks(s) / P.score.mobWeeks), max: 20 },
  ];
}
function redParts(s) {
  const o = s.over;
  if (s.intent === 'exercise') return [
    { label: 'Exercise program run', value: 40 * clamp01(s.tempoWindow / (P.calendar.windowLen * 2 * 3)), max: 40 },
    { label: 'Blue cried wolf', value: falseAlarm(s) ? 40 : 0, max: 40 },
    { label: 'Blue credibility spent', value: 20 * (1 - s.C / 100), max: 20 },
  ];
  if (o.reason === 'attack') return o.success
    ? [{ label: 'Attack succeeded', value: 70, max: 70 }, { label: 'Surprise (Blue unmobilized)', value: 30 * (1 - s.M / 100), max: 30 }]
    : [{ label: 'Attack failed', value: 10, max: 70 }, { label: 'Surprise (Blue unmobilized)', value: 10 * (1 - s.M / 100), max: 30 }];
  return [{ label: 'Readiness built, never used', value: 25 * s.R / 100, max: 70 }, { label: 'Blue credibility spent', value: 15 * (1 - s.C / 100), max: 30 }];
}

/** Play the rest of a game with the computer on both sides. hooks.red / hooks.collect / hooks.decide override a side. */
export function playOut(s, hooks = {}) {
  while (!s.over) {
    const red = (hooks.red || redAI)(s);
    s = runWeek(s, red, t => (hooks.collect || blueCollectAI)(t), t => (hooks.decide || blueDecideAI)(t));
  }
  return s;
}

/** Benchmark: the computer in the player's seat, same side and Red intent, varying the seed. */
export function benchmark({ seed, side, intent }, n = P.benchRuns) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const sd = (seed * 31 + i * 7919) >>> 0;
    let s = newGame({ seed: sd, side, intent });
    s.intent = intent;
    s = playOut(s);
    out.push(score(s, side).total);
  }
  return out;
}
export const percentile = (total, runs) => runs.length ? Math.round(100 * runs.filter(r => r < total).length / runs.length + 50 * runs.filter(r => r === total).length / runs.length) : 50;
