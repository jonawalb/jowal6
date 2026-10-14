// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/omg/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, stateAt, readoutOf, blockedBy, latestRelease, endOf, runAt, LOSSES, lossesAt, fieldReadoutOf } from "./model.mjs";

const m = MODEL;
// distances quoted on the page: track 104 km past the line, targets 24/48/70/92, reserve lane 36 km past
assert.equal(m.end - m.line[1], 104);
assert.deepEqual(m.targets.map((g) => g.x - m.line[1]), [24, 48, 70, 92]);
assert.equal(m.reserve.face - m.line[1], 36);
assert.equal(m.speed, 80);
assert.equal(m.breach[1], 0.5);
assert.equal(m.release[0], m.breach[1], "earliest release is the moment the gate is down");
assert.equal(m.reserve.move, 0.8);
assert.equal(m.reserve.enter, 1.4);

// the reserve race: day 0.6 or earlier gets through, 0.7 or later is stopped after one target
assert.ok(latestRelease() > 0.6 && latestRelease() < 0.7, `latest release ${latestRelease()}`);
for (const r of [0.5, 0.6]) assert.equal(blockedBy(r, true), false);
for (let r = 0.7; r <= 2.0001; r += 0.1) {
  assert.equal(blockedBy(r, true), true);
  assert.equal(stateAt(endOf(r, true) + 0.1, r, true).hits, 1, `release ${r} should hit exactly one target`);
}
// without a large reserve every release reaches the end and trips all four
for (let r = 0.5; r <= 2.0001; r += 0.1) {
  const s = stateAt(endOf(r, false) + 0.01, r, false);
  assert.equal(s.hits, 4);
  assert.ok(Math.abs(s.nose - m.end) < 1e-6);
}
// nose never moves before release, never runs backwards, never passes the buffer
let prev = -Infinity;
for (let t = 0; t <= 4; t += 0.01) {
  const x = runAt(t, 1.0);
  assert.ok(x >= prev - 1e-9 && x <= m.end);
  if (t <= 1.0) assert.equal(x, m.start);
  prev = x;
}
// readouts quoted in METHOD.md, and every readout fits the card corner (< 45 chars)
assert.equal(readoutOf(0.3, 0.5, false), "Day 0.3 · breach opening · OMG held");
assert.equal(readoutOf(1.3, 0.5, false), "Day 1.3 · 41 km past line · 1 of 4 hit");
assert.equal(readoutOf(2.3, 0.5, false), "Day 2.3 · 104 km past line · 4 of 4 hit");
assert.equal(readoutOf(2.0, 1.0, true), "Day 2.0 · blocked by reserve · 1 of 4 hit");
for (let r = 0.5; r <= 2.0001; r += 0.1) for (const res of [false, true]) for (let t = 0; t <= 4; t += 0.05) {
  const text = readoutOf(t, r, res);
  assert.ok(text.length < 45, `too long: ${text}`);
}
// Battlefield view losses (notional) and its readout, quoted in page.html and METHOD.md
assert.deepEqual(LOSSES.breach, [40, 22]);
assert.deepEqual(LOSSES.target, [3, 6]);
assert.deepEqual(LOSSES.block, [34, 14]);
assert.deepEqual(lossesAt(0, 0.5, false), { sov: 0, nato: 0, fight: 0 });
{ const c = lossesAt(4, 0.5, false); assert.equal(c.sov, 52); assert.equal(c.nato, 46); }       // free run: breach + 4 targets
{ const c = lossesAt(4, 0.5, true); assert.equal(c.sov, 52); assert.equal(c.nato, 46); }        // early release beats the reserve
{ const c = lossesAt(4, 1.0, true); assert.equal(c.sov, 77); assert.equal(c.nato, 42); }        // blocked: breach + 1 target + the fight
for (let r = 0.7; r <= 2.0001; r += 0.1) { const c = lossesAt(4, r, true); assert.equal(c.sov, 77); assert.equal(c.nato, 42); }
// losses never fall as the day advances
for (const [r, res] of [[0.5, false], [1.0, true], [0.6, true]]) {
  let ps = 0, pn = 0;
  for (let t = 0; t <= 4; t += 0.01) { const c = lossesAt(t, r, res); assert.ok(c.sov >= ps && c.nato >= pn); ps = c.sov; pn = c.nato; }
}
assert.equal(fieldReadoutOf(0.3, 0.5, false), "Day 0.3 · breach opening · 26 vs 14 down");
assert.equal(fieldReadoutOf(1.3, 0.5, false), "Day 1.3 · 41 km · 1/4 hit · 43 vs 28 down");
assert.equal(fieldReadoutOf(2.3, 0.5, false), "Day 2.3 · 104 km · 4/4 hit · 52 vs 46 down");
assert.equal(fieldReadoutOf(2.0, 1.0, true), "Day 2.0 · blocked · 1/4 hit · 76 vs 41 down");
for (let r = 0.5; r <= 2.0001; r += 0.1) for (const res of [false, true]) for (let t = 0; t <= 4; t += 0.05) {
  const text = fieldReadoutOf(t, r, res);
  assert.ok(text.length < 45, `too long: ${text}`);
}
console.log("model.test: all passed");
