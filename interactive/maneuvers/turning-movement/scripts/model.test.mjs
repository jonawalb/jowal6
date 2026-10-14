// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/turning-movement/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, S_CONTACT, S_END, G_REAR, routeAt, nearestS, phiAt, boltDrawn, guardLimit, guardWant, guardStep, braced, routePct, runTime, guardTime, losses } from "./model.mjs";

const r1 = (x) => Math.round(x * 10) / 10;

// numbers on the page
assert.equal(MODEL.trigger, 0.4);
assert.equal(MODEL.guardRate, 70);
assert.equal(MODEL.tourSpeed, 26);
assert.equal(MODEL.maxSpeed, 60);
assert.equal(MODEL.boltTravel, 10);
assert.equal(r1(guardTime()), 2.4);
assert.equal(r1(runTime(MODEL.tourSpeed)), 4.0);
assert.equal(r1(runTime(MODEL.maxSpeed)), 1.7);
assert.ok(runTime(MODEL.tourSpeed) > guardTime(), "at tour speed the guard must win");
assert.ok(runTime(MODEL.maxSpeed) < guardTime(), "flat out the carriage must win");
assert.equal(phiAt(S_END), MODEL.phiMax);
assert.equal(MODEL.phiMax, 16);
assert.equal(Math.round(boltDrawn(phiAt(S_END)) * 100), 100);
assert.equal(routePct(S_CONTACT), 100);
assert.equal(routePct(0.4 * S_CONTACT), 40);

// geometry: the lever only moves once the roller touches it, and the route is continuous
assert.equal(phiAt(S_CONTACT), 0);
assert.ok(phiAt(S_CONTACT + 1) > 0);
for (let s = 0.5; s < S_END; s += 0.5) {
  const a = routeAt(s - 0.5), b = routeAt(s);
  assert.ok(Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - 0.5) < 0.01, `route jump at ${s}`);
}
for (const s of [10, 120, 150, 178]) {
  const p = routeAt(s);
  assert.ok(Math.abs(nearestS(p.x, p.y).s - s) < 1e-6);
}
// the guard braces the lever at rest, and a thrown lever keeps it short of the brace
assert.ok(G_REAR > -172 && G_REAR < -166);
assert.ok(guardLimit(MODEL.phiMax) > G_REAR + 3);
assert.ok(braced(G_REAR, 0));
assert.equal(guardWant(true, 0.39 * S_CONTACT), 0);
assert.equal(guardWant(true, 0.41 * S_CONTACT), G_REAR);
assert.equal(guardWant(false, S_END), 0);

// the race, stepped at 60 Hz with a steady carriage speed
function race(speed) {
  let s = 0, g = 0, phi = 0;
  for (let i = 0; i < 60 * 20; i++) {
    const dt = 1 / 60;
    g = guardStep(g, guardWant(true, s), phi, dt);
    const cap = braced(g, phi) ? S_CONTACT : S_END;
    s = Math.min(s + speed * dt, cap);
    phi = phiAt(s);
    g = Math.max(g, guardLimit(phi));
  }
  return { s, g, phi };
}
const slow = race(MODEL.tourSpeed);
assert.ok(braced(slow.g, slow.phi) && slow.s === S_CONTACT, "tour speed: guard braces the lever");
const fast = race(MODEL.maxSpeed);
assert.ok(fast.phi === MODEL.phiMax && fast.g > G_REAR, "flat out: lever thrown before the guard arrives");

// notional losses (vehicles): never free; the race decides who pays more
assert.deepEqual(losses(0, 0, 0), { blue: 1, red: 1 }, "start");
assert.deepEqual(losses(slow.s, slow.g, slow.phi), { blue: 3, red: 2 }, "defender wins the race");
assert.deepEqual(losses(fast.s, fast.g, fast.phi), { blue: 2, red: 4 }, "turning force wins the race");
assert.deepEqual(losses(S_END, 0, MODEL.phiMax), { blue: 2, red: 2 }, "defender held on the ridge, crossroads seized");
for (let s = 0; s <= S_END; s += 1) for (const g of [0, G_REAR / 2, G_REAR]) {
  const c = losses(s, Math.max(g, guardLimit(phiAt(s))), phiAt(s));
  assert.ok(c.blue >= 1 && c.red >= 1 && c.blue <= 3 && c.red <= 4);
  assert.ok(`Crossroads held · bolt 100% · ${c.blue} vs ${c.red} down`.length < 45);
}
console.log("model.test: all passed");
