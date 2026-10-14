// Maneuver Trainer core tests: `node sim.test.mjs` (SEEDS=10 for a quick pass, ONLY=<id> for one scenario).
// Checks: scenario sanity and wording, plan compilation, determinism, the API a UI needs, Hard-mode
// order delay, run time, and the done check: over the seeds, the doctrinal plan reaches the top
// tier in >= 80% of runs and the naive plan scores lower than it in >= 80% (same seed).
import { SCENARIOS } from "./scenarios.mjs";
import { createSim } from "./sim.mjs";
import { compilePlan } from "./orders.mjs";
import { mulberry32 } from "./rng.mjs";

const SEEDS = +(process.env.SEEDS || 50);
const ONLY = process.env.ONLY || null;
const SLUGS = new Set(["flank-attack", "double-envelopment", "turning-movement", "penetration", "infiltration", "frontal-attack", "decisive-points", "culminating-point", "main-effort", "recon-pull", "surfaces-and-gaps", "bypass", "combined-arms-dilemma", "elastic-defense", "mobile-defense", "retrograde", "omg"]);
// Scenarios whose doctrinal answer is to avoid contact: losses on both sides are expected to be zero.
const NO_CONTACT = new Set(["dead-ground", "crossroads-recon"]);
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL", msg); } };
const hashEvents = (S) => { let h = 0; for (const e of S.events) for (const c of `${e.t}${e.text}`) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0; return h; };

// ---- rng ----
{ const a = mulberry32(5), b = mulberry32(5); ok(a() === b() && a() === b(), "rng deterministic"); }

// ---- sanity ----
ok(SCENARIOS.length === 12, "12 scenarios");
const levels = {};
for (const sc of SCENARIOS) {
  levels[sc.level] = (levels[sc.level] || 0) + 1;
  const txt = JSON.stringify({ b: sc.briefing, p: sc.plans.map((p) => [p.name, p.summary, p.form]), r: Object.values(sc.routes).map((r) => r.label), t: Object.values(sc.triggers || {}).map((t) => t.label), f: [...sc.forces.friendly, ...sc.forces.enemy].map((e) => e.name) });
  ok(!/four-man/i.test(txt), `${sc.id}: no "four-man"`);
  ok(!/\bnight\b/i.test(txt), `${sc.id}: "limited visibility", not "night"`);
  ok(!/bounding overwatch/i.test(txt) || !/in contact/i.test(txt.match(/[^.]*bounding overwatch[^.]*/i)?.[0] || ""), `${sc.id}: bounding overwatch only out of contact`);
  for (const k of ["mission", "enemy", "terrain", "troops", "time"]) ok(sc.briefing[k], `${sc.id}: briefing.${k}`);
  ok(sc.plans.length >= 3 && sc.plans.length <= 4, `${sc.id}: 3-4 plans`);
  ok(sc.plans.filter((p) => p.doctrinal).length === 1, `${sc.id}: exactly one doctrinal plan`);
  ok(sc.plans.filter((p) => p.naive).length === 1, `${sc.id}: one naive plan`);
  for (const c of sc.concepts) ok(SLUGS.has(c.slug) && c.href === `/interactive/maneuvers/${c.slug}/`, `${sc.id}: concept ${c.slug}`);
  for (const p of sc.plans) { try { compilePlan(sc, p); } catch (e) { ok(false, `${sc.id}/${p.id}: ${e.message}`); } }
  for (const [el, ch] of Object.entries(sc.choices || {})) for (const r of ch.routes || []) ok(sc.routes[r], `${sc.id}: choice route ${el}.${r}`);
  const W = sc.terrain.world;
  for (const r of Object.values(sc.routes)) for (const [x, y] of r.pts) ok(x >= -200 && x <= W.w + 200 && y >= -200 && y <= W.h + 250, `${sc.id}: route point in range ${x},${y}`);
}
ok(levels.fireteam === 4 && levels.platoon === 4 && levels.company === 4, "4 scenarios per level");

