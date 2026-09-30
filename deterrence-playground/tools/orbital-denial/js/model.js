// Game state and turn resolution. Pure functions of (state, actions, parameters, seed): no DOM.
import { TURNS, CRISIS_TURNS, DT, MISSIONS, MISSION_KEYS, STOCKS, SHELL_KEYS, BACKGROUND, BG_MASS } from '../data/params.js';
import { rng, STREAM } from './rng.js';
import { breakup, scatter, decay, hazard, initialDebris } from './debris.js';
import { redChoose } from './red.js';
import { ACTS, isOffense, valid } from './actions.js';

export const POSTURES = ['restrained', 'reciprocal', 'aggressive'];
const other = x => (x === 'B' ? 'R' : 'B');
const zero = () => ({ isr: 0, com: 0, nav: 0, ew: 0 });

function newSide() {
  const alive = {}; for (const m of MISSION_KEYS) alive[m] = MISSIONS[m].n0;
  return { alive, pending: zero(), stock: { ...STOCKS }, hard: { isr: false, com: false, nav: false, ew: false },
    carry: zero(), cap: { isr: 1, com: 1, nav: 1, ew: 1 }, kills: 0, ewHit: false, debrisLost: 0 };
}

export function newGame(seed, posture = 'unknown') {
  const pr = rng(seed, STREAM.posture)();
  const post = POSTURES.includes(posture) ? posture : POSTURES[Math.floor(pr * 3)];
  return { seed, posture: post, turn: 0, over: false, outcome: null, sides: { B: newSide(), R: newSide() },
    ...initialDebris(), bgLost: 0, cumH: 0, adv: 0, firstKill: false, lastActs: { B: [], R: [] }, hist: [] };
}

export const phaseOf = t => (t <= CRISIS_TURNS ? 'crisis' : 'war');
export const support = cap => MISSION_KEYS.reduce((a, m) => a + MISSIONS[m].w * cap[m], 0);
export const clone = g => JSON.parse(JSON.stringify(g, (k, v) => (v === Infinity ? 1e308 : v)));

/** Fog on a side: how much of its warning and reconnaissance picture it has lost. */
const fog = sd => 1 - 0.5 * sd.cap.ew - 0.5 * sd.cap.isr;

