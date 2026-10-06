// Fog of Command: every model parameter in one place.
// Each value is labelled SOURCED (with the source and the place in it), CALIBRATED (set so the model
// reproduces a sourced number) or NOTIONAL (invented for teaching, with the reason).
// Sources: data/sources.js and FACTCHECK.md. FM 5-0 C1 (2011) para. B-93 and Table B-1; Lanchester
// (1916) ch. V, p. 48; Mearsheimer (1989) pp. 54, 57-59; FM 3-90 (2001) paras. 3-29, 3-31, 5-160, 11-5.

export const GAME = {
  hours: 14,            // NOTIONAL: 06:00 to 20:00, one turn per hour (owner's change 2026-10-01; was 12, to 18:00, and 16 before that)
  startClock: 6,
  prepHours: 2,         // NOTIONAL: hours in place before a defense counts as "prepared" rather than "hasty"
};

// Combat: stochastic Lanchester square law (Lanchester 1916, ch. V, eq. 5, p. 48).
//   attacker loss per hour = c * k * D,  defender loss per hour = c * A.
// Under the square law, per-capita loss rates are equal when A/D = sqrt(k). FM 5-0 Table B-1 gives
// historical minimum planning ratios of 3:1 against a prepared defense, 2.5:1 against a hasty one and
// 1:1 for a counterattack into a flank; k is set so the model reproduces those ratios (METHOD.md).
export const COMBAT = {
  c: 0.045,             // NOTIONAL: base kill rate per hour; sets how long a battalion fight lasts (about 3-5 h).
                        // Was 0.04 (3-6 h) in the 16-hour game, 0.06 (2-4 h) in the 12-hour game; lowered for the 14-hour
                        // day (2026-10-01) so the doctrinal defender holds about as often as it did in 12 hours (METHOD.md section 15).
                        // k and the break-even ratios do not depend on c (scripts/calibrate.mjs: 3:1 prepared still holds 55.3%)
  k: { prepared: 9, hasty: 6.25, meeting: 1, flank: 1 },  // CALIBRATED to FM 5-0 Table B-1: sqrt(k) = 3, 2.5, 1, 1
  sigma: 0.35,          // NOTIONAL: lognormal noise on each hour's losses (the dice)
  quality: 0.25,        // NOTIONAL: lognormal spread of each unit's hidden quality factor (median 1)
  breakFrac: 0.5,       // NOTIONAL value; the same threshold for both sides follows Mearsheimer (1989) n. 10
};

// Offense-defense balance: the slider on the start screen (0 favors defense, 10 favors offense, 5 = the
// standard game). One parameter: the defender's multiplier k for a prepared or hasty defense is multiplied by
// `step` for every step below 5 and divided by it for every step above, k x step^(5 - value). At 5 the factor is
// exactly 1, so k = 9 and 6.25 as above. Meeting engagements and flank attacks (k = 1) are not changed, and
// neither is anything else (sight, orders, artillery, the scripted commanders' rules). NOTIONAL: `step` is
// CALIBRATED with scripts/offdef.mjs so the game's standard matchup moves by about 15-20 points at either end
// and stays inside 20-80% for both sides (METHOD.md section 15).
export const OFFDEF = { min: 0, max: 10, standard: 5, step: 1.1 };

// Flank attack: a defender that is already fighting attackers from one sector, and is then hit from a
// second sector, fights at k = COMBAT.k.flank = 1: the 1:1 Table B-1 gives for a counterattack into a
// flank. FM 3-90 para. 3-31 pairs a fixing force (the first attack) with an enveloping force (the
// second). The two-sectors test and the "already fighting" condition are NOTIONAL: the map has no
// facing, so a second direction after the defender is fixed stands for hitting its flank.
export const FLANK = { minDirections: 2 };

// Leaving a fight: a unit that moves out of a sector the enemy is in takes half of one hour of the
// enemy's fire at the plain rate (k = 1) as it breaks contact, and inflicts nothing. NOTIONAL: no open
// source gives a disengagement loss; FM 3-90 para. 11-5 describes the delay that "Give ground" imitates.
export const DISENGAGE = 0.5;

