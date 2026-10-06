// Defense in Depth: every combat-model parameter in one place (SPEC §3.14).
// Each value is labelled SOURCED (with the printed page), CALIBRATED (set so the model reproduces a target)
// or NOTIONAL (invented for teaching, with the reason). Sources: Biddle, Military Power (2004), Appendix
// (pp. 209-239); Hunzeker, Dying to Learn (2021). Calibration: scripts/calibrate.mjs (SPEC §3.2 anchors).
// This file is data only: it imports nothing.

// Biddle's model constants, rescaled from theater/days to sectors/hours where noted.
export const BIDDLE = {
  k1: 2.5,          // SOURCED: Table A.1, p. 218 (attackers one fully reinforced, concealed defender can halt, A.6 p. 212). Never tuned.
  k3: 0.4,          // SOURCED: Table A.1, p. 218 (pinning density per defender, A.8 p. 213); the fixing ratio (SPEC §3.6)
  k8: 0.1,          // NOTIONAL: k8' = 0.1 sector/h, a rescale of k8 = 0.1 km/day (Table A.1, p. 218) in the speed term v(v + k8)
  k2: 0.008,  // NOTIONAL: k2' rescale of k2 = 0.01 (Table A.1, p. 218) for P_s = T^(-k2 v) per observed hour (A.5, p. 212)
  T: { w: 1.8, m: 12 },  // SOURCED: T = (tau - 1900)/10, A.1 p. 211; tau = 1918 and 2020 (2020 is the model's upper bound, p. 211)
};

// Suppression and fire missions (SPEC §3.8).
export const SUPP = {
  max: 0.86,        // SOURCED: suppression cuts fire "by a factor of seven or more", p. 67 (1 - 1/7 = 0.86)
  one: 0.6,         // NOTIONAL: one battery alone on a sector; k batteries give min(max, 1 - (1 - one)^k)
  cap: 0.9,         // NOTIONAL: cap on all sources combined as 1 - prod(1 - s) (barrage, mission, overwatch, tank)
  light: 0.04,      // NOTIONAL: Suppress light losses a x X x (1 - dugouts) per battery-hour
  destroyCost: 10,  // SOURCED ratio: suppressing a dug-in platoon takes < 4 rounds, destroying it > 40 (p. 37)
  destroyLoss: 0.06,// NOTIONAL: Destroy losses per hour (x 0.4 with dugouts)
  destroyHours: 3,  // NOTIONAL: full Destroy effect after 3 consecutive hours (p. 37 ratio); half effect before
  destroyObst: 0.5, // NOTIONAL: obstacle integrity removed per Destroy hour
  destroyCover: 0.1,// NOTIONAL: trench / strongpoint cover lost per Destroy hour
  dugout: 0.6,      // NOTIONAL: dugouts cut artillery losses by 60% for units not moving
  concrete: 0.5,    // NOTIONAL: concrete strongpoints halve artillery losses
  pinnedArty: 1.5,  // NOTIONAL value; pinned units destroyed by artillery (Biddle p. 31; Hunzeker p. 57)
  crowd: 0.2,       // NOTIONAL: artillery/drone losses x (1 + 0.2 max(0, n - 2)) for n companies in a sector (dispersion, p. 36)
  smokeLane: 0.3,   // NOTIONAL: lane fire through smoke
  costs: { suppress: 1, destroy: 10, gas: 2, smoke: 1, cb: 1, precision: 0, sos: 1, barrage: 1 },  // NOTIONAL ammunition per battery-hour
};

// Exposure X by posture (SPEC §3.6). Moving postures follow Biddle's speed term X = v(v + k8)/(1 + k8)
// (A.11-A.12, p. 213): Rush at 1 sector/h gives 1.0; a leapfrog pair averaging 0.5 sector/h gives 0.27.
export const EXPOSE = {
  rush: 1.0,        // NOTIONAL (from the speed term at v = 1)
  bound: 0.27,      // NOTIONAL (speed term at v = 0.5): leapfrog bounding element with an overwatch partner
  boundShort: 0.7,  // NOTIONAL: short bounds (50-100 yd, Hunzeker p. 70) multiply X by 0.7 (0.19)
  boundAlone: 0.60, // NOTIONAL: no overwatch, no bonus
  overwatch: 0.15,  // NOTIONAL
  infil: 0.27,      // NOTIONAL: a storm / raid infiltrator once detected (still in small groups using dead ground)
  infilLine: 0.60,  // NOTIONAL (W3): a line company infiltrating, once detected: the lone-bounder value (no specialist training, no overwatch)
  hold: 0.20,       // NOTIONAL: hold / stalled / pinned, attacker or defender in the open
  consolidate: 0.15,// NOTIONAL
  withdraw: 0.60,   // NOTIONAL
  defTrench: 0.12,  // NOTIONAL: defender static in a trench
  defStrong: 0.08,  // NOTIONAL: in a strongpoint
  defDispersed: 0.10, // NOTIONAL: dispersed / concealed (shell holes, Biddle p. 96; Hunzeker p. 80)
  obstacle: 1.5,    // NOTIONAL: held at an obstacle, wire holds attackers in lanes (Hunzeker pp. 54, 80)
};

