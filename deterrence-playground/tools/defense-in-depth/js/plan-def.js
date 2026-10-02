// Defender planning (SPEC §1.2): the plan object, its validity checklist, applying it to a game, and a basic
// doctrinal layout (thin outposts, elastic battle zone, MGs on the flanks with lateral lanes, the counterstroke
// formation in the rear zone). The Standard AI planner (js/ai/plan-def.js, W2-AI) builds better plans in the
// same shape; the player's Plan pane edits the same object.
//
// plan = { works: [{ sec, kind, axis? }], place: { unitId: sec }, lanes: { unitId: dir }, stance: { unitId: stance },
//          cs: fmnId, csTargets: [sec], sos: { batteryId: [sec, sec] }, cbPriority: 'located' | 'none',
//          drones: { unitId: sec }, ew: { unitId: jamSec }, air: [sec], posture: { unitId: posture }, form: { unitId: 'waves' | 'groups' } }
import { WORKS } from '../data/terrain.js';
import { STACK } from '../data/params.js';
import { SCALES } from '../data/scales.js';
import { TYPES } from '../data/units.js';
import { gridFor, laneCells } from './grid.js';
import { isBattery, isCompany } from './forces.js';
import { layLane } from './fire.js';

/** Work points a plan spends (concrete needs a strongpoint in the same sector). */
export const wpSpent = plan => (plan.works || []).reduce((s, w) => s + (WORKS[w.kind] ? WORKS[w.kind].wp : 0), 0);

/** Rear-zone share of infantry strength (Biddle's f_r) and outpost + first-row share for a placement. */
export function zoneShares(g, place) {
  const G = gridFor(g.scale), S = SCALES[g.scale];
  let tot = 0, rear = 0, fwd = 0, out = 0, battle = 0;
  for (const u of g.units) {
    if (u.side !== 'def' || !TYPES[u.type].fp || !isCompany(u)) continue;
    const s = place[u.id] ?? u.sec;
    if (s < 0) continue;
    tot += u.str0;
    const r = G.row[s];
    if (r >= S.obj.row) rear += u.str0;
    if (G.zone[s] === 'outpost' || r === S.bands.battle[0]) fwd += u.str0;
    if (G.zone[s] === 'outpost') out += u.str0; else if (r < S.obj.row) battle += u.str0;
  }
  return { fr: tot ? rear / tot : 0, fwd: tot ? fwd / tot : 0, outpost: tot ? out / tot : 0, battle: tot ? battle / tot : 0, rear: tot ? rear / tot : 0 };
}

/**
 * The validity checklist (SPEC §1.2): [{ id, level: 'required' | 'warn' | 'info', ok, text }]. The battle can
 * start when every 'required' item is ok.
 */
export function checkDef(g, plan) {
  const G = gridFor(g.scale), S = SCALES[g.scale], out = [];
  const wp = wpSpent(plan);
  out.push({ id: 'wp', level: 'required', ok: wp <= S.wp, text: `Works: ${wp} of ${S.wp} work points` });
  const load = new Map();
  let placed = true;
  for (const u of g.units) {
    if (u.side !== 'def') continue;
    const s = plan.place && plan.place[u.id] != null ? plan.place[u.id] : u.sec;
    if (!(s >= 0 && s < G.n) || G.row[s] < S.bands.outpost[0]) { placed = false; continue; }
    if (isCompany(u)) load.set(s, (load.get(s) || 0) + 1);
  }
  const over = [...load.values()].some(n => n > STACK.max);
  out.push({ id: 'placed', level: 'required', ok: placed && !over, text: over ? `At most ${STACK.max} companies per sector` : placed ? 'Every unit is placed behind the outpost line' : 'Place every unit in your zones' });
  out.push({ id: 'cs', level: 'required', ok: !!(plan.cs && g.fmns[plan.cs] && g.fmns[plan.cs].side === 'def'), text: 'Counterstroke formation designated' });
  const mgs = g.units.filter(u => u.side === 'def' && u.type === 'mg');
  const laned = mgs.filter(u => plan.lanes && plan.lanes[u.id] != null).length;
  out.push({ id: 'lanes', level: 'warn', ok: laned === mgs.length, text: `Every MG company has a fire lane (${laned} of ${mgs.length})` });
  const z = zoneShares(g, plan.place || {});
  out.push({ id: 'forward', level: 'warn', ok: z.fwd <= 0.5, text: `Forward density ${Math.round(100 * z.fwd)}%: dense front lines die to bombardment` });
  const bats = g.units.filter(u => u.side === 'def' && isBattery(u));
  out.push({ id: 'sos', level: 'warn', ok: bats.every(b => plan.sos && plan.sos[b.id] && plan.sos[b.id].length), text: 'Every battery has SOS sectors' });
  out.push({ id: 'fr', level: 'info', ok: true, text: `f_r = ${z.fr.toFixed(2)} (rear-zone share of infantry strength)` });
  return out;
}
export const planReady = list => list.every(x => x.level !== 'required' || x.ok);

