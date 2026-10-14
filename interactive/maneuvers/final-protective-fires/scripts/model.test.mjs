// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/final-protective-fires/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, newRun, step, simulate, phaseWord, roundsLeft, enemyDown, friendlyDown, readoutMachine, readoutField } from "./model.mjs";

// the sourced number: the beaten zone is 30 m deep (Table B-1, two 60-mm mortars: 60 m by 30 m)
assert.equal(MODEL.box[1] - MODEL.box[0], 30);
// notional: 30 rounds at 7.5 a second is 4 s of fire at the maximum rate
assert.equal(MODEL.rounds / MODEL.rate, 4);

// called at the wire (the default, 10 m out): the assault is checked and breaks, at a cost
{
  const s = simulate(10);
  assert.equal(s.phase, "breaking");
  assert.equal(friendlyDown(s), 1);
  assert.equal(enemyDown(s), 6);
  assert.equal(roundsLeft(s), 0);
}
// the window that works in this model: called from 0 to 80 m out
for (const tr of [0, 10, 30, 60, 80]) assert.equal(simulate(tr).phase, "breaking", "should break when called at " + tr);
// too early: the rounds are gone before the assault reaches the beaten zone, and it comes through
for (const tr of [90, 100, 150]) {
  const s = simulate(tr);
  assert.equal(s.phase, "through", "too early at " + tr);
  assert.equal(roundsLeft(s), 0);
}
// too late, or never: the assault is already through the wire
for (const tr of [-10, null]) assert.equal(simulate(tr).phase, "through", "too late at " + tr);
{
  const s = simulate(150);
  assert.equal(friendlyDown(s), 5);
  assert.equal(enemyDown(s), 2);
}
// the FPF fires at the maximum rate until the rounds run out: 4 s after the call they are gone
{
  const s = newRun(null);
  for (let i = 0; i < 60; i++) step(s, 1 / 60);
  step(s, 1 / 60, MODEL, true);
  const t0 = s.t;
  while (s.rounds > 0 && s.t < 20) step(s, 1 / 60);
  assert.ok(Math.abs(s.t - t0 - 4) < 0.05, "4 s of fire, got " + (s.t - t0));
}
// phases and readouts
{
  const s = simulate(10, 6);
  assert.equal(phaseWord(s), "Checked");
  assert.equal(readoutMachine(s), "Checked · 7 m out · FPF 20 rds");
  assert.equal(phaseWord(simulate(10, 1)), "Advancing");
}
// every readout along every run fits the card corner, and men down only ever rise
for (const tr of [-10, 0, 10, 40, 80, 100, 150, null]) {
  const s = newRun(tr);
  let e = 0, f = 0;
  while (!s.done) {
    step(s, 1 / 60);
    assert.ok(readoutField(s).length < 45, readoutField(s));
    assert.ok(readoutMachine(s).length < 45, readoutMachine(s));
    assert.ok(enemyDown(s) >= e && friendlyDown(s) >= f);
    e = enemyDown(s); f = friendlyDown(s);
  }
  assert.ok(e >= 1 && f >= 1, "both sides lose someone at " + tr);
}
console.log("model.test: all passed");
