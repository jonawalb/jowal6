// Nuclear Signals Observatory: states, dyads, item categories and the escalation-ladder coding rules.
// Hand-written. The builder (scripts/build_data.mjs) imports this file to code every item, and the page imports it
// to show the rules, so the rules on screen are the rules that were applied.
// The rung names are Herman Kahn's (On Escalation, 1965, p. 39, via RAND R-3235), as used in the
// Kahn's Escalation Ladder tool. The mapping from evidence to rungs is this tool's coding, not Kahn's.

export const STATES = [
  { id: 'USA', name: 'United States', short: 'U.S.', col: 'var(--us)' },
  { id: 'RUS', name: 'Russia', short: 'Russia', col: 'var(--red)' },
  { id: 'CHN', name: 'China', short: 'China', col: 'var(--prc)' },
  { id: 'GBR', name: 'United Kingdom', short: 'UK', col: 'var(--c5)' },
  { id: 'FRA', name: 'France', short: 'France', col: 'var(--c4)' },
  { id: 'IND', name: 'India', short: 'India', col: 'var(--c3)' },
  { id: 'PAK', name: 'Pakistan', short: 'Pakistan', col: 'var(--c6)' },
  { id: 'ISR', name: 'Israel', short: 'Israel', col: 'var(--c7)' },
  { id: 'PRK', name: 'North Korea', short: 'DPRK', col: 'var(--c8)' },
];
// Not nuclear-armed, shown where the data covers them: NATO as an alliance, and Iran (rhetoric series only).
export const OTHERS = [
  { id: 'NATO', name: 'NATO', short: 'NATO', col: 'var(--ally)' },
  { id: 'IRN', name: 'Iran (not nuclear-armed)', short: 'Iran', col: 'var(--faint)' },
  { id: 'MULTI', name: 'Multilateral', short: 'Multilateral', col: 'var(--muted)' },
];
export const STATE_IDS = STATES.map(s => s.id);
export const stateName = id => (STATES.find(s => s.id === id) || OTHERS.find(s => s.id === id) || { name: id }).name;
export const stateShort = id => (STATES.find(s => s.id === id) || OTHERS.find(s => s.id === id) || { short: id }).short;

// Corpus country codes -> state ids.
export const CORPUS_STATE = { RU: 'RUS', CN: 'CHN', US: 'USA', IN: 'IND', PK: 'PAK', IR: 'IRN' };

export const CATS = [
  { k: 'rhet', n: 'Rhetoric', d: 'Official statements about nuclear weapons: dated, sourced events, plus the highest-threat sentences from the rhetoric corpus.' },
  { k: 'force', n: 'Exercises & tests', d: 'Nuclear and nuclear-capable missile tests, nuclear-forces exercises, announced deployments and alerts, and combat use of dual-capable missiles with conventional warheads.' },
  { k: 'doct', n: 'Doctrine', d: 'Published changes to nuclear doctrine or declaratory policy.' },
  { k: 'arms', n: 'Arms control', d: 'Treaty signatures, suspensions, withdrawals, expiries, talks, notifications and exchanges.' },
  { k: 'crisis', n: 'Crisis moves', d: 'Military moves in crises between nuclear-armed states, as coded in Kahn’s Escalation Ladder, and Ukraine-war moments from Russia’s Nuclear Signals.' },
];

// Dyads placed on the ladder. Side B lists every id that counts as the other side.
export const DYADS = [
  { id: 'RUS-NATO', a: ['RUS'], b: ['USA', 'GBR', 'FRA', 'NATO'], name: 'Russia ↔ United States & NATO',
    note: 'Includes the Soviet Union before 1992. The UK and France count with the United States and NATO.' },
  { id: 'USA-CHN', a: ['USA'], b: ['CHN'], name: 'United States ↔ China', note: '' },
  { id: 'USA-PRK', a: ['USA'], b: ['PRK'], name: 'United States ↔ North Korea',
    note: 'U.S. allies South Korea and Japan are not nuclear-armed; their moves are not coded.' },
  { id: 'IND-PAK', a: ['IND'], b: ['PAK'], name: 'India ↔ Pakistan', note: '' },
  { id: 'CHN-IND', a: ['CHN'], b: ['IND'], name: 'China ↔ India', note: '' },
  { id: 'RUS-CHN', a: ['RUS'], b: ['CHN'], name: 'Russia (USSR) ↔ China', d1only: true,
    note: 'A historical dyad: placed only by the 1969 border crisis (rule D1). Its later items are not coded, since the two states have not treated each other as nuclear adversaries in the years the other datasets cover.' },
];
// Names that count as "naming" each side (rule D2). Matched on an item's title, summary and quote.
export const ALIASES = {
  USA: /\b(United States|U\.S\.|US|USA|America(n)?|Washington|Pentagon|White House|Biden|Trump)\b/,
  RUS: /\b(Russia(n)?|Soviet|USSR|Moscow|Kremlin|Putin|Medvedev)\b/,
  CHN: /\b(China|Chinese|Beijing|PRC)\b/,
  IND: /\b(India(n)?|New Delhi)\b/,
  PAK: /\b(Pakistan(i)?|Islamabad)\b/,
  PRK: /\b(North Korea(n)?|DPRK|Pyongyang|Kim Jong[- ]Un)\b/,
  GBR: /\b(United Kingdom|Britain|British|UK)\b/,
  FRA: /\b(France|French)\b/,
  NATO: /\b(NATO|North Atlantic Treaty Organization)\b/,
};
// Treaties whose steps belong to a dyad by definition (both sides are parties).
export const TREATY_DYAD = { inf: 'RUS-NATO', start1: 'RUS-NATO', start2: 'RUS-NATO', sort: 'RUS-NATO', newstart: 'RUS-NATO', cfe: 'RUS-NATO', osk: 'RUS-NATO' };

