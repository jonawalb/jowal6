// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/lift-shift-fires/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, LOSS, plan, distAt, enemyAt, recAt, reinAt, outcome, stateAt, fellAt } from "./model.mjs";

const pct = (x) => Math.round(x * 100);
// the notional parameters the page states
assert.equal(MODEL.floor, 0.1);
assert.equal(MODEL.recover, 4);
assert.equal(MODEL.speed, 32);
assert.equal(MODEL.msl, 50);
assert.equal(MODEL.halt, 2.5);
assert.equal(MODEL.reinDelay, 0.8);
assert.equal(MODEL.reinforce, 0.2);
assert.deepEqual(MODEL.lift, [0, 150]);
assert.deepEqual(LOSS, { assault: 20, enemy: 9 });

// enemy share on arrival, with Shift, as quoted
assert.equal(pct(outcome(140, true).eA), 70);
assert.equal(pct(outcome(100, true).eA), 59);
assert.equal(pct(outcome(50, true).eA), 39);
assert.equal(pct(outcome(10, true).eA), 67);
// risk index
assert.equal(pct(outcome(10).risk), 80);
assert.equal(pct(outcome(0).risk), 100);
for (let L = 50; L <= 150; L += 5) assert.equal(outcome(L).risk, 0);
// lifting at the line is the best setting in this model; anything earlier or later leaves more fire
for (let L = 0; L <= 150; L += 5) if (L !== 50) assert.ok(outcome(L).eA > outcome(50).eA, `lift at ${L} should be worse than 50`);
// shifting beats lifting (the depth team stays pinned)
for (let L = 0; L <= 150; L += 5) assert.ok(outcome(L, false).eA >= outcome(L, true).eA);
// recovery formula: 10% + 90% x (1 - e^(-t/4))
{
  const p = plan(140, true);
  const t = p.tL + 2;
  assert.ok(Math.abs(enemyAt(t, p) - (0.1 + 0.9 * (1 - Math.exp(-2 / 4)))) < 1e-12);
  assert.ok(Math.abs(recAt(t, p) - (1 - Math.exp(-0.5))) < 1e-12);
  assert.equal(enemyAt(p.tL - 0.01, p), 0.1);
}
// the late case: halts at the line for 2.5 s, then goes on
{
  const p = plan(10, true);
  assert.equal(distAt(p.halt0 + 1, p), 50);
  assert.equal(p.tA, 160 / 32 + 2.5);
  assert.equal(stateAt(p.halt0 + 1, 10).phase, "Cease fire");
  assert.equal(stateAt(p.tA, 10).phase, "On objective");
}
// an unpinned depth team starts 0.8 s after the lift and adds up to 20 points
{
  const p = plan(140, false);
  assert.equal(reinAt(p.tL + 0.8, p), 0);
  assert.equal(reinAt(p.tL + 0.8 + 1.6, p), 1);
  assert.equal(reinAt(p.tL + 5, plan(140, true)), 0);
}
// losses: 20 x (4% + 30% x eA) and 9 x (15% + 50% x (1 - eA)), rounded, at least one each
for (let L = 0; L <= 150; L += 5) for (const shift of [true, false]) {
  const o = outcome(L, shift);
  assert.equal(o.blue, Math.max(1, Math.round(20 * (0.04 + 0.3 * o.eA))));
  assert.equal(o.red, Math.max(1, Math.round(9 * (0.15 + 0.5 * (1 - o.eA)))));
  assert.ok(o.blue >= 1 && o.red >= 1);
  // the readouts fit the card corner in every phase
  for (const t of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const R = stateAt(t, L, shift);
    const word = R.phase === "Cease fire" ? "MSL hold (model)" : R.phase;
    const a = `${word} · enemy ${pct(R.e)}% · ${R.blue} vs ${R.red} down`, b = `${word} · enemy ${pct(R.e)}% · risk ${pct(R.risk)}%`;
    assert.ok(a.length < 45 && b.length < 45, a + " / " + b);
    assert.ok(R.blue <= o.blue && R.red <= o.red);
  }
}
assert.deepEqual([outcome(140).blue, outcome(140).red], [5, 3]);
assert.deepEqual([outcome(50).blue, outcome(50).red], [3, 4]);
// men down fall in order along the approach
for (let k = 1; k < 5; k++) assert.ok(fellAt(k, 5) < fellAt(k - 1, 5));
console.log("model.test: all passed");
