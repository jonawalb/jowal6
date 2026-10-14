// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/vertical-envelopment/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, state, readout, casualties, linkupAt, outAt, minSpeed, inTime, hoursAt, sliderAt } from "./model.mjs";

assert.equal(outAt(), 74);
assert.equal(linkupAt(1.2), 50);
assert.equal(linkupAt(1.0), 60);
assert.equal(Math.round(linkupAt(0.7) * 10) / 10, 85.7);
assert.equal(Math.round(minSpeed() * 100) / 100, 0.81);
assert.ok(inTime(1.2) && inTime(0.85) && !inTime(0.8) && !inTime(0.7));

// at 1.2 km/h: linked at H+50 with a third of the load left
const a = state(49.99, 1.2);
assert.equal(a.phase, "holding");
assert.equal(Math.round(a.supply * 100), 33);
assert.equal(state(50, 1.2).phase, "linked");
assert.equal(Math.round(state(50, 1.2).supply * 100), 33);
assert.equal(state(60, 1.2).supply, 1, "refilled ten hours after linkup at 10%/h");
assert.equal(readout(state(30, 1.2)), "H+30 h · supply 61% · 2 vs 5 down");
assert.equal(readout(state(56, 1.2)), "H+56 h · linked up at H+50 h · 5 vs 12 down");

// at 0.7 km/h: supply out at H+74, lifted out by H+76, linkup 12 h late
assert.equal(state(74, 0.7).phase, "withdrawing");
assert.equal(state(76, 0.7).phase, "withdrawn");
assert.equal(readout(state(80, 0.7)), "H+80 h · withdrawn 12 h late · 7 vs 14 down");
assert.equal(state(80, 0.7).air, 0);

// the air move
assert.equal(readout(state(1, 1.2)), "H+1 h · air move over the line · 0 vs 0 down");
assert.equal(state(0, 1.2).lift, 0);
assert.equal(state(1, 1.2).lift, 1);
assert.equal(state(1.5, 1.2).air, 1);
assert.equal(state(2, 1.2).cut, true);
assert.equal(state(1.9, 1.2).cut, false);

// notional casualties (quoted on the page): none before landing; at 1.2 km/h 5 vs 12 at linkup and no
// more after it; at 0.7 km/h 7 vs 14 after the withdrawal; the slower linkup costs more friendly lives
assert.deepEqual([casualties(state(1.9, 1.2)).blue, casualties(state(1.9, 1.2)).red], [0, 0]);
assert.equal(casualties(state(50, 1.2)).blue, 5);
assert.equal(casualties(state(50, 1.2)).red, 12);
assert.equal(casualties(state(96, 1.2)).blue, 5);
assert.equal(casualties(state(96, 1.2)).red, 12);
assert.equal(casualties(state(96, 0.7)).blue, 7);
assert.equal(casualties(state(96, 0.7)).red, 14);
assert.equal(readout(state(75, 0.7)), "H+75 h · lifting out · 7 vs 14 down");
for (const v of [0.5, 0.7, 1.2, 1.5]) { let b = 0, r = 0; for (let t = 0; t <= 96; t += 0.05) { const c = casualties(state(t, v)); assert.ok(c.blue >= b && c.red >= r, "casualties never fall"); b = c.blue; r = c.red; } }

// slider warp round-trips
for (const t of [0, 1, 2, 30, 74, 96]) assert.ok(Math.abs(hoursAt(sliderAt(t)) - t) < 1e-9);
assert.equal(hoursAt(MODEL.knee), 2);

// readouts stay short enough for the card corner
for (const v of [0.5, 0.7, 1.2, 1.5]) for (let t = 0; t <= 96; t += 0.5) assert.ok(readout(state(t, v)).length < 45, readout(state(t, v)));
console.log("model.test: all passed");
