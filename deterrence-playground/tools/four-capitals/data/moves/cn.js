// China's moves. All numbers are illustrative game design. fx(s, m, o, ctx): m = 1 success, 0.5 partial, 0 failure;
// o = this move's follow-up answers; ctx = { who, hit(who, area, n, type), add(who, area, n), ready(who, d) }.
// cost: { lift, fuel, mun, ready } paid when chosen (see js/logistics.js); grant: resources the move adds this month.
import { T, chose, opt, post, at, q, SEA_Q } from '../ops.js';
import { P } from '../params.js';
import { ISLAND, SECTOR_VALUE } from '../theater.js';
import { landingWhy, landingFactors, accessSea, usFiresReady } from '../../js/landing.js';
import { coalitionEdge, EDGE_NEED } from '../../js/edge.js';

const holdsStrait = s => s.ctrl.strait === 'red';
/** China's landing coast: this month's emphasis order if known, else the standing one. */
const sectorOf = (s, mv) => mv?.cn?.orders?.emph || s.emph.cn;
export const CN = [
  // Diplomatic
  { id: 'cn_talks', line: 'D', to: 'us', label: 'Offer talks on Beijing’s terms', tags: ['talks', 'soft'], base: 0.6,
    explain: 'Propose negotiations. Counts toward a settlement if Washington or Taipei talks too and nobody escalates.',
    follow: [q('terms', 'What do you put on the table?', [['freeze', 'A freeze', 'Halt arms sales and transits in return for a pause. Easier to accept.'], ['reunify', 'Reunification talks', 'Talks on Beijing’s political terms. Harder to accept, bigger win at home if it works.']])],
    f: (s, mv, w, o) => [chose(mv, 'tw', 'tw_talks') && ['Taipei is open to talks', 15], s.rung >= 3 && ['Fighting under way', -15], o.terms === 'reunify' && ['Hard terms', -15]],
    fx: (s, m, o) => { T(s, 'nuke', -4 * m); T(s, 'shock', -3 * m); if (o.terms === 'reunify') T(s, 'cn.support', 4 * m); } },
  { id: 'cn_wedge', line: 'D', to: 'jp', label: 'Court a capital to stay out', tags: [], base: 0.5,
    explain: 'Offer trade and quiet guarantees for staying out of a Taiwan fight.',
    follow: [q('target', 'Whom do you court?', [['jp', 'Tokyo', 'Keep Japan’s bases out of it.'], ['us', 'Washington', 'A trade deal for restraint. Harder.']])],
    f: (s, mv, w, o) => [o.target === 'jp' && chose(mv, 'jp', 'jp_basing') && ['Japan just opened its bases', -25], o.target === 'jp' && chose(mv, 'jp', 'jp_quiet') && ['Japan is sending quiet assurances', 15], o.target === 'us' && ['Washington is a harder sell', -10], s.struck.jp > 0 && ['China has struck Japan', -30]],
    fx: (s, m, o) => { T(s, 'coal', -(o.target === 'us' ? 12 : 10) * m); if (o.target === 'jp') T(s, 'jp.support', -2 * m); T(s, 'cn.support', -2 * (1 - m)); } },
  { id: 'cn_pause', line: 'D', to: 'tw', label: 'Accept a face-saving pause', tags: ['soft', 'talks'], base: 0.55, unlock: 1,
    explain: 'Step back and declare the point made. Ends the game as a Chinese climb-down only if the ladder is at Blockade or below, Taiwan stands at 60 or more and the coalition has the upper hand (at least two of: Taiwan’s position 70+, coalition cohesion 70+, China’s home support below 45, the coalition holding the Strait or the South). Otherwise it is only a pause.',
    f: (s, mv) => { const e = coalitionEdge(s); return [s.c.cn.support < 40 && ['Weak at home: a pause looks like defeat', -15], !['deesc', 'stand'].includes(post(mv, 'cn')) && ['Not credible without stepping back (posture)', -30],
      e >= EDGE_NEED ? ['The coalition has the upper hand', 5 * e] : ['The coalition lacks the upper hand', -20]]; },
    fx: (s, m) => { T(s, 'nuke', -8 * m); T(s, 'shock', -5 * m); T(s, 'cn.support', -12 * m); } },
  { id: 'cn_summit', line: 'D', to: 'tw', label: 'Invite Taipei’s opposition to a summit', tags: ['soft'], base: 0.55, opp: true,
    avail: s => s.c.tw.support < 55, oppWhy: s => `Taiwan’s home support is below 55 (now ${Math.round(s.c.tw.support)})`, explain: 'Opportunity: Taiwan looks divided. Court the opposition directly.',
    fx: (s, m) => { T(s, 'tw.support', -6 * m); T(s, 'coal', -3 * m); T(s, 'cn.support', 2 * m); } },
  // Information
  { id: 'cn_cog', line: 'I', to: 'tw', label: 'Pressure and disinformation campaign', tags: [], base: 0.6,
    explain: 'Flood Taiwan with messages meant to break its will.',
    follow: [q('theme', 'Main message?', [['hopeless', 'Resistance is hopeless', 'Hits Taiwan’s position.'], ['abandon', 'America will abandon you', 'Hits trust in partners.'], ['blame', 'Your government caused this', 'Hits unity at home.']])],
    f: (s, mv) => [chose(mv, 'tw', 'tw_resil') && ['Taiwan is countering it', -25], chose(mv, 'tw', 'tw_ci') && ['Taiwan is rooting out networks', -10], chose(mv, 'us', 'us_intel') && ['U.S. intelligence releases blunt it', -10]],
    fx: (s, m, o) => { if (o.theme === 'abandon') { T(s, 'coal', -5 * m); T(s, 'tw.support', -3 * m); } else if (o.theme === 'blame') T(s, 'tw.support', -8 * m); else { T(s, 'tw', -6 * m); T(s, 'tw.support', -3 * m); } } },
  { id: 'cn_warn', line: 'I', to: 'us', label: 'Warn that intervention means war', tags: ['esc'], base: 0.55,
    explain: 'Tell a capital that joining in makes it a party to the war.',
    follow: [q('aud', 'Warn whom?', [['us', 'Washington', 'Aims at coalition cohesion.'], ['jp', 'Tokyo', 'Aims at Japan’s nerve and its bases.']])],
    f: (s, mv, w, o) => [o.aud === 'us' && post(mv, 'us') === 'esc' && ['Washington is escalating anyway', -15], s.coal > 70 && ['The coalition is solid', -10]],
    fx: (s, m, o) => { if (o.aud === 'jp') { T(s, 'jp.support', -5 * m); T(s, 'coal', -4 * m); } else T(s, 'coal', -7 * m); T(s, 'nuke', 4); T(s, 'cn.support', 4 * m); } },
  { id: 'cn_feint', line: 'I', to: 'us', label: 'Feints and deception', tags: [], base: 0.7, cost: { fuel: 1 },
    explain: 'Decoy sorties, false signals and dummy concentrations. Next month, rivals without surveillance or ships in contact misread your forces (see the fog-of-war key).',
    ai: s => (s.rung >= 1 ? 1 : 0.3),
    follow: [q('mode', 'What picture do you paint?', [['hide', 'Look smaller', 'Their ranges for your forces shift down and types go unidentified: they under-prepare.'], ['inflate', 'Look bigger', 'Their ranges shift up: they hold back or over-commit to defence.'], ['confuse', 'Blur the picture', 'Their ranges for your forces get much wider.']])],
    f: (s, mv) => [(chose(mv, 'us', 'us_isr') || chose(mv, 'jp', 'jp_watch')) && ['Coalition surveillance surge', -10]],
    fx: (s, m, o) => { if (m > 0) s.deceiveNext.cn = { mode: o.mode, m }; } },
  // Intelligence
  { id: 'cn_cyber', line: 'N', to: 'tw', label: 'Cyber intrusion into Taiwan’s networks', tags: ['esc', 'gray'], base: 0.6,
    explain: 'Get inside Taiwan’s systems and use the access.',
    follow: [q('target', 'Target?', [['grid', 'Power grid', 'Blackouts hit the economy and morale.'], ['command', 'Military networks', 'Slows Taiwan’s forces: −10 readiness across its formations.'], ['finance', 'Banks and markets', 'Rattles the economy and markets.']])],
    f: (s, mv) => [chose(mv, 'tw', 'tw_ci') && ['Taiwan is hunting intruders', -20], chose(mv, 'us', 'us_cyberdef') && ['U.S. cyber defenders in Taiwan’s networks', -20]],
    fx: (s, m, o, c) => { if (o.target === 'command') c.ready('tw', -10 * m); else if (o.target === 'finance') { T(s, 'tw.economy', -5 * m); T(s, 'shock', 3 * m); } else { T(s, 'tw.economy', -4 * m); T(s, 'tw.support', -4 * m); } } },
  { id: 'cn_recon', line: 'N', to: 'tw', label: 'Surge surveillance around Taiwan', tags: [], base: 0.75,
    explain: 'Satellites, drones and listening posts. Next month you see the coalition’s forces exactly and your military moves get +5.', ai: s => (s.rung >= 1 ? 1 : 0.5),
    fx: (s, m) => { if (m >= 0.5) { s.sharpNext.cn = true; s.reconNext.cn = true; } } },
  { id: 'cn_cables', line: 'N', to: 'tw', label: 'Cut undersea cables (deniably)', tags: ['gray'], base: 0.6, cost: { fuel: 0.5 },
    explain: 'A “fishing boat” drags its anchor across Taiwan’s internet cables. Hard to pin on Beijing; the damage lasts until Taiwan repairs it.',
    ai: s => (s.cables > 0 ? 0 : 0.25),     // the later months of damage, which a one-month lookahead misses
    follow: [q('target', 'Which cables?', [['outlying', 'To the outlying islands', 'Cuts off Matsu or Kinmen: hits Taiwan’s morale; repairs take 2 months.'], ['main', 'Taiwan’s main trunk cables', 'Hits the economy and markets and draws attention abroad; repairs take 3 months.']])],
    f: (s, mv) => [chose(mv, 'jp', 'jp_cables') && ['Japan is patrolling the cable routes', -20], chose(mv, 'tw', 'tw_cgexpel') && ['Taiwan’s coast guard is shadowing Chinese boats', -10], chose(mv, 'us', 'us_cutters') && ['U.S. Coast Guard nearby', -5]],
    fx: (s, m, o) => { const main = o.target === 'main';
      if (main) { T(s, 'tw.economy', -4 * m); T(s, 'shock', 2 * m); T(s, 'coal', 2 * m); } else T(s, 'tw.support', -4 * m);
      T(s, 'tw.support', -2 * m); if (m > 0) s.cables = Math.max(s.cables || 0, Math.round((main ? 3 : 2) * m)); } },
  // Law enforcement
  { id: 'cn_cglaw', line: 'L', to: 'tw', label: 'Coast guard “law enforcement” patrols', tags: ['gray'], base: 0.7, cost: { fuel: 0.5 },
    req: s => (s.ctrl.strait === 'blue' ? 'The coalition holds the Strait' : null),
    explain: 'Coast guard ships patrol and board as if Taiwan’s waters were China’s. Gray-zone pressure: it does not climb the ladder.',
    follow: [q('where', 'Where?', [['kinmen', 'Around Kinmen', 'Close to the mainland coast: wears down Taiwan’s public.'], ['penghu', 'Near Penghu', 'Inside Taiwan’s own waters: a bigger bite, and partners notice.']])],
    f: (s, mv) => [chose(mv, 'tw', 'tw_cgexpel') && ['Taiwan’s coast guard shadows and expels', -20], chose(mv, 'us', 'us_cutters') && ['U.S. Coast Guard observers', -10]],
    fx: (s, m, o) => { if (o.where === 'penghu') { T(s, 'tw', -3 * m); T(s, 'tw.support', -2 * m); T(s, 'coal', 2 * m); } else { T(s, 'tw', -1.5 * m); T(s, 'tw.support', -2.5 * m); } T(s, 'cn.support', 1 * m); } },
  { id: 'cn_quarantine', line: 'L', to: 'tw', label: 'Coast guard “inspection” quarantine', tags: ['esc', 'gray'], base: 0.7, rung: 1, cost: { fuel: 1 },
    req: s => (s.rung > 2 ? 'The crisis is already past quarantine' : s.ctrl.strait === 'blue' ? 'The coalition holds the Strait' : null),
    explain: 'Coast guard ships board and turn back cargo bound for Taiwan, short of a declared blockade.',
    follow: [q('scope', 'Which ports?', [['north', 'Northern ports', 'Smaller effect, easier to enforce.'], ['south', 'Southern ports', 'Smaller effect, easier to enforce.'], ['all', 'All ports', 'Big effect, harder to enforce.']]),
      q('rules', 'Boarding rules?', [['inspect', 'Inspect and release', 'Pressure without stopping trade; less shock.'], ['turnback', 'Turn ships back', 'Real pressure; more market shock.']])],
    f: (s, mv, w, o) => [chose(mv, 'us', 'us_escort') && ['U.S. escorts', -15], chose(mv, 'jp', 'jp_escort') && ['Japanese escorts', -10], chose(mv, 'tw', 'tw_cgescort') && ['Taiwan coast guard escorts', -10], chose(mv, 'us', 'us_cutters') && ['U.S. Coast Guard observers', -8], o.scope === 'all' && ['All ports', -15], s.weather && ['Typhoon weather', -10]],
    fx: (s, m, o) => { const k = o.scope === 'all' ? 1.6 : 1, r = o.rules === 'turnback' ? 1.4 : 0.7; T(s, 'tw', -5 * k * r * m); T(s, 'tw.economy', -4 * k * r * m); T(s, 'shock', 4 * k * r * m); T(s, 'cn.support', 3 * m); } },
  { id: 'cn_militia', line: 'L', to: 'tw', label: 'Swarm maritime militia around outlying islands', tags: ['gray'], base: 0.7, rung: 1, cost: { fuel: 1 },
    explain: 'Hundreds of “fishing” boats crowd an outlying island. Deniable pressure.',
    follow: [q('where', 'Where?', [['kinmen', 'Kinmen and Matsu', 'Right off the mainland coast.'], ['pratas', 'Pratas', 'Far out in the South China Sea.']])],
    f: (s, mv) => [chose(mv, 'tw', 'tw_outlying') && ['Taiwan reinforced the outlying islands', -25], chose(mv, 'tw', 'tw_cgexpel') && ['Taiwan’s coast guard shadows and expels', -15]],
    fx: (s, m, o) => { T(s, 'tw', -(o.where === 'pratas' ? 4 : 3) * m); T(s, 'tw.support', -2 * m); T(s, 'coal', 1); } },
  { id: 'cn_senkaku', line: 'L', to: 'jp', label: 'Coast guard patrols in Japanese-claimed waters', tags: ['esc', 'gray'], base: 0.7, cost: { fuel: 1 },
    explain: 'Press Japan in the East China Sea to remind Tokyo of its own exposure.',
    f: (s, mv) => [chose(mv, 'jp', 'jp_jcg') && ['Japan Coast Guard surge', -25]],
    fx: (s, m) => { T(s, 'jp.support', -4 * m); T(s, 'coal', -2 * m); T(s, 'nuke', 1); } },
  // Economic
  { id: 'cn_trade', line: 'E', to: 'tw', label: 'Cut trade with Taiwan', tags: ['esc'], base: 0.75,
    explain: 'Ban imports from Taiwan and pressure its exporters.',
    follow: [q('goods', 'What do you ban?', [['food', 'Food and farm goods', 'Hits Taiwan’s farmers; cheap for China.'], ['parts', 'Industrial parts', 'Hits Taiwan’s factories harder; costs China too.']])],
    fx: (s, m, o) => { const p = o.goods === 'parts'; T(s, 'tw.economy', -(p ? 10 : 6) * m); T(s, 'tw', -3 * m); T(s, 'cn.economy', -(p ? 4 : 1) * m); T(s, 'shock', (p ? 4 : 2) * m); } },
  { id: 'cn_minerals', line: 'E', to: 'jp', label: 'Restrict critical-mineral exports', tags: ['esc'], base: 0.65,
    explain: 'Choke rare-earth and other mineral exports.',
    follow: [q('target', 'Aimed at?', [['jp', 'Japan', 'Sharper pain for Tokyo.'], ['us', 'United States', 'Sharper pain for Washington.'], ['both', 'Both', 'Wider pain, more market shock.']])],
    f: (s, mv) => [chose(mv, 'jp', 'jp_energy') && ['Japan drew on its stockpiles', -10]],
    fx: (s, m, o) => { const j = o.target !== 'us', u = o.target !== 'jp'; if (j) { T(s, 'jp.economy', -8 * m); T(s, 'jp.support', -3 * m); } if (u) T(s, 'us.economy', -5 * m); T(s, 'coal', -(o.target === 'jp' ? 6 : 4) * m); T(s, 'cn.economy', -2 * m); T(s, 'shock', (o.target === 'both' ? 7 : 4) * m); if (m >= 0.5) s.minerals = P.econ.mineralMonths; } },
  // Financial
  { id: 'cn_assets', line: 'F', to: 'tw', label: 'Freeze Taiwanese firms’ mainland assets', tags: ['esc'], base: 0.7, once: true,
    explain: 'Seize or freeze the mainland holdings of Taiwanese companies. Once frozen, they stay frozen.',
    fx: (s, m) => { T(s, 'tw.economy', -7 * m); T(s, 'tw', -3 * m); T(s, 'cn.economy', -2 * m); T(s, 'coal', 2 * m); } },
  { id: 'cn_dollar', line: 'F', to: 'us', label: 'Sell dollar assets and talk up the yuan', tags: [], base: 0.5, opp: true,
    avail: s => s.shock >= 20, oppWhy: s => `the global economic shock is 20 or more (now ${Math.round(s.shock)})`, explain: 'Opportunity: markets are jittery. Shake confidence in Washington’s finances.',
    fx: (s, m) => { T(s, 'us.economy', -4 * m); T(s, 'cn.economy', -4 * m); T(s, 'shock', 5 * m); } },
  // Military
  { id: 'cn_drill', line: 'M', to: 'tw', label: 'Large-scale exercise around Taiwan', tags: ['esc'], base: 0.8, rung: 1, grant: { lift: 2 }, cost: { fuel: 2, ready: 5 },
    explain: 'A rehearsal that doubles as a deployment: +2 Lift this month, but it burns fuel and wears readiness.', ai: (s, w) => (s.types[w] !== 'cautious' ? 2 : 0),
    follow: [q('focus', 'Rehearse what?', [['blockade', 'A blockade', 'Next month’s blockade gets +10.'], ['landing', 'A landing', 'Next month’s landing gets +10.'], ['show', 'A show of force', 'Mostly signaling: more pressure on Taiwan’s public.']])],
    fx: (s, m, o) => { T(s, 'tw.support', -(o.focus === 'show' ? 5 : 2) * m); T(s, 'coal', 3 * m); if (m >= 0.5 && o.focus !== 'show') s.rehearsedNext = o.focus; } },
  { id: 'cn_blockade', line: 'M', to: 'tw', label: 'Declare a blockade of Taiwan', tags: ['esc'], base: 0.6, rung: 2, cost: { fuel: 2, mun: 1 },
    req: s => (!holdsStrait(s) ? 'China must hold the Strait' : s.ctrl.north !== 'red' && s.ctrl.south !== 'red' ? 'China must hold the North or the South too' : null),
    explain: 'Close Taiwan’s ports and approaches. Keeps draining Taiwan every month until it is broken or lifted, and cuts Taiwan’s fuel and munitions resupply.',
    follow: [q('kind', 'What kind?', [['energy', 'Energy only', 'Stop fuel and gas. Less shock, still bites.'], ['full', 'Everything', 'Stop all trade. Maximum pressure and market shock.']])],
    f: (s, mv) => [chose(mv, 'us', 'us_escort') && ['U.S. escorts', -15], chose(mv, 'jp', 'jp_escort') && ['Japanese escorts', -10], s.weather && ['Typhoon weather', -10], s.rehearsed === 'blockade' && ['Rehearsed last month', 10]],
    fx: (s, m, o) => { const full = o.kind !== 'energy'; T(s, 'tw', -(full ? 8 : 5) * m); T(s, 'shock', (full ? 12 : 7) * m); T(s, 'nuke', 3 * m); T(s, 'cn.support', 3 * m); if (m >= 0.5) s.blockade = full ? 1 : 0.7; } },
  { id: 'cn_strike', line: 'M', to: 'tw', label: 'Missile strikes on Taiwan’s military', tags: ['esc'], base: 0.65, rung: 3, unlock: 1, cost: { mun: 3 },
    explain: 'Strike Taiwan’s defenses from across the Strait.',
    follow: [q('focus', 'Main effort?', [['airdef', 'Air defenses', 'Weakens Taiwan’s forces everywhere, most on your landing-emphasis coast.'], ['ports', 'Ports and fuel', 'Deepens a blockade’s bite and burns 2 of Taiwan’s fuel.'], ['command', 'Command and leadership', 'Shakes the government; raises the nuclear shadow more.']])],
    f: (s, mv) => [s.twDispersed && ['Taiwan has dispersed its forces', -20], chose(mv, 'tw', 'tw_decoy') && ['Taiwan’s decoys draw fire', -10], s.c.cn.military < 50 && ['Stocks running down', -10]],
    fx: (s, m, o, c) => { T(s, 'nuke', o.focus === 'command' ? 9 : 5); T(s, 'coal', 6 * m); T(s, 'tw.support', 3 * m);
      if (o.focus === 'ports') { T(s, 'tw.economy', -8 * m); T(s, 'tw', -5 * m); s.res.tw.fuel = Math.max(0, s.res.tw.fuel - 2 * m); }
      else if (o.focus === 'command') { T(s, 'tw.support', -9 * m); T(s, 'tw', -4 * m); }
      else { for (const a of ISLAND) c.hit('tw', a, 0.35 * m); c.hit('tw', s.emph.cn, 0.6 * m); T(s, 'tw', -4 * m); s.shownEmph = s.emph.cn; } } },
  { id: 'cn_hitallies', line: 'M', to: 'us', label: 'Strike U.S. and allied forces', tags: ['esc'], base: 0.55, rung: 4, unlock: 2, cost: { mun: 3, fuel: 1 },
    explain: 'Hit coalition forces in one area before they can intervene. In the North, Japan is hit too if its bases are open or its forces are there.', ai: (s, w) => (s.types[w] === 'resolute' && s.rung >= 3 ? 5 : 0),
    follow: [SEA_Q('Which area?', ['north', 'south', 'east'])],
    f: (s, mv) => [post(mv, 'us') === 'esc' && ['U.S. forces on alert', -10], chose(mv, 'jp', 'jp_missile') && ['Japanese missile defense on alert', -10]],
    fx: (s, m, o, c) => { const a = o.area || 'east'; c.hit('us', a, 2.5 * m); T(s, 'nuke', 12); T(s, 'coal', 10 * m); T(s, 'us.support', 8 * m);
      if (m >= 0.5) { s.struck.us++; if (a === 'north' && (s.basing === 'open' || s.f.jp.north > 0)) { s.struck.jp++; s.jpCombat++; c.hit('jp', 'north', 1.5); T(s, 'jp.support', 4); } } } },
  { id: 'cn_landing', line: 'M', to: 'tw', label: 'Attempt a landing on Taiwan', tags: ['esc'], base: 0.35, rung: 4, unlock: 3,
    cost: o => ({ lift: o.echelon === 'follow' ? 5 : 3, fuel: 2, mun: 2 }),
    req: (s, o, mv) => landingWhy(s, sectorOf(s, mv)),
    explain: 'Put troops ashore on your landing-emphasis coast (set it under Forces). Needs the sea area in front of it and an amphibious formation there. Success cuts deep into Taiwan’s position; failure costs China heavily.', ai: (s, w) => (s.types[w] === 'cautious' ? 0 : 6),
    follow: [q('echelon', 'How much do you commit?', [['amph', 'Amphibious brigades only', 'Lift 3. A smaller force, cheaper to lose.'], ['follow', 'Group armies follow', 'Lift 5. Half the group armies’ strength joins the assault; they share the losses if it fails.']])],
    f: (s, mv, w, o, final) => [...landingFactors(s, sectorOf(s, mv), o.echelon === 'follow', final), s.blockade && ['Blockade has isolated the island', 10], chose(mv, 'us', 'us_strike') && ['U.S. strikes on the invasion force', -12], s.weather && ['Typhoon weather', -15], s.rehearsed === 'landing' && ['Rehearsed last month', 10]],
    fx: (s, m, o, c) => { const sec = s.emph.cn, sea = accessSea(s, sec) || 'strait';
      T(s, 'tw', -SECTOR_VALUE[sec] * m); if (!c.hit('tw', sec, 2 * m)) c.hit('tw', 'res', 1.5 * m);
      c.hit('cn', sea, 1 + 2 * (1 - m), 'amph'); if (o.echelon === 'follow') c.hit('cn', 'rear', 1.5 * (1 - m), 'land');
      if (s.emph.us === sec && usFiresReady(s)) s.res.us.mun = Math.max(0, s.res.us.mun - 1);
      T(s, 'cn.support', -14 * (1 - m)); T(s, 'nuke', 8 * (1 - m) + 4); (s.landings = s.landings || []).push({ turn: s.turn, sector: sec, m }); s.shownEmph = sec; } },
];
