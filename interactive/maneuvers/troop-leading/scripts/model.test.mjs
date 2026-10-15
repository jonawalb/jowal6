// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/troop-leading/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, STEPS, END, subHours, oneThird, keptTooMuch, planDone, taskFrac, rehearsed, covered, bounds, stepStates, outcome, assaultAt, fallenF, fallenE, tasksDone, readout } from "./model.mjs";

assert.equal(STEPS.length, 8);
assert.deepEqual(STEPS, ["Receive the mission", "Issue a WARNORD", "Make a tentative plan", "Initiate movement", "Conduct reconnaissance", "Complete the plan", "Issue the order", "Supervise and refine"]);
assert.ok(Math.abs(MODEL.weights.reduce((a, b) => a + b, 0) - 1) < 1e-9);
assert.equal(MODEL.total, 12);
assert.equal(oneThird(), 4);
assert.equal(MODEL.start, 4);
assert.equal(subHours(4), 8);
assert.equal(keptTooMuch(4), false);
assert.equal(keptTooMuch(5), true);
assert.equal(MODEL.tasks.reduce((a, t) => a + t.len, 0), 7);
// one third to the leader: the squads cover everything with time to spare
assert.deepEqual(taskFrac(4), [1, 1, 1]);
assert.equal(rehearsed(5), 1);                       // seven hours is exactly the list
assert.equal(rehearsed(6), 2 / 3);
assert.equal(rehearsed(7), 1 / 3);
assert.equal(rehearsed(8), 0);                       // four hours: plan and checks only
assert.equal(covered(4), 1);
assert.equal(covered(8), 4 / 7);
assert.ok(Math.abs(planDone(2) - 2 / 3) < 1e-12);
assert.equal(planDone(3), 1);
assert.equal(planDone(6), 1);
// outcomes (friendly down vs enemy down)
const o = (s) => { const x = outcome(s); return [x.friendly, x.enemy]; };
assert.deepEqual(o(2), [2, 6]);
assert.deepEqual(o(3), [1, 6]);
assert.deepEqual(o(4), [1, 6]);
assert.deepEqual(o(5), [1, 6]);
assert.deepEqual(o(6), [2, 5]);
assert.deepEqual(o(7), [4, 4]);
assert.deepEqual(o(8), [5, 3]);
// keeping more time never helps the squads
for (let s = 3; s < 8; s++) { assert.ok(outcome(s + 1).friendly >= outcome(s).friendly); assert.ok(outcome(s + 1).enemy <= outcome(s).enemy); }
// steps: sequential inside the leader's block; step 8 runs from the order to the end
const b = bounds(4);
assert.ok(Math.abs(b[6] - 4) < 1e-9);
assert.deepEqual(stepStates(0, 4), [1, 0, 0, 0, 0, 0, 0, 0]);
assert.deepEqual(stepStates(1.5, 4), [2, 2, 1, 0, 0, 0, 0, 0]);
assert.deepEqual(stepStates(4, 4), [2, 2, 2, 2, 2, 2, 2, 1]);
assert.deepEqual(stepStates(END, 4), [2, 2, 2, 2, 2, 2, 2, 2]);
// every step is visited in order as the clock runs
let last = -1;
for (let c = 0; c < END; c += 0.05) { const a = stepStates(c, 4).lastIndexOf(1); assert.ok(a >= last || a === 7, `order at ${c}`); last = Math.max(last, a); }
// casualties fall one at a time and never exceed the final count
const out = outcome(7);
assert.equal(fallenF(out, 0), 0);
assert.equal(fallenF(out, 1), out.friendly);
assert.equal(fallenE(out, 1), out.enemy);
assert.equal(assaultAt(MODEL.total), 0);
assert.equal(assaultAt(END), 1);
assert.equal(tasksDone(0, 4), 0);
assert.equal(tasksDone(11.9, 4), 3);
assert.equal(tasksDone(12, 8), 2);                 // the rehearsal is never finished
// the readout fits the card (under 45 characters)
for (let s = 2; s <= 8; s++) for (let c = 0; c <= END; c += 0.5) { const r = readout(s, c); assert.ok(r.length < 45, `${r} is ${r.length}`); }
console.log("model.test: all passed");
