// The moving half of the figure: two carriages on twin rails (the squad's two fire teams), the pop-up
// target, the dial needle, the three bar gauges and the tally pegs. Rebuilt per frame from the state,
// depth-sorted. Written against the kit as a parameter (K) so build.mjs (Node) and the page (inlined
// kit) run the same code. build.mjs inlines this file with `export` stripped.
//   S.xA, S.xB   carriage positions on the rails (world x)
//   S.upA, S.upB mast height 0..1 (a team that is halted, scanning, overwatches)
//   S.pinA, S.pinB  brake pin 0..1 (1 = pin down in the rail, the carriage is held)
//   S.pop        target pop-up 0..1
//   S.fireB      0..1 the overwatching team's supporting fire is on; S.hitA 0..1 the enemy's fire on the lead
//   S.owX        world x of the team that overwatches (or -1000)
//   S.risk       dial needle 0..1
//   S.bars       [speed, security, first fire] 0..1
//   S.nb, S.nr   pegs counted: men down, friendly and enemy

export const GEO = {
  RAIL_Y: [4, 36],         // the two rail centre lines
  RAIL_X: [-134, 124],
  RAIL_TOP: 3,
  X0: -118, XSPAN: 232,    // route distance 0..ROUTE maps onto x0..x0+xspan
  ROUTE: 250,
  TX: 126, TY: 20,         // the target
  TZ: 3,
  DIAL: { x: -78, y: 82, r: 20, z: 22, h: 8 },
  BAR_X: [-26, 20, 66], BAR_Y: 82,
  TALLY: { x: 96, y: 70, w: 52, d: 30, r: 2 },
  RULER: { x: -130, y: -33, w: 250, d: 7, r: 1 },
  RANGE: 62,               // notional reach of the overwatching team's weapons, world units
  BAR_H: 34,
};
GEO.xOf = (s) => GEO.X0 + s * GEO.XSPAN / GEO.ROUTE;
GEO.DIAL.top = GEO.DIAL.z + GEO.DIAL.h;

const SC_RAD = Math.PI / 180;