export const DYAD_RULES = [
  { id: 'D1', text: 'An item from a dataset built around one dyad belongs to that dyad: every item in Russia’s Nuclear Signals belongs to Russia ↔ United States & NATO, and every step of a crisis in Kahn’s Escalation Ladder belongs to that crisis’s dyad.' },
  { id: 'D2', text: 'Otherwise an item belongs to a dyad when one side acted and the item’s title, summary or quote names the other side (curated items list the states their source names).' },
  { id: 'D3', text: 'A step in a treaty that binds both sides (INF, START I and II, SORT, New START, CFE, Open Skies) belongs to Russia ↔ United States & NATO.' },
  { id: 'D4', text: 'A nuclear explosive test or a non-routine test flight of a nuclear-capable missile belongs to every dyad of the state that conducted it, because such steps speak to all adversaries at once. Doctrine and declaratory-policy changes place a dyad only when they name the rival (rule D2); otherwise they are shown as context. If a test source names specific states, rule D2 applies instead.' },
  { id: 'D5', text: 'Items that meet none of these rules appear on the timeline and in the state dossier but never place a dyad.' },
];

// Rung rules, checked from the top: the first rule that matches an item gives its rung. null = shown, not placed.
export const RUNG_RULES = [
  { id: 'K', rung: null, label: 'Kahn tool coding',
    text: 'A step of a crisis coded in Kahn’s Escalation Ladder keeps that tool’s rung, which is documented there with its sources.' },
  { id: 'R11', rung: 11, label: 'Declared nuclear alert',
    text: 'A declared rise in the readiness of nuclear forces ("Super-ready status"). Precedent: DEFCON 2 in 1962, Russia’s "special regime of combat duty" in 2022.' },
  { id: 'R5', rung: 5, label: 'Show of force',
    text: 'A nuclear-capable missile test, a nuclear explosive test, a nuclear-forces exercise that is not routine, an announced deployment or forward basing of nuclear weapons or nuclear-capable systems, or combat use of a dual-capable missile with a conventional warhead. Precedents: North Korea’s 2017 ICBM and nuclear tests, warheads in Belarus, the Oreshnik strike.' },
  { id: 'R4', rung: 4, label: 'Hardening of positions',
    text: 'An official nuclear threat that links nuclear use or nuclear consequences to the other side’s action (level 2 in Russia’s Nuclear Signals; flagged threat in curated items), or the suspension, withdrawal, revocation, notice of withdrawal or expiry of a treaty that binds both sides. A threat with no deadline or demand is not an ultimatum (rung 16). Precedent: "Fire and fury," 2017.' },
  { id: 'R3', rung: 3, label: 'Solemn and formal declarations',
    text: 'A published change to nuclear doctrine or declaratory policy, or a formal statement of nuclear policy by a head of state or government.' },
  { id: 'R2', rung: 2, label: 'Political and diplomatic gestures',
    text: 'An arms-control step of restraint or cooperation: an extension, an offer to keep limits, talks, a joint statement, a notification or an agreed exchange. Precedents: the 1962 and 1999 settlements.' },
  { id: 'R0', rung: null, label: 'Routine or context',
    text: 'Routine scheduled drills and training launches that the source does not tie to the other side, reminders of nuclear status (level 1), Western responses that only criticise, battlefield moments, and corpus sentences: shown as evidence, not placed.' },
];
export const RULE = Object.fromEntries(RUNG_RULES.map(r => [r.id, r]));

export const PLACEMENT = [
  'A dyad’s placement on a date is the highest rung of any placed item in that dyad in the window before it (12 months by default; 3, 6 or 24 to choose).',
  'Rungs are ordinal. Rung 5 is not "more than twice" rung 2, and a higher rung means a more dangerous kind of move, not a higher probability of war.',
  'No item since 1945 reaches rung 13 or above. Any use of a nuclear weapon would be rung 15 ("Barely nuclear war") or higher, and no rule here assigns it because none has happened.',
  'Rhetoric tone from the corpus never places a dyad. The tone model is validated only against an automated teacher, not human coders, and it scores sentences that report another side’s threats or offer reassurance as threatening too. It is shown next to the placement as context.',
];
