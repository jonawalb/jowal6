// Model parameters for The Hunt. EVERY value in this file is NOTIONAL: chosen for a teaching game,
// not taken from any real sensor, aircraft, ship or submarine, and not a description of how any real
// submarine is handled. The formulas that use them are sourced (Koopman 1946, OEG Report 56; Stone et
// al. 2014); see data/sources.js. Units: nautical miles (nm), knots (kt), hours (h).

export const GAME = {
  turns: 12,            // turns in a hunt
  turnHours: 2,         // hours per turn (24 hours in all)
  effort: 6,            // effort points you get at the start of every turn
  bank: 12,             // unspent effort carries over, up to this many points
  buoyLoads: 10,        // sonobuoy patterns (lines or circles) for the whole hunt
  torpedoes: 2,         // attacks for the whole hunt
  particles: 4000,      // particles in the probability map during play
  batchParticles: 1500, // particles per hunt in scripts/balance.mjs
  datumR: 35,           // the opening report places the sub within this radius of the ring's centre
  reportAge: 4,         // hours old: the sub was in the ring this long before the hunt starts
  prosR: 7,             // an attack succeeds if the sub is within this radius
  alertR: 30,           // a sub within this range of a missed attack hears it and bolts
};

// Where the opening report can fall (notional box in the Norwegian Sea, north of the ridge).
export const DATUM_BOX = { lon0: -10.0, lon1: -5.0, lat0: 64.4, lat1: 65.6 };

// Three notional routes south through the gap. The last point of each is the exit: a sub that gets
// within ESCAPE_R of it has broken out into the Atlantic.
export const ROUTES = [
  { k: 'ds', name: 'Denmark Strait', w: 0.10, pts: [[-16, 67.25], [-25, 67.0], [-28, 66.3], [-30.5, 65.2]] },
  { k: 'if', name: 'Iceland–Faroes', w: 0.50, pts: [[-10.5, 63.7], [-11.6, 62.95]] },
  { k: 'fs', name: 'Faroes–Shetland', w: 0.40, pts: [[-4.3, 61.4], [-5.6, 60.75]] },
];
export const WAYPOINT_R = 18;
export const ESCAPE_R = 15;

// Two notional patrol points a loitering sub may hold. They are marked on the map.
export const PATROL = [
  { k: 'P1', p: [-9.6, 65.35] },
  { k: 'P2', p: [-5.4, 64.55] },
];

// The four ways the sub can behave (all notional). One is picked by the seed; the map mixes all four
// unless you pick one under Practice.
export const SUB = {
  sprinter: { sprint: 18, drift: 4, cycle: 4, hdgNoise: 8 },     // 1 h sprint, then 3 h drift
  zigzag: { speed: 9, leg: 2, angle: 35, hdgNoise: 5 },          // 2 h legs, 35° either side of base course
  shy: { speed: 8, quiet: 3, hearR: 20, hours: 3, hush: 0.4, hdgNoise: 8 }, // hears your ship or a dip within 20 nm; hiding cuts every detection chance to 40%
  loiter: { transit: 7, speed: 5, orbitR: [8, 20] },              // circles a patrol point, 8 to 20 nm out
  bolt: { speed: 18, hours: 2 },                                  // after hearing a missed attack
  mix: { sprinter: 0.3, zigzag: 0.3, shy: 0.25, loiter: 0.15 },   // how often each appears
};

export const BEHAVIOURS = {
  sprinter: { label: 'Sprint and drift', short: 'Sprint-drift',
    help: 'Sprints for 1 hour at 18 kt (loud), then drifts quietly at 4 kt for 3 hours, toward a gap.' },
  zigzag: { label: 'Zig-zag to a gap', short: 'Zig-zag',
    help: 'Picks one gap and zig-zags 35° either side of a straight course to it, 2 hours a leg, at 9 kt. Never sprints.' },
  shy: { label: 'Shy', short: 'Shy',
    help: 'Heads for a gap at 8 kt. If your ship or a helicopter dip comes within 20 nm, it hides: 3 kt, turning away, and much harder to hear, for 3 hours. It cannot hear buoys or aircraft.' },
  loiter: { label: 'Loiter', short: 'Loiter',
    help: 'Goes to the nearer marked patrol point (P1 or P2) and circles it quietly, 8 to 20 nm out. It never leaves.' },
};

