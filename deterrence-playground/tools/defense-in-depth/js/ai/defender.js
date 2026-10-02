// Defender hourly policy (SPEC §5.2-5.3). Formation-level decisions first (believed main effort, counterstrokes,
// reserve positioning, objective garrisons), then unit-level ripostes; fires in js/ai/fires.js. Reads only the
// defender's fogged picture (js/ai/influence.js), its own units, the lodgments it has been told about (public
// 'lodgment' events) and the public map. The counterattack window is estimated, not read: the attacker's cohesion
// is inferred from how far and how long it has pushed (SPEC §3.7 rates), never from its unit records.
import { SCALES } from '../../data/scales.js';
import { COHESION, COUNTER } from '../../data/params.js';
import { ERAS } from '../../data/eras.js';
import { gridFor, laneCells } from '../grid.js';
import { fighting, isCompany } from '../forces.js';
import { raceClock, csPlanTime, CS_ROLES } from '../counter.js';
import { influence, near } from './influence.js';
import { defenderFires } from './fires.js';
import { mainWidth } from './plan-att.js';

/**
 * Estimated counterattack multiplier on a lodgment from public facts: rows advanced beyond no-man's land, hours
 * held, and whether it lies beyond the attacker's gun line (the era's range rings are public, SPEC §3.8).
 */
export function estCA(g, L) {
  const G = gridFor(g.scale), S = SCALES[g.scale], E = ERAS[g.era], r = G.row[L.sec];
  const coh = Math.max(COHESION.floor, 1 - COHESION.perRow * Math.max(0, r - S.bands.nml[1]) - COHESION.contact * Math.min(3, L.hcap) + (L.hcap >= 3 ? COHESION.recover : 0));
  const outside = r + E.gunLine.heavy > E.ranges.heavy ? 1 : 0;
  return Math.max(COUNTER.min, Math.min(COUNTER.max, 1 + COUNTER.coh * (1 - coh) + COUNTER.outside * outside));
}

