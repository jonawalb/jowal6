// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/penetration/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, HAMMER, stateAt, readoutOf, wedgeGap, carriageGap, noseAfter, impactAngle, losses } from "./model.mjs";
import { GEO } from "./scene.mjs";

// page: four blows drive the wedge 22 mm, 2 mm past the back of a 20 mm deep line
assert.equal(MODEL.blows, 4);
assert.equal(noseAfter(4) - noseAfter(0), 22);
assert.equal(MODEL.depth, 20);
assert.equal(noseAfter(4) - MODEL.depth, 2);
// page: wedge 10 mm thick at its back over 36 mm holds the gap at about 6 mm after the breach
assert.equal(MODEL.wedgeBack, 10);
assert.equal(MODEL.wedgeLen, 36);
assert.equal(Math.round(wedgeGap(noseAfter(4))), 6);
assert.equal(Math.round(stateAt(0.46, true).gap), 6);
// page: rollers force 30 mm; the body alone keeps 18 mm while it is in the line; without pins the gap closes to 0
assert.equal(Math.round(stateAt(0.75, true).gap), 30);
assert.equal(carriageGap(20), 30);
assert.equal(stateAt(0.9, false).gap, 18);
assert.equal(stateAt(1, false).gap, 0);
assert.equal(stateAt(1, true).gap, 30);
// through reads 0, 28, 55, 83, 100% after each blow
assert.deepEqual([0, 1, 2, 3, 4].map((n) => Math.round(Math.min(1, noseAfter(n) / MODEL.depth) * 100)), [0, 28, 55, 83, 100]);
// readouts quoted in METHOD.md
assert.equal(readoutOf(stateAt(0.2, true)), "Breach · blow 2 of 4 · 55% through");
assert.equal(readoutOf(stateAt(0.46, true)), "Breach complete · gap 6 mm");
assert.equal(readoutOf(stateAt(0.75, true)), "Widen · gap 30 mm");
assert.equal(readoutOf(stateAt(1, true)), "Exploit · gap held at 30 mm");
assert.equal(readoutOf(stateAt(1, false)), "Exploit · gap shut · cut off");
// every readout fits the card corner (under 45 characters)
for (let p = 0; p <= 1.0001; p += 0.01) for (const h of [true, false]) assert.ok(readoutOf(stateAt(Math.min(p, 1), h)).length < 45);
// the breach comes before any widening: the carriage does not move until the wedge is through
for (let p = 0; p < MODEL.phases[1]; p += 0.01) assert.equal(stateAt(p, true).car, MODEL.car0);
assert.equal(stateAt(MODEL.phases[0], true).through, 1);
// the hammer head rests on the wedge back at the start, and the scene draws the same hammer the model uses
assert.ok(Math.abs(HAMMER.x + Math.sin(impactAngle(MODEL.nose0 - MODEL.wedgeLen) * Math.PI / 180) * HAMMER.arm + HAMMER.half - (MODEL.nose0 - MODEL.wedgeLen)) < 1e-9);
assert.equal(GEO.HX, HAMMER.x);
assert.equal(GEO.HZ, HAMMER.z);
assert.equal(GEO.ARM, HAMMER.arm);
// the shoulder pins hold exactly the roller span
assert.equal(GEO.PIN[1] + GEO.PIN[2], MODEL.span / 2);
// notional losses: never free; letting go of the shoulders costs the attacker most
assert.deepEqual(losses(stateAt(0, true)), { blue: 1, red: 1 });
assert.deepEqual(losses(stateAt(0.46, true)), { blue: 3, red: 2 });
assert.deepEqual(losses(stateAt(1, true)), { blue: 4, red: 4 });
assert.deepEqual(losses(stateAt(1, false)), { blue: 6, red: 2 });
for (let p = 0; p <= 1.0001; p += 0.01) for (const h of [true, false]) {
  const st = stateAt(Math.min(p, 1), h), c = losses(st);
  assert.ok(c.blue >= 1 && c.red >= 1);
  assert.ok((readoutOf(st).replace(/ · \d+% through$/, "") + ` · ${c.blue} vs ${c.red} down`).length < 45, readoutOf(st));
}
console.log("model.test: all passed");
