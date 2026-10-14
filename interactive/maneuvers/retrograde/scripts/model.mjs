// The retrograde model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file. The Battlefield
// view (field-scene.mjs) reads the same state: it speaks in km and hours only.
//
// Notional, not doctrine. A delaying force holds a series of positions in depth.
// At each one it stays until the enemy has deployed enough to threaten a decisive
// engagement, then displaces to the next. The hold time falls as the enemy's
// combat-power ratio rises. Two techniques (FM 3-90, 11-19 and 11-20):
//   subsequent:  the whole force holds each position, then falls back to the next in
//                contact, giving ground only as fast as contact allows;
//   alternating: the force is split into two elements, A and B, in depth. One holds
//                while the other is already set on the next position; when the first
//                disengages it passes back around the second to the position after,
//                out of contact, while the enemy closes on the second. Each element has
//                half the force's combat power, so it holds half as long.
// A withdrawal breaks contact and runs; a retirement starts out of contact. Every rate
// here, and every casualty rate, is a teaching number, stated as such on the page.

export const MODEL = {
  positions: [0, 6, 12, 18], // delay positions, km of ground behind the first one
  depth: 24,                 // rear of the assigned area, km
  holdK: 6,                  // hours held at each position against a 1:1 enemy; hold = holdK / ratio
  ratio: { min: 2, max: 6, start: 3 }, // enemy : delaying force combat power
  vContact: 4,               // km/h ground given between positions while in contact (and the enemy's
                             // rate closing on a set position in the alternating technique)
  vWithdraw: 12,             // km/h of a force (or element) moving back out of contact
  vEnemy: 8,                 // km/h of the enemy closing behind a force that has broken contact
  vRetire: 10,               // km/h of a force retiring out of contact
  lift: 0.4,                 // km over which the pawl is lifted after leaving a position
  dashLoad: 0.35,            // share of the displacement threshold needed to keep the dashpot moving
  hoursPerSecond: 1.6,       // figure time: model hours per second on screen
  // Notional losses, vehicles per hour of the phase (friendly f, enemy e). "× r": scales with the ratio.
  loss: {
    holdF: 0.06,   // × r: a delaying element holding a position
    holdE: 0.6,    // × share of the force firing (1 subsequent, 0.5 alternating)
    moveF: 0.3,    // subsequent: falling back in contact
    moveE: 0.3,
    gapF: 0.03,    // × r alternating: the set element engaged by the enemy closing on it
    gapE: 0.3,     // alternating: the enemy closing under the set element's fire
    breakH: 0.5,   // withdrawal: hours to break contact
    breakF: 2.4,   // per hour while breaking contact
    breakE: 2.0,
  },
};

export const MODES = ["delay", "withdraw", "retire"];
export const MODE_NAMES = { delay: "Delay", withdraw: "Withdrawal", retire: "Retirement" };
export const TECHS = ["subsequent", "alternating"];
export const TECH_NAMES = { subsequent: "Subsequent positions", alternating: "Alternating positions" };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Hours held at each position against an enemy with combat-power ratio r (by the whole force).
export const hold = (r, m = MODEL) => m.holdK / r;
// Hours one element of two holds a position in the alternating technique: half the combat power.
export const holdAlt = (r, m = MODEL) => m.holdK / (2 * r);

// The delay as a list of segments. Each has t0, t1 (hours), x0, x1 (the ground the enemy holds
// at its start and end, km), n (position number), el (the element in contact: "AB", "A" or "B"),
// and the loss rates f, e (vehicles per hour). Alternating gaps also carry the passing element
// (pass), where it starts (from) and the position it falls back to (to).
export function delayPlan(r, tech = "subsequent", m = MODEL) {
  const segs = [];
  const L = m.loss;
  let t = 0;
  const ps = m.positions;
  for (let i = 0; i < ps.length; i++) {
    const x0 = ps[i];
    const x1 = i + 1 < ps.length ? ps[i + 1] : m.depth;
    const mv = (x1 - x0) / m.vContact;
    if (tech === "alternating") {
      const el = i % 2 ? "B" : "A", other = i % 2 ? "A" : "B";
      const h = holdAlt(r, m);
      segs.push({ kind: "hold", t0: t, t1: t + h, x0, x1: x0, n: i + 1, el, f: L.holdF * r, e: L.holdE * 0.5 });
      t += h;
      const to = i + 2 < ps.length ? ps[i + 2] : m.depth;
      segs.push({ kind: "gap", t0: t, t1: t + mv, x0, x1, n: i + 2, el: other, pass: el, from: x0, to, f: L.gapF * r, e: L.gapE });
      t += mv;
    } else {
      const h = hold(r, m);
      segs.push({ kind: "hold", t0: t, t1: t + h, x0, x1: x0, n: i + 1, el: "AB", f: L.holdF * r, e: L.holdE });
      t += h;
      segs.push({ kind: "move", t0: t, t1: t + mv, x0, x1, n: i + 1, el: "AB", f: L.moveF, e: L.moveE });
      t += mv;
    }
  }
  return segs;
}

