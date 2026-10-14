// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/main-effort/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, allocate, stateOf, gateDrop, summary, nextTrip, HOME, casualties, readoutOf } from "./model.mjs";

assert.equal(MODEL.discs, 12);
assert.equal(MODEL.breach, 6);
assert.equal(MODEL.hold, 1);
assert.deepEqual(allocate(-1, 0), [3, 3, 3, 3]);
assert.deepEqual(allocate(2, 1), [1, 1, 9, 1]);
assert.deepEqual(allocate(2, 2), [2, 2, 6, 2]);
assert.deepEqual(allocate(2, 3), [3, 3, 3, 3]);
assert.deepEqual(allocate(0, 0), [12, 0, 0, 0]);
for (const main of [0, 1, 2, 3]) for (const each of [0, 1, 2, 3]) assert.equal(allocate(main, each).reduce((a, b) => a + b), 12);
assert.equal(stateOf(3), "held");
assert.equal(stateOf(5), "held");
assert.equal(stateOf(6), "breach");
assert.equal(stateOf(0), "exposed");
assert.equal(gateDrop(6), 15);
assert.equal(gateDrop(0), -6);
assert.equal(gateDrop(3), 1);
assert.equal(summary([3, 3, 3, 3]), "Spread: 3 each · no breach · all held");
assert.equal(summary([1, 1, 9, 1]), "Main C: 9 of 12 · breach · rest held");
assert.equal(summary([1, 5, 2, 1], 1), "Main B: 5 of 12 · no breach · rest held");
assert.equal(summary([12, 0, 0, 0]), "Main A: 12 of 12 · breach · 3 exposed");
for (const s of [[3, 3, 3, 3], [1, 1, 9, 1], [12, 0, 0, 0], [2, 2, 6, 2]]) assert.ok(summary(s).length < 45, summary(s));
// the loader reaches any target and never carries more than MODEL.carry
let stacks = [3, 3, 3, 3];
const target = [1, 9, 1, 1];
for (let i = 0, trip; (trip = nextTrip(stacks, target)); i++) {
  assert.ok(trip.count <= MODEL.carry && trip.count > 0 && i < 10);
  stacks[trip.from] -= trip.count;
  stacks[trip.to] += trip.count;
}
assert.deepEqual(stacks, target);
// Battlefield view: elements per sector and men down (notional)
assert.equal(HOME.flat().length, MODEL.discs);
assert.equal(HOME.flat().filter((e) => e === "sq").length, 4);
assert.equal(HOME.flat().filter((e) => e === "tk").length, 4);
assert.equal(HOME.flat().filter((e) => e === "mg").length, 4);
assert.deepEqual(casualties([3, 3, 3, 3]), { blue: 8, red: 4, blueBy: [2, 2, 2, 2], redBy: [1, 1, 1, 1] });
assert.deepEqual(casualties([1, 1, 9, 1]), { blue: 5, red: 3, blueBy: [1, 1, 2, 1], redBy: [0, 0, 3, 0] });
assert.deepEqual(casualties([2, 2, 6, 2]), { blue: 5, red: 3, blueBy: [1, 1, 2, 1], redBy: [0, 0, 3, 0] });
assert.deepEqual(casualties([12, 0, 0, 0]), { blue: 8, red: 3, blueBy: [8, 0, 0, 0], redBy: [3, 0, 0, 0] });
assert.equal(readoutOf([3, 3, 3, 3], 2), "Spread 3 each · no breach · 8 vs 4 down");
assert.equal(readoutOf([1, 1, 9, 1], 2), "Main C 9 · breach · 5 vs 3 down");
assert.equal(readoutOf([12, 0, 0, 0], 0), "Main A 12 · breach · 3 exposed · 8 vs 3 down");
// every state the loader can pass through (discs on gates, some in the air) keeps the readout short,
// and any sector with discs on it loses someone
for (let a = 0; a <= 12; a++) for (let b = 0; a + b <= 12; b++) for (let c = 0; a + b + c <= 12; c++) for (let d = 0; a + b + c + d <= 12; d++) {
  if (a + b + c + d < MODEL.discs - MODEL.carry) continue;
  const s = [a, b, c, d];
  for (const main of [0, 1, 2, 3]) assert.ok(readoutOf(s, main).length < 45, readoutOf(s, main));
  casualties(s).blueBy.forEach((n, i) => assert.ok(s[i] === 0 || n >= 1));
}
console.log("model.test: all passed");
