// Defense in Depth: unit types and order-of-battle templates (SPEC §2.5; D-11, D-12). All strengths and
// firepower are NOTIONAL points ("FP" = firepower per strength point vs. infantry). No real order of battle.
// Data only: imports nothing. js/forces.js expands the templates into units with buildForces(scale, era, side).

// cat: inf (counts for stacking, holds ground) | veh | bat (battery, 4 gun points) | team (drone, EW).
export const TYPES = {
  rifle:   { str: 10, fp: 1.0, cat: 'inf', letter: 'R', line: true },
  storm:   { str: 8,  fp: 1.3, cat: 'inf', letter: 'S', line: true, stealth: true },          // full Infiltrate; scarce (Biddle p. 89)
  mg:      { str: 6,  fp: 1.5, lane: 3.0, cat: 'inf', letter: 'M', lanes: true, atgm: 4.0 }, // ONLY type that lays fire lanes
  mortar:  { str: 4,  fp: 1.5, cat: 'inf', letter: 'T', indirect: true },                      // range from data/eras.js; ignores directional cover
  pioneer: { str: 6,  fp: 0.6, cat: 'inf', letter: 'P', engineer: true },
  tank:    { str: 6,  fp: 2.0, cat: 'veh', letter: 'K', armor: true, strM: 14, fpM: 2.5 },   // 1918 section / modern company
  field:   { str: 0,  guns: 4, cat: 'bat', letter: 'F', arty: 'field' },
  heavy:   { str: 0,  guns: 4, cat: 'bat', letter: 'H', arty: 'heavy' },
  rocket:  { str: 0,  guns: 4, cat: 'bat', letter: 'X', arty: 'rocket', precision: true },
  drone:   { str: 2,  fp: 0, cat: 'team', letter: 'D' },
  ew:      { str: 2,  fp: 0, cat: 'team', letter: 'E' },
};
export const TYPE_KEYS = Object.keys(TYPES);

// Modern substitutions keep the same tree (SPEC §2.5): rifle -> infantry company, MG -> weapons company,
// storm -> raid company (names in data/eras.js). Battery mixes and extra teams are set per template below.

// Template grammar: a formation { kind, name, role, cs?, kids: [formation], units: [unit] }, where a unit is
// [type, name, role?] or { n, type, name, role } for n repeats ({i} = 1-based index, {L} = next company letter,
// {o} = ordinal of i). {div}, {rgt}, {bird}, {art} are filled by js/forces.js. era: 'w' | 'm' limits an entry.
// role drives the default deployment (js/plan-def.js, js/plan-att.js).

const coys = (n, role) => ({ n, type: 'rifle', name: '{L} Coy', role });

export const DEF_DIVISION = {
  kind: 'div', name: '{div} Division', kids: [
    { kind: 'rgt', name: '{rgt}', kids: [
      { kind: 'bn', name: 'I Bn', role: 'outpost', units: [coys(3, 'outpost'), ['mg', 'I MG Coy', 'outpost']] },
      { kind: 'bn', name: 'II Bn', role: 'front', units: [coys(3, 'front'), ['mg', 'II MG Coy', 'front']] },
      { kind: 'bn', name: 'III Bn', role: 'depth', units: [coys(3, 'depth'), ['mg', 'III MG Coy', 'depth']] },
    ] },
    { kind: 'grp', name: '{div0} Strongpoint MG', role: 'strong', units: [['mg', '1st Strongpoint MG Coy', 'strong'], ['mg', '2nd Strongpoint MG Coy', 'strong']] },
    { kind: 'grp', name: 'Counterstroke Group {bird}', role: 'cs', cs: true, kids: [
      { kind: 'bn', name: 'IV Bn', role: 'cs', units: [coys(3, 'cs'), { era: 'w', ...coys(1, 'cs') }, { era: 'm', n: 1, type: 'tank', name: '{L} Tank Coy', role: 'cs' }] },
    ], units: [['mg', 'IV MG Coy', 'cs'], ['pioneer', '{div0} Pioneer Coy', 'cs']] },
    { kind: 'grp', name: '{div0} Artillery Group', role: 'arty', units: [
      { era: 'w', n: 4, type: 'field', name: '{o} Field Bty', role: 'arty' }, { era: 'w', n: 1, type: 'heavy', name: '5th Heavy Bty', role: 'arty' },
      { era: 'm', n: 3, type: 'field', name: '{o} Tube Bty', role: 'arty' }, { era: 'm', n: 1, type: 'rocket', name: '4th Rocket Bty', role: 'arty' },
    ] },
    { kind: 'grp', name: '{div0} Support', role: 'mortar', units: [['mortar', '{div0} Trench Mortar Coy', 'mortar'],
      { era: 'm', n: 2, type: 'drone', name: '{o} Drone Team', role: 'team' }, { era: 'm', n: 1, type: 'ew', name: 'EW Team', role: 'team' }] },
  ],
};