// Unit types. Strength is in notional combat-power points (a mechanized battalion = 10). NOTIONAL.
// The weapons company (heavy weapons and anti-tank missiles) fights at double value in a prepared
// defense and at half value when attacking: NOTIONAL, a stand-in for a unit built to kill tanks from
// dug-in positions. Artillery has no combat strength: it fires one mission an hour (ARTILLERY below).
export const TYPES = {
  mech:   { label: 'Mechanized battalion', word: 'mech battalion',  letter: 'M', str: 10 },
  armor:  { label: 'Tank battalion',       word: 'tank battalion',  letter: 'T', str: 12 },
  recon:  { label: 'Recon troop',          word: 'recon troop',     letter: 'R', str: 4 },
  weapons:{ label: 'Weapons company',      word: 'weapons company', letter: 'W', str: 6, prepared: 2, attack: 0.5 },
  arty:   { label: 'Artillery battalion',  word: 'artillery',       letter: 'A', str: 0 },
  decoy:  { label: 'Decoy group',          word: 'decoy group',     letter: 'D', str: 0 },
};

// Forces. NOTIONAL. Blue: 9 units, 66 combat points plus artillery. Red: 13 units, 104 real points plus
// artillery and one decoy group; Red needs the larger force because it must attack prepared positions
// (sizing in METHOD.md). Blue starts deployed; Red arrives from the north edge: recon at 06:00, the first
// echelon at 07:00, the second echelon at 09:00 (arrive: 3; it was 11:00, arrive: 5, in the 16-hour game,
// moved up so the second echelon has time to fight inside a 12-hour day). The first echelon stays at
// 07:00: units arriving at 06:00 would land before anyone could choose their entry sector. key = keyboard shortcut; start = Blue's sector or Red's
// default entry ('rear' = artillery, behind the crossing); group = the role Red's scripted commander uses.
export const FORCES = {
  blue: [
    { id: 'b1', key: '1', type: 'mech',    name: '1st Mech Bn',  short: '1 Mech', start: 'm0' },
    { id: 'b2', key: '2', type: 'mech',    name: '2nd Mech Bn',  short: '2 Mech', start: 'm1' },
    { id: 'b3', key: '3', type: 'mech',    name: '3rd Mech Bn',  short: '3 Mech', start: 'm2' },
    { id: 'b4', key: '4', type: 'mech',    name: '4th Mech Bn',  short: '4 Mech', start: 'm3' },
    { id: 'b5', key: '5', type: 'armor',   name: 'Tank Bn',      short: 'Tanks',  start: 's1' },
    { id: 'b6', key: '6', type: 'weapons', name: 'Weapons Coy',  short: 'Weapons', start: 's2' },
    { id: 'b7', key: '7', type: 'recon',   name: 'A Recon',      short: 'Recon A', start: 'f1', stance: 'give' },
    { id: 'b8', key: '8', type: 'recon',   name: 'B Recon',      short: 'Recon B', start: 'f2', stance: 'give' },
    { id: 'b9', key: 'a', type: 'arty',    name: 'Artillery',    short: 'Artillery', start: 'rear' },
  ],
  red: [
    { id: 'r1', key: '1', type: 'recon',   name: 'A Recon',      short: 'Recon A', start: 'n1', arrive: 0, stance: 'give', group: 'probe' },
    { id: 'r2', key: '2', type: 'recon',   name: 'B Recon',      short: 'Recon B', start: 'n2', arrive: 1, stance: 'give', group: 'spot' },
    { id: 'r3', key: '3', type: 'mech',    name: '1st Mech Bn',  short: '1 Mech', start: 'n1', arrive: 1, group: 'feint' },
    { id: 'r4', key: '4', type: 'mech',    name: '2nd Mech Bn',  short: '2 Mech', start: 'n2', arrive: 1, group: 'main' },
    { id: 'r5', key: '5', type: 'armor',   name: '1st Tank Bn',  short: '1 Tank', start: 'n1', arrive: 1, group: 'main' },
    { id: 'r6', key: '6', type: 'armor',   name: '2nd Tank Bn',  short: '2 Tank', start: 'n2', arrive: 1, group: 'main' },
    { id: 'r7', key: '7', type: 'armor',   name: '3rd Tank Bn',  short: '3 Tank', start: 'n2', arrive: 1, group: 'main' },
    { id: 'r8', key: '8', type: 'decoy',   name: 'Decoy Group',  short: 'Decoy',  start: 'n3', arrive: 1, group: 'decoy' },
    { id: 'r9', key: '9', type: 'mech',    name: '3rd Mech Bn',  short: '3 Mech', start: 'n1', arrive: 3, group: 'second' },
    { id: 'r10', key: '0', type: 'armor',  name: '4th Tank Bn',  short: '4 Tank', start: 'n1', arrive: 3, group: 'second' },
    { id: 'r11', key: 't', type: 'armor',   name: '5th Tank Bn',  short: '5 Tank', start: 'n2', arrive: 3, group: 'second' },
    { id: 'r12', key: 'w', type: 'weapons', name: 'Weapons Coy',  short: 'Weapons', start: 'n2', arrive: 3, group: 'second' },
    { id: 'r13', key: 'a', type: 'arty',   name: 'Artillery',    short: 'Artillery', start: 'rear', arrive: 0 },
  ],
};

