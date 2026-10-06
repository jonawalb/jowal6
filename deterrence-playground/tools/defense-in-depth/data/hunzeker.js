// Hunzeker, Dying to Learn (2021): the learning-phase codings (Figs. 1a-3c, p. 46) and the dimensions behind the
// schematic Lessons diagrams. Standalone data module: imports nothing.
// Real army names stay out of this file and the UI (DECISIONS D-07, D-20): the three cases are the archetypes
// Staff, Regimental and Republican (SPEC §6.2).

/** The 18 seasons of Figs. 1a-3c (p. 46), Summer '14 to Fall '18. Index i spans [i, i + 1). */
export const SEASONS = Object.freeze(['Summer ’14', 'Fall ’14', 'Winter ’15', 'Spring ’15', 'Summer ’15', 'Fall ’15',
  'Winter ’16', 'Spring ’16', 'Summer ’16', 'Fall ’16', 'Winter ’17', 'Spring ’17', 'Summer ’17', 'Fall ’17',
  'Winter ’18', 'Spring ’18', 'Summer ’18', 'Fall ’18']);
export const SEASONS_SHORT = Object.freeze(['Su14', 'F14', 'W15', 'Sp15', 'Su15', 'F15', 'W16', 'Sp16', 'Su16', 'F16',
  'W17', 'Sp17', 'Su17', 'F17', 'W18', 'Sp18', 'Su18', 'F18']);

/** Learning phases (pp. 7-10, 22-33); mastery = a majority of frontline units fight the new way (pp. 36-37). */
export const PHASES = Object.freeze({
  E: { name: 'Exploration', short: 'E', what: 'Units try new methods and report what they see.' },
  S: { name: 'Selection', short: 'S', what: 'Someone judges which experiments worked and writes them down.' },
  SA: { name: 'Selection/Action', short: 'S/A', what: 'Selection and dissemination ran together.' },
  A: { name: 'Action', short: 'A', what: 'The chosen method is codified and trained across the army.' },
  M: { name: 'Mastery', short: 'M', what: 'A majority of frontline units can fight the new way (p. 37).' },
});

export const DOMAINS = Object.freeze([
  { id: 'AT', name: 'Assault tactics', fig: '1' },
  { id: 'CA', name: 'Combined arms', fig: '2' },
  { id: 'ED', name: 'Elastic defense in depth', fig: '3' },
]);

export const ARCHETYPES = Object.freeze([
  { id: 'staff', name: 'Staff model', fig: 'a', line: 'Explored later, then selected and spread fastest; copied freely.' },
  { id: 'regimental', name: 'Regimental model', fig: 'b', line: 'Many pamphlets, no filter at first; the technical arms learned best.' },
  { id: 'republican', name: 'Republican model', fig: 'c', line: 'Explored first and most; doctrinal whiplash; elasticity barred.' },
]);

/**
 * Reference spans, in season units (0 = start of Summer '14), read from the 220-dpi render of p. 46 (±½ season;
 * Hunzeker brief §0.1). Where the text codes a transition differently the text governs; `pages` lists the text.
 */
export const REFERENCE = Object.freeze({
  staff: {
    AT: { spans: [['E', 2.5, 5], ['S', 5, 13.3], ['A', 13.3, 15], ['M', 15, 17]], pages: '71–74' },
    CA: { spans: [['E', 4, 7], ['S', 7, 13], ['A', 13, 15], ['M', 15, 17]], pages: '75–77' },
    ED: { spans: [['E', 4, 8.5], ['SA', 8.5, 11], ['M', 11, 17]], pages: '79–82' },
  },
  regimental: {
    AT: { spans: [['E', 1, 3], ['E', 8, 10], ['S', 10, 14], ['A', 14, 17]], pages: '102–107', note: 'Exploration stopped in Spring ’15 and restarted in Summer ’16; no mastery.' },
    CA: { spans: [['E', 2.5, 10], ['S', 10, 13], ['A', 13, 16], ['M', 16, 17.5]], pages: '110–113' },
    ED: { spans: [['E', 2, 15.5], ['SA', 15.5, 17]], pages: '115–118', note: 'Mastery untested.' },
  },
  republican: {
    AT: { spans: [['E', 0, 11], ['S', 11, 12.5], ['A', 12.5, 17]], pages: '142–149', note: 'No mastery (p. 149).' },
    CA: { spans: [['E', 0, 11], ['S', 11, 12.5], ['A', 12.5, 16], ['M', 16, 18]], pages: '151–156' },
    ED: { spans: [['E', 1, 17]], pages: '157–159', note: 'Never left exploration.' },
  },
});

