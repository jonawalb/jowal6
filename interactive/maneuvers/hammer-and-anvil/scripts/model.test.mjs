// Checks every model number quoted in page.html and METHOD.md, and the geometry the
// scene relies on. Run: node interactive/maneuvers/hammer-and-anvil/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, plan, stateAt, anvilFree, holdFree, endOf, readoutOf, LOSS, downAt, casualties } from "./model.mjs";
import { GEO } from "./scene.mjs";

// constants quoted on the page
assert.equal(MODEL.setTime, 1.4);
assert.equal(MODEL.hold, 3.0);
assert.equal(MODEL.retract, 0.8);
assert.equal(MODEL.swing, 1.2);
assert.deepEqual(MODEL.range, [-2, 5]);

// the catch window is 0 to 3.0 s after the anvil is set, inclusive
for (let d = -2; d <= 5.0001; d += 0.1) {
  const r = Math.round(d * 10) / 10;
  const p = plan(r);
  assert.equal(p.caught, r >= 0 && r <= 3, `delta ${r}`);
  assert.equal(p.why, r < 0 ? "early" : r > 3 ? "late" : "caught");
  // caught exactly when the anvil is fully up at landing
  assert.equal(p.caught, anvilFree(p.land) > 0.999 && p.land >= MODEL.setTime && p.land <= MODEL.setTime + MODEL.hold);
}

// anvil: down before t = 0, fully up at 1.4 s, still up at 4.4 s, gone by 5.2 s
assert.equal(anvilFree(-1), 0);
assert.equal(anvilFree(1.4), 1);
assert.equal(anvilFree(4.4), 1);
assert.equal(anvilFree(5.2), 0);
// hold dial: full until set, half at 2.9 s, empty at 4.4 s
assert.equal(holdFree(1.4), 1);
assert.ok(Math.abs(holdFree(2.9) - 0.5) < 1e-9);
assert.equal(holdFree(4.4), 0);

// once caught, the anvil stays up and the dial freezes at its value at landing
const c = stateAt(9, 1);
assert.equal(c.phase, "caught");
assert.equal(c.anvil, 1);
assert.ok(Math.abs(c.hold - 2 / 3) < 1e-9);
assert.equal(c.escape, 0);
// an early or late hammer lets the block slide on to the bumper
assert.ok(stateAt(plan(-1).land + 2, -1).escape > 0.99);
assert.ok(stateAt(plan(4).land + 2, 4).escape > 0.99);
assert.equal(stateAt(9, 4).anvil, 0);
// swing runs 0 → 1 over 1.2 s and lands at land time
const p1 = plan(1);
assert.equal(stateAt(p1.release, 1).swing, 0);
assert.equal(stateAt(p1.land, 1).swing, 1);
assert.ok(endOf(1) > p1.land);

// readouts quoted on the page, all under 45 characters
const at = (d) => readoutOf(stateAt(plan(d).land + 0.01, d), d);
assert.equal(at(1), "Lands +1.0 s · caught · 3 vs 7 down");
assert.equal(at(-1), "Lands \u22121.0 s · escapes · 3 vs 2 down");
assert.equal(at(4), "Lands +4.0 s · anvil spent · 4 vs 2 down");
assert.equal(at(0), "Lands 0.0 s · caught · 2 vs 8 down");
assert.equal(at(3), "Lands +3.0 s · caught · 5 vs 6 down");
assert.equal(readoutOf(stateAt(2.9, 4), 4), "Anvil 100% set · hold 50% · 2 vs 0 down");
assert.equal(readoutOf(stateAt(1.4, 4), 4), "Anvil 100% set · hold 100% · 0 vs 0 down");

// casualties (notional): constants quoted on the page, both sides always lose someone once the hammer lands,
// the final count equals the count at landing plus nothing later, and nobody is down before the run
assert.deepEqual(LOSS, { wear: 3, shock: 1, overrun: 2, hammer: 1, contact: 2, caught: 6, worn: 2 });
assert.deepEqual(casualties(-1), { blue: 3, red: 2, anvil: 2, hammer: 1 });
assert.deepEqual(casualties(1), { blue: 3, red: 7, anvil: 2, hammer: 1 });
assert.deepEqual(casualties(4), { blue: 4, red: 2, anvil: 3, hammer: 1 });
for (let d = -2; d <= 5.0001; d += 0.1) {
  const r = Math.round(d * 10) / 10, c = casualties(r), p = plan(r);
  assert.ok(c.blue >= 1 && c.red >= 1, "both sides lose at " + r);
  assert.deepEqual(downAt(p.land, r), c, "count complete at landing " + r);
  assert.deepEqual(downAt(-5, r), { blue: 0, red: 0, anvil: 0, hammer: 0 });
  assert.ok(c.red > (p.caught ? 5 : 1) && c.red <= (p.caught ? 8 : 2));
}
for (let d = -2; d <= 5; d += 0.5) assert.ok(at(d).length < 45, at(d));
assert.ok("Set to land 1.0 s before anvil sets".length < 45);
for (let d = -2; d <= 5; d += 0.5) for (let t = -2; t < 8; t += 0.25) assert.ok(readoutOf(stateAt(t, d), d).length < 45, readoutOf(stateAt(t, d), d));

// geometry: the hammer drives the block exactly to the anvil face at the end of its stroke,
// and starts behind the block
assert.ok(Math.abs(GEO.frontX(GEO.PHI1) + 2 * GEO.BLOCK[0] - GEO.XA) < 1e-9);
assert.ok(GEO.frontX(GEO.PHI0) < GEO.XB0 - GEO.BLOCK[0]);
// the swing pushes forward monotonically through contact
let prev = -Infinity;
for (let s = 0; s <= 1; s += 0.01) {
  const x = GEO.frontX(GEO.PHI0 + (GEO.PHI1 - GEO.PHI0) * s);
  if (x > GEO.XB0 - GEO.BLOCK[0]) assert.ok(x >= prev - 1e-9);
  prev = x;
}
console.log("model.test: all passed");

// Battlefield mapping (field-scene.mjs): the enemy reaches the near bank exactly as the hammer lands,
// the hammer never closes inside its gap behind the enemy, and an escaping enemy runs past the anvil
const { FG, fieldTargets } = await import("./field-scene.mjs");
for (const d of [-1, 1, 4]) {
  const p = plan(d);
  assert.ok(Math.abs(fieldTargets(stateAt(p.land, d)).ue - FG.UA) < 1e-9);
  for (let t = p.release; t <= p.land; t += 0.05) { const f = fieldTargets(stateAt(t, d)); assert.ok(f.ue - f.uh >= FG.GAP - 1e-9, `gap at ${t}`); }
  const end = fieldTargets(stateAt(endOf(d), d)).ue;
  assert.ok(p.caught ? Math.abs(end - FG.UA) < 1e-9 : end > FG.U_STAGE, `end ${d}`);
}
console.log("field mapping: passed");
