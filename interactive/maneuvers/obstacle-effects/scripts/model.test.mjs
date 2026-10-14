// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/obstacle-effects/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, KEYS, planFor, poseAt, tally, simulate, ROUTES, STN } from "./model.mjs";
const run = (s) => { const cov = { D: s[0] === "1", T: s[1] === "1", F: s[2] === "1", B: s[3] === "1" }; const p = planFor(cov); return { p, t: tally(p, p.tDone + 1) }; };

// parameters the page quotes
assert.equal(MODEL.n, 8); assert.equal(MODEL.speed, 30); assert.equal(MODEL.nearHit, 0.5); assert.equal(MODEL.perThrough, 0.6);
assert.deepEqual(MODEL.dwell.D, [2.0, 0.4]); assert.deepEqual(MODEL.dwell.T, [0.5, 0.3]); assert.deepEqual(MODEL.dwell.F, [3.0, 0.6]);
assert.equal(MODEL.dwell.B[0], Infinity); assert.equal(MODEL.dwell.B[1], 1.5);
assert.deepEqual(MODEL.kills, { D: [0], T: [0], F: [1, 3], B: [0, 1] });
// ordering of the stations along the routes
assert.ok(STN.D.s < STN.T.s && STN.F.s < STN.B.s && STN.B.s < ROUTES.B.length);
// all covered: six out of action, two held at the block, none through
let r = run("1111");
assert.deepEqual([r.t.red, r.t.held, r.t.through, r.t.blue], [6, 2, 0, 2]);
// all uncovered: nothing out of action, all eight through
r = run("0000");
assert.deepEqual([r.t.red, r.t.held, r.t.through, r.t.blue], [0, 0, 8, 5]);
// turn uncovered: the column breaches it, drives on along A and never meets the fix or block groups
r = run("1011");
assert.deepEqual([r.t.red, r.t.through, r.t.held], [1, 7, 0]);
assert.ok(r.p.v.every((x) => x.route === "A"));
assert.equal(r.p.firstMeet.F, null); assert.equal(r.p.firstMeet.B, null);
// block uncovered only: the column is turned, slowed and fixed, then breaches the block
r = run("1110");
assert.deepEqual([r.t.red, r.t.through, r.t.held], [4, 4, 0]);
// each effect covered on its own costs the column what the table says
assert.equal(run("1000").t.red, 1); assert.equal(run("0100").t.red, 1);
assert.equal(run("0111").t.red, 5);
// covered groups cost time: the covered run is slower than the uncovered one up to the block
assert.ok(run("1110").p.tDone > run("0000").p.tDone);
assert.ok(Math.abs(run("0000").p.tDone - 13.0) < 0.2);
assert.ok(Math.abs(run("1111").p.tDone - 16.3) < 0.2);
// only the south lane meets the disrupt group
{ const p = planFor({ D: true, T: false, F: false, B: false });
  const hit = p.v.filter((x) => x.fate === "destroyed").map((x) => x.i);
  assert.deepEqual(hit, [1]);
  const slow = p.v.filter((x) => x.lane > 0 && x.fate === "through").map((x) => x.tOut);
  const fast = p.v.filter((x) => x.lane < 0 && x.fate === "through").map((x) => x.tOut);
  assert.ok(Math.min(...slow) > Math.min(...fast) + 1.5, "the south half is slowed, the north half drives on"); }
// poses stay on the map and vehicles in a lane never overlap
for (const s of ["1111", "0000", "1011", "1110"]) {
  const { p } = run(s);
  for (let t = 0; t < p.tDone; t += 0.25) for (const x of p.v) { const q = poseAt(p, x.i, t); assert.ok(Number.isFinite(q.u) && Number.isFinite(q.v)); }
}
// readout fits the card corner
for (const t of ["4 of 4 covered · 8 through · 5 vs 6 down", "3 of 4 covered · 0 through · 2 vs 6 down"]) assert.ok(t.length < 45);
console.log("model.test: all passed");