/** Elastic defense in depth, 1917 doctrine (pp. 81-82), and the copy that kept the form only (p. 117). km from the front. */
export const ZONES = Object.freeze([
  { id: 'outpost', name: 'Outpost zone', from: 0, to: 1, depth: '600 m – 1 km', pages: '81–82',
    garrison: 'Scattered sentry groups and light posts.',
    role: 'Warn, delay and break up infiltrators; fall back under pressure rather than die in place.' },
  { id: 'battle', name: 'Battle zone', from: 1, to: 3.5, depth: '1.5 – 3 km', pages: '81–82',
    garrison: 'Trench series at its front; strongpoints, machine-gun nests and obstacles; a larger force in trenches at its rear.',
    role: 'Hold against raids; against a big attack, shift or yield within limits, then strike back.' },
  { id: 'rear', name: 'Rear zone', from: 3.5, to: 7, depth: 'about 3 km more', pages: '81–82',
    garrison: 'Storm battalions and reserve units; behind them the Counterstroke divisions.',
    role: 'Feed the battle and mount the deliberate counterattack.' },
]);
export const ZONE_TOTAL_KM = 10;   // "up to ~10 km" deep (pp. 81-82); 8 km already in the 1915 reorganization (p. 79)

export const COUNTERATTACKS = Object.freeze({
  riposte: { name: 'Riposte', when: 'within 24 h', who: 'nearby units; leaders down to squad level may launch it without asking', page: 82 },
  counterstroke: { name: 'Counterstroke', when: 'when a riposte is not feasible', who: 'assault divisions from the rear', page: 82 },
  timing: { text: 'Strike after the attacker starts to consolidate and before he finishes; beyond his artillery.', pages: '61–62, 79' },
  orderDelay: { text: 'Counterattack orders took 8 hours or more to arrive.', page: 80 },
});

/** The copy that kept the form but not the rules (p. 117). */
export const FORM_NOT_RULES = Object.freeze({
  page: 117, battleZoneStartKm: 4,
  faults: ['Too many men in the outpost zone', 'Hold at all costs', 'Slow, deliberate counterattack only', 'Rear zone existed only on maps'],
});

/** Creeping barrage (p. 110; p. 148). Yards per minute. */
export const BARRAGE = Object.freeze({
  aheadYd: 100, page: 110,
  rates: [
    { id: 'rough', ydMin: 15, label: '15 yd/min (rough ground)', page: 110 },
    { id: 'fast', ydMin: 109.36 / 4, label: '100 m / 4 min (too fast for the ground)', page: 148 },
    { id: 'good', ydMin: 75, label: '75 yd/min (good ground)', page: 110 },
  ],
  early: 'Shift too early and the defenders man the parapet; too late and you shell your own infantry (p. 52).',
});

/** Leapfrog (p. 56; bounds p. 70). */
export const LEAPFROG = Object.freeze({ quote: 'akin to playing a game of leapfrog, albeit with guns', quotePage: 56, boundYd: [50, 100], boundPage: 70, groundPage: 57 });

/** Storm-squad attack (pp. 71-72). */
export const INFIL = Object.freeze({ squadSize: 8, pages: '71–72', mopUp: 'Mop-up units follow close behind to clear the bypassed strongpoints.' });

/** Four-phase fire plan (p. 76) and the direct-support battery (pp. 76-77). */
export const FIREPLAN = Object.freeze([
  { id: 1, name: 'Target reconnaissance', what: 'List command posts, depots and communications.', control: 'Senior artillery commander' },
  { id: 2, name: 'Hurricane on those targets', what: 'Short, intense predicted fire; no registration needed.', control: 'Senior artillery commander' },
  { id: 3, name: 'Counter-battery', what: 'Mass on the enemy batteries.', control: 'Senior artillery commander' },
  { id: 4, name: 'Creeping barrage', what: 'Walk the fire ahead of the infantry.', control: 'Divisions (control handed down)' },
]);
export const FIREPLAN_PAGE = 76;

/** Attacker's dilemmas (pp. 53-54). */
export const DILEMMA = Object.freeze({ pages: '53–54', depth: 'Go deep and outrun your guns, or bite and hold within their reach.', breadth: 'A narrow front makes a salient the defender can fire into from three sides.' });

/** Three-layer position, 1915 (pp. 78-79). Metres behind the forward edge. */
export const SLOPE = Object.freeze({ mlrBehindCrestM: 200, secondZoneBehindMlrKm: 1, reservesBehindKm: [2, 4], pages: '78–79' });
