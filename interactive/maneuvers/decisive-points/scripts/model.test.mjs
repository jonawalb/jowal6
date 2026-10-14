// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/decisive-points/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, keyLoad, fails, failingSets, dialShare, losses } from "./model.mjs";

// all pinned: 30%
assert.equal(keyLoad([0, 0, 0, 0]), 30);
// the tour: left outer 45, both outer 60, plus left inner 95 (holds), all four 130 (fails)
assert.equal(keyLoad([1, 0, 0, 0]), 45);
assert.equal(keyLoad([1, 0, 0, 1]), 60);
assert.equal(keyLoad([1, 1, 0, 1]), 95);
assert.equal(fails([1, 1, 0, 1]), false);
assert.equal(keyLoad([1, 1, 1, 1]), 130);
assert.equal(fails([1, 1, 1, 1]), true);
// both inner pins alone: exactly 100%, fails
assert.equal(keyLoad([0, 1, 1, 0]), 100);
assert.equal(fails([0, 1, 1, 0]), true);
// one inner pin: 65%
assert.equal(keyLoad([0, 1, 0, 0]), 65);
// only the four sets that include both inner pins fail
const sets = failingSets();
assert.equal(sets.length, 4);
for (const s of sets) assert.ok(s[1] === 1 && s[2] === 1);
// shares add up: 30 + 15 + 35 + 35 + 15 = 130
assert.equal(MODEL.base + MODEL.shares.reduce((a, b) => a + b, 0), 130);
assert.equal(MODEL.cap, 100);
assert.equal(MODEL.drop, 8);
// dial: 150% full scale
assert.equal(dialShare(150), 1);
assert.equal(dialShare(75), 0.5);
// casualties (Battlefield view, notional): none at the start; the three-point route (both outer and the
// left inner) costs the attacker 42 and the hub holds; the two inner points cost 36 and the hub gives
assert.deepEqual(losses([0, 0, 0, 0], false), { atk: 0, def: 0 });
assert.deepEqual(losses([1, 1, 0, 1], false), { atk: 42, def: 37 });
assert.deepEqual(losses([0, 1, 1, 0], true), { atk: 36, def: 62 });
assert.deepEqual(losses([1, 1, 1, 1], true), { atk: 60, def: 83 });
console.log("model.test: all passed");
