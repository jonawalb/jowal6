// Maneuver Trainer core: the order vocabulary and the plan compiler.
//
// ORDERS (what issue(unitId, order) and plan steps accept):
//   { type: "move",     route | to, technique: "travelling"|"overwatch"|"bounding"|"infiltrate"|"rush", formation }
//   { type: "bypass",   route | to }                       move on a route that avoids a known position
//   { type: "sbf",      route | to, target: enemyElId | [x, y] }  support by fire; on lift it STOPS FIRING AND STAYS
//   { type: "assault",  route | to, target: enemyElId }     close on and clear the target (squad line for the assault)
//   { type: "hold",     route | to, face }                  occupy and dig in over time (defend)
//   { type: "reserve",  route | to }                        wait, concealed, until committed
//   { type: "counterattack", route | to, zone: { x, y, r } } assault the nearest enemy in the zone
//   { type: "breach",   route | to }                        reduce the obstacle at the route end (needs low suppression)
//   { type: "withdraw", route | to, method: "alternating"|"run", partner }  break contact to a rally point
//   { type: "observe",  route | to, look: [[x, y]...], dwell } screen / observe without being seen; never fires
//   { type: "follow",   el, gap }                           follow another element
// ACTIONS (do not replace the current order):
//   { type: "lift" }                         support element stops firing and stays in position
//   { type: "shift", target }                support element shifts fire to another target
//   { type: "smoke", at: [x, y] }            hand-thrown smoke (if the element has smoke)
//   { type: "callfire", at: [x, y] | elId, kind: "he"|"smoke", dur }   call for fire (mortar section or higher);
//                                            an element id fires on where that element is when the call goes in
// TRIGGERS (plan steps; omitted = when the previous step is complete):
//   { when: "start" } | { when: "time", t } | { when: "arrived", el } | { when: "sbfSet", el }
//   { when: "cleared", target } | { when: "near", el, target: elId | [x, y], dist }
//   { when: "enemyNear", at: [x, y], dist } | { when: "flag", name } | { when: "lane" }
//   { when: "order", el, type }   (that element is carrying out an order of this type, e.g. "counterattack")
//   { when: "all", of: [...] } | { when: "any", of: [...] }
// Pure; no dependencies.

export const ORDER_TYPES = ["move", "bypass", "sbf", "assault", "hold", "reserve", "counterattack", "breach", "withdraw", "observe", "follow"];
export const ACTION_TYPES = ["lift", "shift", "smoke", "callfire"];

export const ORDER_LABELS = {
  move: "Move", bypass: "Bypass", sbf: "Support by fire", assault: "Assault", hold: "Hold / defend",
  reserve: "Reserve", counterattack: "Counterattack", breach: "Breach", withdraw: "Break contact",
  observe: "Observe / reconnoiter", follow: "Follow", lift: "Lift fire", shift: "Shift fire", smoke: "Smoke", callfire: "Call for fire",
};
export const TECHNIQUES = {
  travelling: "traveling", overwatch: "traveling overwatch", bounding: "bounding overwatch",
  infiltrate: "slow, low, concealed movement", rush: "rush", // keys are internal; labels follow ATP 3-21.8
};
// Task names the planning board offers, per echelon (ATP 3-21.8 / FM 3-90 wording).
export const TASKS = {
  sbf: "Support by fire", assault: "Assault", reserve: "Reserve", screen: "Observe / reconnoiter", block: "Block",
  breach: "Breach", follow: "Follow (wait, then move)", defend: "Defend", delay: "Delay", move: "Move", bypass: "Bypass",
  withdraw: "Break contact", counterattack: "Counterattack", fix: "Fix",
};

const routeOf = (scen, key) => {
  if (!key) return null;
  if (Array.isArray(key)) return key;
  const r = scen.routes[key];
  if (!r) throw new Error(`unknown route ${key} in ${scen.id}`);
  return r.pts;
};
const trigOf = (scen, key) => {
  if (!key) return null;
  if (typeof key === "object") return key;
  const t = scen.triggers?.[key];
  if (!t) throw new Error(`unknown trigger ${key} in ${scen.id}`);
  return t.trig;
};

