// Game state and turn resolution. No DOM: the same code runs in the page, the tests and the balance script.
import { P } from '../data/params.js';
import { COUNTRIES, IDS, START } from '../data/countries.js';
import { POSTURES, BY_ID, OWNER, T, escRoom, isEsc, onMenu, answers, usedUp, MAX_MOVES } from '../data/actions.js';
import { EVENTS } from '../data/events.js';
import { makeRng, STREAM } from './rng.js';
import { initForces, arrive, applyOrders, updateControl, combat, syncMilitary, hit, addStr, shiftReady } from './forces.js';
import { initRes, applyGrants, payMoves, refund, upkeep, regen, noteBinds } from './logistics.js';
import { RES_LABEL } from '../data/formations.js';
import { opening, politicsBlock, politicsFactors, homeAdjust, selfDefence, politicsMonth, ceasefire } from './politics.js';
import { hostFor, consent, HOST_NAME } from './alliance.js';
import { econMonth } from './economy.js';
import { TALKS, forumTo, forumEstimate, settleForum, angerFrom, angerMonth, breach } from './forum.js';
export { opening };

export const ORDER = ['cn', 'us', 'jp', 'tw'];          // resolution order within a line
const LINE_ORDER = ['D', 'I', 'N', 'L', 'F', 'E', 'M'];  // diplomacy and signals land before force
const clone = s => JSON.parse(JSON.stringify(s));
export const postureOf = id => POSTURES.find(p => p.id === id);
export const HOLD = { posture: 'hold', actions: [], follow: {}, orders: {} };

/** human: true when a person plays `player` (the app); the balance script, tests and benchmark leave it out. */
export function newGame({ seed, player, weights, difficulty = 'normal', human = false }) {
  const r = makeRng(seed, STREAM.setup);
  const types = Object.fromEntries(IDS.map(id => [id, P.types[r.pick(P.types.map(t => COUNTRIES[id].prior[t]))]]));
  const s = {
    seed, player, weights, difficulty, turn: 0, types,
    rung: 0, maxRung: 0, ...START, nukePeak: START.nuke,
    c: Object.fromEntries(IDS.map(id => [id, { ...COUNTRIES[id].start }])),
    basing: 'peacetime', blockade: 0, escort: 0, weather: false,
    struck: { us: 0, jp: 0, mainland: 0 }, jpCombat: 0, usCombat: false,
    nuclearUsed: false, settleRun: 0, settled: false, pressed: false, exposed: false, usCommitted: false,
    sharp: {}, recon: {}, blind: {}, deceive: {}, rehearsed: null, portsHit: false, landings: [], cables: 0,
    used: Object.fromEntries(IDS.map(id => [id, []])),
    // Batch B: who is human (U.S. reinforcement delay), politics, the economy, anger and the peace forum.
    human: human ? player : null, usWar: 0, jpDeclared: false, jpCabinet: null, twLeg: null, sanctions: 0, minerals: 0,
    anger: Object.fromEntries(IDS.map(v => [v, Object.fromEntries(IDS.filter(w => w !== v).map(w => [w, 0]))])),
    forumOpen: {}, cease: null,
    last: {}, event: null, history: [], over: null,
  };
  initRes(s);
  initForces(s);
  syncMilitary(s);
  return s;
}

/** Draw and apply this month's world event (call once at the start of each turn). */
export function brief(state) {
  const s = clone(state);
  s.weather = false;
  const pool = EVENTS.filter(e => e.when(s));
  const e = pool[makeRng(s.seed, STREAM.event + s.turn).pick(pool.map(x => x.w || 1))];
  e.apply(s);
  s.event = { id: e.id, title: e.title, text: e.text };
  return s;
}

export const USED = 'Already used: once a game';
/** Is a move allowed now? null if yes, else the reason. `mv`: everyone's moves this month, when known. */
export function blockedWhy(s, id, o, mv) {
  const a = BY_ID[id];
  if (!onMenu(s, a)) return a.unlock != null && s.rung < a.unlock ? `Unlocks at ${P.ladder[a.unlock]}` : 'Not available this month';
  if (usedUp(s, id)) return USED;
  const why = a.req ? a.req(s, o || answers(id), mv) : null;
  return why || politicsBlock(s, OWNER[id], id, o || answers(id));
}
export const legalActions = (s, who, list) => list.filter(a => !blockedWhy(s, a.id));
const followOf = (moves, who, id) => answers(id, moves[who]?.follow?.[id]);

