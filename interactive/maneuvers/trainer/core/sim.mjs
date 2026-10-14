// Maneuver Trainer core: the fixed-step simulation (dt = 0.1 s of game time).
// createSim(scenario, { seed, plan, mode, orderDelay }) → sim
//   sim.step(dt)              advance dt seconds (runs whole 0.1 s ticks)
//   sim.runTurn(seconds)      Medium (WEGO): run one turn, return state()
//   sim.run(maxSeconds)       run to the end (tests, Easy fast-forward)
//   sim.issue(unitId, order)  give an order now (Hard + company: after a notional 10–20 s delay)
//   sim.state()               everything a renderer / UI needs (see README.md)
//   sim.done()                null, or { reason, tier, t }
//   sim.score(), sim.aar()    see scoring.mjs, aar.mjs
// Everything is notional (see NOTIONAL in units.mjs). Pure; no DOM.

import { makeRng, hashStr } from "./rng.mjs";
import { buildTerrain } from "./terrain.mjs";
import { NOTIONAL as N, makeElement, offsetsFor, weapon } from "./units.mjs";
import { compilePlan, normaliseOrder, ORDER_LABELS, TECHNIQUES } from "./orders.mjs";
import { aiTick } from "./enemy.mjs";
import { scoreRun } from "./scoring.mjs";
import { buildAAR } from "./aar.mjs";

