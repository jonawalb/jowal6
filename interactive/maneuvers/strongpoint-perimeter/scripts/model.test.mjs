// Asserts every number the page quotes. Run: node scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, fresh, step, engage, simulate, posWeight, weights, friendDown, enemyDown, alive, gauge, compass } from "./model.mjs";

// the notional parameters the page lists
assert.equal(MODEL.pos, 6); assert.equal(MODEL.H, 90); assert.equal(MODEL.E0, 5);
assert.equal(MODEL.reserve, 1); assert.equal(MODEL.lag, 2); assert.equal(MODEL.ME, 1.5);
assert.equal(MODEL.fireF, 1.5); assert.equal(MODEL.lossG, 0.5); assert.equal(MODEL.men, 9);

// a ring: any bearing meets between 1.3 and 1.7 units of fire; a line: six on the front, none beside 90 degrees
const close = (a, b) => assert.ok(Math.abs(a - b) < 0.01, `${a} vs ${b}`);
for (let b = 0; b < 360; b += 15) { const w = weights({ layout: "P", bearing: b, main: 0 }).sum; assert.ok(w > 1.33 - 0.01 && w < 1.67 + 0.01, `ring ${b}: ${w}`); }
close(weights({ layout: "P", bearing: 0, main: 0 }).sum, 1.667); close(weights({ layout: "P", bearing: 30, main: 0 }).sum, 1.333);
close(weights({ layout: "L", bearing: 0, main: 0 }).sum, 6);
for (const b of [90, 135, 180, 225, 270]) assert.equal(weights({ layout: "L", bearing: b, main: 0 }).sum, 0);
close(weights({ layout: "L", bearing: 0, main: 1 }).extra, 1.5);
assert.equal(posWeight("P", 0, 90), 0);

// outcomes (end, notional men down: friendly / enemy)
const out = (o) => { const s = simulate(o); return [s.end, friendDown(s), enemyDown(s), +s.t.toFixed(1)]; };
const row = (layout, fort, main) => [0, 45, 90, 135, 180, 225, 270, 315].map((b) => out({ layout, fort, main, bearing: b }));
// line, hasty: holds from N, NE, NW; penetrated from E to W, the reserve alone destroyed (9 down)
let r = row("L", 0, 0);
assert.deepEqual(r.map((x) => x[0]), ["held", "held", "penetrated", "penetrated", "penetrated", "penetrated", "penetrated", "held"]);
for (const i of [2, 3, 4, 5, 6]) assert.equal(r[i][1], 9);
assert.deepEqual(r[0], ["held", 8, 45, 3.5]);
// ring, hasty: penetrated from every bearing
r = row("P", 0, 0);
assert.ok(r.every((x) => x[0] === "penetrated"));
// ring, strong point: held from every bearing, 9 to 12 men down
r = row("P", 1, 0);
assert.ok(r.every((x) => x[0] === "held" && x[1] >= 9 && x[1] <= 12 && x[2] === 45), JSON.stringify(r));
assert.deepEqual(r[3], ["held", 10, 45, 9]);
// reinforcing the likely avenue: ring, hasty, from N is held (and not from the unexpected SE)
assert.equal(out({ layout: "P", fort: 0, main: 1, bearing: 0 })[0], "held");
assert.equal(out({ layout: "P", fort: 0, main: 1, bearing: 135 })[0], "penetrated");
assert.equal(out({ layout: "P", fort: 0, main: 0, bearing: 0 })[0], "penetrated");
// line, strong point: still penetrated from the side and rear
assert.ok(row("L", 1, 0).slice(2, 7).every((x) => x[0] === "penetrated"));

// the tour's three scenes and the readout words
assert.deepEqual(out({ layout: "L", fort: 0, main: 0, bearing: 0 }).slice(0, 3), ["held", 8, 45]);
assert.deepEqual(out({ layout: "L", fort: 0, main: 0, bearing: 135 }).slice(0, 3), ["penetrated", 9, 2]);
assert.deepEqual(out({ layout: "P", fort: 1, main: 0, bearing: 135 }).slice(0, 3), ["held", 10, 45]);
assert.equal(compass(135), "SE"); assert.equal(compass(0), "N"); assert.equal(compass(345), "N");

// state sanity: ready is inert, elements go down in order, gauges
let s = fresh({ layout: "P", fort: 0, main: 0, bearing: 0 });
step(s, 1); assert.equal(s.t, 0); assert.equal(alive(s), 5);
engage(s); for (let i = 0; i < 100; i++) step(s, 0.01);
assert.ok(s.res === 0 && s.t > 0.99 && s.t < 1.01); assert.ok(gauge(s, 0) > 0.9 && gauge(s, 3) === 0);
for (let i = 0; i < 120; i++) step(s, 0.01); assert.equal(s.res, 1);
// determinism: a coarse and a fine step agree on who wins
for (const o of [{ layout: "P", fort: 1, main: 0, bearing: 135 }, { layout: "L", fort: 0, main: 0, bearing: 135 }]) {
  const a = simulate(o), b = simulate(o, { dt: 1 / 60 });
  assert.equal(a.end, b.end);
}
console.log("model.test ok");
