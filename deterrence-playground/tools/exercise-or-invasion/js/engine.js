// Game state and weekly resolution. No DOM: the same code runs in the page, the tests and the balance script.
// A week has three steps: Red moves (or attacks), Blue collects and reads, Blue decides (hold, warn, stand down).
import { P } from '../data/params.js';
import { makeRng, STREAM } from './rng.js';
import {
  clamp, logit, sigmoid, inWindow, readinessGain, signature, weekEvidence, expectedEvidence, attackOdds, mobRate, expected,
} from './model.js';

const clone = s => JSON.parse(JSON.stringify(s));
const zero = keys => Object.fromEntries(keys.map(k => [k, 0]));
export const emptyRed = () => ({ a: zero(P.activities), cover: 'open', attack: false });
export const emptyCollect = () => zero(P.sources);

/** New game. side: 'red' | 'blue'. A Red player names its intent; a computer Red draws one from the seed. */
export function newGame({ seed, side, intent }) {
  const r = makeRng(seed, STREAM.setup);
  const c = P.calendar;
  const windows = [c.first[Math.floor(r.u() * c.first.length)], c.second[Math.floor(r.u() * c.second.length)]];
  const aiIntent = r.u() < P.ai.redIntentP ? 'attack' : 'exercise';
  const strategy = P.ai.strategies[Math.floor(r.u() * P.ai.strategies.length)];
  const feint = r.u() < P.ai.feint;
  return {
    seed, side, windows, strategy, feint,
    intent: side === 'red' && (intent === 'attack' || intent === 'exercise') ? intent : aiIntent,
    week: 0, R: 0, M: 0, C: 100, mobilized: false,
    exposure: zero(P.sources),
    z: logit(P.model.prior),       // Blue's analyst model (log-odds that Red intends to attack)
    zRed: logit(P.model.prior),    // Red's estimate of that number
    readyEst: 0,                   // Blue's estimate of Red readiness
    tempoWindow: 0, warnings: 0, standDowns: 0, mobWeeks: 0,
    cur: null, history: [], over: null,
  };
}

/** Make a Red move legal: caps per activity and in total, cover that fits the calendar, attack only when allowed. */
export function legalRed(s, m) {
  const out = emptyRed();
  let left = P.redPoints;
  for (const a of P.activities) {
    const n = clamp(Math.floor(+(m?.a?.[a]) || 0), 0, Math.min(P.maxPerActivity, left));
    out.a[a] = n; left -= n;
  }
  const win = inWindow(s);
  const cv = P.cover[m?.cover] ? m.cover : 'open';
  out.cover = (cv === 'cycle' && !win) || (cv === 'snap' && win) ? 'open' : cv;
  out.attack = !!m?.attack && canAttack(s);
  return out;
}
export const canAttack = s => s.intent === 'attack' && s.R >= P.readiness.attackMin && !s.over;

/** Step 1: Red's move. Returns the new state (with s.cur filled, or s.over if Red attacked). */
export function redStep(state, move) {
  const s = clone(state);
  const m = legalRed(s, move);
  if (m.attack) {
    const p = attackOdds(s.R, s.M), roll = makeRng(s.seed, STREAM.dice + s.week).u();
    s.over = { reason: 'attack', week: s.week, p, roll, success: roll < p };
    s.history.push({ week: s.week, red: m, R: s.R, M: s.M, C: s.C, p: sigmoid(s.z), redEst: sigmoid(s.zRed), attack: true });
    return s;
  }
  const gain = readinessGain(m);
  s.R = clamp(s.R + gain - (gain < P.readiness.decay ? P.readiness.decay : 0), 0, 100);
  if (inWindow(s)) s.tempoWindow += m.a.tempo;
  const snap = m.cover === 'snap';
  const sig = signature(s, m);
  s.zRed += expectedEvidence(s, sig, snap);
  s.cur = { red: m, sig, gain, snap };
  return s;
}

/** Step 2: Blue's collection plan and the noisy readings it buys. The analyst model updates by Bayes' rule. */
export function collectStep(state, plan) {
  const s = clone(state);
  const c = emptyCollect();
  let left = P.bluePoints;
  for (const k of P.sources) { const n = clamp(Math.floor(+(plan?.[k]) || 0), 0, Math.min(P.maxPerSource, left)); c[k] = n; left -= n; }
  const readings = {};
  P.sources.forEach((k, i) => {
    if (!c[k]) { readings[k] = null; return; }
    const r = makeRng(s.seed, STREAM.noise + s.week * 8 + i);
    readings[k] = s.cur.sig[k] + r.normal() * P.sigma[k] / Math.sqrt(c[k]);
  });
  const ev = weekEvidence(s, readings, c, s.cur.snap);
  s.z = clamp(s.z + ev, -8, 8);
  s.zRed = clamp(s.zRed, -8, 8);
  const p = sigmoid(s.z);
  s.readyEst = clamp(s.readyEst + p * 9 - (1 - p) * P.readiness.decay, 0, 100);
  const base = Object.fromEntries(P.sources.map(k => [k, expected(s, k, c[k] || 1, s.cur.snap).E]));
  Object.assign(s.cur, { collect: c, readings, base, evidence: ev });
  return s;
}