// Hours a run lasts: until the enemy holds the rear of the area, or for a retirement
// until the force arrives there.
export function duration(mode, r, tech = "subsequent", m = MODEL) {
  if (mode === "delay") { const p = delayPlan(r, tech, m); return p[p.length - 1].t1; }
  if (mode === "withdraw") return m.depth / m.vEnemy;
  return m.depth / m.vRetire;
}

// Loss segments for any mode: [{ t0, t1, f, e, el }].
function lossPlan(mode, r, tech, m) {
  if (mode === "delay") return delayPlan(r, tech, m);
  if (mode === "withdraw") return [{ t0: 0, t1: m.loss.breakH, f: m.loss.breakF, e: m.loss.breakE, el: "AB" }];
  return [];
}
// Expected vehicles lost by each side by hour t (not rounded).
function lossesAt(mode, r, t, tech, m) {
  let f = 0, e = 0;
  for (const s of lossPlan(mode, r, tech, m)) {
    const h = clamp(t, s.t0, s.t1) - s.t0;
    f += s.f * h; e += s.e * h;
  }
  return { f, e };
}
// Vehicles down by hour t, friendly f and enemy e: the expectation rounded (notional).
export function casualties(mode, r, t, tech = "subsequent", m = MODEL) {
  const x = lossesAt(mode, r, t, tech, m);
  return { f: Math.round(x.f + 1e-9), e: Math.round(x.e + 1e-9) };
}
// When each loss happens: the hour the expectation crosses k - 0.5, and the element in contact.
export function lossTimes(mode, r, tech = "subsequent", m = MODEL) {
  const out = { f: [], e: [] };
  for (const side of ["f", "e"]) {
    let acc = 0, k = 1;
    for (const s of lossPlan(mode, r, tech, m)) {
      const rate = s[side], end = acc + rate * (s.t1 - s.t0);
      while (rate > 0 && k - 0.5 <= end + 1e-9) { out[side].push({ t: s.t0 + (k - 0.5 - acc) / rate, el: s.el }); k++; }
      acc = end;
    }
  }
  return out;
}

// Where each element of the alternating delay stands at hour t, km of ground behind the first
// position, and whether it is moving back.
function elementsAt(plan, t, m) {
  const pos = { A: 0, B: m.positions[1] }, moving = { A: false, B: false };
  const from = { A: 0, B: m.positions[1] }, to = { A: 0, B: m.positions[1] };
  for (const s of plan) {
    if (s.kind !== "gap" || t < s.t0) continue;
    const p = Math.min(s.to, s.from + m.vWithdraw * (t - s.t0));
    pos[s.pass] = p; from[s.pass] = s.from; to[s.pass] = s.to;
    moving[s.pass] = t < s.t1 && p < s.to;
  }
  return { pos, moving, from, to };
}

