// Checks the model numbers quoted in page.html and METHOD.md.
// Run: node interactive/maneuvers/infiltration/scripts/model.test.mjs
import assert from "node:assert/strict";
import { MODEL, elementWidth, elementHeight, fits, plan, screenLayout, positionAt, regroupedAt, readoutText, losses, detection, outcome, follow, strikeAt, fieldText, OUTCOME } from "./model.mjs";

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

// ---- Detection and the follow-on attack ----

// Only elements taller than the beam break it: the block and the four-way split.
assert.deepEqual(MODEL.splits.map((n) => elementHeight(n) > MODEL.beamH), [true, true, false, false]);
assert.deepEqual(MODEL.splits.map((n) => detection(plan(n)).detected), [true, true, false, false]);
// the gun clears the tallest element that can meet it
assert.ok(MODEL.target.gunZ > elementHeight(4) + 0.3);
// the block breaks the beam at about 70% of its approach (the battlefield's spotting point)
const d1 = detection(plan(1));
assert.ok(d1.at > 0.65 && d1.at < 0.75, `block detected at ${d1.at}`);
// at the moment of detection the detecting element's leading face is at the beam
{
  const p = plan(4), d = detection(p), e = p.els[d.el];
  assert.ok(Math.abs(positionAt(e, d.at)[0] + p.w / 2 - MODEL.beamX) < 1e-6);
  for (const x of p.els) for (let t = 0; t < d.at; t += 0.01) assert.ok(positionAt(x, t)[0] + p.w / 2 < MODEL.beamX + 1e-9, "nothing breaks the beam earlier");
}

// The outcome is a pure function of (got through, detected), and of nothing else.
assert.equal(outcome(false, true), OUTCOME.stopped);
assert.equal(outcome(true, true), OUTCOME.lost);
assert.equal(outcome(true, false), OUTCOME.held);
assert.deepEqual(MODEL.splits.map((n) => follow(plan(n)).kind), ["stopped", "lost", "held", "held"]);
for (const n of MODEL.splits) {
  const p = plan(n), f = follow(p);
  assert.equal(f.out, outcome(p.through > 0, detection(p).detected));
  assert.deepEqual(follow(plan(n)), f, "follow is deterministic");
}
// surprise held: losses favour the attacker; lost: they favour the defender
assert.ok(OUTCOME.held.red > OUTCOME.held.blue && OUTCOME.lost.blue > OUTCOME.lost.red);
assert.ok(OUTCOME.held.yield > OUTCOME.lost.yield && OUTCOME.stopped.yield === 0);

// Losses: none at the start, never fall, end at the outcome's totals.
for (const n of MODEL.splits) {
  const p = plan(n), f = follow(p);
  assert.deepEqual(losses(p, 0), { blue: 0, red: 0 });
  let prev = { blue: 0, red: 0 };
  for (let t = 0; t <= f.end + 0.5; t += 0.02) {
    const c = losses(p, t);
    assert.ok(c.blue >= prev.blue && c.red >= prev.red, `losses never fall (n ${n}, t ${t})`);
    prev = c;
  }
  assert.deepEqual(losses(p, f.end), { blue: f.out.blue, red: f.out.red });
}
// undetected: nobody is hit on the way in
for (const n of [9, 16]) { const p = plan(n), f = follow(p); assert.deepEqual(losses(p, f.reorg0), { blue: 0, red: 0 }); }
assert.deepEqual(losses(plan(1), follow(plan(1)).end), { blue: 5, red: 2 });
assert.deepEqual(losses(plan(4), follow(plan(4)).end), { blue: 4, red: 2 });
assert.deepEqual(losses(plan(16), follow(plan(16)).end), { blue: 1, red: 6 });

// Machine strike: the formation lines up behind the target and pushes it yield x travel; it never
// passes through the target, and the target turns only when the beam was broken.
for (const n of [4, 9, 16]) {
  const p = plan(n), f = follow(p), T = MODEL.target;
  const s0 = strikeAt(p, f, f.reorg0 - 0.01), s1 = strikeAt(p, f, f.end);
  assert.deepEqual([s0.dx, s0.dy, s0.push].map((v) => v + 0), [0, 0, 0]);
  assert.ok(Math.abs(s1.push - f.out.yield * T.travel) < 1e-9);
  assert.equal(s1.turn, f.detected ? 1 : 0);
  const front0 = Math.min(...p.els.map((e) => e.slot[0])) - p.w / 2;
  for (let t = f.reorg0; t <= f.end; t += 0.01) {
    const s = strikeAt(p, f, t);
    const face = T.x - s.push + T.half;
    assert.ok(front0 + s.dx >= face - 1e-9, `formation stays behind the target face (n ${n}, t ${t})`);
  }
  // after the shift the formation spans the target's width and stays inside the collecting tray
  const ys = p.els.map((e) => e.slot[1] + MODEL.shiftY);
  assert.ok(Math.min(...ys) - p.w / 2 >= -25.5 && Math.min(...ys) - p.w / 2 <= T.y - 2.4);
}

// No element's path through the run touches the target carriage, its snout or the beam housings.
for (const n of MODEL.splits) {
  const p = plan(n), T = MODEL.target;
  const boxes = [
    [T.x - T.half - 0.5, T.x + T.half + 0.5, -25.5, T.y + (detection(p).detected ? 3.4 : T.side) + 0.3],  // carriage (and the block as it turns)
    [T.x - T.half - 1.6, T.x, T.y - 1.3, T.y + 1.3],                      // the brake shoe
    [MODEL.beamX - 2.5, MODEL.beamX + 2.5, -31, -28.4], [MODEL.beamX - 2.5, MODEL.beamX + 2.5, 28.4, 31],  // beam housings
  ];
  for (const e of p.els) for (let t = 0; t <= p.duration; t += 0.01) {
    const [x, y] = positionAt(e, t), h = p.w / 2;
    for (const [x0, x1, y0, y1] of boxes) assert.ok(x + h < x0 || x - h > x1 || y + h < y0 || y - h > y1, `n ${n} element meets a part at t ${t.toFixed(2)} (${x.toFixed(1)}, ${y.toFixed(1)})`);
  }
}

// Readouts (each under 46 characters).
assert.equal(readoutText(plan(1), 0, 0), "1 element · 0 gaps fit · lamp dark");
assert.equal(readoutText(plan(1), 0, 1), "1 element · lamp lit · surprise lost");
assert.equal(readoutText(plan(16), 7, 3), "16 elements · 7/16 regrouped · lamp dark");
assert.equal(readoutText(plan(4), 4, follow(plan(4)).end), "surprise lost · strike yield 30%");
assert.equal(readoutText(plan(9), 9, follow(plan(9)).end), "surprise kept · strike yield 100%");
assert.equal(fieldText(plan(16), 16, follow(plan(16)).end), "surprise held · position taken · 1 vs 6 down");
assert.equal(fieldText(plan(4), 4, follow(plan(4)).end), "surprise lost · attack stalled · 4 vs 2 down");
assert.equal(fieldText(plan(1), 0, follow(plan(1)).end), "surprise lost · stopped at line · 5 vs 2 down");
for (const n of MODEL.splits) {
  const p = plan(n), f = follow(p);
  for (let t = 0; t <= f.end + 0.2; t += 0.05) {
    const c = regroupedAt(p, t);
    for (const s of [readoutText(p, c, t, f), fieldText(p, c, t, f)]) assert.ok(s.length <= 46, s);
  }
}

console.log("model.test: all passed");
