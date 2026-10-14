// The turning-movement model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// Geometry is the bench's own (world units). The timing numbers are notional teaching
// values, stated as such on the page: they make the race between the turning force and
// the defender visible, they are not data.

export const MODEL = {
  trigger: 0.4,     // share of the route at which the defender reads the threat to its rear
  guardRate: 70,    // degrees per second the guard block slides round its track
  tourSpeed: 26,    // units per second the turning carriage moves in the idle tour
  maxSpeed: 60,     // units per second cap under the reader's hand
  phiMax: 16,       // degrees the release lever swings when thrown fully
  boltTravel: 10,   // units the bolt withdraws when the lever is fully thrown
};

// The bypass route: a straight run down the near side, a quarter bend, a run in behind the lock.
export const ROUTE = { ax0: 70, ax1: -36, ay: 66, cx: -36, cy: 36, r: 30, bx: -66, by0: 36 };
// The release lever and the roller on the turning carriage that throws it.
export const LEVER = { px: -30, py: 0, half: 1.2, len: 42, crank: 12 };
export const ROLLER = { ahead: 13, r: 2 };
// The guard block: an annular sector on a ring track round the lock.
export const GUARD = { r0: 40, r1: 48, half: 9 };

const RAD = Math.PI / 180;
const LA = ROUTE.ax0 - ROUTE.ax1;
const LC = (Math.PI / 2) * ROUTE.r;
const ARM = LEVER.px - ROUTE.bx;          // roller centre to lever pivot, along x (36)
const TOUCH = LEVER.half + ROLLER.r;      // roller centre to handle centre line at contact (3.2)

// Carriage centre y on the last run when the lever has swung phi degrees.
const cAt = (phi) => ROLLER.ahead + (TOUCH - ARM * Math.sin(phi * RAD)) / Math.cos(phi * RAD);
const yToS = (y) => LA + LC + (ROUTE.by0 - y);

export const S_CONTACT = yToS(cAt(0));
export const S_END = yToS(cAt(MODEL.phiMax));

// Position and heading (degrees) of the carriage centre at distance s along the route.
export function routeAt(s) {
  s = Math.max(0, Math.min(S_END, s));
  if (s <= LA) return { x: ROUTE.ax0 - s, y: ROUTE.ay, h: 180 };
  if (s <= LA + LC) {
    const a = 90 + ((s - LA) / ROUTE.r) / RAD;
    return { x: ROUTE.cx + ROUTE.r * Math.cos(a * RAD), y: ROUTE.cy + ROUTE.r * Math.sin(a * RAD), h: a + 90 };
  }
  return { x: ROUTE.bx, y: ROUTE.by0 - (s - LA - LC), h: 270 };
}

// Nearest route distance to a floor point, and how far off the route it is.
export function nearestS(x, y) {
  const cand = [];
  const sa = Math.max(0, Math.min(LA, ROUTE.ax0 - x));
  cand.push([sa, Math.hypot(x - (ROUTE.ax0 - sa), y - ROUTE.ay)]);
  let a = Math.atan2(y - ROUTE.cy, x - ROUTE.cx) / RAD;
  if (a < 0) a += 360;
  a = Math.max(90, Math.min(180, a));
  const p = [ROUTE.cx + ROUTE.r * Math.cos(a * RAD), ROUTE.cy + ROUTE.r * Math.sin(a * RAD)];
  cand.push([LA + (a - 90) * RAD * ROUTE.r, Math.hypot(x - p[0], y - p[1])]);
  const sb = Math.max(LA + LC, Math.min(S_END, yToS(y)));
  cand.push([sb, Math.hypot(x - ROUTE.bx, y - routeAt(sb).y)]);
  cand.sort((m, n) => m[1] - n[1]);
  return { s: cand[0][0], off: cand[0][1] };
}

// How far the lever has swung (degrees) with the carriage at s. Zero until the roller touches.
export function phiAt(s) {
  if (s <= S_CONTACT) return 0;
  const B = routeAt(s).y - ROLLER.ahead;
  const phi = (Math.asin(TOUCH / Math.hypot(ARM, B)) - Math.atan2(B, ARM)) / RAD;
  return Math.max(0, Math.min(MODEL.phiMax, phi));
}

// Share of the bolt's travel withdrawn at lever angle phi (crank pin moves crank * sin phi).
export const boltDrawn = (phi) => Math.sin(phi * RAD) / Math.sin(MODEL.phiMax * RAD);

// The furthest round (most negative angle, degrees) the guard can stand before its leading
// face meets the side of the lever handle swung to phi. At phi = 0 this is the brace stop.
export function guardLimit(phi) {
  const t = Math.tan(phi * RAD), off = LEVER.half / Math.cos(phi * RAD);
  let edge = -180;
  for (let r = GUARD.r0; r <= GUARD.r1 + 1e-9; r += 0.5) {
    const yh = (-r - LEVER.px) * t - off;            // handle's -y side where it crosses radius r
    edge = Math.max(edge, -180 + Math.asin(Math.min(1, -yh / r)) / RAD);
  }
  return edge + GUARD.half;
}
export const G_REAR = guardLimit(0);

// Route share shown on the readout: 100% when the roller reaches the lever.
export const routePct = (s) => Math.round(Math.min(1, s / S_CONTACT) * 100);
// Where the defender wants its guard: back at the lever once the threat passes the trigger.
export const guardWant = (react, s, m = MODEL) => (react && s >= m.trigger * S_CONTACT ? G_REAR : 0);

// One step of the guard along its track, rate-limited, never through the handle.
export function guardStep(g, want, phi, dt, m = MODEL) {
  const cap = m.guardRate * dt;
  const next = g + Math.max(-cap, Math.min(cap, want - g));
  return Math.max(next, guardLimit(phi));
}
export const braced = (g, phi) => phi === 0 && g <= G_REAR + 0.05;

// Seconds for the turning force to cover the route from the trigger to the lever at a steady speed,
// and seconds for the guard to get from the front to the lever.
export const runTime = (speed, m = MODEL) => ((1 - m.trigger) * S_CONTACT) / speed;
export const guardTime = (m = MODEL) => Math.abs(G_REAR) / m.guardRate;

// Battlefield view only: notional losses, in vehicles (one per company). Success is not free: the
// diversion's attack on the ridge always costs each side one. If the defender wins the race and
// braces the crossroads, the turning force's lead battalion runs into its block and loses up to two
// more as it closes the last fifth of the route, the defender one. If the turning force seizes the
// crossroads, it loses one more and the defender up to three: one if it stayed on the ridge, three if
// it was caught driving back and halted short of the crossroads. Teaching values.
export function losses(s, g, phi, m = MODEL) {
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const a = clamp01(phi / m.phiMax), gq = clamp01(g / G_REAR);
  const block = braced(g, phi) ? clamp01((s / S_CONTACT - 0.8) / 0.2) : 0;
  const blue = 1 + Math.round(2 * block) + Math.round(a);
  const red = 1 + Math.round(block) + Math.round(a * (1 + 2 * gq));
  return { blue, red };
}
