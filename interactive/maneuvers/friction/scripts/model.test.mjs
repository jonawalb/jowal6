// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/friction/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, steadyPull, breakaway, paperPull, paperTime, winchSpeed, gritFor, startRun, step, tension, stateOf, runTime } from "./model.mjs";

const n1 = (v) => Math.round(v * 10) / 10;
// quoted pulls: mg(sin 20° + μ cos 20°)
assert.equal(n1(steadyPull(0)), 3.4);
assert.equal(n1(steadyPull(0.3)), 6.1);
assert.equal(n1(steadyPull(0.6)), 8.9);
assert.equal(n1(paperPull()), 3.4);
// quoted paper time
assert.equal(n1(paperTime()), 9.1);
// quoted notional parameters
assert.equal(MODEL.mass, 1);
assert.equal(MODEL.g, 9.81);
assert.equal(MODEL.angle, 20);
assert.equal(MODEL.staticExtra, 0.08);
assert.deepEqual(MODEL.grit.force, [2.5, 5]);
assert.equal(MODEL.winch, 16);
assert.equal(MODEL.stall, 18);
assert.equal(1 / MODEL.stiffness, 2); // 2 cm per newton on the scale
assert.equal(winchSpeed(0), 16);
assert.equal(winchSpeed(18), 0);
// the scale covers the largest breakaway the controls allow
assert.ok(breakaway(MODEL.mu[1], MODEL.grit.force[1]) < MODEL.scale);
assert.ok(breakaway(MODEL.mu[1], MODEL.grit.force[1]) < MODEL.stall);

// grit is deterministic per seed, spaced, inside the travel
for (let seed = 1; seed < 200; seed++) {
  const g = gritFor(seed);
  assert.deepEqual(g, gritFor(seed));
  assert.ok(g.length >= MODEL.grit.count[0] && g.length <= MODEL.grit.count[1], `seed ${seed}: ${g.length} grains`);
  for (let i = 1; i < g.length; i++) assert.ok(g[i].at - g[i - 1].at >= MODEL.grit.gap);
  for (const x of g) assert.ok(x.at > 0 && x.at < MODEL.travel && x.force >= 2.5 && x.force <= 5);
}

// a run: never moves backwards, stalls on every grain, and needs the full breakaway to leave it
for (const mu of [0, 0.3, 0.6]) {
  const s = startRun(5);
  let lastX = 0, stalls = 0, was = "";
  while (!s.done && s.t < 60) {
    step(s, 1 / 60, mu, true);
    assert.ok(s.x >= lastX - 1e-9, "block moved backwards");
    lastX = s.x;
    const st = stateOf(s);
    if (st === "grit" && was !== "grit") stalls++;
    if (st === "grit") assert.ok(tension(s) <= breakaway(mu, s.on.force) + 0.05);
    was = st;
  }
  assert.ok(s.done, `mu ${mu}: did not reach the top`);
  assert.equal(stalls, gritFor(5).length);
  // while moving at a steady speed, the pull settles at the steady pull
}
// steady state with no grit: the pull at the top equals mg(sin + μ cos) within 0.3 N
for (const mu of [0, 0.3, 0.6]) {
  const s = startRun(1);
  while (!s.done) step(s, 1 / 60, mu, false);
  assert.ok(Math.abs(tension(s) - steadyPull(mu)) < 0.3, `mu ${mu}: ${tension(s)} vs ${steadyPull(mu)}`);
}
// friction and grit both cost time against the paper run
assert.ok(runTime(0.3, false) > paperTime());
assert.ok(runTime(0.3, true, 5) > runTime(0.3, false, 5));
console.log("model.test: all passed");

// Battlefield view (added 2026-10-13): numbers quoted in the Battlefield paragraphs
import { FIELD, minutes, paperTAt, paperXAt, contactLoss, casualties, fieldReadout, incidentKinds } from "./model.mjs";
assert.equal(FIELD.minPerSec, 5);
assert.equal(minutes(paperTAt(MODEL.travel)), 45);            // the 45-minute plan
assert.equal(minutes(paperTime()), 45);
assert.equal(FIELD.heavy, 3.75);
assert.deepEqual(contactLoss(3), { blue: 1, red: 1 });
assert.deepEqual(contactLoss(4.5), { blue: 2, red: 1 });
assert.ok(Math.abs(paperXAt(paperTAt(60)) - 60) < 0.2);
for (let seed = 1; seed < 120; seed++) {
  const k = incidentKinds(seed);
  assert.equal(new Set(k).size, k.length);                      // never the same incident twice in a run
  for (const mu of [0, 0.3, 0.6]) for (const grit of [true, false]) {
    const s = startRun(seed);
    while (!s.done && s.t < 60) {
      step(s, 1 / 30, mu, grit);
      assert.ok(fieldReadout(s, seed, mu, "run").length < 45, fieldReadout(s, seed, mu, "run"));
    }
    const c = casualties(s, seed);
    if (!grit) assert.deepEqual(c, { blue: 0, red: 0 });       // no incidents, no contact
    const want = k.reduce((a, kind, i) => kind === "contact" ? { blue: a.blue + contactLoss(s.grit[i].force).blue, red: a.red + 1 } : a, { blue: 0, red: 0 });
    if (grit) assert.deepEqual(c, want);
    assert.ok(fieldReadout(s, seed, mu, "run").length < 45);
  }
}
assert.ok(fieldReadout(startRun(1), 1, 0.3, "reset").length < 45);
console.log("model.test (battlefield): all passed");
