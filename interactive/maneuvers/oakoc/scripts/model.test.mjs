// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/oakoc/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, ASPECTS, ORDERS, GRID, NX, NY, height, keyScores, keyTerrain, fresh, setPlan, summary, downAt, aspectTiles } from "./model.mjs";

// five aspects, in the manuals' order (ATP 3-21.8 para 2-62; FM 3-90 para 3-23) and the 3-21.10 technique order
assert.equal(Object.keys(ASPECTS).length, 5);
assert.deepEqual(ORDERS.list.seq.map((k) => ASPECTS[k].name), ["Observation and fields of fire", "Avenues of approach", "Key terrain", "Obstacles", "Cover and concealment"]);
assert.deepEqual(ORDERS.tech.seq.map((k) => ASPECTS[k].name), ["Obstacles", "Avenues of approach", "Key terrain", "Observation and fields of fire", "Cover and concealment"]);
assert.deepEqual([...ORDERS.list.seq].sort(), [...ORDERS.tech.seq].sort());
// the ground as the page states it: 240 x 180 units, 4-unit cells, three rises, 30 men, 85-unit reach
assert.equal(MODEL.world.x1 - MODEL.world.x0, 240);
assert.equal(MODEL.world.y1 - MODEL.world.y0, 180);
assert.equal(MODEL.cell, 4);
assert.equal(NX, 60); assert.equal(NY, 45);
assert.deepEqual(MODEL.hills.map((h) => h.h), [2.6, 2.6, 3.2]);
assert.equal(MODEL.P0, 30); assert.equal(MODEL.Re, 85); assert.equal(MODEL.corridor, 9);
assert.ok(Math.abs(1 / MODEL.rate - 10.5) < 0.05);
// the knoll is high and not key terrain; key terrain is the hill that sees the avenues and the objective
const ks = keyScores();
assert.equal(keyTerrain().id, "H2");
assert.deepEqual(ks.map((s) => [s.id, s.score]), [["H1", 29], ["H2", 87], ["H3", 50], ["Bridge", 42]]);
assert.ok(height(MODEL.hills[2].cx, MODEL.hills[2].cy) > 5);   // the knoll is high ground, and still not the key terrain
// routes with the overlays applied (list order): the numbers on the page
const row = (o, n) => { const s = summary(setPlan(fresh(o, n))); return [s.length, s.exposed, s.down, s.halted, s.why]; };
assert.deepEqual(row("list", 0), [172, 108, 10, true, "stream"]);
assert.deepEqual(row("list", 1), [270, 0, 0, false, ""]);
assert.deepEqual(row("list", 2), [95, 28, 2, true, "stream"]);
assert.deepEqual(row("list", 3), [124, 28, 2, true, "stream"]);
assert.deepEqual(row("list", 4), [226, 58, 5, false, ""]);
assert.deepEqual(row("list", 5), [234, 51, 4, false, ""]);
// technique order differs for the first four overlays and agrees at five
assert.deepEqual(row("tech", 5), row("list", 5));
assert.deepEqual(row("tech", 1), [268, 73, 6, false, ""]);
assert.deepEqual(row("tech", 3), [220, 81, 7, false, ""]);
// obstacles known: nobody walks into the stream
for (const o of ["list", "tech"]) assert.equal(summary(setPlan(fresh(o, 5))).halted, false);
// the finished route ends on the key terrain; the walk starts at the model's own start
const st5 = setPlan(fresh("list", 5));
assert.deepEqual(st5.w.pts[0], MODEL.start);
assert.deepEqual(st5.w.pts.at(-1), [MODEL.hills[1].cx, MODEL.hills[1].cy]);
// men down grows with distance walked, never above the platoon
assert.equal(downAt(st5.w, 0), 0);
assert.equal(downAt(st5.w, st5.w.length), st5.w.down);
assert.ok(st5.w.down <= MODEL.P0);
// overlays mark something in every case
for (const k of Object.keys(ASPECTS)) assert.ok(aspectTiles(k).some((t) => t.runs.length > 0), k);
// the readout fits the card (under 45 characters) in every state
for (const o of ["list", "tech"]) for (let n = 0; n <= 5; n++) {
  const w = setPlan(fresh(o, n)).w;
  const name = n === 0 ? "No overlay" : ASPECTS[ORDERS[o].seq[n - 1]].name;
  const d = downAt(w, w.length);
  const r = `${n}/5 ${name}` + (d ? ` · ${d} down` : "");
  assert.ok(r.length < 45, `${r} is ${r.length}`);
}
console.log("model.test: all passed");
