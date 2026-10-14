// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/defeat-mechanisms/scripts/model.test.mjs
import assert from "node:assert/strict";
import { capability, separately, readoutText } from "./model.mjs";

const pct = (n) => Math.round(capability([1, 1, 1, 1].map((_, i) => (i < n ? 1 : 0))) * 100);
const sep = (n) => Math.round(separately([1, 1, 1, 1].map((_, i) => (i < n ? 1 : 0))) * 100);
assert.equal(pct(0), 100);
assert.equal(pct(1), 70);
assert.equal(pct(2), 42);
assert.equal(pct(3), 24);
assert.equal(pct(4), 13);
assert.equal(sep(2), 49);
assert.equal(sep(3), 34);
assert.equal(sep(4), 24);
// every single mechanism is worth the same in this model
for (let i = 0; i < 4; i++) {
  const a = [0, 0, 0, 0]; a[i] = 1;
  assert.equal(Math.round(capability(a) * 100), 70);
}
// one mechanism alone scales with effort: half effort, half the loss
assert.equal(Math.round(capability([0.5, 0, 0, 0]) * 100), 85);
// readout strings stay under 45 characters
for (const on of [[false, false, false, false], [false, false, true, false], [true, true, true, false], [true, true, true, true]]) {
  const t = readoutText(on, capability(on.map(Number)));
  assert.ok(t.length < 45, t);
}
assert.equal(readoutText([true, false, false, true], capability([1, 0, 0, 1])), "2 of 4 mechanisms · 42% capability left");
console.log("model.test: all passed");
// battlefield losses (notional), quoted on the page: blue vs red vehicles down
{
  const { losses, fieldText } = await import("./model.mjs");
  const L = (a) => { const r = losses(a); return [r.blue, r.red]; };
  assert.deepEqual(L([0, 0, 0, 0]), [0, 0]);
  assert.deepEqual(L([1, 0, 0, 0]), [2, 5]);
  assert.deepEqual(L([0, 1, 0, 0]), [1, 1]);
  assert.deepEqual(L([0, 0, 1, 0]), [1, 2]);
  assert.deepEqual(L([0, 0, 0, 1]), [1, 1]);
  assert.deepEqual(L([1, 0, 0, 1]), [2, 6]);
  assert.deepEqual(L([1, 1, 0, 1]), [2, 7]);
  assert.deepEqual(L([1, 1, 1, 1]), [2, 9]);
  // all four together cost 2 blue vehicles; the same four one at a time would cost 2 + 1 + 1 + 1 = 5
  // each element's share adds up to the total, at any effort mix
  for (let k = 0; k < 200; k++) {
    const a = [0, 1, 2, 3].map((i) => ((k * (i + 3) * 37) % 101) / 100);
    const r = losses(a);
    assert.equal(r.blueBy.reduce((s, v) => s + v, 0), r.blue);
    assert.ok(r.blueBy.every((v, i) => v <= [2, 1, 1, 1][i]));
  }
  for (const on of [[false, false, false, false], [false, false, true, false], [true, true, true, false], [true, true, true, true]]) {
    const a = on.map(Number);
    const t = fieldText(on, capability(a), losses(a));
    assert.ok(t.length < 45, t);
  }
  assert.equal(fieldText([true, true, true, true], capability([1, 1, 1, 1]), losses([1, 1, 1, 1])), "4 of 4 mechanisms · 13% left · 2 vs 9 down");
  console.log("model.test: losses passed");
}
