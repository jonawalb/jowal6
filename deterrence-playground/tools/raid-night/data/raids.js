// Raid mixes for the three waves. Launch counts are public reports of real raids; the game scales each
// mix down to a playable number of tracks and keeps the proportions (see scaleMix in js/sim.js).
// Ukraine: Petro Ivaniuk, "Massive Missile Attacks on Ukraine", Kaggle v212, rows for the attack start
//   dates below: only the rows sourced to the Air Force Command post for that attack (source column
//   kpszsu/...). Rows from Air Command South's separate daily tallies (PvKPivden/..., "Unknown UAV" and
//   "Reconnaissance UAV") are excluded because they are not part of the attack report. Re-checked against
//   Kaggle v212 on 30 Sep 2026. Grouping into drone / cruise / ballistic follows tools/ukraine-air-war.
//   These are Ukrainian claims, not independently verified.
// Iran, April 2024: IDF counts reported by CNN and AP ("around 170 drones, more than 30 cruise missiles and
//   more than 120 ballistic missiles"); the game uses the stated floor values.
export const RAIDS = [
  {
    k: 'ua-sep25', short: 'Ukraine, Sept 2025', name: 'the attack on Ukraine that began 6 September 2025',
    mix: { drone: 810, cruise: 9, ballistic: 4 },
    detail: '810 Shahed-type strike drones and decoy drones, 9 Iskander-K cruise missiles and 4 Iskander-M/KN-23 ballistic missiles, per the Ukrainian Air Force Command.',
    src: ['kaggle', 'uafSep25'],
  },
  {
    k: 'ua-feb26', short: 'Ukraine, Feb 2026', name: 'the attack on Ukraine that began 2 February 2026',
    mix: { drone: 450, cruise: 39, ballistic: 32 },
    detail: '450 strike drones (Shahed, Gerbera, Italmas and other types; the Air Force said about 300 were Shaheds); 39 cruise missiles (Kh-101/Kh-555, Iskander-K, Kh-22/Kh-32, Zircon); 32 missiles the Air Force reported as Iskander-M together with S-300.',
    src: ['kaggle', 'uafFeb26'],
  },
  {
    k: 'ir-apr24', short: 'Iran, April 2024', name: 'Iran\'s attack on Israel of 13–14 April 2024',
    mix: { drone: 170, cruise: 30, ballistic: 120 },
    detail: 'About 170 drones, more than 30 cruise missiles and more than 120 ballistic missiles, per the IDF.',
    src: ['cnnA', 'apA'],
  },
];
