// The movement-techniques model. Pure: no DOM, no kit. Inlined into the page by build.mjs, so the
// figure, the readout and the tests all run this one file.
//
// Doctrine gives the three techniques, the contact word each one is "used when ... contact with enemy
// forces is not likely / possible / expected" (ATP 3-21.8, para 3-75) and only an ORDER of control,
// dispersion, speed and security (Table 3-5). Every number below is therefore notional: it keeps that
// order and nothing more, and the page says so.

export const TECH = ["traveling", "traveling overwatch", "bounding overwatch"];
export const NAMES = ["Traveling", "Traveling overwatch", "Bounding overwatch"];

export const MODEL = {
  cuts: [1 / 3, 2 / 3],     // dial: below the first cut contact is "not likely", below the second "possible", above it "expected"
  halt: 0.5,                // bounding: each halt (occupy, scan, signal) costs half of a bound's move time
  travelShare: 1,           // speed share of traveling
  overwatchShare: 0.8,      // traveling overwatch: the lead moves continuously, the trailing team varies its speed
  support: [8, 4, 1],       // seconds from contact until a team is firing in support of the lead team
  secureAt: 10,             // security share = 1 - support / secureAt
  blue: [1, 0.3],           // men down in the lead team: round(1 + 0.3 x support)
  red: [5.4, -0.5],         // enemy men down: max(1, round(5.4 - 0.5 x support))
  replay: 2.5,              // the page plays model seconds at 2.5x
};

// The technique the dial's likelihood of contact picks (0 = not likely ... 1 = expected).
export function techniqueOf(risk, m = MODEL) {
  return risk < m.cuts[0] ? 0 : risk < m.cuts[1] ? 1 : 2;
}
// Share of traveling speed. Bounding overwatch with alternating bounds: the front gains L in one bound of 2L
// plus a halt; with successive bounds it gains L in two bounds of L plus two halts (ATP 3-21.8, paras 3-83, 3-84:
// alternating is "usually more rapid", successive "easier to control and more secure ... but it is slower").
export function speedShare(tech, method = "alternating", m = MODEL) {
  if (tech === 0) return m.travelShare;
  if (tech === 1) return m.overwatchShare;
  return method === "alternating" ? 1 / (2 + m.halt) : 1 / (2 * (1 + m.halt));
}
export const supportSeconds = (tech, m = MODEL) => m.support[tech];
export const securityShare = (tech, m = MODEL) => 1 - m.support[tech] / m.secureAt;
// Men down after the contact is resolved. Both sides always lose someone.
export function losses(tech, m = MODEL) {
  const t = m.support[tech];
  return {
    blue: Math.max(1, Math.round(m.blue[0] + m.blue[1] * t)),
    red: Math.max(1, Math.round(m.red[0] + m.red[1] * t)),
  };
}

// Where the squad's two fire teams and its leader are, in route distance, for the squad's progress s.
// w: eased weights of the three techniques. Returns the route position and lateral offset of team A (lead
// at the start) and team B, the squad leader, and which team is moving (null when none).
export const GEOM = {
  tail: 34,        // traveling: team B's leader behind team A's
  trail: 60,       // traveling overwatch: the trailing team opens up to this distance
  bound: 44,       // bounding: length of one bound
  lane: 18,        // bounding: lateral offset of each team so the two can pass
};
const ease = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const stairs = (s, L, method) => {
  const k = Math.floor(s / L), f = s / L - k;
  if (method === "successive") {
    // team A bounds, then B comes up abreast; the one not moving overwatches
    const a = L * (k + ease(f / 0.5)), b = L * (k + ease((f - 0.5) / 0.5));
    const aMoves = f < 0.5;
    const hold = aMoves ? L * k : L * (k + 1);                    // the halted team's position
    return { a, b, aMoves, hold, hPrev: L * k, f: aMoves ? f / 0.5 : (f - 0.5) / 0.5 };
  }
  // alternating: the rear team passes the one that halted and becomes the new lead
  const front = L * k, even = k % 2 === 0;
  const u = ease(f / 0.82);                                       // the last 18% of each bound is the halt
  const rear = front - L + 2 * L * u;
  return { a: even ? front : rear, b: even ? rear : front, aMoves: !even, hold: front, hPrev: front - L, f: f };
};
export function squad(s, w, method = "alternating", G = GEOM) {
  const wt = w[0], wo = w[1], wb = w[2];
  // traveling: a column; traveling overwatch: B trails at a varying distance; bounding: stairs
  const aT = s, bT = s - G.tail, lT = s - G.tail * 0.5;
  const gap = G.trail + 9 * Math.sin(s / 11);
  const aO = s, bO = s - gap, lO = s - gap * 0.5;
  const st = stairs(s, G.bound, method);
  const slF = st.hPrev + (st.hold - st.hPrev) * ease(st.f / 0.4) - 7;
  const total = wt + wo + wb || 1;
  const mix = (t, o, b) => (wt * t + wo * o + wb * b) / total;
  const a = mix(aT, aO, st.a), b = mix(bT, bO, st.b), sl = mix(lT, lO, slF);
  const moving = wb > 0.5 ? (st.aMoves ? "a" : "b") : null;
  // in bounding, the team that is not moving overwatches; the lanes keep the passing teams apart
  const la = wb * -G.lane, lb = wb * G.lane;
  return { a, b, sl, la, lb, lsl: 0, moving, overwatch: wb > 0.5 ? (st.aMoves ? "b" : "a") : null, st };
}
export const advanceRate = (w, method, v0, m = MODEL) => v0 * (w[0] * speedShare(0, method, m) + w[1] * speedShare(1, method, m) + w[2] * speedShare(2, method, m)) / ((w[0] + w[1] + w[2]) || 1);

// Men down so far, `tc` seconds after contact was made under technique `tech`: the lead team's men go
// down before the support fires; the enemy's go down as the support takes effect.
export function downCounts(tech, tc, m = MODEL) {
  const L = losses(tech, m), T = m.support[tech];
  let blue = 0, red = 0;
  for (let i = 0; i < L.blue; i++) if (tc >= 0.5 + (i * (T * 0.8 + 0.3)) / L.blue) blue++;
  for (let j = 0; j < L.red; j++) if (tc >= T + 0.7 + (j * 3.6) / L.red) red++;
  return { blue, red };
}
// Route positions (route units) of the two outposts, and the one that opens fire: the first that is at
// least 25 units ahead of the squad's lead team, else the last.
export const OUTPOSTS = [105, 220];
export const outpostAhead = (lead) => { const i = OUTPOSTS.findIndex((x) => x > lead + 25); return i < 0 ? OUTPOSTS.length - 1 : i; };