// Sensors (all notional). W = sweep width. Koopman's random search: P = 1 - exp(-W L / A).
export const SENSORS = {
  circle: { label: 'Buoy circle', r: 15, n: 12, life: 6, rDet: { quiet: 1.2, sprint: 5 }, fa: 0.04, loc: 2.5 },
  line: { label: 'Buoy line', len: 60, n: 12, life: 8, rDet: { quiet: 1.8, sprint: 5 }, fa: 0.04, loc: 2.5 },
  air: { label: 'Aircraft box', half: 30, L: 180, W: { quiet: 3, sprint: 16 }, fa: 0.06, loc: 5 },
  helo: { label: 'Helicopter dip', r: 8, range: 50, hours: 1, p: { quiet: 0.6, sprint: 0.95 }, fa: 0.02, loc: 1 },
  ship: { label: 'Ship', speed: 12, sprint: 24, start: [-8.6, 63.4], brg: 4, fa: 0.05,
    lat: { quiet: { pmax: 0.45, sigma: 8 }, sprint: { pmax: 0.95, sigma: 25 } } }, // lateral range curve
  net: { label: 'Listening network', p: 0.4, loc: 12 },                              // hears sprints only
};

// What each action costs in effort (and stock), and what it is for. Shown on the buttons.
export const ACTIONS = {
  line: { key: '1', cost: 2, stock: 'buoys', name: 'Buoy line',
    help: `${SENSORS.line.len} nm wall on any of 8 axes (R turns it), listens ${SENSORS.line.life} h. Catches a sub crossing it (±${SENSORS.line.loc * 2} nm).` },
  circle: { key: '2', cost: 2, stock: 'buoys', name: 'Buoy circle',
    help: `${SENSORS.circle.r} nm ring, listens ${SENSORS.circle.life} h. Pins a sub inside to ±${SENSORS.circle.loc * 2} nm.` },
  air: { key: '3', cost: 3, name: 'Aircraft box',
    help: `${SENSORS.air.half * 2} nm square, this turn. Wide but blurry (±${SENSORS.air.loc * 2} nm); best on sprints.` },
  helo: { key: '4', cost: 3, name: 'Helicopter dip',
    help: `${SENSORS.helo.r} nm spot within ${SENSORS.helo.range} nm of the ship, 1 h. Sharp: ±${SENSORS.helo.loc * 2} nm.` },
  move: { key: '5', cost: 0, name: 'Move ship',
    help: `Free. Up to ${SENSORS.ship.speed * GAME.turnHours} nm; its towed array hears bearings (±${SENSORS.ship.brg * 2}°).` },
  dash: { key: '6', cost: 1, name: 'Ship sprint',
    help: `Up to ${SENSORS.ship.sprint * GAME.turnHours} nm, but the ship hears nothing this turn.` },
  attack: { key: '7', cost: 3, stock: 'torps', name: 'Attack',
    help: `${GAME.prosR} nm ring, strikes before the sub moves. Hit wins; a miss makes it bolt.` },
};