// One assignment (task + route + trigger [+ target]) → steps [{ order, trigger }].
export function stepsFor(scen, elId, a) {
  const pts = routeOf(scen, a.route);
  const trig = trigOf(scen, a.trigger);
  const tech = a.technique;
  const steps = [];
  const first = a.wait ? trigOf(scen, a.wait) : null; // optional start trigger
  switch (a.task) {
    case "sbf": case "fix":
      steps.push({ trigger: first, order: { type: "sbf", route: pts, target: a.target, technique: tech || "overwatch", formation: a.formation } });
      if (trig) steps.push({ trigger: trig, order: { type: "lift" } });
      break;
    case "assault": {
      // route: ... assault position, objective. Move to the assault position, assault on trigger.
      const ap = pts.slice(0, -1), last = pts.slice(-2);
      if (ap.length > 1) steps.push({ trigger: first, order: { type: "move", route: ap, technique: tech || "overwatch", formation: a.formation } });
      steps.push({ trigger: trig || (ap.length > 1 ? null : first), order: { type: "assault", route: pts, target: a.target, formation: "line", technique: tech || "overwatch" } });
      break;
    }
    case "follow": // wait for trigger, then move and assault / hold
      if (a.target) {
        const ap = pts.slice(0, -1), last = pts.slice(-2);
        steps.push({ trigger: first || { when: "start" }, order: { type: "reserve", route: [pts[0], pts[0]] } });
        steps.push({ trigger: trig, order: { type: "move", route: ap, technique: tech || "travelling", formation: a.formation } });
        steps.push({ trigger: null, order: { type: "assault", route: pts, target: a.target, formation: "line" } });
      } else {
        steps.push({ trigger: first || { when: "start" }, order: { type: "reserve", route: [pts[0], pts[0]] } });
        steps.push({ trigger: trig, order: { type: "move", route: pts, technique: tech || "travelling", formation: a.formation } });
        steps.push({ trigger: null, order: { type: "hold", route: [pts[pts.length - 1], pts[pts.length - 1]], face: a.face } });
      }
      break;
    case "reserve": {
      steps.push({ trigger: first, order: { type: "reserve", route: pts } });
      if (a.commit) steps.push({ trigger: trig, order: { type: "counterattack", route: routeOf(scen, a.commit.route), zone: a.commit.zone, technique: "rush" } });
      break;
    }
    case "counterattack":
      steps.push({ trigger: first || trig, order: { type: "counterattack", route: pts, zone: a.zone, technique: tech || "rush" } });
      break;
    case "defend": case "block":
      steps.push({ trigger: first, order: { type: "hold", route: pts, face: a.face, technique: tech || "travelling" } });
      break;
    case "breach":
      steps.push({ trigger: first, order: { type: "breach", route: pts, technique: tech || "overwatch", formation: a.formation } });
      break;
    case "screen":
      steps.push({ trigger: first, order: { type: "observe", route: pts, stops: a.stops, dwell: a.dwell ?? 30, technique: tech || "infiltrate", formation: a.formation || "file" } });
      break;
    case "withdraw":
      steps.push({ trigger: first, order: { type: "withdraw", route: pts, method: a.method || "alternating", partner: a.partner, first: !!a.first, technique: tech } });
      break;
    case "delay":
      // route: [current position ..., next position]; hold until trigger, then withdraw to the next position and hold
      steps.push({ trigger: first, order: { type: "hold", route: [pts[0], pts[0]], face: a.face } });
      steps.push({ trigger: trig, order: { type: "move", route: pts, technique: "rush", formation: a.formation, label: "Delay: displacing", displace: true } });
      steps.push({ trigger: null, order: { type: "hold", route: [pts[pts.length - 1], pts[pts.length - 1]], face: a.face } });
      break;
    case "bypass":
      steps.push({ trigger: first, order: { type: "bypass", route: pts, technique: tech || "overwatch", formation: a.formation } });
      break;
    case "move": default:
      steps.push({ trigger: first, order: { type: "move", route: pts, technique: tech || "travelling", formation: a.formation } });
  }
  return steps;
}

// Plan → { [elId]: steps[] }, plus global actions [{ el, trigger, order }].
// plan.assign: { elId: { task, route, trigger, target, technique, formation, wait, commit, then: [assignment...] } }
// plan.actions: [{ el, trigger, action: { type: "smoke"|"callfire"|"shift"|"lift", ... } }]
export function compilePlan(scen, plan) {
  const out = {};
  for (const [elId, a] of Object.entries(plan.assign || {})) {
    let steps = stepsFor(scen, elId, a);
    for (const b of a.then || []) steps = steps.concat(stepsFor(scen, elId, b));
    out[elId] = steps;
  }
  for (const act of plan.actions || []) {
    (out[act.el] = out[act.el] || []);
    out[act.el].push({ trigger: trigOf(scen, act.trigger), order: act.action, parallel: true });
  }
  return out;
}

// Normalise an order issued from the UI (Medium/Hard): `to` becomes a two-point route.
export function normaliseOrder(order, el) {
  const o = { ...order };
  if (!o.route && o.to) o.route = [[el.x, el.y], o.to];
  if (o.route && o.route.length === 1) o.route = [[el.x, el.y], o.route[0]];
  return o;
}

// Human description of a trigger (for the planning board and the AAR).
export function describeTrigger(tr, names = {}) {
  if (!tr) return "when ready";
  const n = (id) => names[id] || id;
  switch (tr.when) {
    case "start": return "at once";
    case "time": return `at ${Math.floor(tr.t / 60)}:${String(Math.round(tr.t % 60)).padStart(2, "0")}`;
    case "arrived": return `when ${n(tr.el)} is in position`;
    case "sbfSet": return `when ${n(tr.el)} has set support by fire`;
    case "cleared": return `when ${n(tr.target)} is cleared`;
    case "near": return `when ${n(tr.el)} is within ${tr.dist} m of ${Array.isArray(tr.target) ? "the point" : n(tr.target)}`;
    case "enemyNear": return `when the enemy comes within ${tr.dist} m`;
    case "flag": return `on ${tr.label || tr.name}`;
    case "lane": return "when a lane is open";
    case "order": return `when ${n(tr.el)} is on a ${tr.type} order`;
    case "all": return tr.of.map((x) => describeTrigger(x, names)).join(" and ");
    case "any": return tr.of.map((x) => describeTrigger(x, names)).join(" or ");
    default: return tr.label || tr.when;
  }
}
