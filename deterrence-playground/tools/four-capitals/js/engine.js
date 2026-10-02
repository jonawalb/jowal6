// Game state and turn resolution. No DOM: the same code runs in the page, the tests and the balance script.
import { P } from '../data/params.js';
import { COUNTRIES, IDS, START } from '../data/countries.js';
import { POSTURES, BY_ID, T, escRoom, isEsc, onMenu, answers, usedUp, MAX_MOVES } from '../data/actions.js';
import { EVENTS } from '../data/events.js';
import { makeRng, STREAM } from './rng.js';
import { initForces, arrive, applyOrders, updateControl, combat, syncMilitary, hit, addStr, shiftReady } from './forces.js';
import { initRes, applyGrants, payMoves, refund, upkeep, regen, noteBinds } from './logistics.js';
import { RES_LABEL } from '../data/formations.js';

export const ORDER = ['cn', 'us', 'jp', 'tw'];          // resolution order within a line
const LINE_ORDER = ['D', 'I', 'N', 'L', 'F', 'E', 'M'];  // diplomacy and signals land before force
const clone = s => JSON.parse(JSON.stringify(s));
export const postureOf = id => POSTURES.find(p => p.id === id);
export const HOLD = { posture: 'hold', actions: [], follow: {}, orders: {} };

export function newGame({ seed, player, weights, difficulty = 'normal' }) {
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
  return a.req ? a.req(s, o || answers(id), mv) : null;
}
export const legalActions = (s, who, list) => list.filter(a => !blockedWhy(s, a.id));
const followOf = (moves, who, id) => answers(id, moves[who]?.follow?.[id]);

/** Odds for one move given everyone's moves this month: { p, factors: [[label, points]] }. `final`: resolving. */
export function oddsFor(s, moves, who, id, final = false) {
  const a = BY_ID[id], o = followOf(moves, who, id);
  const factors = (a.f ? a.f(s, moves, who, o, final) : []).filter(Boolean);
  if (a.line === 'M' && moves[who] && moves[who].posture === 'esc') factors.push(['Your forces on alert (Escalate)', 5]);
  if (a.line === 'M' && s.recon[who]) factors.push(['Surveillance last month', 5]);
  if (s.exposed && who === 'cn' && a.line === 'M') factors.push(['Plans exposed by U.S. intelligence', -5]);
  if (id === 'cn_landing' && s.portsHit) factors.push(['Embarkation ports struck', -15]);
  if (s.last[who]?.actions?.includes(id)) factors.push(['Used last month', -15]);
  const p = Math.max(P.clamp[0], Math.min(P.clamp[1], a.base + factors.reduce((t, f) => t + f[1], 0) / 100));
  return { p, factors };
}

/** Did this country have an opening (for opportunists)? */
export function opening(s, who) {
  if (who === 'cn') return s.coal < 50 || s.c.us.support < 40 || s.shock > 40;
  return s.c.cn.military < 55 || s.c.cn.support < 40;
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
  return d;
}

/** Lift the ladder toward `target`, never more than maxClimb rungs above `from`. Returns { rung, capped }. */
export function climb(from, target) {
  if (target <= from) return { rung: from, capped: false };
  const rung = Math.min(target, from + P.maxClimb);
  return { rung, capped: rung < target };
}

/**
 * Resolve one month. moves = { us: { posture, actions: [ids], follow: { id: { q: opt } }, orders: { moves, stance } }, ... }.
 * opts.expected: no dice, each move applied at its expected value, no fighting (used by the computer to plan).
 */
export function resolveTurn(state, moves, opts = {}) {
  const pre = state, s = clone(state), log = [];
  const rng = makeRng(s.seed, STREAM.dice + s.turn);
  s.escort = 0; s.pressed = false; s.losses = {}; s.short = {}; s.engaged = {}; s.shownEmph = null;
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
      if (!why && !paid[who]?.has(id)) {   // possible only now (e.g. forces just moved in): pay from what is left
        const k = payMoves(s, who, [id], mv.follow || {})[id];
        if (k) { why = `Not enough ${RES_LABEL[k].toLowerCase()}`; used[who][k] = true; }
      } else if (why && paid[who]?.has(id)) refund(s, who, id, o);
      if (why) { log.push({ who, kind: 'action', id, o, status: 'blocked', reason: why, res: short }); continue; }
      const { p, factors } = oddsFor(s, moves, who, id, !opts.expected);
      let m, status, roll = null;
      if (opts.expected) { m = p; status = 'expected'; }
      else {
        roll = rng.u();
        m = roll < p ? 1 : roll < p + P.partialBand ? 0.5 : 0;
        status = m === 1 ? 'success' : m === 0.5 ? 'partial' : 'failure';
      }
      a.fx(s, m, o, ctx);
      if (a.once) s.used[who].push(id);                   // carried out (whatever the roll): it cannot be chosen again
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
  if (s.cables > 0) {                                   // cut undersea cables keep biting until repaired
    T(s, 'tw.economy', -P.cables.economy); T(s, 'tw.support', -P.cables.support); s.cables -= 1;
    log.push({ kind: 'note', text: s.cables > 0 ? 'Taiwan’s undersea cables are still cut.' : 'Taiwan’s undersea cables are repaired.' });
  }
  for (const who of IDS) {
    T(s, `${who}.economy`, -s.shock * P.shockToEconomy[who]);
    if (s.c[who].economy < 40) T(s, `${who}.support`, -3);
  }
  if (s.rung <= 1) T(s, 'shock', -4);
  if (s.rung <= 1 && s.tw > 55) T(s, 'cn.support', -P.impatience);
  if (s.rung <= 1) T(s, 'tw', 2);
  if (s.rung <= 2) T(s, 'nuke', -5);
  if (s.rung >= 4) T(s, 'nuke', 5);
  if (s.rung >= 3 && s.c.cn.military < 45) T(s, 'nuke', 8);
  if (s.rung >= 3) s.nuke = Math.max(s.nuke, 10);
  s.nukePeak = Math.max(s.nukePeak, s.nuke);

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

  s.last = moves;
  s.history.push({ turn: s.turn, event: s.event, moves, log, after: snapshot(s) });
  s.turn += 1;
  if (!['deesc', 'stand'].includes(moves.cn?.posture)) delete succeeded.cn_pause;
  s.over = isOver(s, succeeded);
  if (s.over && s.over.reason === 'settlement') s.settled = true;
  return { state: s, log };
}

