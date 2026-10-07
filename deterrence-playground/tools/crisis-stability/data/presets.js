// Force-posture presets for the Crisis Stability Calculator.
// Every value here is NOTIONAL unless a preset says otherwise. Sides are generic ("Side A", "Side B").
// Fields per side: nf fixed launchers, mf warheads per fixed launcher, ns survivable launchers,
// ms warheads per survivable launcher, alert day-to-day share of survivable launchers that cannot be
// targeted, de damage expectancy of one attacking warhead against one launcher, w80 enemy weapons that
// would destroy 80% of this side's value (sets the damage curve), hold share withheld for a third country.

const side = o => ({ nf: 400, mf: 1, ns: 70, ms: 16, alert: 0.6, de: 0.8, w80: 900, hold: 0, ...o });

export const PRESETS = [
  { k: 'mixed', n: 'Survivable vs MIRVed silos', s: 'Default. A has single-warhead silos and a large survivable leg; B puts most warheads in six-warhead silos.',
    A: side({}), B: side({ nf: 150, mf: 6, ns: 40, alert: 0.4 }), prl: false, wpt: 2 },
  { k: 'surv', n: 'Both mostly survivable', s: 'About 1,600 warheads each, two-thirds on survivable launchers kept 70% on alert.',
    A: side({ nf: 500, alert: 0.7 }), B: side({ nf: 500, alert: 0.7 }), prl: false, wpt: 2 },
  { k: 'silos', n: 'Both MIRVed silos', s: 'About 1,500 warheads each, most in ten-warhead silos: the classic unstable case.',
    A: side({ nf: 110, mf: 10, ns: 25, alert: 0.4 }), B: side({ nf: 110, mf: 10, ns: 25, alert: 0.4 }), prl: false, wpt: 2 },
  { k: 'cuts', n: 'Deep cuts, low alert', s: 'About 500 warheads each with survivable forces mostly off alert day to day.',
    A: side({ nf: 150, mf: 1, ns: 22, ms: 16, alert: 0.3, w80: 900 }), B: side({ nf: 60, mf: 3, ns: 20, ms: 16, alert: 0.3, w80: 900 }), prl: false, wpt: 2 },
  { k: 'cutsSurv', n: 'Deep cuts, survivable', s: 'The same 500 warheads each, single-warhead silos and survivable forces kept 80% on alert.',
    A: side({ nf: 150, mf: 1, ns: 22, ms: 16, alert: 0.8 }), B: side({ nf: 150, mf: 1, ns: 22, ms: 16, alert: 0.8 }), prl: false, wpt: 2 },
  { k: 'fas', n: 'U.S. and Russian deployed totals', s: 'Warheads by leg from FAS and the Nuclear Notebook (2026). Everything else notional; see the note below the panel.',
    // Warhead totals are sourced: U.S. 400 ICBM (400 Minuteman III, one each), ~970 SLBM + 300 bomber = 1,270 survivable;
    // Russia ~892 on land-based missiles (324 ICBMs, silo and road-mobile, no split used here), ~704 SLBM + 200 bomber = 904.
    // Launcher loadings for the survivable legs (10 per launcher), Russia's 3 per ICBM (891 on 297), alert rates,
    // damage expectancy and damage curves are NOTIONAL.
    A: side({ nf: 400, mf: 1, ns: 127, ms: 10, alert: 0.6 }), B: side({ nf: 297, mf: 3, ns: 90, ms: 10, alert: 0.4 }), prl: false, wpt: 2,
    note: 'Side A uses U.S. deployed warheads: 400 on 400 Minuteman III silos, about 970 on submarines and 300 at bomber bases. Side B uses Russian deployed warheads: about 892 on land-based missiles and about 904 on submarines and at bomber bases. Russia\'s land-based force mixes silos and road-mobile launchers; with no public split used here, all of it sits in the fixed column, the least survivable case. Survivable launchers are shown as 10-warhead units. Alert rates, damage expectancy and damage curves are notional, so the index is not an assessment of U.S.-Russian stability.' },
];

export const DEFAULT_PRESET = 'mixed';
