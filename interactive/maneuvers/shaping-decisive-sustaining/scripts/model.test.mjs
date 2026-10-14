// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/shaping-decisive-sustaining/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, finalBend, verdict, steadyRate, newLine, stepLine, status, attackReach, losses, lossesAt, fieldStatus } from "./model.mjs";

const ALL = { feed: true, shape: true, decide: true };
const without = (k) => ({ ...ALL, [k]: false });

// quoted numbers
assert.equal(MODEL.perStroke, 45);
assert.equal(MODEL.target, 90);
assert.equal(MODEL.cycle, 1.8);
assert.equal(Math.round(steadyRate(ALL)), 33);

// stop any stage and the line makes no good parts
assert.equal(finalBend(ALL), 90);
assert.equal(verdict(ALL), "good");
assert.equal(finalBend(without("shape")), 45);
assert.equal(verdict(without("shape")), "scrap");
assert.equal(finalBend(without("decide")), 45);
assert.equal(verdict(without("decide")), "scrap");
assert.equal(verdict(without("feed")), "none");
for (const k of ["feed", "shape", "decide"]) assert.equal(steadyRate(without(k)), 0);
assert.equal(status(ALL), "Line running");
assert.equal(status(without("shape")), "Shaping stopped");

// the running simulation agrees with the closed form
function run(on, seconds) {
  const L = newLine();
  for (let t = 0; t < seconds; t += 1 / 60) stepLine(L, on, 1 / 60);
  return L;
}
const a = run(ALL, 60);
assert.equal(a.scrap, 0);
assert.ok(a.good >= 30 && a.good <= 33, `about 33 good a minute, got ${a.good}`);
assert.ok(Math.abs(a.rate - 33.3) < 6, `meter near 33/min, got ${a.rate}`);
for (const k of ["shape", "decide"]) {
  const b = run(without(k), 30);
  assert.equal(b.good, 0, `${k} stopped: no good parts`);
  assert.ok(b.scrap > 10, `${k} stopped: sheets come out as scrap`);
}
const c = run(without("feed"), 30);
assert.equal(c.good + c.scrap, 0);
assert.ok(c.rate < 2, "starved line: meter falls toward zero");
// no two sheets ever closer than the gap on the conveyor
const L = newLine();
for (let t = 0; t < 40; t += 1 / 60) {
  stepLine(L, t % 12 < 6 ? ALL : without("decide"), 1 / 60);
  const xs = L.sheets.filter((s) => s.mode !== "land" && s.mode !== "push").map((s) => s.x).sort((p, q) => p - q);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= MODEL.gap - 1e-6);
}
// Battlefield view (notional numbers quoted in page.html and METHOD.md)
assert.equal(attackReach(ALL), 1);
assert.equal(attackReach(without("shape")), 0.42);
assert.equal(attackReach(without("feed")), 0.55);
assert.equal(attackReach(without("decide")), 0);
const pair = (o) => [losses(o).blue, losses(o).red];
assert.deepEqual(pair(ALL), [3, 6]);
assert.deepEqual([losses(ALL).scout, losses(ALL).attack], [1, 2]);
assert.deepEqual(pair(without("shape")), [5, 1]);
assert.deepEqual(pair(without("decide")), [1, 3]);
assert.deepEqual(pair(without("feed")), [4, 3]);
for (const o of [ALL, without("shape"), without("decide"), without("feed")]) {
  assert.deepEqual(lossesAt(o, 0), { scout: 0, attack: 0, blue: 0, red: 0 });
  const end = lossesAt(o, 1);
  assert.deepEqual([end.blue, end.red], pair(o));
  for (let b = 0; b < 1; b += 0.05) assert.ok(lossesAt(o, b).blue <= lossesAt(o, b + 0.05).blue && lossesAt(o, b).red <= lossesAt(o, b + 0.05).red);
}
assert.equal(fieldStatus(ALL, 1), "Objective seized");
assert.equal(fieldStatus(without("feed"), 1), "Sustaining stopped");
// every Battlefield readout fits the card corner (under 45 characters)
for (const o of [ALL, without("shape"), without("decide"), without("feed"), { feed: false, shape: false, decide: false }]) {
  const L = losses(o);
  assert.ok((fieldStatus(o, 1) + " · " + L.blue + " vs " + L.red + " down").length < 45);
  assert.ok((fieldStatus(o, 0) + " · regrouping").length < 45);
}
console.log("model.test: all passed");
