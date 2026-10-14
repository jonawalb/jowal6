// Maneuver Trainer core: after-action review in four parts, as an AAR asks:
// what was planned, what happened (timeline from the sim log), why it happened (the decisive
// factor the sim measured), what to sustain / improve; plus the maneuver concepts (used, trap avoided, missed),
// each linked to its figure (/interactive/maneuvers/<slug>/). Pure.

const KEY = new Set(["sbf", "lift", "assault", "cleared", "surrender", "withdraw", "displace", "break", "stall", "lane", "obstacle", "counter", "culminate", "smoke", "fire", "end", "report", "alert", "decisive", "objective"]);
export const figHref = (slug) => `/interactive/maneuvers/${slug}/`;

export function buildAAR(S, api, score) {
  const scen = S.scen, plan = S.plan || null;
  const tl = [];
  let spotted = 0, pinned = 0, downs = 0;
  for (const e of S.events) {
    if (e.type === "spotted") { if (spotted++ < 3) tl.push(e); continue; }
    if (e.type === "pinned") { if (pinned++ < 2) tl.push(e); continue; }
    if (e.type === "down") { downs++; continue; }
    if (KEY.has(e.type) && !tl.some((x) => x.text === e.text && e.t - x.t < 15)) tl.push(e); // the same line again within seconds (an assault re-closing) adds nothing
  }
  const why = [], sustain = [], improve = [];
  // decisive assault (the first one on an objective element, else the first)
  const objIds = new Set(scen.objectiveEls || []);
  const asl = S.metrics.assaults.filter((a) => a.side === "f");
  const key = asl.find((a) => objIds.has(a.target)) || asl[0];
  if (key) {
    const tgt = S.byId[key.target], from = key.angle > 135 ? `from its rear (${key.angle}° off its front)` : key.angle > 60 ? `from the flank (${key.angle}° off its front)` : `frontally (${key.angle}° off its front)`;
    why.push(`The assault by ${S.byId[key.el].name} reached ${tgt.name} ${from} while it was ${Math.round(key.defSupp * 100)}% suppressed, ${key.supported ? "with a base of fire on it until just before" : key.defSupp > 0.5 ? "without a separate base of fire on it (the suppression came from the assaulting element's own fire)" : "without a base of fire on it"} (in this model).`);
    if (key.angle > 60) sustain.push("Closing from the flank: in this model fire into a flank bears far harder, and the position could bring only part of its fire to bear (Fig 1 curve).");
    else improve.push("The assault went in frontally: find a covered route to a flank, or mass more fire first (Fig 1, Fig 6).");
    if (key.supported && key.defSupp > 0.5) sustain.push("A base of fire kept the position suppressed until the assault arrived.");
    else if (!key.supported) improve.push("No support by fire was on the position when the assault closed.");
  }
  // no assault ever closed: say so, instead of leaving "why" to the loss count alone
  if (!key && plan?.assign && score.tier > 1) {
    const ids = Object.entries(plan.assign).filter(([, a]) => a.task === "assault" || (a.then || []).some((t) => t.task === "assault")).map(([id]) => id);
    const names = ids.map((id) => S.byId[id]?.name).filter(Boolean);
    if (names.length) {
      const sbf = Object.keys(S.metrics.sbfSetAt).length > 0;
      why.push(`No assault closed on the enemy: ${names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0]} never got within assault distance${sbf ? "" : ", and no element had set support by fire to keep the defenders' heads down"} (in this model).`);
      if (!sbf) improve.push("Set a base of fire before anyone crosses open ground: suppressed defenders shoot less, so the assault can close (Fig 1, Fig 6).");
    }
  }
  if (S.metrics.detectedAt != null && scen.stealth) why.push(`The enemy spotted you at ${clock(S.metrics.detectedAt)}.`);
  if (scen.stealth && S.metrics.detectedAt == null) sustain.push("You moved without being seen: covered and concealed routes, low and slow.");
  const fDown = score.friendlyDown;
  if (fDown > 0) why.push(`Notional losses: ${fDown} of yours down vs ${score.enemyDown} of the enemy's${score.enemyCaptured ? ` (${score.enemyCaptured} captured)` : ""}.`);
  const evac = S.soldiers.filter((s) => s.side === "f" && s.evac).length;
  if (evac) why.push(`${evac} casualt${evac > 1 ? "ies were" : "y was"} carried back to the casualty collection point; each carrier was out of the fight while doing it.`);
  // scenario-specific notes
  const extra = scen.aarNotes ? scen.aarNotes(S, api, score) : {};
  why.push(...(extra.why || [])); sustain.push(...(extra.sustain || [])); improve.push(...(extra.improve || []));
  if (plan?.doctrinal && score.tier > 1) improve.push("This was the recommended plan; in this model it usually succeeds, but chance (who is spotted first, who is hit) can still go against it. Run again to see the spread of outcomes.");
  // concepts: used / avoided (a trap the plan stayed out of) / missed (a key idea skipped or a trap fallen into)
  const concepts = conceptStatus(scen, extra.used || (plan ? plan.concepts || [] : null));
  const missed = concepts.filter((c) => c.status === "missed");
  if (missed.length && score.tier > 1) improve.push(`Concept${missed.length > 1 ? "s" : ""} to study: ${missed.map((c) => `Fig ${c.fig} ${c.title}`).join(", ")}.`);
  return {
    score,
    planned: plan ? { id: plan.id, name: plan.name, form: plan.form, summary: plan.summary, doctrinal: !!plan.doctrinal } : { id: null, name: "Orders given during play", form: null, summary: null, doctrinal: false },
    happened: tl.map((e) => ({ t: e.t, clock: e.clock, text: e.text, type: e.type, side: e.side || null })),
    why, sustain, improve, concepts,
    recommended: scen.plans?.find((p) => p.doctrinal)?.id || null,
    notional: "Fictional scenario; numbers are notional teaching values, not a US Army training aid.",
  };
}
// Per-concept status for an AAR. Key concepts are the recommended plan's; a trap is a concept some other
// plan leans on but the recommended one does not (e.g. a frontal attack); the rest are related reading.
// planConcepts null = no plan to compare (orders given during play): nothing is judged.
//   status: "used" | "avoided" | "missed" | "related"; trap: true for a trap; used: status === "used".
export function conceptStatus(scen, planConcepts) {
  const key = new Set(scen.plans?.find((p) => p.doctrinal)?.concepts || []);
  const other = new Set((scen.plans || []).filter((p) => !p.doctrinal).flatMap((p) => p.concepts || []));
  const mine = planConcepts ? new Set(planConcepts) : null;
  return (scen.concepts || []).map((c) => {
    const trap = !key.has(c.slug) && other.has(c.slug);
    let status = "related";
    if (mine && key.has(c.slug)) status = mine.has(c.slug) ? "used" : "missed";
    else if (mine && trap) status = mine.has(c.slug) ? "missed" : "avoided";
    return { ...c, href: figHref(c.slug), status, trap, used: status === "used" };
  });
}
const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

