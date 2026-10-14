// The double-envelopment model. Pure: no DOM, no kit. Inlined into the page by build.mjs,
// so the figure, the readout and the tests all run this one file.
//
// The geometry is real: a round block (the enemy force), two curved jaws that swing shut about
// pivots on its flanks, and a concave ram pad on its front. The share of the block's rim
// "under attack" is measured from that geometry: a rim point counts when a jaw face or the pad
// face lies within MODEL.tol of it. What is notional is the mapping (jaw = enveloping force,
// ram = fixing force, rim = the enemy's perimeter) and the escape rule: an unheld block slips out
// the back, through the gap between the jaw tails, once the jaws start to close (below MODEL.slip),
// and slides MODEL.escape to the rear (negative s). The jaws cannot close through the block.

export const MODEL = {
  rb: 22,          // block radius
  rin: 22.5,       // inner radius of the jaw and pad faces (0.5 clearance)
  thick: 7,        // jaw thickness
  root: 85,        // jaw root angle off the block's front, degrees (the pivot sits here)
  tail: 178,       // jaw tail angle, degrees (the two tails meet behind the block)
  padHalf: 40,     // half-width of the ram pad, degrees
  padOut: 26.5,    // outer radius of the pad
  open: 55,        // jaw opening at rest, degrees about the pivot
  slip: 50,        // jaw opening below which an unheld block starts to slip out the back
  escape: 57,      // how far an unheld block slides to the rear (clear of the shut jaws)
  withdraw: 3,     // how far the ram's pad lifts off the block when released (it stays on its rail)
  tol: 1,          // contact tolerance: a rim point within this of a face counts as engaged
};

const RAD = Math.PI / 180;
export const pivotR = (m = MODEL) => m.rin + m.thick / 2;

// The pivot of a jaw. side = -1 for the far jaw (y < 0), +1 for the near jaw (y > 0).
export function pivot(side, m = MODEL) {
  const a = side * m.root * RAD, r = pivotR(m);
  return [r * Math.cos(a), r * Math.sin(a)];
}

// A point of a jaw, given in its closed position as (angle off front, radius), turned open by
// beta degrees about its pivot. Opening swings the tail outward: CCW for side -1, CW for side +1.
export function jawPoint(side, deg, r, beta, m = MODEL) {
  const [px, py] = pivot(side, m);
  const a = side * deg * RAD;
  const x = r * Math.cos(a) - px, y = r * Math.sin(a) - py;
  const t = -side * beta * RAD, c = Math.cos(t), s = Math.sin(t);
  return [px + x * c - y * s, py + x * s + y * c];
}

// The jaw's inner face, sampled every `step` degrees.
export function jawFace(side, beta, m = MODEL, step = 1) {
  const out = [];
  for (let d = m.root; d <= m.tail + 1e-9; d += step) out.push(jawPoint(side, d, m.rin, beta, m));
  return out;
}

// The ram pad's inner face, centred on (u, 0).
export function padFace(u, m = MODEL, step = 1) {
  const out = [];
  for (let d = -m.padHalf; d <= m.padHalf + 1e-9; d += step) out.push([u + m.rin * Math.cos(d * RAD), m.rin * Math.sin(d * RAD)]);
  return out;
}

// Which degrees of the block's rim are engaged. State: { beta, s, u } with the block centred
// on (s, 0) and the pad on (u, 0). Returns { share, jaws, pad } as fractions of the rim.
export function engaged(state, m = MODEL) {
  const faces = [jawFace(-1, state.beta, m), jawFace(1, state.beta, m)];
  const pad = padFace(state.u, m);
  const tol2 = (m.rb + m.tol) ** 2;
  // only face points near the rim can engage it: prefilter by distance from the block centre
  const near = (pts) => pts.filter(([x, y]) => (x - state.s) ** 2 + y * y <= tol2);
  const jawPts = near(faces[0].concat(faces[1]));
  const padPts = near(pad);
  let byJaw = 0, byPad = 0, any = 0;
  const t2 = m.tol * m.tol;
  for (let d = 0; d < 360; d++) {
    const bx = state.s + m.rb * Math.cos(d * RAD), by = m.rb * Math.sin(d * RAD);
    const hit = (pts) => pts.some(([x, y]) => (x - bx) ** 2 + (y - by) ** 2 <= t2);
    const j = hit(jawPts), p = hit(padPts);
    if (j) byJaw++;
    if (p) byPad++;
    if (j || p) any++;
  }
  return { share: any / 360, jaws: byJaw / 360, pad: byPad / 360 };
}

// Smallest distance from the block's centre to any jaw point (faces and outer edges), for
// clearance checks: it must never fall below the block radius.
export function jawClearance(beta, s, m = MODEL) {
  let best = Infinity;
  for (const side of [-1, 1]) {
    for (let d = m.root; d <= m.tail + 1e-9; d += 0.5) {
      for (const r of [m.rin, m.rin + m.thick]) {
        const [x, y] = jawPoint(side, d, r, beta, m);
        best = Math.min(best, Math.hypot(x - s, y));
      }
    }
  }
  return best;
}

// Where the block wants to be. Held: pushed home by the pad (a block that has slipped out comes
// back only while the jaws are open past the slip angle, so it never meets them). Not held: it
// stays put until the jaws start to close, then slips out the back, away from them.
export function blockTarget(fixed, beta, s, m = MODEL) {
  if (fixed) return s < -0.5 && beta < m.slip ? s : 0;
  return beta < m.slip ? -m.escape : s;
}

// True when a jaw at opening beta would cut into the block at s: the jaws and the block stop
// each other there (used by the page's motion, so neither ever passes through the other).
export const blocked = (beta, s, m = MODEL) => s < -0.5 && jawClearance(beta, s, m) < m.rb;

// The ram is holding when it is commanded on and its pad sits on a block that is home.
export const holding = (fixed, u, s) => fixed && Math.abs(s) < 0.3 && Math.abs(u - s) < 0.3;

// Battlefield view only: notional losses, men down. The enemy (a platoon (-) of 21 men) loses 4% plus
// 30% times the share of its rim under attack (engaged().share), so a held and closed envelopment
// costs it most and an enemy that slips out loses least. The two enveloping squads with the platoon
// leader and RTO (20 men) lose 5% plus 10% times the closure, plus another 10% times the closure when
// the front is not held, because an unfixed enemy can turn its fire on them. Each side always loses
// at least one. Teaching values.
export const LOSS = { envelop: 20, enemy: 21 };
export function losses(state, held, m = MODEL, l = LOSS) {
  const c = Math.min(1, Math.max(0, 1 - state.beta / m.open));
  const blue = Math.max(1, Math.round(l.envelop * (0.05 + 0.1 * c + (held ? 0 : 0.1 * c))));
  const red = Math.max(1, Math.round(l.enemy * (0.04 + 0.3 * engaged(state, m).share)));
  return { blue, red };
}
