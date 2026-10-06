// Weapon groups used by the tool. The grouping is the tool author's, built on the model names and the
// `category` column of missiles_and_uavs.csv in Petro Ivaniuk's "Massive Missile Attacks on Ukraine"
// (see scripts/build_data.py for the exact rules). Keys match GROUPS in attacks.js.
export const GROUP_INFO = {
  shahed: { n: 'Shahed-type drones', short: 'Shahed', col: 'var(--c2)',
    d: 'Rows the dataset labels Shahed-136/131, the Iranian-designed one-way attack drone that Russia builds as the Geran-2.' },
  drone: { n: 'Other drones', short: 'Other UAV', col: 'var(--c5)',
    d: 'Reconnaissance drones (Orlan, ZALA, Supercam and others), Lancet, and rows the dataset labels \"Unknown UAV\".' },
  cruise: { n: 'Cruise missiles', short: 'Cruise', col: 'var(--c1)',
    d: 'Kh-101/Kh-555, Kalibr, Iskander-K, Kh-59/69, Kh-22/32, Oniks, Zircon and other air-, sea- and ground-launched cruise missiles.' },
  ballistic: { n: 'Ballistic missiles', short: 'Ballistic', col: 'var(--prc)',
    d: 'Iskander-M, North Korean KN-23, Kh-47 Kinzhal, and reports that lump S-300/S-400 missiles with Iskander-M. Includes the three launches from Kapustin Yar that the dataset labels intercontinental: the Oreshnik strikes of November 2024, January 2026 and May 2026.' },
  sam: { n: 'S-300/S-400 at ground targets', short: 'S-300/400', col: 'var(--c6)',
    d: 'Air-defense missiles fired at ground targets, when reported on their own.' },
  mixed: { n: 'Mixed missile reports', short: 'Mixed', col: 'var(--c7)',
    d: 'Reports that give one total for ballistic and cruise missiles together.' },
  other: { n: 'Guided bombs', short: 'Bombs', col: 'var(--c8)',
    d: 'The few guided aerial bombs the Air Force reported in these posts.' },
};
