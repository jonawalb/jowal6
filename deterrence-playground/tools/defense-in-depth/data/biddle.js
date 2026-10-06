// Biddle's formal model of the modern system (Military Power, 2004, Appendix, pp. 209-239).
// Standalone data module: imports nothing. js/biddle.js runs the equations; the Lessons charts L10-L13 use BOOK.
//
// BOOK  = Biddle's own baseline (Table A.1, p. 218). SOURCED. These reproduce his Figs. A.2-A.14.
// SECTOR = a NOTIONAL rescale to this game's map (km and hours instead of theater km and days). It is only an
//          illustration of Biddle's logic at the map's scale, never a prediction (SPEC §3.13).

/** Table A.1 baseline, p. 218. Strengths are direct-fire troops; distances km; speeds km/day; years are tau. */
export const BOOK = Object.freeze({
  R: 1.25e6,   // invader troops in theater (preponderance 1.25:1), Table A.1 p. 218
  B: 1e6,      // defender troops in theater, Table A.1 p. 218
  tR: 1910,    // invader weapons' mean introduction year (tau), p. 211; Table A.1 baseline
  tB: 1910,    // defender weapons' tau
  d: 10,       // depth of prepared defenses, km
  fr: 0.5,     // fraction of the defender withheld in mobile reserve
  fe: 0,       // fraction of the forward garrison exposed (0 = fully concealed)
  Vr: 100,     // reserve velocity, km/day
  Va: null,    // assault velocity, km/day; null = the attacker's gain-maximizing speed, A.23 p. 216
  wa: 25,      // assault frontage, km
  wth: 500,    // theater frontage, km
  k1: 2.5,     // attackers one reinforced, concealed defender can halt (A.6)
  k2: 0.01,    // reserve-movement attrition exponent (A.5)
  k3: 0.4,     // pinning ratio away from the point of attack (A.8)
  k4: 0.5,     // flank-guard technology exponent (A.7)
  k5: 2e5,     // off-axis invader casualties (A.20)
  k6: 2e5,     // off-axis defender casualties (A.21)
  k7: 5,       // invader casualties per defender per km (A.11)
  k8: 0.1,     // speed offset in the casualty term, km/day (A.11)
  k9: 0.01,    // flank-guard density constant (A.7)
});

/** Eras used by the charts. tau values; T = (tau - 1900)/10 (A.1, p. 211). 2020 is the model's upper bound. */
export const ERAS = Object.freeze({
  1910: { tau: 1910, label: 'ca. 1910' },
  1918: { tau: 1918, label: '1917–18' },
  1930: { tau: 1930, label: 'ca. 1930' },
  2000: { tau: 2000, label: 'ca. 2000' },
  2020: { tau: 2020, label: 'Modern (2020)' },
});

/** Values the port must reproduce (scratchpad model.py, checked against the printed figures). */
export const CHECKS = Object.freeze([
  { name: 'Fig. A.8 base, Va 4.5', p: { Va: 4.5 }, G: 8.56, brk: false, page: 226 },
  { name: 'Fig. A.8, Va 10', p: { Va: 10 }, G: 6.53, brk: false, page: 226 },
  { name: 'Fig. A.8, Va 20', p: { Va: 20 }, G: 3.85, brk: false, page: 226 },
  { name: 'Fig. A.2: 15 km, f_r 0.4 contains', p: { d: 15, fr: 0.4 }, G: 10.33, brk: false, page: 220 },
  { name: 'Fig. A.2: 5 km, f_r 0.45 breaks', p: { d: 5, fr: 0.45 }, G: 6.08, brk: true, page: 220 },
  { name: 'Fig. A.2: 10 km, f_r 0.45 contains', p: { d: 10, fr: 0.45 }, G: 8.5, brk: false, page: 220 },
  { name: 'Fig. A.2: 10 km, f_r 0.75 breaks', p: { d: 10, fr: 0.75 }, G: 10.24, brk: true, page: 220 },
  { name: '2020, reserves 100 km/day break', p: { tR: 2020, tB: 2020, Vr: 100, d: 10, fr: 0.45 }, G: 13.0, brk: true, page: 233 },
  { name: '2020, reserves 20 km/day contain', p: { tR: 2020, tB: 2020, Vr: 20, d: 10, fr: 0.45 }, G: 6.78, brk: false, page: 233 },
]);

/** Readings from the printed figures (for captions and sanity tests; approximate, from the Biddle brief §8.2). */
export const FIG_READINGS = Object.freeze({
  A8: { page: 226, peakVa: [4, 5], peakG: 8.5 },
  A13: { page: 233, best: { 1910: 'fastest', 1930: [30, 50], 2000: [10, 20] } },
  A14: { page: 234, peak: { 1910: { Va: 3.75, G: 7.7 }, 2000: { Va: 1, G: 11 } } },
  A2: { page: 220, neverBelow: 5, contains: { d: 15, fr: 0.4 } },
  A3: { page: 221, fe: 0.33 },
});

/** NOTIONAL rescale to the game map (SPEC §3.13): km and HOURS. Speeds are km/h; k2 and k8 rescaled per §3.11/§3.6
 *  (k2' = 0.03 per sector/h = 0.06 per km/h; k8' = 0.1 sector/h = 0.05 km/h). Strengths are company-strength points. */
export const SECTOR = Object.freeze({
  R: 216, B: 176,  // Division ORBAT strength (SPEC D-12)
  tR: 1918, tB: 1918,
  d: 4.5, fr: 0.35, fe: 0.1, Vr: 1.5, Va: null,
  wa: 1, wth: 4,
  k1: 2.5, k2: 0.06, k3: 0.4, k4: 0.5, k5: 0, k6: 0, k7: 5, k8: 0.05, k9: 0.01,
  units: { dist: 'km', time: 'h' },
});