/** Odds for one move given everyone's moves this month: { p, factors: [[label, points]] }. `final`: resolving.
 * A peace-forum call's odds are the caller's estimate that the rival accepts (`B`: the caller's beliefs, if known). */
export function oddsFor(s, moves, who, id, final = false, B) {
  const a = BY_ID[id], o = followOf(moves, who, id);
  if (a.forum) { const f = forumEstimate(s, who, forumTo(who, o), B); return { p: f.p, factors: [], forum: f }; }
  const factors = [...(a.f ? a.f(s, moves, who, o, final) : []), ...politicsFactors(s, who, id, o)].filter(Boolean);
  if (a.line === 'M' && moves[who] && moves[who].posture === 'esc') factors.push(['Your forces on alert (Escalate)', 5]);
  if (a.line === 'M' && s.recon[who]) factors.push(['Surveillance last month', 5]);
  if (s.exposed && who === 'cn' && a.line === 'M') factors.push(['Plans exposed by U.S. intelligence', -5]);
  if (id === 'cn_landing' && s.portsHit) factors.push(['Embarkation ports struck', -15]);
  if (s.last[who]?.actions?.includes(id)) factors.push(['Used last month', -15]);
  const p = Math.max(P.clamp[0], Math.min(P.clamp[1], a.base + factors.reduce((t, f) => t + f[1], 0) / 100));
  return { p, factors };
}

function homeCost(s, who, move) {
  let type = s.types[who];
  if (type === 'opportunist' && opening(s, who)) type = 'resolute';
  const pc = P.postureCost[type], ac = P.actionCost[type];
  let d = 0;
  const prev = s.last[who];
  if (move.posture === 'esc') d += pc.esc;
  if (move.posture === 'nuke') d += pc.nuke;
  if ((move.posture === 'stand' || move.posture === 'deesc') && (s.rung >= 1 || (prev && (prev.posture === 'esc' || prev.posture === 'nuke'))))
    d += pc.back * (move.posture === 'stand' ? 1.5 : 1) * (who === 'us' && s.usCommitted ? 1.5 : 1);
  for (const id of move.actions) {
    if (BY_ID[id].tags.includes('esc')) d += ac.esc;
    if (BY_ID[id].tags.includes('soft')) d += ac.soft;
  }
  return homeAdjust(s, who, move, d);   // an election month, a ceasefire (js/politics.js)
}

/** Lift the ladder toward `target`, never more than maxClimb rungs above `from`. Returns { rung, capped }. */
export function climb(from, target) {
  if (target <= from) return { rung: from, capped: false };
  const rung = Math.min(target, from + P.maxClimb);
  return { rung, capped: rung < target };
}

/**
 * Resolve one month. moves = { us: { posture, actions: [ids], follow: { id: { q: opt } }, orders: { moves, stance } }, ... }.
 * opts.expected: no dice, each move applied at its expected value, no fighting (used by the computer to plan; then
 * opts.planner and opts.plannerB, its beliefs, give its estimate for its own peace-forum call). opts.beliefs:
 * everyone's beliefs, which a computer capital uses when it decides on a forum addressed to it.
 */
