// Critiques of the ladder. Quotations are copied from the documents named in `cite`, which were opened on 2026-09-29.
// RAND R-3235 pp. 4-5 was read from the scanned PDF (OCR checked against the page image); RAND MG-614 p. 18
// from the PDF text. The Walberg entry quotes his working paper draft (escalation_ladders.tex), cited as
// "Walberg, working paper".
export const CRITIQUES = [
  { title: 'A line where escalation branches',
    quote: ['it offers a linear model of a phenomenon that is actually far more complex and ambiguous'],
    gloss: 'Morgan and colleagues note that a conflict can escalate in many directions, and it is not always clear whether an opponent or a third party will see one step as more or less extreme than another when the steps are unlike each other.',
    cite: 'Forrest E. Morgan, Karl P. Mueller, Evan S. Medeiros, Kevin L. Pollpeter and Roger Cliff, Dangerous Thresholds: Managing Escalation in the 21st Century, RAND MG-614-AF, 2008, p. 18.',
    src: ['rand614'] },
  { title: 'You cannot fall up a ladder',
    quote: ['you cannot fall up a ladder'],
    gloss: 'The same RAND study says climbing a ladder takes purposeful effort, while escalation can happen unintentionally and is usually easier than de-escalation. It proposes a treacherous ravine face or mountainside as the better image.',
    cite: 'Morgan et al., Dangerous Thresholds, RAND MG-614-AF, 2008, p. 18.',
    src: ['rand614'] },
  { title: 'One dimension, and a Western one',
    quote: ['encourage an image of incremental up-and-down movement that can stop at any rung',
      'They describe conflict in only the one dimension of violence level'],
    gloss: 'Davis and Stan argue the ladders carry a Western bargaining-and-signaling view of escalation that is alien to Soviet thinking, and quote Kahn himself admitting that he had attributed to the Soviets behavior "that may in fact be appropriate only to U.S. analysts."',
    cite: 'Paul K. Davis and Peter Stan, Concepts and Models of Escalation, RAND R-3235, 1984, pp. 4–5 (quoting Kahn, 1962, p. 218).',
    src: ['rand3235'] },
  { title: 'Wormholes, not rungs',
    quote: ['Herman Kahn’s 44-rung “escalation ladder,” which describes a continuous, linear escalation path between low-level crisis and all-out strategic conflict, was built on potentially problematic expectations of proportionality and universally shared conceptions of deterrence'],
    gloss: 'Hersman argues that blurred lines between sub-conventional, conventional and strategic conflict, and more actors, make sudden jumps likely. She proposes "wormhole" escalation: holes that open and let a crisis skip rungs.',
    cite: 'Rebecca Hersman, "Wormhole Escalation in the New Nuclear Age," Texas National Security Review 3, no. 3 (Summer 2020).',
    src: ['hersman'] },
  { title: 'Escalation on several dimensions at once',
    quote: ["Kahn's framework treats escalation as at its core linear: states move up or down a single dimension of intensity.",
      'An exercise can represent escalation along one dimension (deploying coast guard vessels for the first time) while de-escalating along another (using fewer aircraft). A unidimensional ladder cannot capture this pattern.'],
    gloss: 'Walberg builds a five-dimension index (military scale, geographic proximity, domain integration, temporal characteristics, narrative integration) for PLA exercises around Taiwan since 2022, and treats Taiwan\'s twelve-nautical-mile territorial waters as the "ceiling" of the current ladder, a threshold approached but never crossed.',
    cite: 'Jonathan Walberg, "Exercise Escalation Ladders: Measuring the Evolution of PLA Coercive Exercises Against Taiwan, 2022–2026," working paper.',
    src: ['walberg'] },
];