// ---- API smoke + Hard order delay ----
{
  const sc = SCENARIOS[0];
  const sim = createSim(sc, { seed: 3 });
  sim.step(1);
  const st = sim.state();
  for (const k of ["t", "clock", "soldiers", "elements", "contacts", "streams", "smoke", "events", "losses"]) ok(k in st, `state().${k}`);
  const s0 = st.soldiers[0];
  for (const k of ["id", "el", "side", "role", "x", "y", "z", "face", "pose", "status", "stride"]) ok(k in s0, `soldier.${k}`);
  sim.issue("sup", { type: "sbf", to: [345, 115], target: "mg" });
  sim.runTurn(20);
  ok(sim.S.t >= 20.9 && sim.S.t <= 21.1, "runTurn advances 20 s");
  const st2 = sim.state();
  ok(st2.streams.every((s) => s.from.length === 3 && Array.isArray(s.to) && s.period > 0), "streams in trShots shape");
  const co = SCENARIOS.find((s) => s.level === "company");
  const hard = createSim(co, { seed: 1, mode: "hard" });
  const r = hard.issue("p1", { type: "move", to: [700, 300] });
  ok(r && r.delay >= 10 && r.delay <= 20, "Hard company order delay 10-20 s");
  // regression: delayed instant actions (lift / shift / smoke / callfire) must not replace the unit's task
  {
    const h = createSim(co, { seed: 2, mode: "hard" });
    const el = h.S.byId.p1;
    h.issue("p1", { type: "sbf", to: [el.x, el.y + 20], target: co.forces.enemy[0].id });
    h.runTurn(25);
    ok(el.order?.type === "sbf", "Hard delayed sbf applied");
    const missions0 = h.S.missions.length;
    h.issue("p1", { type: "callfire", at: [700, 600], kind: "smoke" });
    h.issue("p1", { type: "lift" });
    h.runTurn(25);
    ok(el.order?.type === "sbf" && el.lifted, `Hard delayed lift keeps the sbf task (order ${el.order?.type}, lifted ${el.lifted})`);
    ok(h.S.missions.length === missions0 + 1, "Hard delayed callfire fires a mission without replacing the task");
    ok(!h.S.pending.length, "pending orders drained");
  }
  const easyPlan = createSim(co, { seed: 1, plan: co.plans[0].id });
  easyPlan.runTurn(5);
  ok(easyPlan.state().elements.some((e) => e.order), "plan compiles into orders");
}

// ---- done check ----
const rows = [];
for (const sc of SCENARIOS) {
  if (ONLY && sc.id !== ONLY) continue;
  const D = sc.plans.find((p) => p.doctrinal), Nv = sc.plans.find((p) => p.naive);
  // determinism
  const a = createSim(sc, { seed: 11, plan: D.id }); a.run();
  const b = createSim(sc, { seed: 11, plan: D.id }); b.run();
  ok(a.score().score === b.score().score && hashEvents(a.S) === hashEvents(b.S) && a.S.t === b.S.t, `${sc.id}: deterministic`);
  // timing (CPU time of one full run, warm)
  const c0 = process.cpuUsage(); const w0 = performance.now();
  const tsim = createSim(sc, { seed: 12, plan: D.id }); tsim.run();
  const cpu = (process.cpuUsage(c0).user + process.cpuUsage(c0).system) / 1000, wall = performance.now() - w0;
  let top = 0, lower = 0, fD = 0, hD = 0, fPos = 0, fN = 0, hN = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const d = createSim(sc, { seed, plan: D.id }); d.run(); const ds = d.score();
    const n = createSim(sc, { seed, plan: Nv.id }); n.run(); const ns = n.score();
    if (ds.tier === 1) top++;
    if (ns.score < ds.score) lower++;
    fD += ds.friendlyDown; hD += ds.enemyDown; if (ds.friendlyDown > 0) fPos++;
    fN += ns.friendlyDown; hN += ns.enemyDown;
  }
  const row = { id: sc.id, docTop: top / SEEDS, naiveLower: lower / SEEDS, docFriendly: +(fD / SEEDS).toFixed(2), docFriendlyPos: fPos / SEEDS, docEnemy: +(hD / SEEDS).toFixed(2), naiveFriendly: +(fN / SEEDS).toFixed(2), naiveEnemy: +(hN / SEEDS).toFixed(2), cpuMs: Math.round(cpu), wallMs: Math.round(wall) };
  rows.push(row);
  ok(row.docTop >= 0.8, `${sc.id}: doctrinal top tier ${row.docTop}`);
  ok(row.naiveLower >= 0.8, `${sc.id}: naive lower ${row.naiveLower}`);
  if (!NO_CONTACT.has(sc.id)) ok(row.docEnemy > 0, `${sc.id}: enemy losses > 0`);
  ok(cpu < 1000, `${sc.id}: one run < 1 s CPU (${Math.round(cpu)} ms)`);
}
console.table(rows);
console.log(fails ? `${fails} check(s) failed` : "all checks passed");
process.exit(fails ? 1 : 0);
