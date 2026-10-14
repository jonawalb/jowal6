// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/center-of-gravity/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, jointLoad, loads, bearing, clearance, lean, turns, fails } from "./model.mjs";

const r2 = (v) => Math.round(v * 100) / 100;
const r1 = (v) => Math.round(v * 10) / 10;
// joint loads quoted on the page: keystone 2.1 W rising to 4.9 W at the springing
assert.deepEqual(loads().map(r1), [2.1, 2.5, 3.2, 4.0, 4.9]);
assert.equal(r2(jointLoad(4)), 4.92);
assert.equal(MODEL.H, 2);
// bearing: full when seated, half at 6 mm, none at 12 mm
assert.equal(bearing(0), 1);
assert.equal(bearing(6), 0.5);
assert.equal(bearing(12), 0);
assert.equal(bearing(18), 0);
assert.equal(Math.round(bearing(4) * 100), 67);
assert.equal(Math.round(bearing(9) * 100), 25);
// failure threshold and travel
assert.equal(fails(11.9), false);
assert.equal(fails(12), true);
assert.equal(MODEL.EMAX, 18);
assert.equal(turns(18), 9);
// the keystone really clears its neighbours at 12 mm: its foot rises above their top inner corners
const RAD = Math.PI / 180;
const foot = MODEL.R1 * Math.cos(MODEL.half * RAD) + 12;
const corner = MODEL.R2 * Math.cos(MODEL.half * RAD);
assert.ok(foot > corner, `keystone foot ${foot} should clear corner ${corner}`);
// the lean never closes the gap
for (let e = 0; e <= 18; e += 0.5) assert.ok(lean(e) * corner < clearance(Math.min(e, 12)) + 1e-9);
assert.equal(r1(clearance(12)), 2.1);
console.log("model.test: all passed");
// battlefield losses (notional): none before the strike, 5 red / 3 blue at 6 mm, 12 red / 4 blue collapsed
{
  const { losses } = await import("./model.mjs");
  assert.deepEqual([losses(0, false).red, losses(0, false).blue], [0, 0]);
  assert.deepEqual([losses(6, false).red, losses(6, false).blue], [5, 3]);
  assert.deepEqual([losses(13, true).red, losses(13, true).blue], [12, 4]);
  console.log("model.test: losses passed");
}
