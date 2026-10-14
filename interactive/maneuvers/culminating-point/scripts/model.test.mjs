// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/culminating-point/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, distance, power, reach, limitOf, speedAt, advance, stateOf } from "./model.mjs";

const T = MODEL.track;
const r2 = (v) => Math.round(v * 100) / 100;
assert.equal(reach(), 120);                                     // culminates 120 km from its base
assert.equal(power(0), 2);                                      // 2.0 : 1 at the base
assert.equal(r2(power(60)), 1.5);                               // 1.5 : 1 at 60 km
assert.equal(r2(power(120)), 1);                                // 1.0 : 1 at the culminating point
assert.equal(distance(T.start, T.sledRear), 0);                 // the start line is at the base
assert.equal(limitOf(T.sledRear), 61);                          // rear base: stalls at rail 61
assert.equal(distance(T.objective, T.sledRear), 167);           // objective is 167 km from the rear base
assert.equal(T.sledFwd - T.sledRear, 69);                       // base moves 69 km forward
assert.equal(limitOf(T.sledFwd), T.objective);                  // forward base: the objective comes first
assert.equal(distance(T.objective, T.sledFwd), 98);             // objective is 98 km from the forward base
assert.equal(r2(power(98)), 1.18);                              // power at the objective with the forward base
assert.equal(speedAt(1), 0);
assert.equal(speedAt(2), MODEL.vmax);

// The carriage never passes its culminating point, however long it is pushed.
let x = T.start, t = 0;
while (t < 30) { x = advance(x, T.objective, T.sledRear, 1 / 60); t += 1 / 60; }
assert.equal(x, 61);
assert.equal(stateOf(x, T.objective, T.sledRear), "Culminated");
// With the base forward it reaches the objective.
for (let i = 0; i < 1800; i++) x = advance(x, T.objective, T.sledFwd, 1 / 60);
assert.equal(x, T.objective);
assert.equal(stateOf(x, T.objective, T.sledFwd), "Objective reached");
console.log("model.test: all passed");
// Notional losses quoted on the page.
import { losses } from "./model.mjs";
assert.deepEqual(losses(61, T.sledRear), { blue: 44, red: 18 });      // culminated with the rear base
assert.deepEqual(losses(T.objective, T.sledFwd), { blue: 54, red: 43 }); // objective reached with the forward base
assert.deepEqual(losses(T.start, T.sledRear), { blue: 0, red: 0 });
console.log("model.test: losses passed");
