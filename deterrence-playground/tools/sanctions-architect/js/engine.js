// Game state and quarter resolution. No DOM: the same code runs in the page, the tests and the balance script.
import { P } from '../data/params.js';
import { PARTNERS, BY_PARTNER } from '../data/partners.js';
import { BY_MEASURE, SECTORS, ENFORCE } from '../data/measures.js';
import { makeRng, STREAM } from './rng.js';
import { quarter, cohesion, pressureParts, threshold, pConcede, pExpected } from './model.js';
import { chooseResponses, applyResponses } from './target.js';

const clone = s => JSON.parse(JSON.stringify(s));
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export function newGame({ seed, demand = 'halt', ambition = 'modest', type }) {
  const r = makeRng(seed, STREAM.setup);
  const t = type && P.types.includes(type) ? type : P.types[r.pick(P.types.map(k => P.prior[k]))];
  return {
    seed, demand, ambition, type: t, turn: 0,
    pol: { energy: { lvl: 0, mode: 'cap' }, finance: { lvl: 0, mode: 'banks' }, tech: { lvl: 0, q: 0 }, elites: { lvl: 0 }, shipping: { lvl: 0 }, secondary: 0, maritime: 0, customs: 0 },
    partners: Object.fromEntries(PARTNERS.map(d => [d.id, { member: d.member, commit: d.commit, cost: 0, cum: 0, counter: 0, exempt: 0 }])),
    tgt: { revenue: 100, economy: 100, reroute: 0, evasion: 0, rally: 0, elite: 0, stock: 0, pressure: 0 },
    shock: 0, shockSum: 0, ownCum: 0, leak: 0, pain: 0,
    belief: { ...P.prior }, responses: [], history: [], over: null,
  };
}

/** Make a list of actions legal: at most three, one per measure, valid answers. */
export function normalize(s, actions) {
  const out = [];
  for (const x of actions || []) {
    const m = BY_MEASURE[x?.m];
    if (!m || out.some(o => o.m === x.m) || out.length >= P.maxMeasures) continue;
    const b = x.b;
    if (m.sector) {
      const lvl = clamp(Math.round(+b || 0), 0, 3);
      const a = x.m === 'energy' ? (x.a === 'embargo' ? 'embargo' : 'cap') : x.m === 'finance' ? (x.a === 'cb' ? 'cb' : 'banks') : undefined;
      out.push({ m: x.m, a, b: lvl });
    } else if (x.m === 'enforce') {
      if (!ENFORCE.includes(x.a)) continue;
      out.push({ m: 'enforce', a: x.a, b: clamp(Math.round(+b || 0), 0, 2) });
    } else if (x.m === 'coalition') {
      const st = s.partners[x.a];
      if (!st) continue;
      let how = ['reassure', 'compensate', 'exempt', 'court'].includes(b) ? b : 'reassure';
      if (!st.member) how = 'court'; else if (how === 'court') how = 'reassure';
      out.push({ m: 'coalition', a: x.a, b: how });
    }
  }
  return out;
}

/** Court success chance for an outsider or a defector. */
export function courtOdds(s, id) {
  const d = BY_PARTNER[id];
  const base = d.member ? 0.45 : d.court;
  return clamp(base + 0.002 * (cohesion(s) - 50) - 0.08 * s.pol.secondary, 0.05, 0.9);
}

/** Apply policy and diplomacy (mutates `s`). `dice` decides courting; null means assume it fails. Returns extras. */
function applyActions(s, acts, dice, log) {
  let own = 0;
  const bonus = {};
  for (const x of acts) {
    if (BY_MEASURE[x.m].sector) {
      const pol = s.pol[x.m];
      if (x.m === 'tech' && x.b === 0) pol.q = 0;
      pol.lvl = x.b; if (x.a) pol.mode = x.a;
    } else if (x.m === 'enforce') s.pol[x.a] = x.b;
    else {
      const st = s.partners[x.a];
      if (x.b === 'reassure') bonus[x.a] = 4;
      if (x.b === 'compensate') { bonus[x.a] = 12; own += 2.5; }
      if (x.b === 'exempt') st.exempt = 2;
      if (x.b === 'court') {
        own += 1.5;
        const p = courtOdds(s, x.a);
        const ok = dice ? dice.u() < p : false;
        if (dice) log.push({ kind: 'court', who: x.a, ok, p });
        if (ok) { st.member = true; st.commit = 45; st.counter = 0; }
      }
    }
  }
  return { own, bonus };
}