/** Step 3: Blue decides. d: { act: 'hold'|'warn'|'stand', belief?: 0-100 (a Blue player's own estimate) }. */
export function decideStep(state, d) {
  const s = clone(state);
  let act = d?.act || 'hold';
  if (act === 'warn' && s.mobilized) act = 'hold';
  if (act === 'stand' && !s.mobilized) act = 'hold';
  let exposed = null;
  if (act === 'warn') { s.mobilized = true; s.warnings++; }
  if (act === 'stand') {
    s.mobilized = false; s.M = 0; s.standDowns++;
    s.C = Math.max(0, s.C - P.warn.standDownCred);
    const c = s.cur.collect, tot = Object.values(c).reduce((a, b) => a + b, 0) || 1;
    exposed = {};
    for (const k of P.sources) { const e = c[k] / tot; s.exposure[k] = clamp(s.exposure[k] + e, 0, 1); exposed[k] = e; }
  }
  if (s.mobilized) { s.M = clamp(s.M + mobRate(s.C), 0, 100); s.mobWeeks++; }
  const belief = d?.belief == null ? null : clamp(Math.round(+d.belief), 0, 100);
  s.history.push({
    week: s.week, red: s.cur.red, collect: s.cur.collect, readings: s.cur.readings, base: s.cur.base, evidence: s.cur.evidence, snap: s.cur.snap,
    act, belief, exposed, R: s.R, M: s.M, C: s.C, p: sigmoid(s.z), redEst: sigmoid(s.zRed), readyEst: s.readyEst,
  });
  s.cur = null;
  s.week++;
  if (s.week >= P.weeks) s.over = { reason: 'time', week: s.week };
  return s;
}

/** One whole week: red move, then Blue's plan, then Blue's decision as a function of the state after collection. */
export function runWeek(s, red, plan, decide) {
  let t = redStep(s, red);
  if (t.over) return t;
  t = collectStep(t, typeof plan === 'function' ? plan(t) : plan);
  return decideStep(t, typeof decide === 'function' ? decide(t) : decide);
}

/* ---------- Share links: seed, side, intent and the player's own choices; replay recomputes the rest ---------- */
const b64 = str => (typeof btoa === 'function' ? btoa(str) : Buffer.from(str, 'utf8').toString('base64')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = str => { const t = str.replace(/-/g, '+').replace(/_/g, '/'); return typeof atob === 'function' ? atob(t) : Buffer.from(t, 'base64').toString('utf8'); };
const COVER = { open: 'o', cycle: 'c', snap: 's' }, COVER_BACK = { o: 'open', c: 'cycle', s: 'snap' };
const ACT = { hold: 'h', warn: 'w', stand: 's' }, ACT_BACK = { h: 'hold', w: 'warn', s: 'stand' };

/** The player's moves as recorded in history. */
export function playerMoves(s) {
  return s.history.filter(h => s.side === 'red' || !h.attack).map(h => s.side === 'red'
    ? P.activities.map(a => h.red.a[a]).join('') + COVER[h.red.cover] + (h.attack ? '!' : '')
    : P.sources.map(k => h.collect[k]).join('') + ACT[h.act] + (h.belief == null ? '' : h.belief));
}
export function encode(s, moves = playerMoves(s)) {
  const it = s.side === 'red' ? s.intent[0] : '-';
  return `v1.${s.seed}.${s.side[0]}.${it}${moves.length ? '.' + b64(moves.join(',')) : ''}`;
}
export function decode(str) {
  const [v, seed, sd, it, mv] = String(str).split('.');
  const side = { r: 'red', b: 'blue' }[sd];
  if (v !== 'v1' || !side || !/^\d+$/.test(seed)) return null;
  const intent = { a: 'attack', e: 'exercise' }[it] || null;
  let raw = [];
  try { raw = mv ? unb64(mv).split(',').filter(Boolean) : []; } catch { raw = []; }
  const moves = raw.map(t => side === 'red' ? decodeRed(t) : decodeBlue(t)).filter(Boolean);
  return { seed: +seed, side, intent, moves };
}
function decodeRed(t) {
  const m = t.match(/^(\d{6})([ocs])(!?)$/);
  if (!m) return null;
  return { a: Object.fromEntries(P.activities.map((a, i) => [a, +m[1][i]])), cover: COVER_BACK[m[2]], attack: m[3] === '!' };
}
function decodeBlue(t) {
  const m = t.match(/^(\d{4})([hws])(\d{0,3})$/);
  if (!m) return null;
  return { collect: Object.fromEntries(P.sources.map((k, i) => [k, +m[1][i]])), act: ACT_BACK[m[2]], belief: m[3] === '' ? null : +m[3] };
}
