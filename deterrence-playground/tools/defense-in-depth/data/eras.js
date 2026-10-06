// Defense in Depth: the two eras (SPEC §0). Same front, same rules, same code paths; only this data changes.
// Values NOTIONAL unless a page is given. Data only: imports nothing.

export const ERAS = {
  w: {
    id: 'w', label: '1917–18', short: '1917–18',
    blurb: 'Barrages, machine guns, gas, early tanks, air spotting, runners and telephone.',
    T: 1.8,                         // SOURCED: A.1 p. 211, tau = 1918
    Lmod: 1,                        // lethality multiplier on exposed targets (data/params.js FIRE.Lmod)
    ranges: { field: 14, heavy: 20, rocket: 20, mortar: 2 },  // NOTIONAL range rings in sectors (SPEC §3.8)
    gunLine: { field: 3, heavy: 6 },// NOTIONAL: attacker gun line, sectors behind row 0 (SPEC §2.7)
    displaceHours: 2,               // NOTIONAL: "Displace forward" costs 2 h without firing
    comms: 'runner',                // runners and telephone (Biddle p. 62)
    obstacle: 'wire',               // D-22
    gas: true, drones: false, ew: false, precision: false, air: true,
    tankBreakdown: true,
    names: {
      rifle: 'Rifle company', storm: 'Storm company', mg: 'MG company', mortar: 'Trench-mortar company',
      pioneer: 'Pioneer company', tank: 'Tank section', field: 'Field battery', heavy: 'Heavy battery',
    },
  },
  m: {
    id: 'm', label: 'Modern', short: 'Modern',
    blurb: 'Drones, ATGMs, mines, precision fires, counter-battery, EW and radio.',
    T: 12,                          // SOURCED: A.1 p. 211, tau = 2020, the model's upper bound
    Lmod: 3.0,                      // CALIBRATED (data/params.js FIRE.Lmod)
    ranges: { field: 40, heavy: 80, rocket: 80, mortar: 4 },  // NOTIONAL; the fire-swept zone grows with range (Biddle p. 59)
    gunLine: { field: 3, heavy: 6 },
    displaceHours: 1,
    comms: 'radio',
    obstacle: 'mines',
    gas: false, drones: true, ew: true, precision: true, air: false,
    tankBreakdown: false,
    names: {
      rifle: 'Infantry company', storm: 'Raid company', mg: 'Weapons company', mortar: 'Mortar company',
      pioneer: 'Engineer company', tank: 'Tank company', field: 'Tube battery', heavy: 'Rocket battery',
      drone: 'Drone team', ew: 'EW team',
    },
  },
};

export const ERA_IDS = ['w', 'm'];
