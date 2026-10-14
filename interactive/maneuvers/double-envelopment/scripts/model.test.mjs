// Checks the model numbers quoted in page.html and METHOD.md, and the clearances the drawing relies on.
// Run: node interactive/maneuvers/double-envelopment/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, engaged, jawClearance, jawPoint, pivot, blockTarget, blocked, holding, losses } from "./model.mjs";

const pct = (st) => Math.round(engaged(st).share * 100);

// Quoted on the page: pad alone 24%, held and shut 78%, squeezed out 0%.
assert.equal(pct({ beta: MODEL.open, s: 0, u: 0 }), 24, "held, jaws open");
assert.equal(pct({ beta: 0, s: 0, u: 0 }), 78, "held, jaws shut");
assert.equal(pct({ beta: 0, s: -MODEL.escape, u: MODEL.withdraw }), 0, "released, slipped out the back");
assert.equal(pct({ beta: MODEL.open, s: 0, u: MODEL.withdraw }), 0, "released, jaws open");
// Quoted constants.
assert.equal(MODEL.tol, 1);
assert.equal(MODEL.escape, 57);
assert.equal(MODEL.slip, 50);
assert.equal(MODEL.withdraw, 3);

// The gauge never falls as held jaws close.
let prev = -1;
for (let b = MODEL.open; b >= 0; b -= 0.5) {
  const v = engaged({ beta: b, s: 0, u: 0 }).share;
  assert.ok(v >= prev - 1e-9, `share fell while closing at beta ${b}`);
  prev = v;
}

// Pivot sits on the jaw's mid radius at the root angle, and opening leaves it fixed.
const [px, py] = pivot(1);
const [qx, qy] = jawPoint(1, MODEL.root, MODEL.rin + MODEL.thick / 2, 30);
assert.ok(Math.hypot(px - qx, py - qy) < 1e-9, "pivot moves when the jaw opens");

// No jaw ever cuts into the block: at home for every opening; anywhere on the rear escape path
// while the jaws are at or above the slip angle (when it starts to move); and once escaped, for
// every opening, so the jaws can shut behind it.
for (let b = 0; b <= MODEL.open; b += 0.5) assert.ok(jawClearance(b, 0) >= MODEL.rb, `jaw in block at beta ${b}`);
for (let b = MODEL.slip; b <= MODEL.open; b += 0.5) for (let s = 0; s >= -MODEL.escape; s -= 0.5) assert.ok(jawClearance(b, s) >= MODEL.rb, `jaw in block at beta ${b}, s ${s}`);
for (let b = 0; b <= MODEL.open; b += 0.5) assert.ok(jawClearance(b, -MODEL.escape) >= MODEL.rb, `jaw in escaped block at beta ${b}`);
// Part-way out, closing jaws are stopped by the block, and the home position is never "blocked".
assert.equal(blocked(0, -20), true);
assert.equal(blocked(0, 0), false);
assert.equal(blocked(0, -MODEL.escape), false);
// The lifted pad no longer touches the block at home.
assert.equal(engaged({ beta: MODEL.open, s: 0, u: MODEL.withdraw }).pad, 0, "lifted pad still touches");

// Escape rule and the holding test.
assert.equal(blockTarget(true, 0, 0), 0);
assert.equal(blockTarget(true, 0, -MODEL.escape), -MODEL.escape);
assert.equal(blockTarget(true, MODEL.slip, -MODEL.escape), 0);
assert.equal(blockTarget(false, MODEL.open, 0), 0);
assert.equal(blockTarget(false, MODEL.slip - 1, 0), -MODEL.escape);
assert.equal(blockTarget(false, MODEL.slip + 1, -10), -10);
assert.equal(holding(true, 0, 0), true);
assert.equal(holding(true, 10, 0), false);
assert.equal(holding(false, 0, 0), false);
// Notional losses: success is not free, and an envelopment that is not held costs the attacker more
// and the enemy less.
assert.deepEqual(losses({ beta: MODEL.open, s: 0, u: 0 }, true), { blue: 1, red: 2 }, "held, jaws open");
assert.deepEqual(losses({ beta: 0, s: 0, u: 0 }, true), { blue: 3, red: 6 }, "held, jaws shut");
assert.deepEqual(losses({ beta: 0, s: -MODEL.escape, u: MODEL.withdraw }, false), { blue: 5, red: 1 }, "released, slipped out");
for (let b = MODEL.open; b >= 0; b -= 0.5) for (const held of [true, false]) {
  const st = held ? { beta: b, s: 0, u: 0 } : { beta: b, s: b < MODEL.slip ? -MODEL.escape : 0, u: MODEL.withdraw };
  const c = losses(st, held);
  assert.ok(c.blue >= 1 && c.red >= 1, `both sides always lose someone at beta ${b}`);
  assert.ok(`Slipped · jaws ${Math.round((1 - b / MODEL.open) * 100)}% · ${Math.round(engaged(st).share * 100)}% rim · ${c.blue} vs ${c.red} down`.length < 45);
  if (!held) assert.ok(c.blue >= losses({ beta: b, s: 0, u: 0 }, true).blue, `unheld costs the attacker at least as much at beta ${b}`);
}
console.log("model.test: all passed");
