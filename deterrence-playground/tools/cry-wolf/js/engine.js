// Cry Wolf engine: one week at a time. The player's estimate and warning level go to a notional
// decision-maker whose trust scales how strongly it acts. Pure; no DOM.
import { P } from '../data/params.js';
import { ALL } from '../data/indicators.js';
import { makeWorld } from './world.js';

const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

export function newGame(seed, world = makeWorld(seed)) {
  return { seed, world, week: 1, ready: 0, trust: 100, cost: 0, falseAlarms: 0, budget: P.lookBudget, level: 0, peak: 0, hist: [], over: null };
}

/** Readiness after one week at level L with trust fraction tr. */
export function nextReady(ready, L, tr) {
  const lv = P.levels[L], cap = lv.cap * tr;
  return ready < cap ? Math.min(cap, ready + lv.gain * tr) : Math.max(cap, ready - P.decay);
}
/** Trust lost when a warning episode ends without an attack. */
export const falseAlarmDrop = (peak, earlier) => (peak >= 3 ? P.falseAlarm.alert : P.falseAlarm.warning) * (1 + P.falseAlarm.compound * earlier);

/**
 * Resolve the current week. choice = { p: 0..100, level: 0..3, look: index in ALL or -1 }.
 * Returns { state, events }. Never mutates `s`.
 */
export function step(s, choice) {
  if (s.over) return { state: s, events: [] };
  const t = s.week, w = s.world, events = [];
  const L = Math.max(0, Math.min(3, choice.level | 0));
  const p = clamp(Math.round(+choice.p || 0));
  let look = Number.isInteger(choice.look) && choice.look >= 0 && choice.look < ALL.length && s.budget > 0 ? choice.look : -1;
  const budget = s.budget - (look >= 0 ? 1 : 0);
  const tr = s.trust / 100;
  const ready = nextReady(s.ready, L, tr);
  const cost = s.cost + P.levels[L].cost * tr;
  let trust = s.trust - P.levels[L].fatigue, falseAlarms = s.falseAlarms, peak = s.peak;
  if (s.level >= 2 && L <= 1) {
    const drop = falseAlarmDrop(peak, falseAlarms);
    trust -= drop; falseAlarms++; peak = 0;
    events.push({ kind: 'false-alarm', drop, n: falseAlarms });
  }
  if (L >= 2) peak = Math.max(peak, L); else trust += P.recover;
  trust = clamp(trust);
  const hist = [...s.hist, { t, p, level: L, look, ready, trust, cost }];
  let over = null;
  if (t === w.attackWeek) {
    over = { attack: true, week: t, ready, inTime: ready >= P.inTime };
    events.push({ kind: 'attack', ready, inTime: over.inTime });
  } else if (t === P.weeks) {
    if (L >= 2) {
      const drop = falseAlarmDrop(peak, falseAlarms);
      trust = clamp(trust - drop); falseAlarms++;
      events.push({ kind: 'false-alarm', drop, n: falseAlarms, end: true });
    }
    over = { attack: false, week: t };
    events.push({ kind: 'quiet' });
  }
  hist[hist.length - 1].trust = trust;
  const state = { ...s, week: t + 1, ready, trust, cost, falseAlarms, budget, level: L, peak, hist, over };
  return { state, events };
}

/** The reports the player sees for the current week. */
export const thisWeek = s => s.world.weeks[s.week - 1];

/* ---------- Copy link: seed + each week's estimate, level and look ---------- */
export function encode(s) {
  const mv = s.hist.map(h => h.p.toString(36).padStart(2, '0') + h.level + (h.look >= 0 ? h.look : '-')).join('');
  return `v1.${s.seed}.${mv}`;
}
export function decode(str) {
  const m = String(str).match(/^v1\.(\d{1,9})\.([0-9a-z-]*)$/);
  if (!m || m[2].length % 4) return null;
  const moves = [];
  for (let i = 0; i < m[2].length; i += 4) {
    const c = m[2].slice(i, i + 4);
    const p = parseInt(c.slice(0, 2), 36), level = +c[2], look = c[3] === '-' ? -1 : +c[3];
    if (!(p >= 0 && p <= 100) || !(level >= 0 && level <= 3) || Number.isNaN(look) || look >= ALL.length) return null;
    moves.push({ p, level, look });
  }
  return { seed: +m[1], moves };
}
/** Replay a decoded link. */
export function replay(d) {
  let s = newGame(d.seed);
  for (const mv of d.moves) { if (s.over) break; s = step(s, mv).state; }
  return s;
}
