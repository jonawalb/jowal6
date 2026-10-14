// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/ooda-tempo/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, staleShare, makeSim, advance, readoutOf, stillReadoutOf, stageOf, lapRate, FIELD, casualties, fieldReadoutOf, fieldStillReadoutOf } from "./model.mjs";

const pct = (a, b) => Math.round(staleShare(a, b) * 100);
// quoted on the page: equal tempo, 1.5x, 2x and more
assert.equal(pct(6, 6), 0);
assert.equal(pct(6, 4), 50);
assert.equal(pct(6, 3), 100);
assert.equal(pct(10, 2), 100);
assert.equal(pct(4, 6), 0); // the faster side is never inside-out
// default lever settings: Blue 4 h, Red 6 h
assert.deepEqual(MODEL.start, { blue: 4, red: 6 });
assert.equal(MODEL.hourSec, 0.6);
assert.equal(MODEL.window, 8);
// Blue gains one lap every 12 hours at 4 h vs 6 h
assert.ok(Math.abs(1 / lapRate(4, 6) - 12) < 1e-9);

// the event simulation converges on the long-run share
function run(blue, red, hours = 6000, dt = 0.01) {
  const sim = makeSim();
  for (let t = 0; t < hours; t += dt) advance(sim, dt, { blue, red });
  return { red: sim.stale.red / sim.acts.red, blue: sim.stale.blue / sim.acts.blue, sim };
}
for (const [b, r] of [[4, 6], [3, 6], [5, 5], [7, 5], [2.5, 4]]) {
  const got = run(b, r);
  assert.ok(Math.abs(got.red - staleShare(r, b)) < 0.02, `red ${b}/${r}: ${got.red} vs ${staleShare(r, b)}`);
  assert.ok(Math.abs(got.blue - staleShare(b, r)) < 0.02, `blue ${b}/${r}: ${got.blue} vs ${staleShare(b, r)}`);
}

// readouts stay inside the card corner (under 45 characters) at the widest values
const wide = run(9.5, 2.5, 200).sim;
assert.ok(readoutOf(wide, { blue: 9.5, red: 2.5 }).length <= 45);
assert.ok(readoutOf(wide, { blue: 9.5, red: 2.5 }).startsWith("Blue 9.5 h · Red 2.5 h · Blue stale 8 of 8"));
assert.equal(stillReadoutOf({ blue: 4, red: 6 }), "Blue 4 h · Red 6 h · Red stale 50%");
assert.equal(readoutOf(makeSim(), { blue: 4, red: 6 }), "Blue 4 h · Red 6 h · Red acts pending");
assert.equal(stageOf(0.1), 0);
assert.equal(stageOf(0.99), 3);

// Battlefield view: notional casualties quoted on the page (Blue vs Red men down in a notional day)
assert.deepEqual(FIELD, { rate: 0.5, day: 24, perHit: 0.5, perMove: 0.15 });
assert.deepEqual(casualties({ blue: 4, red: 6 }), { blue: 2, red: 4 });
assert.deepEqual(casualties({ blue: 6, red: 6 }), { blue: 3, red: 3 });
assert.deepEqual(casualties({ blue: 3, red: 6 }), { blue: 1, red: 5 });
assert.deepEqual(casualties({ blue: 2, red: 2 }), { blue: 8, red: 8 });
assert.deepEqual(casualties({ blue: 2, red: 10 }), { blue: 2, red: 6 });
// both sides always lose someone (moving costs), at every lever setting
for (let b = 2; b <= 10; b += 0.5) for (let r = 2; r <= 10; r += 0.5) {
  const c = casualties({ blue: b, red: r });
  assert.ok(c.blue >= 1 && c.red >= 1 && c.blue <= 8 && c.red <= 8, `${b}/${r}`);
  assert.ok(fieldReadoutOf(wide, { blue: b, red: r }).length <= 45);
}
assert.equal(fieldStillReadoutOf({ blue: 4, red: 6 }), "Red stale 50% · 2 vs 4 down");
assert.equal(fieldReadoutOf(makeSim(), { blue: 4, red: 6 }), "Red acts pending · 2 vs 4 down");
console.log("model.test: all passed");
