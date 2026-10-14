// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/elastic-defense/scripts/model.test.mjs
import assert from "node:assert/strict";
import * as M from "./model.mjs";

const r2 = (x) => Math.round(x * 100) / 100;
const r1 = (x) => Math.round(x * 10) / 10;

// push: 100% at the start line, falling straight to zero at 3.2 km
assert.equal(M.push(M.MODEL.start), 1);
assert.equal(M.push(3.2), 0);
assert.equal(Math.round(M.push(0) * 100), 82);

// stack resistance: 5% at contact, 25%, 65%, 120% as each stage bottoms out
const b = M.stages();
assert.deepEqual(b.map(r2), [0, 0.65, 1.55, 2.7]);
assert.equal(M.hold(-0.1), 0);
assert.equal(r2(M.hold(0)), 0.05);
assert.equal(r2(M.hold(b[1])), 0.25);
assert.equal(r2(M.hold(b[2])), 0.65);
assert.equal(M.hold(b[3]), Infinity);

// "every weight on the slider stalls in the battle zone, between 0.9 and 1.6 km deep"
for (let a = 0.6; a <= 1.6 + 1e-9; a += 0.05) {
  const d = M.stall(a);
  assert.equal(M.zoneOf(d), "Battle zone", `weight ${a} stalls at ${d}`);
  assert.ok(d >= 0.88 && d <= 1.6, `weight ${a} stalls at ${d}`);
}
assert.equal(r1(M.stall(0.6)), 0.9);
assert.equal(r1(M.stall(1)), 1.2);
assert.equal(r1(M.stall(1.6)), 1.6);

// "breaks when the push that reaches it is above 70% ... push has fallen to 82% of the attack weight ...
// any attack weight above about 85% (70 / 82) shatters the wall; at 85% or below the wall holds"
assert.equal(M.MODEL.wall, 0.7);
assert.equal(Math.round(M.push(M.MODEL.homes[0]) * 100), 82);
assert.equal(Math.round(M.breakingWeight() * 100), 85);
assert.ok(Math.abs(M.breakingWeight() - M.MODEL.wall / M.push(M.MODEL.homes[0])) < 1e-12);
assert.equal(M.breaks(0.85), false);
assert.equal(M.breaks(0.9), true);

// flank carriage: "first meets the ram's roller at 1.75 km, deeper than any stall"
assert.equal(M.MODEL.strike, 1.75);
assert.ok(M.MODEL.strike > M.stall(1.6));
assert.equal(M.faceDepth(0), 1.75);
assert.equal(r2(M.faceDepth(1)), r2(b[1]));

// counter margin 25%
assert.equal(M.COUNTER_MARGIN, 0.25);

// full runs through the state machine
function run(mode, a) {
  const S = M.initial(mode, a);
  M.fire(S);
  for (let i = 0; i < 60 * 20; i++) M.step(S, 1 / 60);
  return S;
}
let S = run("elastic", 1);
assert.equal(S.phase, "restored");
assert.equal(r2(S.d), r2(b[1]));            // MLR plate home again
assert.equal(M.readout(S), "MLR restored · attack spent · 10 vs 6 down");
assert.equal(S.c, 1);                       // the flank carriage's full stroke
S = run("rigid", 1);
assert.equal(S.phase, "through");
assert.equal(M.readout(S), "Broke through · 2.9 km deep · 4 vs 18 down");
S = run("rigid", 0.8);
assert.equal(S.phase, "held");
assert.equal(M.readout(S), "Wall holds · push 66% · 7 vs 5 down");

// casualties (notional): drawn force 24 vs 33; the rates quoted in "What is notional"
assert.deepEqual(M.FORCE, { blue: 24, red: 33 });
assert.deepEqual(M.LOSS.elastic, { blue: { perKm: 0.22, counter: 0.15 }, red: { perKm: 0.06, counter: 0.10 } });
assert.deepEqual(M.LOSS.rigid, { blue: { approach: 0.10, held: 0.20, through: 0.08 }, red: { barrage: 0.15, overrun: 0.40 } });
assert.equal(Math.round((0.10 + 0.08) * 100), 18);  // "the attacker about 18%" when the wall breaks
assert.equal(Math.round((0.10 + 0.20) * 100), 30);  // "the attacker loses 30%" when it holds
// casualties never exceed the drawn force and are zero at rest
for (const mode of ["elastic", "rigid"]) for (const a of [0.6, 1, 1.6]) {
  const T = M.initial(mode, a);
  assert.deepEqual(M.casualties(T), { blue: 0, red: 0 });
  M.fire(T);
  for (let i = 0; i < 60 * 20; i++) { M.step(T, 1 / 60); const c = M.casualties(T); assert.ok(c.blue <= 24 && c.red <= 33); }
}

// readouts stay under 45 characters
const samples = [];
for (const mode of ["elastic", "rigid"]) for (const a of [0.6, 1, 1.6]) {
  const T = M.initial(mode, a); M.fire(T);
  for (let i = 0; i < 60 * 20; i++) { M.step(T, 1 / 60); samples.push(M.readout(T)); }
}
for (const t of samples) assert.ok(t.length < 45, t);
console.log("model.test: all passed");
