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

// The card's readout. Kept under 45 characters.
export function readoutText(p, count) {
  const name = p.n === 1 ? "1 element" : `${p.n} elements`;
  const g = p.open.length;
  if (!g) return `${name} · 0 gaps fit · stopped at line`;
  return `${name} · ${g} gap${g === 1 ? "" : "s"} fit · ${count}/${p.n} regrouped`;
}

// Battlefield view only: notional losses, men down, t seconds into the run of a split. Losses grow
// as the run goes on, so the start shows none. The whole force as one group (it fits no gap) is
// spotted and fired on short of the line: it loses up to 5 men and its return fire up to 2 of the
// enemy, both rising over the last 30% of its approach. A split force loses men in step with the share
// of elements that have regrouped, more for wider elements (one man per 4.5 units of element width,
// rounded: 2 for squads, 1 for teams or pairs), because a wider element is likelier to be seen in a
// gap; the enemy loses one sentry, silenced once half the elements are through. Teaching values.
export const LOSS = { spotAt: 0.7, group: 5, groupRed: 2, perWidth: 4.5 };
export function losses(p, t, m = MODEL, l = LOSS) {
  if (!p.through) {
    const spot = Math.min(1, Math.max(0, (t / m.approach - l.spotAt) / (1 - l.spotAt)));
    return { blue: Math.round(l.group * spot), red: Math.round(l.groupRed * spot) };
  }
  const done = regroupedAt(p, t) / p.n;
  return { blue: Math.round((done * p.w) / l.perWidth), red: Math.round(done) };
}
