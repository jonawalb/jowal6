// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/breach-sosra/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, NAMES, DOC, FORCES, allOn, noneOn, count, firstMissing, stateAt, finalState, phaseWord, readoutMachine, readoutField, endOf } from "./model.mjs";

// the doctrine: five fundamentals, in this order (FM 3-90 para 18-23; ATP 3-21.10 (2026) para F-23)
assert.deepEqual(NAMES, ["Suppress", "Obscure", "Secure", "Reduce", "Assault"]);
assert.equal(NAMES.map((n) => n[0]).join(""), "SOSRA");
assert.deepEqual(DOC.map((d) => d.name), NAMES);
assert.deepEqual(FORCES, ["Support", "Breach", "Assault"]);
// set times rise in the doctrinal order
for (let i = 1; i < 5; i++) assert.ok(MODEL.T[i] > MODEL.T[i - 1]);
// reduction begins only once suppression, obscuration and security are all set (FM 3-90 para 18-30)
assert.ok(MODEL.laneStart >= MODEL.T[2]);

const out = (cfg) => { const s = finalState(cfg); return [s.missing, s.seized, s.jammed, s.downF, s.downE, +s.lane.toFixed(2), +s.assault.toFixed(2)]; };
// all five applied: seized, 3 vs 6 down, lane open, assault through
assert.deepEqual(out(allOn()), [-1, true, false, 3, 6, 1, 1]);
const without = (i) => { const c = allOn(); c[i] = false; return out(c); };
assert.deepEqual(without(0), [0, false, true, 6, 0, 0.35, 0]);
assert.deepEqual(without(1), [1, false, true, 3, 2, 0.35, 0]);
assert.deepEqual(without(2), [2, false, true, 3, 2, 0.35, 0]);
assert.deepEqual(without(3), [3, false, true, 1, 2, 0, 0]);
assert.deepEqual(without(4), [4, false, true, 1, 2, 1, 0]);
// no omission is free and none completes the breach
for (let i = 0; i < 5; i++) { assert.equal(without(i)[1], false); assert.equal(without(i)[2], true); }
// nothing applied: nothing happens, nobody is lost or killed except by the breach force walking into fire
assert.equal(finalState(noneOn()).downE, 0);
assert.equal(finalState(noneOn()).nSet, 0);
// the chain: leaving out Obscure means Secure, Reduce and Assault never set even if ticked
{
  const c = allOn(); c[1] = false;
  const s = finalState(c);
  assert.deepEqual(s.set, [true, false, false, false, false]);
  assert.equal(firstMissing(c), 1);
}
// before release: nothing set, no losses
{
  const s = stateAt(allOn(), 5, false);
  assert.equal(s.nSet, 0); assert.equal(s.downF, 0);
  assert.equal(phaseWord(s), "Ready");
  assert.equal(readoutMachine(s), "Ready · 5/5 applied · 0 down");
  assert.equal(readoutField(s), "Ready · 5/5 applied · 0 vs 0 down");
}
// the chain sets in order over time with everything applied
{
  const c = allOn();
  assert.equal(stateAt(c, 0.5).nSet, 0);
  assert.equal(stateAt(c, 2).nSet, 1);
  assert.equal(stateAt(c, 4).nSet, 2);
  assert.equal(stateAt(c, 6).nSet, 3);
  assert.equal(stateAt(c, 10).nSet, 4);
  assert.equal(stateAt(c, 13).nSet, 5);
  assert.equal(phaseWord(stateAt(c, 2)), "Obscure");
  assert.equal(phaseWord(stateAt(c, 6)), "Reduce");
  assert.equal(phaseWord(stateAt(c, 13)), "Far side seized");
  // the lane is reduced only after suppression, obscuration and security (the assault starts after the lane)
  assert.equal(stateAt(c, 5).lane, 0);
  assert.ok(stateAt(c, 7).lane > 0 && stateAt(c, 7).assault === 0);
  assert.ok(stateAt(c, 10).assault > 0 && stateAt(c, 10).lane === 1);
}
// every readout along every configuration fits the card corner; men down only ever rise
for (let mask = 0; mask < 32; mask++) {
  const cfg = Array.from({ length: 5 }, (_, i) => !!(mask & (1 << i)));
  assert.equal(count(cfg), cfg.filter(Boolean).length);
  let f = 0, e = 0;
  for (let t = 0; t <= endOf(cfg) + MODEL.hold + 0.01; t += 1 / 30) {
    const s = stateAt(cfg, t);
    assert.ok(readoutField(s).length < 45, readoutField(s));
    assert.ok(readoutMachine(s).length < 45, readoutMachine(s));
    assert.ok(s.downF >= f && s.downE >= e);
    assert.ok(s.downF <= MODEL.breachMen + 3);
    f = s.downF; e = s.downE;
  }
}
console.log("model.test: all passed");
