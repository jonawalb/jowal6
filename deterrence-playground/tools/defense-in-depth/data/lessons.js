// Lessons panel metadata: one entry per diagram (SPEC §7.6). Standalone data module: imports nothing.
// js/diagrams/index.js mounts them; js/ui/lessons-ui.js places them. Captions cite figure and printed page.
// kind 'redrawn'   -> "Redrawn and expanded from …" (a source figure exists)
// kind 'schematic' -> "Schematic after descriptions in …" (text only; no source figure)

export const BIDDLE = 'Biddle, Military Power (2004)';
export const HUNZEKER = 'Hunzeker, Dying to Learn (2021)';

export const LESSONS = Object.freeze([
  { id: 'L1', pri: 1, file: 'dg-enfilade', title: 'Enfilade: fire along the line, not into it',
    lesson: 'A machine gun firing from the flank hits many more men per burst than one firing from the front.',
    kind: 'schematic', cite: `${BIDDLE}, p. 44 (directional cover), p. 120; ${HUNZEKER}, p. 77` },
  { id: 'L2', pri: 1, file: 'dg-coverage', title: 'Interlocking fields and dead ground',
    lesson: 'Sectors covered from two or more directions leave the attacker almost no usable dead ground.',
    kind: 'schematic', cite: `${BIDDLE}, p. 44 (fire across each other’s fronts) and p. 36 (invisible ground)` },
  { id: 'L3', pri: 1, file: 'dg-zones', title: 'Elastic defense in depth',
    lesson: 'Thin forward, strong in depth, and strike back on time.',
    kind: 'schematic', cite: `${HUNZEKER}, pp. 81–82 (zones, counterattacks) and p. 117 (the copy that kept the form)` },
  { id: 'L4', pri: 2, file: 'dg-slope', title: 'Reverse slope: let the crest hide you',
    lesson: 'A main line behind the crest is invisible to ground observers and hard for their guns to register.',
    kind: 'schematic', cite: `${HUNZEKER}, pp. 78–79; ${BIDDLE}, pp. 96–97` },
  { id: 'L5', pri: 1, file: 'dg-barrage', title: 'The barrage and the infantry',
    lesson: 'Lift too early and the defenders man the parapet; lift too late and you shell your own men.',
    kind: 'schematic', cite: `${HUNZEKER}, p. 110 (rates, 100 yd ahead), p. 147 (100 m every 4 min), p. 52; ${BIDDLE}, pp. 31, 38` },
  { id: 'L6', pri: 2, file: 'dg-fireplan', title: 'A four-phase fire plan',
    lesson: 'Blind the enemy, then silence his guns, then walk the fire in front of your infantry.',
    kind: 'schematic', cite: `${HUNZEKER}, pp. 76–77` },
  { id: 'L7', pri: 1, file: 'dg-leapfrog', title: 'Leapfrog',
    lesson: 'One element fires while the other bounds; then they swap.',
    kind: 'schematic', cite: `${HUNZEKER}, p. 56 and p. 70 (50–100-yd bounds); ${BIDDLE}, pp. 31, 37–38` },
  { id: 'L8', pri: 1, file: 'dg-infil', title: 'Infiltration and mop-up',
    lesson: 'Storm squads slip past strongpoints; an outpost zone with overlapping watch catches them.',
    kind: 'schematic', cite: `${HUNZEKER}, pp. 71–72, 58; ${BIDDLE}, pp. 33, 55` },
  { id: 'L9', pri: 1, file: 'dg-counter', title: 'The counterattack window',
    lesson: 'Strike a fresh lodgment before it consolidates and while it is beyond its guns.',
    kind: 'schematic', cite: `${HUNZEKER}, pp. 79, 82; ${BIDDLE}, pp. 47–48` },
  { id: 'L10', pri: 1, file: 'dg-race', title: 'The race: penetration against reserves',
    lesson: 'The attack halts when the defender’s reserves arrive before the attacker gets through the depth.',
    kind: 'redrawn', cite: `${BIDDLE}, Fig. A.1, p. 211 (equations A.14–A.19, p. 214)` },
  { id: 'L11', pri: 1, file: 'dg-curves', title: 'Depth, reserves and breakthrough',
    lesson: 'Shallow defenses or tiny reserves break; depth and reserves are weak substitutes for each other.',
    kind: 'redrawn', cite: `${BIDDLE}, Fig. A.2, p. 220, and Fig. A.3, p. 221` },
  { id: 'L12', pri: 1, file: 'dg-curves', title: 'How fast should an assault go?',
    lesson: 'Gain peaks at a moderate speed, and the best speed falls as weapons grow more lethal.',
    kind: 'redrawn', cite: `${BIDDLE}, Fig. A.8, p. 226, and Fig. A.14, p. 234` },
  { id: 'L13', pri: 1, file: 'dg-curves', title: 'How fast should reserves move?',
    lesson: 'Too slow and they never arrive; too fast and they die on the road. Lethality moves the best speed down.',
    kind: 'redrawn', cite: `${BIDDLE}, Fig. A.13, p. 233` },
  { id: 'L14', pri: 2, file: 'dg-curves', title: 'Modern system against non-modern',
    lesson: 'Breakthrough needs a defender who fights exposed; a modern defense contains even a modern attack.',
    kind: 'redrawn', cite: `${BIDDLE}, Table 4.1, p. 74, and Table A.3, p. 235` },
  { id: 'L15', pri: 1, file: 'dg-learning', title: 'How armies learn',
    lesson: 'Explore, select, act, master: the army that filters and trains best learns fastest.',
    kind: 'redrawn', cite: `${HUNZEKER}, Figs. 1a–3c, p. 46 (codings pp. 37, 45)` },
  { id: 'L16', pri: 2, file: 'dg-dilemma', title: 'The attacker’s dilemmas',
    lesson: 'Go deep and outrun your guns, or stay shallow; go narrow and be shot from three sides.',
    kind: 'schematic', cite: `${HUNZEKER}, pp. 53–54; ${BIDDLE}, pp. 42–44, 120` },
]);

