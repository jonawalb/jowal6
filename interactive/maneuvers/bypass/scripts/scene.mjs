// The moving half of the figure: the floats, the rocks (and their rubble once reduced),
// the lane dividers and the turning vanes. Rebuilt per frame from the model's state.
// Written against the kit as a parameter (K) so build.mjs (Node) and the page
// (inlined kit) run the same code. build.mjs inlines this file with `export` stripped.

export const GEO = {
  W: 10,          // water surface
  FLOOR: 4,       // channel floor
  WALL: 14,       // wall tops
  IN: 30,         // inner half-width of the channel
  DIV: 22,        // half-length of a lane divider
  VANE: 11,        // vane length
  VANE_ANG: 35,   // vane swing either side of the axis, degrees
};

const SC_RAD = Math.PI / 180;

// A rock's plan: an irregular convex outline, the same every frame.
export function rockRing(rock, lane, scale = 1, dx = 0, dy = 0) {
  const jitter = [1, 0.78, 0.94, 0.83, 1.06, 0.8, 0.97, 0.86, 1.02];
  const out = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * 2 * Math.PI + 0.5 * rock.rank;
    const r = rock.r * jitter[(i + rock.rank * 2) % 9] * scale;
    out.push([rock.x + dx + r * Math.cos(a), -lane + dy + r * Math.sin(a)]);
  }
  return out;
}

// S: { floats: [{x, y, live, parked, out, born}], rocks: [{progress, by}], vanes: [deg...], t }
export function scene(K, P, M, S) {
  const items = [];
  const put = (layer, x, y, svg) => items.push({ key: layer * 1e4 + K.depthOf([x, y, 0], P), svg });
  const solid = (paths, style) => K.solidSvg(paths, style);
  const W = GEO.W;

  // ---- rocks: two tiers above the waterline, cut down while they are reduced ----
  M.rocks.forEach((rock, j) => {
    const p = S.rocks[j].progress;
    const f = 1 - p;
    let svg = "";
    if (f > 0.04) {
      // a wake ring on the water round the rock, shrinking with it
      const rx = rock.r * (1 + 0.45 * f), ry = Math.min(rock.r * (1 + 0.08 * f), 13.4);
      const wake = [];
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * 2 * Math.PI;
        wake.push([rock.x + 1.5 + rx * Math.cos(a), -M.lane + ry * Math.sin(a)]);
      }
      svg += K.lineSvg(K.onTop(wake, W, P, true), { tone: "faint" });
      // three tiers, each smaller and set off the last, so the stack reads as a boulder
      const tiers = [[1, 0, 0, 0.42], [0.74, -1.6, -1.2, 0.33], [0.44, 0.8, -2.4, 0.25]];
      let z = W;
      for (const [sc, dx, dy, share] of tiers) {
        const h = rock.h * share * f;
        svg += solid(K.extrude(rockRing(rock, M.lane, sc, dx, dy), z, h, P, { bevel: 0.35 }), { tone: "hi", crease: "lo" });
        z += h;
      }
    }
    put(1, rock.x, -M.lane, svg);
    // rubble pushed to either side of the lane as the rock is cleared
    if (p > 0.05) {
      const g = Math.min(1, p * 1.4);
      for (const [dx, y, r] of [[3, -26, 2.4], [-2, -6.4, 2]]) {
        const ring = [];
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * 2 * Math.PI + 0.3;
          ring.push([rock.x + dx + r * Math.cos(a) * (i % 2 ? 0.85 : 1), y + r * Math.sin(a) * (i % 2 ? 0.85 : 1)]);
        }
        put(1, rock.x + dx, y, solid(K.extrude(ring, W, 2.2 * g, P), { tone: "mid" }));
      }
    }
  });

  // ---- lane dividers with a pivot post and a turning vane at the upstream nose ----
  M.rocks.forEach((rock, j) => {
    const x0 = rock.x - GEO.DIV;
    const plan = { x: x0, y: -1.5, w: 2 * GEO.DIV, d: 3, r: 1.5 };
    const ang = S.vanes[j] * SC_RAD;
    const tip = [x0 - GEO.VANE * Math.cos(ang), GEO.VANE * Math.sin(ang)];
    // vane: a thin plate from the pivot upstream, swung toward the lane it closes
    const nx = -Math.sin(ang) * 0.6, ny = -Math.cos(ang) * 0.6;
    const vane = [[x0 + nx, ny], [tip[0] + nx, tip[1] + ny], [tip[0] - nx, tip[1] - ny], [x0 - nx, -ny]];
    put(2, x0 - 4, tip[1] * 0.5, solid(K.extrude(vane, W, 4.4, P), { tone: "mid" }));
    put(2, rock.x, 0,
      solid(K.slabOf(plan, W, 4.6, P, 4, 0.4), { tone: "mid", inner: K.lineSvg(K.sideSeam(plan, W + 2, P, 4), { tone: "faint" }) }) +
      K.dotsSvg([[rock.x - 12, 0], [rock.x + 12, 0]].map(([x, y]) => K.iso([x, y, W + 4.6], P)), { size: 0.42 }) +
      solid(K.cylinder(x0, 0, 1.4, W + 4.6, 1.6, P, 16), { tone: "mid" }));
  });

  // ---- floats: the attacking force ----
  for (const f of S.floats) {
    if (!f.live) continue;
    const fade = Math.min(1, (f.x - M.x0) / 14);
    if (fade <= 0) continue;
    const body = solid(K.cylinder(f.x, f.y, M.puck, W - 0.4, 2.4, P, 20, 0.4), { tone: "hi", lit: true, crease: "lo" }) +
      K.dotsSvg([K.iso([f.x, f.y, W + 2], P)], { size: 0.5 });
    const svg = fade < 1 ? `<g opacity="${fade.toFixed(2)}">${body}</g>` : body;
    const layer = f.x > M.x1 + 2 ? 3 : f.y < 0 ? 1 : 3;
    put(layer, f.x, f.y, svg);
  }

  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

// A dial needle for a share f in 0..1: a 270 degree sweep, kit tick convention.
export function needle(K, P, D, f) {
  const a = -0.75 * Math.PI + Math.min(1, Math.max(0, f)) * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 2.6, D.y - sy * 2.6], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
}

// The selector knob's pointer for bypass criteria c in 0..3 (four detents over 120 degrees, facing the viewer).
export function pointer(K, P, KN, c) {
  const a = (120 + c * 40) * SC_RAD;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([KN.x, KN.y], [KN.x + sx * (KN.r - 1), KN.y + sy * (KN.r - 1)], KN.top + 0.1, P);
}