export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const box = (x0, x1, y0, y1, z0, h, bevel = 0) => K.extrude([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z0, h, P, { bevel });
  const G = GEO;
  const Z = G.RAIL_TOP;

  // ---- one carriage: skid shoes grip the rail, a body, a wedge nose, a brake plunger and a mast ----
  const carriage = (x, y, c) => {
    let out = `<path class="iso-halo" d="${K.slabOf({ x: x - 14, y: y - 11, w: 28, d: 22, r: 2 }, 1, 0.1, P).fill}" style="filter:blur(3px)"/>`;
    const shoes = [[-11, -5, -6.4, -3.6], [5, 11, -6.4, -3.6], [-11, -5, 3.6, 6.4], [5, 11, 3.6, 6.4]];
    const key = depth(x, y);
    const near = (s) => depth(x + (s[0] + s[1]) / 2, y + (s[2] + s[3]) / 2) > key;
    const shoeSvg = (s) => solid(box(x + s[0], x + s[1], y + s[2], y + s[3], 1, 5.4, 0.3), { tone: "mid" });
    out += shoes.filter((s) => !near(s)).map(shoeSvg).join("");
    out += solid(box(x - 13, x + 13, y - 10, y + 10, 6.4, 4.8, 0.5), { tone: "mid" });
    out += shoes.filter(near).map(shoeSvg).join("");
    out += K.dotsSvg([[x - 11, y - 8], [x - 11, y + 8], [x + 11, y - 8], [x + 11, y + 8]].map(([a, b]) => at([a, b, 11.2])), { size: 0.42 });
    // a wedge nose pointing at the target; the lead team's is the lit accent
    const wedge = [[x - 4, y], [x + 7, y - 7], [x + 14, y - 7], [x + 14, y + 7], [x + 7, y + 7]];
    out += solid(K.extrude(wedge, 11.2, 4.4, P, { bevel: 0.35 }), c.lit ? { tone: "hi", lit: true, crease: "lo" } : { tone: "mid", crease: "faint" });
    out += line(K.onTop([[x - 4, y], [x + 14, y]], 15.6, P), { tone: c.lit ? "lit" : "faint" });
    // brake plunger: knob down and flush when the pin is in the rail, up on its rod when released
    const lift = 1 + 5 * (1 - c.pin);
    out += solid(K.cylinder(x - 6, y - 5, 2.6, 11.2, 2.2, P, 22), { tone: "mid" });
    out += solid(K.cylinder(x - 6, y - 5, 0.9, 13.4, lift, P, 12), { tone: "mid", crease: "none" });
    out += solid(K.cylinder(x - 6, y - 5, 2.2, 13.4 + lift, 2.2, P, 20), { tone: "mid" }) + line(K.knurl(x - 6, y - 5, 2.2, 13.4 + lift, 15.6 + lift, 16, P), { tone: "lo" });
    // mast and sight head: a team that is set and scanning raises it
    const mh = 4 + 12 * c.up;
    out += solid(K.cylinder(x - 9, y + 5, 1, 11.2, mh, P, 14), { tone: "mid", crease: "none" });
    out += solid(box(x - 11, x - 3, y + 3.6, y + 6.4, 11.2 + mh, 3, 0.3), { tone: c.up > 0.5 ? "hi" : "mid", crease: "lo" });
    return out;
  };
  const carriages = [[S.xA, G.RAIL_Y[0], { lit: true, up: S.upA, pin: S.pinA }], [S.xB, G.RAIL_Y[1], { lit: false, up: S.upB, pin: S.pinB }]];
  for (const [x, y, c] of carriages) put(depth(x, y), carriage(x, y, c));

  // ---- the target: a panel that slides up its two guide posts on contact ----
  {
    const x = G.TX, y = G.TY, z0 = G.TZ + 1 + 11 * S.pop;
    put(depth(x, y) - 1, solid(box(x - 5, x + 5, y - 13, y + 13, G.TZ, 1.6, 0.3), { tone: "mid" }));
    put(depth(x, y - 11), solid(K.cylinder(x, y - 11, 1.6, G.TZ + 1.6, 22, P, 14), { tone: "mid", crease: "none" }));
    put(depth(x, y), solid(box(x - 1.6, x + 1.6, y - 9.5, y + 9.5, z0 + 1.6, 12, 0.3), { tone: "hi", crease: "lo", lit: false }) +
      line(K.lineOnTop([x - 1.6, y - 7], [x - 1.6, y + 7], z0 + 13.6, P), { tone: "faint" }));
    put(depth(x, y + 11), solid(K.cylinder(x, y + 11, 1.6, G.TZ + 1.6, 22, P, 14), { tone: "mid", crease: "none" }) +
      solid(K.cylinder(x, y + 11, 2.4, G.TZ + 23.6, 1.4, P, 14), { tone: "mid" }) +
      solid(K.cylinder(x, y - 11, 2.4, G.TZ + 23.6, 1.4, P, 14), { tone: "mid" }));
  }

  // ---- fire: the enemy's on the lead carriage, the overwatching team's on the target (tracer lines) ----
  if (S.hitA > 0.02) {
    const d = K.onTop([[G.TX - 8, G.TY], [S.xA + 14, G.RAIL_Y[0]]], 21, P);
    put(1e4, line(d, { tone: "mid", dashed: true, free: true }));
  }
  if (S.fireB > 0.02 && S.owX > -900) {
    const yo = S.owX === S.xA ? G.RAIL_Y[0] : G.RAIL_Y[1];
    const d = K.onTop([[S.owX + 4, yo + 5], [G.TX - 8, G.TY]], 21, P);
    put(1e4 + 1, line(d, { tone: "lit", dashed: true, free: true }));
  }

  // ---- the overwatching team's reach, marked on the ruler strip ----
  if (S.owX > -900 && S.owRange > 0.02) {
    const x0 = S.owX, x1 = Math.min(G.TX, x0 + G.RANGE * S.owRange), y = G.RULER.y + 3.5;
    put(depth(x0, y) + 0.2, line(K.lineOnTop([x0, y], [x1, y], 0.9, P), { tone: "lit" }) +
      line(K.lineOnTop([x0, y - 2], [x0, y + 2], 0.9, P) + K.lineOnTop([x1, y - 2], [x1, y + 2], 0.9, P), { tone: "lit" }));
  }

  // ---- dial needle: the leader's likelihood of contact ----
  {
    const D = G.DIAL, a = -0.75 * Math.PI + S.risk * 1.5 * Math.PI;
    const sx = Math.sin(a), sy = -Math.cos(a);
    const d = K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
    put(depth(D.x, D.y) + 0.5, `<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${d}" style="stroke-width:1.1"/>` + line(K.ring(D.x, D.y, 1.5, D.top, P, 16), { tone: "mid" }));
  }

  // ---- bar gauges: fills rise inside their frames ----
  G.BAR_X.forEach((bx, i) => {
    const h = Math.max(0.6, S.bars[i] * G.BAR_H);
    put(depth(bx, G.BAR_Y) + 0.4, solid(box(bx - 3, bx + 3, G.BAR_Y - 3, G.BAR_Y + 3, 5.6, h, 0.3), { tone: "mid", crease: "faint" }) +
      line(K.lineOnTop([bx - 3, G.BAR_Y - 3], [bx + 3, G.BAR_Y - 3], 5.6 + h, P), { tone: "faint" }));
  });

  // ---- tally pegs: men down, friendly (front row) and enemy (back row) ----
  {
    const T = G.TALLY;
    const row = (n, y) => {
      const pegs = [];
      for (let i = 0; i < 5; i++) {
        const px = T.x + 6 + i * 10;
        pegs.push([px, y, i < n]);
      }
      return pegs;
    };
    for (const [px, py, on] of [...row(S.nb, T.y + 20), ...row(S.nr, T.y + 8)]) {
      if (!on) continue;
      put(depth(px, py) + 0.3, solid(K.cylinder(px, py, 1.5, 1.6, 6.4, P, 14), { tone: "hi", crease: "lo" }));
    }
  }

  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}
