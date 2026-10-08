// Codebook labels for the TIES variables used by the tool.
// Source: Morgan, Bapat & Kobayashi, "Threat and Imposition of Sanctions (TIES) Data 4.0 Users' Manual,
//   Case Level Data", updated June 2013,
//   https://sanctions.web.unc.edu/wp-content/uploads/sites/18834/2021/04/tiesusersmanualv4.pdf
// Labels are the manual's category names; `d` paraphrases the manual's definition.

// Variable 12, Issue (up to three per case). Keys are the TIES codes.
export const ISSUES = {
  1: { n: 'Contain political influence', d: 'Stop the target exercising non-military power over a third state or an institution.' },
  2: { n: 'Contain military behavior', d: 'Prevent military action by the target, or respond to it.' },
  3: { n: 'Destabilize regime', d: 'Overthrow the regime in power.' },
  4: { n: 'Release citizens, property or material', d: 'Respond to the target seizing citizens, property or material.' },
  5: { n: 'Solve territorial dispute', d: 'Resolve a territorial conflict with the sender or a third party.' },
  6: { n: 'Deny strategic materials', d: 'Keep the target from acquiring goods such as uranium, advanced weapons or rocket technology.' },
  7: { n: 'Retaliate for alliance or alignment choice', d: 'Respond to the target joining, or possibly joining, an alliance or alignment.' },
  8: { n: 'Improve human rights', d: 'End repressive laws, policies or actions.' },
  9: { n: 'End weapons or materials proliferation', d: 'Stop the target supplying weapons or materials to a third party.' },
  10: { n: 'End support of non-state actors', d: 'Stop support for terrorist groups or a faction in a civil war.' },
  11: { n: 'Deter or punish drug trafficking', d: 'Change the target’s drug policies or enforcement.' },
  12: { n: 'Improve environmental policies', d: 'Adopt stricter environmental controls.' },
  13: { n: 'Trade practices', d: 'Change a trade practice, such as tariffs, protection or devaluation.' },
  14: { n: 'Implement economic reform', d: 'Enact specific economic reforms.' },
  15: { n: 'Other', d: 'Any other issue; the dataset’s note field describes it.' },
};

// Unified sanction types (see scripts/build_data.py): the manual codes imposed types (var. 30) and
// threatened types (var. 16) with different numbers for the same measures.
export const TYPE_INFO = {
  total: { n: 'Total embargo', d: 'All economic exchange with the target stopped.' },
  partial: { n: 'Partial embargo', d: 'Trade in certain goods or services stopped both ways.' },
  import: { n: 'Import restriction', d: 'Goods from the target barred, limited or charged extra duties.' },
  export: { n: 'Export restriction', d: 'Goods or services barred from going to the target.' },
  blockade: { n: 'Blockade', d: 'All states prevented from trading with the target, physically or by threat.' },
  asset: { n: 'Asset freeze', d: 'Target assets under the sender’s jurisdiction frozen or seized.' },
  aid: { n: 'Aid cut', d: 'Foreign aid or loans reduced or ended.' },
  travel: { n: 'Travel ban', d: 'People from the target barred from entering the sender.' },
  agreement: { n: 'Agreement suspended', d: 'Economic agreements or contracts with the target cancelled.' },
  other: { n: 'Other (imposed)', d: 'An imposed measure outside the listed types.' },
  unspecific: { n: 'Unspecified (threat)', d: 'Sanctions threatened without naming a type.' },
};

// Variable 39, Final Outcome. `cls` is the tool's grouping (see the method notes on the page).
export const OUTCOMES = {
  1: { n: 'Partial acquiescence by target to threat', cls: 'part', stage: 'threat' },
  2: { n: 'Complete acquiescence by target to threat', cls: 'full', stage: 'threat' },
  3: { n: 'Capitulation by sender in threat stage', cls: 'none', stage: 'threat' },
  4: { n: 'Stalemate in threat stage', cls: 'none', stage: 'threat' },
  5: { n: 'Negotiated settlement (threat stage)', cls: 'nego', stage: 'threat' },
  6: { n: 'Partial acquiescence by target after imposition', cls: 'part', stage: 'imposed' },
  7: { n: 'Total acquiescence by target after imposition', cls: 'full', stage: 'imposed' },
  8: { n: 'Capitulation by sender after imposition', cls: 'none', stage: 'imposed' },
  9: { n: 'Stalemate after imposition', cls: 'none', stage: 'imposed' },
  10: { n: 'Negotiated settlement after imposition', cls: 'nego', stage: 'imposed' },
  0: { n: 'No final outcome coded', cls: 'open', stage: '' },
};

// Outcome classes in chart stacking order. col = token for the colour.
export const CLASSES = [
  { k: 'full', n: 'Target gave in fully', col: 'var(--good)' },
  { k: 'part', n: 'Target gave in partly', col: 'var(--c3)' },
  { k: 'nego', n: 'Negotiated settlement', col: 'var(--c5)' },
  { k: 'none', n: 'Sender backed down or stalemate', col: 'var(--bad)' },
  { k: 'open', n: 'No outcome coded', col: 'var(--faint)' },
];
