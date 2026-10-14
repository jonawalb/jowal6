// The infiltration model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// One force (a 22-unit block) is split into n equal elements. A screen of bars across
// the shaker tray stands for a defended line; the spaces between bars are its gaps.
// An element fits a gap if its width plus a clearance is no more than the gap.
// Elements that fit file through their gap one at a time and regroup in the collecting
// tray behind the screen; elements that fit no gap are stopped at the screen.
//
// Doctrine (FM 3-90, 2023, para 2-86) says smaller infiltrating elements "can get
// through smaller defensive gaps". The gap widths, sizes and timings below are a
// notional teaching layout, not data, and the page says so.
//
// The back end (follow-on action). Infiltration is undetected movement (para 2-82); once the
// elements have regrouped, the unit "conducts those tasks needed to accomplish its mission, which
// could be an attack, raid, ambush ..." (para 2-103). Here that task is an attack on an enemy
// position from its rear. A light beam across the tray in front of the screen stands for the
// enemy's chance of detecting the force: an element taller than the beam breaks it (in this model,
// the whole block and the four-way split do; doctrine says only that larger elements are easier to
// detect). Whether the beam was broken (surprise lost) or not (surprise held) sets the attack's
// outcome, a pure function of the split and the detection: outcome() and follow().

export const MODEL = {
  force: 22,                          // side of the whole force as one block, world units
  splits: [1, 4, 9, 16],              // the force can be split into this many equal elements
  pad: 1.2,                           // space between neighbouring elements once split
  clearance: 1,                       // an element fits a gap if width + clearance <= gap
  gaps: [6, 8, 4.5, 12, 5.6, 7.6],    // the gaps in the screen, from the far wall to the near wall
  bar: 2.6,                           // width of each bar of the screen
  wall: 30.95,                        // half the inside width of the tray (bars + gaps fill it exactly)
  screenX: 6,                         // the screen's centre line along the tray
  barDepth: 3,                        // the bars' thickness along the tray
  feedX: -58,                         // centre of the force as it is loaded
  collectX: 66,                       // centre of the regroup mark in the collecting tray
  trayX: 34,                          // where the collecting tray's lead-in ramp starts
  ramp: 4,                            // length of that ramp
  trayLift: 1.2,                      // the tray floor's height above the shaker floor
  interval: 0.5,                      // seconds between elements through one gap
  stagger: 0.1,                       // extra start delay per lane, so the lanes do not move in step
  approach: 1.0,                      // seconds from the load position to the gap
  pass: 0.45,                         // seconds to pass through the gap
  regroup: 0.9,                       // seconds from the gap to the regroup position
  beamX: -7,                          // the detection beam across the tray, in front of the screen
  beamH: 5.5,                         // its height above the shaker floor: a taller element breaks it
  // the follow-on attack (notional): seconds to reorganize at the rally point, to move to the
  // assault place behind the target, and for the assault itself
  reorg: 0.5,
  move: 0.8,
  assault: 1.6,
  shiftY: -14.6,                      // the regrouped formation's move across the collecting tray
  target: { x: 50, y: -22.4, half: 4, side: 2.6, block: 2.2, tall: 8, gun: 5, gunZ: 7.6, travel: 4.5 },  // the target (machine)
  alertDelay: 0.25,                   // seconds from the beam breaking to the target turning
  turn: 0.6,                          // seconds the target takes to turn
  flare: 5,                           // seconds an illumination flare burns (battlefield)
};

// Width of one element when the force is split into n.
export function elementWidth(n, m = MODEL) {
  return n === 1 ? m.force : m.force / Math.sqrt(n) - m.pad;
}

// Height of one element: the whole block is tall, small elements are low pellets.
export function elementHeight(n, m = MODEL) {
  return n === 1 ? 12 : Math.max(3.5, elementWidth(n, m) * 0.72);
}

