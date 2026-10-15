// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/passage-of-lines/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, passPlan, reliefPlan, stateAt, finalState, phaseWord, readoutMachine, readoutField, snapK } from "./model.mjs";

// forward passage: entry, halting and the two-thirds trigger
const p1 = passPlan(1), p2 = passPlan(2), p3 = passPlan(3);
assert.deepEqual(p1.enter, [3, 7, 11]);
assert.deepEqual(p2.enter, [3, 3, 7]);
assert.deepEqual(p3.enter, [3, 3, 7]);
assert.deepEqual(p1.halt, [0, 0, 0]);
assert.deepEqual(p2.halt, [0, 0, 0]);
assert.deepEqual(p3.halt, [0, 0, 4]);
assert.equal(p1.T2, 9); assert.equal(p2.T2, 5); assert.equal(p3.T2, 5);
assert.equal(p1.duration, 18); assert.equal(p2.duration, 14); assert.equal(p3.duration, 14);
assert.equal(p1.hitF, 1); assert.equal(p2.hitF, 2); assert.equal(p3.hitF, 4);
assert.equal(p1.nE, 3); assert.equal(p2.nE, 5); assert.equal(p3.nE, 5);
// the lane is never held by two platoons at once
for (const p of [p1, p2, p3]) {
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    if (p.lane[i] !== p.lane[j]) continue;
    assert.ok(p.enter[j] >= p.bhl[i] - 1e-9 || p.enter[i] >= p.bhl[j] - 1e-9, "one lane, one platoon at a time");
  }
}
// relief in place
const r1 = reliefPlan(1), r2 = reliefPlan(2), r3 = reliefPlan(3);
assert.deepEqual(r1.start, [0, 6, 12]); assert.deepEqual(r2.start, [0, 0, 6]); assert.deepEqual(r3.start, [0, 0, 0]);
assert.equal(r1.duration, 22); assert.equal(r2.duration, 16); assert.equal(r3.duration, 10);
assert.equal(r1.T2, 12); assert.equal(r2.T2, 6); assert.equal(r3.T2, 6);
assert.equal(r1.detected, false); assert.equal(r2.detected, false); assert.equal(r3.detected, true);
assert.equal(r1.hitF, 1); assert.equal(r3.hitF, 5); assert.equal(r3.nE, 2); assert.equal(r1.nE, 1);
assert.equal(r3.peak, 3); assert.equal(r1.peak, 1);
// simultaneous takes the least time (FM 3-90 15-3), sequential the most
assert.ok(r3.duration < r2.duration && r2.duration < r1.duration);
// outcomes at the end of every run
const out = (mode, k) => { const s = finalState({ mode, k }); return [s.downF, s.downE, s.through]; };
assert.deepEqual(out("pass", 1), [1, 3, 3]);
assert.deepEqual(out("pass", 2), [2, 5, 3]);
assert.deepEqual(out("pass", 3), [4, 5, 3]);
assert.deepEqual(out("relief", 1), [1, 1, 3]);
assert.deepEqual(out("relief", 3), [5, 2, 3]);
// men down only rise; every readout fits the card corner; positions stay in 0..1
for (const mode of ["pass", "relief"]) for (const k of [1, 2, 3]) {
  const cfg = { mode, k };
  const end = finalState(cfg).plan.end + MODEL.hold + 0.1;
  let f = 0, e = 0, th = 0;
  for (let t = 0; t <= end; t += 1 / 30) {
    const s = stateAt(cfg, t);
    assert.ok(readoutField(s).length < 45, readoutField(s));
    assert.ok(s.downF >= f && s.downE >= e && s.through >= th);
    assert.ok(s.downF <= 6 && s.downE <= MODEL.enemy);
    for (const x of s.pl) assert.ok(x.sigma >= 0 && x.sigma <= 1 + 1e-9 && (x.out === undefined || (x.out >= 0 && x.out <= 1)));
    f = s.downF; e = s.downE; th = s.through;
  }
}
// control passes at the second of three, never before
assert.equal(stateAt({ mode: "pass", k: 2 }, 4.9).passed, false);
assert.equal(stateAt({ mode: "pass", k: 2 }, 5.0).passed, true);
assert.equal(stateAt({ mode: "pass", k: 1 }, 8.9).passed, false);
assert.equal(stateAt({ mode: "pass", k: 1 }, 9.0).passed, true);
// before release nothing happens
{
  const s = stateAt({ mode: "pass", k: 3 }, 5, false);
  assert.equal(phaseWord(s), "Ready");
  assert.equal(readoutMachine(s), "Ready · 3 together · 2 lanes");
  assert.equal(readoutMachine(stateAt({ mode: "relief", k: 1 }, 0, false)), "Ready · 1 at once · sequential");
  assert.equal(readoutMachine(stateAt({ mode: "relief", k: 3 }, 0, false)), "Ready · 3 at once · simultaneous");
  assert.equal(readoutMachine(stateAt({ mode: "relief", k: 2 }, 0, false)), "Ready · 2 at once · two at once");
  assert.equal(s.downF + s.downE, 0);
}
// words along a run
{
  const c = { mode: "pass", k: 3 };
  assert.equal(phaseWord(stateAt(c, 1)), "Moving up");
  assert.equal(phaseWord(stateAt(c, 4)), "Halted");
  assert.equal(phaseWord(stateAt({ mode: "pass", k: 2 }, 4)), "In lanes");
  assert.equal(phaseWord(stateAt(c, 5.5)), "Handed over");
  assert.equal(phaseWord(finalState(c)), "Complete");
  assert.equal(phaseWord(stateAt({ mode: "relief", k: 1 }, 5)), "Exchange");
}
assert.equal(snapK(0), 1); assert.equal(snapK(5), 3); assert.equal(snapK(2.4), 2);
console.log("model.test: all passed");
