// Node and target catalog for the Kill Chain Builder.
// Sourced values: ASBM reach from CSIS Missile Defense Project, Missile Threat:
//   DF-21 (https://missilethreat.csis.org/missile/df-21/): DF-21D range "1,450 to 1,550 km" per U.S. reports.
//   DF-26 (https://missilethreat.csis.org/missile/dong-feng-26-df-26/): range 4,000 km; anti-ship variant
//   "likely features an active terminal seeker".
// Cross-check: DoD, Military and Security Developments Involving the PRC 2024, pp. 64-65: DF-21D range
//   "exceeding 1,500 km"; DF-26 "3,000 km-4,000 km", capable of anti-ship strikes.
// EVERYTHING ELSE IS NOTIONAL: round teaching numbers chosen so the structure of a kill chain is visible.
// They do not describe any specific system, unit or real capability.
//
// Units: distances km, times minutes, speeds km per minute (weapons) or knots (targets).
// Signature exponents: an active radar's detection range scales with the fourth root of target size
// (radar range equation); passive sensing (emissions, infrared, acoustic) scales with the square root
// (one-way spreading loss). R = R0 * s^k, where R0 is the range against a reference signature of 1.0.

export const FIX_SIGMA = 5;   // km: a sensor this accurate or better can fix a target (notional)
export const TRACK_UPDATE = 5; // min: a sensor that updates this often or faster can hold a track (notional)
export const SPACE_DIST = 1000; // km: notional slant range from an ISR satellite to anything it can image

export const CATS = {
  sensor: { name: 'Sensors', col: '--c7' },
  c2: { name: 'Command and links', col: '--c6' },
  shooter: { name: 'Shooters', col: '--c2' },
};

/**
 * Node types. Sensors: ch = {channel: R0 km}, rmin = skip zone, sigma = location error km,
 * proc = minutes from detection to a usable report, update = minutes between looks, assess = can
 * judge damage, fwd = operates forward (distance to target is set per node), dist0 = default
 * distance to target when fwd. C2: decide = minutes to approve a shot, relay = minutes to pass data.
 * Shooters: reach km, speed km/min, over = boost and terminal minutes, launch = minutes to prepare,
 * basket = seeker acquisition radius km, mid = accepts in-flight target updates, decide = organic
 * firing authority (minutes), variants = alternate reach values.
 */
