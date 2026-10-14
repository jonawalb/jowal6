// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/fire-effects/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, roundsFor, minutesFor, hitShare, effectOf, mission, step, cease, simulate, rounds, losses, stateWord, wantE } from "./model.mjs";
import { strokeOf } from "./scene.mjs";

// FM 3-09 (2024) para 3-66 thresholds, as the model holds them
assert.deepEqual(MODEL.levels, { S: 0.03, N: 0.10, D: 0.30 });
// rounds and minutes per effect (page table and "What is notional")
assert.equal(roundsFor("S"), 6); assert.equal(roundsFor("N"), 18); assert.equal(roundsFor("D"), 61);
assert.equal(minutesFor("S").toFixed(1), "0.6"); assert.equal(minutesFor("N").toFixed(1), "1.8"); assert.equal(minutesFor("D").toFixed(1), "6.1");
assert.equal(effectOf(hitShare(6)), "S"); assert.equal(effectOf(hitShare(5)), "");
assert.equal(effectOf(hitShare(18)), "N"); assert.equal(effectOf(hitShare(17)), "S");
assert.equal(effectOf(hitShare(61)), "D"); assert.equal(effectOf(hitShare(60)), "N");
assert.ok(hitShare(6) >= 0.03 && hitShare(18) >= 0.10 && hitShare(61) >= 0.30);
// the parameters the page quotes
assert.equal(MODEL.n0, 170); assert.equal(MODEL.rEff, 10); assert.equal(MODEL.rSus, 4); assert.equal(MODEL.tN, 2);
assert.equal(MODEL.heads, 0.15); assert.equal(MODEL.men, 26); assert.equal(MODEL.window, 8); assert.equal(MODEL.blueK, 0.6);

// the four outcomes quoted in "What is notional"
const sEarly = simulate("S", { ceaseAt: 2 });
assert.equal(losses(sEarly).blue, 4); assert.equal(losses(sEarly).red, 1);
const sHold = simulate("S");
assert.equal(rounds(sHold), 35); assert.equal(losses(sHold).blue, 1);
const n = simulate("N");
assert.equal(rounds(n), 18); assert.deepEqual(losses(n), { blue: 2, red: 3 });
const d = simulate("D");
assert.equal(rounds(d), 61); assert.deepEqual(losses(d), { blue: 1, red: 8 });
assert.equal(stateWord(d), "Destroyed");

// behaviour: suppression lasts only while firing; neutralization holds tN; destruction stays
{
  const s = mission("S"); s.firing = true;
  for (let i = 0; i < 120; i++) step(s, 0.01);      // 1.2 min of fire
  assert.equal(wantE(s), MODEL.heads);
  cease(s);
  assert.ok(wantE(s) > 0.9, "a suppressed enemy comes straight back");
  const m = mission("N"); m.firing = true;
  while (m.firing) step(m, 0.01);
  assert.equal(wantE(m), 0);
  for (let i = 0; i < 190; i++) step(m, 0.01);
  assert.equal(wantE(m), 0, "still down inside tN");
  for (let i = 0; i < 20; i++) step(m, 0.01);
  assert.ok(wantE(m) > 0.85, "back after tN");
  const x = mission("D"); x.firing = true;
  while (x.firing) step(x, 0.01);
  for (let i = 0; i < 1000; i++) step(x, 0.01);
  assert.equal(wantE(x), 0);
}
// press stroke reaches each detent at its threshold
assert.equal(strokeOf(0), 0.25); assert.equal(strokeOf(0.03), 0.5); assert.ok(Math.abs(strokeOf(0.1) - 0.75) < 1e-9); assert.equal(strokeOf(0.3), 1);
// readouts fit the card corner
for (const [w, nn, t, b, r] of [["Neutralized", 18, "8.0", 6, 8], ["Firing back", 61, "8.0", 6, 8], ["Destroyed", 61, "8.0", 6, 8]]) {
  assert.ok(`${w} · ${nn} rds · ${t} min · ${b} vs ${r} down`.length < 45);
  assert.ok(`${w} · ${nn} rds · ${t} min · 30% hit`.length < 45);
}
console.log("model.test: all passed");
