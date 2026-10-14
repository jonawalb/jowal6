// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/lanchester/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, battle, stateAt, casualties, alive, outcome, readoutOf, riderDist, moment, tilt, stepLoss, LAWS, PLANS } from "./model.mjs";

// Lanchester's own example (sec. 21): Blue 1,000 meets Red 500, then the other 500, square law.
// Closed form b' = sqrt(b^2 - r^2): about 134 lost in the first fight, 293 in all.
const first = 1000 - Math.sqrt(1000 ** 2 - 500 ** 2), after = Math.sqrt(1000 ** 2 - 500 ** 2);
assert.equal(Math.round(first), 134);
assert.equal(Math.round(1000 - Math.sqrt(after ** 2 - 500 ** 2)), 293);
// his sec. 28 example: 50,000 equals 40,000 and 30,000 fought in turn
assert.equal(50000 ** 2, 40000 ** 2 + 30000 ** 2);

// The square law's invariant: b^2 - r^2 stays constant during a fight (before the half-man cut-off)
for (const t of [0, 2, 5, 8, 11]) {
  const s = stateAt("square", "detail", t);
  assert.ok(Math.abs(s.b ** 2 - s.rA ** 2 - (16 ** 2 - 10 ** 2)) < 0.05, `b²-r² drifted at step ${t}`);
}
// The linear (area-fire) law's invariant: b - r stays constant
for (const t of [0, 3, 6, 10, 15]) {
  const s = stateAt("linear", "detail", t);
  assert.ok(Math.abs(s.b - s.rA - 6) < 0.01, `b-r drifted at step ${t}`);
}

// Outcomes quoted on the page
const sd = outcome("square", "detail"), sb = outcome("square", "both"), ld = outcome("linear", "detail"), lb = outcome("linear", "both");
assert.deepEqual([sd.blue, sd.red, sd.down.blue, sd.down.red], [8, 0, 8, 20]);
assert.deepEqual([sb.blue, sb.red, sb.down.blue, sb.down.red], [0, 12, 16, 8]);
assert.deepEqual([ld.blue, ld.red, ld.down.blue, ld.down.red], [0, 4, 16, 16]);
assert.deepEqual([lb.blue, lb.red, lb.down.blue, lb.down.red], [0, 4, 16, 16]);
assert.equal(20 ** 2 - 16 ** 2, 12 ** 2);
// concentrating, blue beats group A by step 12 with 3 men down
assert.ok(sd.tAend > 11 && sd.tAend <= 12, `group A out at ${sd.tAend}`);
assert.equal(casualties(stateAt("square", "detail", battle("square", "detail").tAend)).blue, 3);
// every battle ends inside the slider's range
for (const law of LAWS) for (const plan of PLANS) assert.ok(battle(law, plan).tEnd < MODEL.maxStep, `${law}/${plan} runs past the slider`);

// Notional values quoted in "What is notional"
assert.equal(MODEL.alpha, 0.06);
assert.equal(MODEL.beta, 0.02);
assert.equal(MODEL.move, 4);
assert.equal(MODEL.cut, 0.5);
assert.deepEqual([MODEL.blue, ...MODEL.red], [16, 10, 10]);
// riders stop short of the pivot for fewer than six discs (RMIN 24 / k 4.5 = 5.33)
assert.ok(riderDist("square", 5) < 24 && riderDist("square", 6) > 24);

// The balance: square-law moments go with N², linear with N; the beam leans to the side that wins
assert.equal(moment("square", 16), 256);
assert.equal(moment("square", 10), 100);
assert.equal(moment("linear", 16), 160);
assert.ok(tilt("square", 16, 10) > 0 && tilt("square", 16, 20) < 0);
assert.ok(tilt("linear", 16, 20) < 0);
assert.ok(Math.abs(tilt("square", 16, 20)) <= MODEL.tiltMax);

// Step-through: under the square law each side's loss in a step goes with the other's strength
const s0 = stepLoss("square", "detail", 0);
assert.ok(s0.red > s0.blue, "16 blue shooters knock out more than 10 red ones do");
assert.ok(Math.abs(s0.blue - 0.6) < 0.05 && Math.abs(s0.red - 0.96) < 0.06);

// Both sides always lose someone once the fight is under way; readouts stay under 45 characters
for (const law of LAWS) for (const plan of PLANS) {
  for (let t = 0; t <= MODEL.maxStep; t += 0.5) {
    const text = readoutOf(law, plan, t);
    assert.ok(text.length < 45, `readout too long: ${text}`);
    if (t >= 3) { const c = casualties(stateAt(law, plan, t)); assert.ok(c.blue >= 1 && c.red >= 1, `${law}/${plan} at ${t}`); }
  }
}
assert.equal(readoutOf("square", "detail", 0), "Step 0 · Blue 16, Red 10+10 · 0 vs 0 down");
assert.equal(readoutOf("square", "detail", 46), "Step 33 · Blue 8, Red 0+0 · 8 vs 20 down");
assert.equal(readoutOf("square", "both", 46), "Step 18 · Blue 0, Red 6+6 · 16 vs 8 down");
assert.equal(alive(0.49), 0);
console.log("model.test: all passed");
