// Checks every model number quoted in page.html and METHOD.md, and the geometry the machine relies
// on. Run: node interactive/maneuvers/encirclement/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, gapAt, thinOf, companies, inAt, LOSS, timesOf, downAt, stateAt, endOf, readoutOf } from "./model.mjs";
import { GEO, leaves, breakoutR } from "./scene.mjs";

const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;
// constants quoted on the page
assert.equal(MODEL.R0, 1.8);
assert.equal(MODEL.RF, 0.85);
assert.equal(MODEL.S, 0.75);
assert.equal(MODEL.BW, 0.7);
assert.deepEqual(MODEL.N, [4, 10]);
assert.equal(MODEL.enc, 3.2);
assert.equal(MODEL.lag, 0.4);
assert.equal(MODEL.sqAt, 2.4);
assert.equal(MODEL.sq, 3.6);
assert.equal((2 * Math.PI * MODEL.R0).toFixed(1), "11.3");
// thin for 7 or fewer, holds for 8 or more; the gaps quoted
for (let n = 4; n <= 10; n++) assert.equal(thinOf(n), n <= 7, "thin " + n);
assert.equal(gapAt(7, MODEL.R0).toFixed(2), "0.87");
assert.equal(gapAt(8, MODEL.R0).toFixed(2), "0.66");
assert.equal(gapAt(5, MODEL.R0).toFixed(2), "1.51");

// companies: bearings, direct pressure in front, arms arrive front to back, lead pair at the seam last
for (let n = 4; n <= 10; n++) {
  const cs = companies(n);
  assert.equal(cs.length, n);
  assert.equal(cs.filter((c) => c.front).length, n % 2 ? 1 : 2, "front " + n);
  assert.ok(near(cs[0].a, 180 / n) && near(cs[n - 1].a, 360 - 180 / n), "seam midway " + n);
  for (const arm of [-1, 1]) {
    const mine = cs.filter((c) => c.arm === arm).sort((x, y) => x.d - y.d);
    for (let i = 1; i < mine.length; i++) assert.ok(mine[i].at > mine[i - 1].at, "front to back " + n);
    assert.equal(mine[mine.length - 1].at, 1);
  }
  // everyone is in at linkup and the front is in from the start
  for (const c of cs) { assert.equal(inAt(c, 1), 1); if (c.front) assert.equal(inAt(c, 0), 1); }
  // tiers: neighbours never share a tier (so overlapping neighbours stack)
  for (let i = 0; i < n; i++) assert.notEqual(cs[i].tier, cs[(i + 1) % n].tier, "tiers " + n);
}

// machine geometry: leaves in one tier never touch, even at the squeeze's end (RF), with 0.5 to spare
for (let n = 4; n <= 10; n++) {
  const L = leaves({ p: 1, sq: 1 }, n);
  for (const a of L) for (const b of L) {
    if (a.i >= b.i || a.tier !== b.tier) continue;
    const dw = (Math.abs(a.w - b.w) % 360);
    const sep = Math.min(dw, 360 - dw) * Math.PI / 180 * GEO.RF;
    assert.ok(sep >= GEO.S + 0.5, `tier collision n=${n} ${a.i},${b.i}`);
  }
  // a neighbour's leaf end never reaches the next leaf's upright (half-width 4)
  const step = (2 * Math.PI * GEO.RF) / n;
  assert.ok(step - GEO.S / 2 >= 4 + 0.5, "upright clearance " + n);
}
// the breakout block passes between the two seam leaves exactly when the ring is thin
const H = GEO.BW / 2;
for (let n = 4; n <= 10; n++) {
  const half = (360 / n / 2) * Math.PI / 180;           // seam leaf centre bearing from the seam
  const leafHalf = (GEO.S / GEO.R0) / 2;                 // half the leaf's angular span at R0
  const gapHalf = half - leafHalf;                       // half the angular gap
  // at the leaves' inner face the gap's half-width (chord) against the block's half-width
  const chordHalf = (GEO.R0 - GEO.T) * Math.sin(gapHalf);
  assert.equal(chordHalf > H, thinOf(n), "passes " + n);
  if (!thinOf(n)) {
    // stopped: the block's front corners lie on the leaves' inner face at STOP + 6
    assert.ok(Math.atan(H / (GEO.STOP + 6)) > gapHalf, "corners meet leaves " + n);
    assert.ok(near(Math.hypot(GEO.STOP + 6, H), GEO.R0 - GEO.T, 0.1));
  } else {
    // through: carriages (half-width 5, out to R0 + T + 10) clear the block's sides
    assert.ok((GEO.R0 + GEO.T + 10) * Math.sin(half) - 5 > H, "carriage clearance " + n);
  }
}
assert.equal(breakoutR({ out: 0 }), GEO.SEAT);
assert.equal(breakoutR({ out: 1, thin: true }), GEO.CLEAR);
assert.equal(breakoutR({ out: 1, thin: false }), GEO.STOP);
// the hub and enemy blocks stay inside the leaves at RF
assert.ok(GEO.HUB < GEO.RF - GEO.T && 22 < GEO.RF - GEO.T);

