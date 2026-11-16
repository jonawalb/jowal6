// The player's levers. Costs and effects are NOTIONAL game design (see params.js). Each lever links to a
// policy card (data/policies.js) that gives the real tool's legal basis and current status.
export const LEVERS = [
  { id: 'list', name: 'Entity List designation', short: 'List a shell', budget: 1, capital: 3, target: 'shell', policy: 'entity-list',
    text: 'Add an identified front company to the Entity List. Its route closes at once. The network registers a new shell unless enforcement deters it.' },
  { id: 'euc', name: 'End-use checks abroad', short: 'End-use check', budget: 2, capital: 0, target: 'hub', policy: 'end-use-checks', max: 2,
    text: 'Send officers to verify end users at a hub this quarter. Raises seizures and exposes hidden shells there. Works only as well as the host government cooperates.' },
  { id: 'agents', name: 'Enforcement agents and prosecutions', short: 'Agents', budget: 0, capital: 2, target: 'level', policy: 'penalties',
    text: 'Set the standing enforcement level (0 to 3). Each level costs 2 budget every quarter. Raises seizures everywhere, deters new shells, and after two quarters can produce prosecutions that expose a whole hub.' },
  { id: 'hub', name: 'Hub pressure and allied coordination', short: 'Press a hub', budget: 1, capital: 4, target: 'hub', policy: 'allied-coordination', max: 1,
    note: 'Pressing a hub is diplomacy with no single legal instrument. A related formal tool:',
    text: 'Press a transshipment hub’s government and coordinate with allies (up to level 2, lasts). Raises seizures at that hub. Costs allied goodwill each time.' },
  { id: 'kyc', name: 'Know-your-customer rule for cloud providers', short: 'Cloud KYC rule', budget: 0, capital: 12, target: 'once', policy: 'remote-access-ifr',
    note: 'The 2024 cloud KYC proposal (89 FR 5698) was never finalized. The closest real rule, released 16 Nov 2026 and not yet published in the Federal Register:',
    text: 'Start a rulemaking that makes US cloud providers verify foreign customers. Takes effect after 2 quarters. Cuts rented compute, but some moves to providers outside US reach. Industry pays compliance costs every quarter.' },
  { id: 'lv', name: 'Chip location verification requirement', short: 'Location verification', budget: 0, capital: 15, target: 'once', policy: 'location-verification',
    note: 'No location verification requirement is law. The main bill:',
    text: 'Require location verification for advanced chips. Takes effect after 3 quarters. Cuts diversion on every physical route, then erodes as diverters learn to spoof it. Costs industry up front and every quarter.' },
  { id: 'relax', name: 'Licensing relaxation for allies and industry', short: 'Relax licensing', budget: 0, capital: 0, target: 'once-per-quarter', policy: 'licensing',
    note: 'Real relaxations include the UAE move to Country Group A:5 (91 FR 43034, July 2026) and this one, for China:',
    text: 'Ease licensing for trusted allies and US firms. Wins back political capital, revenue and goodwill. More legitimate volume through hubs also gives diverters more cover.' },
];
export const BY_LEVER = Object.fromEntries(LEVERS.map(l => [l.id, l]));
