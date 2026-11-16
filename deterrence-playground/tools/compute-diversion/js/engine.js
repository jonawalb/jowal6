// Game state, the player's actions, and quarter resolution. No DOM: the page, the tests and the
// balance script all run this same code. All parameters are notional (data/params.js).
import { P } from '../data/params.js';
import { BY_LEVER } from '../data/levers.js';
import { makeRng, STREAM } from './rng.js';
import { HUB_IDS, flows, detect, adapt, prosecute, inForce, risks } from './network.js';

const clone = s => JSON.parse(JSON.stringify(s));
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export function newGame({ seed, len = 10 }) {
  const L = P.lengths.includes(+len) ? +len : 10;
  const s = {
    seed, len: L, turn: 0, over: null,
    hubs: Object.fromEntries(P.hubs.map(h => [h.id, { cap: h.cap, euc: 0, lvl: 0 }])),
    shells: [], nextShell: 1,
    cloud: P.cloud0, split: 0, offshore: 0, spoof: 0, quietChecks: 0, relaxNow: 0,
    pol: { agents: 0, kyc: null, lv: null, cases: 0 }, agentsSince: null,
    capital: P.capital0, revenue: P.revenue0, goodwill: P.goodwill0,
    friction: 0, diverted: 0, seized: 0, blocked: 0, lastPhys: 0, history: [],
  };
  for (const h of P.hubs) for (let i = 0; i < (h.cap > 0 ? P.shellsPerHub : 0); i++) s.shells.push({ id: 's' + s.nextShell++, hub: h.id, seen: false, listed: false, born: 0 });
  return s;
}

/** Budget left for discretionary levers after paying standing agents. */
export const upkeep = lvl => 2 * lvl;

/**
 * Make a list of actions legal, in order, within budget and political capital.
 * Action shapes: {k:'list', t:shellId} {k:'euc', t:hub} {k:'agents', v:0-3} {k:'hub', t:hub} {k:'kyc'} {k:'lv'} {k:'relax'}
 * Returns { acts, budget, capital } with what is left.
 */
export function normalize(s, actions) {
  const acts = [];
  const ag = (actions || []).find(a => a?.k === 'agents');
  let level = s.pol.agents, capital = s.capital;
  if (ag) {
    const v = clamp(Math.round(+ag.v || 0), 0, 3);
    if (v !== s.pol.agents && (v < s.pol.agents || capital >= BY_LEVER.agents.capital) && upkeep(v) <= P.budget) {
      if (v > s.pol.agents) capital -= BY_LEVER.agents.capital;
      level = v; acts.push({ k: 'agents', v });
    }
  }
  let budget = P.budget - upkeep(level);
  const relax = (actions || []).some(a => a?.k === 'relax');
  if (relax) { acts.push({ k: 'relax' }); capital += P.fx.relax.cap; }
  const eucN = {}, hubN = {};
  for (const a of actions || []) {
    const L = BY_LEVER[a?.k];
    if (!L || a.k === 'agents' || a.k === 'relax') continue;
    if (L.budget > budget || L.capital > capital) continue;
    if (a.k === 'list') {
      const x = s.shells.find(z => z.id === a.t);
      if (!x || !x.seen || x.listed || acts.some(o => o.k === 'list' && o.t === a.t)) continue;
    } else if (a.k === 'euc') {
      if (!HUB_IDS.includes(a.t) || s.hubs[a.t].cap <= 0 || (eucN[a.t] || 0) >= L.max) continue;
      eucN[a.t] = (eucN[a.t] || 0) + 1;
    } else if (a.k === 'hub') {
      if (!HUB_IDS.includes(a.t) || s.hubs[a.t].cap <= 0 || s.hubs[a.t].lvl >= 2 || (hubN[a.t] || 0) >= L.max) continue;
      hubN[a.t] = 1;
    } else if (a.k === 'kyc' || a.k === 'lv') {
      if (s.pol[a.k] != null || acts.some(o => o.k === a.k)) continue;
    }
    budget -= L.budget; capital -= L.capital;
    acts.push(a.t ? { k: a.k, t: a.t } : { k: a.k });
  }
  return { acts, budget, capital };
}

