// The penetration model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Everything here is bench geometry in millimetres of the model, plus a notional
// timeline. None of it is data about real battles; the page says so.
//
// One progress number p (0..1) runs the whole operation:
//   breach  0.00-0.42  four hammer blows drive the wedge through the boundary
//   park    0.42-0.50  the hammer swings up out of the way
//   widen   0.50-0.80  the spreader carriage drives into the gap; its rollers force it to full width
//   exploit 0.80-1.00  the carriage runs on, through the line, to the stop behind it
// "hold" says whether the shoulder pins are raised behind the rollers to keep the gap open.

export const MODEL = {
  blows: 4,            // hammer blows in the breach (notional)
  depth: 20,           // depth of the defended line along the attack axis, mm (front face x = 0)
  wedgeLen: 36,        // wedge length, mm
  wedgeBack: 10,       // wedge thickness at its back, mm
  nose0: 0,            // wedge nose at rest (touching the front face)
  nose1: 22,           // wedge nose after the last blow (2 mm past the back face)
  span: 30,            // gap the carriage rollers force open (roller to roller), mm
  body: 18,            // carriage body width, mm
  rollerR: 3,          // roller radius, mm
  carLen: 34,          // nose plate to tail, mm
  car0: -90,           // carriage nose at rest
  car1: 30,            // carriage nose when the widen phase ends
  car2: 56,            // carriage nose at the objective stop
  pinX: 10,            // shoulder pins stand at mid-depth of the line
  phases: [0.42, 0.5, 0.8],
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t) => { const u = clamp01(t); return u * u * (3 - 2 * u); };
const lerp = (a, b, t) => a + (b - a) * t;

// Wedge nose after n blows.
export const noseAfter = (n, m = MODEL) => m.nose0 + (m.nose1 - m.nose0) * Math.min(n, m.blows) / m.blows;

// Share of the line's depth the wedge nose has cut through, 0..1.
export const through = (nose, m = MODEL) => clamp01(nose / m.depth);

// Gap a wedge with its nose at x = nose forces at the line, mm: its thickness at the
// widest point inside the line (the front face, x = 0, until its back has passed it).
export function wedgeGap(nose, m = MODEL) {
  if (nose <= 0) return 0;
  const widest = Math.max(0, nose - m.wedgeLen);   // widest point of the wedge that is inside the line
  if (widest > m.depth) return 0;
  return (m.wedgeBack * (nose - widest)) / m.wedgeLen;
}

// Gap the carriage forces with its nose at x = car (rollers sit 3 mm behind the nose).
export function carriageGap(car, m = MODEL) {
  const rx = car - 3;                       // roller centres
  const tail = car - m.carLen;
  const rollersIn = rx > -m.rollerR - 5 && rx < m.depth + m.rollerR;
  const ramp = smooth((rx + m.rollerR + 5) / 5); // rollers bear on the front corners
  let g = 0;
  if (rollersIn) g = m.span * (rx < 0 ? ramp : 1);
  if (tail < m.depth && car > 0) g = Math.max(g, m.body); // the body itself keeps the gap at least this wide
  return g;
}

export function phaseOf(p, m = MODEL) {
  const [a, b, c] = m.phases;
  return p < a ? "breach" : p < b ? "park" : p < c ? "widen" : "exploit";
}

// The whole bench at progress p, with the shoulder pins held or not.
export function stateAt(p, hold, m = MODEL) {
  const [a, b, c] = m.phases;
  const s = { p, hold, phase: phaseOf(p, m) };
  // ---- breach: blow k runs over [k, k+1) * a / blows ----
  const per = a / m.blows;
  const k = Math.min(m.blows, Math.floor(Math.min(p, a) / per));
  const u = p >= a ? 1 : (p - k * per) / per;   // progress inside the current blow
  const struck = p >= a ? m.blows : k + (u >= 0.75 ? 1 : 0);
  // wedge moves only while the head is on it: u in [0.75, 0.85]
  const drive = p >= a ? 1 : smooth((u - 0.75) / 0.1);
  let nose = p >= a ? m.nose1 : lerp(noseAfter(k, m), noseAfter(k + 1, m), drive);
  s.blows = struck;
  // hammer angle, degrees from hanging; negative swings the head back (-x)
  const hit = (n) => impactAngle(n - m.wedgeLen, m);
  let phi;
  if (p < a) {
    const before = hit(noseAfter(k, m)), after = hit(noseAfter(k + 1, m));
    if (u < 0.55) phi = lerp(before, -52, smooth(u / 0.55));
    else if (u < 0.75) { const t = (u - 0.55) / 0.2; phi = lerp(-52, before, t * t); }   // falls, accelerating
    else phi = lerp(before, after, drive);
  } else {
    phi = lerp(hit(m.nose1), -90, smooth((p - a) / (b - a)));
  }
  s.phi = phi;
  // ---- carriage ----
  let car = m.car0;
  if (p >= b && p < c) car = lerp(m.car0, m.car1, smooth((p - b) / (c - b)));
  else if (p >= c) car = lerp(m.car1, m.car2, smooth((p - c) / (1 - c)));
  s.car = car;
  // the carriage pushes the wedge ahead of it
  nose = Math.max(nose, car + m.wedgeLen);
  s.nose = nose;
  s.through = through(Math.min(nose, m.nose1), m);
  // ---- shoulder pins and the gap ----
  const rx = car - 3;
  s.pinsUp = hold && rx > m.pinX + m.rollerR + 3;
  const forced = Math.max(wedgeGap(nose, m), carriageGap(car, m));
  s.gap = s.pinsUp ? Math.max(forced, m.span) : forced;
  s.cutOff = !s.pinsUp && car - m.carLen > m.depth && s.gap < m.body;
  return s;
}

// Pendulum hammer: pivot, arm length and head half-length, mm.
export const HAMMER = { x: -48, z: 63, arm: 50, half: 7 };

// Arm angle (degrees) at which the head's striking face meets a wedge back at x = back.
export function impactAngle(back, m = MODEL) {
  const s = (back - HAMMER.half - HAMMER.x) / HAMMER.arm;
  return (Math.asin(Math.max(-1, Math.min(1, s))) * 180) / Math.PI;
}

// The card's readout for a state (and the gap the figure is actually showing).
export function readoutOf(s, gap = s.gap, m = MODEL) {
  const g = Math.round(gap);
  if (s.phase === "breach") return `Breach · blow ${s.blows} of ${m.blows} · ${Math.round(s.through * 100)}% through`;
  if (s.phase === "park") return `Breach complete · gap ${g} mm`;
  if (s.phase === "widen") return `Widen · gap ${g} mm`;
  if (s.cutOff && g < m.body) return `Exploit · gap shut · cut off`;
  return s.pinsUp ? `Exploit · gap held at ${g} mm` : `Exploit · gap ${g} mm`;
}

// Battlefield view only: notional losses, men down, for a state from stateAt() (with the gap the
// figure shows). Success is not free. The attacker loses one man at the start, two more as the breach
// goes through the line (two times the share through), one as the follow-on platoon forces the gap
// wide, and two more if the shoulders are let go and the platoon in depth is cut off. The defender
// loses one, one more as the line is breached, and up to two as the gap is forced to the full span.
// Teaching values.
export function losses(s, gap = s.gap, m = MODEL) {
  const [, b, c] = m.phases;
  const widen = clamp01((s.p - b) / (c - b));
  const blue = 1 + Math.round(2 * s.through) + Math.round(widen) + (s.cutOff ? 2 : 0);
  const red = 1 + Math.round(s.through) + Math.round(2 * Math.min(1, gap / m.span));
  return { blue, red };
}