// The bars and gaps across the tray, from the far wall (-wall) to the near wall (+wall).
export function screenLayout(m = MODEL) {
  const bars = [], gaps = [];
  let y = -m.wall;
  for (let i = 0; i <= m.gaps.length; i++) {
    bars.push([y, y + m.bar]);
    y += m.bar;
    if (i < m.gaps.length) {
      gaps.push({ y0: y, y1: y + m.gaps[i], width: m.gaps[i], centre: y + m.gaps[i] / 2 });
      y += m.gaps[i];
    }
  }
  return { bars, gaps, end: y };
}

// Indices of the gaps an element of a split fits through.
export function fits(n, m = MODEL) {
  const w = elementWidth(n, m);
  return m.gaps.map((g, i) => [g, i]).filter(([g]) => w + m.clearance <= g).map(([, i]) => i);
}

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// The whole run for a split: each element's load position, lane, queue place, timing
// and regroup position.
export function plan(n, m = MODEL) {
  const side = Math.round(Math.sqrt(n));
  const cell = m.force / side;
  const spread = n === 1 ? 0 : cell + 3;
  const w = elementWidth(n, m);
  const h = elementHeight(n, m);
  const lay = screenLayout(m);
  const open = fits(n, m);
  const els = [];
  for (let i = 0; i < side; i++) for (let j = 0; j < side; j++) {
    els.push({ feed: [m.feedX + (i - (side - 1) / 2) * spread, (j - (side - 1) / 2) * spread] });
  }
  const before = m.screenX - m.barDepth / 2 - w / 2;
  if (!open.length) {
    for (const e of els) Object.assign(e, { blocked: true, stop: [before - 0.3, e.feed[1]], start: 0, end: m.approach });
    return { n, w, h, side, cell, open, els, duration: m.approach, through: 0 };
  }
  // Lanes: elements in order across the tray go to the open gaps in the same order.
  const byY = [...els].sort((a, b) => a.feed[1] - b.feed[1] || b.feed[0] - a.feed[0]);
  byY.forEach((e, k) => { e.lane = Math.floor((k * open.length) / n); e.gap = open[e.lane]; });
  for (let lane = 0; lane < open.length; lane++) {
    const gy = lay.gaps[open[lane]].centre;
    const queue = els.filter((e) => e.lane === lane).sort((a, b) => b.feed[0] - a.feed[0] || Math.abs(a.feed[1] - gy) - Math.abs(b.feed[1] - gy));
    queue.forEach((e, q) => {
      e.queue = q;
      e.start = q * m.interval + lane * m.stagger;
      e.pre = [before - 4, gy];
      e.post = [m.screenX + m.barDepth / 2 + w / 2 + 4, gy];
    });
  }
  // Regroup: the first to arrive take the far column of the mark, each the nearest free place.
  const slots = [];
  for (let i = 0; i < side; i++) for (let j = 0; j < side; j++) {
    slots.push([m.collectX + (i - (side - 1) / 2) * cell, (j - (side - 1) / 2) * cell]);
  }
  const arrivals = [...els].sort((a, b) => a.start - b.start || a.lane - b.lane);
  for (const e of arrivals) {
    const far = Math.max(...slots.map((s) => s[0]));
    const column = slots.filter((s) => Math.abs(s[0] - far) < 1e-6);
    column.sort((a, b) => Math.abs(a[1] - e.post[1]) - Math.abs(b[1] - e.post[1]));
    e.slot = column[0];
    slots.splice(slots.indexOf(column[0]), 1);
    e.end = e.start + m.approach + m.pass + m.regroup;
  }
  const duration = Math.max(...els.map((e) => e.end));
  return { n, w, h, side, cell, open, els, duration, through: n };
}

const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// Where an element stands t seconds into its run, as [x, y] on the tray.
export function positionAt(e, t, m = MODEL) {
  if (e.blocked) return lerp2(e.feed, e.stop, smooth(t / m.approach));
  const s = t - e.start;
  if (s <= 0) return e.feed;
  if (s < m.approach) return lerp2(e.feed, e.pre, smooth(s / m.approach));
  if (s < m.approach + m.pass) return lerp2(e.pre, e.post, smooth((s - m.approach) / m.pass));
  return lerp2(e.post, e.slot, smooth((s - m.approach - m.pass) / m.regroup));
}

