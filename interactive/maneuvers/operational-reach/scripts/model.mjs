// The reach model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Real statics, notional mapping: a rigid arm resting on supports tips over the
// front-most support it rests on when the moment of everything ahead of that
// support exceeds the moment of everything behind it (its centre of mass passes
// the support). Weights and lengths are bench units, not data about any force.

export const MODEL = {
  pivot: 0,          // knife edge on the home pedestal (x)
  post: 124,         // roller stand, the forward base (x)
  cw: { w: 65, x: -46 },                       // counterweight plates
  sleeve: { a: -56, b: 44, w: 0.30 },          // fixed outer sleeve, weight per unit length
  stage1: { a: -16, b: 64, w: 0.20, share: 0.5 }, // first telescoping stage, moves e * share
  stage2: { a: 4, b: 84, w: 0.14, share: 1 },     // second stage, moves e
  head: { w: 10, x: 87, len: 10 },              // the load at the tip, centre at x + e
  eMax: 90,          // full extension
};

// Tip of the arm (front face of the head) for extension e.
export const tipOf = (e, m = MODEL) => m.head.x + m.head.len / 2 + e;

// Everything on the arm as uniform pieces [a, b, weight per unit] and point loads [x, w].
export function loads(e, m = MODEL) {
  const s1 = e * m.stage1.share, s2 = e * m.stage2.share;
  return {
    pieces: [
      [m.sleeve.a, m.sleeve.b, m.sleeve.w],
      [m.stage1.a + s1, m.stage1.b + s1, m.stage1.w],
      [m.stage2.a + s2, m.stage2.b + s2, m.stage2.w],
    ],
    points: [[m.cw.x, m.cw.w], [m.head.x + e, m.head.w]],
  };
}

// Moments about a fulcrum f: ahead (tips the arm forward) and behind (holds it back).
export function moments(e, f, m = MODEL) {
  const { pieces, points } = loads(e, m);
  let ahead = 0, behind = 0;
  for (const [a, b, w] of pieces) {
    if (b > f) { const lo = Math.max(a, f); ahead += (w * ((b - f) ** 2 - (lo - f) ** 2)) / 2; }
    if (a < f) { const hi = Math.min(b, f); behind += (w * ((f - a) ** 2 - (f - hi) ** 2)) / 2; }
  }
  for (const [x, w] of points) {
    if (x > f) ahead += w * (x - f);
    else behind += w * (f - x);
  }
  return { ahead, behind, ratio: ahead / behind };
}

// Whether the second stage spans the roller stand, so the stand can carry the arm.
export function overPost(e, m = MODEL, margin = 4) {
  const s2 = e * m.stage2.share;
  return m.stage2.a + s2 <= m.post - margin && m.head.x + e + m.head.len / 2 >= m.post + margin;
}

// The support the arm tips about, and its moment ratio (tips when above 1).
export function state(e, baseSet, m = MODEL) {
  const onPost = baseSet && overPost(e, m);
  const f = onPost ? m.post : m.pivot;
  const { ratio } = moments(e, f, m);
  return { fulcrum: onPost ? "post" : "pivot", ratio, tips: ratio > 1, reach: tipOf(e, m) - m.pivot };
}

// Longest safe extension on the pivot alone (bisection on ratio = 1).
export function safeExtension(m = MODEL) {
  let lo = 0, hi = m.eMax;
  if (moments(hi, m.pivot, m).ratio <= 1) return hi;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (moments(mid, m.pivot, m).ratio > 1) hi = mid; else lo = mid;
  }
  return lo;
}

export const totalWeight = (m = MODEL) => {
  const { pieces, points } = loads(0, m);
  return pieces.reduce((s, [a, b, w]) => s + (b - a) * w, 0) + points.reduce((s, [, w]) => s + w, 0);
};

// NOTIONAL losses at the objective (Battlefield view and the losses line; not data). The lead
// battalion comes under the enemy's fire once its reach passes the home base's safe reach (about
// 141); exposure is the share of the last stretch to full reach (182) covered under fire. Supported
// (not tipping), it trades fire well; overreached (tipping), it stops firing and loses more.
// Counts are vehicles knocked out, one vehicle per company, out of the three on each side in contact.
export const LOSS = { start: 141, blueSupported: 1.2, blueOverreached: 2.4, redSupported: 2.2, redOverreached: 0.6 };
export function losses(e, baseSet, m = MODEL) {
  const reach = tipOf(e, m);
  const exposure = Math.min(1, Math.max(0, (reach - LOSS.start) / (tipOf(m.eMax, m) - LOSS.start)));
  const tips = state(e, baseSet, m).tips;
  return {
    exposure,
    blue: Math.round(exposure * (tips ? LOSS.blueOverreached : LOSS.blueSupported)),
    red: Math.round(exposure * (tips ? LOSS.redOverreached : LOSS.redSupported)),
  };
}