export const TYPES = {
  sat: { cat: 'sensor', name: 'ISR satellite', short: 'Satellite', space: true,
    ch: { radar: 1500, ir: 1200, emit: 3000 }, sigma: 0.5, proc: 30, update: 90, assess: true,
    note: 'Sees almost anywhere, but only when a satellite is overhead. Imagery takes time to downlink and exploit.' },
  oth: { cat: 'sensor', name: 'Over-the-horizon radar', short: 'OTH radar',
    ch: { radar: 3000 }, rmin: 800, sigma: 15, proc: 2, update: 1,
    note: 'Skywave radar: very long reach and frequent updates, but a coarse position and a skip zone close in.' },
  crd: { cat: 'sensor', name: 'Coastal surface radar', short: 'Coastal radar',
    ch: { radar: 120 }, sigma: 0.5, proc: 1, update: 0.2, assess: true,
    note: 'Precise and continuous, but limited by the horizon.' },
  aew: { cat: 'sensor', name: 'Airborne early warning aircraft', short: 'AEW aircraft', fwd: true, dist0: 250,
    ch: { radar: 450, emit: 600 }, sigma: 2, proc: 1, update: 0.2, assess: true,
    note: 'A radar aloft. Good track quality, but it has to fly within reach and it is a high-value target.' },
  uav: { cat: 'sensor', name: 'Long-endurance drone', short: 'Drone', fwd: true, dist0: 40,
    ch: { radar: 150, ir: 100 }, sigma: 0.1, proc: 2, update: 0.5, assess: true,
    note: 'Loiters close to the target with radar and cameras. Short reach, excellent position.' },
  son: { cat: 'sensor', name: 'Submarine sonar', short: 'Sub sonar', fwd: true, dist0: 30,
    ch: { acoustic: 80 }, sigma: 3, proc: 10, update: 2,
    note: 'Passive sonar hears ships, not land targets. Reporting waits on communication windows.' },
  hq: { cat: 'c2', name: 'Theater headquarters', short: 'Theater HQ', authority: true, decide: 20, relay: 2,
    note: 'Fuses many feeds and can release any weapon, but deliberation takes time.' },
  lc: { cat: 'c2', name: 'Local command', short: 'Local command', authority: true, decide: 5, relay: 1,
    note: 'Fast decisions for the weapons it controls.' },
  dl: { cat: 'c2', name: 'Datalink relay', short: 'Datalink', authority: false, decide: 0, relay: 0.2,
    note: 'Passes data almost instantly. It cannot authorize a shot.' },
  asbm: { cat: 'shooter', name: 'Anti-ship ballistic missile', short: 'ASBM', reach: 1500, speed: 130, over: 2, launch: 10,
    basket: 40, mid: false, ships: true,
    variants: { df21: { label: 'DF-21D class', tag: 'ASBM (DF-21D)', reach: 1500, src: true }, df26: { label: 'DF-26 class', tag: 'ASBM (DF-26)', reach: 4000, src: true } },
    note: 'Very fast and long-ranged. Its terminal seeker must find the ship inside a search basket after a long flight.' },
  cm: { cat: 'shooter', name: 'Cruise missile', short: 'Cruise missile', reach: 400, speed: 15, over: 0.5, launch: 5,
    basket: 10, mid: true,
    variants: { long: { label: 'Long-range', tag: 'Cruise missile', reach: 400 }, short: { label: 'Coastal', tag: 'Coastal missile', reach: 150 } },
    note: 'Slow enough that the target moves a lot in flight, so it takes updates on the way.' },
  air: { cat: 'shooter', name: 'Strike aircraft', short: 'Strike aircraft', fwd: true, dist0: 150, reach: 300, speed: 15, over: 0.5,
    launch: 2, basket: 20, mid: true, authority: true, decide: 2,
    note: 'Already airborne. The crew can search a wide area and decide to fire on scene.' },
  sub: { cat: 'shooter', name: 'Attack submarine', short: 'Attack sub', fwd: true, dist0: 60, reach: 150, speed: 12, over: 0.5,
    launch: 3, basket: 10, mid: false, authority: true, decide: 5, ships: true,
    note: 'Close in and hidden. The commander can fire on scene; the weapon flies on its last known aim point.' },
};

export const CODES = Object.keys(TYPES);

/** Targets. sig = signature by channel (1.0 = reference), kt = default speed, D = default distance
 * from the shooters' home coast, dwell = minutes it stays located before it moves and hides. */
export const TARGETS = {
  cv: { name: 'Carrier group', kt: 30, D: 1200, dwell: Infinity, ship: true,
    sig: { radar: 1, ir: 0.6, emit: 0.9, acoustic: 0.8 },
    note: 'Large, fast, and noisy on radar and radio unless it goes silent.' },
  amph: { name: 'Amphibious group', kt: 12, D: 100, dwell: Infinity, ship: true,
    sig: { radar: 0.9, ir: 0.6, emit: 0.6, acoustic: 0.9 },
    note: 'Big and slow, and it has to come close to shore.' },
  tel: { name: 'Mobile launcher', kt: 22, D: 400, dwell: 20, ship: false,
    sig: { radar: 0.3, ir: 0.5, emit: 0.1, acoustic: 0 },
    note: 'Small and quiet. After it fires it drives off and hides, so there is a short window.' },
};

export const CH_NAMES = { radar: 'radar', ir: 'infrared', emit: 'emissions', acoustic: 'acoustic' };
export const EMCON_EMIT = 0.05; // emission signature when the target goes silent (notional)
