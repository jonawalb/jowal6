// Counterattacks (SPEC §3.7) and the reserve race (SPEC §3.11). Lodgments age and consolidate; the
// counterattack multiplier CA_mult = 1 + 1.0 (1 - cohesion) + 0.5 [beyond his guns] - 0.5 [consolidated],
// clamped 0.6-2.5, divides Biddle's H in a counterattack (Biddle pp. 47-48; Hunzeker pp. 61-62, 79, 82).
// Riposte: an immediate local counterattack by adjacent units. Counterstroke: the deliberate counterattack by
// the Counterstroke formation after planning time (2 / 3 / 4 h by scale).
import { COUNTER, RACE, SPEED, STACK } from '../data/params.js';
import { SCALES } from '../data/scales.js';
import { gridFor } from './grid.js';
import { alive, fighting, inSec, other, companies } from './forces.js';
import { underGuns, ready as ready_, inRange, addSupp } from './arty.js';
import { routeUnit } from './move.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const CS_ROLES = new Set(['cs', 'corpsCs', 'armyRes']);

/** Strength-weighted cohesion of the attacker units in a lodgment. */
export function lodgCohesion(g, sec) {
  const us = inSec(g, sec, 'att');
  const s = us.reduce((a, u) => a + u.str, 0);
  return s > 0 ? us.reduce((a, u) => a + u.str * (u.coh ?? 1), 0) / s : 1;
}

/** CA_mult for a counterattack into lodgment sec. kind: 'riposte' | 'counterstroke'; auth: riposte authority. */
export function caMult(g, sec, kind = 'riposte', auth = true) {
  const L = g.lodg[sec];
  const outside = underGuns(g, 'att', sec) ? 0 : 1;
  let m;
  // A counterstroke has no consolidation penalty (SPEC §3.7); it keeps the cohesion term (W1-A, DECISIONS).
  m = 1 + COUNTER.coh * (1 - lodgCohesion(g, sec)) + COUNTER.outside * outside - (kind === 'counterstroke' ? 0 : COUNTER.cons * (L && L.cons ? 1 : 0));
  if (kind === 'riposte' && !auth) m *= COUNTER.noAuthority;
  return clamp(m, COUNTER.min, COUNTER.max);
}

/** The lodgment's window badge: green (CA >= 1.6, h_cap <= 3), amber (closing), grey (consolidated). */
export function windowOf(g, sec) {
  const L = g.lodg[sec];
  if (!L) return null;
  const ca = caMult(g, sec);
  const badge = L.cons ? 'grey' : ca >= COUNTER.window && L.hcap <= COUNTER.windowHours ? 'green' : 'amber';
  return { badge, ca, hcap: L.hcap, cons: L.cons, best: L.best || null };
}

/** Riposte authority: always in a single battle; in a campaign it needs card ED3 (SPEC §3.7, §6.5). */
export const riposteAuthority = (g, u) => g.mode === 's' || !!(u.trained && u.trained.ED3 >= 0.5);

/** Record a new attacker lodgment at sec (after a successful assault). */
export function newLodgment(g, sec, biteAndHold = false) {
  g.lodg[sec] = { sec, t0: g.t, hcap: 0, staticH: 0, cons: biteAndHold, best: null, hist: [], open: [] };
}

const firstRun = a => { if (!a.length) return null; let e = a[0]; for (const h of a.slice(1)) { if (h !== e + 1) break; e = h; } return [a[0], e]; };

/** End of hour: age lodgments, consolidate after 2 h static, track the best counterattack window. */
export function updateLodgments(g) {
  for (const k of Object.keys(g.lodg)) {
    const sec = +k, L = g.lodg[sec], us = inSec(g, sec, 'att');
    if (!us.length || g.ctrl[sec] !== 2) { delete g.lodg[sec]; continue; }
    L.hcap += 1;
    L.staticH = us.some(u => u.moving) ? 0 : L.staticH + 1;
    if (!L.cons && (L.staticH >= COUNTER.consHours || us.some(u => u.posture === 'consolidate' && L.hcap >= COUNTER.consHours))) L.cons = true;
    const ca = caMult(g, sec);
    L.hist.push(+ca.toFixed(2));
    if (ca >= COUNTER.window && !L.cons && L.hcap <= COUNTER.windowHours) L.open.push(g.t + 1);
    L.best = firstRun(L.open);
  }
}

/**
 * Start of movement: counterattacks that go in at once. Ripostes ordered this hour (with authority) and
 * Riposte-stance units next to a fresh lodgment whose window is open; Counterstroke units at H-hour.
 */
