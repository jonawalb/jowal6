// Checks the model numbers quoted in page.html and METHOD.md. Run: node interactive/maneuvers/interior-lines/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, wrap, beltTurn, rimPlan, hubPlan, hubAt, losses, LOSS } from "./model.mjs";

const s2 = (t) => t.toFixed(2);
const [s1] = MODEL.stations;

// geometry quoted on the page
assert.equal(MODEL.spoke, 80);
assert.equal(MODEL.rim, 100);
assert.equal(Math.round(MODEL.rim * Math.PI), 314);           // half a turn of the rim, units
assert.equal(MODEL.speed, 70);
assert.equal(MODEL.index, 360);

// hub from rest at the hub: 1.14 s straight out, up to 1.64 s with a half turn of the turntable
assert.equal(s2(hubPlan(0, s1, s1).time), "1.14");
assert.equal(s2(hubPlan(0, s1, s1 + 60).time), "1.31");
assert.equal(s2(hubPlan(0, s1, s1 + 120).time), "1.48");
assert.equal(s2(hubPlan(0, s1, s1 + 180).time), "1.64");

// rim with one carriage: up to half a turn
assert.equal(s2(rimPlan(s1, 1, s1 + 180).time), "4.49");
assert.equal(s2(rimPlan(s1, 1, s1 + 120).time), "2.99");
assert.equal(s2(rimPlan(s1, 1, s1 + 60).time), "1.50");
// two or three carriages (sitting on stations): the longest trip is a sixth of a turn
assert.equal(Math.max(...MODEL.stations.map((a) => Math.abs(beltTurn(s1, 1, a)))), 180);
assert.equal(s2(rimPlan(s1, 3, s1 + 60).time), "1.50");
assert.equal(s2(rimPlan(s1, 3, s1 + 60, 2).time), "0.75");
assert.equal(Math.max(...MODEL.stations.map((a) => Math.abs(beltTurn(s1, 3, a)))), 60);
assert.equal(Math.max(...MODEL.stations.map((a) => Math.abs(beltTurn(s1, 2, a)))), 60);
// a station where a carriage already waits costs the rim nothing
assert.equal(rimPlan(s1, 1, s1).time, 0);
// slowest the page can show: one carriage, half a turn, rim speed ×0.5
assert.equal(s2(rimPlan(s1, 1, s1 + 180, 0.5).time), "8.98");

// shortest-way belt and wrap
assert.equal(wrap(190), -170);
assert.equal(wrap(-180), 180);
assert.equal(beltTurn(15, 1, 315), -60);

// a shuttle out on another spoke must come back in first
const out = hubPlan(40, s1, s1 + 60);
assert.equal(out.inward, 40);
assert.equal(s2(out.time), s2(120 / 70 + 60 / 360));
// the plan ends at the stop on the called spoke
const end = hubAt(out, 40, s1, out.time);
assert.ok(Math.abs(end.r - 80) < 1e-9 && Math.abs(end.psi - (s1 + 60)) < 1e-9);
// same spoke, part way out: only the rest of the spoke
assert.equal(hubPlan(30, s1, s1).dist, 50);
// notional losses quoted in the Battlefield paragraph and shown under the card
assert.equal(LOSS.ready, 0.5);
assert.deepEqual(losses(hubPlan(0, s1, s1 + 180).time, rimPlan(s1, 1, s1 + 180).time), { first: "hub", blue: 1, red: 2 }); // 1.64 vs 4.49
assert.deepEqual(losses(hubPlan(0, s1, s1).time, rimPlan(s1, 3, s1 + 60).time), { first: "hub", blue: 1, red: 1 });       // 1.14 vs 1.50
assert.deepEqual(losses(hubPlan(0, s1, s1 + 60).time, rimPlan(s1, 3, s1 + 60, 2).time), { first: "rim", blue: 2, red: 1 }); // 1.31 vs 0.75
assert.deepEqual(losses(1.14, 0), { first: "rim", blue: 2, red: 1 });       // a carriage already waits at the station
assert.deepEqual(losses(1.5, 1.502), { first: "level", blue: 1, red: 1 });
console.log("model.test: all passed");
