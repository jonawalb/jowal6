// Maneuver Trainer core: OPFOR (and allied) behaviour.
// Scripted orders come from scenario.enemyPlan (same format as a player plan). On top of the
// script, each element follows simple reactive rules chosen by its `ai` spec:
//   { type: "defend", fallback: routeKey, displace: 0..1, cutFlag }   hold; withdraw (or surrender)
//        when cohesion breaks; with `displace`, withdraw early when flanked and shaken
//   { type: "op", sector: deg, holdFire: m }   observation post: watches a sector, holds fire
//        unless the enemy is closer than holdFire
//   { type: "reserve", zone: { x, y, r }, route: routeKey }   counterattack when the enemy enters zone
//   { type: "attack", fallback: routeKey }   attacker: when its cohesion breaks the attack culminates
//   { type: "advance", route: routeKey, engage: m, deploy: s, assault: bool, fallback }   advancing
//        force: marches on its route; on meeting a known enemy within `engage` it deploys (halts and
//        fires) for `deploy` seconds, then assaults the nearest known enemy; resumes the march when
//        the way is clear; falls back when its cohesion breaks
// Everyone returns fire on the most visible threat and shifts to the nearest assaulting element
// (target choice lives in sim.mjs). Pure; no DOM.

import { NOTIONAL as N } from "./units.mjs";


export function aiTick(S, el, api) {
  const ai = el.ai || { type: "defend" };
  const cdt = N.combatDt;
  if (el.withdrawing || el.broken) return;
  switch (ai.type) {
    case "op": {
      let near = Infinity;
      for (const e of S.els) if (e.side !== el.side && e.ok > 0 && S.know[el.side][e.id] && S.t - S.know[el.side][e.id].t < 3.5) near = Math.min(near, Math.hypot(e.cx - el.cx, e.cy - el.cy));
      el.noFire = near > (ai.holdFire ?? 120);
      if (el.cohesion < N.cohesion.breakDef) api.breakElement(el, null);
      break;
    }
    case "reserve": {
      if (!el.committed && ai.zone) {
        const n = api.okNear(el.side === "h" ? "f" : "h", ai.zone.x, ai.zone.y, ai.zone.r, false);
        if (n >= (ai.min ?? 1)) {
          el.committed = true; el.slots = null; el.pose0 = null;
          api.startOrder(el, { type: "counterattack", route: S.scen.routes[ai.route].pts, zone: ai.zone, technique: "rush" });
          el.steps = []; el.si = 0;
          api.log("counter", `${el.name} counterattacks`, { el: el.id, side: el.side });
        }
      }
      if (el.cohesion < N.cohesion.breakDef && el.committed) api.breakElement(el, null);
      break;
    }
    case "attack": {
      if (el.cohesion < N.cohesion.breakAtt + 0.05 && ai.fallback && !el.withdrawing) {
        api.startOrder(el, { type: "move", route: S.scen.routes[ai.fallback].pts, technique: "rush", label: "Falling back" });
        el.steps = []; el.si = 0; el.withdrawing = true; el.stalled = false;
        api.log("culminate", `${el.name} falls back: its attack has culminated`, { el: el.id, side: el.side });
      }
      break;
    }
    case "advance": {
      if (el.cohesion < N.cohesion.breakAtt + 0.05 && ai.fallback && !el.withdrawing) {
        api.startOrder(el, { type: "move", route: S.scen.routes[ai.fallback].pts, technique: "rush", label: "Falling back" });
        el.steps = []; el.si = 0; el.withdrawing = true; el.stalled = false;
        api.log("culminate", `${el.name} falls back: its attack has culminated`, { el: el.id, side: el.side });
        break;
      }
      const A = el.adv || (el.adv = { state: "march", t0: S.t, seen: -99 });
      if (ai.start != null && S.t < ai.start) break;
      let foe = null, fd = Infinity;
      const K = S.know[el.side];
      for (const e of S.els) {
        if (e.side === el.side || e.ok <= 0 || e.surrendered) continue;
        const k = K[e.id];
        if (!k || S.t - k.t > 8) continue;
        const d = Math.hypot(e.cx - el.cx, e.cy - el.cy);
        if (d < fd) { fd = d; foe = e; }
      }
      if (foe && fd < (ai.engage ?? 450)) A.seen = S.t;
      const route = S.scen.routes[ai.route].pts;
      const march = () => { A.state = "march"; A.t0 = S.t; api.startOrder(el, { type: "move", route, technique: ai.technique || "travelling", label: "Advancing" }); el.steps = []; el.si = 0; };
      if (A.state === "march") {
        if (foe && fd < (ai.engage ?? 450)) {
          A.state = "deploy"; A.t0 = S.t; A.foe = foe.id;
          api.startOrder(el, { type: "hold", route: [[el.x, el.y], [el.x, el.y]], label: "Deploying to attack" }); el.steps = []; el.si = 0;
        } else if (!el.order || el.order.type !== "move" || el.arrived) { if (!(el.order?.type === "move" && el.arrived)) march(); }
      } else if (A.state === "deploy") {
        if (S.t - A.seen > 30) march();
        else if (ai.assault !== false && S.t - A.t0 > (ai.deploy ?? 60) && foe) {
          A.state = "assault"; A.t0 = S.t; A.foe = foe.id;
          api.startOrder(el, { type: "counterattack", route: [[el.x, el.y], [foe.cx, foe.cy]], zone: { x: foe.cx, y: foe.cy, r: 260 }, technique: "overwatch", label: "Attacking" }); el.steps = []; el.si = 0;
        }
      } else if (A.state === "assault") {
        if (el.complete || !foe || S.t - A.seen > 20) march();
        else if (el.order?.zone && foe) { el.order.zone.x = foe.cx; el.order.zone.y = foe.cy; }
      }
      break;
    }
    case "defend": default: {
      if (el.cohesion < N.cohesion.breakDef) { api.breakElement(el, null); break; }
      if (ai.displace && S.t - el.flankT < 2 && el.cohesion < ai.displace && ai.fallback) {
        api.startOrder(el, { type: "move", route: S.scen.routes[ai.fallback].pts, technique: "rush", label: "Displacing" });
        el.steps = []; el.si = 0; el.withdrawing = true; el.slots = null; el.pose0 = null;
        api.log("displace", `${el.name} displaces: it is flanked`, { el: el.id, side: el.side });
      }
    }
  }
}
