// Attacker planning (SPEC §1.2): the plan object, its checklist, applying it, the H-hour orders it implies, and a
// basic modern-system plan (hurricane preparation, a creeping barrage on the main effort at 1 row an hour,
// leapfrog pairs in small groups, storm companies infiltrating, one company fixing each other column; Biddle
// pp. 33-38). The Standard AI planner (js/ai/plan-att.js, W2-AI) returns the same shape.
//
// plan = { mainCols: [c], fix: { col: 'fix' | 'quiet' }, place: { unitId: sec }, bn: { fmnId: { form, posture } },
//          form: { unitId }, posture: { unitId }, orders: [{ unit, to, unit2?, to2?, kind? }], routes: { unitId: [sec] },
//          prep: 'none' | 'hurricane' | 'methodical', predicted, prepTargets: [sec], c2,
//          barrage: { cols, r0, rate, bats: [id] }, bats: { id: 'barrage' | 'cb' | 'call' }, ds: { batteryId: fmnId },
//          reserves: { fmnId: { mode: 'assembly' | 'follow', hour } }, engineers: { unitId: sec }, objective: { type, row },
//          drones: { unitId: sec }, ew: { unitId: jamSec } }
import { STACK, PREP, SUPP } from '../data/params.js';
import { SCALES } from '../data/scales.js';
import { TYPES } from '../data/units.js';
import { gridFor } from './grid.js';
import { isBattery, isCompany } from './forces.js';
import { routeUnit } from './move.js';

const LIFTS = [0.5, 1, 1.5, 2];

/** Ammunition the plan commits before and during the first hours (preparation + one hour of barrage). */
export function prepCost(g, plan) {
  const bats = g.units.filter(u => u.side === 'att' && isBattery(u)).length;
  if (plan.prep === 'hurricane') return bats;
  if (plan.prep === 'methodical') return PREP.methodicalCost * Math.min((plan.prepTargets || []).length, PREP.sectorsPerGroup * Math.ceil(bats / PREP.groupSize));
  return 0;
}

/** The attacker's checklist: [{ id, level, ok, text }] (SPEC §1.2). */
export function checkAtt(g, plan) {
  const G = gridFor(g.scale), S = SCALES[g.scale], out = [];
  const main = plan.mainCols || [];
  const contiguous = main.length > 0 && main.every((c, i) => i === 0 || c === main[i - 1] + 1);
  out.push({ id: 'main', level: 'required', ok: contiguous, text: 'Main effort: a contiguous set of columns' });
  out.push({ id: 'narrow', level: 'warn', ok: main.length > 1, text: 'A one-column main effort invites enfilade from both shoulders' });
  const load = new Map();
  let placed = true;
  for (const u of g.units) {
    if (u.side !== 'att' || isBattery(u)) continue;
    const s = plan.place && plan.place[u.id] != null ? plan.place[u.id] : u.sec;
    if (!(s >= 0 && s < G.n) || G.row[s] > S.bands.assembly[1]) { placed = false; continue; }
    if (isCompany(u) && !(plan.attach && plan.attach[u.id] != null)) load.set(s, (load.get(s) || 0) + 1);
  }
  const over = [...load.values()].some(n => n > STACK.max);
  out.push({ id: 'placed', level: 'required', ok: placed && !over, text: over ? `At most ${STACK.max} companies per sector` : 'Every unit is in the assembly trenches' });
  const cost = prepCost(g, plan);
  out.push({ id: 'ammo', level: 'required', ok: cost <= g.ammo.att, text: `Preparation uses ${cost} of ${g.ammo.att} ammunition` });
  const b = plan.barrage;
  out.push({ id: 'barrage', level: 'warn', ok: !!(b && b.cols && b.cols.length && LIFTS.includes(b.rate)), text: 'A creeping barrage covers the main effort' });
  if (plan.prep === 'hurricane' && !plan.predicted) out.push({ id: 'predicted', level: 'warn', ok: false, text: 'Without predicted fire, registration warns the defender' });
  return out;
}

/**
 * Tanks with the infantry (SPEC §1.2 step 7: each tank attached to an infantry unit; §3.9; Biddle p. 61: tanks must
 * move with dismounted infantry). Each attacking tank starts in the sector of a first-wave rifle company (main effort
 * first, one tank to a company, spread over different sectors where possible) and moves with it (js/move.js).
 * Writes plan.attach { tankId: companyId } and plan.place; load: the planner's sector occupancy map.
 */
