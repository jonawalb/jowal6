// The month in a sentence (Batch C): a short summary under the country boxes after each month, built only from that
// month's results: moves that succeeded (or half-succeeded), a landing and its coast, fighting, the ladder, a peace
// forum's answer, and the public tracks (home support, Taiwan's position). It respects the fog: nothing hidden
// (types, traits, force orders, emphasis that was not used, the computer's reasons) goes in. Pure: returns
// { text, facts }, where facts lists every move it mentions ({ who, id, status }) so tests can check each happened.
import { P } from '../data/params.js';
import { COUNTRIES } from '../data/countries.js';
import { AREA_LABEL } from '../data/theater.js';

// What a successful move did, in a few words (the subject is its capital). Order = how much it leads the sentence.
const DID = {
  cn_hitallies: () => 'struck U.S. and allied forces',
  cn_strike: o => ({ ports: 'struck Taiwan’s ports and fuel', airdef: 'struck Taiwan’s air defenses', command: 'struck Taiwan’s command and leadership' }[o?.focus] || 'struck Taiwan’s military'),
  cn_blockade: o => (o?.kind === 'energy' ? 'declared an energy blockade of Taiwan' : 'declared a blockade of Taiwan'),
  us_mainland: () => 'struck bases on the Chinese mainland',
  tw_counter: () => 'struck invasion staging areas on the mainland',
  us_strike: () => 'struck PLA forces at sea',
  jp_survival: () => 'declared a threat to its survival',
  cn_quarantine: () => 'enforced a coast guard quarantine',
  us_escort: () => 'escorted shipping to Taiwan', jp_escort: () => 'escorted shipping and cleared sea lanes',
  cn_cables: () => 'cut undersea cables to Taiwan',
  cn_drill: () => 'staged a large exercise around Taiwan',
  jp_basing: () => 'opened its bases to U.S. combat operations', jp_limit: () => 'limited U.S. use of its bases to defense',
  us_surge: () => 'surged forces to the region', cn_militia: () => 'swarmed outlying islands with maritime militia',
  cn_trade: () => 'cut trade with Taiwan', cn_minerals: () => 'restricted critical-mineral exports',
  us_sanction: () => 'sanctioned Chinese firms', jp_sanction: () => 'joined sanctions on China',
  cn_cyber: () => 'broke into Taiwan’s networks', cn_cglaw: () => 'ran coast guard patrols in Taiwan’s waters',
  tw_mobilize: () => 'called up its reserves', tw_disperse: () => 'dispersed and hardened its forces', tw_cablefix: () => 'repaired its cables',
  us_show: () => 'made a show of force near Taiwan', us_aid: () => 'sent emergency aid and energy to Taiwan',
  cn_pause: () => 'paused, declaring its point made', cn_talks: () => 'offered talks on its own terms', us_talks: () => 'opened a back channel to Beijing',
  tw_talks: () => 'signalled openness to talks', jp_mediate: () => 'offered to mediate',
};
const RANK = Object.keys(DID);
const NAME = { us: 'the U.S.', tw: 'Taiwan', cn: 'China', jp: 'Japan' };
const cap = t => t[0].toUpperCase() + t.slice(1);
const landed = l => ['success', 'partial'].includes(l.status);

/** `before`: the snapshot at the start of the month (js/engine.js snapshot); `next`: the state after; `log`: the month's log;
 * `me`: the player's country, named "you" (optional). */