export const lessonById = id => LESSONS.find(l => l.id === id);
export const captionFor = l => (l.kind === 'redrawn' ? 'Redrawn and expanded from ' : 'Schematic after descriptions in ') + l.cite + '.';

/**
 * Game constants the diagrams show. They mirror SPEC §3.2-§3.7 so the readouts use the game's own numbers.
 * data/params.js (W1-A) is authoritative; keep these equal (scripts/diagrams.test.mjs compares them when it can).
 */
export const GAME = Object.freeze({
  ENF: { waves: 3.0, column: 2.5, trench: 2.5, groups: 2.9, none: 1.0 },    // §3.4, NOTIONAL
  coverDirFront: 0.5,   // illustrative directional cover of a fold or parapet at θ = 0 (§3.3; NOTIONAL)
  X: { rush: 1.0, bound: 0.27, boundShort: 0.19, overwatch: 0.15, noPartner: 0.60, hold: 0.20 },   // §3.6
  shortBound: { x: 0.7, progress: 0.75 },
  owCap: { rifle: 0.6, mg: 0.7 },
  deadGround: { perDir: 0.35, use: { leapfrog: 1.0, infiltrate: 1.0, rush: 0.3 }, unscouted: 0.5 },   // §3.4
  detect: { same: 0.9, adjacent: 0.25, overlap: 1.5, lane: 0.35, fog: 0.5 },   // §3.6
  cohesion: { consolidate: 0.10, floor: 0.3 },   // §3.7
  ca: { cohW: 1.0, beyondArty: 0.5, consolidated: -0.5, min: 0.6, max: 2.5, window: 1.6, consolidateH: 2, noAuthority: 0.75 },
  fe: { unconsolidated: 0.5, consolidated: 0.2, trench: 0.5, reverse: 0.3, strongpoint: 0.1, dispersed: 0 },
  k1: 2.5,              // SOURCED, Biddle p. 218
  suppMax: 0.86,        // SOURCED, "factor of seven or more", Biddle p. 67
  residual: { early1: 0.3, early1Card: 0.5 }, lateLoss: 0.06,   // §3.8
  planningH: { division: 2, corps: 3, army: 4 },
});