// Artillery: each side's battalion fires one mission an hour at any one sector, before anyone moves.
// It cannot be attacked (it sits behind the crossing, and losing the crossing ends the game).
//  - every enemy unit in the sector loses `frac` of its strength (lognormal noise `sigma`): area fire
//    hits a crowded sector harder. NOTIONAL: no open source gives a per-mission effect for a notional
//    battalion. 8% (was 5% in the 16-hour game): each side now fires 12 missions instead of 16, so the
//    per-mission effect was raised (16/12 x 5% = 6.7% keeps the day's total the same) and then set to 8%
//    by the balance check, where it keeps massing on one road costly (METHOD.md section 8). Unchanged for the
//    14-hour day (14 missions each);
//  - the damage report is right with probability `reportRight` (the owner's rule); otherwise it is wrong
//    (no effect when there was some, an exaggerated figure, or damage to a sector that was empty);
//  - a friendly recon troop IN the target sector is hit with probability `friendlyHit`, losing
//    `friendlyFrac` of its strength (danger close). NOTIONAL `friendlyFrac`;
//  - a friendly recon troop NEXT TO the target sector watches the fall of shot: every enemy unit there
//    is shown exactly, with its remaining strength, and a decoy is exposed.
export const ARTILLERY = { frac: 0.08, sigma: 0.35, reportRight: 0.9, friendlyHit: 0.5, friendlyFrac: 0.3 };

// What each side sees (the same rules for both). NOTIONAL: set to be simple enough to reason about.
//  - an enemy unit in a sector you hold is seen exactly, and a decoy there is exposed;
//  - an enemy unit in a sector next to one of your units is seen with probability `next`, with its type
//    (and so its full strength) but not its losses; a decoy group looks like a tank battalion;
//  - recon troops also see "movement" up to `farHops` sectors away, but those reports arrive `farDelay` hours late;
//  - a sighting stays on your map for `memory` hours after it was made.
//  - a decoy group is built to be noticed (`decoyHeard`): recon up to `farHops` sectors away report it as a
//    tank battalion, not just movement, and at once (`heardDelay` 0), not an hour late. NOTIONAL, added
//    2026-09-30 for the feint payoff: before it, a decoy far from Blue's recon read as 6 points of movement
//    an hour late, and one close enough to count was always exposed by Blue's spotted fire, so the feint
//    never drew Blue's reserve (METHOD.md section 13). A decoy still cannot be watched under fire from two
//    sectors away, because spotting needs a recon troop next door.
export const VISION = { next: 0.9, decoyLooksReal: true, decoyHeard: true, heardDelay: 0, farHops: 2, farDelay: 1, memory: 2, moveEst: 6 };  // moveEst: strength a commander assumes for "movement"

// Orders: time from "order sent" to "unit starts moving". One roll per side per hour, shown before you
// give orders ("orders this hour start now" or "start next hour"). NOTIONAL: it stands for writing,
// sending and preparing to move. [hours, probability]. Standing orders (Hold or Give ground) and
// artillery targets take effect at once.
export const ORDER_DELAY = [[0, 0.7], [1, 0.3]];
// Longest run of delayed hours in a row for one side: after this many, the next hour's orders start at once.
// NOTIONAL, added with the 12-hour day. The delay is rolled once per side per hour (not per unit), so the cap
// is per side and the order bar's "start now / start next hour" stays true for every order that hour.
// Without a cap, 19% of 12-hour games have three or more delayed hours in a row for a side (a quarter of
// the day with every order late) and 56% have two (10,000 seeds). A cap of 2 removes the three-hour runs and
// keeps the delay rates (3.4 delayed hours a game instead of 3.6). A cap of 1 was tried and dropped: it also
// removes the two-hour runs but cuts delays to 2.8 a game and weakens the feint (METHOD.md section 5). 0 = no cap.
export const ORDER_DELAY_MAXRUN = 2;