export function counterMoves(g) {
  const G = gridFor(g.scale), cap = STACK.max;
  const enter = (u, sec, how) => {
    if (companies(g, sec, u.side) >= cap) return false;
    g.occ[u.sec].splice(g.occ[u.sec].indexOf(u), 1);
    u.facing = G.dirTo(u.sec, sec); u.from = u.sec; u.sec = sec; u.moving = true; u.path = []; u.ca = how;
    g.occ[sec].push(u);
    if (!g.contest[sec]) g.contest[sec] = { by: u.side, t: g.t };
    return true;
  };
  for (const u of g.units) {
    if (u.side !== 'def' || !fighting(u) || u.pinned > g.t) continue;
    if (u.riposteAt != null && u.riposteT === g.t) {
      const sec = u.riposteAt; u.riposteAt = null;
      if (g.lodg[sec] && G.adj(u.sec, sec)) { u.caAuth = riposteAuthority(g, u); enter(u, sec, 'riposte'); }
      continue;
    }
    if (u.stance === 'riposte' && !u.cs && !g.contest[u.sec]) {
      const sec = G.nbrs[u.sec].find(s => { const L = g.lodg[s]; return L && !L.cons && L.hcap <= COUNTER.windowHours && caMult(g, s) >= COUNTER.window; });
      if (sec != null) { u.caAuth = riposteAuthority(g, u); enter(u, sec, 'riposte'); }
    }
  }
  // Counterstroke: from H-hour the formation goes in together once 60% of it stands next to its targets (or at
  // H+2 with what has arrived), with its own supporting fire landing that hour (SPEC §3.7).
  for (const cs of g.cstrokes) {
    if (cs.done || g.t < cs.h) continue;
    const live = cs.units.map(id => g.units[g.ix[id]]).filter(fighting);
    const tgts = cs.secs.filter(s => g.ctrl[s] === 2 || g.lodg[s]);
    if (!live.length || !tgts.length) { cs.done = true; for (const u of live) { u.cs = null; } continue; }
    const near = u => tgts.filter(s => G.adj(u.sec, s) || u.sec === s).sort((a, b) => b - a)[0];
    const ready = live.filter(u => near(u) != null);
    if (!cs.go && ready.length < Math.ceil(0.6 * live.length) && g.t < cs.h + 2) continue;
    if (!cs.go) {
      cs.go = g.t;
      for (const s of tgts) {
        let k = 0;
        for (const b of g.units) {
          if (k >= 2 || b.side !== 'def' || !ready_(g, b) || b.mission || !inRange(g, b, s)) continue;
          b.mission = 'cs'; b.firedAt = g.t; k++;
          for (const v of g.occ[s]) if (v.side === 'att') addSupp(v, 0.6);
        }
      }
    }
    for (const u of live) {
      if (u.ca) continue;
      const tgt = near(u);
      if (tgt != null && tgt !== u.sec) { u.caAuth = true; enter(u, tgt, 'counterstroke'); }
      else if (tgt == null) { u.csGo = true; if (!u.path.length || !tgts.includes(u.dest)) routeUnit(g, u, tgts.slice().sort((a, b) => G.dist(u.sec, a) - G.dist(u.sec, b))[0]); }
    }
  }
}

/** Planning time for a counterstroke at this scale (SPEC §2.2). */
export const csPlanTime = g => SCALES[g.scale].csPlan;

// ---- The race clock (Biddle A.14-A.17, p. 214) ----

/**
 * Race clock from one side's own picture: hours for the attacker's deepest penetration to reach the objective
 * line at its recent pace, vs hours until the nearest counterstroke can strike it (march + planning time).
 * belief: a picture() result for `side` (pass null to read the truth, e.g. in the review).
 */
export function raceClock(g, side, belief = null) {
  const G = gridFor(g.scale), S = SCALES[g.scale], objRow = S.obj.row;
  let deep = -1, deepSec = null;
  if (side === 'att' || !belief) {
    for (const u of g.units) if (u.side === 'att' && fighting(u) && G.row[u.sec] > deep) { deep = G.row[u.sec]; deepSec = u.sec; }
  } else {
    for (const tr of belief.tracks) if (G.row[tr.sec] > deep) { deep = G.row[tr.sec]; deepSec = tr.sec; }
  }
  if (deepSec == null) return { deepest: null, row: null, pace: 0, hoursToObj: null, csHours: null, first: null, margin: null };
  const hist = g.deepHist || [];
  const past = hist[Math.max(0, g.t - RACE.paceHours)] ?? deep;
  const pace = Math.max(RACE.minPace, (deep - past) / Math.max(1, Math.min(RACE.paceHours, g.t)));
  const hoursToObj = Math.max(0, (objRow - deep) / pace);
  const plan = csPlanTime(g);
  let csHours = null;
  const speed = g.era === 'm' ? SPEED.covered : SPEED.road;
  const csUnits = side === 'def' || !belief ? g.units.filter(u => u.side === 'def' && fighting(u) && CS_ROLES.has(u.role))
    : belief.tracks.filter(t => G.row[t.sec] >= objRow).map(t => ({ sec: t.sec }));
  for (const u of csUnits) {
    const h = G.dist(u.sec, deepSec) / speed + plan;
    if (csHours === null || h < csHours) csHours = h;
  }
  if (csHours === null && side === 'att') csHours = plan + (G.rows - objRow) / 2 / speed;   // nothing seen: assume the rear zone's middle
  const first = csHours === null ? 'att' : csHours <= hoursToObj ? 'cs' : 'att';
  return { deepest: deepSec, row: deep, pace: +pace.toFixed(2), hoursToObj: +hoursToObj.toFixed(1), csHours: csHours === null ? null : +csHours.toFixed(1),
    first, margin: csHours === null ? null : +(hoursToObj - csHours).toFixed(1) };
}

/** Is a defender unit pinned by fixing? Attacker strength in contact >= k3 x its strength; rear zone exempt. */
export function fixedBy(g, u, k3) {
  const G = gridFor(g.scale);
  if (u.side !== 'def' || G.zone[u.sec] === 'rear') return false;
  let s = 0;
  for (const c of [u.sec, ...G.nbrs[u.sec]]) for (const v of g.occ[c]) if (v.side === other(u.side) && fighting(v)) s += v.str;
  return s >= k3 * u.str && alive(u);
}
