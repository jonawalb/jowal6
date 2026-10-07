// Assault resolution: Biddle's halt condition (A.6, A.16; k1 = 2.5, Table A.1 p. 218), per contested sector
// (SPEC §3.5). A_s = sum(str x q x cohesion) of the side that entered most recently; D_s = sum(str x q x
// (1 - supp)) of the holders; H_s = k1 (1 - f_e) x step^(5 - od) / CA_mult. The assault prevails if
// A_s > H_s x D_s: holders yield (Elastic / Delay) or are overrun (Hold); otherwise it stalls.
import { BIDDLE, ASSAULT, OFFDEF, STACK, COUNTER, TANK, BARRAGE } from '../data/params.js';
import { TYPES } from '../data/units.js';
import { TERRAIN } from '../data/terrain.js';
import { SCALES } from '../data/scales.js';
import { gridFor } from './grid.js';
import { fighting, inSec, other, companies, isCompany, isBattery, knows, alive } from './forces.js';
import { caMult, newLodgment, riposteAuthority, lodgCohesion } from './counter.js';
import { disengage } from './fire.js';
import { barrageCase } from './arty.js';

/** The slider's factor on H: step^(5 - od), exactly 1 at 5; low settings favour defense (D-30). */
export const tilt = (od = OFFDEF.standard, scale = 'd') => (OFFDEF.step[scale] ?? OFFDEF.step.d) ** (OFFDEF.standard - od);

/** Defender exposure f_e of one holder in its sector (SPEC §3.5 table). */
export function holderFe(g, u, sec = u.sec) {
  const f = g.sectors.feat, A = ASSAULT.fe, G = gridFor(g.scale);
  if (u.side === 'att') { const L = g.lodg[sec]; return L && L.cons ? A.lodgCons : A.lodgFresh; }
  if (f.strong[sec]) return A.strong;
  const rev = G.row[sec] > G.crest || TERRAIN[g.sectors.terrain[sec]].key === 'reverse';
  const ed1 = knows(u, 'ED1') ? ASSAULT.ed1 : 0;
  if (f.trench[sec]) {
    if (!(g.known.att[sec] & 1)) return A.trenchUnknown;
    return rev ? Math.max(0, A.trenchRevKnown - ed1) : A.trenchFwdKnown;
  }
  return (u.staticH || 0) >= 2 ? (knows(u, 'ED1') ? A.dispersed : A.dispersedUntrained) : A.open;   // W3: concealed dispersal needs ED1
}

/** The counterattack kind and multiplier if `by` is counterattacking a lodgment at sec, else null. */
function counterOf(g, sec, by, units) {
  if (by !== 'def' || !g.lodg[sec]) return null;
  const cs = units.some(u => u.ca === 'counterstroke');
  const auth = units.every(u => u.caAuth !== false && (u.ca || riposteAuthority(g, u)));
  const how = cs ? 'counterstroke' : 'riposte';
  return { how, ca: caMult(g, sec, how, auth) };
}

/**
 * Terms of the halt condition at sec for assaulting side `by` (SPEC §3.5). opts.units: the assaulting units
 * (default: by's units in the sector); opts.belief: believed holder strength (the player's estimate).
 */
export function stallTerms(g, sec, by, opts = {}) {
  const att = opts.units || inSec(g, sec, by), hold = inSec(g, sec, other(by));
  // 2026-10-07: a tank with no friendly infantry in the sector counts TANK.alone (0): tanks take ground only with
  // infantry (Biddle p. 61; SPEC §3.9).
  const withInf = att.some(u => TYPES[u.type].line);
  const A = att.reduce((s, u) => s + u.str * (u.q || 1) * (u.side === 'att' ? (u.coh ?? 1) : 1) * (TYPES[u.type].cat === 'veh' && !withInf ? TANK.alone : 1), 0);
  let D, fe, supp;
  if (opts.belief != null) {
    D = opts.belief; supp = 0;
    fe = g.sectors.feat.strong[sec] && by === 'att' ? ASSAULT.fe.strong : by === 'att' && (g.known.att[sec] & 1) ? ASSAULT.fe.trenchFwdKnown : by === 'def' ? ASSAULT.fe.lodgFresh : ASSAULT.fe.dispersed;
  } else {
    const w = hold.reduce((s, u) => s + u.str, 0);
    D = hold.reduce((s, u) => s + u.str * (u.q || 1) * (1 - (u.supp || 0)), 0);
    fe = w > 0 ? hold.reduce((s, u) => s + u.str * holderFe(g, u, sec), 0) / w : 0;
    supp = w > 0 ? hold.reduce((s, u) => s + u.str * (u.supp || 0), 0) / w : 0;
  }
  const co = counterOf(g, sec, by, att);
  const ca = co ? co.ca : 1;
  const tl = by === 'att' ? tilt(g.od, g.scale) : 1 / tilt(g.od, g.scale);   // W3: the slider favors one army: its assaults and the other side's counterattacks move together
  const H = BIDDLE.k1 * (1 - fe) * tl / ca;
  const coh = att.length ? att.reduce((s, u) => s + (u.coh ?? 1), 0) / att.length : 1;
  return { A, D, H, k1: BIDDLE.k1, fe, supp, coh, tilt: tl, ca, how: co ? co.how : null, ratio: D > 0 ? A / (H * D) : A > 0 ? Infinity : 0 };
}

