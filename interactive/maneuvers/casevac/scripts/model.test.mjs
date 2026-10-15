// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/casevac/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, START, planOf, stateAt, finalState, heldTotal, readoutMachine, readoutField, snap, ENEMY_TOTAL, phaseWord } from "./model.mjs";

const cfg = (cas, vehicle) => ({ cas, vehicle });
// the numbers the page quotes
assert.equal(MODEL.B, 4); assert.equal(MODEL.bound, 3.0); assert.equal(MODEL.res, 1.6);
assert.equal(MODEL.k.litter, 2.6); assert.equal(MODEL.k.vehicle, 1.2); assert.equal(MODEL.carry, 1.6);
assert.deepEqual(START, { cas: 3, vehicle: true });
assert.equal(ENEMY_TOTAL, 6);
// no casualties: four bounds of 3.0 s and four halts of 1.6 s
assert.ok(Math.abs(planOf(cfg(0, true)).end - 18.4) < 1e-9);
assert.ok(Math.abs(planOf(cfg(0, false)).end - 18.4) < 1e-9);
assert.ok(Math.abs(heldTotal(cfg(0, true)) - 6.4) < 1e-9);
// three casualties: in bounds 1 to 3
assert.deepEqual(planOf(cfg(3, true)).bounds.map((b) => b.c), [1, 1, 1, 0]);
assert.ok(Math.abs(planOf(cfg(3, true)).end - 22.0) < 1e-9);
assert.ok(Math.abs(planOf(cfg(3, false)).end - 26.2) < 1e-9);
assert.ok(Math.abs(heldTotal(cfg(3, true)) - 10.0) < 1e-9);
assert.ok(Math.abs(heldTotal(cfg(3, false)) - 14.2) < 1e-9);
// eight casualties by litter: two a bound, 39.2 s in all
assert.deepEqual(planOf(cfg(8, false)).bounds.map((b) => b.c), [2, 2, 2, 2]);
assert.ok(Math.abs(planOf(cfg(8, false)).end - 39.2) < 1e-9);
assert.ok(Math.abs(planOf(cfg(8, true)).end - (12 + 4 * 1.6 + 8 * 1.2)) < 1e-9);
// more casualties never speed the attack; a vehicle is never slower than litters
let prev = 0;
for (let c = 0; c <= 8; c++) {
  const v = planOf(cfg(c, true)).end, l = planOf(cfg(c, false)).end;
  assert.ok(v >= prev - 1e-9); assert.ok(l >= v - 1e-9);
  prev = v;
}
// every casualty reaches the platoon CCP before the halt of its bound begins, and leaves it inside the halt
for (let c = 0; c <= 8; c++) for (const veh of [true, false]) {
  const p = planOf(cfg(c, veh));
  assert.equal(p.cas.length, c);
  for (const x of p.cas) {
    const b = p.bounds[x.bound];
    assert.ok(x.tc >= b.S && x.tc <= b.Hs);
    assert.ok(x.tArr <= b.Hs + 1e-9, `${c} ${veh} ${x.n}`);
    assert.ok(x.evacStart >= b.Hs - 1e-9 && x.evacEnd <= b.ammoStart + 1e-9);
  }
  for (const b of p.bounds) assert.ok(Math.abs(b.E - b.Hs - b.H) < 1e-9);
}
// the line never moves backward and the ammunition arrives before it steps off
for (const [c, veh] of [[0, true], [3, true], [3, false], [8, false]]) {
  const C = cfg(c, veh), p = planOf(C);
  let pu = 0;
  for (let t = 0; t <= p.end + MODEL.hold; t += 1 / 30) {
    const s = stateAt(C, t);
    assert.ok(s.u >= pu - 1e-9 && s.u <= MODEL.B + 1e-9);
    assert.ok(s.ammo >= MODEL.ammoLow - 1e-9 && s.ammo <= 1 + 1e-9);
    pu = s.u;
  }
  for (const b of p.bounds) assert.ok(stateAt(C, b.E - 1e-6).ammo > 0.999);
}
// counts at the end
for (const c of [0, 3, 8]) {
  const s = finalState(cfg(c, true));
  assert.equal(s.downF, c); assert.equal(s.atCCP, 0); assert.equal(s.evac, c); assert.equal(s.downE, 6);
}
// readouts under 45 characters in every state
for (const [c, veh] of [[0, true], [3, true], [8, false]]) {
  for (let t = 0; t <= planOf(cfg(c, veh)).end + 3; t += 0.25) {
    const r = readoutField(stateAt(cfg(c, veh), t));
    assert.ok(r.length <= 45, r);
  }
  assert.ok(readoutMachine(stateAt(cfg(c, veh), 0, false)).length <= 45);
}
assert.equal(snap(3.4), 3); assert.equal(snap(99), 8); assert.equal(snap(-2), 0);
assert.equal(readoutMachine(stateAt(cfg(3, true), 0, false)), "Ready · 3 casualties · vehicle");
// the words the readout uses
assert.equal(phaseWord(stateAt(cfg(3, true), 0, false)), "Ready");
assert.equal(phaseWord(stateAt(cfg(3, true), 1, true)), "Move 1 of 4");
assert.equal(phaseWord(stateAt(cfg(3, true), 3.5, true)), "Halt 1 of 4");
assert.equal(phaseWord(finalState(cfg(3, true))), "Last phase line");
// the figures quoted on the page (What is notional)
assert.ok(Math.abs(planOf(cfg(6, true)).end - 25.6) < 1e-9);
assert.ok(Math.abs(planOf(cfg(6, false)).end - 34.0) < 1e-9);
assert.ok(Math.abs(heldTotal(cfg(8, true)) - 16.0) < 1e-9);
assert.ok(Math.abs(heldTotal(cfg(8, false)) - 27.2) < 1e-9);
assert.equal(MODEL.ammoLow, 0.35);
console.log("model tests pass");