export function resolveTurn(state, moves, opts = {}) {
  const pre = state, s = clone(state), log = [];
  const rng = makeRng(s.seed, STREAM.dice + s.turn);
  s.escort = 0; s.pressed = false; s.losses = {}; s.short = {}; s.engaged = {}; s.shownEmph = null; s.hurt = {}; s.forumDrop = false;
  s.sharpNext = {}; s.reconNext = {}; s.blindNext = {}; s.deceiveNext = {}; s.rehearsedNext = null; s.portsHitNext = false;
  s.used = s.used || Object.fromEntries(IDS.map(id => [id, []]));
  const ctx = { hit: (w, a, n, type) => hit(s, w, a, n, type), add: (w, a, n) => addStr(s, w, a, n), ready: (w, d) => shiftReady(s, w, d) };

  // Postures and their cost at home.
  for (const who of ORDER) {
    const mv = moves[who] || HOLD;
    const po = postureOf(mv.posture);
    if (po && ((po.only && !po.only.includes(who)) || (po.minRung && pre.rung < po.minRung))) mv.posture = 'hold';
    const d = homeCost(pre, who, mv);
    if (d) T(s, `${who}.support`, d);
    if (mv.posture === 'nuke') T(s, 'nuke', 8);
    if (mv.posture === 'esc') T(s, 'nuke', 1);
    log.push({ who, kind: 'posture', posture: mv.posture, support: d });
  }

  // A posture caps escalatory moves (extras, in the order chosen, are not carried out); at most MAX_MOVES count.
  const dropped = {};
  for (const who of ORDER) {
    const mv = moves[who]; if (!mv) continue;
    let room = escRoom(mv.posture);
    mv.actions.forEach((id, i) => { if (i >= MAX_MOVES) dropped[who + id] = 'limit'; else if (isEsc(id)) { if (room > 0) room--; else dropped[who + id] = 'posture'; } });
  }

  // Resources and forces: last month's U.S. arrivals; then each capital's grants, the cost of its moves (in the
  // order chosen) and its force orders, paid from what is left.
  arrive(s, log);
  const refused = {}, used = {}, paid = {};
  for (const who of ORDER) {
    const mv = moves[who] || HOLD;
    const picked = mv.actions.filter(id => !dropped[who + id] && !blockedWhy(pre, id, followOf(moves, who, id), moves));
    applyGrants(s, who, picked);
    refused[who] = payMoves(s, who, picked, mv.follow || {});
    paid[who] = new Set(picked.filter(id => !refused[who][id]));
    used[who] = {};
    for (const k of Object.values(refused[who])) used[who][k] = true;
    const r = applyOrders(s, who, mv.orders, { fast: picked.includes('us_surge') && !refused[who].us_surge });
    for (const l of r.log) { log.push(l); if (l.res) used[who][l.res] = true; }
  }
  updateControl(s);

  // Moves, line by line.
  let target = s.rung;
  const succeeded = {};
  for (const line of LINE_ORDER) for (const who of ORDER) {
    const mv = moves[who];
    if (!mv) continue;
    for (const id of mv.actions) {
      const a = BY_ID[id];
      if (a.line !== line) continue;
      const o = followOf(moves, who, id);
      const dr = dropped[who + id], short = refused[who]?.[id];
      let why = dr === 'limit' ? `Only ${MAX_MOVES} moves a month` : dr ? `Not allowed while you ${mv.posture === 'stand' ? 'stand down' : 'de-escalate'}` : !onMenu(pre, a) ? 'Not available this month'
        : short ? `Not enough ${RES_LABEL[short].toLowerCase()}` : null;
      if (!why && usedUp(s, id)) why = USED;            // a once-a-game move chosen twice
      if (!why && a.req) why = a.req(s, o, moves);
      if (!why) why = politicsBlock(s, who, id, o);       // Taiwan's legislature, Congress, Japan's declaration
      // Basing consent, asked each use (js/alliance.js): a refusal blocks the move and refunds it.
      const host = who === 'us' && !why ? hostFor(id, o) : null, pc = host ? consent(s, host).p : 1;
      if (host && !opts.expected && makeRng(s.seed, STREAM.consent + s.turn, LINE_ORDER.indexOf(line) * 10 + mv.actions.indexOf(id)).u() >= pc)
        why = `${HOST_NAME[host]} refused the use of its bases this time (consent ${Math.round(pc * 100)}%)`;
      if (!why && !paid[who]?.has(id)) {   // possible only now (e.g. forces just moved in): pay from what is left
        const k = payMoves(s, who, [id], mv.follow || {})[id];
        if (k) { why = `Not enough ${RES_LABEL[k].toLowerCase()}`; used[who][k] = true; }
      } else if (why && paid[who]?.has(id)) refund(s, who, id, o);
      if (why) { log.push({ who, kind: 'action', id, o, status: 'blocked', reason: why, res: short, ...(host ? { host } : {}) }); continue; }
      if (a.forum) {                                       // the peace forum: the rival accepts or declines (js/forum.js)
        log.push(settleForum(s, who, id, o, moves, opts, makeRng(s.seed, STREAM.forum + s.turn, IDS.indexOf(who))));
        if (a.once) s.used[who].push(id);
        continue;
      }
      const { p, factors } = oddsFor(s, moves, who, id, !opts.expected);
      let m, status, roll = null;
      if (opts.expected) { m = p * pc; status = 'expected'; }
      else {
        roll = rng.u();
        m = roll < p ? 1 : roll < p + P.partialBand ? 0.5 : 0;
        status = m === 1 ? 'success' : m === 0.5 ? 'partial' : 'failure';
      }
      a.fx(s, m, o, ctx);
      if (a.once && (a.once !== 'success' || m >= 0.5)) s.used[who].push(id);   // carried out (whatever the roll; a declaration once made)
      angerFrom(s, who, id, m);
      if (!opts.expected && m === 1 && TALKS[who] === id) s.forumOpen[who] = s.turn + 1;   // next month: the forum call
      if (ceasefire(s) && a.tags.includes('esc') && (a.line === 'M' || a.line === 'L') && m > 0) breach(s, who, m, log);
      const reach = opts.expected ? p >= 0.5 : m >= 0.5;
      if (reach) { succeeded[id] = true; if (a.rung != null) target = Math.max(target, a.rung); }
      log.push({ who, kind: 'action', id, o, status, p, roll, factors });
    }
  }

  // The ladder: climbs with successful escalatory moves, capped; eases when everyone is calm.
  const from = s.rung;
  const c = climb(from, target);
  s.rung = c.rung;
  if (c.capped) log.push({ kind: 'note', text: `The crisis would have jumped to ${P.ladder[target]}; it can climb at most ${P.maxClimb} rungs a month, so it stops at ${P.ladder[c.rung]}.` });
  const calm = ORDER.every(w => ['stand', 'deesc', 'hold'].includes(moves[w]?.posture || 'hold'));
  const easing = ORDER.filter(w => ['stand', 'deesc'].includes(moves[w]?.posture)).length;
  if (target <= from && calm && easing >= 2 && s.rung > 0) { s.rung -= 1; log.push({ kind: 'note', text: `With most capitals stepping back, the crisis eases to ${P.ladder[s.rung]}.` }); }
  s.maxRung = Math.max(s.maxRung, s.rung);
  if (s.forumDrop && s.rung > 0) { s.rung -= 1; log.push({ kind: 'note', forum: true, text: `The peace forum was accepted: the crisis steps down to ${P.ladder[s.rung]}, and a ceasefire holds next month.` }); }
  selfDefence(s, log);                                   // Japan without a survival declaration holds to Defend

  // Fighting at sea, then who holds what.
  if (!opts.expected) combat(s, makeRng(s.seed, STREAM.dice + 70 + s.turn), log);
  upkeep(s, log);
  updateControl(s);
  if (s.blockade && (s.rung < 2 || s.ctrl.strait !== 'red')) { s.blockade = 0; log.push({ kind: 'note', text: 'China no longer holds the Strait: the blockade lapses.' }); }
  const lost = Object.values(s.losses).reduce((a, b) => a + b, 0);
  if (lost > P.nukeLoss) T(s, 'nuke', 2 * (lost - P.nukeLoss));
  if (lost > P.majorWarLosses && s.rung === 3) { s.rung = 4; s.maxRung = Math.max(s.maxRung, 4); log.push({ kind: 'note', text: `Heavy fighting (${lost.toFixed(1)} force points lost this month): the crisis is now a major war.` }); }
  syncMilitary(s);

  // Monthly drift.
  if (s.blockade) {
    const left = Math.max(0, 1 - s.escort) * s.blockade;
    T(s, 'tw', -P.blockadeDrain.tw * left); T(s, 'tw.economy', -P.blockadeDrain.twEconomy * left); T(s, 'coal', P.blockadeDrain.coal);
    if (s.escort >= 1) { s.blockade = 0; log.push({ kind: 'note', text: 'Convoys broke the blockade this month.' }); }
  }
  econMonth(s, log);                                    // the shock meter: drivers, economies, home support (js/economy.js)
  if (s.cables > 0) {                                   // cut undersea cables keep biting until repaired
    T(s, 'tw.economy', -P.cables.economy); T(s, 'tw.support', -P.cables.support); s.cables -= 1;
    log.push({ kind: 'note', text: s.cables > 0 ? 'Taiwan’s undersea cables are still cut.' : 'Taiwan’s undersea cables are repaired.' });
  }
  if (s.rung <= 1) T(s, 'shock', -4);
  if (s.rung <= 1 && s.tw > 55) T(s, 'cn.support', -P.impatience);
  if (s.rung <= 1) T(s, 'tw', 2);
  if (s.rung <= 2) T(s, 'nuke', -5);
  if (s.rung >= 4) T(s, 'nuke', 5);
  if (s.rung >= 3 && s.c.cn.military < 45) T(s, 'nuke', 8);
  if (s.rung >= 3) s.nuke = Math.max(s.nuke, 10);
  s.nukePeak = Math.max(s.nukePeak, s.nuke);
  politicsMonth(s, log);                                 // the War Powers clock, election results
  angerMonth(s);                                         // anger from this month's fighting, then decay

  // Which resources held each capital back this month; then next month's Lift, fuel and munitions.
  for (const who of ORDER) noteBinds(s, who, { ...(moves[who]?.limits || {}), ...(used[who] || {}) });
  regen(s);

  // Nuclear use: a risk, never a choice. Only once the war is shooting.
  if (s.rung >= 3 && s.nuke > P.nuclear.threshold) {
    const pn = P.nuclear.scale * (s.rung === 3 ? P.nuclear.limitedWar : 1) * Math.pow((s.nuke - P.nuclear.threshold) / (100 - P.nuclear.threshold), 1.5);
    if (!opts.expected && makeRng(s.seed, STREAM.dice + 50 + s.turn).u() < pn) {
      s.nuclearUsed = true; s.rung = 5; s.maxRung = 5; s.nukePeak = 100;
      log.push({ kind: 'note', text: 'A nuclear weapon is used. Whatever else happens, the crisis has crossed the line every capital said it feared most.' });
    }
    log.push({ kind: 'nukerisk', p: pn });
  }

  // Settlement: two months in a row with nobody escalating, someone stepping back, and Beijing plus Washington or Taipei talking.
  const talksOK = succeeded.cn_talks && (succeeded.us_talks || succeeded.tw_talks);
  const allCalm = ORDER.every(w => ['stand', 'deesc', 'hold'].includes(moves[w]?.posture || 'hold')) && ORDER.some(w => ['stand', 'deesc'].includes(moves[w]?.posture));
  s.settleRun = talksOK && allCalm ? s.settleRun + 1 : 0;

  // What carries into next month.
  // Sight next month (js/fog.js): surveillance that paid off, sources burned by a public release, deception.
  s.sharp = Object.fromEntries(IDS.map(w => [w, !!s.sharpNext[w] && !s.blindNext[w]]));
  s.blind = { ...s.blindNext }; s.deceive = { ...s.deceiveNext };
  s.recon = { ...s.reconNext }; s.rehearsed = s.rehearsedNext; s.portsHit = s.portsHitNext;
  delete s.sharpNext; delete s.reconNext; delete s.blindNext; delete s.deceiveNext; delete s.rehearsedNext; delete s.portsHitNext;

  // The ceasefire month after an accepted forum: if nobody broke it or took an escalatory posture, a settlement.
  let held = false;
  if (s.cease && s.cease.turn === s.turn) {
    held = !s.cease.broken && ORDER.every(w => !['esc', 'nuke'].includes(moves[w]?.posture));
    if (!held && !s.cease.broken) log.push({ kind: 'note', forum: true, text: 'The ceasefire lapsed without a settlement: a capital took an escalatory posture.' });
  }

  s.last = moves;
  s.history.push({ turn: s.turn, event: s.event, moves, log, after: snapshot(s) });
  s.turn += 1;
  if (!['deesc', 'stand'].includes(moves.cn?.posture)) delete succeeded.cn_pause;
  s.over = isOver(s, succeeded, held);
  if (s.over && s.over.reason === 'settlement') s.settled = true;
  return { state: s, log };
}

