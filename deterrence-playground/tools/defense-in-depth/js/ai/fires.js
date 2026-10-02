// Fire missions and era systems for the computer opponent (SPEC §3.8-3.10, §5.2): suppression where the
// fight is, counter-battery on batteries it has located, gas (1917-18) away from its own axis, smoke on
// enfilading lanes (Hard), the feint barrage (Hard), drones, EW, precision fires and 1917-18 air observation.
// Targets come only from the side's fogged picture (influence maps), its own units and its own 'located' events.
import { SCALES } from '../../data/scales.js';
import { SUPP, DRONE } from '../../data/params.js';
import { ERAS } from '../../data/eras.js';
import { TYPES } from '../../data/units.js';
import { gridFor } from '../grid.js';
import { fighting, isBattery } from '../forces.js';
import { barrageRows, inRange, ready } from '../arty.js';
import { located } from './influence.js';

/** Assign up to `per` in-range batteries from `pool` to each target until the ammunition budget runs out. */
function assign(g, pool, targets, per, budget, m, out) {
  let spent = 0;
  for (const t of targets) {
    let k = 0;
    for (let i = 0; i < pool.length && k < per; i++) {
      const b = pool[i];
      if (!inRange(g, b, t.sec)) continue;
      const cost = SUPP.costs[m] ?? 1;
      if (spent + cost > budget) return spent;
      out.push({ unit: b.id, m, sec: t.sec, target: t.target ?? null });
      pool.splice(i--, 1); k++; spent += cost;
    }
  }
  return spent;
}

/** A valid in-range sector to hang a counter-battery or precision mission on (the target is the unit id). */
function anySec(g, b) {
  const G = gridFor(g.scale), S = SCALES[g.scale];
  for (const r of [S.bands.outpost[0], S.bands.nml[0], 0, S.obj.row]) for (let c = 0; c < G.cols; c++) { const s = G.idx(r, c); if (inRange(g, b, s)) return s; }
  return -1;
}

function counterBattery(g, side, pool, out, max) {
  let n = 0;
  for (const id of located(g, side, g.t - 3)) {
    if (n >= max || !pool.length) break;
    const b = pool.shift(), sec = anySec(g, b);
    if (sec < 0) continue;
    out.push({ unit: b.id, m: 'cb', sec, target: id }); n++;
  }
  return n;
}