/** Apply actions to a cloned state (mutates). */
function apply(s, acts) {
  const fx = P.fx;
  for (const h of HUB_IDS) s.hubs[h].euc = 0;
  s.relaxNow = 0;
  let fr = 0;
  for (const a of acts) {
    const L = BY_LEVER[a.k];
    if (a.k === 'agents') {
      if (a.v > s.pol.agents) s.capital -= L.capital;
      if (a.v > 0 && (s.pol.agents === 0 || s.agentsSince == null)) s.agentsSince = s.turn;
      if (a.v === 0) s.agentsSince = null;
      s.pol.agents = a.v; continue;
    }
    s.capital -= L.capital;
    if (a.k === 'list') { const x = s.shells.find(z => z.id === a.t); x.listed = true; x.listedAt = s.turn; s.revenue += fx.list.rev; s.goodwill += fx.list.gw; fr += fx.list.fr; }
    if (a.k === 'euc') { s.hubs[a.t].euc++; s.goodwill += fx.euc.gw; fr += fx.euc.fr; }
    if (a.k === 'hub') { s.hubs[a.t].lvl++; s.revenue += fx.hub.rev; s.goodwill += fx.hub.gw; }
    if (a.k === 'kyc') { s.pol.kyc = s.turn; s.goodwill += fx.kyc.gwOnce; }
    if (a.k === 'lv') { s.pol.lv = s.turn; s.revenue += fx.lv.revOnce; s.goodwill += fx.lv.gwOnce; }
    if (a.k === 'relax') { s.relaxNow = 1; s.capital += fx.relax.cap; s.revenue += fx.relax.rev; s.goodwill += fx.relax.gw; fr += fx.relax.fr; }
  }
  // Standing costs of rules and hub pressure
  for (const h of HUB_IDS) fr += fx.hub.frPerLvl * s.hubs[h].lvl;
  if (s.pol.kyc != null && inForce(s, 'kyc')) { s.revenue += fx.kyc.revPerQ; fr += fx.kyc.frPerQ; }
  if (s.pol.lv != null && inForce(s, 'lv')) { s.revenue += fx.lv.revPerQ; fr += fx.lv.frPerQ; }
  return Math.max(0, fr);
}

function advance(state, actions, rolls) {
  const s = clone(state);
  const { acts } = normalize(s, actions);
  const before = { hubs: clone(s.hubs), shells: s.shells.length };
  const fr = apply(s, acts);
  const dice = rolls ? makeRng(s.seed, STREAM.dice, s.turn) : null;
  const fl = flows(s, dice);
  const log = [];
  s.diverted += fl.delivered; s.seized += fl.seized; s.blocked += fl.blocked; s.friction += fr;

  let tags = [];
  if (rolls) {
    const ad = makeRng(s.seed, STREAM.ai, s.turn);
    if (prosecute(s, fl, ad, log)) { s.capital += P.caseCapital; tags.push('case'); }
    detect(s, fl, ad, log);
    tags = tags.concat(adapt(s, fl, ad, log));
    if (s.pol.agents > 0 && s.agentsSince == null) s.agentsSince = s.turn;
  }
  // Politics drifts back; low revenue drains capital
  s.revenue = clamp(s.revenue + Math.sign(P.revenue0 - s.revenue) * Math.min(P.revDrift, Math.abs(P.revenue0 - s.revenue)), 0, P.revMax);
  s.goodwill = clamp(s.goodwill + Math.sign(P.goodwill0 - s.goodwill) * Math.min(P.gwDrift, Math.abs(P.goodwill0 - s.goodwill)), 0, 100);
  s.capital = clamp(s.capital + P.capitalRegen - (s.revenue < P.revFloor ? P.revDrag : 0), 0, P.capitalMax);
  s.lastPhys = fl.phys;

  const rec = {
    turn: s.turn, actions: acts, demand: fl.demand, deter: fl.deter, tried: fl.tried, delivered: fl.delivered, seized: fl.seized, blocked: fl.blocked,
    routes: Object.fromEntries(Object.entries(fl.f).map(([k, v]) => [k, { a: v.attempt, d: v.delivered, r: v.risk }])),
    friction: fr, revenue: s.revenue, goodwill: s.goodwill, capital: s.capital, diverted: s.diverted, log, tags, before,
  };
  s.history.push(rec);
  s.turn++;
  if (s.turn >= s.len) s.over = true;
  return { state: s, rec };
}

