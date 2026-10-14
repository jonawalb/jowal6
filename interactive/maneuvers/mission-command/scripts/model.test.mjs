// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/mission-command/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, governedSteady, frozenSteady, initial, step, speedAt, FIELD, fit, threat, fieldInitial, fieldStep, fieldLosses, fieldReadout } from "./model.mjs";

const r = Math.round;
// steady states quoted on the page
assert.equal(r(governedSteady(0.7)), 100);
assert.equal(r(governedSteady(1.0)), 97);
assert.equal(r(governedSteady(0.5)), 102);
assert.equal(r(frozenSteady(0.7, 1.0)), 70);
assert.equal(r(frozenSteady(0.7, 0.5)), 140);
assert.equal(r(speedAt(0.7, 0.7)), 100);

// run the simulation and check it reaches those numbers
const run = (s, L, linked, seconds) => { for (let t = 0; t < seconds; t += 1 / 60) step(s, L, linked, 1 / 60); return s; };

// linked: a load step to 1.0; governor settles fast, headquarters catches up later
let s = initial();
run(s, 1.0, true, 2);
assert.ok(s.wG > 96 && s.wG < 99, `governed after 2 s: ${s.wG}`);
assert.ok(s.wC < 90, `cranked after 2 s should still lag: ${s.wC}`);
run(s, 1.0, true, 20);
assert.equal(r(s.wG), 97);
assert.ok(Math.abs(s.wC - 100) < 1, `cranked, linked, after 22 s: ${s.wC}`);

// cut: throttle frozen at 0.7, load to 1.0 and to 0.5
s = initial();
run(s, 1.0, false, 20);
assert.equal(r(s.wC), 70);
assert.equal(r(s.uC * 100), 70);
assert.equal(r(s.wG), 97);
s = initial();
run(s, 0.5, false, 20);
assert.equal(r(s.wC), 140);
assert.equal(r(s.wG), 102);

// headquarters never cranks faster than MODEL.crank
s = initial();
let prev = s.uHQ;
for (let i = 0; i < 600; i++) { step(s, 1.0, true, 1 / 60); assert.ok(Math.abs(s.uHQ - prev) <= MODEL.crank / 60 + 1e-12); prev = s.uHQ; }

// ---- Battlefield view (notional numbers quoted in page.html and METHOD.md) ----
assert.equal(fit(100), 1);
assert.equal(fit(88), 0);
assert.equal(fit(140), 0);
assert.equal(fit(70), 0);
assert.equal(Math.round(fit(97) * 100), 75);
assert.equal(threat(0.79), 0);
assert.equal(threat(0.8), 1);
assert.equal(Math.round(1 / FIELD.rate), 11);            // a full route in about 11 s at a perfect fit
assert.deepEqual([FIELD.heavy, FIELD.light, FIELD.hitHalt, FIELD.hitMove, FIELD.cap, FIELD.seize], [0.8, 0.55, 0.8, 0.25, 4, 0.9]);
assert.deepEqual(FIELD.assault, [1, 2]);
const field = (L, linked, seconds, s0 = initial(), f0 = fieldInitial()) => {
  for (let t = 0; t < seconds; t += 1 / 60) { step(s0, L, linked, 1 / 60); fieldStep(f0, s0, 1 / 60); }
  return [s0, f0];
};
// linked, the starting situation: both platoons take their bridges; each defended bridge costs 1 vs 2
let [es, fs] = field(0.7, true, 20);
assert.equal(fs.pG, 1); assert.equal(fs.pC, 1);
assert.deepEqual(fieldLosses(fs), { blue: 2, red: 4 });
// jammed from the start under a heavy situation: the platoon on intent shifts to the covered route
// and takes its bridge; the platoon on orders (throttle frozen, 70%) halts at the start line
[es, fs] = field(1.0, false, 30);
assert.equal(Math.round(es.wC), 70);
assert.equal(fs.pG, 1); assert.equal(fs.tookG, 1); assert.ok(fs.pC < 0.05, `waiting platoon barely moves: ${fs.pC}`);
assert.ok(fs.rG > 0.99 && fs.rC === 0);
// caught halfway up the open road when the link is jammed and the gun moves up: halted, it loses
// men at 0.8 a second up to the cap of 4
{
  const s0 = initial(), f0 = fieldInitial();
  field(0.7, true, 4, s0, f0);                               // both under way on the road
  const p0 = f0.pC;
  field(1.0, false, 15, s0, f0);
  assert.ok(Math.abs(f0.pC - p0) < 0.05, `waiting platoon should halt: ${p0} → ${f0.pC}`);
  assert.equal(f0.hitC, FIELD.cap);
  assert.ok(f0.hitG < 1, `platoon on intent mostly under cover: ${f0.hitG}`);
  assert.deepEqual(fieldLosses(f0), { blue: 5, red: 2 });
}
// a light situation: the enemy pulls back and the bridges are crossed without a fight
[es, fs] = field(0.5, true, 30);
assert.equal(fs.tookG, 2); assert.deepEqual(fieldLosses(fs), { blue: 0, red: 0 });
// the readout stays under 45 characters at its longest
assert.ok(fieldReadout({ wG: 102.4, wC: 140 }, { hitG: 4, hitC: 4, tookG: 1, tookC: 1 }, false).length <= 44);
console.log("model.test: all passed");
