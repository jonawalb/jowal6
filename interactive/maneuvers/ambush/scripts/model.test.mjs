// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/ambush/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, column, inside, criterion, outcome, fallen, fallenBlue, readout, TIMING } from "./model.mjs";

assert.equal(MODEL.n, 10);
assert.deepEqual(column(0).slice(0, 3), [0, -12, -24]);
// the kill zone is 96 units long; at the start the column is well short of it
assert.equal(inside(MODEL.start), 0);
assert.equal(inside(-40), 1);                     // only the lead man
assert.equal(inside(0), 5);                       // 0, -12, -24, -36, -48
assert.equal(criterion(0), false);                // five of ten is not "most"
assert.equal(inside(12), 6);
assert.equal(criterion(12), true);                // six of ten is
assert.equal(inside(60), 9);                      // head outside the zone, nine still in it
assert.equal(inside(100), 5);                     // head 100, tail -8: the last five are in the zone
for (let h = MODEL.range[0]; h <= MODEL.range[1]; h++) assert.ok(inside(h) >= 0 && inside(h) <= MODEL.n);
// outcomes at the moment "most" are in the kill zone
const lin = outcome("linear", 12), el = outcome("L", 12);
assert.deepEqual([lin.inside, lin.killed, lin.blue], [6, 4, 1]);
assert.deepEqual([el.inside, el.killed, el.blue], [6, 5, 1]);
// initiating too early catches the lead and lets the rest be isolated, not destroyed
const early = outcome("linear", -30);
assert.deepEqual([early.inside, early.killed, early.outside], [2, 1, 8]);
// the kill zone (96 units at 12 per man) holds nine men at most; the tenth is always outside
let maxIn = 0; for (let h = -60; h <= 100; h++) maxIn = Math.max(maxIn, inside(h));
assert.equal(maxIn, 9);
// both sides always lose at least one when the ambush is sprung with someone in the zone
for (let h = -50; h <= 100; h++) for (const f of ["linear", "L"]) {
  const o = outcome(f, h);
  if (o.inside) { assert.ok(o.red >= 1 || o.inside < 2, "red at " + h); assert.ok(o.blue >= 1); }
}
// L-shaped never kills fewer than linear at the same moment
for (let h = -60; h <= 100; h++) assert.ok(outcome("L", h).killed >= outcome("linear", h).killed);
// casualties fall one at a time and never exceed the final count
assert.equal(fallen(lin, 0), 0);
assert.equal(fallen(lin, TIMING.fall), 1);
assert.equal(fallen(lin, 99), lin.killed);
assert.equal(fallenBlue(lin, 0), 0);
assert.deepEqual([outcome("L", -60).blue, outcome("L", -60).killed], [0, 0]);   // nothing in the zone, nothing happens
assert.equal(fallenBlue(lin, 99), lin.blue);
// the readout fits the card (under 45 characters)
for (let h = -60; h <= 100; h += 2) for (const f of ["linear", "L"]) for (const fired of [false, true]) for (const tf of [0, 2, 99]) {
  const r = readout(f, h, fired, tf);
  assert.ok(r.length < 45, `${r} is ${r.length}`);
}
console.log("model.test: all passed");