/** The defender's actions for this hour. P: a profile from js/ai/profiles.js. */
export function defenderPolicy(g, P) {
  const G = gridFor(g.scale), S = SCALES[g.scale], B = S.bands, objRow = S.obj.row;
  const mem = ((g._ai ||= {}).def ||= {});
  mem.pending ||= {}; mem.csT ||= {};
  const inf = influence(g, 'def', P.latency);
  const acts = [];
  const mine = g.units.filter(u => u.side === 'def' && fighting(u));
  const recent = id => mem.pending[id] != null && g.t - mem.pending[id] < 3;
  const order = a => { acts.push(a); if (a.unit != null) mem.pending[a.unit] = g.t; };
  // An MG on its lane stays there: moving it costs the lane (js/fire.js keepLane), so rifle companies do the shifting.
  const sited = u => u.type === 'mg' && u.lane != null;
  // 1. The believed main effort: where the believed attacker mass is, weighted by depth (plus any warning).
  const w = mainWidth(g), colBel = new Array(G.cols).fill(0);
  let lead = B.nml[0], total = 0;
  for (const t of inf.pic.tracks) {
    const r = G.row[t.sec];
    if (r < B.nml[0]) continue;
    colBel[G.col[t.sec]] += t.est * (1 + (r - B.nml[0]) / 4); total += t.est;
    if (r > lead) lead = r;
  }
  if (g.warn && g.warn.cols && g.t <= 2 && (g.warn.level === 'full' || seeded(g, 31) < (g.warn.p ?? 0.5))) for (const c of g.warn.cols) colBel[c] += 20;
  let a0 = 0, as = -1;
  for (let c0 = 0; c0 + w <= G.cols; c0++) { let s = 0; for (let c = c0; c < c0 + w; c++) s += colBel[c]; if (s > as) { as = s; a0 = c0; } }
  const axis = as > 0 ? Array.from({ length: w }, (_, i) => a0 + i) : (mem.axis || [Math.floor((G.cols - w) / 2) + 0, Math.floor((G.cols - w) / 2) + 1].slice(0, w));
  mem.axis = axis;
  // 2. Counterstrokes (SPEC §3.7): strike a lodgment when the window is open (CA_mult >= 1.6), when the race clock
  // is lost, or when it threatens the objective line. Forward-heavy: only deliberate, against consolidated ground.
  const known = Object.values(g.lodg).filter(L => L.t0 <= g.t - P.latency && G.row[L.sec] >= B.battle[0]);
  const race = known.length ? raceClock(g, 'def', inf.pic) : null;
  const busy = new Set(g.cstrokes.filter(c => !c.done).map(c => c.fmn));
  const fms = Object.values(g.fmns).filter(f => f.side === 'def' && f.cs && !busy.has(f.id));
  const taken = new Set();
  for (const f of fms) {
    const us = f.units.map(id => g.units[g.ix[id]]).filter(u => u && fighting(u));
    if (!us.length || g.t - (mem.csT[f.id] ?? -9) < 2) continue;
    const str = us.reduce((s, u) => s + u.str, 0);
    const cr = Math.round(us.reduce((s, u) => s + G.row[u.sec], 0) / us.length), cc = Math.round(us.reduce((s, u) => s + G.col[u.sec], 0) / us.length);
    const ctr = G.idx(cr, cc);
    let best = null, bv = -Infinity;
    for (const L of known) {
      if (taken.has(L.sec)) continue;
      const r = G.row[L.sec], ca = estCA(g, L), belStr = Math.max(5, near(G, inf.bel, L.sec) / 2 + inf.bel[L.sec]);
      const deep = r >= objRow - 2, lost = race && race.first === 'att';
      let go;
      if (P.cs === 'never') go = false;
      else if (P.cs === 'deliberate') go = L.hcap >= COUNTER.consHours || r >= objRow;
      else if (P.cs === 'late') go = true;   // W3: picks the same target as the doctrinal commander but waits (below)
      else go = ca >= (P.csWin ?? COUNTER.window) || lost || deep;
      if (go && P.holdForMain && !deep && !lost) go = axis.some(c => Math.abs(c - G.col[L.sec]) <= 1) || inf.bel[L.sec] >= 0.25 * total;
      if (!go || str < 0.7 * belStr * 2.5 * 0.5 / ca) continue;
      const v = r * 3 - G.dist(L.sec, ctr) + ca * 4 + (axis.includes(G.col[L.sec]) ? 3 : 0);
      if (v > bv) { bv = v; best = L; }
    }
    if (!best) continue;
    if (P.cs === 'late' && best.hcap < 2 * COUNTER.consHours) continue;   // too late: waits until it has consolidated
    const secs = [best.sec, ...known.filter(L => L !== best && G.adj(L.sec, best.sec) && !taken.has(L.sec)).map(L => L.sec)].slice(0, 3);
    for (const s of secs) taken.add(s);
    mem.csT[f.id] = g.t;
    if (P.csPosture) for (const u of us) if (u.posture !== P.csPosture) acts.push({ kind: 'posture', unit: u.id, v: P.csPosture });
    acts.push({ kind: 'counterstroke', fmn: f.id, secs, h: g.t + (P.csExtra ? csPlanTime(g) + P.csExtra : 0) });
  }
  // 3. Reserve movement mode (Biddle Fig. A.13: fast in 1917-18, covered in Modern); position behind the axis.
  const mode = P.reserveMode === 'road' ? 'road' : g.era === 'w' ? 'road' : 'covered';
  if (!mem.modeSet) { mem.modeSet = true; for (const u of mine) if (CS_ROLES.has(u.role) && u.mode !== mode) acts.push({ kind: 'mode', unit: u.id, v: mode }); }
  if (P.cs !== 'deliberate' && g.t >= 2 && as > 0) {
    const mid = axis[Math.floor(axis.length / 2)];
    for (const f of fms) {
      if (taken.size || f.role === 'armyRes' || mem.csT[f.id] != null) continue;
      const us = f.units.map(id => g.units[g.ix[id]]).filter(u => u && fighting(u) && !u.path.length);
      if (!us.length) continue;
      const cc = Math.round(us.reduce((s, u) => s + G.col[u.sec], 0) / us.length);
      const band = f.div != null && f.div >= 0 ? divBand(g, f.div) : [0, G.cols - 1];
      const want = Math.max(band[0], Math.min(band[1], mid));
      if (Math.abs(cc - want) >= 2 && !(P.holdForMain && g.t < 3)) {
        const cr = Math.round(us.reduce((s, u) => s + G.row[u.sec], 0) / us.length);
        acts.push({ kind: 'fmn', fmn: f.id, order: { kind: 'move', to: G.idx(cr, want), mode } });
      }
    }
  }
  // 4. Objective garrisons (P.fill): keep an unbroken company in every threatened objective sector (SPEC §4).
  if (P.fill) {
    const threat = new Set();
    for (const t of inf.pic.tracks) if (G.row[t.sec] >= objRow - 3) for (let d = -1; d <= 1; d++) threat.add(G.col[t.sec] + d);
    for (const L of Object.values(g.lodg)) if (L.t0 <= g.t - P.latency && G.row[L.sec] >= objRow - 3) for (let d = -1; d <= 1; d++) threat.add(G.col[L.sec] + d);
    for (const c of [...threat].filter(c => c >= 0 && c < G.cols).sort((a, b) => a - b)) {
      const s = G.idx(objRow, c);
      if (inf.mine[s] > 0 || g.ctrl[s] === 2 || g.contest[s]) continue;
      const cand = mine.filter(u => !CS_ROLES.has(u.role) && !sited(u) && !g.contest[u.sec] && !recent(u.id) && !(u.pinned > g.t) && !u.path.length &&
        (G.row[u.sec] > objRow || (G.row[u.sec] === objRow && inf.mine[u.sec] > 12)) && G.dist(u.sec, s) <= 4)
        .sort((a, b) => G.dist(a.sec, s) - G.dist(b.sec, s) || (a.id < b.id ? -1 : 1))[0];
      if (cand) { order({ kind: 'move', unit: cand.id, to: s, mode: 'covered' }); order({ kind: 'stance', unit: cand.id, v: 'hold' }); }
    }
  }
  // 4b. Block the penetration (Biddle pp. 47-48, 55): companies idle far from the believed main effort shift in
  // front of its head, on the objective line or the row ahead of the lead, filling sectors that hold fewer than two.
  if (P.block && as > 0 && g.t >= 2) {
    const head = Math.min(objRow, Math.max(B.battle[0], lead + 2));
    const slots = [];
    for (const r of [objRow, head]) for (let c = axis[0] - 1; c <= axis[axis.length - 1] + 1; c++) {
      const s = G.idx(r, c);
      if (s >= 0 && !slots.includes(s) && g.ctrl[s] !== 2 && !g.contest[s] && inf.mine[s] < 15 && near(G, inf.bel, s) < 8) slots.push(s);
    }
    const far = mine.filter(u => !CS_ROLES.has(u.role) && u.role !== 'outpost' && !sited(u) && !g.contest[u.sec] && !u.path.length && !recent(u.id) && !(u.pinned > g.t) && !u.fixed &&
      near(G, inf.bel, u.sec) === 0 && Math.min(...axis.map(c => Math.abs(c - G.col[u.sec]))) >= 3 && G.row[u.sec] >= B.battle[0])
      .sort((a, b) => G.row[b.sec] - G.row[a.sec] || (a.id < b.id ? -1 : 1));
    let n = 0;
    for (const s of slots) {
      if (n >= P.block) break;
      const u = far.shift();
      if (!u) break;
      order({ kind: 'move', unit: u.id, to: s, mode: g.era === 'm' ? 'covered' : 'road' }); n++;
    }
  }
  // 4c. Riposte stance only where it can win: a company next to a lodgment it believes too strong to retake waits
  // on Elastic instead (the window is not a licence to attack a stronger enemy; Biddle pp. 47-48).
  if (P.riposte) {
    mem.rip ||= {};
    const cand = mine.filter(u => (u.stance === 'riposte' || mem.rip[u.id]) && !CS_ROLES.has(u.role));
    for (const u of cand) mem.rip[u.id] = true;
    const ok = new Set();
    for (const L of Object.values(g.lodg)) {
      if (L.hcap > COUNTER.windowHours) continue;
      const adj = cand.filter(u => G.adj(u.sec, L.sec) && !g.contest[u.sec]);
      const s = adj.reduce((a, u) => a + u.str, 0), need = Math.max(12, inf.bel[L.sec]) * 2.5 * 0.5 / estCA(g, L);
      if (s >= 1.1 * need) for (const u of adj) ok.add(u.id);
    }
    for (const u of cand) {
      const want = !sited(u) && (ok.has(u.id) || !G.nbrs[u.sec].some(c => g.lodg[c])) ? 'riposte' : 'elastic';
      if (u.stance !== want) acts.push({ kind: 'stance', unit: u.id, v: want });
    }
  }
  // 5. Hard: ripostes timed to the window by any adjacent company with the strength to win.
  if (P.timedRipostes) {
    for (const L of Object.values(g.lodg)) {
      if (L.hcap > COUNTER.windowHours || L.hcap >= COUNTER.consHours || L.t0 > g.t - P.latency) continue;
      const ca = estCA(g, L);
      if (ca < COUNTER.window - 0.1) continue;
      const adj = mine.filter(u => G.adj(u.sec, L.sec) && !CS_ROLES.has(u.role) && !g.contest[u.sec] && isCompany(u) && u.stance !== 'riposte');
      const s = adj.reduce((a, u) => a + u.str, 0), need = Math.max(5, inf.bel[L.sec]) * 2.5 * 0.5 / ca;
      if (s > (P.ripMargin ?? 1.2) * need) for (const u of adj) acts.push({ kind: 'riposte', unit: u.id, sec: L.sec });
    }
  }
  // 6. Moving near the enemy, companies bound (X 0.6) instead of walking upright into his fire (X 1.0).
  if (P.movePosture) for (const u of mine) {
    if (!u.path.length || u.cs) continue;
    const want = near(G, inf.bel, u.path[0]) > 0 || near(G, inf.bel, u.sec) > 0 ? P.movePosture : 'hold';
    if (u.posture !== want) acts.push({ kind: 'posture', unit: u.id, v: want });
  }
  // 7. Lanes are sited from one position (js/fire.js keepLane): an MG that has moved and stopped lays a new lane, across
  // the front toward the believed main effort (frontal-lane profiles straight ahead), with the normal order delay.
  if (P.lanes !== 'none') for (const u of mine) {
    if (u.type !== 'mg' || u.lane != null || u.laneWant != null || !u.laneLost || u.path.length || u.sec < 0) continue;
    if (g.orders.some(o => o.unit === u.id && !o.done && !o.cancelled && o.a.kind === 'lane')) continue;
    acts.push({ kind: 'lane', unit: u.id, dir: relayDir(g, u, P, axis, inf.bel) });
  }
  const fire = defenderFires(g, P, mem, inf, { axis, lead });
  return { missions: fire.missions, actions: [...acts, ...fire.actions] };
}

