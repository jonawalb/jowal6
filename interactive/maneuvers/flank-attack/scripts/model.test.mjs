// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/flank-attack/scripts/model.test.mjs
import assert from "node:assert/strict";
import { bearing, offFront, turnToward, losses, MODEL } from "./model.mjs";

const pct = (off) => Math.round(bearing(off) * 100);
assert.equal(pct(0), 100);
assert.equal(pct(45), 68);
assert.equal(pct(90), 26);
assert.equal(pct(180), 15);
assert.equal(offFront(350, 10), 20);
assert.equal(offFront(10, 350), 20);
assert.equal(offFront(200, 0), 160);

// turn rate never exceeds MODEL.turnRate
let psi = 0;
for (let i = 0; i < 60; i++) {
  const next = turnToward(psi, 120, 1 / 60);
  assert.ok(next - psi <= MODEL.turnRate / 60 + 1e-9);
  psi = next;
}
assert.ok(Math.abs(psi - 40) < 1e-6, `one second of turning should cover 40°, got ${psi}`);
// notional losses: a flank attack costs the attacker less than a frontal one, never nothing
assert.deepEqual(losses(bearing(0)), { blue: 7, red: 1 });
assert.deepEqual(losses(bearing(90)), { blue: 3, red: 4 });
assert.deepEqual(losses(bearing(180)), { blue: 2, red: 5 });
for (let off = 0; off <= 180; off++) {
  const c = losses(bearing(off)), n = losses(bearing(Math.min(180, off + 1)));
  assert.ok(c.blue >= 1 && c.red >= 1, "both sides always lose someone at " + off);
  assert.ok(n.blue <= c.blue && n.red >= c.red, "losses move monotonically with the bearing at " + off);
  assert.ok(`Releasing · ${Math.round(bearing(off) * 100)}% of fire bears · ${c.blue} vs ${c.red} down`.length < 45);
}
console.log("model.test: all passed");