/** Attacker missions and era actions. ctx: { lead, winCols }. Returns { missions, actions }. */
export function attackerFires(g, P, mem, inf, ctx) {
  const G = gridFor(g.scale), S = SCALES[g.scale], B = S.bands, E = ERAS[g.era];
  const missions = [], actions = [];
  const rows = barrageRows(g), bar = g.barrage;
  const onBar = new Set(rows.length && bar ? bar.bats : []);
  const pool = g.units.filter(b => b.side === 'att' && isBattery(b) && ready(g, b) && !onBar.has(b.id));
  const hoursLeft = Math.max(1, g.turns - g.t);
  const barNeed = bar && rows.length ? Math.max(0, bar.stop - rows[rows.length - 1]) / bar.rate * onBar.size : 0;
  let budget = Math.max(0, Math.min(g.ammo.att - barNeed, 2 * (g.ammo.att - barNeed) / hoursLeft));
  const lead = ctx.lead;
  if (P.cb === 'first') budget -= counterBattery(g, 'att', pool, missions, 2);
  // Hard: a feint barrage on a second axis for the first two hours (draws reserves; resisted by Hard defenders).
  if (P.feint && mem.feint && g.t <= 1) for (const c of mem.feint) {
    const b = pool.shift();
    if (b) { missions.push({ unit: b.id, m: 'suppress', sec: G.idx(B.outpost[0] + g.t, c) }); budget -= 1; }
  }
  // Suppression where the infantry fights: contested sectors first, then believed positions next to our units.
  const score = new Map();
  const bump = (s, v) => { if (s >= 0) score.set(s, Math.max(score.get(s) || 0, v)); };
  const mg = new Set(inf.pic.tracks.filter(t => t.type === 'mg').map(t => t.sec));
  for (const u of g.units) {
    if (u.side !== 'att' || !fighting(u)) continue;
    if (g.contest[u.sec] && g.contest[u.sec].by === 'att') bump(u.sec, 10 + inf.bel[u.sec]);
    for (const c of G.nbrs[u.sec]) if (inf.bel[c] > 0 && g.ctrl[c] !== 2) bump(c, 4 + inf.bel[c] / 4 + (mg.has(c) ? 3 : 0) + (G.row[c] === G.row[u.sec] ? 2 : 0));
    if (u.path.length && inf.bel[u.path[0]] > 0) bump(u.path[0], 6 + inf.bel[u.path[0]] / 4);
  }
  const targets = [...score.entries()].map(([sec, v]) => ({ sec, v })).sort((a, b) => b.v - a.v || a.sec - b.sec);
  if (P.fires === 'spread') { for (let i = targets.length - 1; i > 0; i--) { const j = (g.t * 7 + i * 13) % (i + 1); [targets[i], targets[j]] = [targets[j], targets[i]]; } }
  budget -= assign(g, pool, targets, P.fires === 'spread' ? 1 : 2, budget, 'suppress', missions);
  if (P.cb === true && budget > 2) budget -= counterBattery(g, 'att', pool, missions, 1);
  // Gas (1917-18): believed positions off the main axis and away from our own units (masks; Hunzeker p. 54).
  if (P.gas && E.gas && budget >= 4 && pool.length) {
    const own = new Uint8Array(G.n);
    for (const u of g.units) if (u.side === 'att' && fighting(u)) { own[u.sec] = 1; for (const c of G.nbrs[u.sec]) own[c] = 1; }
    const tg = inf.pic.tracks.filter(t => !own[t.sec] && !mem.main.includes(G.col[t.sec]) && !g.gas[t.sec] && G.row[t.sec] <= lead + 3)
      .sort((a, b) => (b.type === 'mg') - (a.type === 'mg') || b.est - a.est || a.sec - b.sec);
    if (tg.length) budget -= assign(g, pool, [{ sec: tg[0].sec }], 1, budget, 'gas', missions);
  }
  // Hard: smoke on the lane cell next to our units where a believed MG sits on the same row (enfilade).
  if (P.smoke && budget >= 1) {
    const sm = [];
    for (const u of g.units) {
      if (u.side !== 'att' || !fighting(u) || G.row[u.sec] < B.outpost[0] || sm.length >= 2) continue;
      for (const d of [2, 6]) {
        let c = u.sec, hit = -1;
        for (let k = 0; k < 3; k++) { c = G.at(c, d); if (c < 0) break; if (mg.has(c)) { hit = c; break; } }
        if (hit >= 0) { const cell = G.at(u.sec, d); if (cell >= 0 && cell !== hit && !sm.includes(cell)) sm.push(cell); else if (!sm.includes(u.sec)) sm.push(u.sec); }
      }
    }
    budget -= assign(g, pool, sm.map(sec => ({ sec })), 1, budget, 'smoke', missions);
  }
  // Modern: precision on what it sees exactly (located batteries first); drones and EW over the main effort.
  if (E.precision && g.precision.att > 0) {
    const rk = pool.find(b => TYPES[b.type].arty === 'rocket');
    if (rk) {
      const loc = located(g, 'att', g.t - 1)[0];
      const ex = inf.pic.tracks.filter(t => t.exact && t.age === 0 && G.row[t.sec] > lead).sort((a, b) => b.est - a.est)[0];
      const target = loc ?? (ex ? ex.id : null), sec = ex && target === ex.id ? ex.sec : anySec(g, rk);
      if (target != null && sec >= 0) missions.push({ unit: rk.id, m: 'precision', sec, target });
    }
  }
  const mid = mem.main[Math.floor(mem.main.length / 2)];
  const ahead = G.idx(Math.min(G.rows - 2, Math.max(B.outpost[0], lead + 2)), mid);
  if (E.drones) droneSorties(g, 'att', inf, P.drones === 'spread' ? G.idx(G.row[ahead], (mid + g.t * 3) % G.cols) : ahead, actions);
  if (E.ew) for (const u of g.units) if (u.side === 'att' && u.type === 'ew' && u.sec >= 0 && !u.broken && u.str > 0) actions.push({ kind: 'jam', unit: u.id, sec: ahead });
  if (E.air) actions.push({ kind: 'air', side: 'att', sec: G.idx(Math.min(G.rows - 2, lead + 3), mid) });
  return { missions, actions };
}

/** Drone sorties for a side: two recon blocks around `focus`, two strikes on the best believed target in range. */
export function droneSorties(g, side, inf, focus, actions) {
  const G = gridFor(g.scale);
  const teams = g.units.filter(u => u.side === side && u.type === 'drone' && !u.broken && u.sec >= 0 && u.str > 0);
  if (!teams.length || focus < 0) return;
  const tracks = inf.pic.tracks.filter(t => t.age === 0);
  teams.forEach((u, i) => {
    const r1 = G.idx(G.row[focus], Math.max(0, G.col[focus] - 1 + 2 * (i % 2))), r2 = G.idx(Math.min(G.rows - 1, G.row[focus] + 2), G.col[focus]);
    for (const s of [r1, r2]) if (s >= 0 && G.dist(u.sec, s) <= DRONE.range) actions.push({ kind: 'drone', unit: u.id, m: 'recon', sec: s });
    let best = null, bs = 0;
    for (const t of tracks) {
      if (G.dist(u.sec, t.sec) > DRONE.range) continue;
      const v = t.est * (TYPES[t.type] && TYPES[t.type].cat === 'veh' ? 2 : 1) * (side === 'def' ? 1 + Math.max(0, G.row[focus] - G.row[t.sec]) / 4 : 1 + Math.max(0, G.row[t.sec] - G.row[focus]) / 4);
      if (v > bs) { bs = v; best = t; }
    }
    if (best) for (let k = 0; k < 2; k++) actions.push({ kind: 'drone', unit: u.id, m: 'strike', sec: best.sec });
  });
}

