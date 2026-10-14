// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/recon-pull/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, LAYOUTS, plan, firstThrough, allThrough, stallAt, status, marbleAt, scoutAt, runEnd } from "./model.mjs";

const run = (mode, layout, planned = 2) => ({ mode, open: LAYOUTS[layout], planned });
const s1 = (x) => Math.round(x * 10) / 10;

// rates quoted on the page
assert.equal(MODEL.scoutSpeed, 70);
assert.equal(MODEL.divertSpeed, 120);
assert.equal(MODEL.v, 60);
assert.equal(MODEL.gap, 0.26);
assert.equal(MODEL.pushStart, 0.4);
assert.equal(s1(2 * MODEL.dip + MODEL.hold), 0.6); // time to check a held gate

// layout A: planned lane 3 open. Push gets through first; pull finds lane 2.
assert.equal(s1(firstThrough(run("push", 0))), 2.5);
assert.equal(plan(run("pull", 0)).found, 1);
assert.equal(s1(firstThrough(run("pull", 0))), 4.0);
// layout B: planned lane 3 held. Push stalls; pull finds lane 2 at the same time as in A.
assert.equal(firstThrough(run("push", 1)), Infinity);
assert.ok(Number.isFinite(stallAt(run("push", 1))));
assert.equal(s1(firstThrough(run("pull", 1))), 4.0);
assert.equal(status(run("push", 1), 9), "Push · lane 3 held · stalled");
assert.equal(status(run("pull", 1), 9), "Pull · lane 2 open · through 4.0 s");
assert.equal(status(run("push", 0), 9), "Push · lane 3 open · through 2.5 s");

// readouts stay under 45 characters
for (let l = 0; l < LAYOUTS.length; l++) for (const mode of ["push", "pull"]) for (let p = 0; p < 5; p++)
  for (let t = 0; t < 12; t += 0.37) assert.ok(status(run(mode, l, p), t).length < 45, status(run(mode, l, p), t));

// every layout has at least one gap, so pull always gets through
for (let l = 0; l < LAYOUTS.length; l++) assert.ok(Number.isFinite(firstThrough(run("pull", l))));

// marbles never overlap one another, at any time, in any run
for (let l = 0; l < LAYOUTS.length; l++) for (const mode of ["push", "pull"]) {
  const r = run(mode, l);
  const end = Math.min(12, runEnd(r) + 0.5);
  for (let t = 0; t <= end; t += 0.02) {
    const ps = Array.from({ length: MODEL.n }, (_, i) => marbleAt(r, i, t));
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const d = Math.hypot(ps[i][0] - ps[j][0], ps[i][1] - ps[j][1]);
      assert.ok(d >= 2 * MODEL.r - 0.05, `marbles ${i},${j} overlap (${d.toFixed(2)}) at t=${t.toFixed(2)} in ${mode} layout ${l}`);
    }
  }
}

// the feeler is up before any marble reaches the found gate
for (let l = 0; l < LAYOUTS.length; l++) {
  const r = run("pull", l), p = plan(r);
  const reach = p.release + 0; // marbles leave the escapement at release
  assert.ok(scoutAt(r, reach).dip === 0, `feeler still down at release, layout ${l}`);
}
console.log("model.test: all passed");

// casualties (notional): final counts for the tour runs and the readout format
{
  const { downAt, readoutOf, losses } = await import("./model.mjs");
  assert.deepEqual(downAt(run("push", 0), 20), { blue: 1, red: 1 }); // A push: lane 4 held beside lane 3
  assert.deepEqual(downAt(run("push", 1), 20), { blue: 6, red: 2 }); // B push: stalled at lane 3
  assert.deepEqual(downAt(run("pull", 1), 20), { blue: 3, red: 3 }); // B pull: lane 1 checked; lanes 1 and 3 beside lane 2
  assert.deepEqual(downAt(run("pull", 0), 20), { blue: 2, red: 2 });
  assert.deepEqual(downAt(run("push", 1), 0), { blue: 0, red: 0 });
  assert.equal(readoutOf(run("push", 1), 9), "Push · lane 3 held · stalled · 6 vs 2 down");
  assert.equal(readoutOf(run("pull", 1), 9), "Pull · lane 2 open · through 4.0 s · 3 vs 3 down");
  // both sides lose someone in every preset run with planned lane 3; no gate loses more than 2 of its 3 men
  for (let l = 0; l < LAYOUTS.length; l++) for (const mode of ["push", "pull"]) {
    const r = run(mode, l), d = downAt(r, 30);
    assert.ok(d.blue >= 1 && d.red >= 1, `both sides lose in ${mode} layout ${l}`);
    const per = {};
    for (const e of losses(r)) if (e.side === "h") per[e.lane] = (per[e.lane] || 0) + 1;
    assert.ok(Object.values(per).every((n) => n <= 2), `gate loss cap in ${mode} layout ${l}`);
    for (let t = 0; t < 12; t += 0.37) assert.ok(readoutOf(r, t).length <= 50, readoutOf(r, t));
  }
  console.log("model.test casualties: passed");
}
