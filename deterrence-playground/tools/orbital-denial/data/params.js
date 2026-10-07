// Orbital Denial: every model parameter. `src` names a key in sources.js; no `src` means NOTIONAL.
// Sourced values: NASA standard breakup model (Johnson et al. 2001, as printed in ODQN 15-4), the 45% catastrophic
// share (Kessler et al. 2010), shell lifetimes fitted to the Cosmos 1408 (ODQN 28-2) and Fengyun-1C (ODQN 26-4)
// clouds, and the 10 km/s typical LEO impact speed (Kessler et al. 2010). Everything else is notional.

export const TURNS = 10;          // one turn = one month
export const CRISIS_TURNS = 3;    // months 1-3 crisis, 4-10 war
export const DT = 1 / 12;         // years per turn
export const ACTIONS_PER_TURN = 2;

// Orbital shells. Altitudes are the two historical anchors; MEO and GEO are drawn schematically.
export const SHELLS = {
  low:  { name: 'Low LEO', alt: 450, tau: 0.83, v: 10, band: 100 },
  high: { name: 'High LEO', alt: 850, tau: 70, v: 10, band: 100 },
  meo:  { name: 'MEO', alt: 20000, tau: Infinity, v: 1, band: 100 },
  geo:  { name: 'GEO', alt: 35786, tau: Infinity, v: 0.5, band: 100 },
};
export const SHELL_KEYS = ['low', 'high', 'meo', 'geo'];
export const R_EARTH = 6378;

// Missions: each side flies one constellation per mission, in one shell.
export const MISSIONS = {
  isr: { name: 'Reconnaissance (ISR)', short: 'ISR', shell: 'low', n0: 6, need: 6, mass: 2000, w: 0.35 },
  com: { name: 'Communications', short: 'Comms', shell: 'high', n0: 24, need: 16, mass: 500, w: 0.30 },
  nav: { name: 'Navigation', short: 'Nav', shell: 'meo', n0: 24, need: 18, mass: 1500, w: 0.25 },
  ew:  { name: 'Early warning and nuclear command', short: 'Warning/NC3', shell: 'geo', n0: 4, need: 3, mass: 3000, w: 0.10, entangled: true },
};
export const MISSION_KEYS = ['isr', 'com', 'nav', 'ew'];

// Everyone else's satellites (commercial, civil, other states) and the pre-war fragment population, per shell.
export const BACKGROUND = { low: 1500, high: 1000, meo: 60, geo: 300 };
export const BG_MASS = 300;
export const DEBRIS0 = { low: 1000, high: 3000, meo: 50, geo: 100 };

// Each side's stocks for the whole game.
export const STOCKS = { asat: 6, coorb: 3, maneuver: 4, reconst: 3, prolif: 2 };