// The state of a run t hours after it starts.
//   d: ground the friendly force has given, km     a: ground the enemy has taken, km (null: no enemy in contact)
//   pressure: 0..1 of the displacement threshold   lifted: pawl up   phase: what the readout calls it
//   A, B: the two elements (km, pawl lifted, moving)   kind, f: the delay segment and progress through it
//   el: the element in contact   cas: vehicles down, friendly f and enemy e
export function runAt(mode, r, t, tech = "subsequent", m = MODEL) {
  const T = duration(mode, r, tech, m);
  t = clamp(t, 0, T);
  const cas = casualties(mode, r, t, tech, m);
  const pair = (d, lifted, moving) => ({ A: { d, lifted, moving }, B: { d, lifted, moving } });
  if (mode === "delay") {
    const plan = delayPlan(r, tech, m);
    let s = plan[plan.length - 1];
    for (const seg of plan) if (t <= seg.t1) { s = seg; break; }
    const f = s.t1 > s.t0 ? (t - s.t0) / (s.t1 - s.t0) : 1;
    const base = { t, tech, kind: s.kind, f, el: s.el, contact: true, cas };
    if (tech === "alternating") {
      const E = elementsAt(plan, t, m);
      const el = (k) => ({ d: E.pos[k], lifted: E.moving[k], moving: E.moving[k], from: E.from[k], to: E.to[k] });
      const els = { A: el("A"), B: el("B") };
      if (t >= T) return { ...base, ...els, d: m.depth, a: m.depth, pressure: 0, lifted: false, phase: "Delay complete", n: m.positions.length, kind: "done" };
      if (s.kind === "hold") return { ...base, ...els, d: s.x0, a: s.x0, pressure: f, lifted: false, phase: "Holding position " + s.n, n: s.n };
      const a = s.x0 + (s.x1 - s.x0) * f;
      return { ...base, ...els, d: a, a, pressure: 0, lifted: false, phase: "Passing back", n: s.n };
    }
    if (t >= T) return { ...base, ...pair(m.depth, false, false), d: m.depth, a: m.depth, pressure: 0, lifted: false, phase: "Delay complete", n: plan.length / 2, kind: "done" };
    if (s.kind === "hold") return { ...base, ...pair(s.x0, false, false), d: s.x0, a: s.x0, pressure: f, lifted: false, phase: "Holding position " + s.n, n: s.n };
    const d = s.x0 + (s.x1 - s.x0) * f;
    const lifted = d - s.x0 < m.lift;
    return { ...base, ...pair(d, lifted, true), d, a: d, pressure: m.dashLoad, lifted, phase: "Falling back", n: s.n };
  }
  if (mode === "withdraw") {
    const d = Math.min(m.depth, m.vWithdraw * t);
    const a = Math.min(m.depth, m.vEnemy * t);
    return { t, tech, d, a, ...pair(d, d < m.depth, d < m.depth), pressure: 0, lifted: d < m.depth, contact: t < m.loss.breakH, phase: d < m.depth ? "Withdrawing" : "Withdrawn", n: 0, kind: "withdraw", f: t / T, el: "AB", cas };
  }
  const d = Math.min(m.depth, m.vRetire * t);
  return { t, tech, d, a: null, ...pair(d, d < m.depth, d < m.depth), pressure: 0, lifted: d < m.depth, contact: false, phase: d < m.depth ? "Retiring" : "Retired", n: 0, kind: "retire", f: t / T, el: "AB", cas };
}

// Hours the enemy spends per km of ground it takes, over a whole run (null for a retirement).
export function hoursPerKm(mode, r, tech = "subsequent", m = MODEL) {
  if (mode === "retire") return null;
  return duration(mode, r, tech, m) / m.depth;
}

// The readout line, under 45 characters: what is happening, hours since contact, hours the enemy
// has spent per km taken, and vehicles down (friendly vs enemy, notional).
export function readoutOf(mode, r, s, m = MODEL) {
  const h = s.t.toFixed(1) + " h";
  if (mode === "retire") return (s.d < m.depth ? "Retiring" : "Retired") + " · no contact · " + Math.round(s.d) + " km · " + h;
  const lead = mode === "withdraw" ? (s.d < m.depth ? "Withdraw" : "Withdrawn")
    : s.phase.startsWith("Holding") ? "Hold " + s.n
    : s.phase === "Falling back" ? "Displace"
    : s.phase === "Passing back" ? "Passing" : "Done";
  const rate = s.a > 0.05 ? (s.t / s.a).toFixed(2) : "–";
  return lead + " · " + h + " · " + rate + " h/km · " + s.cas.f + " vs " + s.cas.e + " down";
}
