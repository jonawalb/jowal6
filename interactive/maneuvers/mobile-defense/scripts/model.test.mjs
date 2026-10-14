// Checks every model number quoted in page.html, METHOD.md and the readout.
// Run: node interactive/maneuvers/mobile-defense/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, forces, enemyAt, fixNeeded, outcome, band, runAt, ratioAt, LOSS, vehicles, lossFinal, lossesAt } from "./model.mjs";

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);
// page: "100 units", "enters with 70", "fires strip 30%", "leaving 49", "0.7 units ... (34.3)"
assert.equal(MODEL.total, 100);
assert.equal(enemyAt(0), 70);
assert.equal(MODEL.fires, 0.30);
near(enemyAt(1), 49, "enemy at the stop");
near(fixNeeded(), 34.3, "fix needed");
// page: "The trap closes for striking shares of 50% to 65%"
assert.deepEqual(band(), [50, 65]);
// tour splits and their outcomes (readout examples)
assert.equal(outcome(0.58), "trapped");
assert.equal(outcome(0.40), "held");
assert.equal(outcome(0.74), "overrun");
assert.equal(outcome(0.49), "held");   // 49 is not greater than 49 (para 10-34: greater than)
assert.equal(outcome(0.66), "overrun"); // 34 < 34.3
near(forces(0.58).strike, 58, "strike at 58%");
assert.equal(Math.round(forces(0.74).fix), 26);
// readout: "Trapped · strike 58 > 49", "Overrun · fix 26 < 34 needed", "Held · strike 40 ≤ enemy 49" (plus "N vs M down")
assert.equal(Math.round(fixNeeded()), 34);
// slider range on the page: 30 to 80
assert.deepEqual(MODEL.split, [0.30, 0.80]);
// one run is 4.8 s; three tour runs make a 14.4 s tour
near(MODEL.cycle, 4.8, "cycle");
// the arm only moves when the outcome is trapped, and only after contact
for (let t = 0; t < MODEL.cycle; t += 0.05) {
  for (const s of [0.40, 0.74]) assert.equal(runAt(t, s).arm, 0);
  const st = runAt(t, 0.58);
  if (t < MODEL.T.advance + MODEL.T.settle) assert.equal(st.arm, 0);
  assert.ok(st.p <= 1 + 1e-9, "a held enemy never passes the stop");
}
assert.ok(runAt(3.0, 0.74).p > 1.7, "an overrun enemy runs past the stop");
near(runAt(3.0, 0.58).arm, 1, "arm closed in hold");
// gauge: ratio at the mouth and at the stop for the opening split
assert.equal(ratioAt(0, 0.58).toFixed(2), "0.83");
assert.equal(ratioAt(1, 0.58).toFixed(2), "1.18");
// Battlefield view and losses (notional). Page: "one vehicle ... for every 5 units", "the defender has 20",
// "a red armored column of 14 vehicles", "Fires knock out 4 of the enemy's 14", "its lead is lost at the stop",
// "2 vehicles times the fix needed over the fix it has ... and 1 more if it is overrun", "6 enemy vehicles times
// the striking force over the enemy at the stop, and loses 3 times the enemy over the striking force",
// "5 vs 12 down (58%, trapped), 1 vs 5 (40%, held) and 4 vs 5 (74%, overrun)".
assert.equal(LOSS.perVeh, 5);
assert.equal(vehicles(0.58).strike + vehicles(0.58).fix, 20);
assert.equal(vehicles(0.58).enemy, 14);
assert.deepEqual([LOSS.fixK, LOSS.overrun, LOSS.atStop, LOSS.strikeRedK, LOSS.strikeBlueK], [2, 1, 1, 6, 3]);
assert.equal(lossFinal(0.58).fires, 4);
assert.equal(lossFinal(0.58).stop, 1);
const down = (s) => [lossFinal(s).blue, lossFinal(s).red];
assert.deepEqual(down(0.58), [5, 12]);
assert.deepEqual(down(0.40), [1, 5]);
assert.deepEqual(down(0.74), [4, 5]);
// "The trap costs the defender more vehicles than holding without striking, but destroys most of the column;
// the overrun costs the fixing force most of its vehicles"
assert.ok(down(0.58)[0] > down(0.40)[0] && down(0.58)[1] > vehicles(0.58).enemy / 2);
assert.ok(lossFinal(0.74).fix > vehicles(0.74).fix / 2);
// every split: losses never exceed what is on the field, both sides lose something, and they hold through the reset
for (let pct = 30; pct <= 80; pct++) {
  const s = pct / 100, F = lossFinal(s), v = vehicles(s);
  assert.ok(F.fix <= v.fix && F.strikeBlue <= v.strike && F.red <= v.enemy, `losses fit at ${pct}%`);
  assert.ok(F.blue > 0 && F.red > 0, `both sides lose at ${pct}%`);
  assert.deepEqual(lossesAt(MODEL.cycle - 0.01, s), lossesAt(MODEL.cycle - MODEL.T.reset + 0.01, s));
  assert.equal(lossesAt(MODEL.cycle - 0.01, s).blue, F.blue);
  assert.equal(lossesAt(0, s).blue + lossesAt(0, s).red, 0);
}
// readout length: the longest casualty readouts stay under 45 characters
for (const t of ["Trapped · strike 65 > 49 · 4 vs 13 down", "Overrun · fix 20 < 34 needed · 4 vs 5 down", "Held · strike 30 ≤ enemy 49 · 1 vs 5 down", "Fixed · enemy 49 at the stop · 2 vs 5 down", "Split 58/42 · enemy 60 · 0 vs 4 down"]) assert.ok(t.length < 45, t);
console.log("model.test: all passed");
