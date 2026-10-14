// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/oblique-order/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, summary, readout, contactLimit, gapOf, casualties } from "./model.mjs";

const sum = (a) => a.reduce((x, y) => x + y, 0);
assert.equal(sum(MODEL.spread), MODEL.weights);
assert.equal(sum(MODEL.massed), MODEL.weights);
assert.equal(MODEL.sectors * MODEL.perSector, 12);

// The four cases the page describes (sector results and best ratio), and their notional casualties.
assert.deepEqual([summary(0, MODEL.spread).lose, summary(0, MODEL.spread).best.toFixed(1)], [4, "0.7"]);
assert.deepEqual([summary(0, MODEL.massed).win, summary(0, MODEL.massed).lose, summary(0, MODEL.massed).best.toFixed(1)], [1, 3, "2.0"]);
assert.deepEqual([summary(14, MODEL.massed).win, summary(14, MODEL.massed).refused], [1, 3]);
assert.equal(readout(0, MODEL.spread), "4 lose · 0.7:1 · 36 vs 8 down");
assert.equal(readout(0, MODEL.massed), "1 win · 3 lose · 2.0:1 · 12 vs 20 down");
assert.equal(readout(14, MODEL.massed), "1 win · 3 refused · 2.0:1 · 3 vs 18 down");
assert.equal(readout(14, MODEL.spread), "1 lose · 3 refused · 0.7:1 · 9 vs 2 down");
// Casualty rule: in contact, the winner loses 1 per opposing battalion, the loser 3, an even fight 2 each;
// a sector with no attacking battalions, or out of contact, loses nobody.
assert.deepEqual(casualties(0, MODEL.spread).by, [[9, 2], [9, 2], [9, 2], [9, 2]]);
assert.deepEqual(casualties(0, MODEL.massed).by, [[3, 18], [0, 0], [0, 0], [9, 2]]);
assert.deepEqual(casualties(14, MODEL.massed).by, [[3, 18], [0, 0], [0, 0], [0, 0]]);
assert.deepEqual(casualties(14, [3, 0, 0, 2]).by, [[6, 6], [0, 0], [0, 0], [0, 0]]);
// Every readout the page can show stays under 45 characters (all angles, every mass state on the way).
const loads = [MODEL.spread, MODEL.massed, [2, 2, 1, 2], [3, 1, 1, 2], [3, 0, 1, 2], [4, 0, 1, 2], [4, 0, 0, 2], [5, 0, 0, 2], [3, 1, 2, 2], [2, 2, 2, 2]];
for (let a = 0; a <= MODEL.maxAngle; a += 0.25) for (const l of loads) assert.ok(readout(a, l).length < 45, readout(a, l));

// Contact limits quoted on the page: sector 2 (one sector back) leaves contact past about 4.8 degrees.
assert.equal(contactLimit(1).toFixed(1), "4.8");
assert.equal(contactLimit(2).toFixed(1), "2.4");
assert.equal(contactLimit(3).toFixed(1), "1.6");
assert.equal(Math.round(gapOf(3, 14)), 35);
assert.equal(summary(5.5, MODEL.massed).refused, 3);
assert.equal(summary(4.7, MODEL.massed).refused, 2);
// A tie (mid-move, three weights against three blocks) is reported as even.
assert.equal(readout(14, [3, 0, 0, 2]), "1 even · 3 refused · 1.0:1 · 6 vs 6 down");
assert.ok(readout(0, [3, 1, 1, 2]).length < 45);
console.log("model.test: all passed");
