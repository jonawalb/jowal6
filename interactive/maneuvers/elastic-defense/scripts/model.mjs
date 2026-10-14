// The elastic-defense model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file. The Battlefield
// view (field-scene.mjs) draws its own scene from the same state.
//
// Depth d is in notional kilometres from the outpost line (the front of the
// defense), measured at the ram's nose. The zone lines follow Lupfer's sketch of
// the 1917 German defense (outpost zone, then the main line of resistance, the
// battle zone and the artillery protective line), but every force, stiffness and
// rate here is a teaching shape, not data.

export const MODEL = {
  start: -0.7,                 // ram nose at rest, before the outpost line
  reach: 3.2,                  // depth where the drive spring is spent: push falls to zero here
  homes: [0, 0.75, 1.75, 3.0], // rest faces: outpost plate, MLR plate, battle-zone plate, rear stop
  apl: 2.75,                   // artillery protective line: rear of the battle zone (ruler mark only)
  solid: 0.1,                  // gap left between two plates when the spring between them bottoms out
  hold: [0.05, 0.25, 0.65, 1.2], // defense resistance at contact and as each stage bottoms out
  wall: 0.7,                   // breaking load of the same plates bolted into one forward wall
  rate: 3.0,                   // km per second per unit of net force (an overdamped creep)
  thick: 0.075,                // plate thickness when bunched into a wall
  strength: [0.6, 1.6],        // slider range for the attack's weight
  pause: 0.8,                  // seconds between the stall and the counterattack
  strike: 1.75,                // ram depth at which the flank carriage's wedge face meets the ram's roller
                               // when the carriage is still latched (deeper than any stall)
};

// Men drawn in the Battlefield view, and the notional loss rates behind the casualty counts.
// elastic: the attacker loses `perKm` of its men per km it gets into the defense and `counter`
// more as the flank counterattack throws it back; the defender loses its own perKm and counter
// shares. rigid: the packed front trench loses `barrage` of its men while the attack closes on it
// (the attacker loses `approach`); then either the attack is held at the wire (attacker loses
// `held` more) or the wall breaks and the trench is overrun (defender loses `overrun` more, the
// attacker `through` more, both in proportion to how far the attack has run on).
export const FORCE = { blue: 24, red: 33 };
export const LOSS = {
  elastic: { blue: { perKm: 0.22, counter: 0.15 }, red: { perKm: 0.06, counter: 0.10 } },
  rigid: { blue: { approach: 0.10, held: 0.20, through: 0.08 }, red: { barrage: 0.15, overrun: 0.40 } },
};

// Where each stage of the spring stack bottoms out, as ram depth.
export function stages(m = MODEL) {
  const [h0, h1, h2, h3] = m.homes;
  return [h0, h1 - m.solid, h2 - 2 * m.solid, h3 - 3 * m.solid];
}

// The attack's push at depth d: a drive spring that loses force as it extends,
// standing for an attack that weakens as it leaves its artillery behind.
export function push(d, a = 1, m = MODEL) {
  return a * Math.max(0, (m.reach - d) / (m.reach - m.start));
}

// Resistance of the elastic stack at depth d: zero before contact, rising stage
// by stage, solid against the fixed rear stop at the last stage.
export function hold(d, m = MODEL) {
  const b = stages(m);
  if (d < b[0]) return 0;
  if (d >= b[3]) return Infinity;
  for (let i = 0; i < 3; i++) {
    if (d < b[i + 1]) return m.hold[i] + (m.hold[i + 1] - m.hold[i]) * (d - b[i]) / (b[i + 1] - b[i]);
  }
  return Infinity;
}

