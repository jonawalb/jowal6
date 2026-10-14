// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/operational-pause/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, simulate, initial, step, readout, ramAt, losses, LOSS } from "./model.mjs";

// a full tank pays for four strokes
assert.equal(1 / MODEL.perStroke, 4);
assert.equal(MODEL.cycle, 0.9);
assert.equal(MODEL.pump, 0.45);
assert.equal(MODEL.hit, 0.035);
assert.equal(MODEL.recover, 0.15);

// pausing together: 3.6 s of pushing, then about 4.4 s of halt
const tog = simulate("together", 60).trace;
const runs = [];
for (const r of tog) {
  const p = r.pushing > 0;
  if (!runs.length || runs.at(-1).p !== p) runs.push({ p, t0: r.t });
  runs.at(-1).t1 = r.t + 1 / 120;
}
assert.ok(Math.abs(runs[0].t1 - runs[0].t0 - 3.6) < 0.02, "push 3.6 s");
assert.ok(Math.abs(runs[1].t1 - runs[1].t0 - 4.44) < 0.05, "halt about 4.4 s");
// after a minute the dial swings between roughly 60% and 80%
const late = tog.filter((r) => r.t > 40).map((r) => r.enemy);
const lo = Math.round(Math.min(...late) * 100), hi = Math.round(Math.max(...late) * 100);
assert.ok(lo >= 58 && lo <= 62, `low ${lo}`);
assert.ok(hi >= 78 && hi <= 82, `high ${hi}`);

// alternating: never a moment with no ram pushing, and the dial falls to about 9% after a minute
const alt = simulate("alternate", 60).trace;
assert.equal(alt.filter((r) => r.pushing === 0).length, 0);
assert.ok(alt.every((r) => r.pushing === 1));
assert.equal(Math.round(alt.at(-1).enemy * 100), 9);

// the alternating plan breaks below about 0.28 tank/s of pump
const gaps = (pump) => simulate("alternate", 40, { ...MODEL, pump }).trace.filter((r) => r.t > 5 && r.pushing === 0).length;
assert.equal(gaps(0.28), 0);
assert.ok(gaps(0.27) > 0);
assert.ok(Math.abs(1 / (4 * MODEL.cycle) - 0.2778) < 1e-3);

// a strike lands once per stroke, at mid-stroke, where the ram is on the anvil
const S = initial("together");
let hits = 0;
for (let i = 0; i < 108; i++) hits += step(S, 1 / 120);
assert.equal(hits, 2); // both rams, first stroke, 0.9 s
assert.equal(ramAt(0.5), 1);
assert.equal(ramAt(0), 0);
// readout lengths stay under the card limit
for (const t of ["Both pushing · enemy 100%", readout(S), "A refilling · B pushing · enemy 100%", "A waiting · B refilling · enemy 100%"]) assert.ok(t.length < 45, t);
// notional losses quoted on the page (Battlefield view and the line under the card)
assert.equal(LOSS.blue, 0.1);
assert.deepEqual([losses("together").blue, losses("together").red], [4, 4]);
assert.deepEqual([losses("alternate").blue, losses("alternate").red], [2, 8]);
assert.ok(losses("alternate").blue > 0, "alternating is not free");
// a slow pump breaks the alternating plan and the enemy keeps more of its power
assert.ok(losses("alternate", 0.2).red < losses("alternate").red);
console.log("model.test: all passed");
