// Interceptor Burn-down: PRC salvo inputs and notional engagement defaults.
// Sources (each opened and checked, September 2026):
//   U.S. DoD, Military and Security Developments Involving the PRC 2024 (Dec 2024), p. 66, "The PRC's Rocket Force":
//     SRBM 300 launchers / 900 missiles; GLCM 150 launchers / 400 missiles; MRBM 300 / 1,300.
//     (The 2025 report, Dec 2025, does not repeat the missile counts.)
//   USIP Iran Primer, 15 Apr 2024: Iran fired 170 drones, at least 30 cruise missiles and more than 120 ballistic
//     missiles at Israel on 13-14 April 2024.
//   Kyiv Independent, 7 Sep 2025, citing Ukraine's Air Force: 810 Shahed-type drones and 13 cruise and
//     ballistic missiles in one night, the largest attack of the war to that date.
// Drone numbers for a PRC campaign against Taiwan have no public estimate. They are notional throughout.

export const THREATS = [
  { k: 'b', n: 'Ballistic', long: 'Short-range ballistic missiles', col: 'var(--c2)', max: 400 },
  { k: 'c', n: 'Cruise', long: 'Ground-launched cruise missiles', col: 'var(--c1)', max: 200 },
  { k: 'd', n: 'Drones', long: 'One-way attack drones', col: 'var(--c8)', max: 1000 },
];

export const PRC_STOCK = { b: 900, c: 400 }; // DoD CMPR 2024: SRBM and GLCM missiles, national totals

// Daily salvo presets. Only the analog figures are sourced; applying them every day is an assumption.
export const SALVOS = [
  { k: 'cmpr10', n: 'SRBM stock in 10 days', v: { b: 90, c: 40, d: 100 },
    s: 'DoD\'s 900 SRBMs and 400 GLCMs spread over 10 days',
    note: 'Ballistic and cruise rates divide the DoD 2024 inventory estimates by ten days. The drone rate is notional.' },
  { k: 'iran', n: 'Iran, April 2024, nightly', v: { b: 120, c: 30, d: 170 },
    s: '120 ballistic, 30 cruise, 170 drones',
    note: 'The size and mix of Iran\'s 13-14 April 2024 attack on Israel (USIP Iran Primer), repeated every day. The repetition is an assumption.' },
  { k: 'ukr', n: 'Russia, Sept. 2025, nightly', v: { b: 4, c: 9, d: 810 },
    s: '810 drones, 13 missiles',
    note: 'The size of Russia\'s 7 September 2025 attack on Ukraine (Ukraine\'s Air Force via Kyiv Independent), repeated every day. The source does not split the 13 missiles between cruise and ballistic; the 4/9 split here is notional.' },
  { k: 'low', n: 'Harassment', v: { b: 20, c: 10, d: 50 },
    s: 'Small daily salvos',
    note: 'A notional low-intensity campaign with no source behind it.' },
];

// Firing doctrines. e = expected interceptors per engaged threat, p = kill probability, given single-shot pk and
// the chance of getting a second look in time (look).
export const DOCTRINES = [
  { k: 's', n: 'Shoot', s: '1 shot', f: (pk) => ({ e: 1, p: pk }) },
  { k: 'sls', n: 'Shoot-look-shoot', s: 'Fire again only after a miss', f: (pk, look) => ({ e: 1 + (1 - pk) * look, p: pk + (1 - pk) * look * pk }) },
  { k: 'ss', n: 'Shoot-shoot', s: '2 shots at once', f: (pk) => ({ e: 2, p: 1 - (1 - pk) ** 2 }) },
  { k: 'sss', n: 'Shoot x3', s: '3 shots at once', f: (pk) => ({ e: 3, p: 1 - (1 - pk) ** 3 }) },
];

// Notional model parameters. None of these is sourced; all are user-adjustable or stated in the method notes.
export const NOTIONAL = {
  horizon: 90,                         // days simulated
  look: { b: 0.5, c: 0.9, d: 1 },      // chance a second shot is possible after a miss (time to see the result)
  limB: 0.6,                           // pk multiplier for systems with limited anti-ballistic ability
  pk: { b: 0.6, c: 0.75, d: 0.8 },     // single-shot kill probability, default
  doc: { b: 'ss', c: 's', d: 's' },    // default doctrine
  avail: 0.8,                          // share of inventory in position and surviving to fire
  nk: 0.4,                             // share of drones defeated by guns, jamming and fighters before any missile fires
  surge: 1,                            // multiplier on days 1 to 3
};