export const snapshot = s => ({ rung: s.rung, tw: Math.round(s.tw), coal: Math.round(s.coal), shock: Math.round(s.shock), nuke: Math.round(s.nuke),
  c: Object.fromEntries(IDS.map(id => [id, { support: Math.round(s.c[id].support), economy: Math.round(s.c[id].economy), military: Math.round(s.c[id].military) }])),
  f: JSON.parse(JSON.stringify(s.f)), ctrl: { ...s.ctrl }, res: JSON.parse(JSON.stringify(s.res)),
  units: Object.fromEntries(IDS.map(id => [id, s.units[id].map(u => ({ id: u.id, at: u.at, str: u.str, ready: u.ready }))])) });

export function isOver(s, succeeded = {}, forumHeld = false) {
  if (s.nuclearUsed) return { reason: 'nuclear', title: 'Nuclear use', text: 'A nuclear weapon was used. The game ends here.' };
  if (s.tw <= 0) return { reason: 'capitulation', title: 'Taiwan forced to terms', text: 'Taiwan’s position collapsed and Taipei accepted Beijing’s terms.' };
  if (forumHeld) return { reason: 'settlement', forum: true, title: 'A negotiated settlement', text: 'The peace forum’s ceasefire held, and the forum produced a settlement every capital could live with.' };
  if (succeeded.cn_pause && s.rung <= 2 && s.tw >= 60) return { reason: 'climbdown', title: 'Beijing steps back', text: 'China declared its point made and pulled back, with Taiwan still standing.' };
  if (s.settleRun >= 2) return { reason: 'settlement', title: 'A negotiated settlement', text: 'Two calm months of talks produced a settlement every capital could live with.' };
  if (s.turn >= P.turns) return { reason: 'time', title: 'October 2029', text: 'Eight months on, the crisis is unresolved but the game is over.' };
  return null;
}

