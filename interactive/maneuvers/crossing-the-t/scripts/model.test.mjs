// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/crossing-the-t/scripts/model.test.mjs
import assert from "node:assert/strict";
import { stateAt, fleets, MODEL } from "./model.mjs";

const at = (phi) => stateAt(phi);

// Square across the column's head: every turret of the crossing line bears, only the lead's fore turret replies.
assert.equal(at(90).lineGuns, 16);
assert.equal(at(90).columnGuns, 2);
assert.equal(at(90).maxGuns, 16);
const s90 = at(90);
const lead = s90.columnTurrets.filter((t) => t.bears);
assert.equal(lead.length, 1);
assert.equal(lead[0].end, "fore");
assert.ok(s90.columnTurrets.indexOf(lead[0]) === 0, "the replying turret is the lead ship's fore turret");

// End-on (crossing line in line ahead of the column): two guns a side.
assert.equal(at(0).lineGuns, 2);
assert.equal(at(0).columnGuns, 2);

// Values quoted on the page.
assert.equal(at(45).lineGuns, 12);
assert.equal(at(30).lineGuns, 6);
assert.equal(at(60).lineGuns, 16);

// The column never gets more than its lead's fore turret in this model's range.
for (let phi = 0; phi <= 90; phi += 1) assert.equal(at(phi).columnGuns, 2, `column at ${phi}°`);
// The crossing line's count never falls as phi rises.
let prev = 0;
for (let phi = 0; phi <= 90; phi += 1) { const n = at(phi).lineGuns; assert.ok(n >= prev, `monotone at ${phi}°`); prev = n; }

// Geometry sanity: the pivot and spacing.
const f = fleets(90);
assert.equal(f.column[0].x, 0);
assert.ok(Math.abs(f.line[0].x - MODEL.D) < 1e-9 && Math.abs(f.line[0].y + 1.5) < 1e-9);
console.log("model.test: all passed");

// Battlefield view: notional hits (one per turret bearing), friendly (crossing line) vs enemy (column).
import { hitsAt } from "./model.mjs";
const h90 = hitsAt(90);
assert.deepEqual(h90.column, [8, 0, 0, 0], "square across, all eight of the line's hits fall on the column's leader");
assert.equal(h90.lineTaken, 1);
assert.equal(hitsAt(0).lineTaken, 1);
assert.equal(hitsAt(0).columnTaken, 1);
assert.equal(hitsAt(30).columnTaken, 3);
assert.equal(hitsAt(45).columnTaken, 6);
assert.equal(hitsAt(60).columnTaken, 8);
for (let phi = 0; phi <= 90; phi += 1) { const h = hitsAt(phi), s = stateAt(phi); assert.equal(h.columnTaken * 2, s.lineGuns); assert.equal(h.lineTaken * 2, s.columnGuns); }
console.log("model.test (hits): all passed");