export function tldr(before, next, log, me = null) {
  const facts = [], turn = next.turn - 1;
  const name = w => (w === me ? 'you' : NAME[w]);
  const poss = w => (w === me ? 'your' : `${NAME[w]}’s`);
  // Present-tense mood verbs agree with "you".
  const verb = (w, m) => (w !== me ? m : { wavers: 'waver', rallies: 'rally', 'holds firm': 'hold firm', 'is restless': 'are restless', 'holds steady': 'hold steady' }[m]);
  const done = log.filter(l => l.kind === 'action' && !l.forum && landed(l) && DID[l.id]).sort((a, b) => RANK.indexOf(a.id) - RANK.indexOf(b.id));
  const top = w => done.find(l => l.who === w);
  const use = l => {
    facts.push({ who: l.who, id: l.id, status: l.status });
    const t = DID[l.id](l.o);
    return l.who === me ? t.replace(/\bits\b/g, 'your').replace(/\bitself\b/g, 'yourself') : t;
  };
  const parts = [];

  // China first: a landing, or "not yet landed" once the shooting has started, or its main move.
  const land = log.find(l => l.kind === 'action' && l.id === 'cn_landing' && l.status !== 'blocked');
  const cn = top('cn');
  if (land) {
    facts.push({ who: 'cn', id: 'cn_landing', status: land.status });
    const sec = (next.landings || []).filter(x => x.turn === turn).pop()?.sector, coast = sec ? `Taiwan’s ${AREA_LABEL[sec].toLowerCase()}` : 'Taiwan';
    parts.push(land.status === 'success' ? `${name('cn')} landed on ${coast}` : land.status === 'partial' ? `${name('cn')} gained a foothold on ${coast}` : `${poss('cn')} landing on ${coast} was thrown back`);
  } else if (next.maxRung >= 3 && !(next.landings || []).length) {
    const not = me === 'cn' ? 'you have not yet landed' : 'China has not yet landed';
    parts.push(cn ? `${not}, but ${me === 'cn' ? 'you ' : ''}${use(cn)}` : not);
  } else if (cn) parts.push(`${name('cn')} ${use(cn)}`);

  // The coalition's main move (the one that leads the ranking among the U.S., Japan and Taiwan).
  const co = done.find(l => l.who !== 'cn');
  if (co) parts.push(`${name(co.who)} ${use(co)}`);

  // A peace forum's answer.
  const fo = log.find(l => l.kind === 'action' && l.forum);
  if (fo) parts.push(`${fo.forum.to === me ? 'you' : COUNTRIES[fo.forum.to].capital} ${fo.forum.accepted ? 'accepted' : 'turned down'} ${fo.who === me ? 'your' : `${COUNTRIES[fo.who].capital}’s`} call for a peace forum`);

  // Fighting, if nothing else says so.
  const fights = log.filter(l => l.kind === 'battle').map(l => AREA_LABEL[l.area]);
  if (fights.length && parts.length < 2) parts.push(`fighting broke out in the ${fights.join(' and the ')}`);

  if (!parts.length) parts.push(done.length ? 'only minor moves succeeded' : 'no capital’s move succeeded this month');
  let one = parts.join('; ');
  const r0 = before.rung, r1 = next.rung;
  if (r1 > r0) one += `; the crisis rose to ${P.ladder[r1]}`;
  else if (r1 < r0) one += `; the crisis eased to ${P.ladder[r1]}`;
  one = cap(one) + '.';

  // The public mood: home support (public tracks), and Taiwan's position if it moved a lot.
  const mood = ['us', 'jp', 'tw'].map(w => {
    const d = Math.round(next.c[w].support) - before.c[w].support, v = next.c[w].support;
    return [w, d, d <= -3 ? 'wavers' : d >= 3 ? 'rallies' : v >= 55 ? 'holds firm' : v < 45 ? 'is restless' : 'holds steady'];
  });
  const said = mood.filter(([w, d]) => w !== 'tw' || w === me || Math.abs(d) >= 3).map(([w, , m]) => `${name(w)} ${verb(w, m)}`);
  let two = `At home, ${said.slice(0, -1).join(', ')} and ${said.at(-1)}.`;
  const dtw = Math.round(next.tw) - before.tw;
  if (Math.abs(dtw) >= 5) two += ` ${me === 'tw' ? 'Your' : 'Taiwan’s'} position ${dtw < 0 ? 'fell' : 'rose'} ${Math.abs(dtw)} points.`;
  return { text: `${one} ${two}`, facts };
}