export const ATT_DIVISION = {
  kind: 'div', name: '{div} Division', kids: [
    { kind: 'bn', name: 'Storm Battalion {divn}', role: 'storm', units: [{ n: 2, type: 'storm', name: '{o} Storm Coy', role: 'storm' }] },
    { kind: 'rgt', name: '{rgtA}', role: 'wave1', kids: [1, 2, 3].map(b => (
      { kind: 'bn', name: `${['', 'I', 'II', 'III'][b]} Bn`, role: 'wave1', units: [{ n: 3, type: 'rifle', name: '{o} Coy', role: 'wave1' }, ['mg', `${['', 'I', 'II', 'III'][b]} MG Coy`, 'wave1']] })) },
    { kind: 'rgt', name: '{rgtB}', role: 'wave2', kids: [1, 2].map(b => (
      { kind: 'bn', name: `${['', 'I', 'II'][b]} Bn`, role: 'wave2', units: [{ n: 3, type: 'rifle', name: '{o} Coy', role: 'wave2' }] })),
    units: [['mg', 'Regimental MG Coy', 'wave2']] },
    { kind: 'bn', name: '{divn} Pioneer Bn', role: 'pioneer', units: [{ n: 2, type: 'pioneer', name: '{o} Pioneer Coy', role: 'pioneer' }] },
    { kind: 'grp', name: '{divn} Mortar Group', role: 'mortar', units: [{ n: 2, type: 'mortar', name: '{o} Mortar Coy', role: 'mortar' }] },
    { kind: 'grp', name: 'Artillery Group {divn}', role: 'arty', units: [
      { era: 'w', n: 8, type: 'field', name: '{o} Field Bty', role: 'arty' }, { era: 'w', n: 2, type: 'heavy', name: '{o} Heavy Bty', role: 'arty' },
      { era: 'm', n: 6, type: 'field', name: '{o} Tube Bty', role: 'arty' }, { era: 'm', n: 2, type: 'rocket', name: '{o} Rocket Bty', role: 'arty' },
    ] },
    { kind: 'grp', name: 'Tank Group {tank}', role: 'tank', units: [
      // 2026-10-07: one tank unit per first-wave battalion (3; was 1 section / 2 companies). Conservative against the
      // record: about 437 tanks for six assaulting divisions at Cambrai (1917) and 414 for seven at Amiens (1918; Biddle
      // p. 35); a modern armored brigade fields roughly as many tank companies as infantry companies. FACTCHECK.md.
      { era: 'w', n: 3, type: 'tank', name: '{o} Tank Section', role: 'tank' }, { era: 'm', n: 3, type: 'tank', name: '{o} Tank Coy', role: 'tank' },
      { era: 'm', n: 2, type: 'drone', name: '{o} Drone Team', role: 'team' }, { era: 'm', n: 1, type: 'ew', name: 'EW Team', role: 'team' },
    ] },
  ],
};

// Corps/army-level formations (SPEC §2.5). At Army, corps artillery is pooled into the army artillery group
// so the counts match the SPEC §2.2 table (W1-A decision, docs/DECISIONS.md).
export const DEF_CS_DIVISION = {
  kind: 'div', name: 'Counterstroke Division {bird}', role: 'corpsCs', cs: true, kids: [
    { kind: 'bn', name: 'I Bn', role: 'corpsCs', units: [coys(4, 'corpsCs')] },
    { kind: 'bn', name: 'II Bn', role: 'corpsCs', units: [coys(3, 'corpsCs'), { era: 'w', ...coys(1, 'corpsCs') }, { era: 'm', n: 1, type: 'tank', name: '{L} Tank Coy', role: 'corpsCs' }] },
  ], units: [{ n: 2, type: 'mg', name: '{o} MG Coy', role: 'corpsCs' }, ['pioneer', 'Pioneer Coy', 'corpsCs'],
    { n: 2, type: 'field', name: '{o} Field Bty', role: 'arty' }],
};
export const DEF_ARMY_RESERVE = { ...DEF_CS_DIVISION, name: 'Army Reserve Division {bird}', role: 'armyRes' };
export const ATT_ECHELON2 = {
  kind: 'rgt', name: '{rgtC}', role: 'echelon2', kids: [1, 2].map(b => (
    { kind: 'bn', name: `${['', 'I', 'II'][b]} Bn`, role: 'echelon2', units: [{ n: 3, type: 'rifle', name: '{o} Coy', role: 'echelon2' }] })),
  units: [['mg', 'Regimental MG Coy', 'echelon2']],
};
export const ATT_STORM_ARMY = { kind: 'bn', name: 'Storm Battalion 40', role: 'storm', units: [{ n: 2, type: 'storm', name: '{o} Storm Coy', role: 'storm' }] };

// Scale assembly: how many division templates side by side and which higher troops (counts in SPEC §2.2).
export const ORBAT = {
  d: { def: { divs: [9], top: null }, att: { divs: [31], top: null } },
  c: {
    def: { divs: [9, 11], top: { kind: 'corps', name: 'I Corps', troops: [{ t: 'DEF_CS_DIVISION' }, { heavy: 3, name: 'Corps Heavy Artillery' }] } },
    att: { divs: [31, 33], top: { kind: 'corps', name: 'IV Corps', troops: [{ t: 'ATT_ECHELON2' }, { heavy: 4, name: 'Corps Artillery' }] } },
  },
  a: {
    def: { divs: [9, 11, 14, 16], top: { kind: 'army', name: 'Second Army', corps: ['I Corps', 'III Corps'], corpsTroops: [{ t: 'DEF_CS_DIVISION' }],
      troops: [{ t: 'DEF_ARMY_RESERVE' }, { heavy: 4, name: 'Army Heavy Artillery' }] } },
    att: { divs: [31, 33, 35, 37], top: { kind: 'army', name: 'Sixth Army', corps: ['IV Corps', 'VII Corps'], corpsTroops: [{ t: 'ATT_ECHELON2' }],
      troops: [{ t: 'ATT_STORM_ARMY' }, { heavy: 6, name: 'Army Heavy Artillery' }] } },
  },
};