/** Apply a defender plan to a game in the planning phase. Invalid entries are skipped, never thrown. */
export function applyDefPlan(g, plan) {
  const G = gridFor(g.scale), S = SCALES[g.scale], f = g.sectors.feat;
  let wp = S.wp;
  for (const w of plan.works || []) {
    const W = WORKS[w.kind];
    if (!W || !(w.sec >= 0 && w.sec < G.n) || G.row[w.sec] < S.bands.outpost[0] || wp < W.wp) continue;
    if (w.kind === 'concrete' && !f.strong[w.sec]) continue;
    wp -= W.wp;
    if (w.kind === 'trench') f.trench[w.sec] = w.axis === 'ns' ? 2 : 1;
    else if (w.kind === 'comm') f.comm[w.sec] = 1;
    else if (w.kind === 'obst' || w.kind === 'obstC') { f.obst[w.sec] = 1; f.obstC[w.sec] = w.kind === 'obstC' ? 1 : 0; }
    else if (w.kind === 'strong') f.strong[w.sec] = Math.max(1, f.strong[w.sec]);
    else if (w.kind === 'concrete') f.strong[w.sec] = 2;
    else if (w.kind === 'dugout') f.dugout[w.sec] = 1;
    else if (w.kind === 'dummy') f.dummy[w.sec] = 1;
  }
  g.wpLeft = wp;
  const load = new Map();
  for (const u of g.units) {
    if (u.side !== 'def') continue;
    const s = plan.place ? plan.place[u.id] : undefined;
    if (s != null && s >= 0 && s < G.n && G.row[s] >= S.bands.outpost[0] && (!isCompany(u) || (load.get(s) || 0) < STACK.max)) u.sec = s;
    if (isCompany(u) && u.sec >= 0) load.set(u.sec, (load.get(u.sec) || 0) + 1);
    if (plan.stance && plan.stance[u.id]) u.stance = plan.stance[u.id];
    if (plan.posture && plan.posture[u.id]) u.posture = plan.posture[u.id];
    if (plan.form && plan.form[u.id]) u.formation = plan.form[u.id];
    if (u.type === 'mg' && plan.lanes && plan.lanes[u.id] != null) { u.lane = plan.lanes[u.id]; layLane(g, u); }
    if (isBattery(u) && plan.sos && plan.sos[u.id]) u.sos = plan.sos[u.id].slice(0, 2).filter(s => s >= 0 && s < G.n);
    if (u.type === 'ew' && plan.ew && plan.ew[u.id] != null) u.jam = plan.ew[u.id];
    if (u.type === 'drone' && plan.drones && plan.drones[u.id] != null) u.patrol = plan.drones[u.id];
  }
  g.csFmn = plan.cs && g.fmns[plan.cs] ? plan.cs : g.csFmn;
  g.cbPriority = { ...(g.cbPriority || {}), def: plan.cbPriority || 'located' };
}

