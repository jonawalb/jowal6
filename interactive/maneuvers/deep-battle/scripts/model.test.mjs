// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/deep-battle/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, timesOf, stateAt, readoutOf, LOSSES, lossesOf, fieldReadoutOf } from "./model.mjs";

const r1 = (v) => Math.round(v * 10) / 10;

// sourced ranges (Glantz 1990, pp. 14-15) contain the bench values
assert.ok(MODEL.tactical >= 25 && MODEL.tactical <= 30);
assert.ok(MODEL.deep >= 70 && MODEL.deep <= 100);
assert.ok(MODEL.vInf >= 10 && MODEL.vInf <= 15);
assert.ok(MODEL.vMob >= 40 && MODEL.vMob <= 50);
assert.equal(MODEL.reserveDay, 3);
assert.equal(MODEL.start2, -12);

// "breach complete on day 2.3", "rear gate on day 2.5 at the earliest", "any later than day 2.1"
const early = timesOf(1);
assert.equal(r1(early.breach), 2.3);
assert.equal(r1(early.gate), 2.5);
for (const c of [0, 0.5, 1, 1.5]) assert.equal(r1(timesOf(c).gate), 2.5, `held commit ${c}`);
assert.ok(timesOf(2.1).sealed === false && timesOf(2.2).sealed === true);
assert.equal(r1(early.latest), 2.1);

// tour legs: day 1 goes deep, day 2.5 is sealed
assert.equal(early.sealed, false);
assert.equal(r1(early.deepDay), 3.4);
assert.equal(timesOf(2.5).sealed, true);

// readouts quoted in METHOD.md, and every readout fits the card corner
assert.equal(readoutOf(stateAt(2, 1)), "Day 2.0 · 2nd echelon held behind 1st");
assert.equal(readoutOf(stateAt(3.6, 1)), "Day 3.6 · 70 km deep · reserve 0.5 d late");
assert.equal(readoutOf(stateAt(3.6, 2.5)), "Day 3.6 · sealed: reserve 0.4 d ahead");
for (let c = 0; c <= 4.001; c += 0.1) for (let t = 0; t <= 6; t += 0.05) {
  const s = stateAt(t, Math.round(c * 10) / 10);
  assert.ok(readoutOf(s).length < 45, readoutOf(s));
  // the second echelon never leaves the lane, and never passes a closed rear gate
  assert.ok(s.c2 >= MODEL.start2 - 1e-9 && s.front2 <= MODEL.deep + 1e-9);
  if (s.T.sealed) assert.ok(s.front2 <= MODEL.gateB - 1 + 1e-9);
  // before the breach it stays behind the first echelon
  if (t < s.T.breach) assert.ok(s.c2 <= s.f1 - s.T.off + 1e-9 || s.c2 === MODEL.start2);
  // the gate never drops on the first echelon: its rear is clear of the gate whenever the leaf is below the gantry top
  const inGate = s.f1 > MODEL.gateB - 0.4 && s.f1 - 2 * MODEL.archHalf < MODEL.gateB + 0.4;
  if (inGate) assert.ok(s.liftB > 0.99, `gate on gantry at t ${t}`);
  // nor on the second echelon once it is in the gate
  const mgIn = s.front2 > MODEL.gateB - 0.4 && s.rear2 < MODEL.gateB + 0.4;
  if (mgIn) assert.ok(s.liftB > 0.99, `gate on carriage at t ${t}`);
}

// Battlefield view: notional casualties (thousands) quoted in page.html and METHOD.md
assert.deepEqual([LOSSES.breachAtk, LOSSES.breachDef, LOSSES.gateAtk, LOSSES.gateDef, LOSSES.deepAtk, LOSSES.deepDef, LOSSES.lateAtk, LOSSES.lateDef], [4.0, 3.0, 2.5, 1.0, 0.6, 2.0, 0.4, 0.6]);
const endOf = (c) => { const T = timesOf(c); return T.sealed ? MODEL.reserveDay + 0.9 : T.deepDay + 0.3; };
assert.deepEqual(lossesOf(stateAt(endOf(1), 1)), { atk: 5.0, def: 5.6 });
assert.deepEqual(lossesOf(stateAt(endOf(2.5), 2.5)), { atk: 6.5, def: 4.0 });
assert.deepEqual(lossesOf(stateAt(0, 1)), { atk: 0, def: 0 });
assert.equal(fieldReadoutOf(stateAt(3.6, 1)), "Day 3.6 · 70 km deep · 5.0k vs 5.6k down");
assert.equal(fieldReadoutOf(stateAt(3.9, 2.5)), "Day 3.9 · sealed · 6.5k vs 4.0k down");
for (let c = 0; c <= 4.001; c += 0.1) {
  let prev = { atk: 0, def: 0 };
  for (let t = 0; t <= 6; t += 0.05) {
    const s = stateAt(t, Math.round(c * 10) / 10);
    assert.ok(fieldReadoutOf(s).length < 45, fieldReadoutOf(s));
    const l = lossesOf(s);
    // casualties never fall as time runs on, and the attacker always pays something once it moves
    assert.ok(l.atk >= prev.atk - 1e-9 && l.def >= prev.def - 1e-9, `losses fell at c ${c} t ${t}`);
    if (s.f1 > 1) assert.ok(l.atk > 0 && l.def > 0);
    prev = l;
  }
}
console.log("model.test: all passed");