/** Resolve one month. `blue` is up to two {a, m} actions. Mutates and returns g. */
export function step(g, blue, P) {
  if (g.over) return g;
  const t = ++g.turn, phase = phaseOf(t), ev = [];
  const acts = { B: blue.map(x => ({ ...x })), R: redChoose(g, P, rng(g.seed, STREAM.redPick, t)) };
  for (const X of ['B', 'R']) {
    const sd = g.sides[X];
    for (const m of MISSION_KEYS) { sd.alive[m] += sd.pending[m]; sd.pending[m] = 0; }
    const ok = [];
    for (const x of acts[X].slice(0, 2)) ok.push(valid(g, X, x, ok) ? x : { a: 'hold', m: null, was: x.a });
    acts[X] = ok;
  }
  // Defensive moves take effect first, this month.
  const man = { B: {}, R: {} }, deg = { B: { ...g.sides.B.carry }, R: { ...g.sides.R.carry } };
  for (const X of ['B', 'R']) {
    const sd = g.sides[X];
    sd.carry = zero();
    for (const x of acts[X]) {
      if (x.a === 'maneuver') { sd.stock.maneuver--; man[X][MISSIONS[x.m].shell] = true; }
      if (x.a === 'harden') sd.hard[x.m] = true;
      if (x.a === 'reconst') { sd.stock.reconst--; sd.pending[x.m] += 3; }
      if (x.a === 'prolif') { sd.stock.prolif--; sd.pending.com += 12; }
    }
  }
  const add = (Y, m, e) => { deg[Y][m] = 1 - (1 - deg[Y][m]) * (1 - e); };
  let h = phase === 'crisis' ? P.h0Crisis : P.h0War;
  for (const X of ['B', 'R']) {
    const Y = other(X), sd = g.sides[X], tg = g.sides[Y];
    const r = rng(g.seed, X === 'B' ? STREAM.blue : STREAM.red, t);
    for (const x of acts[X]) {
      const u1 = r(), u2 = r();
      if (!isOffense(x.a)) continue;
      const hf = tg.hard[x.m] ? P.hardFactor : 1, shell = MISSIONS[x.m].shell;
      let w = { jam: P.wRev, dazzle: P.wRev, cyber: P.wCyber, asat: P.wAsat, coorb: P.wCoorb }[x.a];
      if (MISSIONS[x.m].entangled) { w *= P.entangle; sd.ewHit = true; }
      if ((x.a === 'asat' || x.a === 'coorb') && !g.firstKill) { w *= P.firstKill; g.firstKill = true; ev.push(`${X === 'B' ? 'You make' : 'Red makes'} the first destructive attack of the war.`); }
      h += w * (1 + P.phi * fog(tg));
      if (x.a === 'jam') { const e = (P.jamLo + (P.jamHi - P.jamLo) * u1) * hf * (x.m === 'ew' ? 0.4 : 1); add(Y, x.m, e); x.res = `${Math.round(e * 100)}% of ${MISSIONS[x.m].short} jammed`; }
      if (x.a === 'dazzle') {
        const e = (P.dazLo + (P.dazHi - P.dazLo) * u1) * hf; add(Y, 'isr', e); x.res = `${Math.round(e * 100)}% of ISR blinded`;
        if (u2 < P.dazDamage && tg.alive.isr > 0) { tg.alive.isr--; x.res += '; one satellite permanently damaged'; }
      }
      if (x.a === 'cyber') {
        if (u1 < P.pCyber * hf) { add(Y, x.m, P.cyberEff); tg.carry[x.m] = 1 - (1 - tg.carry[x.m]) * (1 - P.cyberEff); x.res = `ground network breached, ${MISSIONS[x.m].short} down ${Math.round(P.cyberEff * 100)}% for two months`; }
        else x.res = 'attack failed';
      }
      if (x.a === 'asat' || x.a === 'coorb') {
        sd.stock[x.a]--;
        const aim = 1 - P.ssaDep * (1 - sd.cap.isr);
        const p = (x.a === 'asat' ? P.pAsat : P.pCoorb) * (man[Y][shell] ? P.manFactor : 1) * aim;
        if (u1 < p && tg.alive[x.m] > 0) {
          tg.alive[x.m]--; sd.kills++;
          const N = breakup(MISSIONS[x.m].mass + P.kvMass, P) * (x.a === 'coorb' ? P.coorbFrac : 1);
          const sc = scatter(shell, N, P);
          for (const s of SHELL_KEYS) { g.debris[s] += sc[s]; g.fresh[s] += sc[s]; }
          x.res = `hit: one ${MISSIONS[x.m].short} satellite destroyed, about ${Math.round(N).toLocaleString('en-US')} trackable fragments`;
        } else x.res = man[Y][shell] ? 'missed: the target maneuvered' : 'missed';
      }
    }
  }
  // Debris strikes over the month, on both sides and on everyone else.
  const rd = { B: rng(g.seed, STREAM.debrisB, t), R: rng(g.seed, STREAM.debrisR, t) };
  for (const s of SHELL_KEYS) {
    const z = hazard(s, g.debris[s], g.fresh[s], P);
    if (z.total <= 0) continue;
    for (const X of ['B', 'R']) for (const m of MISSION_KEYS) {
      if (MISSIONS[m].shell !== s) continue;
      const sd = g.sides[X], p = 1 - Math.exp(-z.total * DT * (man[X][s] ? P.manFactor : 1));
      let lost = 0;
      for (let i = 0; i < sd.alive[m]; i++) if (rd[X]() < p) lost++;
      if (!lost) continue;
      sd.alive[m] -= lost; sd.debrisLost += lost;
      const cat = lost * z.cat / z.total, sc = scatter(s, cat * breakup(MISSIONS[m].mass, P), P);
      for (const q of SHELL_KEYS) { g.debris[q] += sc[q]; g.fresh[q] += sc[q]; }
      ev.push(`Debris strike: ${X === 'B' ? 'you lose' : 'Red loses'} ${lost} ${MISSIONS[m].short} satellite${lost > 1 ? 's' : ''}.`);
    }
    const bl = BACKGROUND[s] * (1 - Math.exp(-z.total * DT));
    g.bgLost += bl;
    const sc = scatter(s, bl * (z.cat / z.total) * breakup(BG_MASS, P), P);
    for (const q of SHELL_KEYS) { g.debris[q] += sc[q]; g.fresh[q] += sc[q]; }
  }
  decay(g, DT, P);
  // Capability, advantage and escalation.
  const S = {};
  for (const X of ['B', 'R']) {
    const sd = g.sides[X];
    for (const m of MISSION_KEYS) sd.cap[m] = Math.min(1, sd.alive[m] / MISSIONS[m].need) * (1 - deg[X][m]);
    S[X] = support(sd.cap);
  }
  g.adv += (phase === 'crisis' ? P.crisisW : 1) * (S.B - S.R);
  const pTurn = 1 - Math.exp(-h);
  g.cumH += h;
  const escalated = rng(g.seed, STREAM.esc, t)() < pTurn;
  g.lastActs = { B: acts.B, R: acts.R };
  g.hist.push({ t, phase, acts, ev, S, cap: { B: { ...g.sides.B.cap }, R: { ...g.sides.R.cap } },
    alive: { B: { ...g.sides.B.alive }, R: { ...g.sides.R.alive } }, pend: { B: { ...g.sides.B.pending }, R: { ...g.sides.R.pending } }, h, pTurn, cumP: 1 - Math.exp(-g.cumH),
    debris: { ...g.debris }, adv: g.adv, lost: { B: g.sides.B.debrisLost, R: g.sides.R.debrisLost, O: g.bgLost }, escalated });
  if (escalated) { g.over = true; g.outcome = 'escalation'; }
  else if (t >= TURNS) { g.over = true; g.outcome = g.adv >= P.theta ? 'blue' : g.adv <= -P.theta ? 'red' : 'draw'; }
  return g;
}

/** Play a whole game. `policy(g)` returns Blue's actions for the coming month (a fixed plan or a strategy). */
export function playGame(seed, posture, policy, P) {
  const g = newGame(seed, posture);
  while (!g.over) step(g, policy(g), P);
  return g;
}

export { ACTS };