// Height of the floor under an element: the collecting tray sits on a short ramp.
export function floorAt(x, m = MODEL) {
  return m.trayLift * smooth((x - m.trayX) / m.ramp);
}

// How many elements have regrouped t seconds into the run.
export const regroupedAt = (p, t) => (p.through ? p.els.filter((e) => t >= e.end).length : 0);

// ---- Detection: the beam (machine) or the enemy's sentries (battlefield) ----

// The x of an element's leading face t seconds into its run.
const frontAt = (e, t, w, m) => positionAt(e, t, m)[0] + w / 2;

// When the force is first detected, or null. Only an element taller than the beam can break it;
// it does so when its leading face reaches the beam. Found by bisection on the element's (monotone)
// approach, so the result is exact to a microsecond and the same in Node and the page.
export function detection(p, m = MODEL) {
  if (p.h <= m.beamH) return { detected: false, at: null, el: -1 };
  let best = null, el = -1;
  p.els.forEach((e, i) => {
    const t0 = e.blocked ? 0 : e.start, t1 = e.blocked ? m.approach : e.start + m.approach + m.pass;
    if (frontAt(e, t1, p.w, m) < m.beamX) return;
    let a = t0, b = t1;
    for (let k = 0; k < 40; k++) { const c = (a + b) / 2; if (frontAt(e, c, p.w, m) >= m.beamX) b = c; else a = c; }
    if (best === null || b < best) { best = b; el = i; }
  });
  return best === null ? { detected: false, at: null, el: -1 } : { detected: true, at: best, el };
}

// ---- The follow-on attack ----

// Outcome of the follow-on attack, from the split's result and whether surprise held. Notional
// teaching values: men down on each side over the whole run (crossing plus attack), and the
// strike's yield on the machine (the share of its full travel the target is pushed).
//   stopped: the force never got through (the whole force as one group); no attack.
//   lost:    it got through but was detected on the way; the enemy is alerted and turns to face,
//            so the attack costs more and stalls.
//   held:    it got through undetected; the enemy is caught facing the wrong way.
export const OUTCOME = {
  stopped: { result: "stopped at line", blue: 5, red: 2, yield: 0, crossBlue: 5, crossRed: 2 },
  lost: { result: "attack stalled", blue: 4, red: 2, yield: 0.3, crossBlue: 1, crossRed: 0 },
  held: { result: "position taken", blue: 1, red: 6, yield: 1, crossBlue: 0, crossRed: 0 },
};
export const outcome = (through, detected) => (!through ? OUTCOME.stopped : detected ? OUTCOME.lost : OUTCOME.held);

// The whole run's schedule and result for a plan: detection, outcome, and the attack's phases.
//   reorg0  all regrouped; reorganize at the rally point
//   move0   move to the assault place behind the target
//   strike0 the assault (fire and movement on the battlefield, the strike on the machine)
//   end     the run is over (for a force stopped at the line, when the flare burns out)
export function follow(p, m = MODEL) {
  const det = detection(p, m);
  const out = outcome(p.through > 0, det.detected);
  if (!p.through) return { ...det, out, kind: "stopped", reorg0: null, move0: null, strike0: null, end: Math.max(p.duration, det.at + m.flare) };
  const reorg0 = p.duration, move0 = reorg0 + m.reorg, strike0 = move0 + m.move;
  let end = strike0 + m.assault;
  if (det.detected) end = Math.max(end, det.at + m.flare);
  return { ...det, out, kind: det.detected ? "lost" : "held", reorg0, move0, strike0, end };
}

