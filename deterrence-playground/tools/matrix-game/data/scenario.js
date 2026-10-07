// Scenario data for the Baltic Matrix Game.
// FACTS are real and sourced (see data/sources.js; census numbers from Statistics Estonia's 2021 census, Narva city).
// Everything else here (the crisis, its injects, the starting board, goal weights) is a FICTIONAL exercise scenario
// with notional values chosen by the designer for teaching. No real individuals appear; every actor is an institution.

export const TAGS = {
  law: 'Law and sovereignty', border: 'Border', deter: 'Military posture', info: 'Information',
  local: 'Local life', econ: 'Economic', diplo: 'Diplomacy', talks: 'Negotiation', escal: 'Coercion',
};

// Crisis-state board. Each track runs 0 to 10. Starting values are notional.
export const TRACKS = [
  { k: 'esc', name: 'Escalation', lo: 'calm', hi: 'armed clash', start: 3,
    help: 'How close the crisis is to military confrontation. At 10 the exercise stops.' },
  { k: 'coh', name: 'Allied cohesion', lo: 'split', hi: 'united', start: 6,
    help: 'How united NATO allies and EU member states are in their response.' },
  { k: 'loc', name: 'Local sentiment', lo: 'alienated', hi: 'confident', start: 5,
    help: 'How confident Narva residents are that their concerns are heard by Tallinn and Brussels.' },
  { k: 'att', name: 'International attention', lo: 'ignored', hi: 'headline', start: 3,
    help: 'How closely governments, media and international bodies are watching.' },
];

// Actors are institutions. `goals` are notional weights on the change in each track, used for the debrief score.
export const ACTORS = {
  estonia: { name: 'Estonia', long: 'Government of Estonia', color: 'var(--c3)',
    brief: 'Keep the border quiet, keep allies close and keep Narva confident in the Estonian state.',
    goals: { esc: -1, coh: 1, loc: 1.5, att: 0.5 } },
  russia: { name: 'Russia', long: 'Government of the Russian Federation', color: 'var(--red)',
    brief: 'Test the border, divide the allies and weaken Narva\'s confidence in Tallinn without triggering a war.',
    goals: { esc: 0.3, coh: -1.5, loc: -1, att: -0.5 } },
  nato: { name: 'NATO', long: 'NATO Allies (North Atlantic Council and commands)', color: 'var(--blue)',
    brief: 'Deter without provoking, and keep all Allies behind one line.',
    goals: { esc: -1, coh: 1.5, loc: 0.5, att: 0.5 } },
  eu: { name: 'EU', long: 'European Union institutions', color: 'var(--c6)',
    brief: 'Use economic and legal tools, support the border region and keep member states aligned.',
    goals: { esc: -1, coh: 1, loc: 1, att: 0.5 } },
  community: { name: 'Narva community', long: 'Narva civic institutions: city council, civic associations, local employers and media', color: 'var(--c5)',
    brief: 'Russian-speaking residents acting through local institutions: keep the city calm, keep livelihoods and get a hearing.',
    goals: { esc: -1.5, coh: 0, loc: 1.5, att: 0.5 } },
};
export const ACTOR_ORDER = ['estonia', 'russia', 'nato', 'eu', 'community'];

// Which AI actor makes the second argument each turn (skipping the player's own actor). Notional.
export const AI_SCHEDULE = ['russia', 'community', 'russia', 'nato', 'russia', 'eu'];

// Real background, each with its source key.
export const FACTS = [
  { src: 'natoEfp', text: 'At the 2016 Warsaw Summit, NATO Allies decided to establish an enhanced Forward Presence in the northeast. By August 2017 multinational battlegroups were operational in Estonia, Latvia, Lithuania and Poland. In Estonia the United Kingdom is the framework nation, with France contributing. NATO now calls the force Forward Land Forces: nine battlegroups, including one in Finland led by Sweden.' },
  { src: 'natoEfp', text: 'In 2022 Allies agreed to deploy additional troops and scale up the battlegroups to brigade-size units, "when and where required".' },
  { src: 'politseiNarva', text: 'The real Narva–Ivangorod crossing has been closed to vehicles since 1 February 2024, leaving it open to pedestrians only, and closed at night since 1 May 2024.' },
  { src: 'statLang', text: 'Narva had 53,955 residents at the 2021 census. 51,560 of them (95.6%) gave Russian as their mother tongue and 1,222 (2.3%) Estonian.' },
  { src: 'statEthnic', text: 'By ethnic nationality, 46,937 Narva residents (87.0%) were Russian and 3,107 (5.8%) Estonian in 2021.' },
  { src: 'statCit', text: 'By citizenship, 27,133 (50.3%) held Estonian citizenship, 18,695 (34.6%) Russian citizenship and 7,099 (13.2%) had undetermined citizenship.' },
  { src: 'bbcKohver', text: 'In September 2014 an officer of Estonia\'s Internal Security Service was taken near the Luhamaa border checkpoint. Estonia said it happened inside Estonia; Russia\'s FSB said it detained him on Russian territory.' },
  { src: 'bbcBuoys', text: 'On 23 May 2024, Russia removed 24 of the 50 buoys Estonia had placed to mark sailing routes on the Narva River. Russia had disputed the locations of about half of 250 planned buoys. The EU called the removal unacceptable and Estonia summoned Russia\'s chargé d\'affaires.' },
];

// Six fictional injects, one per turn. `nudge` shifts the board when the turn opens (notional).
export const INJECTS = [
  { title: 'Markers gone again', tags: ['border', 'law'], nudge: { att: 1 },
    text: 'Overnight, several of Estonia\'s navigation buoys on the Narva River disappear. The Russian border service says they sat in Russian waters. Estonia\'s border guard publishes photos of the empty moorings.' },
  { title: 'Cold week in Narva', tags: ['local', 'info'], nudge: { loc: -1 },
    text: 'A fault at a district heating plant leaves parts of Narva without heat for three days. Russian-language social media accounts blame Tallinn\'s neglect of the east.' },
  { title: 'Drill across the river', tags: ['deter', 'escal'], nudge: { esc: 1 },
    text: 'Russia announces an unscheduled exercise in its border region across the river from Narva. Allied intelligence services report more vehicles than the announcement describes.' },
  { title: 'Brussels splits', tags: ['econ', 'diplo'], nudge: { coh: -1 },
    text: 'EU ministers disagree over a new sanctions package and over extra money for border regions. Two member states ask to delay the decision.' },
  { title: 'Official held at the crossing', tags: ['border', 'law', 'escal'], nudge: { esc: 1, att: 1 },
    text: 'An Estonian customs official is detained at the Narva–Ivangorod crossing. Each side gives a different account of which side of the line it happened on.' },
  { title: 'Ballot season', tags: ['local', 'info'], nudge: { att: 1 },
    text: 'Narva holds a city council by-election. Language policy, citizenship and the border crossing dominate the campaign.' },
];

export const FICTION_NOTE = 'Fictional exercise scenario. The injects, arguments and outcomes are invented for teaching and describe no real event, plan or statement.';