// Copy links (v5): seed, seat, difficulty, weights, then the player's moves (posture, moves, follow-ups, force orders
// and any replies to peace forums) as base64url JSON. Older links (v2: three moves and force points; v3: before fog
// of war, gray-zone and once-a-game moves; v4: before politics, alliance consent, the shock meter, the U.S.
// reinforcement delay and the peace forum) cannot be replayed; decode marks them { old: true }.
const b64 = str => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(str))) : Buffer.from(str, 'utf8').toString('base64')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = str => { const t = str.replace(/-/g, '+').replace(/_/g, '/'); return typeof atob === 'function' ? decodeURIComponent(escape(atob(t))) : Buffer.from(t, 'base64').toString('utf8'); };
export const LINK_VERSION = 'v5';
export function encode(s) {
  const w = COUNTRIES[s.player].objectives.map(o => s.weights[o.id]).join('');
  const mv = s.history.map(h => { const m = h.moves[s.player]; return [m.posture, m.actions, m.follow || {}, m.orders || {}, ...(m.reply ? [m.reply] : [])]; });
  return `${LINK_VERSION}.${s.seed}.${s.player}.${s.difficulty[0]}.${w}${mv.length ? '.' + b64(JSON.stringify(mv)) : ''}`;
}
export function decode(str) {
  const [v, seed, player, d, w, mv] = String(str).split('.');
  if (/^v[1-4]$/.test(v) && COUNTRIES[player]) return { old: true, version: v };
  if (v !== LINK_VERSION || !COUNTRIES[player] || !/^\d+$/.test(seed)) return null;
  const difficulty = { e: 'easy', n: 'normal', h: 'hard' }[d] || 'normal';
  const weights = Object.fromEntries(COUNTRIES[player].objectives.map((o, i) => [o.id, +((w || '')[i] ?? o.w)]));
  let moves = [];
  try {
    moves = mv ? JSON.parse(unb64(mv)).map(([posture, actions, follow, orders, reply]) => ({ posture, actions: (actions || []).filter(a => BY_ID[a]).slice(0, MAX_MOVES), follow: follow || {}, orders: orders || {}, ...(reply ? { reply } : {}) })) : [];
  } catch { moves = []; }
  return { seed: +seed, player, difficulty, weights, moves };
}