const RAD = Math.PI / 180;
export const fireShare = (deg) => N.fireShare.floor + (1 - N.fireShare.floor) * Math.pow((1 + Math.cos(deg * RAD)) / 2, 3);
const angDiff = (a, b) => { let d = ((a - b) % 360 + 540) % 360 - 180; return Math.abs(d); };
const bearing = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax) / RAD;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const EYE = { stand: 1.7, kneel: 1.1, crouch: 0.8, prone: 0.4, hole: 0.8, building: 3, veh: 2.5 };
const INSTANT = new Set(["lift", "shift", "smoke", "callfire"]); // actions: never replace the current order
export const fmtClock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export function createSim(scen, opts = {}) {
  const seed = opts.seed ?? 1;
  const rng = makeRng(seed * 7919 + hashStr(scen.id));
  const T = buildTerrain(scen.terrain);
  const limited = T.light === "limited";
  const S = {
    scen, T, rng, seed, mode: opts.mode || "easy", t: 0, tick: 0, els: [], byId: {}, soldiers: [],
    know: { f: {}, h: {} }, smoke: [], lanes: (scen.terrain.crossings || []).map((c) => ({ ...c, fixed: true })), missions: [], flags: {}, events: [], metrics: { assaults: [], exposedOpen: 0, detectedAt: null, firstShotAt: null, sbfSetAt: {}, lifted: {} },
    pending: [], done: null, planId: null, fireCalls: { f: scen.fires?.f?.calls ?? 0, h: scen.fires?.h?.calls ?? 0 },
  };
  const orderDelay = opts.orderDelay ?? (S.mode === "hard" && scen.level === "company" ? N.hardDelay : null);

  // ---- forces ----
  for (const spec of [...scen.forces.friendly.map((e) => ({ ...e, side: "f" })), ...scen.forces.enemy.map((e) => ({ ...e, side: "h" }))]) {
    const el = makeElement(spec);
    S.els.push(el); S.byId[el.id] = el; S.soldiers.push(...el.soldiers);
  }
  S.sById = Object.fromEntries(S.soldiers.map((x) => [x.id, x]));
  const friendlyCore = () => S.els.filter((e) => e.side === "f" && !e.ally);
  S.totalF = friendlyCore().reduce((n, e) => n + e.size, 0);
  S.totalH = S.els.filter((e) => e.side === "h").reduce((n, e) => n + e.size, 0);

  const log = (type, text, extra = {}) => { S.events.push({ t: +S.t.toFixed(1), clock: fmtClock(S.t), type, text, ...extra }); };
  const nameOf = (id) => S.byId[id]?.name || id;

  // ---- plans and scripted enemy ----
  const loadSteps = (map) => {
    for (const [id, steps] of Object.entries(map)) {
      const el = S.byId[id];
      if (!el) continue;
      el.steps = steps.filter((s) => !s.parallel).map((s) => ({ ...s, done: false }));
      el.actions = steps.filter((s) => s.parallel).map((s) => ({ ...s, done: false }));
      el.si = -1;
    }
  };
  let plan = null;
  if (opts.plan) {
    plan = typeof opts.plan === "string" ? scen.plans.find((p) => p.id === opts.plan) : opts.plan;
    if (!plan) throw new Error(`no plan ${opts.plan} in ${scen.id}`);
    S.planId = plan.id; S.plan = plan;
    loadSteps(compilePlan(scen, plan));
  }
  if (scen.enemyPlan) loadSteps(compilePlan(scen, scen.enemyPlan));
  if (scen.allyPlan) loadSteps(compilePlan(scen, scen.allyPlan));

  // ---- order handling ----
  const startOrder = (el, order) => {
    const o = normaliseOrder(order, el);
    if (o.type === "follow") o.route = null;
    el.order = o; el.arrived = false; el.complete = false; el.lifted = false; el.sbfT = null; el.breachT = 0; el.lookI = 0; el.dwell = 0;
    el.blocked = false; el.holdT = null; el.boundState = null; el.boundFirst = !!o.first; el.dwell = 0;
    if (o.route) {
      // join the route at the nearest point ahead of the element, then follow the rest of it
      let bi = 0, bd = Infinity;
      for (let i = 0; i < o.route.length - 1; i++) {
        const [ax, ay] = o.route[i], [bx, by] = o.route[i + 1];
        const L = (bx - ax) ** 2 + (by - ay) ** 2;
        const u = L ? Math.max(0, Math.min(1, ((el.x - ax) * (bx - ax) + (el.y - ay) * (by - ay)) / L)) : 0;
        const d = dist(el.x, el.y, ax + u * (bx - ax), ay + u * (by - ay));
        if (d < bd - 1e-6) { bd = d; bi = i; }
      }
      el.path = [[el.x, el.y], ...o.route.slice(bi + 1)]; el.seg = 0;
    } else el.path = null;
    if (el.slots && o.route && dist(el.x, el.y, o.route[o.route.length - 1][0], o.route[o.route.length - 1][1]) > 3) el.slots = null;
    if (o.formation) el.formation = o.formation;
    el.task = taskLabel(el);
  };
  const runAction = (el, a) => {
    if (a.type === "lift") {
      if (!el.lifted) { el.lifted = true; S.metrics.lifted[el.id] = S.t; log("lift", `${el.name} lifts fire: stops firing and stays in position`, { el: el.id }); }
    } else if (a.type === "shift") {
      if (el.order) el.order.target = a.target;
      log("shift", `${el.name} shifts fire to ${nameOf(a.target)}`, { el: el.id });
    } else if (a.type === "smoke") {
      if (el.smoke > 0 && aliveCount(el) > 0) {
        el.smoke--;
        const b = bearing(el.x, el.y, a.at[0], a.at[1]), d = Math.min(40, dist(el.x, el.y, a.at[0], a.at[1]));
        const x = el.x + Math.cos(b * RAD) * d, y = el.y + Math.sin(b * RAD) * d;
        S.smoke.push({ x, y, r: N.smokeGrenade.r, t0: S.t + N.smokeGrenade.delay, life: N.smokeGrenade.life, side: el.side });
        log("smoke", `${el.name} throws smoke`, { el: el.id });
      }
    } else if (a.type === "callfire") {
      const mortar = S.els.find((e) => e.side === el.side && e.kind === "mortar" && aliveCount(e) > 0);
      const at = posOf(a.at); // a point, or an element id: fire on where that element is now
      if (!at || (!mortar && S.fireCalls[el.side] <= 0)) return;
      if (!mortar) S.fireCalls[el.side]--;
      const kind = a.kind || "he", dur = a.dur ?? (kind === "smoke" ? 90 : 50);
      S.missions.push({ side: el.side, from: mortar ? mortar.id : null, at: [at[0], at[1]], kind, t0: S.t + N.mortar.delay, until: S.t + N.mortar.delay + dur });
      log("fire", `${el.name} calls for fire: ${kind === "smoke" ? "smoke" : "HE"} ${mortar ? "from the mortar section" : "from higher (notional)"}`, { el: el.id, side: el.side });
    }
  };
  const advanceSteps = (el, force) => {
    // start next step if its trigger is true (or untriggered and the current step is complete)
    const next = el.steps[el.si + 1];
    if (!next) return;
    const ok = next.trigger ? evalTrig(next.trigger, el) : (el.si < 0 || el.complete || force);
    if (ok) {
      el.si++;
      if (next.order.type === "lift" || next.order.type === "shift" || next.order.type === "smoke" || next.order.type === "callfire") { runAction(el, next.order); el.complete = true; advanceSteps(el); return; }
      startOrder(el, next.order);
    }
  };

  // ---- triggers ----
  const centroid = (el) => {
    let x = 0, y = 0, n = 0;
    for (const s of el.soldiers) if (s.status === "ok" && !s.carry) { x += s.x; y += s.y; n++; }
    if (!n) { el.cx = el.x; el.cy = el.y; return 0; }
    el.cx = x / n; el.cy = y / n; return n;
  };
  const fighting = (el) => el.soldiers.reduce((n, s) => n + (s.status === "ok" && !s.carry ? 1 : 0), 0);
  const aliveCount = (el) => el.soldiers.reduce((n, s) => n + (s.status === "ok" ? 1 : 0), 0);
  const posOf = (t) => (Array.isArray(t) ? t : (S.byId[t] ? [S.byId[t].cx ?? S.byId[t].x, S.byId[t].cy ?? S.byId[t].y] : null));
  const evalTrig = (tr, el) => {
    switch (tr.when) {
      case "start": return true;
      case "time": return S.t >= tr.t;
      case "arrived": { const e = S.byId[tr.el]; return !!e && (e.arrived || fighting(e) === 0); }
      case "sbfSet": return S.metrics.sbfSetAt[tr.el] != null || fighting(S.byId[tr.el]) === 0;
      case "cleared": return !!S.flags[`cleared:${tr.target}`];
      case "near": { const e = S.byId[tr.el]; if (!e || aliveCount(e) === 0) return false; const p = posOf(tr.target); return !!p && dist(e.cx ?? e.x, e.cy ?? e.y, p[0], p[1]) <= tr.dist; }
      case "enemyNear": {
        const side = el ? el.side : "f";
        for (const e of S.els) {
          if (e.side === side || !(e.ok > 0)) continue;
          if (dist(e.cx, e.cy, tr.at[0], tr.at[1]) > tr.dist + 90) continue; // whole element too far
          for (const s of e.soldiers) if (s.status === "ok" && dist(s.x, s.y, tr.at[0], tr.at[1]) <= tr.dist) return true;
        }
        return false;
      }
      case "order": { const e = S.byId[tr.el]; return !!e && aliveCount(e) > 0 && e.order?.type === tr.type; }
      case "flag": return !!S.flags[tr.name];
      case "lane": return S.lanes.length > 0;
      case "all": return tr.of.every((x) => evalTrig(x, el));
      case "any": return tr.of.some((x) => evalTrig(x, el));
      default: return false;
    }
  };

  const taskLabel = (el) => {
    const o = el.order;
    if (!o) return "Hold";
    if (el.stalled) return "Gone to ground (assault stalled)";
    if (el.pinned) return "Pinned (suppressed)";
    if (o.label) return o.label;
    if (o.type === "sbf") return el.lifted ? "Fire lifted: holding, not firing" : el.arrived ? "Support by fire" : "Moving to support-by-fire position";
    if (o.type === "breach") return el.complete ? "Lane open: securing" : el.arrived ? "Breaching" : "Moving to breach point";
    if (o.type === "assault") return el.inAssault ? "Assaulting (squad line)" : "Assault";
    if (o.type === "move" || o.type === "bypass") {
      if (el.arrived) return "In position";
      if (el.inContact) return "Fire and movement (in contact)";
      return `${ORDER_LABELS[o.type]} (${TECHNIQUES[o.technique || "travelling"] || o.technique})`;
    }
    if (o.type === "withdraw") return el.arrived ? "At rally point" : o.method === "alternating" ? "Breaking contact (alternating bounds)" : "Breaking contact (all at once)";
    return ORDER_LABELS[o.type] || o.type;
  };

  // ---- movement (every tick) ----
  const speedOf = (el) => {
    const o = el.order;
    if (!o || !el.path || el.arrived) return 0;
    if (el.stalled || el.blocked) return 0;
    const finalAssault = (o.type === "assault" || o.type === "counterattack");
    let tech = o.technique || "travelling";
    const tgt = finalAssault ? S.byId[el.curTarget || o.target] : null;
    const dT = tgt ? dist(el.x, el.y, tgt.cx ?? tgt.x, tgt.cy ?? tgt.y) : Infinity;
    if (finalAssault && (dT < 90 || o.type === "counterattack")) tech = o.type === "counterattack" ? (o.technique || "rush") : "assault";
    let v = el.vehicle ? N.speed.vehicle : (N.speed[tech] ?? N.speed.travelling);
    if (o.type === "withdraw") v = o.method === "run" ? N.speed.rush : N.speed.withdraw;
    const closing = dT < 60;
    if (el.pinned && o.displace) return v * N.displacePinned; // a delay displacing on a covered route keeps moving
    if (el.pinned && !(closing && el.supp < N.pinAssault)) return finalAssault ? 0 : N.speed.crawl;
    if (el.inContact && !closing && !(o.type === "withdraw" && o.method === "run")) v *= N.contactSlow;
    const c = T.cover(el.x, el.y);
    if (c.woods) v *= N.woodsSlow; else if (c.bed) v *= N.bedSlow;
    return v;
  };
  const moveEl = (el, dt) => {
    const o = el.order;
    if (!o) return;
    if (o.type === "follow") {
      const lead = S.byId[o.el];
      if (lead && aliveCount(lead) > 0 && dist(el.x, el.y, lead.x, lead.y) > (o.gap ?? 50)) {
        const b = bearing(el.x, el.y, lead.x, lead.y), v = N.speed.travelling * dt;
        el.x += Math.cos(b * RAD) * v; el.y += Math.sin(b * RAD) * v; el.face = b; el.curSpeed = N.speed.travelling;
      } else el.curSpeed = 0;
      return;
    }
    if (o.type === "counterattack" || o.type === "assault") {
      // after the route, close on the (moving) target
      const tgt = S.byId[el.curTarget];
      if (el.arrived && tgt && aliveCount(tgt) > 0 && !el.stalled) {
        const tx = tgt.cx ?? tgt.x, ty = tgt.cy ?? tgt.y, d = dist(el.x, el.y, tx, ty);
        if (d > 6) { el.path = [[el.x, el.y], [tx, ty]]; el.seg = 0; el.arrived = false; }
      }
    }
    if (el.dwell > 0) { el.dwell -= dt; el.curSpeed = 0; return; }
    if (o.type === "withdraw" && o.method === "alternating" && !el.arrived) {
      // alternating bounds: move while the partner covers, then cover while it moves
      const P = o.partner && S.byId[o.partner];
      const pAlive = P && aliveCount(P) > 0 && P.order?.type === "withdraw" && !P.arrived;
      if (el.boundState === "cover") {
        el.boundT = (el.boundT || 0) + dt;
        if (!pAlive || (P.boundState === "cover" && el.boundT > N.boundCover && (el.boundT > P.boundT || (el.boundT === P.boundT && el.boundFirst)))) { el.boundState = "move"; el.boundLeft = N.bound; el.boundT = 0; }
        el.curSpeed = 0; return;
      }
      if (el.boundState !== "move") { el.boundState = el.boundFirst ? "move" : "cover"; el.boundLeft = N.bound; el.boundT = 0; if (el.boundState === "cover") { el.curSpeed = 0; return; } }
    }
    const v = speedOf(el);
    el.curSpeed = v;
    if (!v) return;
    let step = v * dt;
    while (step > 0 && el.path && el.seg < el.path.length - 1) {
      const [bx, by] = el.path[el.seg + 1], d = dist(el.x, el.y, bx, by);
      const take = Math.min(step, d);
      const nx = d > 1e-6 ? el.x + ((bx - el.x) * take) / d : bx, ny = d > 1e-6 ? el.y + ((by - el.y) * take) / d : by;
      const ob = T.crossesObstacle(el.x, el.y, nx, ny, S.lanes);
      if (ob >= 0) {
        if (!el.blocked) { el.blocked = true; el.hasty = 0; el.barrier = ob >= 1000; if (!el.barrier) log("obstacle", `${el.name} is held at the obstacle`, { el: el.id }); }
        return;
      }
      if (d > 0.5) el.face = bearing(el.x, el.y, bx, by);
      el.x = nx; el.y = ny; step -= take;
      if (el.boundState === "move") { el.boundLeft -= take; if (el.boundLeft <= 0) { el.boundState = "cover"; el.boundT = 0; break; } }
      if (take >= d - 1e-6) {
        el.seg++;
        if (o.type === "observe" && o.stops && o.stops.some((p) => Math.abs(p[0] - bx) < 1 && Math.abs(p[1] - by) < 1)) { el.dwell = o.dwell ?? 30; el.observing = [bx, by]; break; }
      }
    }
    if (el.path && el.seg >= el.path.length - 1 && !el.arrived) {
      el.arrived = true;
      if (o.face != null) el.face = o.face;
      else if (o.target) { const p = posOf(o.target); if (p) el.face = bearing(el.x, el.y, p[0], p[1]); }
      el.formFace = el.face;
      if (o.type === "move" || o.type === "bypass" || o.type === "reserve" || o.type === "hold" || o.type === "withdraw" || o.type === "observe") el.complete = true;
      if (o.type === "hold" || o.type === "reserve") el.holdT = S.t;
      if (S.events.length < 4000 && (o.type !== "assault" && o.type !== "counterattack")) log("arrive", `${el.name} ${o.type === "withdraw" ? "reaches the rally point" : "is in position"}`, { el: el.id });
    }
  };

  // soldiers follow their slots
  const moveSoldiers = (el, dt) => {
    // a settled, stationary element only needs its poses refreshed on combat ticks
    if (el.settled && !(el.curSpeed > 0) && S.tick % 5 !== 0) return;
    const okList = el.soldiers;
    let anyMoved = false;
    const poseTick = S.tick % 5 === 0;
    const n = okList.length;
    const form = (el.order?.type === "assault" || el.order?.type === "counterattack") && el.curTarget && S.byId[el.curTarget] && dist(el.x, el.y, S.byId[el.curTarget].cx, S.byId[el.curTarget].cy) < 120 ? "line" : el.formation;
    if (el._form !== form) { el._form = form; el._offs = offsetsFor(el.kind, form, n); }
    const offs = el._offs;
    // formation slots turn with the element's direction of movement, not with its aim
    if (el.curSpeed > 0 || el.formFace == null) el.formFace = el.face;
    const c = Math.cos(el.formFace * RAD), s = Math.sin(el.formFace * RAD);
    const tech = el.order?.technique;
    const alternate = el.curSpeed > 0 && (el.inContact || tech === "bounding") && n > 1;
    const win = el.inContact ? 4 : 7;
    const fireTgt = el.fireTarget ? S.byId[el.fireTarget] : null;
    for (const sd of okList) {
      if (sd.status !== "ok") continue;
      if (sd.carry) { moveCarrier(sd, el, dt); anyMoved = true; continue; }
      let tx, ty;
      if (el.slots) { tx = el.slots[sd.i][0]; ty = el.slots[sd.i][1]; }
      else { const [u, v] = offs[sd.i]; tx = el.x + u * c - v * s; ty = el.y + u * s + v * c; }
      const dx = tx - sd.x, dy = ty - sd.y, d = Math.sqrt(dx * dx + dy * dy);
      let moveNow = true;
      if (alternate && d < 22) moveNow = Math.floor(S.t / win + (el.id.length % 2) * 0.5) % 2 === sd.i % 2;
      const vmax = ((el.curSpeed || 1.2) * 1.35 + 0.5) * (d > 15 ? 1.6 : 1) * dt;
      if (moveNow && d > 0.4) {
        const k = Math.min(1, vmax / d);
        sd.x += dx * k; sd.y += dy * k; sd.dist += d * k; sd.moving = true; sd.face = Math.atan2(dy, dx) / RAD; anyMoved = true;
      } else sd.moving = false;
      // pose
      if (!sd.moving) {
        if (fireTgt) sd.face = bearing(sd.x, sd.y, fireTgt.cx ?? fireTgt.x, fireTgt.cy ?? fireTgt.y);
        else if (el.slots && el.slots[sd.i][2] != null) sd.face = el.slots[sd.i][2];
        else sd.face = el.face;
      }
      if (el.vehicle) sd.pose = "veh";
      else if (sd.moving) { if (poseTick || (sd.pose !== "stand" && sd.pose !== "crouch")) { const cv = T.cover(sd.x, sd.y); sd.pose = el.order?.technique === "infiltrate" || el.order?.type === "observe" || cv.bed || cv.wall || cv.hedge ? "crouch" : "stand"; } }
      else if (el.pose0 === "hole" && el.slots) sd.pose = "hole";
      else if (el.pose0 === "building" && el.slots) sd.pose = "building";
      else if (el.supp > 0.45 || el.inContact || el.order?.type === "reserve" || el.order?.type === "observe" || el.order?.type === "sbf" || el.order?.type === "hold") {
        const cv = T.cover(sd.x, sd.y);
        const firing = !!fireTgt && el.supp < 0.6;
        const dugIn = el.order?.type === "hold" && el.arrived && (el.prot >= 0.4 || (el.holdT != null && S.t - el.holdT > 60 && !el.inContact));
        sd.pose = dugIn ? "hole" : (cv.wall || cv.hedge) && firing ? "kneel" : "prone";
      }
      else sd.pose = "kneel";
    }
    el.settled = !anyMoved;
  };
  const ccpFor = (el) => (el.side === "f" ? (S.scen.ccp || el.home) : el.home);
  const moveCarrier = (sd, el, dt) => {
    const cas = S.sById[sd.carry];
    if (!cas) { sd.carry = null; return; }
    if (sd.status !== "ok") { cas.assigned = false; cas.carriedBy = null; sd.carry = null; return; }
    if (!cas.carriedBy) {
      const d = dist(sd.x, sd.y, cas.x, cas.y);
      if (d < 1.5) { cas.carriedBy = sd.id; }
      else { const k = Math.min(1, (2.0 * dt) / d); sd.x += (cas.x - sd.x) * k; sd.y += (cas.y - sd.y) * k; sd.dist += 2 * dt; sd.face = bearing(sd.x, sd.y, cas.x, cas.y); }
      sd.pose = "stand"; sd.moving = true;
      return;
    }
    const [cx, cy] = ccpFor(el), d = dist(sd.x, sd.y, cx, cy);
    if (d < 5) { cas.evac = true; cas.carriedBy = null; cas.x = cx + ((cas.i % 5) - 2) * 2.2; cas.y = cy - 3 - Math.floor(cas.i / 5) * 2; sd.carry = null; log("casevac", `${el.name}: a casualty reaches the casualty collection point`, { el: el.id }); return; }
    const k = Math.min(1, (N.casevac.speed * dt) / d);
    sd.x += (cx - sd.x) * k; sd.y += (cy - sd.y) * k; sd.dist += N.casevac.speed * dt; sd.face = bearing(sd.x, sd.y, cx, cy);
    sd.pose = "stand"; sd.moving = true;
    cas.x = sd.x - Math.cos(sd.face * RAD) * 1.2; cas.y = sd.y - Math.sin(sd.face * RAD) * 1.2;
  };

  // ---- combat (every combat tick) ----
  const exposureOf = (el) => {
    let e = 0, eye = 0, n = 0, prot = 0;
    for (const s of el.soldiers) {
      if (s.status !== "ok" || s.carry) continue;
      const c = T.cover(s.x, s.y);
      const p = s.pose === "stand" ? (s.moving ? N.exposure.move : N.exposure.stand) : N.exposure[s.pose] ?? 1;
      e += p * (1 - c.conceal * (s.pose === "veh" ? 0.3 : 1));
      eye += (EYE[s.pose] ?? 1.7) - (c.bed && s.pose !== "stand" ? 1.1 : c.bed ? 0.6 : 0);
      prot += c.protect; n++;
    }
    if (!n) return { e: 0, eye: 1, prot: 0 };
    const slow = el.order?.technique === "infiltrate" ? N.exposure.infiltrate : 1;
    return { e: e / n * Math.min(1.6, 0.75 + n * 0.06) * slow, eye: eye / n, prot: prot / n };
  };
  const vulnOf = (el, fromX, fromY, antiArmor = false) => {
    let v = 0, n = 0;
    for (const s of el.soldiers) {
      if (s.status !== "ok" || s.carry) continue;
      const th = angDiff(el.face, bearing(s.x, s.y, fromX, fromY));
      const fs = fireShare(th);
      let x;
      if (s.pose === "veh") x = antiArmor ? N.vuln.vehAT * (1 + N.vuln.enfilade * (1 - fs)) : N.vuln.veh;
      else if (s.pose === "stand" && s.moving) x = N.vuln.move * (1 + N.vuln.enfilade * (1 - fs)) * (1 - 0.8 * T.cover(s.x, s.y).protect);
      else if (s.pose === "hole" || s.pose === "building") x = N.vuln[s.pose] * (1 - (el.prot || 0) * 0.3) + N.vuln.flankHole * (1 - fs);
      else { const c = T.cover(s.x, s.y); x = (N.vuln[s.pose] ?? 1) * (1 - 0.8 * Math.max(c.protect, el.prot || 0)) * (1 + N.vuln.enfilade * (1 - fs)); }
      v += x; n++;
    }
    return n ? v / n : 0;
  };
  const casualty = (el, n, cause) => {
    for (let k = 0; k < n; k++) {
      const ok = el.soldiers.filter((s) => s.status === "ok" && !s.carry);
      if (!ok.length) return;
      const s = ok[Math.floor(rng.next() * ok.length) % ok.length];
      s.status = "down"; s.pose = "prone"; s.downT = S.t;
      el.cohesion = Math.max(0, el.cohesion - Math.min(0.25, N.cohesion.perLoss / el.size));
      el.lossT = S.t;
      if (el.side === "f" && !el.ally) S.metrics.lastFriendlyLoss = S.t;
      log("down", `${el.name}: one soldier down${cause ? ` (${cause})` : ""}`, { el: el.id, side: el.side });
    }
    if (aliveCount(el) === 0 && !S.flags[`cleared:${el.id}`]) { S.flags[`cleared:${el.id}`] = S.t; log("cleared", `${el.name} is out of action`, { el: el.id, side: el.side }); }
  };
  const hits = (el, lam, cdt, cause) => {
    const p = lam * cdt;
    let n = Math.floor(p);
    if (rng.next() < p - n) n++;
    if (n) casualty(el, n, cause);
  };

  const canFire = (el) => {
    const o = el.order;
    if (el.ok === 0) return 0;
    if (el.surrendered || el.noFire) return 0;
    if (!o) return 1;
    switch (o.type) {
      case "sbf": return el.lifted ? 0 : el.arrived ? 1 : el.inContact ? N.moveFire : 0;
      case "observe": return 0;
      case "reserve": return 0;
      case "withdraw": return o.method === "run" ? 0 : el.arrived ? 0.5 : el.boundState === "cover" ? 1 : 0;
      case "hold": return 1;
      case "assault": case "counterattack": {
        const tg = S.byId[el.curTarget || o.target];
        const dT = tg ? dist(el.cx, el.cy, tg.cx, tg.cy) : Infinity;
        if (!el.inContact && dT > 110) return 0; // hold fire on the approach: firing gives the route away
        return el.curSpeed > 0 ? (dT < 50 ? 0.8 : N.moveFire) : (el.pinned ? 0.6 : 1);
      }
      case "breach": return el.arrived ? 0.3 : 0.6;
      default: return !el.inContact ? (el.side === "h" && !el.curSpeed ? 0.6 : 0) : el.curSpeed > 0 ? N.moveFire : 0.7;
    }
  };

  // line-of-sight cache: reuse a pair's value while neither end has moved much (pure speed-up)
  const losCache = new Map();
  let smokeKey = 0;
  const losC = (A, B, smokeNow) => {
    const key = A.id < B.id ? A.id + "|" + B.id : B.id + "|" + A.id;
    const c = losCache.get(key);
    if (c && c.sk === smokeKey && S.t - c.t < 2.5 && Math.abs(c.ax - A.cx) + Math.abs(c.ay - A.cy) < 4 && Math.abs(c.bx - B.cx) + Math.abs(c.by - B.cy) < 4 && Math.abs(c.ea - A.eye) < 0.2 && Math.abs(c.eb - B.eye) < 0.2 && c.a === A.id) return c.v;
    const v = T.los(A.cx, A.cy, A.eye, B.cx, B.cy, B.eye, smokeNow);
    losCache.set(key, { sk: smokeKey, t: S.t, ax: A.cx, ay: A.cy, bx: B.cx, by: B.cy, ea: A.eye, eb: B.eye, a: A.id, v });
    return v;
  };
  const combat = (cdt) => {
    const live = S.els.filter((e) => (e.ok = centroid(e)) > 0);
    // smoke expiry
    S.smoke = S.smoke.filter((c) => S.t < c.t0 + c.life);
    const smokeNow = S.smoke.filter((c) => S.t >= c.t0);
    smokeKey = smokeNow.length ? smokeNow.reduce((k, c) => k + c.t0 * 7 + c.x, 0) + Math.floor(S.t / 3) : 0;
    for (const e of live) { const x = exposureOf(e); e.expo = x.e; e.eye = x.eye; e.protAvg = x.prot; e.suppIn = 0; e.inContact = S.t - e.recvT < 4 || e.supp > 0.2; }
    // spotting (every second combat tick, with the probability scaled to the longer interval)
    const spotDt = cdt * 2;
    if (S.tick % 10 === 0) for (const side of ["f", "h"]) {
      const obs = live.filter((e) => e.side === side && e.kind !== "mortar");
      for (const tgt of live) {
        if (tgt.side === side) continue;
        let pMiss = 1, bestLos = 0;
        const fired = S.t - tgt.fireT < 2;
        for (const o of obs) {
          let R = N.spot.range * (limited ? N.spot.limited : 1) * (fired ? N.spot.firingRange : 1) * (o.ai?.op ? 1.2 : 1);
          if (tgt.vehicle) R *= 1.5;
          const d = dist(o.cx, o.cy, tgt.cx, tgt.cy);
          if (d > R * 2.3) continue;
          const lf = losC(o, tgt, smokeNow);
          if (lf <= 0.01) continue;
          bestLos = Math.max(bestLos, lf);
          if (o.order?.type === "observe") R *= N.spot.optics;
          let p = N.spot.base * Math.exp(-((d / R) ** 2)) * tgt.expo * (fired ? N.spot.firing : 1) * lf * (1 - 0.6 * o.supp) * (o.alert ? N.spot.alertBoost : 1);
          if (tgt.order?.type === "observe" && !(tgt.curSpeed > 0)) p *= N.spot.observerHidden;
          if (side === "h" && S.scen.stealth && !S.flags.alert) p *= N.spot.unalert;
          if (o.ai?.sector && angDiff(o.face, bearing(o.cx, o.cy, tgt.cx, tgt.cy)) > o.ai.sector / 2) p *= N.spot.sector;
          if (d < 25 && lf > 0.3) p = 5;
          pMiss *= Math.max(0, 1 - p * spotDt);
        }
        const K = S.know[side];
        if (pMiss < 1 && rng.next() > pMiss) {
          if (S.t - tgt.spotT > N.spot.forget) tgt.spotCount = 0; // suspicion fades
          tgt.spotCount++; tgt.spotT = S.t;
          // stealth scenarios: a glimpse is not a detection; it takes several sightings to confirm
          const need = side === "h" && S.scen.stealth ? N.spot.confirm : 1;
          if (tgt.spotCount >= need) {
            const first = !K[tgt.id];
            K[tgt.id] = { el: tgt.id, x: tgt.cx, y: tgt.cy, t: S.t, kind: tgt.kind };
            if (first) {
              if (side === "h" && !tgt.ally) { if (S.metrics.detectedAt == null) { S.metrics.detectedAt = S.t; S.flags.detected = S.t; } log("spotted", `The enemy has spotted ${tgt.name}`, { el: tgt.id, side: "h" }); }
              else if (side === "f") log("spotted", `${tgt.name} spotted`, { el: tgt.id, side: "f" });
            }
          }
        }
      }
    }
    const seen = (side, id) => { const k = S.know[side][id]; return k && S.t - k.t < 3.5; };
    // fire
    let V0bonus = 1;
    for (const F of live) {
      F.fireTarget = null; F.fireOn = 0;
      let cf = canFire(F);
      if (!cf || F.kind === "mortar") continue;
      if (F.order?.type === "reserve" || F.order?.type === "observe") continue;
      let best = null, bestScore = 0, area = false;
      const ot = F.order?.target && S.byId[F.order.target];
      for (const E of live) {
        if (E.side === F.side || E.surrendered) continue;
        const d = dist(F.cx, F.cy, E.cx, E.cy);
        if (d > N.maxRange) continue;
        const isTarget = ot && ot.id === E.id;
        const vis = seen(F.side, E.id);
        // area fire at a known (not currently seen) position: a support-by-fire target, or the
        // enemy a withdrawing element is breaking contact from
        const known = S.know[F.side][E.id] && d < 320;
        const areaOK = (isTarget && F.order.type === "sbf") || (F.order?.type === "withdraw" && known);
        if (!vis && !areaOK) continue;
        let sc = 1 / (1 + d / 150);
        if (isTarget) sc *= 3;
        if (E.vehicle && !F.vehicle) sc *= 0.15; // small arms do little to armor: prefer soft targets
        if ((E.order?.type === "assault" || E.order?.type === "counterattack") && E.curTarget === F.id && d < 160) sc *= 4;
        if (!vis) sc *= 0.5;
        if (sc > bestScore) { bestScore = sc; best = E; area = !vis; }
      }
      if (!best) continue;
      const E = best, d = dist(F.cx, F.cy, E.cx, E.cy), brg = bearing(F.cx, F.cy, E.cx, E.cy);
      // shooter angle: dug-in / building / fixed positions only bear part of their fire to flank and rear
      let fs = 1;
      const fixed = F.slots || F.pose0 === "hole" || F.pose0 === "building" || (F.order?.type === "hold" && F.arrived && F.holdT != null && S.t - F.holdT > 20);
      if (fixed) fs = fireShare(angDiff(F.face, brg));
      else if (F.curSpeed > 0 && angDiff(F.face, brg) > 110) fs = 0.5;
      const lf = losC(F, E, smokeNow);
      if (F.order?.type === "sbf" && F.arrived) V0bonus = N.sbfBonus; else V0bonus = 1;
      const visF = area ? N.areaFire * Math.max(0.15, lf) : Math.min(1, 0.35 + lf);
      const visS = area ? N.areaFire : visF; // suppression reaches a known position even through smoke
      if (visF < 0.05 && !area) continue;
      let V = 0;
      for (const s of F.soldiers) {
        if (s.status !== "ok" || s.carry) continue;
        const w = weapon(s.role);
        if (!w) continue;
        const lr = N.longRole[s.role] ?? 0;
        const rf = (1 - lr) / (1 + (d / N.rangeRifle) ** 2) + lr / (1 + (d / N.rangeLong) ** 2);
        V += w * rf;
      }
      V *= cf * (1 - N.suppFire * F.supp) * fs * visF * (F.stalled ? 0.5 : 1);
      // unanswered fire is aimed fire: a shooter nobody is firing back at is more effective
      if (S.t - (F.stats.firedAt[E.id] ?? -99) > 10) V *= N.unanswered;
      // final protective fire: a dug-in position firing to its front at close range (grazing fire)
      if (fixed && fs > 0.6 && d < N.fpl.range && (E.order?.type === "assault" || E.order?.type === "counterattack") && (F.pose0 === "hole" || F.pose0 === "building")) V *= N.fpl.mult;
      const Vs = V * V0bonus * (visF > 0 ? visS / visF : 1);
      if (V < 0.05) continue;
      F.fireTarget = E.id; F.fireOn = Math.min(1, 0.3 + 0.7 * (1 - F.supp)) * Math.min(1, cf + 0.2); F.fireT = S.t;
      if (F.side === "f" && !F.ally && S.metrics.firstShotAt == null) S.metrics.firstShotAt = S.t;
      if (F.side === "h" && E.side === "f" && !E.ally && S.metrics.enemyFireAt == null) S.metrics.enemyFireAt = S.t;
      if (F.order?.type === "sbf" && F.arrived && !F.lifted) {
        if (F.sbfT == null) F.sbfT = S.t;
        if (S.t - F.sbfT >= 10 && S.metrics.sbfSetAt[F.id] == null) { S.metrics.sbfSetAt[F.id] = S.t; F.complete = true; log("sbf", `${F.name} has set support by fire on ${E.name}`, { el: F.id }); }
      }
      // a bigger element is spread wider: the same fire suppresses less of it
      E.suppIn += Vs * N.ks * (1 - N.suppCover * Math.max(E.protAvg || 0, E.prot || 0)) * (E.vehicle ? N.vehSupp : 1) / Math.sqrt(Math.max(1, E.ok / N.suppSize));
      E.recvT = S.t;
      (E.stats.firedAt[F.id] = S.t);
      const thE = angDiff(E.face, bearing(E.cx, E.cy, F.cx, F.cy));
      if (fireShare(thE) < 0.5 && V > 1.5) { E.flankT = S.t; E.stats.recvFlank += cdt; }
      hits(E, V * N.kc * vulnOf(E, F.cx, F.cy, F.vehicle), cdt, null);
    }
    // stationary elements (not dug-in slots) turn to face what they are fighting
    for (const F of live) {
      if (F.slots || !F.fireTarget || F.curSpeed > 0) continue;
      const t = S.byId[F.fireTarget];
      const want = bearing(F.cx, F.cy, t.cx, t.cy);
      const d = ((want - F.face) % 360 + 540) % 360 - 180;
      const rate = (F.side === "f" && !F.ally ? N.turnF : (F.ai?.turn ?? N.turnH)) * cdt;
      F.face += Math.max(-rate, Math.min(rate, d));
    }
    // indirect fire
    for (const m of S.missions) {
      if (S.t < m.t0 || S.t > m.until) continue;
      if (m.kind === "smoke") {
        if (!m.cloud) { m.cloud = { x: m.at[0], y: m.at[1], r: N.mortar.smokeR, t0: S.t, life: m.until - S.t + 20, side: m.side }; S.smoke.push(m.cloud); }
        continue;
      }
      for (const E of live) {
        const d = dist(E.cx, E.cy, m.at[0], m.at[1]);
        if (d > N.mortar.r + 15) continue;
        E.suppIn += N.mortar.supp * (1 - d / (N.mortar.r + 15));
        E.recvT = S.t;
        const v = vulnOf(E, m.at[0], m.at[1] - 1) * (E.pose0 === "hole" || E.pose0 === "building" ? 1.4 : 1);
        hits(E, N.mortar.kc * v * (E.ok / 4), cdt, "mortar fire");
      }
    }
    // suppression
    for (const E of live) {
      const target = 1 - Math.exp(-E.suppIn);
      if (target > E.supp) E.supp += (target - E.supp) * N.suppRise; else E.supp = Math.max(target, E.supp - N.suppDecay * cdt * (E.pose0 === "hole" ? 1.3 : 1));
      if (!E.pinned && E.supp > N.pinAt) { E.pinned = true; if (E.side === "f" && S.t - (E.pinLogT ?? -99) > 60) { E.pinLogT = S.t; log("pinned", `${E.name} is pinned down`, { el: E.id }); } }
      else if (E.pinned && E.supp < N.unpinAt) E.pinned = false;
      // cohesion
      if (S.t - E.flankT < 1 && !(E.curSpeed > 0)) E.cohesion = Math.max(0, E.cohesion - N.cohesion.flank * cdt * 2);
      if (E.supp < 0.15 && S.t - (E.lossT ?? -99) > 20) E.cohesion = Math.min(1, E.cohesion + N.cohesion.recover * cdt);
      const attacking = E.order && (E.order.type === "assault" || E.order.type === "counterattack" || (E.order.type === "move" && E.side === "h" && E.ai?.attack));
      if (attacking && !E.stalled && E.cohesion < N.cohesion.breakAtt) { E.stalled = true; log("stall", `${E.name} goes to ground: the attack stalls`, { el: E.id, side: E.side }); }
      else if (E.stalled && E.cohesion > N.cohesion.rally) { E.stalled = false; }
      // obstacle: hasty breach when held without a lane
      if (E.blocked && !E.barrier) {
        E.hasty = (E.hasty || 0) + cdt * (E.supp < 0.5 ? 1 : 0.3);
        if (T.inMines(E.x, E.y + 6) || T.inMines(E.x, E.y - 6) || (S.scen.terrain.mines || []).length) hits(E, N.breach.mineKc, cdt, "mines");
        if (E.hasty > N.breach.time * N.breach.hastyMult) { S.lanes.push({ x: E.x, y: E.y, r: 14 }); E.blocked = false; log("lane", `${E.name} forces a hasty lane`, { el: E.id }); }
      }
      E.task = taskLabel(E);
    }
    // breach orders
    for (const E of live) {
      if (E.order?.type !== "breach" || !E.arrived || E.complete) continue;
      E.breachT += cdt * (E.supp < 0.5 ? 1 : 0.15) * Math.min(1, E.ok / Math.max(3, E.size * 0.5));
      if (E.breachT >= N.breach.time) {
        const p = E.order.route[E.order.route.length - 1];
        S.lanes.push({ x: p[0], y: p[1], r: 16 }); E.complete = true; S.flags.lane = S.t;
        log("lane", `${E.name} has breached the obstacle: a lane is open`, { el: E.id });
      }
    }
    // close assault
    for (const A of live) {
      const o = A.order;
      if (!o || (o.type !== "assault" && o.type !== "counterattack") || A.stalled) { A.inAssault = false; continue; }
      let tgt = null;
      if (o.type === "assault") tgt = S.byId[o.target];
      else {
        let bd = Infinity;
        for (const E of live) if (E.side !== A.side && !E.surrendered && (!o.zone || dist(E.cx, E.cy, o.zone.x, o.zone.y) < o.zone.r)) { const d = dist(A.cx, A.cy, E.cx, E.cy); if (d < bd) { bd = d; tgt = E; } }
      }
      A.curTarget = tgt && tgt.ok > 0 && !tgt.surrendered ? tgt.id : null;
      if (!A.curTarget) {
        A.inAssault = false;
        if (o.type === "assault" && S.flags[`cleared:${o.target}`] && !A.complete) { A.complete = true; }
        if (o.type === "counterattack" && A.arrived && !A.complete) { A.complete = true; log("consolidate", `${A.name} consolidates`, { el: A.id }); }
        continue;
      }
      const d = dist(A.cx, A.cy, tgt.cx, tgt.cy);
      if (d > N.assault.range) { A.inAssault = false; continue; }
      const th = angDiff(tgt.face, bearing(tgt.cx, tgt.cy, A.cx, A.cy));
      const fs = fireShare(th);
      if (!A.inAssault) {
        A.inAssault = true;
        // supported: a support-by-fire element was firing on this position (or one beside it) until shortly before
        const supported = S.els.some((e) => e.side === A.side && e.order?.type === "sbf" && S.els.some((x) => x.side === tgt.side && dist(x.cx, x.cy, tgt.cx, tgt.cy) < 70 && (x.stats.firedAt[e.id] ?? -99) > S.t - 40));
        S.metrics.assaults.push({ t: S.t, el: A.id, target: tgt.id, defSupp: +tgt.supp.toFixed(2), angle: Math.round(th), supported, att: A.ok, def: tgt.ok, side: A.side });
        log("assault", `${A.name} closes on ${tgt.name} (${th > 60 ? "from the flank" : "frontally"}; defenders ${Math.round(tgt.supp * 100)}% suppressed)`, { el: A.id, side: A.side });
      }
      const Ap = A.ok * (1 - 0.6 * A.supp) * (1 + N.assault.flankBonus * (1 - fs));
      const Dp = tgt.ok * (1 - tgt.supp) * fs * ((tgt.pose0 === "hole" || tgt.pose0 === "building" || tgt.holdT != null) ? N.assault.posBonus : 1) * (0.4 + 0.6 * tgt.cohesion);
      const share = Ap / (Ap + Dp + 1e-6);
      hits(tgt, N.assault.lethal * share * 1.3, cdt, "close assault");
      hits(A, N.assault.lethal * (1 - share) * 0.8, cdt, "close assault");
      tgt.cohesion = Math.max(0, tgt.cohesion - N.assault.cohesionHit * share * cdt);
      A.cohesion = Math.max(0, A.cohesion - N.assault.cohesionHit * 0.5 * (1 - share) * cdt);
      if (tgt.ok > 0 && tgt.cohesion < N.cohesion.breakDef && !tgt.surrendered) breakElement(tgt, A);
    }
    // casualty evacuation (friendly side)
    for (const E of live) {
      if (E.side !== "f" || E.vehicle) continue;
      const downs = E.soldiers.filter((s) => s.status === "down" && !s.evac && !s.assigned);
      if (!downs.length || E.supp > N.casevac.suppMax || E.inAssault) continue;
      const carriers = E.soldiers.filter((s) => s.carry).length, ok = E.ok;
      if (carriers + 1 > Math.max(1, Math.floor(ok * N.casevac.maxShare)) || ok < 1) continue;
      const cas = downs[0];
      let bestS = null, bd = Infinity;
      for (const s of E.soldiers) if (s.status === "ok" && !s.carry && s.role !== "mg") { const d = dist(s.x, s.y, cas.x, cas.y); if (d < bd) { bd = d; bestS = s; } }
      if (bestS) { bestS.carry = cas.id; cas.assigned = true; }
    }
  };

  const breakElement = (el, by) => {
    // defender breaks: withdraw on its fallback route if it has one and the route is open, else surrender
    const fb = el.ai?.fallback && S.scen.routes[el.ai.fallback];
    const cut = el.ai?.cutFlag && S.flags[el.ai.cutFlag];
    if (el.side === "f") {
      el.surrendered = false;
      startOrder(el, { type: "withdraw", route: [[el.x, el.y], S.scen.rally || el.home], method: "run", label: "Broken: falling back" });
      el.steps = []; el.si = 0; el.broken = true;
      log("break", `${el.name} breaks and falls back`, { el: el.id, side: "f" });
      return;
    }
    if (fb && !cut && !(by && dist(by.cx, by.cy, el.cx, el.cy) < 18)) {
      if (el.withdrawing && el.order?.route === fb.pts) return; // already falling back on it: do not restart the route or re-log every tick
      startOrder(el, { type: "move", route: fb.pts, technique: "rush", label: "Withdrawing" });
      el.steps = []; el.si = 0; el.withdrawing = true; el.slots = null; el.pose0 = null;
      log("withdraw", `${el.name} withdraws`, { el: el.id, side: "h" });
    } else {
      el.surrendered = true;
      for (const s of el.soldiers) if (s.status === "ok") { s.status = "captured"; s.pose = "kneel"; }
      S.flags[`cleared:${el.id}`] = S.t;
      log("surrender", `${el.name} surrenders`, { el: el.id, side: "h" });
    }
  };

  // ---- the tick ----
  const api = {
    S, log, alive: (id) => (S.byId[id] ? aliveCount(S.byId[id]) : 0), el: (id) => S.byId[id], dist, startOrder, breakElement,
    okNear: (side, x, y, r, incAlly = true) => S.soldiers.reduce((n, s) => n + (s.side === side && s.status === "ok" && (incAlly || !S.byId[s.el].ally) && dist(s.x, s.y, x, y) <= r ? 1 : 0), 0),
    down: (side, incAlly = false) => S.soldiers.reduce((n, s) => n + (s.side === side && (incAlly || !S.byId[s.el].ally) && s.status === "down" ? 1 : 0), 0),
    captured: (side) => S.soldiers.reduce((n, s) => n + (s.side === side && s.status === "captured" ? 1 : 0), 0),
    knows: (side, id) => !!S.know[side][id], evalTrig,
  };
  const finish = (r) => {
    if (S.done) return;
    S.done = { reason: r.reason, tier: r.tier, t: +S.t.toFixed(1), detail: r.detail || null };
    log("end", `${r.tier === 1 ? "Mission accomplished" : r.tier === 2 ? "Partly accomplished" : "Mission failed"}: ${r.reason}`, { tier: r.tier });
  };
  const tickOnce = () => {
    const dt = N.dt;
    S.tick++; S.t = Math.round(S.tick * dt * 1000) / 1000;
    // delayed orders (Hard, company)
    if (S.pending.length) {
      // instant actions (lift / shift / smoke / call for fire) apply on arrival without replacing the unit's task
      for (const p of S.pending.filter((q) => q.at <= S.t)) {
        const el = S.byId[p.el]; if (!el || !aliveCount(el)) continue;
        if (INSTANT.has(p.order.type)) runAction(el, p.order);
        else { el.steps = []; el.si = 0; startOrder(el, p.order); }
        log("order", `${el.name} acts on the order (${ORDER_LABELS[p.order.type] || p.order.type})`, { el: el.id });
      }
      S.pending = S.pending.filter((q) => q.at > S.t);
    }
    for (const el of S.els) if (!el.surrendered) moveEl(el, dt);
    for (const el of S.els) moveSoldiers(el, dt);
    if (S.tick % Math.round(N.combatDt / dt) === 0) {
      const cdt = N.combatDt;
      combat(cdt);
      for (const el of S.els) {
        if (el.surrendered || aliveCount(el) === 0) continue;
        if (el.side === "h" || el.ally) aiTick(S, el, api);
        if (el.withdrawing && !S.flags[`cleared:${el.id}`] && dist(el.cx, el.cy, el.home[0], el.home[1]) > 70) { S.flags[`cleared:${el.id}`] = S.t; log("cleared", `${el.name} has left its position`, { el: el.id, side: el.side }); }
        advanceSteps(el);
        for (const a of el.actions) if (!a.done && (!a.trigger || evalTrig(a.trigger, el))) { a.done = true; runAction(el, a.order); }
        if (!el.order) startOrder(el, { type: el.steps.length && el.side === "f" ? "reserve" : "hold", route: [[el.x, el.y], [el.x, el.y]] });
        if (el.order?.type === "hold" && el.arrived && !el.dug) el.prot = Math.min(N.dig.max, el.prot + N.dig.rate * cdt);
        else if (el.order?.type === "sbf" && el.arrived && !el.dug) el.prot = Math.min(N.dig.sbf, el.prot + N.dig.sbfRate * cdt);
        else if (!el.dug && el.curSpeed > 0) el.prot = 0;
      }
      // exposure metric: friendly soldiers standing in the open within enemy view range
      if (S.scen.onTick) S.scen.onTick(S, api);
      if (!S.done) {
        const r = S.scen.evaluate ? S.scen.evaluate(S, api) : null;
        if (r) finish(r);
        else if (api.down("f") + friendlyCore().reduce((n, e) => n + e.soldiers.filter((s) => s.status === "captured").length, 0) >= S.totalF * 0.5) finish({ reason: "combat ineffective: half the force is down", tier: 3 });
        else if (S.t >= S.scen.timeLimit) finish(S.scen.onTimeout ? S.scen.onTimeout(S, api) : { reason: "time ran out", tier: 3 });
      }
    }
  };

  let acc = 0;
  const sim = {
    S,
    step(dt = N.dt) { acc += dt; while (acc >= N.dt - 1e-9 && !S.done) { tickOnce(); acc -= N.dt; } if (S.done) acc = 0; return sim; },
    runTurn(seconds) { const end = S.t + seconds; while (S.t < end - 1e-9 && !S.done) tickOnce(); return sim.state(); },
    run(maxSeconds = 1e9) { const end = S.t + maxSeconds; while (!S.done && S.t < end) tickOnce(); return sim.done(); },
    issue(unitId, order) {
      const el = S.byId[unitId];
      if (!el || el.side !== "f" || el.ally) return false;
      if (orderDelay) {
        const delay = orderDelay[0] + (hashStr(`${unitId}:${S.t}`) % 1000) / 1000 * (orderDelay[1] - orderDelay[0]);
        S.pending.push({ el: unitId, order, at: S.t + delay });
        log("order", `Order sent to ${el.name} (takes effect in about ${Math.round(delay)} s)`, { el: unitId });
        return { delay };
      }
      if (INSTANT.has(order.type)) { runAction(el, order); return true; }
      el.steps = []; el.si = 0; startOrder(el, order);
      log("order", `${el.name}: ${ORDER_LABELS[order.type] || order.type}`, { el: unitId });
      return true;
    },
    done() { return S.done; },
    state() { return snapshot(S, api); },
    score() { return scoreRun(S, api); },
    aar() { return buildAAR(S, api, scoreRun(S, api)); },
  };
  // start: every element begins its first step
  for (const el of S.els) { advanceSteps(el); if (!el.order) startOrder(el, { type: el.steps.length && el.side === "f" ? "reserve" : "hold", route: [[el.x, el.y], [el.x, el.y]], face: el.face }); if (el.slots) el.arrived = true; }
  // spread each element's soldiers into its formation at the start, so the first frame (briefing, turn 1) shows every soldier rather than one stacked figure per element
  for (const el of S.els) {
    if (el.slots || el.vehicle) continue;
    const offs = offsetsFor(el.kind, el.formation, el.soldiers.length), c = Math.cos(el.face * RAD), sn = Math.sin(el.face * RAD);
    el.soldiers.forEach((sd, i) => { const [u, v] = offs[i] || [0, 0]; sd.x = el.x + u * c - v * sn; sd.y = el.y + u * sn + v * c; });
  }
  for (const el of S.els) { el.ok = centroid(el); if (el.order?.type === "hold" && (el.pose0 === "hole" || el.pose0 === "building")) { el.arrived = true; el.holdT = -999; } }
  if (scen.onStart) scen.onStart(S, api);
  return sim;
}

