// The vertical envelopment model. Pure: no DOM, no kit, no geometry. Inlined into the page by
// build.mjs, so the drawing, the readout and the tests all run this one file. It returns
// normalized state (0..1 progress values and flags), so any view can draw from it.
//
// Every number here is notional, a teaching timeline, stated as such on the page:
// the air move takes two hours, the landed force carries enough to hold for 72 hours,
// and the linkup force must cover 60 km on the ground at the speed the slider sets.

export const MODEL = {
  up: 0.5,          // h: lift clear of the ground
  across: 1.5,      // h: the air move is over the line and above the objective
  landed: 2,        // h: set down on the objective
  hold: 72,         // h the landed force can hold on what it brought (notional)
  distance: 60,     // km the linkup force must cover on the ground (notional)
  speed: [0.5, 1.5],// km/h, the slider's range
  speed0: 1.2,      // km/h at start
  horizon: 96,      // h shown on the time slider
  lift: 2,          // h to lift the force back out if it is withdrawn
  refill: 0.1,      // share of full load restored per hour once linked up (notional)
  knee: 0.15,       // share of the time slider given to the first two hours, so the air move can be seen
  // Notional casualties (added with the Battlefield view, owner rule 2026-10-13: success is not free).
  // [friendly, enemy] men down: the landing fight at the bridge; one more per so many hours held;
  // the linkup force fighting through the defense line (while its progress runs through `fight`, the
  // stretch where the machine's carriage passes the gate); one man lost lifting the force back out.
  loss: { land: [1, 4], landSpan: 0.6, holdEvery: [24, 18], fight: [2, 6], extract: 1 },
  fight: [0.66, 0.8],
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (v) => { const x = clamp01(v); return x * x * (3 - 2 * x); };

export const outAt = (m = MODEL) => m.landed + m.hold;                 // supply runs out
export const linkupAt = (v, m = MODEL) => m.distance / v;              // ground force arrives
export const inTime = (v, m = MODEL) => linkupAt(v, m) < outAt(m);
export const minSpeed = (m = MODEL) => m.distance / outAt(m);          // slowest linkup that arrives in time

// Time slider position u (0..1) to hours and back: the first `knee` of the slider is the air move.
export function hoursAt(u, m = MODEL) {
  const x = clamp01(u);
  return x <= m.knee ? (x / m.knee) * m.landed : m.landed + ((x - m.knee) / (1 - m.knee)) * (m.horizon - m.landed);
}
export function sliderAt(t, m = MODEL) {
  const h = Math.min(m.horizon, Math.max(0, t));
  return h <= m.landed ? (h / m.landed) * m.knee : m.knee + ((h - m.landed) / (m.horizon - m.landed)) * (1 - m.knee);
}

// The air move as two normalized numbers: air (0 over the pickup zone, 1 over the objective)
// and lift (0 on the ground, 1 clear of the defense line). `back` runs it in reverse from `t0`.
function airMove(t, t0, m, back) {
  const s = t - t0;
  const lift = s < m.up ? ease(s / m.up) : s < m.across ? 1 : 1 - ease((s - m.across) / (m.landed - m.across));
  const air = ease((s - m.up) / (m.across - m.up));
  return { air: back ? 1 - air : air, lift };
}

export function state(t, v, m = MODEL) {
  const L = linkupAt(v, m), O = outAt(m), ok = L < O;
  const linkup = clamp01((v * t) / m.distance);
  let phase, supply, air, lift;
  if (t < m.landed) {
    ({ air, lift } = airMove(t, 0, m, false));
    phase = "air"; supply = 1;
  } else if (ok && t >= L) {
    air = 1; lift = 0; phase = "linked";
    supply = Math.min(1, 1 - (L - m.landed) / m.hold + (t - L) * m.refill);
  } else if (!ok && t >= O) {
    supply = 0;
    if (t < O + m.lift) { ({ air, lift } = airMove((t - O) * (m.landed / m.lift), 0, m, true)); phase = "withdrawing"; }
    else { air = 0; lift = 0; phase = "withdrawn"; }
  } else {
    air = 1; lift = 0; phase = "holding";
    supply = 1 - (t - m.landed) / m.hold;
  }
  const cut = air === 1 && lift === 0;   // on the objective: the enemy's rail line is cut
  return { t, v, phase, air, lift, supply: clamp01(supply), linkup, cut, linkupAt: L, outAt: O, inTime: ok };
}

// Men down so far, friendly (blue) and enemy (red), for a state from state(). All notional.
// Each part is also returned so the Battlefield view can lay the right men down.
export function casualties(s, m = MODEL) {
  const L = m.loss;
  const land = s.t >= m.landed + 0.1 ? L.land[0] : 0;
  const guards = s.t >= m.landed ? Math.round(L.land[1] * clamp01((s.t - m.landed) / L.landSpan)) : 0;
  const end = s.inTime ? s.linkupAt : s.outAt;
  const held = Math.max(0, Math.min(s.t, end) - m.landed);
  const holdB = Math.floor(held / L.holdEvery[0]), holdR = Math.floor(held / L.holdEvery[1]);
  const q = clamp01((s.linkup - m.fight[0]) / (m.fight[1] - m.fight[0]));
  const fightB = q >= 0.5 ? L.fight[0] : 0, fightR = Math.round(L.fight[1] * q);
  const extract = !s.inTime && s.t >= s.outAt + 0.25 ? L.extract : 0;
  return { blue: land + holdB + fightB + extract, red: guards + holdR + fightR, land, guards, holdB, holdR, fightB, fightR, extract, q };
}

// The card's readout, kept under 45 characters: time, the phase, then men down (friendly vs enemy).
export function readout(s) {
  const h = `H+${Math.floor(s.t)} h`;
  const c = casualties(s);
  const down = ` · ${c.blue} vs ${c.red} down`;
  switch (s.phase) {
    case "air": return `${h} · air move over the line${down}`;
    case "holding": return `${h} · supply ${Math.round(s.supply * 100)}%${down}`;
    case "linked": return `${h} · linked up at H+${Math.round(s.linkupAt)} h${down}`;
    case "withdrawing": return `${h} · lifting out${down}`;
    default: return `${h} · withdrawn ${Math.round(s.linkupAt - s.outAt)} h late${down}`;
  }
}