// Rows for the method table on the page.
export const PARAM_ROWS = [
  ['Hunt length', `${GAME.turns} turns of ${GAME.turnHours} hours (${GAME.turns * GAME.turnHours} hours)`],
  ['Effort', `${GAME.effort} points a turn; unspent points carry over, up to ${GAME.bank}`],
  ['Action costs', Object.values(ACTIONS).map(a => `${a.name} ${a.cost}`).join(', ')],
  ['Stocks', `${GAME.buoyLoads} buoy patterns (lines or circles) and ${GAME.torpedoes} attacks for the whole hunt`],
  ['Opening report', `sub within ${GAME.datumR} nm of the ring's centre, ${GAME.reportAge} hours before the hunt starts`],
  ['Behaviour mix', Object.entries(SUB.mix).map(([k, w]) => `${BEHAVIOURS[k].short} ${Math.round(w * 100)}%`).join(', ')],
  ['Sprint and drift', `${SUB.sprinter.sprint} kt for 1 h, then ${SUB.sprinter.drift} kt for ${SUB.sprinter.cycle - 1} h`],
  ['Zig-zag', `${SUB.zigzag.speed} kt, legs of ${SUB.zigzag.leg} h at ±${SUB.zigzag.angle}° off the base course`],
  ['Shy', `${SUB.shy.speed} kt; within ${SUB.shy.hearR} nm of the ship or a dip it hides for ${SUB.shy.hours} h: ${SUB.shy.quiet} kt, heading away, every detection chance × ${SUB.shy.hush}`],
  ['Loiter', `${SUB.loiter.speed} kt on a circle ${SUB.loiter.orbitR[0]}–${SUB.loiter.orbitR[1]} nm round P1 or P2`],
  ['Route choice (transiting subs)', ROUTES.map(r => `${r.name} ${Math.round(r.w * 100)}%`).join(', ')],
  ['Buoy line', `${SENSORS.line.n} buoys over ${SENSORS.line.len} nm, ${SENSORS.line.life} h; detection radius ${SENSORS.line.rDet.quiet} / ${SENSORS.line.rDet.sprint} nm (quiet / sprint)`],
  ['Buoy circle', `${SENSORS.circle.n} buoys in a ${SENSORS.circle.r} nm circle, ${SENSORS.circle.life} h; detection radius ${SENSORS.circle.rDet.quiet} / ${SENSORS.circle.rDet.sprint} nm`],
  ['Aircraft box', `${SENSORS.air.half * 2}×${SENSORS.air.half * 2} nm, 2 h, ${SENSORS.air.L} nm/h of track, W = ${SENSORS.air.W.quiet} / ${SENSORS.air.W.sprint} nm`],
  ['Helicopter dip', `${SENSORS.helo.r} nm radius, within ${SENSORS.helo.range} nm of the ship, first hour of the turn; ${SENSORS.helo.p.quiet * 100}% / ${SENSORS.helo.p.sprint * 100}% (quiet / sprint)`],
  ['Ship', `${SENSORS.ship.speed} kt listening or ${SENSORS.ship.sprint} kt deaf; lateral range peak ${SENSORS.ship.lat.quiet.pmax} / ${SENSORS.ship.lat.sprint.pmax}, spread ${SENSORS.ship.lat.quiet.sigma} / ${SENSORS.ship.lat.sprint.sigma} nm; bearing error ±${SENSORS.ship.brg * 2}°`],
  ['Listening network (free)', `hears ${SENSORS.net.p * 100}% of sprint hours, to within ±${SENSORS.net.loc * 2} nm; deaf to quiet running`],
  ['Stated contact error (two standard deviations)', `circle ±${SENSORS.circle.loc * 2}, line ±${SENSORS.line.loc * 2}, aircraft ±${SENSORS.air.loc * 2}, helicopter ±${SENSORS.helo.loc * 2}, network ±${SENSORS.net.loc * 2} nm; ship bearing ±${SENSORS.ship.brg * 2}°`],
  ['False contacts per hour', `circle ${SENSORS.circle.fa}, line ${SENSORS.line.fa}, aircraft ${SENSORS.air.fa}, helicopter ${SENSORS.helo.fa}, ship ${SENSORS.ship.fa}, network 0`],
  ['Attack', `hits if the sub is within ${GAME.prosR} nm; a miss within ${GAME.alertR} nm makes it bolt at ${SUB.bolt.speed} kt for ${SUB.bolt.hours} h`],
];