// Speeds in sectors per hour (progress accumulator; SPEC §3.6, §3.11). NOTIONAL.
export const SPEED = {
  rush: { contact: 1.0, free: 2.0 }, bound: { contact: 1.0, free: 2.0 }, infil: { contact: 1.0, free: 1.5 },
  withdraw: { contact: 1.0, free: 2.0 }, shortBound: 0.75, covered: 1.0, road: 3.0, tank1917: 1.0,
  diagonal: 1.4,    // NOTIONAL: diagonal moves cost x1.4 in progress
  leapPast: 2,      // NOTIONAL (W1-A): in contact, a bounding element with a working overwatch bounds past its partner, two
                    // bound lengths, so a leapfrog pair keeps a lone bounder's pace at about half its exposure per row gained
  lone: 0.75,       // NOTIONAL (W3): a bounder with no working overwatch, in contact, makes 0.75 sector/h whatever its bound
                    // length: Biddle's speed term v(v + k8)/(1 + k8) gives X 0.6 (EXPOSE.boundAlone) at v ~ 0.76 (A.11-A.12, p. 213).
                    // A covered pair beats the speed-exposure trade-off because the overwatch suppresses (p. 31).
  exploit: 2.0,     // NOTIONAL: free speed behind the objective line after a Breakthrough (A.19, p. 214)
};

// Fire model (SPEC §3.2): loss_u = c x sum_j[F_j G S_ju] x X_u x (1 - D_u) x Leth(era, X_u).
export const FIRE = {
  c: 0.0857,        // CALIBRATED: scripts/calibrate.mjs, Waves+Rush vs a frontal MG lane loses ~15% an hour (anchor table, SPEC §3.2)
  sigma: 0.30,      // NOTIONAL: lognormal noise on each unit's hourly loss (Fog of Command's rule)
  quality: 0.2,     // NOTIONAL: lognormal spread of hidden unit quality q
  Lmod: { w: 1, m: 2.5 }, // CALIBRATED: Leth = 1 + (L - 1) min(1, X); Modern 3.0 (spec start 3.5) keeps the anchors (row 5 >= 35%, gap grows >= 1.5x) and brings scripted play nearer even
                          // (Biddle pp. 53-54: lethal area > 7x vs exposed, < 1.5x vs covered; p. 234)
  ENF: { waves: 3.0, column: 2.5, trench: 2.5, groups: 2.9, none: 1.0 }, // NOTIONAL, calibrated against the anchors (SPEC §3.4)
  laneGraze: true,  // NOTIONAL (W3): an MG lane's grazing fire beats every lane cell in full instead of being shared out over all its targets
  enfHalf: true,    // NOTIONAL (W1-A): fire at 45 deg to the long axis gets half the enfilade bonus; along the axis full
  deadDecay: 0.35,  // NOTIONAL: D = g0 x max(0, 1 - 0.35 (dirs - 1)) x use x scout (Biddle p. 44 interlocking fields)
  deadUse: { bound: 1.0, overwatch: 1.0, infil: 1.0, rush: 0.3, withdraw: 0.3, hold: 0.5, stalled: 0.5, pinned: 0.5, consolidate: 0.5, static: 0 },
  unscouted: 0.5,   // NOTIONAL: scout(i) = 0.5 until scouted (usable dead ground needs careful scouting, Biddle p. 38)
  droneDead: 0.5,   // NOTIONAL: drones watching a sector halve dead ground (D-26)
  sameSectorCover: 0.5, // NOTIONAL: close-quarter fire inside a sector gets half the directional cover
  cohFire: [0.5, 0.5],  // NOTIONAL: attacker fire x (0.5 + 0.5 cohesion)
  armorSmall: 0.1,  // NOTIONAL: MG and rifle fire on armor
  atgm: 4.0,        // NOTIONAL: Modern weapons company FP vs vehicles (range 2)
  unsupported: 3,   // NOTIONAL: AT losses x3 on tanks with no friendly infantry in the sector (Biddle pp. 61, 129-130)
  fieldVsTank: 0.25,// NOTIONAL: field batteries within 2 sectors hit tanks for 25% an hour (direct fire)
  night: 0.7,       // NOTIONAL: fire at night or in morning fog
  bigHit: 0.25,     // NOTIONAL: an enfilade hit of >= 25% of a unit in an hour is reported
};

