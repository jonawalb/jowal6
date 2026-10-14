// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/bypass/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, CRITERIA, outcome, plan, simulate, readout, laneY, casualties, runner } from "./model.mjs";

// parameters quoted on the page
assert.equal(MODEL.n, 12);
assert.equal(MODEL.speed, 80);
assert.equal(MODEL.gap, 10.5);
const byName = Object.fromEntries(MODEL.rocks.map((r) => [r.name, r]));
assert.deepEqual([byName.medium.hold, byName.large.hold, byName.small.hold], [1.0, 2.0, 0.5]);
assert.deepEqual([byName.medium.fix, byName.large.fix, byName.small.fix], [1, 2, 1]);
assert.deepEqual(MODEL.rocks.map((r) => r.name), ["medium", "large", "small"]);

// outcomes quoted on the page: floats through, floats held back, finish time to 0.1 s
const want = [[12, 0, "8.3"], [11, 1, "7.8"], [10, 2, "6.8"], [8, 4, "4.8"]];
want.forEach(([through, held, finish], c) => {
  const o = outcome(c);
  assert.equal(o.through, through, `${CRITERIA[c]} through`);
  assert.equal(o.held, held, `${CRITERIA[c]} held`);
  assert.equal(o.finish.toFixed(1), finish, `${CRITERIA[c]} finish`);
  assert.equal(o.through + o.held, MODEL.n);
});
// bypassing all three holds back exactly a third of the force
assert.equal(outcome(3).held / MODEL.n, 1 / 3);
// in this model, reducing all three rocks costs the sum of their hold times (3.5 s) over bypassing all, within a frame
assert.ok(Math.abs(outcome(0).finish - outcome(3).finish - 3.5) < 0.05);

// floats holding a rock come from the head of the convoy, in flume order
assert.deepEqual(plan(3).slice(0, 5), [0, 1, 1, 2, -1]);
// a holding float goes round bypassed rocks before its own, and stays in the rock lane at its own
assert.ok(laneY(-80, 3, 1) > 0 && laneY(-5, 3, 1) < 0);
// a rock above the criteria is reduced: its reduction completes during the run
assert.equal(simulate(2, 30).rocks[1].progress, 1);
assert.equal(simulate(2, 30).rocks[0].progress, 0);

// the readout stays under 45 characters in every setting
for (let c = 0; c < 4; c++) assert.ok(readout(c, simulate(c, 30)).length < 45, readout(c, simulate(c, 30)));
// notional casualties quoted on the page (men down at the end of a run, friendly vs enemy)
const down = [[6, 20], [5, 18], [4, 13], [2, 4]];
down.forEach(([b, r], c) => assert.deepEqual(casualties(simulate(c, 30)), { blue: b, red: r }, `${CRITERIA[c]} casualties`));
assert.deepEqual(casualties(simulate(0, 0)), { blue: 0, red: 0 });
assert.equal(readout(2, simulate(2, 30)), "Bypass ≤ med · 10/12 · 6.8 s · 4 vs 13 down");
// the incremental runner the page uses gives the same states as a fresh simulate()
for (let c = 0; c < 4; c++) {
  const r = runner(c);
  for (const t of [0.5, 1.7, 3.33, 6, 9]) assert.deepEqual(r.to(t), simulate(c, t), `runner ${c} @ ${t}`);
}
console.log("model.test: all passed");
