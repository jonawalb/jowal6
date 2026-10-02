// Attacker hourly policy (SPEC §5.2-5.3). Formation-level decisions first (main effort, objective window,
// reserves, flank guards), then unit postures and routes; fire missions and era systems in js/ai/fires.js.
// Reads only the attacker's fogged picture (js/ai/influence.js), its own units and the public map. Profiles:
// modern-system assault (Standard/Hard: rush behind the barrage, leapfrog against live fire, infiltrate around
// strongpoints, follow success, flank guards A.7, consolidate on the objective) or massed waves (Easy).
import { SCALES } from '../../data/scales.js';
import { TYPES } from '../../data/units.js';
import { gridFor } from '../grid.js';
import { fighting, isCompany } from '../forces.js';
import { barrageRows } from '../arty.js';
import { raceClock } from '../counter.js';
import { influence, near } from './influence.js';
import { attackerFires } from './fires.js';

/** Remember who does what (from the plan at H-hour): fixers, first wave, reserves. */
function init(g, mem) {
  if (mem.roles) return;
  const G = gridFor(g.scale), S = SCALES[g.scale], plan = g.attPlan || {};
  mem.roles = {}; mem.pending = {}; mem.guards = { l: [], r: [] }; mem.lastCommit = -9;
  mem.main = (plan.mainCols && plan.mainCols.length ? plan.mainCols : [Math.floor(G.cols / 2) - 1, Math.floor(G.cols / 2)]).slice();
  mem.feint = plan.ai && plan.ai.feint ? plan.ai.feint : null;
  for (const o of plan.orders || []) {
    const fix = o.unit2 == null && G.row[o.to] === S.bands.nml[0] && !mem.main.includes(G.col[o.to]);
    const u = g.units[g.ix[o.unit]];
    mem.roles[o.unit] = fix && u && u.type === 'rifle' ? 'fix' : 'lead';
    if (o.unit2 != null) mem.roles[o.unit2] = 'lead';
  }
  for (const id of Object.keys(plan.engineers || {})) mem.roles[id] = 'eng';
  for (const u of g.units) if (u.side === 'att' && isCompany(u) && !mem.roles[u.id]) mem.roles[u.id] = u.type === 'tank' ? 'tank' : 'res';
}

