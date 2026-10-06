// Argument building blocks for the Baltic Matrix Game. All FICTIONAL and NOTIONAL: scripted options written for
// a teaching exercise, not predictions or descriptions of any real plan. Reasons marked `src` lean on a sourced
// background fact (data/sources.js); the claim inside a reason is still the actor's argument, not the site's.
//
// action: { id, text, result, tags, diff (base modifier), win/lose (board effects), }
// reason: { text, tags (what kind of action it can support), cond (when it holds), src? }
// counter: { text, vs (tags it can argue against), cond }
// cond: { k: track, op: 'ge'|'le', v } | { inject: tag } | null (always holds)

export const MOVES = {
  estonia: {
    actions: [
      { id: 'E1', text: 'Replace the buoys and step up Police and Border Guard patrols on the river', result: 'The river line is marked again and patrolled.', tags: ['border', 'law'], diff: 0, win: { coh: 1, att: 1 }, lose: { esc: 1 } },
      { id: 'E2', text: 'Request NATO consultations under Article 4', result: 'Allies meet and back Estonia in public.', tags: ['diplo', 'deter'], diff: -1, win: { coh: 1, att: 2, esc: 1 }, lose: { coh: -1 } },
      { id: 'E3', text: 'Run a Russian-language public information drive in Ida-Viru County', result: 'Residents hear the state\'s account in their own language.', tags: ['info', 'local'], diff: 0, win: { loc: 2 }, lose: { loc: -1 } },
      { id: 'E4', text: 'Fund an emergency jobs and heating package for Narva', result: 'Visible help reaches households within weeks.', tags: ['local', 'econ'], diff: 0, win: { loc: 2, esc: -1 }, lose: { loc: -1 } },
      { id: 'E5', text: 'Ask the EU for a sanctions response', result: 'The EU agrees new restrictive measures.', tags: ['econ', 'diplo', 'law'], diff: -1, win: { coh: 1, att: 1 }, lose: { coh: -1 } },
      { id: 'E6', text: 'Propose a joint border commission meeting with Russia', result: 'Border officials meet and agree a hotline for river incidents.', tags: ['talks', 'law'], diff: -1, win: { esc: -2 }, lose: { coh: -1 } },
    ],
    reasons: [
      { text: 'Estonian law applies on Estonia\'s side of the river.', tags: ['law', 'border'], cond: null },
      { text: 'Allies are united behind us.', tags: ['diplo', 'deter'], cond: { k: 'coh', op: 'ge', v: 6 } },
      { text: 'A NATO battlegroup is already stationed in Estonia.', tags: ['deter'], cond: null, src: 'natoEfp' },
      { text: 'Russian is the mother tongue of almost all of Narva, so outreach must be in Russian.', tags: ['info'], cond: null, src: 'statLang' },
      { text: 'Residents are frustrated and need visible help now.', tags: ['local', 'econ'], cond: { k: 'loc', op: 'le', v: 5 } },
      { text: 'The world is watching this border.', tags: ['law', 'info'], cond: { k: 'att', op: 'ge', v: 5 } },
      { text: 'Tension is still low enough to talk.', tags: ['talks'], cond: { k: 'esc', op: 'le', v: 4 } },
      { text: 'Estonia has handled border incidents like this before, in 2014 and 2024.', tags: ['border'], cond: { inject: 'border' }, src: 'bbcBuoys' },
    ],
    counters: [
      { text: 'Estonian law applies on our side of the river.', vs: ['border', 'law'], cond: null },
      { text: 'Residents already have Estonian services, courts and schools.', vs: ['local', 'info'], cond: { k: 'loc', op: 'ge', v: 5 } },
      { text: 'The claims are false and we can document it.', vs: ['info'], cond: { k: 'att', op: 'ge', v: 5 } },
      { text: 'Our allies stand with us.', vs: ['talks', 'deter', 'escal'], cond: { k: 'coh', op: 'ge', v: 7 } },
      { text: 'We will not negotiate under pressure.', vs: ['talks'], cond: { k: 'esc', op: 'ge', v: 6 } },
      { text: 'Border delays hurt Russia\'s own traders as much as ours.', vs: ['econ'], cond: { k: 'att', op: 'ge', v: 4 } },
    ],
  },
  russia: {
    actions: [
      { id: 'R1', text: 'Dispute the river boundary in a formal diplomatic note', result: 'Other governments start to call the line "contested".', tags: ['law', 'border'], diff: 0, win: { att: 1, coh: -1 }, lose: { coh: 1 } },
      { id: 'R2', text: 'Run a state-media campaign alleging discrimination in Narva', result: 'The story spreads among Narva residents.', tags: ['info'], diff: 0, win: { loc: -2 }, lose: { loc: 1, coh: 1 } },
      { id: 'R3', text: 'Extend the exercise near the border by two weeks', result: 'Allies argue over how to respond.', tags: ['deter', 'escal'], diff: 0, win: { esc: 2, coh: -1 }, lose: { coh: 2 } },
      { id: 'R4', text: 'Slow the Narva–Ivangorod crossing with extended inspections', result: 'Queues grow and Narva businesses lose trade.', tags: ['border', 'econ', 'escal'], diff: 0, win: { loc: -1, esc: 1 }, lose: { loc: 1 } },
      { id: 'R5', text: 'Advertise consular services and passports to Narva residents', result: 'Queues form at the consulate and it makes the news.', tags: ['local', 'law'], diff: -1, win: { loc: -1, att: 1, coh: -1 }, lose: { loc: 1, coh: 1 } },
      { id: 'R6', text: 'Offer talks with Tallinn alone, without NATO or the EU', result: 'Some allies ask whether Estonia should take the offer.', tags: ['talks', 'diplo'], diff: -1, win: { coh: -2, esc: -1 }, lose: { coh: 1 } },
    ],
    reasons: [
      { text: 'The river line is disputed on paper.', tags: ['law', 'border'], cond: { inject: 'border' } },
      { text: 'The allies are already divided.', tags: ['talks', 'escal'], cond: { k: 'coh', op: 'le', v: 5 } },
      { text: 'Residents feel ignored by Tallinn.', tags: ['info', 'local'], cond: { k: 'loc', op: 'le', v: 5 } },
      { text: 'A third of Narva holds Russian citizenship.', tags: ['local', 'law'], cond: null, src: 'statCit' },
      { text: 'Exercises on our own territory are routine and lawful.', tags: ['deter'], cond: null },
      { text: 'Pressure works best while few are watching.', tags: ['border', 'econ', 'info', 'escal'], cond: { k: 'att', op: 'le', v: 4 } },
      { text: 'An offer of talks looks reasonable when tension is high.', tags: ['talks'], cond: { k: 'esc', op: 'ge', v: 5 } },
      { text: 'Most of Narva speaks Russian, so Russian-language media reach it.', tags: ['info'], cond: null, src: 'statLang' },
    ],
    counters: [
      { text: 'This is a provocation against Russia\'s security.', vs: ['deter', 'border'], cond: { k: 'esc', op: 'ge', v: 5 } },
      { text: 'The markers were in Russian waters.', vs: ['border', 'law'], cond: { inject: 'border' } },
      { text: 'Tallinn\'s outreach is propaganda and residents know it.', vs: ['info', 'local'], cond: { k: 'loc', op: 'le', v: 5 } },
      { text: 'Sanctions will hurt Europe more than Russia.', vs: ['econ'], cond: { k: 'coh', op: 'le', v: 6 } },
      { text: 'The allies will not risk a war over Narva.', vs: ['deter', 'diplo'], cond: { k: 'coh', op: 'le', v: 5 } },
      { text: 'Talks first require dropping preconditions.', vs: ['talks'], cond: { k: 'esc', op: 'ge', v: 6 } },
    ],
  },
  nato: {
    actions: [
      { id: 'N1', text: 'Reinforce the forward land forces in Estonia toward brigade size', result: 'More allied troops arrive in Estonia.', tags: ['deter'], diff: -1, win: { coh: 1, esc: 1, att: 1 }, lose: { coh: -1 } },
      { id: 'N2', text: 'Increase Baltic air policing and maritime patrols', result: 'Patrols become more frequent and visible.', tags: ['deter', 'border'], diff: 0, win: { coh: 1, att: 1 }, lose: { esc: 1 } },
      { id: 'N3', text: 'Convene the North Atlantic Council and issue a unity statement', result: 'All Allies sign one clear statement.', tags: ['diplo'], diff: 0, win: { coh: 2 }, lose: { coh: -1 } },
      { id: 'N4', text: 'Open a military deconfliction line with Russia', result: 'Both sides agree to notify exercises near the border.', tags: ['talks'], diff: -1, win: { esc: -2 }, lose: { coh: -1 } },
      { id: 'N5', text: 'Publish imagery of the buildup across the river', result: 'Media and governments see what is happening.', tags: ['info'], diff: 0, win: { att: 2, coh: 1 }, lose: { att: 1, esc: 1 } },
      { id: 'N6', text: 'Hold a large allied exercise in the Baltic region', result: 'Allies show they can reinforce quickly.', tags: ['deter', 'escal'], diff: 0, win: { coh: 1, esc: 1 }, lose: { esc: 1, coh: -1 } },
    ],
    reasons: [
      { text: 'Forward presence has been agreed Alliance policy since 2016.', tags: ['deter', 'diplo'], cond: null, src: 'natoEfp' },
      { text: 'Allies agreed in 2022 to scale up to brigades where and when required.', tags: ['deter'], cond: null, src: 'natoEfp' },
      { text: 'Allies are cohesive right now.', tags: ['diplo', 'deter'], cond: { k: 'coh', op: 'ge', v: 7 } },
      { text: 'Restraint keeps escalation in check when tension is high.', tags: ['talks'], cond: { k: 'esc', op: 'ge', v: 6 } },
      { text: 'Estonia is under pressure on its border.', tags: ['diplo', 'border'], cond: { inject: 'border' } },
      { text: 'Air and sea patrols are routine and predictable.', tags: ['border'], cond: null },
      { text: 'The evidence is already in public view.', tags: ['info'], cond: { k: 'att', op: 'ge', v: 5 } },
      { text: 'A buildup across the river needs a visible answer.', tags: ['deter', 'info'], cond: { inject: 'escal' } },
    ],
    counters: [
      { text: 'The Alliance will respond as one.', vs: ['deter', 'escal'], cond: { k: 'coh', op: 'ge', v: 7 } },
      { text: 'Surveillance already shows the buildup.', vs: ['deter'], cond: { k: 'att', op: 'ge', v: 5 } },
      { text: 'Allied patrols make border harassment costly.', vs: ['border'], cond: { k: 'att', op: 'ge', v: 5 } },
      { text: 'Side deals with one Ally cannot split the Alliance.', vs: ['talks'], cond: { k: 'coh', op: 'ge', v: 5 } },
      { text: 'Every move now draws attention and cost.', vs: ['escal', 'deter'], cond: { k: 'att', op: 'ge', v: 5 } },
      { text: 'Restraint: do not overreact.', vs: ['deter', 'escal'], cond: { k: 'esc', op: 'ge', v: 7 } },
    ],
  },
  eu: {
    actions: [
      { id: 'U1', text: 'Adopt a targeted sanctions package', result: 'New restrictive measures enter into force.', tags: ['econ', 'law'], diff: -1, win: { coh: 1, att: 1 }, lose: { coh: -2 } },
      { id: 'U2', text: 'Fast-track regional and transition funds for Ida-Viru County', result: 'Money for jobs and heating reaches Narva.', tags: ['local'], diff: 0, win: { loc: 2 }, lose: { loc: -1 } },
      { id: 'U3', text: 'Send an EU border-management support team', result: 'EU officers help run the crossing and log incidents.', tags: ['border', 'law'], diff: 0, win: { coh: 1, att: 1 }, lose: { esc: 1 } },
      { id: 'U4', text: 'Issue a joint statement condemning border provocations', result: 'All 27 member states sign.', tags: ['diplo', 'law'], diff: 0, win: { coh: 1, att: 1 }, lose: { coh: -1 } },
      { id: 'U5', text: 'Fund independent Russian-language local media', result: 'Local outlets gain reach and credibility.', tags: ['info', 'local'], diff: 0, win: { loc: 1, att: 1 }, lose: { loc: -1 } },
      { id: 'U6', text: 'Offer mediation through the OSCE', result: 'Both sides accept a neutral forum.', tags: ['talks'], diff: -1, win: { esc: -2 }, lose: { coh: -1 } },
    ],
    reasons: [
      { text: 'Border regions are an EU funding priority.', tags: ['local'], cond: null },
      { text: 'Member states are aligned.', tags: ['econ', 'diplo'], cond: { k: 'coh', op: 'ge', v: 7 } },
      { text: 'Narva\'s economy is under visible strain.', tags: ['local'], cond: { k: 'loc', op: 'le', v: 5 } },
      { text: 'The river is part of the EU\'s external border.', tags: ['border'], cond: null },
      { text: 'Economic pressure is the Union\'s strongest lever.', tags: ['econ'], cond: null },
      { text: 'The public is paying attention.', tags: ['info', 'diplo'], cond: { k: 'att', op: 'ge', v: 5 } },
      { text: 'A neutral venue can lower the temperature.', tags: ['talks'], cond: { k: 'esc', op: 'ge', v: 5 } },
      { text: 'Disinformation is spreading in the region.', tags: ['info'], cond: { inject: 'info' } },
    ],
    counters: [
      { text: 'Any border violation will bring sanctions.', vs: ['border', 'escal'], cond: { k: 'coh', op: 'ge', v: 7 } },
      { text: 'EU funds answer the local grievances directly.', vs: ['local'], cond: { k: 'loc', op: 'ge', v: 5 } },
      { text: 'The external border is EU business, not a bilateral matter.', vs: ['talks', 'law'], cond: null },
      { text: 'Unity statements blunt divide-and-rule.', vs: ['diplo'], cond: { k: 'coh', op: 'ge', v: 6 } },
      { text: 'Fact-checking networks are already active.', vs: ['info'], cond: { k: 'att', op: 'ge', v: 5 } },
      { text: 'Escalation hurts trade for everyone.', vs: ['deter', 'escal'], cond: { k: 'esc', op: 'ge', v: 6 } },
    ],
  },
  community: {
    actions: [
      { id: 'C1', text: 'City council convenes a public forum with national officials', result: 'Residents put questions to ministers face to face.', tags: ['local', 'diplo'], diff: 0, win: { loc: 2, esc: -1 }, lose: { loc: -1 } },
      { id: 'C2', text: 'Civic associations hold a peaceful rally for language-transition support', result: 'The demand is heard in Tallinn and in foreign media.', tags: ['local', 'info'], diff: -1, win: { loc: 1, att: 1 }, lose: { loc: -1, esc: 1 } },
      { id: 'C3', text: 'Local employers petition for EU transition funds', result: 'The petition wins a hearing in Brussels.', tags: ['econ', 'local'], diff: 0, win: { loc: 2 }, lose: { loc: -1 } },
      { id: 'C4', text: 'Community organisations issue a joint call for calm', result: 'Rumours lose steam and street tension drops.', tags: ['info', 'local'], diff: 0, win: { esc: -1, loc: 1 }, lose: { loc: -1 } },
      { id: 'C5', text: 'Local media fact-check viral claims in Russian', result: 'The most-shared false claims are corrected.', tags: ['info'], diff: 0, win: { loc: 1, att: 1 }, lose: { loc: -1 } },
      { id: 'C6', text: 'Invite international observers to the city', result: 'Observers arrive and report on the border and the city.', tags: ['diplo', 'law'], diff: -1, win: { att: 2, esc: -1 }, lose: { att: 1 } },
    ],
    reasons: [
      { text: 'Narva is overwhelmingly Russian-speaking, and it is our city.', tags: ['local'], cond: null, src: 'statLang' },
      { text: 'Half of residents are Estonian citizens.', tags: ['diplo', 'law'], cond: null, src: 'statCit' },
      { text: 'Families need jobs and heating more than slogans.', tags: ['econ'], cond: { k: 'loc', op: 'le', v: 5 } },
      { text: 'Calm is in everyone\'s interest when tension is high.', tags: ['info', 'talks'], cond: { k: 'esc', op: 'ge', v: 5 } },
      { text: 'Outside observers keep all sides honest.', tags: ['law'], cond: { k: 'att', op: 'ge', v: 4 } },
      { text: 'Local voices are trusted more than national ones.', tags: ['info'], cond: { k: 'loc', op: 'ge', v: 4 } },
      { text: 'The EU has funds meant for regions like ours.', tags: ['econ'], cond: null },
      { text: 'The border crossing is our livelihood.', tags: ['econ'], cond: { inject: 'border' } },
    ],
    counters: [
      { text: 'We are not anyone\'s pawns.', vs: ['info', 'law'], cond: { k: 'loc', op: 'ge', v: 5 } },
      { text: 'Outsiders do not speak for Narva.', vs: ['info', 'local'], cond: { k: 'loc', op: 'ge', v: 6 } },
      { text: 'Troops do not fix the heating.', vs: ['deter'], cond: { k: 'loc', op: 'le', v: 5 } },
      { text: 'The crossing is our livelihood.', vs: ['border', 'econ'], cond: null },
      { text: 'Calm down: we live here.', vs: ['escal', 'deter'], cond: { k: 'esc', op: 'ge', v: 6 } },
      { text: 'Promises need follow-through.', vs: ['econ', 'local'], cond: { k: 'loc', op: 'le', v: 4 } },
    ],
  },
};