/** One quarter. `rolls` false gives the expected outcome with no dice (used for the preview). */
function advance(state, actions, rolls = true) {
  const s = clone(state), log = [];
  const acts = normalize(s, actions);
  const dice = rolls ? makeRng(s.seed, STREAM.dice, s.turn) : null;
  const { own: extra, bonus } = applyActions(s, acts, dice, log);
  const q = quarter(s);

  s.tgt.revenue = q.revenue; s.tgt.economy = q.economy;
  s.tgt.elite = s.tgt.elite * 0.8 + q.eliteAdd;
  s.tgt.rally = clamp(s.tgt.rally * 0.85 + q.rallyAdd, 0, 60);
  s.tgt.stock = s.tgt.stock * P.stockDecay + q.pain;
  s.shock = q.shock; s.shockSum += q.shock;
  s.ownCum += q.own + extra;
  s.leak = q.leak; s.pain = q.pain;

  const incident = dice && s.pol.maritime && dice.u() < 0.05 * s.pol.maritime;
  if (incident) log.push({ kind: 'note', text: 'A boarding at sea goes wrong. Partners question the maritime campaign.' });
  for (const d of PARTNERS) {
    const st = s.partners[d.id];
    st.cost = q.cost[d.id]; st.cum += q.cost[d.id];
    if (st.member) {
      const delta = 1.5 + (d.tol - st.cost) * 1.5 - 1.5 * s.pol.secondary + (s.pol.customs ? 1 : 0) + (bonus[d.id] || 0) - (incident ? 6 : 0);
      st.commit = clamp(st.commit + delta, 0, 100);
      if (dice && st.commit < P.defectBelow && dice.u() < (P.defectBelow - st.commit) / P.defectBelow * P.defectMax) {
        st.member = false; st.commit = 0; st.exempt = 0;
        log.push({ kind: 'defect', who: d.id, text: `The ${d.name} leaves the coalition. Its trade with the Target reopens.` });
      }
    }
    st.counter *= 0.5; if (st.exempt > 0) st.exempt--;
  }

  const coh = cohesion(s);
  const pp = pressureParts(s.tgt.stock, s.tgt.elite, s.tgt.rally, coh);
  s.tgt.pressure = pp.total;
  const pTrue = pConcede(pp.total, threshold(s, s.type));
  const pEst = pExpected(s, pp.total);
  let conceded = false;
  if (dice) conceded = dice.u() < pTrue;

  if (!conceded) {   // Bayes: the Target held out this quarter
    const post = Object.fromEntries(P.types.map(k => [k, s.belief[k] * (1 - pConcede(pp.total, threshold(s, k)))]));
    const z = Object.values(post).reduce((a, b) => a + b, 0) || 1;
    for (const k of P.types) s.belief[k] = post[k] / z;
  }
  let responses = [];
  if (rolls && !conceded) {
    s.tgt.reroute *= 0.95; s.tgt.evasion *= 0.95;
    responses = applyResponses(s, chooseResponses(s, q, makeRng(s.seed, STREAM.ai, s.turn)));
  }
  if (s.pol.tech.lvl > 0) s.pol.tech.q++;

  const rec = { turn: s.turn, actions: acts, pain: q.pain, grossPain: q.grossPain, leak: q.leak, L: q.L, via: q.via, revenue: q.revenue, economy: q.economy,
    shock: q.shock, own: q.own + extra, ownCum: s.ownCum, cohesion: coh, pressure: pp, pTrue, pEst, responses, log, conceded };
  s.history.push(rec);
  s.responses = responses;
  s.turn++;
  if (conceded) s.over = ending(s, 'concede');
  else if (s.turn >= P.turns) s.over = ending(s, 'time');
  return { state: s, rec, q };
}

export const resolveTurn = (state, actions) => { const r = advance(state, actions, true); return { state: r.state, log: r.rec }; };
/** Preview: what this set of measures would do this quarter, before the Target responds or anyone rolls. */
export const project = (state, actions) => advance(state, actions, false).rec;

/** Share of the demand achieved at the end: 1 on concession, else a partial gesture if pressure came close. */
export function achieved(s) {
  if (s.over?.reason === 'concede') return 1;
  const ratio = s.tgt.pressure / threshold(s, s.type);
  return clamp((ratio - P.partialFrom) / (1 - P.partialFrom), 0, 1) * P.partialMax;
}

function ending(s, reason) {
  const d = P.demands[s.demand].label.toLowerCase(), amb = s.ambition === 'maximal' ? 'in full' : 'in part';
  if (reason === 'concede') return { reason, title: 'The Target concedes', text: `In ${P.quarter(s.turn - 1)} the Target agrees to ${d} ${amb}.` };
  const a = achieved(s);
  return a > 0
    ? { reason, title: 'A partial gesture', text: `After eight quarters the Target will not ${d}, but it offers a token step to ease the pressure.` }
    : { reason, title: 'The Target holds out', text: `After eight quarters the Target has not agreed to ${d}.` };
}

/** Copy-link encoding: version, seed, demand, ambition, then every quarter's measures. */
const b64 = str => (typeof btoa === 'function' ? btoa(str) : Buffer.from(str, 'utf8').toString('base64')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = str => { const t = str.replace(/-/g, '+').replace(/_/g, '/'); return typeof atob === 'function' ? atob(t) : Buffer.from(t, 'base64').toString('utf8'); };
export function encode(s) {
  const mv = s.history.map(h => h.actions.map(x => [x.m, x.a ?? 0, x.b]));
  return `v1.${s.seed}.${s.demand}.${s.ambition}${mv.length ? '.' + b64(JSON.stringify(mv)) : ''}`;
}
export function decode(str) {
  const [v, seed, demand, ambition, mv] = String(str).split('.');
  if (v !== 'v1' || !/^\d+$/.test(seed) || !P.demands[demand] || !P.ambitions[ambition]) return null;
  let moves = [];
  try { moves = mv ? JSON.parse(unb64(mv)).map(q => (q || []).map(([m, a, b]) => ({ m, a: a === 0 ? undefined : a, b }))) : []; } catch { moves = []; }
  return { seed: +seed, demand, ambition, moves };
}
export { SECTORS };