/** The attacker's actions for this hour. P: a profile from js/ai/profiles.js. */
export function attackerPolicy(g, P) {
  const G = gridFor(g.scale), S = SCALES[g.scale], B = S.bands, objRow = S.obj.row, need = S.obj.need;
  const mem = ((g._ai ||= {}).att ||= {});
  init(g, mem);
  const inf = influence(g, 'att', P.latency);
  const acts = [];
  const coys = g.units.filter(u => u.side === 'att' && fighting(u));
  const rows = barrageRows(g), bar = g.barrage;
  const underBar = s => !!(bar && bar.cols.includes(G.col[s]) && rows.includes(G.row[s]));
  const hoursLeft = g.turns - g.t;
  // Progress per column (own units, excluding fixers).
  const prog = new Array(G.cols).fill(-1), str = new Array(G.cols).fill(0);
  let lead = B.assembly[1];
  for (const u of coys) {
    if (mem.roles[u.id] === 'fix') continue;
    const r = G.row[u.sec], c = G.col[u.sec];
    if (r > prog[c]) prog[c] = r;
    if (r >= B.outpost[0]) str[c] += u.str;
    if (r > lead) lead = r;
  }
  // 1. Main effort: shift to the deepest success every shiftEvery hours (Hard 2, Standard 4).
  const w = mem.main.length;
  if (P.shiftEvery && g.t > 0 && g.t % P.shiftEvery === 0 && w < G.cols) {
    let best = mem.main[0], bs = -Infinity;
    for (let c0 = 0; c0 + w <= G.cols; c0++) {
      let s = 0;
      for (let c = c0; c < c0 + w; c++) s += Math.max(0, prog[c] - B.nml[0]) * 3 + str[c] / 10 - inf.bel[G.idx(Math.min(G.rows - 1, prog[c] + 1), c)] / 10;
      if (c0 === mem.main[0]) s += 1;                 // inertia: only shift for a clearly better axis
      if (s > bs) { bs = s; best = c0; }
    }
    if (best !== mem.main[0]) {
      mem.main = Array.from({ length: w }, (_, i) => best + i);
      if (P.key === 'modernSystemPlus' && rows.length) acts.push({ kind: 'barrage', cols: mem.main.slice() });
    }
  }
  // 1b. Keep the creeping barrage just ahead of the infantry: if it has run two rows or more ahead of the lead in
  // the main effort, re-base it on the row in front of the lead (a runner in 1917-18, radio in Modern; SPEC §3.8).
  if ((P.resync === true || P.resync === g.era) && bar && rows.length && P.leapfrog && g.t - (mem.resync ?? -9) >= 3) {
    let ml = B.assembly[1];
    for (const c of mem.main) ml = Math.max(ml, prog[c]);
    if (rows[0] - ml >= 2 && ml + 1 < bar.stop) { mem.resync = g.t; acts.push({ kind: 'barrage', r0: ml + 1, cols: mem.main.slice() }); }
  }
  // 2. The objective window: `need` contiguous objective sectors where we are strongest and nearest.
  let win = null, ws = -Infinity;
  for (let c0 = 0; c0 + need <= G.cols; c0++) {
    let s = 0;
    for (let c = c0; c < c0 + need; c++) {
      const o = G.idx(objRow, c);
      s += inf.mine[o] * 2 + Math.max(0, prog[c]) * 2 + str[c] / 5 - inf.bel[o] + (mem.main.includes(c) ? 4 : 0);
    }
    if (s > ws) { ws = s; win = c0; }
  }
  const winCols = Array.from({ length: need }, (_, i) => win + i);
  const objSec = c => G.idx(objRow, c);
  const race = g.t > 0 ? raceClock(g, 'att', inf.pic) : null;
  // Lanes for the follow-on companies: the main effort and the objective window (plus a shoulder each side at
  // Corps/Army), filled evenly so the columns do not jam (at most 4 companies a sector).
  const span = [...mem.main, ...winCols], lo = Math.min(...span), hi = Math.max(...span);
  const lanes = [];
  const plus = P.lanesPlus && typeof P.lanesPlus === 'object' ? P.lanesPlus[g.scale] || 0 : P.lanesPlus || 0;
  const ext = P.lanes ?? (S.divs > 2 ? 2 : S.divs > 1 ? 1 : 0) + plus;
  for (let c = lo - ext; c <= hi + ext; c++) if (c >= 0 && c < G.cols) lanes.push(c);
  const load = new Array(G.cols).fill(0);
  for (const u of coys) if (mem.roles[u.id] !== 'fix' && G.row[u.sec] >= B.nml[0] && G.row[u.sec] < objRow) load[u.dest != null ? G.col[u.dest] : G.col[u.sec]]++;
  const pickCol = (c, not = -1) => {
    let best = lanes[0], bs = Infinity;
    for (const x of lanes) { const v = 2 * load[x] + Math.abs(x - c) + (winCols.includes(x) ? 0 : 2) + (x === not ? 99 : 0); if (v < bs) { bs = v; best = x; } }
    load[best]++;
    return best;
  };
  mem.blk ||= {};
  // 3. Unit postures and routes.
  const paired = new Set(), recent = id => mem.pending[id] != null && g.t - mem.pending[id] < 3;
  const order = (a) => { acts.push(a); mem.pending[a.unit] = g.t; if (a.unit2 != null) mem.pending[a.unit2] = g.t; };
  const safe = P.rushRule === 'loose' ? s => inf.bel[s] === 0 && inf.threat[s] < 4
    : P.rushRule === 'held' ? s => inf.bel[s] === 0
      : s => inf.bel[s] === 0 && inf.threat[s] < 1 && G.nbrs[s].every(c => inf.bel[c] === 0);
  const free = coys.filter(u => !(u.pinned > g.t) && !g.contest[u.sec]);
  for (const u of free) {
    const role = mem.roles[u.id] || 'res';
    if (role === 'fix' && g.t >= 2 && near(G, inf.bel, u.sec) === 0 && !u.path.length) mem.roles[u.id] = 'res';   // nothing left to pin
    if (role === 'fix' || role === 'eng' && u.breaching) continue;
    const r = G.row[u.sec], c = G.col[u.sec];
    if (r >= objRow) {
      // On the objective: hold the window, extend it sideways, consolidate (bite and hold, Biddle pp. 42-43).
      const run = winCols.filter(x => !(inf.mine[objSec(x)] >= 5));
      if (!winCols.includes(c) && run.length && !u.path.length && !recent(u.id)) { order({ kind: 'move', unit: u.id, to: objSec(run.sort((a, b) => Math.abs(a - c) - Math.abs(b - c))[0]) }); continue; }
      if (!u.path.length && P.consolidate && u.posture !== 'consolidate') acts.push({ kind: 'posture', unit: u.id, v: 'consolidate' });
      continue;
    }
    if (role === 'res' || role === 'guard' || role === 'tank') continue;     // handled below
    if (!u.path.length) {
      if (recent(u.id)) continue;
      const to = objSec(P.front === 'broad' ? c : pickCol(c));
      if (u.posture === 'infil') { order({ kind: 'move', unit: u.id, to }); continue; }
      const q = P.leapfrog && P.pairing !== false && partner(g, free, u, paired, mem);
      if (q) { paired.add(u.id); paired.add(q.id); order({ kind: 'leapfrog', unit: u.id, unit2: q.id, to, to2: to, bound: P.bound }); }
      else order({ kind: 'move', unit: u.id, to });
      continue;
    }
    if (u.posture === 'infil' || u.posture === 'consolidate' && u.path.length === 0) continue;
    // Rush only under this hour's barrage or across ground believed clear; leapfrog wherever fog may hide fire.
    const nx = u.path[0];
    // A jammed column: after two hours behind a full sector, take another lane.
    if (g.occ[nx].filter(v => v.side === 'att' && isCompany(v)).length >= 4) mem.blk[u.id] = (mem.blk[u.id] || 0) + 1; else mem.blk[u.id] = 0;
    if (mem.blk[u.id] >= 2 && !recent(u.id) && u.dest != null && u.pair == null && P.front !== 'broad') { mem.blk[u.id] = 0; order({ kind: 'move', unit: u.id, to: objSec(pickCol(c, G.col[u.dest])) }); }
    let want;
    if (!P.leapfrog) want = 'rush';
    else if (underBar(nx) || (((P.rushSafe === true || P.rushSafe === g.era) || g.ctrl[nx] === 2) && safe(nx))) want = 'rush';
    else if (u.pair != null) want = 'bound';
    else if (P.pairing === false) want = 'bound';
    else {
      // W3: an unpaired company bounds on its own (X 0.6) until it finds a partner, instead of rushing (X 1.0) into fire.
      want = 'bound';
      if (!recent(u.id) && !paired.has(u.id)) {
        const q = partner(g, free, u, paired, mem);
        if (q) { paired.add(u.id); paired.add(q.id); order({ kind: 'leapfrog', unit: u.id, unit2: q.id, to: u.dest ?? objSec(c), to2: u.dest ?? objSec(c), bound: P.bound }); want = null; }
      }
    }
    if (want && u.posture !== want && (want === 'rush' || u.pair != null || P.pairing === false || u.pair == null)) acts.push({ kind: 'posture', unit: u.id, v: want });
  }
  // 4. Reserves: follow success (Standard/Hard) or fed in on a timer (Easy).
  const idle = free.filter(u => mem.roles[u.id] === 'res' && !u.path.length && G.row[u.sec] <= B.nml[0] && !recent(u.id));
  const ready = P.reserves === 'timer' ? g.t - mem.lastCommit >= (P.timerEvery || 2) && g.t >= 1
    : (lead >= B.battle[0] || g.t >= 3) && g.t - mem.lastCommit >= 1;
  if (ready && idle.length) {
    mem.lastCommit = g.t;
    const deepest = mem.main.slice().sort((a, b) => prog[b] - prog[a] || a - b)[0];
    const batch = P.reserves === 'timer' ? idle.slice(0, 2) : idle;
    const left = batch.slice();
    let k = 0;
    while (left.length) {
      const u = left.shift();
      const col = P.reserves === 'timer' ? (k++ % G.cols) : pickCol(deepest);
      const to = objSec(col);
      mem.roles[u.id] = 'lead';
      if (P.infilReserves && TYPES[u.type].line) { acts.push({ kind: 'posture', unit: u.id, v: 'infil' }); order({ kind: 'move', unit: u.id, to }); continue; }
      const qi = P.leapfrog && P.pairing !== false ? left.findIndex(q => q.sec === u.sec || G.adj(q.sec, u.sec)) : -1;
      if (qi >= 0) { const q = left.splice(qi, 1)[0]; mem.roles[q.id] = 'lead'; order({ kind: 'leapfrog', unit: u.id, unit2: q.id, to, to2: to, bound: P.bound }); }
      else order({ kind: 'move', unit: u.id, to });
    }
  }
  // 5. Flank guards on each open shoulder of the penetration (Biddle A.7): one company per 2 rows.
  if (P.flankGuards) guards(g, P, mem, free, inf, lead, order, recent);
  // 6. Tanks move with the infantry (unsupported armor dies, Biddle p. 61).
  for (const u of free) {
    if (mem.roles[u.id] !== 'tank' || recent(u.id) || g.t < 1) continue;
    let best = -1, bs = 0;
    for (const v of coys) {
      if (v.type === 'tank' || mem.roles[v.id] === 'fix' || G.row[v.sec] < B.nml[0] || G.row[v.sec] >= objRow) continue;
      const s = inf.mine[v.sec] + 3 * near(G, inf.bel, v.sec) / 10 + G.row[v.sec];
      if (s > bs) { bs = s; best = v.sec; }
    }
    if (P.tanks === 'lead') best = objSec(G.col[u.sec]);
    if (best >= 0 && best !== u.sec && best !== u.dest) order({ kind: 'move', unit: u.id, to: best });
  }
  // 7. Consolidate in place when the race is lost and the lead is spent (limited aims, pp. 42-43).
  if (P.consolidate && race && race.first === 'cs' && hoursLeft > 4) {
    for (const u of free) if (!u.path.length && G.row[u.sec] < objRow && G.row[u.sec] >= B.battle[0] && (u.coh ?? 1) < 0.55 && u.posture !== 'consolidate') acts.push({ kind: 'posture', unit: u.id, v: 'consolidate' });
  }
  const fire = attackerFires(g, P, mem, inf, { lead, winCols });
  return { missions: fire.missions, actions: [...acts, ...fire.actions] };
}