export function attachTanks(g, plan, load) {
  const G = gridFor(g.scale), main = plan.mainCols || [];
  plan.attach = {};
  const at = u => plan.place[u.id];
  const inf = g.units.filter(u => u.side === 'att' && u.role === 'wave1' && u.type === 'rifle' && at(u) != null && at(u) >= 0)
    .sort((a, b) => (main.includes(G.col[at(b)]) - main.includes(G.col[at(a)])) || at(a) - at(b));
  // An attached tank rides with its company: it does not count toward the stacking limit (STACK.max).
  const used = new Set(), secs = new Set();
  for (const t of g.units.filter(u => u.side === 'att' && u.type === 'tank')) {
    const e = inf.find(u => !used.has(u.id) && !secs.has(at(u))) || inf.find(u => !used.has(u.id));
    if (!e) break;
    used.add(e.id); secs.add(at(e)); plan.attach[t.id] = e.id;
    if (at(t) != null && load) load.set(at(t), Math.max(0, (load.get(at(t)) || 1) - 1));
    plan.place[t.id] = at(e);
    plan.orders = (plan.orders || []).filter(o => o.unit !== t.id);
  }
}

/** Apply an attacker plan: placement, formations and postures, batteries, barrage, objective. */
export function applyAttPlan(g, plan) {
  const G = gridFor(g.scale), S = SCALES[g.scale];
  const load = new Map();
  for (const u of g.units) {
    if (u.side !== 'att') continue;
    const s = plan.place ? plan.place[u.id] : undefined;
    const rides = plan.attach && plan.attach[u.id] != null;   // an attached tank rides with its company (not stacked)
    if (!isBattery(u) && s != null && s >= 0 && s < G.n && G.row[s] <= S.bands.assembly[1] && (!isCompany(u) || rides || (load.get(s) || 0) < STACK.max)) u.sec = s;
    if (isCompany(u) && u.sec >= 0 && !rides) load.set(u.sec, (load.get(u.sec) || 0) + 1);
    const bn = plan.bn && plan.bn[u.fmn[u.fmn.length - 1]];
    if (bn && bn.form) u.formation = bn.form;
    if (bn && bn.posture && bn.posture !== 'leapfrog') u.posture = bn.posture;
    if (plan.form && plan.form[u.id]) u.formation = plan.form[u.id];
    if (plan.posture && plan.posture[u.id]) u.posture = plan.posture[u.id];
    if (u.posture === 'infil') u.stealth = !!(TYPES[u.type].stealth || (u.trained && u.trained.AT2 >= 0.5));
    if (isBattery(u)) { u.role2 = plan.bats ? plan.bats[u.id] || 'call' : 'call'; if (plan.ds && plan.ds[u.id]) u.ds = plan.ds[u.id]; }
    if (u.type === 'ew' && plan.ew && plan.ew[u.id] != null) u.jam = plan.ew[u.id];
  }
  for (const [tid, eid] of Object.entries(plan.attach || {})) {
    const t = g.units[g.ix[tid]], e = g.units[g.ix[eid]];
    if (t && e && t.side === 'att' && e.side === 'att' && t.sec === e.sec) t.escort = e.id;
  }
  const b = plan.barrage;
  if (b && b.cols && b.cols.length) {
    const bats = (b.bats && b.bats.length ? b.bats : g.units.filter(u => u.side === 'att' && isBattery(u) && u.role2 === 'barrage').map(u => u.id));
    g.barrage = { cols: b.cols.filter(c => c >= 0 && c < G.cols), r0: b.r0 ?? S.bands.outpost[0], rate: LIFTS.includes(b.rate) ? b.rate : 1, h0: 0, bats, stop: b.stop ?? S.obj.row + 1 };
  }
  if (plan.objective && plan.objective.type === 'bite' && Number.isInteger(plan.objective.row)) g.biteRow = plan.objective.row;
  g.reserves = plan.reserves || {};
  g.attPlan = plan;
}

/** H-hour: the plan's first orders start at once (no order delay; they were written before zero hour). */
export function hHourOrders(g, plan) {
  for (const o of plan.orders || []) {
    const u = g.units[g.ix[o.unit]];
    if (!u || u.side !== 'att' || u.sec < 0) continue;
    if (o.unit2 != null) {
      const p = g.units[g.ix[o.unit2]];
      if (!p || p.sec < 0) continue;
      u.pair = p.id; p.pair = u.id; u.posture = p.posture = 'bound'; u.bound = p.bound = o.bound === 'long' ? 'long' : 'short';
      u.lfT0 = p.lfT0 = 0; u.lfOw = false; p.lfOw = true;
      routeUnit(g, u, o.to); routeUnit(g, p, o.to2 ?? o.to);
    } else {
      if (plan.routes && plan.routes[u.id] && plan.routes[u.id].length) { u.dest = o.to; u.path = plan.routes[u.id].slice(); }
      else routeUnit(g, u, o.to);
    }
  }
  for (const [id, sec] of Object.entries(plan.engineers || {})) { const u = g.units[g.ix[id]]; if (u) { routeUnit(g, u, sec); u.breaching = true; } }
}