// Assault: the stall test (Biddle A.6, A.16; SPEC §3.5). f_e by holder position, NOTIONAL values whose
// direction follows Biddle's f_e (p. 210) and Fig. A.3 (p. 221).
export const ASSAULT = {
  fe: { trenchFwdKnown: 0.5, trenchRevKnown: 0.3, trenchUnknown: 0.2, strong: 0.1, dispersed: 0, dispersedUntrained: 0.3, open: 0.5, lodgFresh: 0.5, lodgCons: 0.2 },
  untrainedYieldBreak: 0.5,   // NOTIONAL (W3; was 0.2 in code): campaign, an Elastic yield without card ED2 breaks the unit at p = 0.5
  ed1: 0.2,         // NOTIONAL: card ED1 lowers f_e by 0.2 for reverse-slope / dispersed positions
  overrun: 0.4,     // NOTIONAL: a Hold unit overrun loses 40% of current strength
  disengage: 0.5,   // NOTIONAL: half an hour of the enemy's fire at G = 1 (Fog of Command's rule)
  gaugeMax: 3,      // display clamp 0-300%
};

// Go to ground and pinning (SPEC §3.6). NOTIONAL values; the failure mode is Biddle p. 31, Hunzeker p. 57.
export const GROUND = { untrained: 0.3, trained: 0.1, add: 0.2, lossTrigger: 0.10, boundUntrained: 0.25, boundTrained: 0.05,
  alone: 1.0,      // W3 NOTIONAL: a bounder (or a detected line infiltrator) with no working overwatch, in contact, is pinned with
                   // p = 1.0 x the unsuppressed share of the fire on it (Biddle p. 31: suppression lets infantry move)
};

// Leapfrog overwatch suppression s_ow = min(cap, 0.5 str_ow / max(1, believed defender strength)). NOTIONAL.
export const OVERWATCH = { k: 1.5, cap: { rifle: 0.6, mg: 0.7, storm: 0.7 }, at3: 0.1 };   // NOTIONAL (W3: k 0.5 -> 1.5) so one company can suppress about its own strength of defenders (the base of fire is the point of leapfrog)

// Infiltration detection (SPEC §3.6). NOTIONAL.
export const DETECT = { same: 0.9, adjacent: 0.25, adjBoost: 1.5, lane: 0.35, drone: 0.6, fog: 0.5, visibleHours: 2, cohOutside: 0.10,
  line: 2,     // W3 NOTIONAL: AT2-trained line companies (not storm / raid) face the detection rolls twice
};

// Cohesion, attackers only (Biddle p. 47 "entropic effect of depth"; Hunzeker p. 61). NOTIONAL rates.
export const COHESION = { start: 1, floor: 0.3, perRow: 0.06, outsideGuns: 0.10, contact: 0.04, recover: 0.10, untrainedGroups: 0.2 };

// Counterattacks (SPEC §3.7). CA_mult = 1 + coh x (1 - c) + outside x [beyond guns] - cons x [consolidated], clamped. NOTIONAL.
export const COUNTER = {
  noAuthorityHours: 2,  // W3 NOTIONAL: a counterstroke formation without card ED3 waits 2 hours more for orders from above (campaign)
  coh: 1.0, outside: 0.5, cons: 0.5, min: 0.6, max: 2.5,
  window: 1.6,      // green badge: CA_mult >= 1.6 and h_cap <= 3
  windowHours: 3,
  consHours: 2,     // a lodgment is consolidated after 2 h static
  noAuthority: 0.75,// riposte without authority: normal order delay and CA_mult x 0.75 (Hunzeker pp. 80, 82)
};

// Breaks (Fog of Command / Mearsheimer same-threshold rule; value NOTIONAL).
export const BREAK = { frac: 0.5 };

// Obstacles: wire (1917-18) and mines (Modern), one mechanic (D-22; SPEC §3.9). NOTIONAL.
export const OBSTACLE = { mineInf: 0.025, mineVeh: 0.10, breachHours: 2, tankCrush: 1, scoutHours: 1 };

// Gas, 1917-18 only, abstracted (SPEC §3.9; Hunzeker pp. 54, 130). NOTIONAL.
export const GAS = { hours: 3, fire: 0.6, move: 0.5, supp: 0.3, firstLoss: 0.02, mask: 0.5 };

// Tanks (SPEC §3.9). NOTIONAL; anchored by Hunzeker pp. 110-111 (18 of 50 broke down), Biddle p. 35.
export const TANK = { breakdown: 0.12, fatigueHours: 8, fatigue: 0.5, assaultSupp: 0.5, untrained: 0.4 };   // untrained: W3, share of assaultSupp without card CA3 (1917-18)

