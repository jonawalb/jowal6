// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/movement-techniques/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, downCounts, outpostAhead, OUTPOSTS, techniqueOf, speedShare, supportSeconds, securityShare, losses, squad, GEOM, advanceRate } from "./model.mjs";

assert.equal(techniqueOf(0), 0);
assert.equal(techniqueOf(0.33), 0);
assert.equal(techniqueOf(0.34), 1);
assert.equal(techniqueOf(0.66), 1);
assert.equal(techniqueOf(0.67), 2);
assert.equal(techniqueOf(1), 2);

// Table 3-5 order: traveling fastest ... bounding slowest; security least ... most
const pct = (x) => Math.round(x * 100);
assert.deepEqual([0, 1, 2].map((t) => pct(speedShare(t, "alternating"))), [100, 80, 40]);
assert.deepEqual([0, 1, 2].map((t) => pct(speedShare(t, "successive"))), [100, 80, 33]);
assert.ok(speedShare(2, "alternating") > speedShare(2, "successive"), "alternating is the more rapid");
assert.deepEqual([0, 1, 2].map((t) => supportSeconds(t)), [8, 4, 1]);
assert.deepEqual([0, 1, 2].map((t) => pct(securityShare(t))), [20, 60, 90]);
for (let t = 0; t < 2; t++) {
  assert.ok(speedShare(t) > speedShare(t + 1), "speed falls with technique");
  assert.ok(securityShare(t) < securityShare(t + 1), "security rises with technique");
  assert.ok(supportSeconds(t) > supportSeconds(t + 1));
}
// men down: both sides always lose someone; the lead team loses less and the enemy more the sooner the support fires
assert.deepEqual([0, 1, 2].map((t) => losses(t)), [{ blue: 3, red: 1 }, { blue: 2, red: 3 }, { blue: 1, red: 5 }]);
for (let t = 0; t < 2; t++) { assert.ok(losses(t).blue > losses(t + 1).blue); assert.ok(losses(t).red < losses(t + 1).red); }

// squad geometry: the teams never overlap their leaders, bounding keeps one team halted
const W = { t: [1, 0, 0], o: [0, 1, 0], b: [0, 0, 1] };
for (const method of ["alternating", "successive"]) {
  let halted = 0, n = 0;
  for (let s = 0; s < 400; s += 0.5) {
    const q = squad(s, W.b, method);
    n++;
    assert.ok(Number.isFinite(q.a) && Number.isFinite(q.b) && Number.isFinite(q.sl));
    // in a halt-and-bound cycle one team is always still: compare to the next sample
    const q2 = squad(s + 0.01, W.b, method);
    const da = Math.abs(q2.a - q.a), db = Math.abs(q2.b - q.b);
    if (da < 1e-3 || db < 1e-3) halted++;
    assert.ok(q.overwatch === (q.moving === "a" ? "b" : "a"));
  }
  assert.ok(halted / n > 0.98, `${method}: at least one team halted at every instant (${halted}/${n})`);
}
// traveling keeps the teams one tail apart; traveling overwatch opens them to about the trail distance
{
  const q = squad(100, W.t); assert.ok(Math.abs(q.a - q.b - GEOM.tail) < 1e-9);
  const o = squad(100, W.o); assert.ok(o.a - o.b > GEOM.trail - 10 && o.a - o.b < GEOM.trail + 10);
}
// bounding never opens the teams beyond twice a bound
for (let s = 0; s < 400; s += 0.25) { const q = squad(s, W.b, "alternating"); assert.ok(Math.abs(q.a - q.b) <= GEOM.bound * 1.001); }
assert.equal(advanceRate(W.t, "alternating", 20), 20);
assert.equal(advanceRate(W.o, "alternating", 20), 16);
assert.ok(Math.abs(advanceRate(W.b, "alternating", 20) - 8) < 1e-9);
// readout lengths
for (const t of [0, 1, 2]) {
  const L = losses(t);
  assert.ok(`Bounding overwatch · speed ${pct(speedShare(t))}% · safe ${pct(securityShare(t))}%`.length < 60);
  assert.ok(`Contact · fire in ${supportSeconds(t)} s · ${L.blue} vs ${L.red} down`.length < 45);
}
// men down appear over time and reach the losses
for (const t of [0, 1, 2]) {
  const L = losses(t);
  assert.deepEqual(downCounts(t, 0), { blue: 0, red: 0 });
  assert.deepEqual(downCounts(t, 99), L);
  let pb = 0, pr = 0;
  for (let tc = 0; tc < 20; tc += 0.1) { const d = downCounts(t, tc); assert.ok(d.blue >= pb && d.red >= pr); pb = d.blue; pr = d.red; if (tc < supportSeconds(t) + 0.7) assert.equal(d.red, 0, "the enemy loses nobody before the support fires"); }
}
assert.equal(outpostAhead(0), 0);
assert.equal(outpostAhead(79), 0);
assert.equal(outpostAhead(80), 1);
assert.equal(outpostAhead(200), 1);
assert.deepEqual(OUTPOSTS, [105, 220]);
console.log("model.test: all passed");
