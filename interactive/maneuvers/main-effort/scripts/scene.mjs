// The moving half of the figure: four gates in the wall with their weight stacks,
// and the loader (trolley, arm, hook rod, grab and the discs it carries).
// Rebuilt per frame. Written against the kit as a parameter (K) so build.mjs (Node)
// and the page (inlined kit) run the same code. build.mjs inlines this file with
// `export` stripped.

export const GEO = {
  X: [-84, -28, 28, 84],   // sector centres along the wall
  GW: 17,                  // gate half-width
  WY: 11,                  // wall half-thickness
  TOP: 26,                 // gate top at rest (pier tops are at 26, caps to 28)
  PLATEN: 2,               // platen thickness
  DISC: 3,                 // disc thickness
  DR: 7.5,                 // disc radius
  ARM_Z: 87,               // underside of the loader arm
  REST: 70,                // grab height when parked
  BEAM_Y: -22,             // beam centre line
};

// Top of the stack on sector i, given its gate drop and disc count.
export function stackTop(drop, n) {
  return GEO.TOP - drop + GEO.PLATEN + n * GEO.DISC;
}

export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const LAYER = 1e5;

  // ---- loader trolley and arm: behind the wall and the stacks ----
  {
    const x = S.lx;
    const by = GEO.BEAM_Y;
    let out = "";
    out += solid(K.slabOf({ x: x - 9, y: by - 5, w: 18, d: 10, r: 1.2 }, 86, 4, P, 3, 0.4), { tone: "mid" });
    out += K.dotsSvg([[x - 7, by - 3.5], [x + 7, by - 3.5], [x - 7, by + 3.5], [x + 7, by + 3.5]].map(([px, py]) => at([px, py, 90])), { size: 0.42 });
    // front cheek with two guide rollers on the beam's face
    const cheek = { x: x - 8, y: by + 5, w: 16, d: 1.2, r: 0.4 };
    out += solid(K.slabOf(cheek, 81.4, 8.6, P, 2), { tone: "mid", crease: "none" });
    for (const dx of [-4.6, 4.6]) {
      out += line(K.sideRing([x + dx, by + 6.2, 84.4], 2, "y", P, 18), { tone: "lo" });
      out += K.dotsSvg([at([x + dx, by + 6.2, 84.4])], { size: 0.42 });
    }
    // arm reaching forward over the stacks
    out += solid(K.slabOf({ x: x - 2.6, y: by + 5, w: 5.2, d: -by - 5 + 3, r: 0.8 }, GEO.ARM_Z, 3, P, 2, 0.3), { tone: "mid" });
    out += solid(K.cylinder(x, 0, 2.2, GEO.ARM_Z - 1.6, 1.6, P, 18), { tone: "mid" });
    put(LAYER * 1 + depth(x, by), out);
  }

  // ---- the wall: piers and gates, far to near ----
  {
    for (let i = 0; i < 4; i++) {
      const cx = GEO.X[i];
      const drop = S.drops[i];
      const top = GEO.TOP - drop;
      const plan = { x: cx - GEO.GW, y: -GEO.WY, w: GEO.GW * 2, d: GEO.WY * 2, r: 0.6 };
      const lit = i === S.main;
      let out = solid(K.slabOf(plan, 0, top, P, 2, 0.5), {
        tone: lit ? "hi" : "mid", lit, crease: lit ? "lo" : "faint",
        inner: line(K.sideSeam(plan, Math.min(top - 0.01, 8), P, 2), { tone: "faint" }),
      });
      out += line(K.planOutline(K.insetPlan(plan, 2.4), top, P, 2), { tone: lit ? "lit" : "faint" });
      // shear pins through the gate face
      for (const dx of [-11, 11]) {
        const pz = top - 9;
        if (pz > 1.8) {
          out += line(K.sideRing([cx + dx, GEO.WY, pz], 1.5, "y", P, 16), { tone: S.states[i] === "breach" ? "faint" : "lo" });
          out += K.dotsSvg([at([cx + dx, GEO.WY, pz])], { size: 0.42 });
        }
      }
      put(LAYER * 2 + depth(cx, 0), out);
    }
    for (const statics of S.piers || []) put(LAYER * 2 + statics.key, statics.svg);
  }

  // ---- platens, spigots and disc stacks on the gates ----
  for (let i = 0; i < 4; i++) {
    const cx = GEO.X[i];
    const top = GEO.TOP - S.drops[i];
    let out = `<path class="iso-halo" d="${K.cylinder(cx, 0, 10, top, 0.1, P, 32).fill}" style="filter:blur(2px)"/>`;
    out += solid(K.cylinder(cx, 0, 9, top, GEO.PLATEN, P, 40, 0.4), { tone: "mid" });
    const base = top + GEO.PLATEN;
    if (S.stacks[i] === 0) out += solid(K.cylinder(cx, 0, 1.6, base, 4, P, 16), { tone: "mid", crease: "none" });
    for (let d = 0; d < S.stacks[i]; d++) {
      const z = base + d * GEO.DISC;
      out += solid(K.cylinder(cx, 0, GEO.DR, z, GEO.DISC, P, 36, 0.3), { tone: "mid", inner: line(K.sideArc(cx, 0, GEO.DR, z + 1.5, P, 24), { tone: "faint" }) });
    }
    put(LAYER * 3 + depth(cx, 0), out);
  }

  // ---- hook rod, grab and the carried discs ----
  {
    const x = S.lx;
    const grab = S.hz;                  // grab underside
    let out = "";
    const pack = grab - S.carry * GEO.DISC;
    for (let d = 0; d < S.carry; d++) {
      const z = pack + d * GEO.DISC;
      out += solid(K.cylinder(x, 0, GEO.DR, z, GEO.DISC, P, 36, 0.3), { tone: "mid", inner: line(K.sideArc(x, 0, GEO.DR, z + 1.5, P, 24), { tone: "faint" }) });
    }
    out += solid(K.cylinder(x, 0, 4.2, grab, 2.4, P, 28, 0.3), { tone: "mid" });
    out += line(K.knurl(x, 0, 4.2, grab, grab + 2.4, 22, P, 0.3), { tone: "lo" });
    out += solid(K.cylinder(x, 0, 0.8, grab + 2.4, GEO.ARM_Z - 1.6 - grab - 2.4, P, 12), { tone: "mid", crease: "none" });
    put(LAYER * 4 + depth(x, 0), out);
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}