// Modern systems (SPEC §3.10). NOTIONAL. Drone strike follows the shape of Biddle's A.22 (pp. 215-216).
export const DRONE = { recon: 2, strike: 2, Pk: 0.03, vehicle: 2, locate: 0.2, range: 12, block: 1 };   // NOTIONAL
export const EW = { radius: 2, abort: 0.6, locate: 0.5, delay: 1, msgLoss: 0.25 };          // NOTIONAL (SPEC §3.10)
export const PRECISION = { exposed: 0.25, covered: 0.08, asset: 0.15, perBattle: 8, xCut: 0.5 }; // NOTIONAL (SPEC §3.8)

// Counter-battery (SPEC §3.8). NOTIONAL; sound ranging and air spotting (Hunzeker p. 112).
export const CB = { locate: { w: 0.15, m: 0.5 }, air: 0.15, drone: 0.2, neutral: 0.6, kill: { w: 0.25, m: 0.5 } };

// Creeping barrage coordination (SPEC §3.8; D-21; Biddle p. 31; Hunzeker p. 52). NOTIONAL.
export const BARRAGE = { early: 0.3, earlyCA2: 0.5, fratricide: 0.06, perBattery: 1 };   // NOTIONAL; a barrage of rate > 1 row/h suppresses each row x 1/rate (dwell)

// Preparation fire (SPEC §3.8). NOTIONAL.
export const PREP = { stun: 0.5, partialWarn: 0.5, methodicalLoss: 0.15, methodicalCost: 15, sectorsPerGroup: 3, groupSize: 4, preOrders: 3, c2Delay: 1 };

// Order delay per side per hour, by era (one roll per side per hour, Fog's rule). NOTIONAL weights.
export const ORDERS = {
  delay: { w: [[0, 0.45], [1, 0.40], [2, 0.15]], m: [[0, 0.75], [1, 0.25]] },
  maxRun: 3,        // NOTIONAL: after 3 delayed hours in a row orders start at once
  runner: { delay: 2, loss: 0.2 }, phone: 0.5,   // 1917-18 barrage-plan changes (Hunzeker p. 52)
  callFire: { w: 1, m: 0 },                      // calls for fire: 1 h in 1917-18 unless Direct support
};

// Movement survival under observation P = T^(-k2' v) (SPEC §3.11, from A.5 p. 212).
export const RACE = { minPace: 0.25, paceHours: 3 };   // NOTIONAL: race-clock pace floor (rows/h) and look-back window

// Fog of war (SPEC §3.12; Fog of Command's three rules). NOTIONAL.
export const VISION = { adjacent: 0.9, concealed: 0.3, flash: 0.7, night: 0.5, memory: 2, farDelay: 1, farRange: 3, airSorties: 1, dummyHours: 2, moveEst: 8 };

// Offense-defense slider (D-30; W3): H x step^(5 - od) for the attacking army's assaults (the inverse for the defender's
// counterattacks), and direct-fire losses on the attacking army x step^((5 - od) x fire) (the inverse on the defender).
// Exactly 1 at od = 5. step is per scale, CALIBRATED with scripts/offdef.mjs to about 1.5 points of attacker win share
// per step (the larger scales have more assaults, so the same factor moves them more).
export const OFFDEF = { min: 0, max: 10, standard: 5, step: { d: 1.03, c: 1.02, a: 1.013 }, fire: 0.5 };

// Stacking (SPEC §2.6). NOTIONAL.
export const STACK = { max: 4 };

// Clock and light. NOTIONAL: night from 21:00 to 05:00.
export const CLOCK = { start: 5, nightFrom: 21, nightTo: 5 };

// Doctrine cards (Hunzeker domains). Single battles give both sides all nine true cards (D-25).
export const CARDS = ['AT1', 'AT2', 'AT3', 'CA1', 'CA2', 'CA3', 'ED1', 'ED2', 'ED3'];

// AI profiles (SPEC §5.2): difficulty changes doctrine and reaction latency only (D-16). W2-AI reads these.
export const AI = {
  profiles: {
    e: { latency: 2, att: 'easyAssault', def: 'easyDefense', shiftEvery: 4 },   // W3: bad layout, Standard reactions (DECISIONS W3)
    s: { latency: 1, att: 'modernSystem', def: 'elasticDepth', shiftEvery: 4 },
    h: { latency: 0, att: 'modernSystemPlus', def: 'elasticDepthPlus', shiftEvery: 2 },
  },
};

// Rules version: bump whenever a balance-changing constant changes (share links carry it, SPEC §9.6).
export const RULES = { version: 3, link: 1 };   // W3: r2 (balance and mechanics changes, DECISIONS W3); r3: MG lanes are lost on a move (DECISIONS)
