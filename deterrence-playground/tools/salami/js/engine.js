// Salami engine: pure state transitions, no DOM. One call to resolveTurn is one month.
// Moves: c = { method, msg, push }  (Coastal State);  p = { level, msg, hold, detain }  (Coast Guard Power).
import { P, LEVELS, METHODS, C_MSGS, P_MSGS, R_VALUES, R_PRIOR, T_VALUES, T_PRIOR, RESPONSES, ROUGH, CLOUD, STATEMENT, STATEMENTS } from '../data/params.js';
import { makeRng, STREAM } from './rng.js';
import { patronProbs, statementCat, statementLik, spikeProb, updateR, updateT } from './belief.js';

export const M = Object.fromEntries(METHODS.map(m => [m.id, m]));
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const clone = o => JSON.parse(JSON.stringify(o));

export function newGame({ seed, side }) {
  const r = makeRng(seed, STREAM.setup);
  const R = R_VALUES[r.pick(R_PRIOR)], T = T_VALUES[r.pick(T_PRIOR)];
  return {
    seed, side, turn: 0, R, T, ...P.start, lastLevel: 0, patronLeft: P.patronUses, onScene: 0,
    intervened: false, lawFiled: false, bR: R_PRIOR.slice(), bT: T_PRIOR.slice(),
    peakEsc: 0, minSupplies: P.start.supplies, cur: null, history: [], over: null,
  };
}

/** Draw this month's weather and the Patron's public statement; the statement updates the belief about R. */
export function brief(s0) {
  if (s0.over || (s0.cur && s0.cur.turn === s0.turn)) return s0;
  const s = clone(s0);
  const r = makeRng(s.seed, STREAM.event + s.turn);
  const rough = r.u() < ROUGH[s.turn], cloud = r.u() < CLOUD;
  const cat = statementCat(s.R + r.normal() * STATEMENT.sd);
  s.bR = updateR(s.bR, R => statementLik(cat, R));
  s.cur = { turn: s.turn, rough, cloud, statement: cat, text: STATEMENTS[cat] };
  return s;
}

/** The Power's threshold drops one rung when its home pressure is high (public). */
export const tAdj = s => (s.domP >= P.domP.touchy ? 1 : 0);
/** Does this level meet this mission? Levels 1–4 need a boat to stop; the cordon is always in force. */
export const encounters = (level, method) => (level === 5 ? true : level >= 1 && M[method].sea);
/** Effective level the Patron sees before any random injuries or detentions. */
export function baseE(s, level, method) {
  const enc = encounters(level, method);
  let E = level === 5 ? 5 : enc ? level : 0;
  if (E > 0 && method === 'patron') E++;
  if (E > 0 && s.sympathy >= P.sym.line) E++;
  if (E > 1 && provokedLast(s)) E--;
  return E;
}
/** The Patron will not underwrite provocation: last month's Coastal provocation at or above the bar moves its line out a rung. */
export const provokedLast = s => (s.history[s.turn - 1]?.P ?? 0) >= P.provoked.from;
export const provocation = (c, enc) => M[c.method].prov + C_MSGS.find(m => m.id === c.msg).prov + (c.push && enc && M[c.method].sea ? 1 : 0);

/** Odds the cargo arrives. */
export function deliveryOdds(s, c, p) {
  const m = M[c.method]; if (!m.cargo) return 0;
  let q = m.p[p.level];
  if (m.sea && s.cur?.rough) q *= P.weather.roughSea;
  if (!m.sea && s.cur?.cloud) q *= P.weather.cloud;
  if (m.sea && s.onScene > 0) q += P.onSceneBonus;
  if (m.sea && c.push && p.level >= 1 && p.level <= 4) q += p.hold ? P.pushBonus.hold : P.pushBonus.give;
  return clamp(q, 0.02, 0.97);
}

