// Herman Kahn's 44-rung escalation ladder, On Escalation: Metaphors and Scenarios (1965), p. 39, as RAND R-3235 cites it ("Kahn (1965:39)").
// R-3235's bibliography lists "(rev. ed.), Penguin Books, Baltimore, 1965", but Open Library dates the Penguin Baltimore edition 1968
// (the first edition is Praeger, New York, 1965), so the page cites no edition.
// Rung names, group names and threshold names are transcribed exactly (spelling, quotation marks and dashes) from the
// reproduction of Kahn's figure in Paul K. Davis and Peter Stan, "Concepts and Models of Escalation",
// RAND R-3235, 1984, Fig. 2 ("Kahn's 44-step escalation ladder for generalized or abstract scenario"; source line
// "Kahn (1965:39)"), p. 6 of the report. Landing page: https://www.rand.org/pubs/reports/R3235.html (opened 2026-09-29).
// Only the capitalization of the first word follows the RAND figure; nothing is paraphrased.
export const KAHN_SRC = {
  cite: 'Herman Kahn, On Escalation: Metaphors and Scenarios (1965), p. 39, as reproduced in Paul K. Davis and Peter Stan, Concepts and Models of Escalation, RAND R-3235, 1984, Fig. 2.',
  url: 'https://www.rand.org/pubs/reports/R3235.html',
};

export const BOTTOM = 'Disagreement—Cold War';
export const TOP = 'Aftermaths';

// Groups from the bottom up. `after` is the threshold printed above the group's highest rung.
export const GROUPS = [
  { id: 'sub', name: 'Subcrisis Maneuvering', from: 1, to: 3, after: "Don't Rock the Boat Threshold" },
  { id: 'trad', name: 'Traditional Crises', from: 4, to: 9, after: 'Nuclear War Is Unthinkable Threshold' },
  { id: 'intense', name: 'Intense Crises', from: 10, to: 20, after: 'No Nuclear Use Threshold' },
  { id: 'bizarre', name: 'Bizarre Crises', from: 21, to: 25, after: 'Central Sanctuary Threshold' },
  { id: 'exemplary', name: 'Exemplary Central Attacks', from: 26, to: 31, after: 'Central War Threshold' },
  { id: 'military', name: 'Military Central Wars', from: 32, to: 38, after: 'City Targeting Threshold' },
  { id: 'civilian', name: 'Civilian Central Wars', from: 39, to: 44, after: null },
];

export const RUNGS = [
  null,
  'Ostensible crisis',
  'Political, economic, and diplomatic gestures',
  'Solemn and formal declarations',
  'Hardening of positions—confrontation of wills',
  'Show of force',
  'Significant mobilization',
  '“Legal” harassment—retortions',
  'Harassing acts of violence',
  'Dramatic military confrontations',
  'Provocative breaking off of diplomatic relations',
  'Super-ready status',
  'Large conventional war (or actions)',
  'Large compound escalation',
  'Declaration of limited conventional war',
  'Barely nuclear war',
  'Nuclear “ultimatums”',
  'Limited evacuation (approximately 20 percent)',
  'Spectacular show or demonstration of force',
  '“Justifiable” counterforce attack',
  '“Peaceful” worldwide embargo or blockade',
  'Local nuclear war—exemplary',
  'Declaration of limited nuclear war',
  'Local nuclear war—military',
  'Unusual, provocative, and significant countermeasures',
  'Evacuation (approximately 70 percent)',
  'Demonstration attack on zone of interior',
  'Exemplary attack on military',
  'Exemplary attacks against property',
  'Exemplary attacks on population',
  'Complete evacuation (approximately 95 percent)',
  'Reciprocal reprisals',
  'Formal declaration of “general” war',
  'Slow-motion counter-“property” war',
  'Slow-motion counterforce war',
  'Constrained force-reduction salvo',
  'Constrained disarming attack',
  'Counterforce-with-avoidance attack',
  'Unmodified counterforce attack',
  'Slow-motion countercity war',
  'Countervalue salvo',
  'Augmented disarming attack',
  'Civilian devastation attack',
  'Some other kinds of controlled general war',
  'Spasm or insensate war',
];

export const groupOf = n => GROUPS.find(g => n >= g.from && n <= g.to);
