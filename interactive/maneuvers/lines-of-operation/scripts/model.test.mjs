// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/lines-of-operation/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, progress, state, endTime, readoutText } from "./model.mjs";

const [looA, looB, loe1, loe2, loe3] = MODEL.lines;
const arrive = (line, stalled = false) => {
  for (let i = 0; i <= 1000; i++) if (progress(line, i / 1000, stalled) >= 0.999) return Math.round(i / 10);
  return null;
};
// arrival times quoted on the page (percent of campaign time)
assert.equal(arrive(looA), 66);
assert.equal(arrive(looB), 72);
assert.equal(arrive(loe1), 78);
assert.equal(arrive(loe2), 88);
assert.equal(arrive(loe3), 97);
assert.equal(Math.round(endTime() * 100), 97);
assert.equal(endTime(true), null);
// decisive-point counts and five tasks per line of effort
assert.equal(looA.dps.length, 3);
assert.equal(looB.dps.length, 2);
for (const l of [loe1, loe2, loe3]) assert.equal(l.tasks.length, 5);
// stall: line of effort 3 stops after its third task, which finishes at T+62%
assert.equal(progress(loe3, 1, true), 3 / 5);
assert.equal(state(1, true).tasks[4], 3);
assert.equal(loe3.tasks[2], 0.62);
// a line of operation holds still at each decisive point
assert.equal(progress(looA, 0.15), 0.3);
assert.equal(progress(looA, 0.19), 0.3);
// progress never goes backwards
for (const l of MODEL.lines) {
  let prev = 0;
  for (let i = 0; i <= 1000; i++) { const p = progress(l, i / 1000); assert.ok(p >= prev - 1e-12); prev = p; }
}
// readouts stay under 45 characters
for (let i = 0; i <= 100; i++) for (const st of [false, true]) assert.ok(readoutText(i / 100, st).length < 45, readoutText(i / 100, st));
assert.equal(readoutText(0.5), "T+50% · LOO 0/2 · LOE 0/3 · not set");
assert.equal(readoutText(1), "T+100% · all 5 lines in · end state");
console.log("model.test: all passed");

// ---- Battlefield view (notional casualties and the field readout) ----
{
  const { casualties, fightShare, fieldReadoutText, LOSSES } = await import("./model.mjs");
  // each fight runs over its line's pause at a decisive point
  assert.equal(fightShare(looA, 0, 0.12), 0);
  assert.equal(fightShare(looA, 0, 0.16), 0.5);
  assert.equal(fightShare(looB, 1, 0.55), 1);
  // totals quoted on the page: 26 vs 48 once every point is taken; 29 vs 50 with LOE 3 stalled
  assert.deepEqual(casualties(1), { blue: 26, red: 48 });
  assert.deepEqual(casualties(1, true), { blue: 29, red: 50 });
  assert.deepEqual(casualties(0), { blue: 0, red: 0 });
  assert.deepEqual(LOSSES.dp["loo-a"], [[4, 9], [7, 12], [5, 8]]);
  assert.deepEqual(LOSSES.dp["loo-b"], [[4, 8], [6, 11]]);
  assert.deepEqual(LOSSES.raids.map((r) => r[0]), [0.72, 0.82, 0.92]);
  // casualties never fall as time runs on, and the stall only adds
  for (const st of [false, true]) { let pb = 0, pr = 0; for (let i = 0; i <= 1000; i++) { const c = casualties(i / 1000, st); assert.ok(c.blue >= pb && c.red >= pr); pb = c.blue; pr = c.red; } }
  for (let i = 0; i <= 100; i++) { const a = casualties(i / 100), b = casualties(i / 100, true); assert.ok(b.blue >= a.blue && b.red >= a.red); }
  for (let i = 0; i <= 100; i++) for (const st of [false, true]) assert.ok(fieldReadoutText(i / 100, st).length < 45, fieldReadoutText(i / 100, st));
  assert.equal(fieldReadoutText(1), "T+100% · end state · 26 vs 48 down");
  assert.equal(fieldReadoutText(1, true), "T+100% · LOO 2/2 · LOE 2/3 · 29 vs 50 down");
  console.log("model.test (battlefield): all passed");
}
