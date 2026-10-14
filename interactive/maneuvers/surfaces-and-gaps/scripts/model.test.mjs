// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/surfaces-and-gaps/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, CYCLE, pose, readout, deepest, isGap, probeDepth, ramDepth, laneY, casualties } from "./model.mjs";

// Quoted thresholds
assert.equal(MODEL.gapMin, 6);
assert.equal(MODEL.reach, 16);
assert.equal(MODEL.ramReach, 24);
assert.ok(Math.abs(CYCLE - 13) < 1e-9);
assert.equal(isGap(5.9), false);
assert.equal(isGap(6), true);
assert.equal(probeDepth(26), 16);
assert.equal(probeDepth(9), 9);
assert.equal(ramDepth(26), 24);
assert.equal(laneY(0), 36); // lane 1 nearest
assert.equal(laneY(4), -36);

// Four faces, each with one deep gap; face 3 also has a shallow 9 mm gap
const gaps = MODEL.patterns.map((d) => d.filter((x) => isGap(x)).length);
assert.deepEqual(gaps, [1, 1, 2, 1]);
assert.equal(MODEL.patterns.length, 4);

// The tour: planned lane carries over as the last deepest lane
let planned = 1;
const route = [];
for (const d of MODEL.patterns.concat([MODEL.patterns[0]])) {
  const deep = deepest(d, planned);
  route.push([planned + 1, deep + 1, isGap(d[planned])]);
  planned = deep;
}
assert.deepEqual(route, [[2, 4, false], [4, 3, false], [3, 1, false], [1, 5, false], [5, 4, false]]);
// Ties go to the lane nearest the planned one
assert.equal(deepest([20, 0, 0, 0, 20], 3), 4);
assert.equal(deepest([20, 0, 0, 0, 20], 1), 0);

// Readouts for the first cycle (planned lane 2, face 1)
const d0 = MODEL.patterns[0];
const say = (t) => readout(pose(t, 1, d0), d0);
assert.equal(say(0), "Main effort set on lane 2");
assert.equal(say(1.5), "Probing the face");
assert.equal(say(3.5), "Lane 4 deepest, blade in 16 mm · 2 vs 2 down");
assert.equal(say(4.4), "Lane 2 struck a surface · 2 vs 2 down");
assert.equal(say(5), "Lane 2 struck a surface · 4 vs 2 down");
assert.equal(say(6), "Main effort shifts to lane 4 · 4 vs 2 down");
assert.equal(say(8), "Through lane 4, 24 mm deep · 4 vs 3 down");
assert.equal(say(10.5), "Withdrawing to probe again · 4 vs 3 down");
assert.equal(say(12.5), "The face shifts, gaps move · 4 vs 3 down");
// Planned lane already the gap: the ram goes straight in
assert.equal(readout(pose(4.4, 3, d0), d0), "Through lane 4, 24 mm deep · 2 vs 2 down");
assert.equal(readout(pose(8, 3, d0), d0), "Through lane 4, 24 mm deep · 2 vs 3 down");
// Face 3: lane 1 is deepest at 16, lane 5 partial at 9
assert.equal(readout(pose(3.5, 2, MODEL.patterns[2]), MODEL.patterns[2]), "Lane 1 deepest, blade in 16 mm · 2 vs 2 down");

// Casualties (notional): none before contact; both sides lose men in every probe; striking a
// surface first costs blue two more; the planned gap costs least.
for (const d of MODEL.patterns) assert.equal(d.filter((x) => x <= MODEL.reach).length, 4);
assert.deepEqual(casualties(pose(1.5, 1, d0)), { blue: 0, red: 0 });
assert.deepEqual(casualties(pose(0, 1, d0)), { blue: 0, red: 0 });
assert.deepEqual(casualties(pose(8, 1, d0)), { blue: 4, red: 3 });
assert.deepEqual(casualties(pose(8, 3, d0)), { blue: 2, red: 3 });

// Every readout fits the card corner, and no part passes through a key, all faces, all lanes
for (let f = 0; f < MODEL.patterns.length; f++) {
  const d = MODEL.patterns[f];
  for (let pl = 0; pl < MODEL.lanes; pl++) {
    for (let t = 0; t < CYCLE; t += 0.05) {
      const p = pose(t, pl, d);
      const text = readout(p, d);
      assert.ok(text.length < 45, `readout too long: ${text}`);
      const c = casualties(p);
      if (t >= 3.8) assert.ok(c.blue >= 1 && c.red >= 1, "both sides lose men once in contact");
      p.tips.forEach((tip, i) => assert.ok(tip >= MODEL.face - d[i] - 1e-9, "blade through a key"));
      p.tips.forEach((tip) => assert.ok(tip >= MODEL.face - MODEL.reach - 1e-9, "blade past its stroke"));
      const lane = Math.round(2 - p.ramY / MODEL.pitch);
      assert.ok(p.ramTip >= MODEL.face - d[lane] - 1e-9, "ram through a key");
      // the ram is only between lanes while retracted behind the face
      if (Math.abs(p.ramY - laneY(lane)) > 0.01) assert.ok(p.ramTip > MODEL.face + 20);
    }
  }
}
assert.equal(MODEL.barEnd - MODEL.bladeOff, MODEL.face - MODEL.reach);
console.log("model.test: all passed");
