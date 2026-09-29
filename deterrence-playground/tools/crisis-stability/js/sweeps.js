// Sensitivity sweeps: move one input across its range and recompute the index.
// Each sweep returns three series: the input changed for side A only, for side B only, and for both.
import { indexOf } from './model.js';

const clone = S => JSON.parse(JSON.stringify(S));

// Hold a side's total warheads fixed while changing how they are based or loaded.
const setMirv = (s, m) => { const tot = s.nf * s.mf; s.mf = m; s.nf = tot / m; };
const setSurvShare = (s, f) => {
  const tot = s.nf * s.mf + s.ns * s.ms;
  s.nf = (tot * (1 - f)) / Math.max(1, s.mf);
  s.ns = (tot * f) / Math.max(1, s.ms);
};
const scaleAll = (s, f, base) => { s.nf = base.nf * f; s.ns = base.ns * f; };

export const SWEEPS = [
  { k: 'mirv', n: 'Warheads per fixed launcher', short: 'MIRV', xs: [1, 2, 3, 4, 5, 6, 8, 10, 12],
    fmt: v => String(v), apply: (s, v) => setMirv(s, v), cur: s => s.mf,
    note: 'Same number of fixed-launcher warheads, loaded onto fewer launchers. Each launcher becomes a richer target for a single incoming warhead.' },
  { k: 'surv', n: 'Share of warheads in survivable basing', short: 'Survivable share', xs: [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1],
    fmt: v => Math.round(v * 100) + '%', apply: (s, v) => setSurvShare(s, v),
    cur: s => (s.ns * s.ms) / Math.max(1, s.nf * s.mf + s.ns * s.ms),
    note: 'Same total warheads, moved between fixed launchers and survivable launchers. Launcher loadings stay as set.' },
  { k: 'alert', n: 'Day-to-day alert rate of survivable forces', short: 'Alert rate', xs: [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1],
    fmt: v => Math.round(v * 100) + '%', apply: (s, v) => { s.alert = v; }, cur: s => s.alert,
    note: 'Share of survivable launchers at sea, dispersed or on strip alert when the strike arrives.' },
  { k: 'de', n: 'Damage expectancy per attacking warhead', short: 'Damage expectancy', xs: [.3, .4, .5, .6, .7, .8, .9, .95],
    fmt: v => Math.round(v * 100) + '%', apply: (s, v) => { s.de = v; }, cur: s => s.de,
    note: 'Chance that one of this side\'s warheads destroys the launcher it is aimed at. It is an attribute of the attacker.' },
  { k: 'size', n: 'Arsenal size (both legs scaled)', short: 'Arsenal size', xs: [.25, .5, .75, 1, 1.5, 2, 3, 4],
    fmt: v => '×' + v, apply: (s, v, base) => scaleAll(s, v, base), cur: () => 1,
    note: 'Every launcher count multiplied by the same factor; shares, loadings and damage curves unchanged.' },
  { k: 'hold', n: 'Share withheld for a third country', short: 'Third-country reserve', xs: [0, .1, .2, .3, .4, .5],
    fmt: v => Math.round(v * 100) + '%', apply: (s, v) => { s.hold = v; }, cur: s => s.hold,
    note: 'An extension beyond Kent and Thaler: weapons each side keeps back to deter a third nuclear power, and so cannot use in this exchange.' },
];

/** Returns { xs, a:[], b:[], both:[], base, curA, curB } for a sweep key. */
export function runSweep(S, key) {
  const sw = SWEEPS.find(x => x.k === key);
  const series = which => sw.xs.map(v => {
    const T = clone(S);
    if (which !== 'b') sw.apply(T.A, v, S.A);
    if (which !== 'a') sw.apply(T.B, v, S.B);
    return indexOf(T);
  });
  return { sw, xs: sw.xs, a: series('a'), b: series('b'), both: series('both'), base: indexOf(S), curA: sw.cur(S.A), curB: sw.cur(S.B) };
}