export const resolveTurn = (state, actions) => advance(state, actions, true);
/** Preview: expected flows this quarter if the player ends it with these actions (no dice, no adaptation). */
export const project = (state, actions) => advance(state, actions, false).rec;
export { risks };

/** Cost to legitimate trade: friction plus lost revenue plus lost goodwill (notional index, lower is better). */
export function collateral(s) {
  const parts = { friction: s.friction, revenue: Math.max(0, P.revenue0 - s.revenue) * 1.5, goodwill: Math.max(0, P.goodwill0 - s.goodwill) };
  return { ...parts, total: parts.friction + parts.revenue + parts.goodwill };
}

/** Replay a list of quarterly moves from a start. */
export function play(start, moves) {
  let s = newGame(start);
  for (const m of moves) { if (s.over) break; s = resolveTurn(s, m).state; }
  while (!s.over && moves.length >= s.len) s = resolveTurn(s, []).state;
  return s;
}

/** Baseline: the same network and dice with no enforcement at all. */
export function baseline(start) {
  let s = newGame(start);
  while (!s.over) s = resolveTurn(s, []).state;
  return s;
}

export function score(s, base) {
  const b = base || baseline({ seed: s.seed, len: s.len });
  const cut = clamp(1 - s.diverted / b.diverted, 0, 1);
  const col = collateral(s);
  const keep = clamp(1 - col.total / P.costScale, 0, 1);
  const total = Math.round(P.scoreDiv * cut + P.scoreCost * keep);
  return { cut, col, keep, total, base: b.diverted, diverted: s.diverted };
}

/**
 * Which levers mattered: replay the game with every use of one lever removed, same seed.
 * Returns [{k, used, dDiverted, dCost}] sorted by diversion prevented.
 */
export function attribution(s) {
  const moves = s.history.map(h => h.actions);
  const used = [...new Set(moves.flat().map(a => a.k))];
  const me = collateral(s).total;
  return used.map(k => {
    const without = moves.map(m => m.filter(a => a.k !== k));
    if (k === 'agents') {   // remove standing agents entirely
      for (const m of without) m.push({ k: 'agents', v: 0 });
    }
    const alt = play({ seed: s.seed, len: s.len }, without);
    return { k, used: moves.flat().filter(a => a.k === k).length, dDiverted: alt.diverted - s.diverted, dCost: me - collateral(alt).total };
  }).sort((a, b) => b.dDiverted - a.dDiverted);
}

/* Share links: version, seed, length, then every quarter's actions, compact. */
const CODE = { list: 'l', euc: 'e', agents: 'a', hub: 'h', kyc: 'k', lv: 'v', relax: 'r' };
const UNCODE = Object.fromEntries(Object.entries(CODE).map(([k, v]) => [v, k]));
export function encode(s) {
  const mv = s.history.map(h => h.actions.map(a => CODE[a.k] + (a.t ?? (a.v ?? ''))).join(',')).join('~');
  return `v1.${s.seed}.${s.len}${s.history.length ? '.' + mv : ''}`;
}
export function decode(str) {
  const parts = String(str).split('.');
  const [v, seed, len] = parts;
  if (v !== 'v1' || !/^\d+$/.test(seed) || !P.lengths.includes(+len)) return null;
  const mv = parts.slice(3).join('.');
  const moves = mv ? mv.split('~').map(q => q ? q.split(',').map(tok => {
    const k = UNCODE[tok[0]], rest = tok.slice(1);
    if (!k) return null;
    if (k === 'agents') return { k, v: +rest };
    return rest ? { k, t: rest } : { k };
  }).filter(Boolean) : []) : [];
  return { seed: +seed, len: +len, moves };
}
