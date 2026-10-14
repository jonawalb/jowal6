// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/phasing/scripts/model.test.mjs
import assert from "node:assert/strict";
import { PHASES, notchX, phaseAt, effortOf, readoutFor, transitText, TOUR } from "./model.mjs";

assert.equal(PHASES.length, 6);
assert.deepEqual(PHASES.map((p) => p.n), ["0", "I", "II", "III", "IV", "V"]);
assert.deepEqual(PHASES.map((p) => Math.round(p.effort * 100)), [15, 30, 60, 100, 55, 25]);
assert.equal(Math.max(...PHASES.map((p) => p.effort)), effortOf(3), "effort peaks in Dominate");
assert.equal(notchX(0), -50);
assert.equal(notchX(5), 50);
for (let i = 0; i < 6; i++) assert.equal(phaseAt(notchX(i) + 4), i);
assert.equal(readoutFor(3), "Phase III: Dominate · effort 100%");
assert.equal(readoutFor(5), "Phase V: Enable civil authority · effort 25%");
for (let i = 0; i < 6; i++) assert.ok(readoutFor(i).length < 45, readoutFor(i));
for (const s of ["clutch out", "shifting", "clutch in"]) assert.ok(transitText(2, 3, s).length < 45);
assert.deepEqual(TOUR, [0, 1, 2, 3, 4, 5, 0]);
console.log("model.test: all passed");
// Battlefield view: notional losses and its readout
import { FIELD_LOSS, lossesThrough, lossesAt, fieldReadoutFor } from "./model.mjs";
assert.deepEqual(FIELD_LOSS.map((l) => [l.blue, l.red]), [[0, 0], [0, 0], [6, 14], [15, 38], [3, 4], [0, 0]]);
assert.deepEqual([0, 1, 2, 3, 4, 5].map((i) => { const c = lossesThrough(i); return [c.blue, c.red]; }), [[0, 0], [0, 0], [6, 14], [21, 52], [24, 56], [24, 56]]);
assert.deepEqual(lossesAt(3, 0), { blue: 6, red: 14 });
assert.deepEqual(lossesAt(3, 0.4), { blue: 14, red: 33 });
assert.deepEqual(lossesAt(3, 1), lossesThrough(3));
assert.equal(fieldReadoutFor(3), "Ph III: Dominate · 21 vs 52 down");
assert.equal(fieldReadoutFor(0), "Ph 0: Shape · 0 vs 0 down");
for (let i = 0; i < 6; i++) assert.ok(fieldReadoutFor(i).length < 45, fieldReadoutFor(i));
console.log("model.test (battlefield): all passed");