/** Defender missions and era actions. ctx: { axis: believed main-effort columns, lead: believed deepest row }. */
export function defenderFires(g, P, mem, inf, ctx) {
  const G = gridFor(g.scale), S = SCALES[g.scale], E = ERAS[g.era];
  const missions = [], actions = [];
  // Batteries whose SOS sectors see attackers fire SOS automatically (no delay); leave those free.
  const sos = b => b.sos && b.sos.some(s => g.spot.def[s] && inf.bel[s] > 0 && inRange(g, b, s));
  const pool = g.units.filter(b => b.side === 'def' && isBattery(b) && ready(g, b) && !sos(b));
  const hoursLeft = Math.max(1, g.turns - g.t);
  let budget = Math.max(0, Math.min(g.ammo.def, 1.5 * g.ammo.def / hoursLeft));
  if (P.cb === 'first') budget -= counterBattery(g, 'def', pool, missions, 2);
  const mine = new Uint8Array(G.n);
  for (const u of g.units) if (u.side === 'def' && fighting(u)) { mine[u.sec] = 2; for (const c of G.nbrs[u.sec]) mine[c] = Math.max(mine[c], 1); }
  const tg = [];
  for (const t of inf.pic.tracks) {
    if (t.est <= 0) continue;
    const v = t.est * (mine[t.sec] === 2 ? 1.5 : mine[t.sec] ? 2 : 1) * (g.lodg[t.sec] ? 1.5 : 1) * (ctx.axis.includes(G.col[t.sec]) ? 1.3 : 1);
    tg.push({ sec: t.sec, v });
  }
  // Gas (1917-18): attacker follow-on waves and reserves away from our own units.
  if (P.gas && E.gas && budget >= 4 && pool.length) {
    const far = inf.pic.tracks.filter(t => !mine[t.sec] && !g.gas[t.sec] && G.row[t.sec] <= ctx.lead).sort((a, b) => b.est - a.est || a.sec - b.sec);
    if (far.length) budget -= assign(g, pool, [{ sec: far[0].sec }], 1, budget, 'gas', missions);
  }
  const by = new Map();
  for (const t of tg) by.set(t.sec, (by.get(t.sec) || 0) + t.v);
  let targets = [...by.entries()].map(([sec, v]) => ({ sec, v })).sort((a, b) => b.v - a.v || a.sec - b.sec);
  if (P.fires === 'spread') targets = targets.filter((_, i) => i % 2 === g.t % 2);
  budget -= assign(g, pool, targets, P.fires === 'spread' ? 1 : 2, budget, 'suppress', missions);
  if (P.cb === true && budget > 2) budget -= counterBattery(g, 'def', pool, missions, 1);
  if (E.precision && g.precision.def > 0) {
    const rk = pool.find(b => TYPES[b.type].arty === 'rocket');
    const ex = inf.pic.tracks.filter(t => t.exact && t.age === 0 && G.row[t.sec] < S.bands.battle[0]).sort((a, b) => b.est - a.est)[0];
    const loc = located(g, 'def', g.t - 1)[0];
    if (rk && (loc != null || ex)) {
      const target = loc ?? ex.id, sec = loc != null ? anySec(g, rk) : ex.sec;
      if (sec >= 0) missions.push({ unit: rk.id, m: 'precision', sec, target });
    }
  }
  const mid = ctx.axis[Math.floor(ctx.axis.length / 2)];
  const watch = G.idx(Math.max(S.bands.nml[0], Math.min(G.rows - 1, ctx.lead - 1)), mid);
  if (E.drones) droneSorties(g, 'def', inf, P.drones === 'spread' ? G.idx(S.bands.nml[0], (mid + g.t * 3) % G.cols) : watch, actions);
  if (E.ew) for (const u of g.units) if (u.side === 'def' && u.type === 'ew' && u.sec >= 0 && !u.broken && u.str > 0) actions.push({ kind: 'jam', unit: u.id, sec: watch });
  if (E.air) actions.push({ kind: 'air', side: 'def', sec: G.idx(Math.max(1, ctx.lead - 2), mid) });
  return { missions, actions };
}