export const snapshot = s => ({ rung: s.rung, tw: Math.round(s.tw), coal: Math.round(s.coal), shock: Math.round(s.shock), nuke: Math.round(s.nuke),
  c: Object.fromEntries(IDS.map(id => [id, { support: Math.round(s.c[id].support), economy: Math.round(s.c[id].economy), military: Math.round(s.c[id].military) }])),
  f: JSON.parse(JSON.stringify(s.f)), ctrl: { ...s.ctrl }, res: JSON.parse(JSON.stringify(s.res)),
  units: Object.fromEntries(IDS.map(id => [id, s.units[id].map(u => ({ id: u.id, at: u.at, str: u.str, ready: u.ready }))])) });

export function isOver(s, succeeded = {}) {
  if (s.nuclearUsed) return { reason: 'nuclear', title: 'Nuclear use', text: 'A nuclear weapon was used. The game ends here.' };
  if (s.tw <= 0) return { reason: 'capitulation', title: 'Taiwan forced to terms', text: 'Taiwan’s position collapsed and Taipei accepted Beijing’s terms.' };
  if (succeeded.cn_pause && s.rung <= 2 && s.tw >= 60) return { reason: 'climbdown', title: 'Beijing steps back', text: 'China declared its point made and pulled back, with Taiwan still standing.' };
  if (s.settleRun >= 2) return { reason: 'settlement', title: 'A negotiated settlement', text: 'Two calm months of talks produced a settlement every capital could live with.' };
  if (s.turn >= P.turns) return { reason: 'time', title: 'October 2029', text: 'Eight months on, the crisis is unresolved but the game is over.' };
  return null;
}

// Copy links (v4): seed, seat, difficulty, weights, then the player's moves as base64url JSON. Older links (v2: three
// moves and force points; v3: before fog of war, gray-zone moves and once-a-game moves) cannot be replayed; decode
// marks them { old: true }.
const b64 = str => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(str))) : Buffer.from(str, 'utf8').toString('base64')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = str => { const t = str.replace(/-/g, '+').replace(/_/g, '/'); return typeof atob === 'function' ? decodeURIComponent(escape(atob(t))) : Buffer.from(t, 'base64').toString('utf8'); };
export const LINK_VERSION = 'v4';
export function encode(s) {
  const w = COUNTRIES[s.player].objectives.map(o => s.weights[o.id]).join('');
  const mv = s.history.map(h => { const m = h.moves[s.player]; return [m.posture, m.actions, m.follow || {}, m.orders || {}]; });
  return `${LINK_VERSION}.${s.seed}.${s.player}.${s.difficulty[0]}.${w}${mv.length ? '.' + b64(JSON.stringify(mv)) : ''}`;
}
export function decode(str) {
  const [v, seed, player, d, w, mv] = String(str).split('.');
  if (/^v[123]$/.test(v) && COUNTRIES[player]) return { old: true, version: v };
  if (v !== LINK_VERSION || !COUNTRIES[player] || !/^\d+$/.test(seed)) return null;
  const difficulty = { e: 'easy', n: 'normal', h: 'hard' }[d] || 'normal';
  const weights = Object.fromEntries(COUNTRIES[player].objectives.map((o, i) => [o.id, +((w || '')[i] ?? o.w)]));
  let moves = [];
  try {
    moves = mv ? JSON.parse(unb64(mv)).map(([posture, actions, follow, orders]) => ({ posture, actions: (actions || []).filter(a => BY_ID[a]).slice(0, MAX_MOVES), follow: follow || {}, orders: orders || {} })) : [];
  } catch { moves = []; }
  return { seed: +seed, player, difficulty, weights, moves };
}
