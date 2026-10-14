// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/operational-reach/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, moments, state, safeExtension, tipOf, overPost, totalWeight } from "./model.mjs";

const r2 = (v) => Math.round(v * 100) / 100;
// reach range shown on the slider
assert.equal(tipOf(0), 92);
assert.equal(tipOf(MODEL.eMax), 182);
// weights quoted on the page
assert.equal(MODEL.cw.w, 65);
assert.equal(-MODEL.cw.x, 46);
assert.equal(r2((MODEL.sleeve.b - MODEL.sleeve.a) * MODEL.sleeve.w), 30);
assert.equal(r2((MODEL.stage1.b - MODEL.stage1.a) * MODEL.stage1.w), 16);
assert.equal(r2((MODEL.stage2.b - MODEL.stage2.a) * MODEL.stage2.w), 11.2);
assert.equal(MODEL.head.w, 10);
assert.equal(r2(totalWeight()), 132.2);
// knife edge alone
assert.equal(r2(moments(0, MODEL.pivot).ratio), 0.59);
assert.equal(r2(moments(MODEL.eMax, MODEL.pivot).ratio), 1.35);
assert.equal(Math.round(tipOf(safeExtension())), 141);
assert.ok(Math.abs(moments(safeExtension(), MODEL.pivot).ratio - 1) < 1e-9);
// with the forward base: roller stand at 124 carries the arm at full length
assert.equal(MODEL.post, 124);
assert.ok(overPost(MODEL.eMax));
assert.equal(state(MODEL.eMax, true).fulcrum, "post");
assert.equal(r2(state(MODEL.eMax, true).ratio), 0.04);
assert.equal(state(MODEL.eMax, true).tips, false);
assert.equal(state(MODEL.eMax, false).tips, true);
// the stand already carries the arm before it would tip on the knife edge
let firstOver = 0;
while (!overPost(firstOver)) firstOver += 0.1;
assert.ok(firstOver < safeExtension(), `stand engages at e=${firstOver.toFixed(1)}, tips at ${safeExtension().toFixed(1)}`);
// with the base set, nothing in the travel tips
for (let e = 0; e <= MODEL.eMax; e += 0.5) assert.equal(state(e, true).tips, false, `tips at e=${e} with base`);
// both moments are positive mid-travel
const { ahead, behind } = moments(30, 0);
assert.ok(ahead > 0 && behind > 0);
console.log("model.test: all passed");
// notional losses quoted on the page
import { losses } from "./model.mjs";
assert.deepEqual([losses(0, false).blue, losses(0, false).red], [0, 0]);
assert.deepEqual([losses(48, false).blue, losses(48, false).red], [0, 0]);
assert.deepEqual([losses(MODEL.eMax, true).blue, losses(MODEL.eMax, true).red], [1, 2]);
assert.deepEqual([losses(MODEL.eMax, false).blue, losses(MODEL.eMax, false).red], [2, 1]);
console.log("model.test (losses): all passed");
