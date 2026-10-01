// Game state and turn resolution. No DOM: the same code runs in the page, the tests and the balance script.
import { P } from '../data/params.js';
import { COUNTRIES, IDS, START } from '../data/countries.js';
import { POSTURES, BY_ID, T, escRoom, isEsc } from '../data/actions.js';
import { EVENTS } from '../data/events.js';
import { makeRng, STREAM } from './rng.js';

export const ORDER = ['cn', 'us', 'jp', 'tw'];      // resolution order within a line
const LINE_ORDER = ['D', 'I', 'E', 'M'];            // diplomacy and signals land before force
const clone = s => JSON.parse(JSON.stringify(s));
export const postureOf = id => POSTURES.find(p => p.id === id);

export function newGame({ seed, player, weights, difficulty = 'normal' }) {
  const r = makeRng(seed, STREAM.setup);
  const types = Object.fromEntries(IDS.map(id => [id, P.types[r.pick(P.types.map(t => COUNTRIES[id].prior[t]))]]));
  return {
    seed, player, weights, difficulty, turn: 0, types,
    rung: 0, maxRung: 0, ...START, nukePeak: START.nuke,
    c: Object.fromEntries(IDS.map(id => [id, { ...COUNTRIES[id].start }])),
    basing: 'peacetime', blockade: false, escort: 0, weather: false,
    struck: { us: 0, jp: 0, mainland: 0 }, jpCombat: 0, usCombat: false,
    nuclearUsed: false, settleRun: 0, settled: false, cnPause: false, pressed: false, exposed: false, usCommitted: false, drilled: false, jpEvac: false,
    last: {}, event: null, history: [], over: null,
  };
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

/** Is an action allowed now? null if yes, else the reason. */
export const blockedWhy = (s, id) => (BY_ID[id].req ? BY_ID[id].req(s) : null);
export const legalActions = (s, who, list) => list.filter(a => !blockedWhy(s, a.id));

/** Odds for one action given everyone's moves this turn: { p, factors: [[label, points]] }. */
export function oddsFor(s, moves, who, id) {
  const a = BY_ID[id];
  const factors = (a.f ? a.f(s, moves, who) : []).filter(Boolean);
  if (a.line === 'M' && moves[who] && moves[who].posture === 'esc') factors.push(['Your forces on alert (Escalate)', 5]);
  if (s.exposed && who === 'cn' && a.line === 'M') factors.push(['Plans exposed by U.S. intelligence', -5]);
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
 * Resolve one month. moves = { us: { posture, actions: [ids] }, ... }.
 * opts.expected: no dice, each action applied at its expected value (used by the computer to plan).
 */
export function resolveTurn(state, moves, opts = {}) {
  const pre = state, s = clone(state), log = [];
  const rng = makeRng(s.seed, STREAM.dice + s.turn);
  s.escort = 0; s.cnPause = false; s.pressed = false;

  for (const who of ORDER) {
    const mv = moves[who] || { posture: 'hold', actions: [] };
    const po = postureOf(mv.posture);
    if (po && ((po.only && !po.only.includes(who)) || (po.minRung && pre.rung < po.minRung))) mv.posture = 'hold';
    const d = homeCost(pre, who, mv);
    if (d) T(s, `${who}.support`, d);
    if (mv.posture === 'nuke') T(s, 'nuke', 8);
    if (mv.posture === 'esc') T(s, 'nuke', 1);
    log.push({ who, kind: 'posture', posture: mv.posture, support: d });
  }

  // A posture limits escalatory moves: extra ones (in the order chosen) are not carried out.
  const dropped = {};
  for (const who of ORDER) {
    const mv = moves[who]; if (!mv) continue;
    let room = escRoom(mv.posture);
    for (const id of mv.actions) if (isEsc(id)) { if (room > 0) room--; else dropped[who + id] = true; }
  }
  let target = s.rung;
  const succeeded = {};
  for (const line of LINE_ORDER) for (const who of ORDER) {
    const mv = moves[who];
    if (!mv) continue;
    for (const id of mv.actions) {
      const a = BY_ID[id];
      if (a.line !== line) continue;
      const why = dropped[who + id] ? `Not allowed while you ${mv.posture === 'stand' ? 'stand down' : 'de-escalate'}` : a.req ? a.req(s) : null;
      if (why) { log.push({ who, kind: 'action', id, status: 'blocked', reason: why }); continue; }
      const { p, factors } = oddsFor(pre, moves, who, id);
      let m, status, roll = null;
      if (opts.expected) { m = p; status = 'expected'; }
      else {
        roll = rng.u();
        m = roll < p ? 1 : roll < p + P.partialBand ? 0.5 : 0;
        status = m === 1 ? 'success' : m === 0.5 ? 'partial' : 'failure';
      }
      a.fx(s, m);
      if (m >= 0.5) { succeeded[id] = true; if (a.rung != null) target = Math.max(target, a.rung); }
      log.push({ who, kind: 'action', id, status, p, roll, factors });
    }
  }
  if (opts.expected) for (const who of ORDER) for (const id of (moves[who]?.actions || [])) {
    const a = BY_ID[id];
    if (a.rung != null && !blockedWhy(pre, id) && oddsFor(pre, moves, who, id).p >= 0.5) target = Math.max(target, a.rung);
  }

  // The ladder: climbs with successful escalatory actions, capped; eases when everyone is calm.
  const from = s.rung;
  const c = climb(from, target);
  s.rung = c.rung;
  if (c.capped) log.push({ kind: 'note', text: `The crisis would have jumped to ${P.ladder[target]}; it can climb at most ${P.maxClimb} rungs a month, so it stops at ${P.ladder[c.rung]}.` });
  const calm = ORDER.every(w => ['stand', 'deesc', 'hold'].includes(moves[w]?.posture || 'hold'));
  const easing = ORDER.filter(w => ['stand', 'deesc'].includes(moves[w]?.posture)).length;
  if (target <= from && calm && easing >= 2 && s.rung > 0) { s.rung -= 1; log.push({ kind: 'note', text: `With most capitals stepping back, the crisis eases to ${P.ladder[s.rung]}.` }); }
  if (s.rung < 2) s.blockade = false;
  s.maxRung = Math.max(s.maxRung, s.rung);

  // Monthly drift.
  if (s.blockade) {
    const left = Math.max(0, 1 - s.escort);
    T(s, 'tw', -P.blockadeDrain.tw * left); T(s, 'tw.economy', -P.blockadeDrain.twEconomy * left); T(s, 'coal', P.blockadeDrain.coal);
    if (s.escort >= 1) { s.blockade = false; log.push({ kind: 'note', text: 'Convoys broke the blockade this month.' }); }
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

  // Nuclear use: a risk, never a choice. Only once the war is shooting.
  if (s.rung >= 3 && s.nuke > P.nuclear.threshold) {
    const pn = P.nuclear.scale * (s.rung === 3 ? P.nuclear.limitedWar : 1) * Math.pow((s.nuke - P.nuclear.threshold) / (100 - P.nuclear.threshold), 1.5);
    if (opts.expected ? false : makeRng(s.seed, STREAM.dice + 50 + s.turn).u() < pn) {
      s.nuclearUsed = true; s.rung = 5; s.maxRung = 5; s.nukePeak = 100;
      log.push({ kind: 'note', text: 'A nuclear weapon is used. Whatever else happens, the crisis has crossed the line every capital said it feared most.' });
    }
    log.push({ kind: 'nukerisk', p: pn });
  }

  // Settlement: two months in a row with nobody escalating, someone stepping back, and Beijing plus Washington or Taipei talking.
  const talksOK = succeeded.cn_talks && (succeeded.us_talks || succeeded.tw_talks);
  const allCalm = ORDER.every(w => ['stand', 'deesc', 'hold'].includes(moves[w]?.posture || 'hold')) && ORDER.some(w => ['stand', 'deesc'].includes(moves[w]?.posture));
  s.settleRun = talksOK && allCalm ? s.settleRun + 1 : 0;

  s.last = moves;
  s.history.push({ turn: s.turn, event: s.event, moves, log, after: snapshot(s) });
  s.turn += 1;
  s.over = isOver(s, succeeded);
  if (s.over && s.over.reason === 'settlement') s.settled = true;
  return { state: s, log };
}

export const snapshot = s => ({ rung: s.rung, tw: Math.round(s.tw), coal: Math.round(s.coal), shock: Math.round(s.shock), nuke: Math.round(s.nuke),
  c: Object.fromEntries(IDS.map(id => [id, { support: Math.round(s.c[id].support), economy: Math.round(s.c[id].economy), military: Math.round(s.c[id].military) }])) });

export function isOver(s, succeeded = {}) {
  if (s.nuclearUsed) return { reason: 'nuclear', title: 'Nuclear use', text: 'A nuclear weapon was used. The game ends here.' };
  if (s.tw <= 0) return { reason: 'capitulation', title: 'Taiwan forced to terms', text: 'Taiwan’s position collapsed and Taipei accepted Beijing’s terms.' };
  if (succeeded.cn_pause && s.rung <= 2 && s.tw >= 60) return { reason: 'climbdown', title: 'Beijing steps back', text: 'China declared its point made and pulled back, with Taiwan still standing.' };
  if (s.settleRun >= 2) return { reason: 'settlement', title: 'A negotiated settlement', text: 'Two calm months of talks produced a settlement every capital could live with.' };
  if (s.turn >= P.turns) return { reason: 'time', title: 'October 2029', text: 'Eight months on, the crisis is unresolved but the game is over.' };
  return null;
}

// Copy-link encoding: seed, seat, difficulty, weights and the player's own moves. The rest replays.
export function encode(s) {
  const w = COUNTRIES[s.player].objectives.map(o => s.weights[o.id]).join('');
  const mv = s.history.map(h => { const m = h.moves[s.player]; return [m.posture, ...m.actions].join('.'); }).join('~');
  return `${s.seed}-${s.player}-${s.difficulty[0]}-${w}${mv ? '-' + mv : ''}`;
}
export function decode(str) {
  const [seed, player, d, w, mv] = String(str).split('-');
  if (!COUNTRIES[player] || !/^\d+$/.test(seed)) return null;
  const difficulty = { e: 'easy', n: 'normal', h: 'hard' }[d] || 'normal';
  const weights = Object.fromEntries(COUNTRIES[player].objectives.map((o, i) => [o.id, +((w || '')[i] ?? o.w)]));
  const moves = mv ? mv.split('~').map(x => { const [posture, ...actions] = x.split('.'); return { posture, actions: actions.filter(a => BY_ID[a]) }; }) : [];
  return { seed: +seed, player, difficulty, weights, moves };
}
