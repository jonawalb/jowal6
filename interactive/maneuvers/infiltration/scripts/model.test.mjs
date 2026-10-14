// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/infiltration/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, elementWidth, fits, plan, screenLayout, positionAt, regroupedAt, readoutText, losses } from "./model.mjs";

const r1 = (v) => Math.round(v * 10) / 10;

// The bars and gaps fill the tray exactly.
const lay = screenLayout();
assert.ok(Math.abs(lay.end - MODEL.wall) < 1e-9, `screen ends at ${lay.end}`);
assert.equal(lay.gaps.length, 6);
assert.equal(lay.bars.length, 7);

// Element widths quoted on the page: 22, 9.8, 6.1, 4.3.
assert.deepEqual(MODEL.splits.map((n) => r1(elementWidth(n))), [22, 9.8, 6.1, 4.3]);

// Gaps each split fits (page: none, one, three, five of six).
assert.deepEqual(MODEL.splits.map((n) => fits(n).length), [0, 1, 3, 5]);
assert.deepEqual(fits(4), [3]);                 // only the 12-unit gap
assert.equal(MODEL.gaps[fits(4)[0]], 12);
assert.ok(!fits(16).includes(2));               // the 4.5-unit gap stops even the smallest

// Every element that fits a gap regroups; the whole block regroups none.
for (const n of MODEL.splits) {
  const p = plan(n);
  assert.equal(p.els.length, n);
  const done = regroupedAt(p, p.duration + 0.01);
  assert.equal(done, n === 1 ? 0 : n);
  assert.equal(regroupedAt(p, 0), 0);
}

// Elements through one gap are spaced by the interval, so they never share the gap.
for (const n of [4, 9, 16]) {
  const p = plan(n);
  for (const lane of new Set(p.els.map((e) => e.lane))) {
    const starts = p.els.filter((e) => e.lane === lane).map((e) => e.start).sort((a, b) => a - b);
    for (let i = 1; i < starts.length; i++) assert.ok(starts[i] - starts[i - 1] >= MODEL.interval - 1e-9);
  }
  // regroup places are all distinct and every element ends on its own place
  const keys = new Set(p.els.map((e) => e.slot.map((v) => v.toFixed(3)).join(",")));
  assert.equal(keys.size, n);
  for (const e of p.els) {
    const [x, y] = positionAt(e, p.duration + 1);
    assert.ok(Math.abs(x - e.slot[0]) < 1e-9 && Math.abs(y - e.slot[1]) < 1e-9);
  }
}

// The block stops against the screen.
const block = plan(1).els[0];
assert.ok(positionAt(block, 5)[0] + elementWidth(1) / 2 <= MODEL.screenX - MODEL.barDepth / 2);

// Readouts (each under 45 characters).
assert.equal(readoutText(plan(1), 0), "1 element · 0 gaps fit · stopped at line");
assert.equal(readoutText(plan(4), 4), "4 elements · 1 gap fit · 4/4 regrouped");
assert.equal(readoutText(plan(16), 7), "16 elements · 5 gaps fit · 7/16 regrouped");
for (const n of MODEL.splits) assert.ok(readoutText(plan(n), n).length <= 45);

// Notional losses: none at the start; at the end every split costs both sides something, the single
// group (spotted and stopped) most, wide squads more than teams or pairs.
for (const n of MODEL.splits) assert.deepEqual(losses(plan(n), 0), { blue: 0, red: 0 });
assert.deepEqual(losses(plan(1), plan(1).duration), { blue: 5, red: 2 });
assert.deepEqual(losses(plan(4), plan(4).duration + 0.01), { blue: 2, red: 1 });
assert.deepEqual(losses(plan(9), plan(9).duration + 0.01), { blue: 1, red: 1 });
assert.deepEqual(losses(plan(16), plan(16).duration + 0.01), { blue: 1, red: 1 });
for (const n of MODEL.splits) {
  const p = plan(n);
  let prev = { blue: 0, red: 0 };
  for (let t = 0; t <= p.duration + 0.5; t += 0.05) {
    const c = losses(p, t);
    assert.ok(c.blue >= prev.blue && c.red >= prev.red, `losses never fall during the run (n ${n}, t ${t})`);
    prev = c;
    const text = n === 1 ? `1 element · stopped at line · ${c.blue} vs ${c.red} down` : `${n} elements · ${n}/${n} rallied · ${c.blue} vs ${c.red} down`;
    assert.ok(text.length < 45, text);
  }
}

console.log("model.test: all passed");
