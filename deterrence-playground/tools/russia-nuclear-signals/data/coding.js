// The tool author's coding scheme for Russian nuclear signals. This is an interpretive scheme written
// for this tool, not an official or scholarly standard. Each Russian item gets one type and one level.
// The level asks one question: what did the signal change? Words, a conditional threat, the rules,
// the forces, or the use of a nuclear-capable weapon in war. Level 0 marks offers of restraint.

export const TYPES = [
  { k: 'statement', n: 'Statement', col: 'var(--c1)', d: 'Words from Putin, Medvedev, the Foreign Ministry or other officials.' },
  { k: 'doctrine', n: 'Doctrine', col: 'var(--c4)', d: 'A change to published nuclear policy, such as the 2024 Fundamentals of nuclear deterrence.' },
  { k: 'exercise', n: 'Exercise', col: 'var(--c3)', d: 'Drills with nuclear forces or nuclear-capable delivery systems, announced by Russia.' },
  { k: 'deployment', n: 'Deployment or alert', col: 'var(--c2)', d: 'Announced moves of nuclear weapons or delivery systems, or a declared change in the forces’ readiness.' },
  { k: 'treaty', n: 'Treaty', col: 'var(--c6)', d: 'Arms-control steps: New START suspension, CTBT ratification withdrawal, the end of the INF moratorium.' },
  { k: 'use', n: 'Use of a dual-capable system', col: 'var(--prc)', d: 'Combat use of a new nuclear-capable system that Russia presented as a signal (the Oreshnik), fired with a conventional warhead.' },
];

export const LEVELS = [
  { v: 0, n: 'Restraint', d: 'Offers or commits to keep arms-control limits, usually on condition that the United States does the same.' },
  { v: 1, n: 'Reminder', d: 'Mentions Russia’s nuclear status or deterrence in general terms. No condition, no target, no change to forces.' },
  { v: 2, n: 'Conditional threat', d: 'Links nuclear use or nuclear consequences to a named Western or Ukrainian action, or says the threat is not a bluff.' },
  { v: 3, n: 'Rules change', d: 'Changes a written rule, treaty commitment or test policy, or stages a drill of the weapons most likely to be used first (non-strategic nuclear forces).' },
  { v: 4, n: 'Forces change', d: 'Moves nuclear weapons or nuclear-capable missile units to new places, or declares a change in the forces\u2019 readiness: the Belarus deployments, the February 2022 "special regime" order.' },
  { v: 5, n: 'Combat use of a nuclear-capable weapon', d: 'Combat use of a new nuclear-capable system that Russia presented as a signal (the Oreshnik), with a conventional warhead. No nuclear weapon has been used.' },
];

// Western and NATO responses and battlefield moments are placed on the timeline but not scored.
export const OTHER = {
  response: { n: 'Western or NATO response', col: 'var(--us)' },
  battle: { n: 'Battlefield moment', col: 'var(--faint)' },
};

export const CODING_NOTES = [
  'Routine annual strategic-forces drills (Grom) that Russia holds every autumn are coded 1 unless Russia tied them to the war.',
  'Where one item does more than one thing, it takes the highest level that applies.',
  'The level measures what the signal changed, not how alarming it sounded. A loud threat with no change to forces is a 2.',
  'Publicized tests of new nuclear-capable weapons (Burevestnik, Poseidon, Sarmat) change no rule and no deployed force, so they are coded 1.',
  'Levels are ordinal. A 4 is not "twice" a 2.',
  'Routine combat strikes with dual-capable missiles already in wide use (Iskander, Kinzhal, Kh-101) are not scored. Russia has fired these thousands of times since 2022 without presenting them as signals; only the Oreshnik launches are coded 5.',
];