// Which scenario plan a player's own orders (Medium, Hard) came closest to. `used` = [[elId, routeKey]…]:
// the named routes elements were actually sent along. The plan sharing the most element+route pairs wins
// (ties go to the recommended plan); null when nothing matches.
export function closestPlan(scen, used) {
  let bestP = null, bestN = 0;
  for (const p of scen.plans || []) {
    const keys = (id) => { const a = p.assign?.[id]; if (!a) return []; return [a, ...(a.then || [])].map((b) => b.route).concat(a.commit?.route ? [a.commit.route] : []); };
    const n = new Set((used || []).filter(([id, k]) => keys(id).includes(k)).map(([id, k]) => `${id}:${k}`)).size;
    if (n > bestN || (n === bestN && n > 0 && p.doctrinal)) { bestN = n; bestP = p; }
  }
  return bestP;
}
// The named route a freely drawn order follows (Hard), or null: the scenario routes this element's plans
// or choices give it, scored by how far the drawn path strays from the route on average and how far its end is
// from the route's end; accepted within `tol` world units.
export function matchRoute(scen, elId, pts, tol) {
  if (!pts || pts.length < 2) return null;
  const keys = routeKeysFor(scen, elId);
  const sample = [];
  for (let i = 1; i < pts.length; i++) for (let k = 0; k < 4; k++) { const f = k / 4; sample.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]); }
  sample.push(pts[pts.length - 1]);
  const end = pts[pts.length - 1];
  let best = null, bd = Infinity;
  for (const k of keys) {
    const r = scen.routes[k]?.pts; if (!r || r.length < 2) continue;
    const mean = sample.reduce((n, q) => n + polyDistP(q, r), 0) / sample.length;
    const re = r[r.length - 1], dEnd = Math.hypot(end[0] - re[0], end[1] - re[1]);
    const d = Math.max(mean, dEnd * 0.6);
    if (d < bd) { bd = d; best = k; }
  }
  return bd <= tol ? best : null;
}
// the named routes an element may use: its Easy choices plus every route a scenario plan gives it
export function routeKeysFor(scen, elId) {
  const keys = new Set(scen.choices?.[elId]?.routes || []);
  for (const p of scen.plans || []) {
    const a = p.assign?.[elId]; if (!a) continue;
    for (const b of [a, ...(a.then || [])]) if (typeof b.route === "string") keys.add(b.route);
    if (a.commit?.route) keys.add(a.commit.route);
  }
  return [...keys].filter((k) => scen.routes[k]?.pts?.length > 1);
}
const polyDistP = (p, pts) => {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / L)) : 0;
    d = Math.min(d, Math.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy));
  }
  return d;
};