// Scripted commanders. All NOTIONAL decision rules; they read their own side's fogged picture.
export const AI = {
  blue: {
    // the reserve is the Tank Bn and the Weapons Coy; the 4 mech battalions hold the main line
    commitMin: 20,      // commit the reserve when one road shows at least this much enemy strength ...
    commitMargin: 8,    // ... and leads the next road by this much
    // It counts the whole road, north approach included (a decoy heard there counts), and commits only once
    // the enemy on that road has reached the forward zone. NOTIONAL, changed 2026-09-30 (it counted only
    // the forward zone and beyond, where a decoy was always next to Blue's recon and so always exposed).
    recommits: 0,       // how many times the reserve may be redirected after the first commitment. Was 1 in the
                        // 16-hour game; in 12 hours a reserve that can follow every sidestep of Red's main effort
                        // held about 80% of games, so it now commits once (the guard fallback below still applies)
    recommitDelay: 1,   // NOTIONAL, added 2026-09-30: commitment inertia; if recommits > 0, each redirect of the
                        // reserve takes this many extra hours on top of the order delay. Tested with recommits 1 and
                        // 0-2 hours (METHOD.md section 13): it lowered the feint payoff below zero, so recommits stays 0
    counterRatio: 2,    // counterattack a seen enemy group next door if you are at least twice as strong
    // NOTIONAL, added 2026-09-30 against the all-in rush (METHOD.md section 14): when the main-line sector the
    // reserve was sent to holds at least overrunMin points of Red and overrunRatio times the Blue strength there
    // (the 3:1 FM 5-0 Table B-1 gives against a prepared defense), the reserve falls back to the crossing and the
    // overrunPull nearest line battalions on roads where Blue sees no enemy go with it.
    overrunMin: 30,
    overrunRatio: 3,
    overrunPull: 1,
  },
  red: {
    // Times are hours after 06:00. Old values (16-hour game) in brackets; all moved up for the 12-hour day, and
    // kept at the same clock times for the 14-hour day (2026-10-01; METHOD.md section 15).
    assembleUntil: 2,   // the main effort waits in the north until 08:00 [09:00], one hour after it arrives,
                        // so the feint shows itself first
    attackRatio: 2.2,   // attack a sector if Red's force is at least 2.2 [2.5] times what Red sees there; lowered
                        // because a Red that waited for 2.5 could not break a central reserve inside 12 hours,
                        // which made the bait defense hold about 76%
    chaseRatio: 2,      // lower bar to follow a unit that just gave ground (this is how bait works) [1.5]; raised
                        // with attackRatio so it stays below it: the bait still works, it just costs Red less
    lateHour: 6,        // from 12:00 [17:00], attack at lateRatio times what Red sees
    lateRatio: 1.5,     // [1.2]; raised so the earlier "late" phase does not throw Red at prepared positions
    feintBreak: 0.75,   // the feint pulls back after losing a quarter of its strength
    // The planned feint (NOTIONAL, changed 2026-09-30; js/ai.js makePlan): the feint and the decoy go down one
    // of the two roads away from the main effort (they used to take a center road, where Blue's recon start),
    // and the decoy stays in that road's north approach, two sectors from Blue's recon: heard, never watched.
    feintUntil: 3,      // NOTIONAL: from 09:00 [12:00] the feint battalion may leave its road and attack on its own (it joined
                        // the main effort's group until 2026-09-30; from a road away from the main effort that walk
                        // held the main effort up for hours). 09:00 was the best of 08:00-11:00 in the balance check
    feintHold: 6,       // NOTIONAL, added 2026-09-30: while Red sees Blue's reserve on the feint's road the feint stays
                        // there to hold it, until 12:00; otherwise it attacks on its own from feintUntil
    smartShare: 0.4,    // NOTIONAL, changed 2026-09-30 (was 0.5): the game's Red commander uses the planned feint
                        // (main effort on an outer road, feint on a road away from it) this often, any roads otherwise.
                        // With the feint now able to fool Blue, 0.5 left the doctrinal defender holding 49%
    secondDecide: 2,    // the second echelon picks its road at 08:00 [10:00] (it arrives at 09:00 [11:00])
  },
};
