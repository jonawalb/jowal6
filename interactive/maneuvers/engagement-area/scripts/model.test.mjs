// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/engagement-area/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, STEPS, allSteps, noSteps, stepCount, newRun, step, simulate, killRate, phaseWord, enemyDown, friendlyDown, readoutMachine, readoutField } from "./model.mjs";

// the doctrine: seven steps in the manual's order (ATP 3-21.10, 1 June 2026, para 3-61, p. 86)
assert.equal(STEPS.length, 7);
assert.deepEqual(STEPS.map((s) => s.name), [
  "Identify likely enemy avenues of approach",
  "Identify the most likely enemy COA",
  "Determine where to kill the enemy",
  "Position subordinate forces and weapons systems",
  "Plan and integrate obstacles",
  "Plan and integrate fires",
  "Rehearse the execution of operations within the EA",
]);
assert.ok(STEPS.every((s) => s.para === "3-61" && s.page === "86" && !("star" in s)));
STEPS.forEach((s, i) => assert.equal(s.n, i + 1));

// the notional rate: 0.9 x 1.5 = 1.35 kills per second with everything built
assert.ok(Math.abs(killRate(allSteps()) - 1.35) < 1e-9);
const out = (steps) => { const s = simulate(steps); return [s.phase, friendlyDown(s), enemyDown(s)]; };
assert.deepEqual(out(allSteps()), ["destroyed", 1, 12]);
const without = (i) => { const s = allSteps(); s[i] = false; return out(s); };
assert.deepEqual(without(0), ["through", 9, 3]);
assert.deepEqual(without(1), ["through", 9, 3]);
assert.deepEqual(without(2), ["through", 2, 10]);
assert.deepEqual(without(3), ["through", 3, 9]);
assert.deepEqual(without(4), ["through", 2, 11]);
assert.deepEqual(without(5), ["through", 1, 11]);
assert.deepEqual(without(6), ["through", 2, 10]);
// no step is free: every single omission lets at least one element through
for (let i = 0; i < 7; i++) assert.notEqual(without(i)[0], "destroyed");
// nothing built: nothing is killed in the area
assert.equal(enemyDown(simulate(noSteps())), 0);
// the obstacle belt slows the column: without step 5 the column is at the standoff sooner
assert.ok(simulate([1,1,1,1,0,1,1].map(Boolean)).end < simulate([1,1,1,1,1,1,0].map(Boolean)).end);
// waiting until released
{
  const s = newRun(allSteps());
  for (let i = 0; i < 120; i++) step(s, 1 / 60);
  assert.equal(s.t, 0); assert.equal(s.x, MODEL.start);
  assert.equal(phaseWord(s), "Building the EA");
  assert.equal(readoutMachine(s), "Building the EA · 7/7 steps · 0 down");
  assert.equal(readoutField(s), "Building the EA · 7/7 · 0 vs 0 down");
}
// every readout along every configuration fits the card corner, and men down only ever rise
for (let mask = 0; mask < 128; mask++) {
  const steps = Array.from({ length: 7 }, (_, i) => !!(mask & (1 << i)));
  const s = newRun(steps);
  step(s, 0, MODEL, true);
  let e = 0, f = 0;
  while (!s.done) {
    step(s, 1 / 60);
    assert.ok(readoutField(s).length < 45, readoutField(s));
    assert.ok(readoutMachine(s).length < 45, readoutMachine(s));
    assert.ok(enemyDown(s) >= e && friendlyDown(s) >= f);
    e = enemyDown(s); f = friendlyDown(s);
  }
  assert.ok(stepCount(steps) === steps.filter(Boolean).length);
  assert.ok(f >= 1, "the defenders lose someone in every run");
}
console.log("model.test: all passed");