// clock
const T = timesOf();
assert.equal(T.link, 3.2);
assert.ok(near(T.sq0, 5.6) && near(T.sq1, 9.2));
assert.ok(near(endOf(), 10.4));
assert.equal(stateAt(T.link, 8).phase, "linked");
assert.equal(stateAt(T.sq1, 8).phase, "done");
assert.ok(near(stateAt(T.sq1, 8).r, MODEL.RF));

// casualties (notional): constants, both sides always lose, finals quoted on the page
assert.deepEqual(LOSS, { contact: [1, 1], breach: [2, 1], stopped: [1, 2], escaped: 2, squeeze: 1, enemy: 10 });
assert.deepEqual(downAt(T.end, 5), { blue: 4, red: 4, escaped: 2, surrendered: 4 });
assert.deepEqual(downAt(T.end, 8), { blue: 3, red: 6, escaped: 0, surrendered: 4 });
for (let n = 4; n <= 10; n++) {
  const c = downAt(T.end, n);
  assert.ok(c.blue >= 1 && c.red >= 1);
  assert.equal(c.red + c.escaped + c.surrendered, LOSS.enemy);
  assert.deepEqual(downAt(-1, n), { blue: 0, red: 0, escaped: 0, surrendered: 0 });
  // counts never fall
  let pb = 0, pr = 0;
  for (let t = 0; t <= T.end; t += 0.05) { const d = downAt(t, n); assert.ok(d.blue >= pb && d.red >= pr); pb = d.blue; pr = d.red; }
}

// readouts quoted on the page, all under 45 characters
assert.equal(readoutOf(stateAt(-1, 8), 8), "8 companies · gaps 0.66 km at linkup");
assert.equal(readoutOf(stateAt(T.hit + 0.01, 5), 5), "Breakout gets through · 3 vs 2 down");
assert.equal(readoutOf(stateAt(T.hit + 0.01, 8), 8), "Breakout stopped · 2 vs 3 down");
assert.equal(readoutOf(stateAt(T.end, 5), 5), "Part got out · rest surrender · 4 vs 4 down");
assert.equal(readoutOf(stateAt(T.end, 8), 8), "Pocket surrenders · 3 vs 6 down");
assert.equal(readoutOf(stateAt(2.2, 5), 5), "Arms closing · ring 60% · 0 vs 0 down");
assert.equal(readoutOf(stateAt(T.link + 0.1, 8), 8), "Ring closed · gaps 0.66 km · 1 vs 1 down");
assert.equal(readoutOf(stateAt(7.5, 8), 8), "Squeeze · ring 8.1 km · 3 vs 5 down");
for (let n = 4; n <= 10; n++) for (let t = -1; t <= T.end; t += 0.05) {
  const r = readoutOf(stateAt(t, n), n);
  assert.ok(r.length < 45, r);
}
console.log("model.test: all passed");
