// Defense in Depth: the three map scales (SPEC §2.2). Every sector is 500 m x 500 m at every scale (D-10);
// only the grid, the zone bands, the turn count and the forces change. Row 0 is the attacker's rear edge.
// No other module may contain a literal grid size: js/grid.js builds all geometry from this table.
// All values NOTIONAL design unless a page is given. Data only: imports nothing.

export const SECTOR_M = 500;

// Zone bands are inclusive [first row, last row]. Outpost and battle zones follow Hunzeker pp. 81-82
// (outpost 600 m-1 km, battle zone 1.5-3 km, rear ~3 km+); the Division map holds ~9 km of defense
// (REVISIONS 3, D-09), cf. Lossberg's 8 km (Hunzeker p. 79).
export const SCALES = {
  d: {
    id: 'd', label: 'Division sector', note: 'Recommended', cols: 8, rows: 21, turns: 14, turnsByEra: { m: 15 },   // 2026-10-07 (Q68 redesign): 14 h (1917-18), 15 h (Modern); W3 had 15 / 16
    obj: { row: 11, name: 'the Brannoch Line', need: 2 },
    bands: { assembly: [0, 1], nml: [2, 2], outpost: [3, 4], battle: [5, 10], switch: null, second: null, rear: [11, 20] },
    freeTrench: [3, 5, 11],          // inherited trench rows: outpost line, first battle-zone row, objective line
    commEvery: 2, commRows: [3, 13], // inherited communication trenches: every second column, these rows
    wp: 100, csPlan: 2,
    ammo: { w: { att: 260, def: 140 }, m: { att: 220, def: 130 } },
    units: { w: { def: 26, att: 38 }, m: { def: 28, att: 39 } },   // 2026-10-07: 3 tank units an attacking division (was 1 / 2)
    divs: 1, colGroups: 4,
  },
  c: {
    id: 'c', label: 'Corps sector', note: '2x', cols: 12, rows: 29, turns: 21, turnsByEra: { w: 19 },   // W3: was 20; 2026-10-02: 1917-18 20 h; 2026-10-07 (Q68 redesign): 19 h
    obj: { row: 13, name: 'the Second Position', need: 3 },
    bands: { assembly: [0, 1], nml: [2, 2], outpost: [3, 4], battle: [5, 10], switch: [11, 12], second: [13, 17], rear: [18, 28] },
    freeTrench: [3, 5, 11, 13, 18],
    commEvery: 2, commRows: [3, 19],
    wp: 210, csPlan: 3,
    ammo: { w: { att: 600, def: 330 }, m: { att: 510, def: 300 } },
    units: { w: { def: 68, att: 87 } },
    divs: 2, colGroups: 6,
  },
  a: {
    id: 'a', label: 'Army sector', note: '4x', cols: 18, rows: 37, turns: 25, turnsByEra: { w: 25 },   // W3: was 24 h to row 16; then 25 h (Modern) / 27 h (1917-18) to row 13; 2026-10-07 (Q68 redesign): 25 h both
    obj: { row: 13, name: 'the Second Position', need: 4 },   // W3: was row 16 (the Army Line); see DECISIONS W3
    bands: { assembly: [0, 1], nml: [2, 2], outpost: [3, 4], battle: [5, 10], switch: [11, 12], second: [13, 15], rear: [16, 36] },
    freeTrench: [3, 5, 11, 13, 16, 22, 23],   // incl. the third position at rows 22-23
    commEvery: 2, commRows: [3, 24],
    reserveRows: [26, 34],                    // army reserve assembly
    wp: 420, csPlan: 4,
    ammo: { w: { att: 1200, def: 660 }, m: { att: 1020, def: 600 } },
    units: { w: { def: 147, att: 174 } },
    divs: 4, colGroups: 6,
  },
};

export const SCALE_IDS = ['d', 'c', 'a'];

/** Hours in a battle at a scale and era (W3: the Modern Division battle is an hour longer, DECISIONS W3). */
export const turnsFor = (s, era) => (s.turnsByEra && s.turnsByEra[era]) || s.turns;

// The ridge crest sits inside the first battle zone: row round(5 + 0.45 x 6) (SPEC §2.3). Forward slope
// before it (visible to the attacker), reverse slope after (Biddle pp. 96-97; Hunzeker pp. 78-79).
export const crestRow = s => Math.round(s.bands.battle[0] + 0.45 * (s.bands.battle[1] - s.bands.battle[0] + 1));

/** Zone name of a row at a scale: assembly, nml, outpost, battle, switch, second or rear. */
export function zoneOf(s, row) {
  for (const z of ['assembly', 'nml', 'outpost', 'battle', 'switch', 'second']) {
    const b = s.bands[z];
    if (b && row >= b[0] && row <= b[1]) return z;
  }
  return 'rear';
}
