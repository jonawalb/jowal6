// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/movement-to-contact/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, BENCH, stateAt, finalState, phaseWord, readoutMachine, readoutField, gapMin, benchX, snap } from "./model.mjs";

// geometry
assert.equal(MODEL.v, 60); assert.equal(MODEL.SC, 300); assert.equal(MODEL.SL, 330); assert.equal(MODEL.SE, 500);
assert.equal(MODEL.tDep, 4.0);
assert.equal(MODEL.SE - MODEL.SC, 200);
assert.equal(gapMin(), 270);
assert.ok(benchX(BENCH.S0) === BENCH.X0 && benchX(BENCH.S1) === BENCH.X1);
// the lead is engaged at 5.5 s
assert.equal(stateAt({ gap: 300, lead: true }, 0, false).plan.tc, 5.5);
const out = (gap, lead = true) => { const s = finalState({ gap, lead }); return [s.outcome, s.downF, s.downE]; };
// in the window: complete, the lead takes some losses, every defender down
assert.deepEqual(out(280), ["complete", 3, 6]);
assert.deepEqual(out(300), ["complete", 3, 6]);
assert.deepEqual(out(360), ["complete", 3, 6]);
// the least gap that works is 270 (step 20, so 280); the most is 360
for (let g = 0; g <= 480; g += 20) {
  const s = finalState({ gap: g, lead: true });
  const want = g < 270 ? "caught" : g > 360 ? "isolated" : "complete";
  assert.equal(s.outcome, want, `gap ${g}`);
}
// too short: the main body is hit in column
assert.deepEqual(out(260), ["caught", 4, 6]);
assert.deepEqual(out(0), ["caught", 6, 6]);
// too long: the lead goes down before the main body can fire
assert.deepEqual(out(380), ["isolated", 4, 6]);
assert.deepEqual(out(480), ["isolated", 4, 6]);
// no lead element: the main body makes contact itself
assert.deepEqual(out(300, false), ["nolead", 6, 6]);
assert.equal(finalState({ gap: 100, lead: false }).downF, finalState({ gap: 480, lead: false }).downF);
// the time the gap buys is (gap - 30) / 60 s after the lead is engaged, never less than the shake-out inside the window
{
  const s = stateAt({ gap: 300, lead: true }, 0, false);
  assert.ok(Math.abs((s.plan.tIn - s.plan.tc) - 4.5) < 1e-9);
  assert.ok(Math.abs((stateAt({ gap: 480, lead: true }, 0, false).plan.tIn - 5.5) - 7.5) < 1e-9);
}
// men down only ever rise; every readout fits the card corner; no more than six per side
for (const lead of [true, false]) for (let g = 0; g <= 480; g += 20) {
  let f = 0, e = 0;
  const cfg = { gap: g, lead };
  const end = finalState(cfg).end + MODEL.hold + 0.1;
  for (let t = 0; t <= end; t += 1 / 30) {
    const s = stateAt(cfg, t);
    assert.ok(readoutField(s).length < 45, readoutField(s));
    assert.ok(s.downF >= f && s.downE >= e);
    assert.ok(s.downF <= MODEL.friendMax && s.downE <= MODEL.enemy);
    f = s.downF; e = s.downE;
    assert.ok(s.dep >= 0 && s.dep <= 1);
    if (s.lead) assert.ok(s.sLead <= MODEL.SL + 1e-9);
    assert.ok(s.sBody <= MODEL.SSTOP + 1e-9);
  }
}
// speed bound: nothing moves faster than v
for (const [g, lead] of [[300, true], [100, true], [480, true], [0, false]]) {
  const cfg = { gap: g, lead };
  let pl = null, pb = null;
  for (let t = 0; t <= 16; t += 1 / 30) {
    const s = stateAt(cfg, t);
    if (pb !== null) assert.ok(s.sBody - pb <= MODEL.v / 30 + 1e-9);
    if (pl !== null && s.lead) assert.ok(s.sLead - pl <= MODEL.v / 30 + 1e-9);
    pb = s.sBody; pl = s.sLead;
  }
}
// before release: nothing happens
{
  const s = stateAt({ gap: 280, lead: true }, 5, false);
  assert.equal(phaseWord(s), "Ready");
  assert.equal(readoutMachine(s), "Ready · gap 280 · lead on");
  assert.equal(readoutMachine(stateAt({ gap: 100, lead: false }, 0, false)), "Ready · no lead element");
  assert.equal(s.downF + s.downE, 0);
}
// the words along a complete run
{
  const cfg = { gap: 300, lead: true };
  assert.equal(phaseWord(stateAt(cfg, 3)), "Find the enemy");
  assert.equal(phaseWord(stateAt(cfg, 7)), "Fix the enemy");
  assert.equal(phaseWord(stateAt(cfg, 11)), "Finish the enemy");
  assert.equal(phaseWord(finalState(cfg)), "Enemy position defeated");
  assert.equal(phaseWord(finalState({ gap: 100, lead: true })), "Main body hit in column");
  assert.equal(phaseWord(finalState({ gap: 400, lead: true })), "Lead left unsupported");
  assert.equal(phaseWord(finalState({ gap: 300, lead: false })), "Main body made contact");
}
assert.equal(snap(251), 260); assert.equal(snap(-5), 0); assert.equal(snap(999), 480);
console.log("model.test: all passed");