// All tunable coefficients, listed on the page.
export const P = [
  { k: 'sbmA', v: 0.1, t: 'Breakup model: fragments ≥ Lc = A · M^0.75 · Lc^−1.71, coefficient A', u: '', src: 'krisko2011' },
  { k: 'sbmB', v: 0.75, t: 'Breakup model: mass exponent', u: '', src: 'krisko2011' },
  { k: 'sbmC', v: 1.71, t: 'Breakup model: size exponent', u: '', src: 'krisko2011' },
  { k: 'lcTrack', v: 0.10, t: 'Size of a "trackable" fragment (Lc)', u: 'm', note: '10 cm, the usual catalog threshold; the ODQN counts FY-1C "large debris (most larger than 10 cm)"', src: 'odqn12_1' },
  { k: 'kvMass', v: 20, t: 'Interceptor mass added to the target in the breakup model', u: 'kg', note: 'the model sums target and projectile mass' },
  { k: 'fragMult', v: 1, t: 'Fragment multiplier on the breakup model', u: '×', note: '1 matches Cosmos 1408; about 4 matches Fengyun-1C (see calibration)' },
  { k: 'coorbFrac', v: 0.05, t: 'Co-orbital kill: share of a full breakup', u: '', note: 'a low-debris kill such as a grapple or close-range disable' },
  { k: 'stayShare', v: 0.75, t: 'Share of fragments staying in the target\'s shell', u: '', note: 'the rest scatter to the other LEO shell or out of the model' },
  { k: 'pCat', v: 0.45, t: 'Share of debris strikes that are catastrophic', u: '', src: 'kessler2010', note: 'LEGEND: 45% catastrophic, 55% non-catastrophic' },
  { k: 'sigma', v: 10, t: 'Satellite cross-section', u: 'm²' },
  { k: 'smallRatio', v: 51.3, t: 'Fragments ≥1 cm per fragment ≥10 cm', u: '×', src: 'krisko2011', note: '10^1.71 from the breakup model; FY-1C gives about 58 (150,000 / 2,600, ODQN 12-1)' },
  { k: 'pSmallKill', v: 0.2, t: 'Chance a 1–10 cm strike ends a satellite\'s mission', u: '' },
  { k: 'freshK', v: 3, t: 'Extra hazard from a fresh, still-concentrated cloud', u: '×', note: 'ODQN 11-2: the cloud starts as a disk and disperses within the year' },
  { k: 'bgSource', v: 1, t: 'Background fragment source, as a share of what holds the pre-war count steady against decay', u: '×', src: 'esa2025', note: 'ESA: debris keeps growing even without new launches; 1 holds each shell at its pre-war count with no attacks, the size is notional' },
  { k: 'freshTau', v: 0.33, t: 'Time for a fresh cloud to disperse', u: 'yr' },
  { k: 'pAsat', v: 0.8, t: 'Direct-ascent intercept succeeds', u: '' },
  { k: 'pCoorb', v: 0.7, t: 'Co-orbital attack succeeds', u: '' },
  { k: 'ssaDep', v: 0.5, t: 'Share of attack accuracy that depends on the attacker\'s own reconnaissance', u: '', note: 'CSIS 2025: many counterspace weapons depend on space awareness and intelligence to find targets', src: 'csis2025' },
  { k: 'manFactor', v: 0.5, t: 'Maneuvering multiplies hit chance and debris hazard by', u: '×' },
  { k: 'jamLo', v: 0.25, t: 'Jamming: lowest effect on a mission this month', u: '' },
  { k: 'jamHi', v: 0.5, t: 'Jamming: highest effect', u: '' },
  { k: 'dazLo', v: 0.3, t: 'Dazzling: lowest effect on reconnaissance', u: '' },
  { k: 'dazHi', v: 0.55, t: 'Dazzling: highest effect', u: '' },
  { k: 'dazDamage', v: 0.1, t: 'Dazzling permanently damages one satellite', u: '', note: 'CSIS: dazzlers "may also unintentionally damage" a satellite', src: 'csis2025' },
  { k: 'pCyber', v: 0.5, t: 'Cyber attack succeeds', u: '' },
  { k: 'cyberEff', v: 0.5, t: 'Cyber: effect for this month and next', u: '' },
  { k: 'hardFactor', v: 0.5, t: 'Backups multiply reversible effects by', u: '×' },
  { k: 'h0Crisis', v: 0.002, t: 'Escalation hazard per crisis month, before any action', u: '' },
  { k: 'h0War', v: 0.004, t: 'Escalation hazard per war month, before any action', u: '' },
  { k: 'wRev', v: 0.0008, t: 'Hazard per jamming or dazzling action', u: '' },
  { k: 'wCyber', v: 0.0012, t: 'Hazard per cyber action', u: '' },
  { k: 'wAsat', v: 0.012, t: 'Hazard per direct-ascent shot', u: '' },
  { k: 'wCoorb', v: 0.010, t: 'Hazard per co-orbital attack', u: '' },
  { k: 'entangle', v: 6, t: 'Multiplier when the target is early warning or nuclear command', u: '×', note: 'Acton 2018 names the mechanism; the size is notional' },
  { k: 'phi', v: 1.5, t: 'Fog: hazard × (1 + φ · the target side\'s lost warning and ISR)', u: '', note: 'same form as the Nuclear Entanglement tool' },
  { k: 'firstKill', v: 2, t: 'Multiplier on the first destructive attack of the game', u: '×' },
  { k: 'theta', v: 0.5, t: 'Advantage needed to call the war for one side', u: '' },
  { k: 'crisisW', v: 0.2, t: 'Weight of a crisis month in the advantage tally', u: '' },
];
export const PDEF = Object.fromEntries(P.map(p => [p.k, p.v]));

// Sourced calibration anchors (see sources.js and METHOD.md).
export const ANCHORS = {
  fy1c: { name: 'Fengyun-1C (2007)', mass: 960, alt: '845 × 865 km', src: 'odqn11_2',
    counts: [[0.17, 1200, 'odqn11_2'], [0.97, 2317, 'odqn12_1'], [3.7, 3037, 'odqn14_4'], [15.3, 3532, 'odqn26_4']],
    onOrbit: [[15.3, 2837, 'odqn26_4']] },
  c1408: { name: 'Cosmos 1408 (2021)', mass: 1750, alt: '490 × 465 km', src: 'odqn26_1',
    counts: [[0, 1500, 'usspacecom2021'], [0.31, 1604, 'odqn26_1'], [0.46, 1760, 'odqn26_4'], [2.2, 1805, 'odqn28_2']],
    onOrbit: [[0.46, 990, 'odqn26_4']] },
};
