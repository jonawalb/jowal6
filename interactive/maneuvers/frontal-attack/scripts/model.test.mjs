// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/frontal-attack/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, pushShare, pushBack, breached, perBlock, phase, readoutOf, committed, casualties } from "./model.mjs";

assert.equal(MODEL.hold, 1);
assert.equal(MODEL.breach, 4.5);
assert.equal(pushShare(0.8), 0);
assert.equal(pushShare(1), 0);
assert.equal(Math.round(pushShare(2) * 100), 29);
assert.equal(Math.round(pushShare(2.75) * 100), 50);
assert.equal(Math.round(pushShare(3) * 100), 57);
assert.equal(pushShare(6), 1);
assert.equal(pushBack(2.75), 6);
assert.equal(breached(4.4), false);
assert.equal(breached(4.5), true);
assert.equal(Math.round(perBlock() * 1000) / 10, 16.7);
assert.equal(phase(0.8), "Wall holds, pinned");
assert.equal(phase(3), "Pushing back");
assert.equal(phase(5), "Breach");
assert.equal(readoutOf(2.75), "Pushing back 50% · 2.8:1 · 6 vs 2 down");
assert.equal(readoutOf(0.8), "Pinned · 0.8:1 · 3 vs 1 down");
assert.equal(readoutOf(6), "Breach · 6.0:1 · gap open · 3 vs 4 down");
assert.deepEqual(committed(0.8), { squads: 1, guns: 0, men: 11 });
assert.deepEqual(committed(3), { squads: 3, guns: 2, men: 33 });
assert.deepEqual(casualties(1), { blue: 4, red: 1 });
assert.deepEqual(casualties(2), { blue: 6, red: 1 });
assert.deepEqual(casualties(3), { blue: 7, red: 2 });
assert.deepEqual(casualties(4.5), { blue: 5, red: 4 });
assert.deepEqual(casualties(6), { blue: 3, red: 4 });
for (let r = MODEL.range[0]; r <= MODEL.range[1] + 1e-9; r += 0.1) { const c = casualties(r); assert.ok(c.blue >= 1 && c.red >= 1, "both sides always lose someone at " + r); }
for (let r = MODEL.range[0]; r <= MODEL.range[1] + 1e-9; r += 0.1) assert.ok(readoutOf(r).length < 45, readoutOf(r));
console.log("model.test: all passed");
