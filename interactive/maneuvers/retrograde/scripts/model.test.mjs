// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/retrograde/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, MODES, TECHS, hold, holdAlt, duration, runAt, hoursPerKm, readoutOf, delayPlan, casualties, lossTimes } from "./model.mjs";

const r2 = (x) => Math.round(x * 100) / 100;
// rates quoted on the page
assert.equal(hold(3), 2);
assert.equal(MODEL.holdK, 6);
assert.equal(MODEL.vContact, 4);
assert.deepEqual(MODEL.positions, [0, 6, 12, 18]);
assert.equal(MODEL.depth, 24);
assert.equal(duration("delay", 3), 14);
assert.equal(r2(hoursPerKm("delay", 3)), 0.58);
assert.equal(duration("delay", 2), 18);
assert.equal(r2(hoursPerKm("delay", 2)), 0.75);
assert.equal(duration("delay", 6), 10);
assert.equal(r2(hoursPerKm("delay", 6)), 0.42);
assert.equal(MODEL.vWithdraw, 12);
assert.equal(MODEL.vEnemy, 8);
assert.equal(duration("withdraw", 3), 3);
assert.equal(r2(hoursPerKm("withdraw", 3)), 0.13);
assert.equal(MODEL.vRetire, 10);
assert.equal(MODEL.hoursPerSecond, 1.6);
assert.equal(hoursPerKm("retire", 3), null);
// "more than four times the time of the withdrawal for the same ground"
assert.ok(hoursPerKm("delay", 3) / hoursPerKm("withdraw", 3) > 4);
// the clock face is 24 hours: every delay in the slider's range fits on it
assert.ok(duration("delay", MODEL.ratio.min) <= 24);

// the plan is continuous and holds at every position
const plan = delayPlan(3);
for (let i = 1; i < plan.length; i++) assert.equal(plan[i].t0, plan[i - 1].t1);
assert.equal(plan.filter((s) => s.kind === "hold").length, MODEL.positions.length);
// in a delay the enemy is always in contact; ground given never runs backward
for (const r of [2, 3, 4.5, 6]) {
  let last = -1;
  for (let t = 0; t <= duration("delay", r); t += 0.05) {
    const s = runAt("delay", r, t);
    assert.equal(s.a, s.d);
    assert.ok(s.d >= last - 1e-9);
    last = s.d;
  }
}
// a withdrawing force outruns the enemy; a retiring one has no enemy in contact
assert.ok(runAt("withdraw", 3, 1).d > runAt("withdraw", 3, 1).a);
assert.equal(runAt("retire", 3, 1).a, null);
// the readout always fits its corner (under 45 characters)
for (const tech of TECHS) for (const m of MODES) for (const r of [2, 2.5, 3, 4.5, 6]) for (let f = 0; f <= 1.0001; f += 0.01) {
  const text = readoutOf(m, r, runAt(m, r, f * duration(m, r, tech), tech));
  assert.ok(text.length < 45, text);
}
assert.equal(readoutOf("delay", 3, runAt("delay", 3, 5)), "Hold 2 · 5.0 h · 0.83 h/km · 1 vs 3 down");

// ---- alternating positions (added with the Battlefield view) ----
assert.equal(holdAlt(3), 1);
assert.equal(duration("delay", 3, "alternating"), 10);
assert.equal(r2(hoursPerKm("delay", 3, "alternating")), 0.42);
assert.equal(duration("delay", 2, "alternating"), 12);
assert.equal(r2(hoursPerKm("delay", 2, "alternating")), 0.5);
assert.equal(duration("delay", 6, "alternating"), 8);
assert.equal(r2(hoursPerKm("delay", 6, "alternating")), 0.33);
// the subsequent technique buys more time at every ratio; the technique changes nothing outside a delay
for (const r of [2, 3, 4.5, 6]) assert.ok(duration("delay", r) > duration("delay", r, "alternating"));
assert.equal(duration("withdraw", 3, "alternating"), 3);
// alternating: the elements alternate, B starts set on the next position, the passing element
// reaches its next position before the enemy reaches the one it passed, and they never share a position
{
  const plan = delayPlan(3, "alternating");
  assert.deepEqual(plan.filter((s) => s.kind === "hold").map((s) => s.el), ["A", "B", "A", "B"]);
  assert.equal(runAt("delay", 3, 0, "alternating").B.d, 6);
  for (const s of plan.filter((s) => s.kind === "gap")) assert.ok((s.to - s.from) / MODEL.vWithdraw <= s.t1 - s.t0);
  for (let t = 0; t <= 10; t += 0.05) {
    const s = runAt("delay", 3, t, "alternating");
    assert.equal(s.a, s.d);
    if (!s.A.moving && !s.B.moving && s.B.d < 24) assert.notEqual(s.A.d, s.B.d);
    // the element in contact stands where the enemy is headed: at or behind the ground the enemy holds
    assert.ok(s[s.el].d >= s.a - 1e-9);
  }
  assert.deepEqual([runAt("delay", 3, 10, "alternating").A.d, runAt("delay", 3, 10, "alternating").B.d], [24, 24]);
}

// ---- notional casualties: vehicles down, friendly vs enemy ----
const end = (mode, r, tech) => casualties(mode, r, duration(mode, r, tech), tech);
assert.deepEqual(end("delay", 3, "subsequent"), { f: 3, e: 7 });
assert.deepEqual(end("delay", 3, "alternating"), { f: 1, e: 3 });
assert.deepEqual(end("delay", 2, "subsequent"), { f: 3, e: 9 });
assert.deepEqual(end("delay", 2, "alternating"), { f: 1, e: 4 });
assert.deepEqual(end("delay", 6, "subsequent"), { f: 3, e: 4 });
assert.deepEqual(end("delay", 6, "alternating"), { f: 2, e: 2 });
assert.deepEqual(end("withdraw", 3, "subsequent"), { f: 1, e: 1 });
assert.deepEqual(end("retire", 3, "subsequent"), { f: 0, e: 0 });
// both sides lose vehicles in every run in contact; the alternating technique costs fewer friendly vehicles
for (const r of [2, 3, 4.5, 6]) {
  for (const tech of TECHS) { const c = end("delay", r, tech); assert.ok(c.f > 0 && c.e > 0); }
  assert.ok(end("delay", r, "alternating").f < end("delay", r, "subsequent").f);
}
// loss times agree with the counts, and counts never fall
for (const tech of TECHS) for (const mode of ["delay", "withdraw"]) for (const r of [2, 3, 6]) {
  const lt = lossTimes(mode, r, tech), c = end(mode, r, tech);
  assert.equal(lt.f.length, c.f); assert.equal(lt.e.length, c.e);
  for (const x of lt.f) assert.equal(casualties(mode, r, x.t + 1e-6, tech).f >= lt.f.indexOf(x) + 1, true);
  let lf = 0, le = 0;
  for (let t = 0; t <= duration(mode, r, tech); t += 0.05) { const k = casualties(mode, r, t, tech); assert.ok(k.f >= lf && k.e >= le); lf = k.f; le = k.e; }
}
console.log("model.test: all passed");
