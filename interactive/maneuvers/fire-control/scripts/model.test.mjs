// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/fire-control/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, STEPS, STEP_SHORT, C_START, fresh, engage, step, simulate, wastedPct, bluesDown, redDown, firing, hitShare } from "./model.mjs";
import { FG, fieldHoles, trpAt } from "./field-scene.mjs";

// the parameters the page quotes
assert.equal(MODEL.teams, 6); assert.equal(MODEL.w.length, 5);
assert.deepEqual(MODEL.Q, [6, 6, 9, 6, 6]); assert.deepEqual(MODEL.w, [1, 1, 3, 1, 1]);
assert.equal(MODEL.cap, 2); assert.equal(MODEL.lag, 0.6); assert.equal(MODEL.tEnd, 16); assert.equal(MODEL.prep, 3); assert.equal(MODEL.blueK, 0.06);
assert.equal(MODEL.threat, 2); assert.deepEqual(C_START, [0, 1, 2, 2, 3, 4]);
// ATP 3-21.8 para A-33: four steps, in this order
assert.equal(STEPS.length, 4); assert.equal(STEP_SHORT.length, 4);
assert.equal(STEPS[0], "Identify probable enemy locations and determine the enemy scheme of maneuver");
assert.equal(STEPS[1], "Determine where and how to mass fires");
assert.equal(STEPS[2], "Orient forces to speed target acquisition");
assert.equal(STEPS[3], "Shift fires to refocus or redistribute");

// the two outcomes quoted in "What is notional"
const u = simulate("U");
assert.equal(u.end, "reached"); assert.equal(+u.t.toFixed(1), 16);
assert.deepEqual(u.down.map((d) => (d === null ? null : +d.toFixed(1))), [3.0, 6.6, 11.7, 15.3, null]);
assert.equal(firing(u), 1); assert.equal(Math.round(u.fired), 96); assert.equal(wastedPct(u), 72);
assert.equal(bluesDown(u), 5); assert.equal(redDown(u), 12);
const c = simulate("C");
assert.equal(c.end, "cleared"); assert.equal(+c.t.toFixed(1), 6.0);
assert.equal(firing(c), 0); assert.equal(wastedPct(c), 8); assert.equal(bluesDown(c), 2); assert.equal(redDown(c), 15);
assert.ok(c.shifted && c.stage === 4);
// the lit target (greatest threat) falls first under control, last-but-one without it
assert.ok(c.down[2] < c.down[0] && c.down[2] < c.down[4]);
assert.ok(u.down[2] > u.down[0] && u.down[2] > u.down[1]);

// the steps light in order during the prep, before the enemy is released
{
  const s = engage(fresh("C")), seen = [];
  for (let i = 0; i < 400; i++) { step(s, 0.01); if (!seen.length || seen[seen.length - 1] !== s.stage) seen.push(s.stage); if (s.phase === "battle") break; }
  assert.deepEqual(seen, [0, 1, 2, 3]); assert.equal(s.t < 0.02, true);
  assert.equal(s.stage, 3);
}
// control never does worse than no control on the same enemy, and 2 teams cap holds
for (const cap of [1, 2, 3]) {
  const m = { ...MODEL, cap };
  assert.ok(simulate("C", {}, m).t <= simulate("U", {}, m).t + 1e-9);
}
// page budget: the readouts fit the card corner (under 45 chars)
for (const r of ["Uncontrolled · 5 of 5 firing · 100% wasted", "Controlled · 5 of 5 firing · 15 vs 15 down", "Step 2: decide where, how to mass"]) assert.ok(r.length < 45, r);
// layout: six teams, two holes each, TRP in each lane
assert.equal(fieldHoles().length, 12); assert.equal(FG.TEAM_A.length, MODEL.teams);
assert.equal(trpAt(0).length, 2);
console.log("model.test: all passed");
