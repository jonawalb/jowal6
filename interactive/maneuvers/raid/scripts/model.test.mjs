// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/raid/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, RAIL, stateAt, finalState, phaseWord, readoutMachine, readoutField, maxDwell, columnAt, snap } from "./model.mjs";

// geometry: the shuttle's far end clears the gate bar at half way, its near end meets it a little before
assert.equal(MODEL.uTail, 0.5);
assert.ok(Math.abs(MODEL.uNose - 71 / 114) < 1e-9);
assert.equal(RAIL.GX - RAIL.SHL, RAIL.HX + 0.5 * (RAIL.OX - RAIL.HX));
// the numbers the page quotes
assert.equal(MODEL.run, 6.0); assert.equal(MODEL.fire, 4.5); assert.equal(MODEL.task, 3.0);
assert.equal(MODEL.R.off, 9.0); assert.equal(MODEL.R.on, 15.0);
assert.equal(maxDwell(false), 4.5);
assert.equal(maxDwell(true), 10.5);
const out = (dwell, security) => { const s = finalState({ dwell, security }); return [s.outcome, s.downF, s.downE]; };
// in the window: complete, 2 vs 6 with every defender down; 3.0 s is just enough (5 defenders)
assert.deepEqual(out(4, true), ["complete", 2, 6]);
assert.deepEqual(out(3, true), ["complete", 2, 5]);
assert.deepEqual(out(4.5, false), ["complete", 2, 6]);
assert.deepEqual(out(10.5, true), ["complete", 2, 6]);
// just past the window: caught, men go down at the gate (2 on the objective + 4 at the gate)
assert.deepEqual(out(5, false), ["caught", 6, 6]);
assert.deepEqual(out(11, true), ["caught", 6, 6]);
// too short: the task is not done (not caught)
assert.deepEqual(out(1.5, true), ["early", 1, 3]);
assert.deepEqual(out(2.5, false), ["early", 1, 4]);
assert.deepEqual(out(0, true), ["early", 0, 1]);
// security only ever widens the window
for (let d = 0; d <= 12; d += 0.5) {
  const off = finalState({ dwell: d, security: false }), on = finalState({ dwell: d, security: true });
  if (off.outcome === "complete") assert.equal(on.outcome, "complete");
}
// the window is exactly [task, maxDwell]
for (let d = 0; d <= 12; d += 0.5) for (const sec of [false, true]) {
  const o = finalState({ dwell: d, security: sec }).outcome;
  const want = d > maxDwell(sec) ? "caught" : d < MODEL.task ? "early" : "complete";
  assert.equal(o, want, `${d} ${sec}`);
}
// the shuttle never moves faster than the run speed, never leaves the rail, and a caught shuttle stalls at the bar
for (const [d, sec] of [[4, true], [5, false], [7, false], [11, true], [12, true], [1.5, true]]) {
  let prev = 0;
  const cfg = { dwell: d, security: sec };
  const end = finalState(cfg).plan.end + MODEL.hold + 0.1;
  for (let t = 0; t <= end; t += 1 / 30) {
    const s = stateAt(cfg, t);
    assert.ok(s.u >= 0 && s.u <= 1);
    assert.ok(Math.abs(s.u - prev) <= 1 / MODEL.run / 30 + 1e-9);
    if (s.caught && s.t >= s.plan.stallT) assert.ok(s.u >= MODEL.uTail - 1e-9);
    prev = s.u;
  }
}
// a caught shuttle is held at or past the tail line, a passing one gets through before the bar is down
{
  const s = finalState({ dwell: 5, security: false });
  assert.ok(s.u > MODEL.uTail && s.straddle);
  const s2 = finalState({ dwell: 7, security: false });
  assert.ok(Math.abs(s2.u - MODEL.uNose) < 1e-9 && !s2.straddle);
  const ok = finalState({ dwell: 4.5, security: false });
  assert.ok(ok.u <= 1e-9);   // got home
}
// men down only ever rise; every readout fits the card corner
for (const sec of [false, true]) for (let d = 0; d <= 12; d += 0.5) {
  let f = 0, e = 0;
  const cfg = { dwell: d, security: sec };
  const end = finalState(cfg).plan.end + MODEL.hold + 0.1;
  for (let t = 0; t <= end; t += 1 / 30) {
    const s = stateAt(cfg, t);
    assert.ok(readoutField(s).length < 45, readoutField(s));
    assert.ok(s.downF >= f && s.downE >= e);
    assert.ok(s.downF <= MODEL.friendMax && s.downE <= MODEL.enemy);
    f = s.downF; e = s.downE;
  }
}
// before release: nothing happens
{
  const s = stateAt({ dwell: 4, security: true }, 5, false);
  assert.equal(phaseWord(s), "Ready");
  assert.equal(readoutMachine(s), "Ready · hold 4.0 s · security on");
  assert.equal(readoutMachine(stateAt({ dwell: 7.5, security: false }, 0, false)), "Ready · hold 7.5 s · security off");
  assert.equal(s.downF + s.downE, 0);
}
// words along a complete run
{
  const cfg = { dwell: 4, security: true };
  assert.equal(phaseWord(stateAt(cfg, 3)), "Run in");
  assert.equal(phaseWord(stateAt(cfg, 7)), "On objective");
  assert.equal(phaseWord(stateAt(cfg, 9.5)), "Task done");
  assert.equal(phaseWord(stateAt(cfg, 12)), "Withdrawing");
  assert.equal(phaseWord(stateAt(cfg, 17)), "Raid complete");
  assert.equal(phaseWord(finalState({ dwell: 6, security: false })), "Caught by response force");
}
// the response force: on its road from the alert, halted at the block with security on, at the route by the close
{
  const on = { dwell: 4, security: true }, off = { dwell: 4, security: false };
  assert.equal(columnAt(stateAt(on, 0)).f, 0);
  assert.equal(columnAt(stateAt(on, MODEL.fire + 6)).halted, true);
  assert.equal(columnAt(stateAt(off, MODEL.fire + 6)).halted, false);
  assert.equal(columnAt(stateAt(off, MODEL.fire + MODEL.R.off)).f, 1);
  assert.ok(columnAt(stateAt(on, MODEL.fire + MODEL.R.off)).f < 1);
  assert.equal(columnAt(stateAt(on, MODEL.fire + MODEL.R.on)).f, 1);
}
assert.equal(snap(4.3), 4.5); assert.equal(snap(-1), 0); assert.equal(snap(99), 12);
console.log("model.test: all passed");