export function resolveTurn(s0, { c, p }) {
  const s = clone(brief(s0));
  const log = [], t = s.turn, dice = makeRng(s.seed, STREAM.dice + t);
  const roll = { deliver: dice.u(), collide: dice.u(), injure: dice.u(), patron: dice.u(), clash: dice.u() };
  if (c.method === 'patron' && s.patronLeft <= 0) c = { ...c, method: 'cg' };
  const m = M[c.method], L = p.level, enc = encounters(L, c.method);
  const Pv = provocation(c, enc), adj = tAdj(s);

  // Did last month's provocation make the Power snap? (Bayes on T, one month late.)
  const prev = s.history[t - 1];
  if (prev && prev.p.level <= 3) {
    const spike = L >= prev.p.level + 2;
    s.bT = updateT(s.bT, T => { const q = spikeProb(prev.P, T - prev.tAdj); return spike ? q : 1 - q; });
    if (spike) log.push({ kind: 'spike', text: `The Power jumped from ${LEVELS[prev.p.level].label.toLowerCase()} to ${LEVELS[L].label.toLowerCase()}.` });
  }

  // Delivery
  const odds = deliveryOdds(s, c, p);
  const delivered = roll.deliver < odds ? m.cargo : roll.deliver < odds + P.partial ? m.cargo / 2 : 0;
  let injury = false, seized = false, detained = false;
  if (enc && m.sea && c.push && p.hold && roll.collide < P.collide[L]) injury = true;
  if (enc && m.sea && L === 3 && roll.injure < P.ramInjury) injury = true;
  if (enc && m.sea && L === 4 && delivered < m.cargo) { seized = true; detained = !!p.detain; }
  if (m.cargo) log.push({ kind: 'deliver', text: `${m.label}: ${delivered === m.cargo ? 'cargo landed' : delivered ? 'half the cargo landed' : 'turned back, nothing landed'} (odds ${Math.round(odds * 100)}%).`, tone: delivered === m.cargo ? 'good' : delivered ? 'warn' : 'bad' });
  if (injury) log.push({ kind: 'incident', text: 'Collision at the shoal: crew injured.', tone: 'bad' });
  if (seized) log.push({ kind: 'incident', text: `The Power boarded and seized cargo${detained ? ' and detained the crew' : ''}.`, tone: 'bad' });

  // The Patron answers what it sees.
  let E = baseE(s, L, c.method);
  if (E > 0 && injury) E++;
  if (E > 0 && detained) E++;
  let resp = 'none';
  if (E > 0) {
    const pr = patronProbs(E, s.R);
    let acc = 0; resp = RESPONSES[3];
    for (let i = 0; i < 4; i++) { acc += pr[i]; if (roll.patron < acc) { resp = RESPONSES[i]; break; } }
    s.bR = updateR(s.bR, R => patronProbs(E, R)[RESPONSES.indexOf(resp)]);
  }

  // Tracks
  const cm = C_MSGS.find(x => x.id === c.msg), pm = P_MSGS.find(x => x.id === p.msg);
  let symGain = enc ? P.sym.byLevel[L] : 0;
  if (enc && c.method === 'press') symGain *= P.sym.press;
  if (cm.id === 'protest') symGain *= P.sym.protest;
  if (cm.id === 'lawfare') symGain *= P.sym.lawfare;
  if (pm.id === 'narrative') symGain *= P.sym.narrative;
  if (cm.id === 'lawfare') { symGain += s.lawFiled ? P.sym.lawAfter : P.sym.lawFirst; s.lawFiled = true; }
  if (pm.id === 'admin') symGain += P.sym.admin;
  if (c.method === 'patron') symGain += P.sym.patronMission;
  if (injury) symGain += P.sym.injury;
  if (detained) symGain += P.sym.detain;
  s.sympathy = clamp(50 + (s.sympathy - 50) * P.sym.decay + symGain);

  s.esc = s.esc * P.esc.decay + (enc ? P.esc.byLevel[L] : 0) + Pv * P.esc.perProv + (injury ? P.esc.collision : 0)
    + (resp === 'warning' ? P.esc.warning : 0) + (resp === 'intervene' ? P.esc.intervene : 0);
  s.esc = clamp(s.esc);
  if (resp === 'warning') s.cred += P.cred.warning;
  if (resp === 'intervene') { s.cred += P.cred.intervene; s.intervened = true; s.onScene = P.onSceneMonths + 1; }
  if (resp === 'silence' && E >= P.cred.silentFrom) s.cred += P.cred.silent;
  if (resp === 'concern' && E >= P.cred.concernFrom) s.cred += P.cred.concern;
  s.cred = clamp(s.cred);

  const D = P.domC;
  s.domC = clamp(D.home + (s.domC - D.home) * D.drift + (s.supplies < D.lowSupply ? D.lowSupplyHit : 0) + (seized ? D.seized : 0)
    + (detained ? D.detained : 0) + (cm.id === 'quiet' && enc && L >= 2 ? D.quietHit : 0) + (delivered >= 2 ? D.delivered : 0)
    + (s.cred < P.cred.low ? D.lowCred : 0) + (cm.id !== 'quiet' ? D.speakUp : 0));
  const Q = P.domP;
  s.domP = clamp(Q.home + (s.domP - Q.home) * Q.drift + (delivered >= 2 ? Q.delivered : 0) + Math.max(0, Pv - 2) * Q.perProvAbove2
    + (resp === 'intervene' ? Q.intervene : 0) + (L < s.lastLevel ? Q.backDown : 0) + (L >= 3 ? Q.strong : 0)
    + (pm.id === 'narrative' ? Q.narrative : 0) + (pm.id === 'admin' ? Q.admin : 0) + (detained ? Q.detain : 0));

  s.supplies = Math.max(0, Math.min(P.maxSupplies, s.supplies + delivered - P.use));
  s.minSupplies = Math.min(s.minSupplies, s.supplies);
  s.peakEsc = Math.max(s.peakEsc, s.esc);
  if (c.method === 'patron') s.patronLeft--;
  if (s.onScene > 0) s.onScene--;

  // A clash: only when escalation risk is high, likelier with the Patron's ships on scene.
  const ce = P.esc, hot = Math.max(0, (s.esc - ce.clashFrom) / (100 - ce.clashFrom));
  const clashP = hot > 0 ? Math.pow(hot, ce.clashPow) * (s.onScene > 0 || resp === 'intervene' ? ce.clashOnScene : ce.clashOff) : 0;
  const clash = roll.clash < clashP;
  if (clashP > 0) log.push({ kind: 'risk', text: `Chance of a clash this month: ${(clashP * 100).toFixed(1)}%.` });

  s.history.push({ turn: t, c: clone(c), p: clone(p), P: Pv, tAdj: adj, enc, E, resp, odds, delivered, injury, seized, detained, clashP, clash,
    rough: s.cur?.rough, cloud: s.cur?.cloud, statement: s.cur?.statement,
    after: { supplies: s.supplies, sympathy: s.sympathy, esc: s.esc, cred: s.cred, domC: s.domC, domP: s.domP }, bR: s.bR.slice(), bT: s.bT.slice() });
  s.lastLevel = L; s.turn++; s.cur = null;

  if (clash) s.over = { reason: 'clash', title: 'Shots at the shoal', text: 'Cutters and the Patron’s ships collided and fire was exchanged. Both governments lost control of the standoff.' };
  else if (s.supplies <= 0) s.over = s.intervened
    ? { reason: 'pyrrhic', title: 'The garrison withdraws, at a price', text: 'The garrison ran out and left the shoal, but the Patron intervened along the way. The Power has the shoal and a far more hostile Patron.' }
    : { reason: 'withdrawal', title: 'The garrison withdraws', text: 'The garrison ran out of supplies and left the shoal. The Patron never crossed its own line.' };
  else if (s.turn >= P.turns) s.over = { reason: 'hold', title: 'The outpost holds', text: 'Twelve months on, the garrison is still on the shoal and there was no war.' };
  if (s.over) s.over.month = s.turn;
  return { state: s, log };
}

