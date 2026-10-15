// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/security-tasks/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, TASKS, ENEMIES, stateAt, finalState, planOf, phaseWord, readoutMachine, readoutField, benchX, BENCH, norm } from "./model.mjs";

assert.equal(MODEL.D0, 32); assert.equal(MODEL.v, 0.5); assert.equal(MODEL.S_OBS, 6);
assert.deepEqual(MODEL.LINE, [12, 12, 22]);
assert.deepEqual(MODEL.HOLD, [8, 24, 48]);
assert.ok(benchX(BENCH.S0) === BENCH.X0 && benchX(BENCH.S1) === BENCH.X1);
// the reaction time (time bought) for each task against each enemy level: space term plus delay
const R = (t, e) => planOf({ task: t, enemy: e }).react;
const want = [[21, 17, 15], [37, 37, 25], [81, 81, 81]];
for (let t = 0; t < 3; t++) for (let e = 0; e < 3; e++) assert.equal(R(t, e), want[t][e], `${TASKS[t].id} vs ${ENEMIES[e].id}`);
// space terms: 13 min for a line at 12 km, 33 min at 22 km
assert.equal(planOf({ task: 0, enemy: 0 }).space, 13); assert.equal(planOf({ task: 2, enemy: 0 }).space, 33);
// held or passed
for (let t = 0; t < 3; t++) for (let e = 0; e < 3; e++) assert.equal(planOf({ task: t, enemy: e }).held, e <= MODEL.CAP[t]);
// the report comes when the enemy reaches the engagement point
assert.equal(planOf({ task: 0, enemy: 1 }).tc, 36); assert.equal(planOf({ task: 2, enemy: 1 }).tc, 16);
// more combat power in the security force, more time bought against the same enemy (main body)
assert.ok(R(0, 2) < R(1, 2) && R(1, 2) < R(2, 2));
// the model never returns more men down than are drawn, or the rack holds
for (let t = 0; t < 3; t++) for (let e = 0; e < 3; e++) {
  assert.ok(MODEL.FD[t][e] <= MODEL.FRIENDS[t] && MODEL.FD[t][e] <= 6);
  assert.ok(MODEL.ED[t][e] <= MODEL.ENEMY_N[e] && MODEL.ED[t][e] <= 10);
  const f = finalState({ task: t, enemy: e });
  assert.equal(f.downF, MODEL.FD[t][e]); assert.equal(f.downE, MODEL.ED[t][e]);
}
// outcomes
assert.equal(phaseWord(finalState({ task: 0, enemy: 2 })), "Enemy comes on");
assert.equal(phaseWord(finalState({ task: 1, enemy: 1 })), "Enemy stopped");
assert.equal(phaseWord(finalState({ task: 1, enemy: 2 })), "Enemy comes on");
assert.equal(phaseWord(finalState({ task: 2, enemy: 2 })), "Enemy stopped");
// readouts, all under 45 characters, before, during and after every run
for (let t = 0; t < 3; t++) for (let e = 0; e < 3; e++) {
  const cfg = { task: t, enemy: e };
  const end = finalState(cfg).end / MODEL.minPerSec + MODEL.holdEnd + 0.2;
  let f = 0, en = 0, pc = 0;
  for (let x = 0; x <= end; x += 1 / 30) {
    const s = stateAt(cfg, x);
    assert.ok(readoutField(s).length < 45, readoutField(s));
    assert.ok(s.downF >= f && s.downE >= en); f = s.downF; en = s.downE;
    assert.ok(s.c >= 0 && s.c <= 1);
    assert.ok(s.clockMin >= pc - 1e-9); pc = s.clockMin;
    assert.ok(s.sE <= MODEL.D0 + 1e-9 && s.sE >= MODEL.S_OBS - 1e-9);
  }
  // the enemy never moves faster than 3 v (the buffer giving ground is the fastest part)
  let p = null;
  for (let x = 0; x <= end; x += 1 / 30) { const s = stateAt(cfg, x); if (p !== null) assert.ok(Math.abs(s.sE - p) <= (3 * MODEL.v * MODEL.minPerSec) / 30 + 1e-9, `${t}${e} at ${x}`); p = s.sE; }
}
// the enemy reaches the observation line exactly at the reaction time when it is not held
{
  const s = stateAt({ task: 0, enemy: 2 }, planOf({ task: 0, enemy: 2 }).tObs / MODEL.minPerSec);
  assert.ok(Math.abs(s.sE - MODEL.S_OBS) < 1e-6);
}
// readouts
assert.equal(readoutMachine(stateAt({ task: 1, enemy: 1 }, 0, false)), "Guard vs lead · ready");
assert.equal(readoutMachine(finalState({ task: 1, enemy: 2 })), "Enemy comes on · 25 min · 3 vs 5 down");
assert.equal(readoutMachine(finalState({ task: 2, enemy: 2 })), "Enemy stopped · 81+ min · 5 vs 10 down");
assert.equal(readoutMachine(finalState({ task: 0, enemy: 0 })), "Enemy stopped · 21+ min · 0 vs 3 down");
assert.deepEqual(norm({ task: 7, enemy: -1 }), { task: 2, enemy: 0 });
console.log("model.test: all passed");