/** A leapfrog partner: an unpaired company in the same or next sector, not assaulting, not a fixer. */
function partner(g, free, u, paired, mem) {
  const G = gridFor(g.scale);
  let best = null, bd = 9;
  for (const q of free) {
    if (q === u || q.pair != null || paired.has(q.id) || q.type === 'tank' || q.posture === 'infil') continue;
    const role = mem.roles[q.id];
    if (role === 'fix' || role === 'eng' || role === 'guard' || role === 'tank') continue;
    const d = q.sec === u.sec ? 0 : G.adj(q.sec, u.sec) ? 1 : 9;
    if (d < bd) { bd = d; best = q; }
  }
  return bd <= 1 ? best : null;
}

/** Flank guards: send idle reserves at the believed enfilade sources on each open shoulder. */
function guards(g, P, mem, free, inf, lead, order, recent) {
  const G = gridFor(g.scale), S = SCALES[g.scale], B = S.bands;
  const depth = lead - B.nml[1];
  const per = Math.min(3, Math.floor(depth / 2)) * P.flankGuards;
  if (per <= 0) return;
  const sides = { l: mem.main[0] - 1, r: mem.main[mem.main.length - 1] + 1 };
  for (const [k, col] of Object.entries(sides)) {
    if (col < 0 || col >= G.cols) continue;
    mem.guards[k] = mem.guards[k].filter(id => { const u = g.units[g.ix[id]]; return u && fighting(u); });
    // Target: the believed defender position on the shoulder closest behind the lead (an enfilade source).
    let tgt = -1, ts = 0;
    for (let r = B.outpost[0]; r <= Math.min(lead, S.obj.row); r++) { const s = G.idx(r, col); if (inf.bel[s] > ts) { ts = inf.bel[s]; tgt = s; } }
    if (tgt < 0) tgt = G.idx(Math.max(B.outpost[0], lead - 1), col);
    while (mem.guards[k].length < per) {
      const cand = free.filter(u => mem.roles[u.id] === 'res' && !u.path.length && !recent(u.id))
        .sort((a, b) => G.dist(a.sec, tgt) - G.dist(b.sec, tgt) || (a.id < b.id ? -1 : 1))[0];
      if (!cand) break;
      mem.roles[cand.id] = 'guard'; mem.guards[k].push(cand.id);
      order({ kind: 'move', unit: cand.id, to: tgt });
    }
    for (const id of mem.guards[k]) {
      const u = g.units[g.ix[id]];
      if (!u.path.length && u.sec !== tgt && !recent(id) && !g.contest[u.sec]) order({ kind: 'move', unit: id, to: tgt });
    }
  }
}
