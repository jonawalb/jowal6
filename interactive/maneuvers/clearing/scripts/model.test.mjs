// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/clearing/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, POINTS, MEN, OPT, allOn, noneOn, count, stateAt, finalState, timesOf, downTimes, readoutMachine, readoutField, phaseWord, endOf } from "./model.mjs";

assert.equal(POINTS, 4);
assert.equal(MEN, 9);
assert.equal(OPT.length, 3);
// set times rise in order, for every combination
for (let mask = 0; mask < 8; mask++) {
  const cfg = [0, 1, 2].map((i) => !!(mask & (1 << i)));
  const { set, start } = timesOf(cfg);
  for (let i = 1; i < POINTS; i++) { assert.ok(set[i] > set[i - 1]); assert.ok(start[i] >= set[i - 1]); }
}
// all options: set at 4.5, 7.5, 10.5, 13.5 s; 1 vs 4 down
assert.deepEqual(timesOf(allOn()).set, [4.5, 7.5, 10.5, 13.5]);
const out = (cfg) => { const s = finalState(cfg); return [s.downF, s.downE, +s.end.toFixed(2)]; };
assert.deepEqual(out(allOn()), [1, 4, 13.5]);
assert.deepEqual(out([false, true, true]), [2, 4, 14.5]);   // no support
assert.deepEqual(out([true, false, true]), [2, 4, 18.9]);   // the same team keeps the lead: points take 3.0, 3.9, 4.8, 5.7 s
assert.deepEqual(out([true, true, false]), [2, 5, 15.5]);   // nobody holds the cleared points
assert.deepEqual(out(noneOn()), [4, 5, 21.9]);
// every combination is slower or costlier than all options, never cheaper
const base = finalState(allOn());
for (let mask = 0; mask < 7; mask++) {
  const cfg = [0, 1, 2].map((i) => !!(mask & (1 << i)));
  const s = finalState(cfg);
  assert.ok(s.downF > base.downF && s.end > base.end - 1e-9, `cfg ${cfg}`);
  assert.ok(s.downF <= 4);
}
// the key advances only after the previous pin is set
{
  const s = stateAt(allOn(), 6);
  assert.deepEqual(s.set, [true, false, false, false]);
  assert.ok(s.p > 1 && s.p < 2);
  assert.equal(stateAt(allOn(), 0.5).p, 0);
}
// reopened point: only without the team holding behind
{
  const c = [true, true, false];
  const T1 = timesOf(c).set[1];
  assert.equal(stateAt(c, T1 + 1.2).reopen, true);
  assert.equal(stateAt(allOn(), timesOf(allOn()).set[1] + 1.2).reopen, false);
  assert.equal(stateAt(c, T1 + 1.2).extra, true);
}
// lead team swaps with alternation, never without
assert.equal(stateAt(allOn(), 0.5).lead, 0);
assert.equal(stateAt(allOn(), 5).lead, 1);
assert.equal(stateAt([true, false, true], 8).lead, 0);
// before release: nothing set, no losses
{
  const s = stateAt(allOn(), 5, false);
  assert.equal(s.nSet, 0); assert.equal(s.downF, 0);
  assert.equal(phaseWord(s), "Ready");
  assert.equal(readoutMachine(s), "Ready · 3/3 options · 0 down");
  assert.equal(readoutField(s), "Ready · 3/3 options · 0 vs 0 down");
}
// the readouts fit the card corner, and men down only ever rise
for (let mask = 0; mask < 8; mask++) {
  const cfg = [0, 1, 2].map((i) => !!(mask & (1 << i)));
  assert.equal(count(cfg), cfg.filter(Boolean).length);
  let f = 0, e = 0;
  for (let t = 0; t <= endOf(cfg) + MODEL.hold + 0.01; t += 1 / 30) {
    const s = stateAt(cfg, t);
    for (const u of ["Bay", "Room"]) assert.ok(readoutField(s, u).length < 45, readoutField(s, u));
    assert.ok(readoutMachine(s).length < 45, readoutMachine(s));
    assert.ok(s.downF >= f && s.downE >= e);
    assert.ok(s.downF <= 4 && s.downE <= 5);
    f = s.downF; e = s.downE;
  }
}
console.log("model.test: all passed");