// Depth where push and hold balance in the elastic stack (bisection).
export function stall(a = 1, m = MODEL) {
  const b = stages(m);
  let lo = b[0], hi = b[3] - 1e-9;
  if (push(lo, a, m) <= hold(lo, m)) return lo;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (push(mid, a, m) > hold(mid, m)) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Does the rigid forward wall break? It meets the attack at full strength, at the outpost line.
export const breaks = (a = 1, m = MODEL) => push(m.homes[0], a, m) > m.wall;

// The smallest attack weight that breaks the wall.
export const breakingWeight = (m = MODEL) => m.wall / push(m.homes[0], 1, m);

// Zone name for a ram depth.
export function zoneOf(d, m = MODEL) {
  if (d < m.homes[0]) return "Approach";
  if (d < m.homes[1]) return "Outpost zone";
  if (d < m.apl) return "Battle zone";
  return "Rear zone";
}

// Plate front faces (km) for a ram depth d in the elastic stack, with bunch b
// (0 = spread in depth, 1 = bolted into one forward wall) while the ram is clear.
export function plates(d, bunch = 0, m = MODEL) {
  const out = [];
  for (let i = 0; i < 3; i++) {
    const spread = Math.max(m.homes[i], d + i * m.solid);
    const wall = m.homes[0] + i * (m.thick + m.solid * 0.5);
    out.push(spread + (wall - spread) * bunch);
  }
  return out;
}

// Where the flank carriage's wedge face meets the ram, as ram depth, for strike progress c (0..1):
// a straight wedge, so the face's contact depth falls linearly from MODEL.strike to the depth at
// which the MLR plate is home again.
export const faceDepth = (c, m = MODEL) => m.strike - c * (m.strike - stages(m)[1]);

// ---- the bench's state machine, one step at a time ----
// phases: ready → attack → (elastic) stalled → counter → restored
//                         (rigid)   held | broken → through
// fire() and setMode() go through "reset", which returns everything to rest.

export function initial(mode = "elastic", a = 1, m = MODEL) {
  return { mode, a, phase: "ready", t: 0, d: m.start, dm: m.start, v: 0, c: 0, d0: 0, broken: false,
    shard: 0, bunch: mode === "rigid" ? 1 : 0, pending: false };
}

const follow = (x, to, dt, tau) => x + (to - x) * (1 - Math.exp(-dt / tau));

export function fire(S) { S.phase = "reset"; S.pending = true; S.t = 0; return S; }
export function setMode(S, mode) { S.mode = mode; S.phase = "reset"; S.pending = false; S.t = 0; return S; }

export function step(S, dt, m = MODEL) {
  S.t += dt;
  const rigid = S.mode === "rigid";
  if (S.phase === "reset" || S.phase === "ready") {
    S.d = follow(S.d, m.start, dt, 0.26);
    S.c = follow(S.c, 0, dt, 0.26);
    S.v = 0;
    if (Math.abs(S.d - m.start) < 0.08) {
      // shards are put back only once the ram is clear of them
      S.shard = follow(S.shard, 0, dt, 0.3);
      if (S.shard < 0.02) S.broken = false;
    }
    if (Math.abs(S.d - m.start) < 0.08 && S.shard < 0.02) S.bunch = follow(S.bunch, rigid ? 1 : 0, dt, 0.3);
    const rest = Math.abs(S.d - m.start) < 0.004 && S.c < 0.004 && S.shard < 0.004 && Math.abs(S.bunch - (rigid ? 1 : 0)) < 0.004;
    if (S.phase === "reset" && rest) {
      S.d = m.start; S.c = 0; S.shard = 0; S.bunch = rigid ? 1 : 0;
      S.phase = S.pending ? "attack" : "ready"; S.pending = false; S.t = 0; S.dm = m.start;
    }
    return S;
  }
  if (S.phase === "attack") {
    if (!rigid) {
      const net = push(S.d, S.a, m) - hold(S.d, m);
      S.v = m.rate * net;
      S.d = Math.min(S.d + S.v * dt, stages(m)[3] - 1e-6);
      S.dm = Math.max(S.dm, S.d);
      if (S.d > 0 && Math.abs(S.v) < 0.03 && S.t > 0.5) { S.phase = "stalled"; S.t = 0; S.d0 = S.d; S.v = 0; }
    } else {
      const front = m.homes[0];
      if (!S.broken && S.d + m.rate * push(S.d, S.a, m) * dt >= front) {
        if (breaks(S.a, m)) S.broken = true;
        else { S.d = front; S.v = 0; S.phase = "held"; S.t = 0; return S; }
      }
      // after the break nothing resists until the ram closes the buffer spring on the fixed rear stop
      const stop = m.homes[3] - 0.06;
      S.v = m.rate * push(S.d, S.a, m);
      S.d = Math.min(S.d + S.v * dt, stop);
      S.dm = Math.max(S.dm, S.d);
      if (S.broken) S.shard = follow(S.shard, 1, dt, 0.18);
      if (S.d >= stop - 0.01 || (S.d > 0 && S.v < 0.03)) { S.phase = "through"; S.t = 0; S.v = 0; }
    }
    return S;
  }
  if (S.phase === "through") { S.shard = follow(S.shard, 1, dt, 0.18); return S; }
  if (S.phase === "stalled") {
    if (S.t >= m.pause) { S.phase = "counter"; S.t = 0; }
    return S;
  }
  if (S.phase === "counter") {
    // the flank carriage drives in from the side; once its wedge face meets the ram's roller it
    // throws the ram back along the rails until the MLR plate is home again
    S.c = follow(S.c, 1, dt, 0.45);
    S.d = Math.min(S.d0, faceDepth(S.c, m));
    if (1 - S.c < 0.003) { S.c = 1; S.d = stages(m)[1]; S.phase = "restored"; S.t = 0; }
    return S;
  }
  return S;
}

// How far the flank counterattack has thrown the ram back: 0 until the wedge meets it, 1 with the MLR plate home.
export function thrown(S, m = MODEL) {
  if (S.mode === "rigid" || (S.phase !== "counter" && S.phase !== "restored")) return 0;
  const span = S.d0 - stages(m)[1];
  return span > 1e-9 ? Math.min(1, Math.max(0, (S.d0 - S.d) / span)) : 1;
}

// Casualties (notional): men down on each side in the Battlefield view's drawn force, from the
// state's progress (FORCE and LOSS above). Never zero once the attack is in contact.
export function casualties(S, m = MODEL, f = FORCE, L = LOSS) {
  const cl = (x) => Math.min(1, Math.max(0, x));
  if (S.phase === "ready" || S.phase === "reset") return { blue: 0, red: 0 };
  let blue, red;
  if (S.mode !== "rigid") {
    const deep = Math.max(0, S.dm), k = thrown(S, m);
    blue = f.blue * (L.elastic.blue.perKm * deep + L.elastic.blue.counter * k);
    red = f.red * (L.elastic.red.perKm * deep + L.elastic.red.counter * k);
  } else {
    const close = cl((S.dm - m.start) / (m.homes[0] - m.start));
    const run = S.broken ? cl(S.dm / (m.homes[3] - 0.06)) : 0;
    blue = f.blue * (L.rigid.blue.approach * close + (S.phase === "held" ? L.rigid.blue.held : 0) + L.rigid.blue.through * run);
    red = f.red * (L.rigid.red.barrage * close + L.rigid.red.overrun * run);
  }
  return { blue: Math.round(blue), red: Math.round(red) };
}

// The words and numbers the card shows for a state, ending with blue vs red men down (notional).
export function readout(S, m = MODEL) {
  const km = (x) => Math.max(0, x).toFixed(1);
  const pct = Math.round(push(S.d, S.a, m) * 100);
  const c = casualties(S, m), down = `${c.blue} vs ${c.red} down`;
  switch (S.phase) {
    case "ready":
    case "reset": return S.mode === "rigid" ? "Ready · rigid forward wall" : "Ready · elastic defense";
    case "attack":
      if (S.mode === "rigid" && S.broken) return `Wall broken · ${km(S.d)} km deep · ${down}`;
      return S.d < 0 ? `Approach · push ${pct}% · ${down}` : `${zoneOf(S.d, m)} · ${km(S.d)} km · ${down}`;
    case "stalled": return `Stalled · ${km(S.d)} km deep · ${down}`;
    case "counter": return `Flank counterattack · ${km(S.d)} km · ${down}`;
    case "restored": return `MLR restored · attack spent · ${down}`;
    case "held": return `Wall holds · push ${pct}% · ${down}`;
    case "through": return `Broke through · ${km(S.d)} km deep · ${down}`;
    default: return "";
  }
}

// What the defense is pushing back with, for the gauge's second needle: the
// stack's resistance, the flank carriage's drive once its wedge meets the ram
// (push plus a notional margin), or the rigid wall's breaking load until it goes.
export const COUNTER_MARGIN = 0.25;
export function resist(S, m = MODEL) {
  if (S.mode === "rigid") return S.broken ? 0 : m.wall;
  if (S.phase === "counter") return faceDepth(S.c, m) <= S.d0 + 1e-9 ? push(S.d, S.a, m) + COUNTER_MARGIN : Math.min(hold(S.d, m), 1.6);
  if (S.phase === "restored") return push(S.d, S.a, m);
  return Math.min(hold(S.d, m), 1.6);
}