/** A basic doctrinal defender plan (thin forward, strong in depth). Deterministic; no randomness. */
export function defaultDefPlan(g) {
  const G = gridFor(g.scale), S = SCALES[g.scale], B = S.bands;
  const plan = { works: [], place: {}, lanes: {}, stance: {}, sos: {}, cs: null, cbPriority: 'located', ew: {}, drones: {}, form: {} };
  const load = new Map();
  const put = (u, r, c) => {
    for (let k = 0; k < G.cols * 2; k++) {
      const cc = Math.max(0, Math.min(G.cols - 1, c + (k % 2 ? -1 : 1) * Math.ceil(k / 2))), s = G.idx(r, cc);
      if (!isCompany(u) || (load.get(s) || 0) < 2 + (k > G.cols ? 2 : 0)) { if (isCompany(u)) load.set(s, (load.get(s) || 0) + 1); plan.place[u.id] = s; return s; }
    }
    return plan.place[u.id] = G.idx(r, c);
  };
  const nd = S.divs, band = k => (k < 0 ? [0, G.cols] : [Math.floor(k * G.cols / nd), Math.floor((k + 1) * G.cols / nd)]);
  const counters = new Map();
  const nth = key => { const n = counters.get(key) || 0; counters.set(key, n + 1); return n; };
  const units = g.units.filter(u => u.side === 'def');
  for (const u of units) {
    const [c0, c1] = band(u.div), w = c1 - c0, i = nth(`${u.div}:${u.role}`), mid = Math.floor((c0 + c1 - 1) / 2);
    const spread = (j, n) => c0 + Math.min(w - 1, Math.floor((j + 0.5) * w / Math.max(1, n)));
    switch (u.role) {
      case 'outpost': { const s = put(u, B.outpost[0] + (u.type === 'mg' ? 1 : 0), u.type === 'mg' ? c0 : spread(i, 3)); plan.stance[u.id] = 'delay'; if (u.type === 'mg') plan.lanes[u.id] = 2; break; }
      case 'front': { put(u, B.battle[0] + 1, u.type === 'mg' ? c1 - 1 : spread(i, 3)); plan.stance[u.id] = 'elastic'; if (u.type === 'mg') plan.lanes[u.id] = 6; break; }
      case 'depth': { put(u, G.crest + 1, u.type === 'mg' ? c0 : spread(i, 3)); plan.stance[u.id] = 'riposte'; if (u.type === 'mg') plan.lanes[u.id] = 2; break; }
      case 'strong': { const s = put(u, B.battle[0] + 2, i % 2 ? c1 - 1 : c0); plan.lanes[u.id] = i % 2 ? 6 : 2; plan.stance[u.id] = 'hold'; plan.works.push({ sec: s, kind: 'strong' }); break; }
      case 'cs': { put(u, B.switch ? B.switch[0] + (i % 2) : S.obj.row + 1 + (i % 2), mid + (i % 3) - 1); plan.stance[u.id] = 'reserve'; plan.form[u.id] = 'groups'; if (u.type === 'mg') plan.lanes[u.id] = 0; break; }
      case 'corpsCs': case 'armyRes': {
        plan.form[u.id] = 'groups';
        const r0 = u.role === 'armyRes' ? (S.reserveRows ? S.reserveRows[0] : S.obj.row + 6) : B.second ? B.second[0] + 1 : S.obj.row + 2;
        const fk = Object.values(g.fmns).filter(f => f.side === 'def' && f.role === u.role).map(f => f.id);
        const which = Math.max(0, fk.indexOf(u.fmn.find(f => fk.includes(f))));
        const c0 = fk.length > 1 ? Math.floor((which + 0.5) * G.cols / fk.length) : Math.floor(G.cols / 2);
        put(u, Math.min(G.rows - 2, r0 + (i % 2)), c0 + (i % 5) - 2); plan.stance[u.id] = 'reserve'; if (u.type === 'mg') plan.lanes[u.id] = 0; break; }
      case 'mortar': put(u, G.crest, mid); plan.stance[u.id] = 'hold'; break;
      case 'team': put(u, S.obj.row + 2, mid); break;
      default: put(u, Math.min(G.rows - 1, S.obj.row + 3 + (i % 3)), c0 + (i % Math.max(1, w)));   // batteries
    }
    if (isBattery(u)) {
      const c = G.col[plan.place[u.id]];
      plan.sos[u.id] = [G.idx(B.outpost[0], c), G.idx(B.battle[0], c)];
    }
    if (u.type === 'ew') plan.ew[u.id] = G.idx(B.battle[0], mid);
    if (u.type === 'drone') plan.drones[u.id] = G.idx(B.outpost[0], mid);
  }
  // Counterstroke formation: the division's group (Division) or the corps/army formation.
  const fm = Object.values(g.fmns).filter(f => f.side === 'def' && f.cs);
  plan.cs = (fm.find(f => f.role === 'corpsCs') || fm[0] || {}).id || null;
  // Campaign context (data/campaign.js): a dense-forward layout pulls front and depth companies up to the first
  // battle-zone row until defForwardShare of the infantry is forward (Hunzeker pp. 55, 80: the old way).
  const share = g.ctx && g.ctx.defForwardShare;
  if (share) {
    const movable = units.filter(u => (u.role === 'front' || u.role === 'depth' || u.role === 'strong' || u.role === 'mortar') && G.row[plan.place[u.id]] > B.battle[0])
      .sort((a, b) => G.row[plan.place[a.id]] - G.row[plan.place[b.id]]);
    for (const u of movable) {
      if (zoneShares(g, plan.place).fwd >= share) break;
      put(u, B.battle[0], G.col[plan.place[u.id]]);
      plan.stance[u.id] = 'hold';
    }
  }
  // Works: wire in front of the outposts, dugouts in the first trench rows, until the budget runs out.
  let wp = S.wp - plan.works.reduce((s, w) => s + WORKS[w.kind].wp, 0);
  const add = (sec, kind) => { if (sec >= 0 && wp >= WORKS[kind].wp && !plan.works.some(w => w.sec === sec && w.kind === kind)) { plan.works.push({ sec, kind }); wp -= WORKS[kind].wp; } };
  for (let c = 0; c < G.cols; c++) add(G.idx(B.outpost[0], c), 'obst');
  for (const s of Object.values(plan.place)) if (G.row[s] >= B.battle[0] && G.row[s] <= B.battle[1]) add(s, 'dugout');
  // W3: concealed wire inside the lateral MG lanes, so the wire holds attackers where the lanes sweep them
  // (Hunzeker pp. 54, 80); what is left goes on every second sector of the first battle-zone row.
  for (const u of units) {
    const d = plan.lanes[u.id], s0 = plan.place[u.id];
    if (u.type !== 'mg' || (d !== 2 && d !== 6) || s0 == null || G.row[s0] > B.battle[1]) continue;
    for (const c of laneCells(G, g.sectors.elev, s0, d).slice(1, 2)) add(c, 'obstC');
  }
  for (let c = 0; c < G.cols; c += 2) add(G.idx(B.battle[0] + 1, c), 'obstC');
  return plan;
}