// ---- state snapshot for renderers / UI ----
const ROF = { mg: [0.75, 5, true], veh: [0.9, 4, true], ifv: [1.0, 3, true], ar: [0.95, 3, false], gr: [3.2, 1, false] };
function snapshot(S, api) {
  const T = S.T;
  const z = (x, y) => T.height(x, y);
  const soldiers = S.soldiers.map((s) => ({
    id: s.id, el: s.el, side: s.side, role: s.kitRole, roleFull: s.role, x: +s.x.toFixed(2), y: +s.y.toFixed(2), z: z(s.x, s.y),
    face: Math.round(s.face), pose: s.status === "down" ? "prone" : s.pose === "crouch" ? "kneel" : s.pose, status: s.status, moving: !!s.moving,
    stride: s.moving ? [1, 0, 2, 0][Math.floor(s.dist / 1.7) % 4] : 0, carrying: s.carry || null, carried: !!s.carriedBy, evac: !!s.evac,
  }));
  const elements = S.els.map((e) => ({
    id: e.id, side: e.side, ally: e.ally, kind: e.kind, name: e.name, short: e.short, x: +(e.cx ?? e.x).toFixed(1), y: +(e.cy ?? e.y).toFixed(1), face: Math.round(e.face),
    strength: e.soldiers.filter((s) => s.status === "ok").length, size: e.size, down: e.soldiers.filter((s) => s.status === "down").length,
    suppression: +e.supp.toFixed(2), cohesion: +e.cohesion.toFixed(2), task: e.task, order: e.order?.type || null, pinned: !!e.pinned,
    inContact: !!e.inContact, firing: e.fireTarget || null, lifted: !!e.lifted, route: e.order?.route || null, smoke: e.smoke,
    pending: S.pending.filter((p) => p.el === e.id).map((p) => ({ type: p.order.type, at: +p.at.toFixed(1) })),
  }));
  const contacts = Object.values(S.know.f).map((k) => {
    const e = S.byId[k.el];
    return { el: k.el, kind: k.kind, name: e.name, x: +k.x.toFixed(1), y: +k.y.toFixed(1), spotted: S.t - k.t < 3.5, lastSeen: +k.t.toFixed(1), out: !!S.flags[`cleared:${k.el}`] };
  });
  // fire streams in the shape kit/terrain.mjs trShots expects
  const streams = [];
  for (const F of S.els) {
    if (!F.fireTarget || !(F.fireOn > 0)) continue;
    const E = S.byId[F.fireTarget];
    const tos = E.soldiers.filter((s) => s.status === "ok").slice(0, 4).map((s) => [+s.x.toFixed(1), +s.y.toFixed(1), z(s.x, s.y) + (s.pose === "stand" ? 1.1 : 0.4)]);
    if (!tos.length) continue;
    let k = 0;
    for (const s of F.soldiers) {
      if (s.status !== "ok" || s.carry || !(weapon(s.role) > 0) || k >= 6) continue;
      k++;
      const [period, burst, heavy] = ROF[s.role] || [1.7, 1, false];
      const d = Math.hypot(tos[0][0] - s.x, tos[0][1] - s.y);
      streams.push({
        side: F.side, from: [+s.x.toFixed(1), +s.y.toFixed(1), z(s.x, s.y) + (s.pose === "stand" ? 1.4 : s.pose === "veh" ? 2.2 : 0.5)], to: tos,
        period, burst, gap: 0.09, flight: Math.max(0.12, Math.min(0.6, d / 600)), phase: (hashStr(s.id) % 1000) / 1000 * period,
        on: +F.fireOn.toFixed(2), heavy, smoke: false, scatter: 1.6 + d / 120, el: F.id, target: E.id,
      });
    }
  }
  for (const m of S.missions) {
    if (S.t < m.t0 || S.t > m.until || m.kind === "smoke") continue;
    const from = m.from && S.byId[m.from] ? [S.byId[m.from].x, S.byId[m.from].y, 1] : [m.at[0], m.at[1] - 300, 40];
    streams.push({ side: m.side, from, to: [[m.at[0], m.at[1], z(m.at[0], m.at[1])]], period: 3.2, burst: 2, gap: 0.6, flight: 1.4, phase: 0, on: 1, heavy: true, smoke: true, scatter: 26, indirect: true });
  }
  const smoke = S.smoke.filter((c) => S.t >= c.t0).map((c) => ({ x: +c.x.toFixed(1), y: +c.y.toFixed(1), r: c.r, age: +((S.t - c.t0) / c.life).toFixed(3) }));
  return {
    t: +S.t.toFixed(1), clock: fmtClock(S.t), timeLimit: S.scen.timeLimit, light: S.T.light, seed: S.seed, plan: S.planId,
    soldiers, elements, contacts, streams, smoke, lanes: S.lanes.filter((l) => !l.fixed).map((l) => ({ x: l.x, y: l.y, r: l.r })), flags: { ...S.flags },
    losses: { friendly: api.down("f"), enemy: api.down("h"), captured: api.captured("h") },
    events: S.events, done: S.done,
  };
}