/** Copy link: v1.seed.side.moves; each month 3 digits (Coastal) or 4 (Power). */
export function encode(s) {
  const ids = METHODS.map(m => m.id), cms = C_MSGS.map(m => m.id), pms = P_MSGS.map(m => m.id);
  const mv = s.history.map(h => s.side === 'c'
    ? `${ids.indexOf(h.c.method)}${cms.indexOf(h.c.msg)}${h.c.push ? 1 : 0}`
    : `${h.p.level}${pms.indexOf(h.p.msg)}${h.p.hold ? 1 : 0}${h.p.detain ? 1 : 0}`);
  return `v1.${s.seed}.${s.side}${mv.length ? '.' + mv.join('-') : ''}`;
}
export function decode(str) {
  const [v, seed, side, mv] = String(str).split('.');
  if (v !== 'v1' || !/^\d+$/.test(seed) || !['c', 'p'].includes(side)) return null;
  const moves = [];
  for (const x of (mv ? mv.split('-') : [])) {
    if (side === 'c' && /^[0-5][0-2][01]$/.test(x)) moves.push({ method: METHODS[+x[0]].id, msg: C_MSGS[+x[1]].id, push: x[2] === '1' });
    else if (side === 'p' && /^[0-5][0-2][01][01]$/.test(x)) moves.push({ level: +x[0], msg: P_MSGS[+x[1]].id, hold: x[2] === '1', detain: x[3] === '1' });
    else return null;
  }
  return { seed: +seed, side, moves: moves.slice(0, P.turns) };
}