/** A basic modern-system attack plan. Deterministic. */
export function defaultAttPlan(g) {
  const G = gridFor(g.scale), S = SCALES[g.scale], B = S.bands;
  const width = S.divs === 1 ? 2 : S.divs === 2 ? 3 : 4;
  const c0 = Math.floor((G.cols - width) / 2), mainCols = Array.from({ length: width }, (_, i) => c0 + i);
  const plan = { mainCols, place: {}, bn: {}, form: {}, posture: {}, orders: [], prep: 'hurricane', predicted: true, barrage: null, bats: {}, reserves: {}, objective: { type: 'breakthrough' }, ew: {} };
  const load = new Map();
  const put = (u, r, c) => {
    for (let k = 0; k < 4 * G.cols; k++) {
      const rr = k >= 2 * G.cols ? 1 - r : r, cc = Math.max(0, Math.min(G.cols - 1, c + (k % 2 ? -1 : 1) * Math.ceil((k % (2 * G.cols)) / 2))), s = G.idx(rr, cc);
      if ((load.get(s) || 0) < STACK.max) { load.set(s, (load.get(s) || 0) + 1); plan.place[u.id] = s; return s; }
    }
    return -1;
  };
  const att = g.units.filter(u => u.side === 'att' && !isBattery(u));
  const quiet = [];
  for (let c = 0; c < G.cols; c++) if (!mainCols.includes(c)) quiet.push(c);
  const objRow = S.obj.row;
  // Fixing attacks (Biddle's rho2, p. 47): one second-wave company per other column, holding in no-man's land
  // next to the outposts, so its fire pins them without assaulting.
  const fixers = att.filter(u => u.role === 'wave2' && u.type === 'rifle').slice(0, quiet.length);
  fixers.forEach((u, i) => { put(u, 1, quiet[i]); plan.form[u.id] = 'groups'; plan.orders.push({ unit: u.id, to: G.idx(B.nml[0], quiet[i]) }); });
  const fixing = new Set(fixers.map(u => u.id));
  let mi = 0;
  const byBn = new Map();
  for (const u of att) {
    if (fixing.has(u.id)) continue;
    const c = mainCols[mi++ % mainCols.length];
    plan.form[u.id] = 'groups';
    if (u.role === 'storm') { put(u, 1, c); plan.posture[u.id] = 'infil'; plan.orders.push({ unit: u.id, to: G.idx(objRow, c) }); continue; }
    if (u.role === 'wave1') { put(u, 1, c); const bn = u.fmn[u.fmn.length - 1]; if (!byBn.has(bn)) byBn.set(bn, []); byBn.get(bn).push(u); continue; }
    put(u, 0, c);
    if (u.role === 'mortar') plan.orders.push({ unit: u.id, to: G.idx(B.nml[0], c) });
  }
  // Leapfrog pairs inside each first-wave battalion (rifle + rifle, rifle + MG on overwatch).
  let k = 0;
  for (const list of byBn.values()) {
    const ord = [...list.filter(u => u.type !== 'mg'), ...list.filter(u => u.type === 'mg')];
    for (let j = 0; j + 1 < ord.length; j += 2) {
      const to = G.idx(objRow, mainCols[k++ % mainCols.length]);
      plan.orders.push({ unit: ord[j].id, unit2: ord[j + 1].id, to, to2: to });
    }
    if (ord.length % 2) plan.orders.push({ unit: ord[ord.length - 1].id, to: G.idx(objRow, mainCols[k++ % mainCols.length]) });
  }
  attachTanks(g, plan, load);
  const bats = g.units.filter(u => u.side === 'att' && isBattery(u));
  const nb = Math.max(1, Math.ceil(bats.length / 2));
  bats.forEach((b, i) => { plan.bats[b.id] = i < nb ? 'barrage' : 'call'; });
  plan.barrage = { cols: mainCols, r0: B.outpost[0], rate: 1, bats: bats.slice(0, nb).map(b => b.id) };
  for (const f of Object.values(g.fmns)) if (f.side === 'att' && f.role === 'echelon2') plan.reserves[f.id] = { mode: 'follow', hour: 4 };
  for (const u of g.units) if (u.side === 'att' && u.type === 'ew') plan.ew[u.id] = G.idx(B.battle[0], mainCols[0]);
  if (SUPP.costs.barrage * nb * g.turns > g.ammo.att) plan.barrage.stop = Math.min(objRow + 1, B.outpost[0] + Math.floor(g.ammo.att / nb) - 2);
  return plan;
}
