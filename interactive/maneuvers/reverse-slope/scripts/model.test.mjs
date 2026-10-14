// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/reverse-slope/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, ground, sees, firstSight, fresh, simulate, bluesDown, redDown } from "./model.mjs";
import { fieldHoles, atX } from "./field-scene.mjs";
const M = MODEL;
assert.deepEqual(M.hill, { r: 75, steps: 5, h: 2.4, top: 0.2 });
assert.equal(M.x0, -150); assert.equal(M.v, 5); assert.equal(M.vDown, 7); assert.equal(M.dwell, 4);
assert.equal(M.Re, 110); assert.equal(M.Rd, 70); assert.equal(M.B0, 30); assert.equal(M.R0, 30);
assert.equal(M.cE, 0.55); assert.equal(M.cI, 0.3); assert.equal(M.cB, 1.2); assert.equal(M.mass, 2.2); assert.equal(M.cF, 1.0);
assert.equal(M.lag, 3); assert.equal(M.breaks, 0.4); assert.equal(M.speed, 2.4);
assert.equal(M.pos.F, -30); assert.equal(M.pos.R, 30);
// terrain: five steps, flat top 30 across (radius 15), height 12
assert.equal(ground(0), 12); assert.equal(ground(14), 12); assert.equal(ground(80), 0);
// masking: the forward position is seen from the start of the attack; the reverse position only near the crest
assert.equal(firstSight(M.pos.F), -150);
assert.ok(firstSight(M.pos.R) > -5 && firstSight(M.pos.R) < 15);
assert.equal(sees(-60, M.eyeE, M.pos.R, M.eyeD), false);
// the outcomes quoted on the page
const t = (m, op) => { const s = simulate(m, op); return [s.ended, +s.t.toFixed(1), bluesDown(s), redDown(s)]; };
assert.deepEqual(t("F", true), ["reached", 28.0, 17, 16]);
assert.deepEqual(t("R", true), ["stopped", 39.3, 3, 18]);
assert.deepEqual(t("R", false), ["reached", 42.3, 6, 13]);
// reverse slope costs the platoon fewer men than the forward slope, with the OP
assert.ok(bluesDown(simulate("R", true)) < bluesDown(simulate("F", true)));
// readout budget (under 45 chars)
for (const r of ["Reverse slope · OP manned · ready", "Forward slope · masked · 17 vs 16 down"]) assert.ok(r.length < 45, r);
assert.equal(fieldHoles(30).length, 12);
console.log("model.test: all passed");