/**
 * The stall gauge (SPEC §3.5): assault strength as a share of what is needed to advance, clamped 0-300%.
 * believed: true to use the side's own estimate of the holders (from its last sightings); units: optional ids
 * of the units that would assault (for a planned assault, before the move).
 */
export function stallGauge(g, sec, side, believed = false, units = null) {
  const us = units ? units.map(id => g.units[g.ix[id]]).filter(fighting) : null;
  const opts = { units: us || undefined };
  if (believed) opts.belief = g.beliefSec[side] ? g.beliefSec[side][sec] : 0;
  const t = stallTerms(g, sec, side, opts);
  const pct = Math.round(100 * Math.min(ASSAULT.gaugeMax, Number.isFinite(t.ratio) ? t.ratio : ASSAULT.gaugeMax));
  return { ...t, pct, need: t.H * t.D, believed: !!believed, prevails: t.ratio > 1 };
}

/** Where a yielding or overrun unit falls back to: one row toward its own rear, not enemy-held. */
function fallback(g, u, sec) {
  const G = gridFor(g.scale), back = u.side === 'def' ? 1 : -1, foe = other(u.side), f = g.sectors.feat;
  const opts = G.nbrs[sec].filter(c => G.row[c] === G.row[sec] + back && !g.occ[c].some(v => v.side === foe && isCompany(v)) && companies(g, c, u.side) < STACK.max);
  if (!opts.length) return -1;
  const score = c => (g.ctrl[c] === (u.side === 'def' ? 1 : 2) ? 2 : 0) + (f.trench[c] || f.strong[c] ? 1 : 0) - Math.abs(G.col[c] - G.col[sec]) * 0.1 + (f.comm[c] ? 0.5 : 0);
  return opts.sort((a, b) => score(b) - score(a) || a - b)[0];
}

function relocate(g, u, to) {
  const G = gridFor(g.scale), arr = g.occ[u.sec];
  arr.splice(arr.indexOf(u), 1);
  u.facing = G.dirTo(to, u.sec) >= 0 ? G.dirTo(to, u.sec) : u.facing; u.from = u.sec; u.sec = to; u.path = []; u.prog = 0;
  g.occ[to].push(u);
}

