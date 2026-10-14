// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/combined-arms-dilemma/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, press, held, keyTarget, boltOpen, bestGuard, opens, turnToward } from "./model.mjs";

// pad positions quoted on the page
assert.equal(press(-1, -1), 1);
assert.equal(press(0, -1), 0);
assert.equal(press(0, 1), 0);
assert.equal(held(-1, -1), true);
assert.equal(held(-1, 1), false);
assert.equal(held(-0.79, -1), false);
assert.equal(held(-0.85, -1), true);
// held from |g| > 0.8 (quoted: "the pad holds a plug only in the last fifth of its swing")
assert.equal(MODEL.engage + MODEL.holdAt * (MODEL.full - MODEL.engage), 0.8);

// the dilemma: with both keys in, no shield position holds both plugs
for (let i = -100; i <= 100; i++) {
  const g = i / 100;
  assert.ok(!(held(g, -1) && held(g, 1)), `g=${g} holds both`);
  assert.equal(opens(g, true, true), true, `g=${g} should open with two keys`);
}
// one key: the defender's best guard holds it
assert.equal(bestGuard(true, false, 0.3), -1);
assert.equal(opens(bestGuard(true, false, 0.3), true, false), false);
assert.equal(opens(1, true, false), true);          // guarding the wrong side lets key A turn
assert.equal(keyTarget(-1, 1, true), 90);           // shield on A, key B turns
assert.equal(keyTarget(1, -1, true), 90);           // shield on B, key A turns
assert.equal(keyTarget(1, 1, true), 0);
// bolt
assert.equal(boltOpen(0, 0), 0);
assert.equal(boltOpen(90, 0), 1);
assert.equal(boltOpen(45, 90), 1);
assert.equal(boltOpen(45, 0), 0.5);
// turn rate cap
let a = 0;
for (let i = 0; i < 6; i++) { const n = turnToward(a, 90, 1 / 60); assert.ok(n - a <= MODEL.turnRate / 60 + 1e-9); a = n; }
// guard crosses plug to plug (2 units) in about 1.4 s; a key turns 90 degrees at up to 180 deg/s
assert.equal(Math.round(2 / MODEL.guardRate * 10) / 10, 1.4);
assert.equal(MODEL.turnRate, 180);
console.log("model.test: all passed");
// notional casualties (Battlefield view and readout): both sides lose men once the lock opens
import { casualties, downText } from "./model.mjs";
assert.deepEqual(casualties(0, 1), { blue: 2, red: 0 });      // one arm, guard on it: lock holds
assert.deepEqual(casualties(1, 1), { blue: 1, red: 1 });      // one arm, guard on the wrong side
assert.deepEqual(casualties(1, 2), { blue: 1, red: 1 });      // two arms: the lock always opens
assert.equal(downText(casualties(0, 1)), "2 vs 0 down");
assert.equal(downText(casualties(1, 2)), "1 vs 1 down");
for (let i = -100; i <= 100; i++) { const c = casualties(opens(i / 100, true, true) ? 1 : 0, 2); assert.ok(c.blue >= 1 && c.red >= 1); }
console.log("model.test (casualties): all passed");
