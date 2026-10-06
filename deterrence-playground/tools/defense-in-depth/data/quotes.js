// Short quotations shown on the page (rules, tips, Lessons captions). Every one is 15 words or fewer and was
// checked word for word against a page-tagged text extract of the printed book on 2026-10-01 (FACTCHECK.md).
// Only where the exact words matter. Standalone: imports nothing.

/** { id, who, src, page, q, topic }. `src` is an id in data/sources.js. */
export const QUOTES = [
  { id: 'leapfrog', who: 'Hunzeker', src: 'hunzeker', page: '56', topic: 'leapfrog',
    q: 'akin to playing a game of leapfrog, albeit with guns' },
  { id: 'suppress7', who: 'Biddle', src: 'biddle', page: '67', topic: 'suppression',
    q: 'can reduce hostile firing rates by a factor of seven or more' },
  { id: 'directional', who: 'Biddle', src: 'biddle', page: '44', topic: 'enfilade',
    q: 'Most natural cover is directional' },
  { id: 'linear', who: 'Hunzeker', src: 'hunzeker', page: '77', topic: 'enfilade',
    q: 'linear trenches, which were vulnerable to shell bursts and enfilading fire' },
  { id: 'scouting', who: 'Biddle', src: 'biddle', page: '38', topic: 'deadGround',
    q: 'To make the most of it requires careful scouting' },
  { id: 'volley', who: 'Biddle', src: 'biddle', page: '36', topic: 'calibration',
    q: 'can be wiped out by a single battalion volley from hostile artillery' },
  { id: 'vulnerable', who: 'Hunzeker', src: 'hunzeker', page: '61', topic: 'depth',
    q: 'The more successful the attack, the more vulnerable it became.' },
  { id: 'entropic', who: 'Biddle', src: 'biddle', page: '47', topic: 'cohesion',
    q: 'entropic effect of depth' },
  { id: 'cheapCounter', who: 'Biddle', src: 'biddle', page: '48', topic: 'counterattack',
    q: 'thrown back with smaller losses to the counterattacker than the original attacker had suffered' },
  { id: 'riposte', who: 'Hunzeker', src: 'hunzeker', page: '82', topic: 'counterattack',
    q: 'those carried out within twenty-four hours by nearby units' },
  { id: 'gap', who: 'Biddle', src: 'biddle', page: '31', topic: 'barrage',
    q: 'a fatal gap in suppressive coverage (if the fire lifted too soon or fell long)' },
  { id: 'ownShells', who: 'Hunzeker', src: 'hunzeker', page: '52', topic: 'barrage',
    q: 'When artillery shifted too slowly, assault units ran into their own shells.' },
  { id: 'magnifies', who: 'Biddle', src: 'biddle', page: '234', topic: 'era',
    q: 'technology thus magnifies the consequences of force employment' },
  { id: 'assumptions', who: 'Biddle', src: 'biddle', page: '236', topic: 'model',
    q: 'represent assumptions rather than observed values' },
  { id: 'higherBar', who: 'Hunzeker', src: 'hunzeker', page: '36', topic: 'learning',
    q: 'learning sets a higher bar than change' },
];

export const quoteById = id => QUOTES.find(x => x.id === id) || null;