/** Resolve every contested sector (SPEC §3.1 step 6). rng: the assault stream. */
export function resolveAssaults(g, rng) {
  const G = gridFor(g.scale);
  for (const k of Object.keys(g.contest)) {
    const sec = +k, c = g.contest[sec], by = c.by, foe = other(by);
    const att = inSec(g, sec, by), hold = inSec(g, sec, foe);
    if (!att.length) { delete g.contest[sec]; continue; }
    if (!hold.length) { capture(g, sec, by); g.taken[sec] = { by, how: att.find(u => u.ca)?.ca || 'assault' }; delete g.contest[sec]; continue; }
    const T = stallTerms(g, sec, by);
    const won = T.A > T.H * T.D;
    if (T.how) {
      const L = g.lodg[sec];
      g.events.push({ t: g.t, kind: 'counter', side: by, how: T.how, sec, won, ca: +T.ca.toFixed(2), window: L && L.best ? L.best : null, vis: ['def', 'att'] });
      g.telemetry.ca.push({ t: g.t, s: by, kind: T.how, caMult: +T.ca.toFixed(2), coh: +lodgCohesion(g, sec).toFixed(2), inWin: !!(L && !L.cons && T.ca >= COUNTER.window && L.hcap <= COUNTER.windowHours), ok: won, best: L && L.best ? L.best : null, sec });
    }
    if (!won) {
      for (const u of att) u.stalled = true;
      g.events.push({ t: g.t, kind: 'stall', side: by, sec, gauge: Math.round(100 * Math.min(3, T.ratio)), vis: ['def', 'att'] });
      continue;
    }
    for (const u of hold) {
      // Option (BARRAGE.caught): holders assaulted while the barrage is still on them are caught in their shelters.
      const caught = BARRAGE.caught && by === 'att' && barrageCase(g, sec) === 'on';
      const elastic = !caught && (u.stance === 'elastic' || u.stance === 'delay' || u.side === 'att');
      const to = fallback(g, u, sec);
      if (elastic && to >= 0) {
        if (u.side === 'def' && g.mode === 'c' && u.stance === 'elastic' && !knows(u, 'ED2') && rng.u() < ASSAULT.untrainedYieldBreak) {
          u.broken = true; g.events.push({ t: g.t, kind: 'break', side: u.side, unit: u.id, sec, vis: [u.side] });
        }
        disengage(g, u, rng);
        relocate(g, u, to); u.yld = true;
        g.events.push({ t: g.t, kind: 'yield', side: u.side, unit: u.id, sec, to, vis: ['def', 'att'] });
        continue;
      }
      const l = u.str * ASSAULT.overrun; u.str -= l; u.lossH = (u.lossH || 0) + l;
      if (to >= 0) relocate(g, u, to); else { u.captured = true; u.str = 0; }
      u.broken = true;
      g.events.push({ t: g.t, kind: 'overrun', side: u.side, unit: u.id, sec, vis: ['def', 'att'] });
    }
    capture(g, sec, by);
    g.taken[sec] = { by, how: T.how || 'assault' };
    delete g.contest[sec];
    for (const u of att) u.ca = null;
  }
  // Undefended batteries and teams are captured where the enemy stands alone.
  for (let s = 0; s < G.n; s++) if (g.occ[s].length && !g.contest[s]) capture(g, s, null);
}

/** Batteries and teams in a sector held only by the enemy are captured (MICHAEL lost 530+ guns, Biddle p. 99). */
function capture(g, sec, by) {
  const sides = new Set(g.occ[sec].filter(u => fighting(u)).map(u => u.side));
  if (sides.size !== 1) return;
  const holder = [...sides][0];
  if (by && holder !== by) return;
  for (const u of g.occ[sec]) {
    if (u.side === holder || !alive(u) || (!isBattery(u) && u.type !== 'drone' && u.type !== 'ew')) continue;
    u.broken = true; u.captured = true;
    g.events.push({ t: g.t, kind: 'capture', side: holder, s: holder, unit: u.id, sec, vis: ['def', 'att'] });
  }
}

/**
 * Update sector control after movement and assaults: a sector held by one side's fighting units alone
 * belongs to it. New attacker ground in the defender's zones becomes a lodgment; ground the defender gets back
 * from a lodgment is "retaken". Emits lodgment / retaken / breakthrough events.
 */
export function updateCtrl(g) {
  const G = gridFor(g.scale), S = SCALES[g.scale], first = S.bands.outpost[0];
  for (let s = 0; s < G.n; s++) {
    let d = false, a = false;
    // 2026-10-07: ground is taken and held by infantry; attacking tanks alone do not make a sector the attacker's
    // (TANK.alone; Biddle p. 61).
    for (const u of g.occ[s]) if (fighting(u)) { if (u.side === 'def') d = true; else if (TYPES[u.type].cat !== 'veh' || TANK.alone > 0) a = true; }
    if (d && a) continue;
    const prev = g.ctrl[s], now = d ? 1 : a ? 2 : prev;
    if (now === prev) continue;
    g.ctrl[s] = now;
    const how = g.taken[s] ? g.taken[s].how : 'assault';
    if (now === 2 && G.row[s] >= first) {
      const bh = g.biteRow != null && G.row[s] >= g.biteRow;
      newLodgment(g, s, bh);
      // empty: walked in unopposed (no defender held the sector when the attacker entered, so no assault was fought).
      g.events.push({ t: g.t, kind: 'lodgment', side: 'att', sec: s, vis: ['def', 'att'], ...(g.taken[s] ? {} : { empty: true }) });
      g.telemetry.events.push({ t: g.t, kind: 'lodgment', s: 'att', side: 'att', sec: s });
    } else if (now === 1 && prev === 2) {
      g.events.push({ t: g.t, kind: 'retaken', side: 'def', sec: s, by: how === 'assault' ? 'assault' : how, vis: ['def', 'att'] });
      delete g.lodg[s];
    }
  }
  g.taken = {};
}