// Machine: the regrouped formation's offset [dx, dy] and the target's pose { push, turn } at t.
// The formation slides across the collecting tray to line up behind the target, then strikes it
// from behind; the target rides a carriage that the strike pushes yield x travel toward the
// screen. If the beam was broken the target turns on its turntable to face the strike (turn 0..1)
// and drops its brake shoe onto the track, so the same strike pushes it less. Its gun sits above
// the tallest element, so the formation always meets the carriage's end.
export function strikeAt(p, f, t, m = MODEL) {
  const T = m.target;
  const turn = f.detected ? smooth((t - f.at - m.alertDelay) / m.turn) : 0;
  if (!p.through) return { dx: 0, dy: 0, push: 0, turn, hit: 0 };
  const front = Math.min(...p.els.map((e) => e.slot[0])) - p.w / 2;
  const face = T.x + T.half;
  const gap = front - face;
  const dy = m.shiftY * smooth((t - f.move0) / m.move);
  const s = smooth((t - f.strike0) / (m.assault * 0.4));
  const push = f.out.yield * T.travel;
  const dx = -(gap + push) * s;
  return { dx, dy, push: Math.max(0, -dx - gap), turn, hit: s };
}

// The card's readout on the machine. Kept under 45 characters.
export function readoutText(p, count, t = 0, f = follow(p)) {
  const seen = f.detected && t >= f.at;
  if (!p.through) return seen ? "1 element · lamp lit · surprise lost" : "1 element · 0 gaps fit · lamp dark";
  const surprise = f.detected ? "surprise lost" : "surprise kept";
  if (t >= f.strike0 + m0.assault * 0.4) return `${surprise} · strike yield ${Math.round(f.out.yield * 100)}%`;
  if (t >= f.reorg0) return `${surprise} · ${t >= f.strike0 ? "striking" : "lining up"}`;
  return `${p.n} elements · ${count}/${p.n} regrouped · ${seen ? "lamp lit" : "lamp dark"}`;
}
const m0 = MODEL;

// Battlefield: notional men down { blue, red } t seconds into the run. They grow over the run, so
// the start shows none, and end at the outcome's totals.
//   stopped: the single group is spotted short of the line and fired on: its losses and its return
//            fire's rise from the moment it is seen until the end of its approach.
//   lost:    one man is hit while his squad, seen, passes the gap; the rest fall in the assault.
//   held:    nothing on the way (no one fires at what is not seen); all losses fall in the assault.
// In the assault the enemy's losses come early when surprise held and the attackers' come early
// when it was lost.
export function losses(p, t, m = MODEL, f = follow(p, m)) {
  const o = f.out;
  if (!p.through) {
    const s = f.at === null ? 0 : Math.min(1, Math.max(0, (t - f.at) / (m.approach - f.at)));
    return { blue: Math.round(o.blue * s), red: Math.round(o.red * s) };
  }
  let blue = 0, red = 0;
  if (f.detected) blue += t >= f.at + m.pass ? o.crossBlue : 0;
  const a = Math.min(1, Math.max(0, (t - f.strike0) / m.assault));
  const early = (x) => Math.min(1, x / 0.55), late = (x) => Math.min(1, Math.max(0, (x - 0.25) / 0.75));
  blue += Math.round((o.blue - o.crossBlue) * (f.detected ? early(a) : late(a)));
  red += Math.round((o.red - o.crossRed) * (f.detected ? late(a) : early(a)));
  return { blue, red };
}

// The Battlefield readout. Kept under 46 characters.
export function fieldText(p, count, t, f = follow(p)) {
  const L = losses(p, t, MODEL, f), down = `${L.blue} vs ${L.red} down`;
  const seen = f.detected && t >= f.at;
  if (!p.through) return seen ? `surprise lost · stopped at line · ${down}` : `1 group · moving up · unseen · ${down}`;
  if (t < f.reorg0) return `${count}/${p.n} rallied · ${seen ? "seen" : "unseen"} · ${down}`;
  const surprise = f.detected ? "surprise lost" : "surprise held";
  if (t >= f.end - 1e-9 || t >= f.strike0 + MODEL.assault) return `${surprise} · ${f.out.result} · ${down}`;
  return `${surprise} · ${t >= f.strike0 ? "assaulting" : t >= f.move0 ? "closing in" : "reorganizing"} · ${down}`;
}