/** Direction for a re-laid lane: straight ahead for frontal-lane profiles; otherwise across the front (east or west),
 * or the diagonal forward, whichever sweeps the most believed attackers and the ground in front of them (a lane
 * along the row scores the full enfilade, a diagonal half); with nobody in sight, the longer lateral lane toward
 * the believed axis. bel: the defender's believed enemy strength per sector. */
export function relayDir(g, u, P, axis, bel) {
  if (P.lanes === 'frontal') return 4;
  const G = gridFor(g.scale), mid = (axis[0] + axis[axis.length - 1]) / 2, c = G.col[u.sec];
  const toward = mid >= c ? 2 : 6;
  let best = toward, bv = -Infinity;
  for (const d of [2, 6, 3, 5]) {
    const cells = laneCells(G, g.sectors.elev, u.sec, d);
    const lat = d === 2 || d === 6;
    let v = lat ? cells.length * 0.01 + (d === toward ? 0.005 : 0) : 0;
    for (const x of cells) { const ahead = G.at(x, 4); v += (lat ? 1 : 0.5) * (bel[x] + (ahead >= 0 ? 0.5 * bel[ahead] : 0)); }
    if (v > bv) { bv = v; best = d; }
  }
  return best;
}

/** Column band of a defender division (as the doctrinal layout spreads them). */
function divBand(g, k) {
  const G = gridFor(g.scale), nd = SCALES[g.scale].divs;
  return [Math.floor(k * G.cols / nd), Math.floor((k + 1) * G.cols / nd) - 1];
}

/** A fixed per-game uniform draw for the AI (its own stream; never the engine's dice). */
function seeded(g, k) {
  let x = (Math.imul(g.seed, 2654435761) ^ Math.imul(k + 101, 40503) ^ Math.imul((g.dice || 0) + 3, 97531)) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d) >>> 0; x ^= x >>> 12;
  return (x >>> 0) / 4294967296;
}
