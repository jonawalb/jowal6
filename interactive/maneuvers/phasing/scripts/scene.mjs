// The moving half of the figure: the shift lever in its gate, the clutch's pressure
// plate, diaphragm, release collar and fork, and the index carriage beside the gear
// stack. Rebuilt per frame. Written against the kit as a parameter (K) so build.mjs
// (Node) and the page (inlined kit) run the same code. build.mjs inlines this file
// with `export` stripped.

export const GEO = {
  GATE_TOP: 10,                // top of the gate block
  CL: [95, -22],               // clutch axis
  GS: [-98, -24],              // gear stack axis
  POST: [-66, -24],            // index post
  GEAR_Z0: 7,                  // bottom of the Phase 0 gear
  GEAR_STEP: 7,                // gear pitch up the stack
  GEAR_H: 5,                   // gear thickness
  GAP_OUT: 4,                  // clutch lift when disengaged
};
export const gearR = (effort) => 7 + 12 * effort;
export const gearZ = (i) => GEO.GEAR_Z0 + GEO.GEAR_STEP * i;

export function scene(K, P, S) {
  const items = [];
  const put = (key, svg) => items.push({ key, svg });
  const depth = (x, y, z = 0) => K.depthOf([x, y, z], P);
  const at = (p) => K.iso(p, P);
  const solid = (paths, style) => K.solidSvg(paths, style);
  const line = (d, style) => K.lineSvg(d, style);
  const cyl = (x, y, r, z, h, style, steps = 32, bevel = 0) => solid(K.cylinder(x, y, r, z, h, P, steps, bevel), style);

  // ---- shift lever: boot, rod and the lit knob, riding in the gate ----
  {
    const x = S.lx, y = S.ly, Z = GEO.GATE_TOP;
    let s = `<path class="iso-halo" d="${K.cylinder(x, y, 6.2, Z, 0.1, P, 28).fill}" style="filter:blur(2px)"/>`;
    s += cyl(x, y, 5.4, Z, 1.2, { tone: "mid" }, 28, 0.3);
    s += cyl(x, y, 4.4, Z + 1.2, 1.6, { tone: "lo", crease: "none" }, 28);
    s += cyl(x, y, 3.4, Z + 2.8, 1.6, { tone: "lo", crease: "none" }, 24);
    s += cyl(x, y, 2.4, Z + 4.4, 1.4, { tone: "lo", crease: "none" }, 20);
    s += cyl(x, y, 1.3, Z + 5.8, 25, { tone: "mid", crease: "none" }, 14);
    s += cyl(x, y, 2.2, Z + 30.4, 1.4, { tone: "mid" }, 18);
    s += cyl(x, y, 4.6, Z + 31.8, 7, { tone: "lit", lit: true, crease: "lo" }, 32, 0.8);
    s += line(K.knurl(x, y, 4.6, Z + 33, Z + 36.6, 30, P, 0.3), { tone: "lo" });
    s += line(K.sideArc(x, y, 4.6, Z + 33, P, 24), { tone: "lo" }) + line(K.sideArc(x, y, 4.6, Z + 36.6, P, 24), { tone: "lo" });
    s += line(K.ring(x, y, 2.6, Z + 38.8, P, 24), { tone: "lit" });
    put(depth(x, y), s);
  }

  // ---- clutch: friction disc, pressure plate, diaphragm, collar, shaft, nut ----
  {
    const [cx, cy] = GEO.CL;
    const g = S.gap;
    let s = cyl(cx, cy, 14, 11, 1.6, { tone: "lo" }, 64);
    const pz = 12.6 + g;
    s += cyl(cx, cy, 15, pz, 4, { tone: "hi", crease: "lo" }, 72, 0.5);
    s += line(K.sideArc(cx, cy, 15, pz + 2, P, 48), { tone: "faint" });
    // six bolts on the plate face turn with the drive
    const bolts = [];
    for (let i = 0; i < 6; i++) {
      const a = S.phi + (i * Math.PI) / 3;
      bolts.push([cx + 12.4 * Math.cos(a), cy + 12.4 * Math.sin(a)]);
    }
    s += line(bolts.map(([x, y]) => K.ring(x, y, 1.1, pz + 4, P, 12)).join(""), { tone: "lo" });
    s += K.dotsSvg(bolts.map(([x, y]) => at([x, y, pz + 4])), { size: 0.42 });
    // diaphragm spring: two dished steps, with finger slots turning on the top step
    s += cyl(cx, cy, 10.6, pz + 4, 1, { tone: "mid" }, 56);
    s += cyl(cx, cy, 8, pz + 5, 1, { tone: "mid" }, 48);
    const fingers = [];
    for (let i = 0; i < 12; i++) {
      const a = S.phi + (i * Math.PI) / 6;
      fingers.push(K.lineOnTop([cx + 4.6 * Math.cos(a), cy + 4.6 * Math.sin(a)], [cx + 8 * Math.cos(a), cy + 8 * Math.sin(a)], pz + 6, P));
    }
    s += line(fingers.join(""), { tone: "lo" });
    // release collar on the shaft
    s += cyl(cx, cy, 4.6, pz + 6, 4, { tone: "mid" }, 28, 0.4);
    s += line(K.sideArc(cx, cy, 4.6, pz + 8, P, 20), { tone: "faint" });
    s += cyl(cx, cy, 2.4, pz + 10, 34 - (pz + 10), { tone: "mid", crease: "none" }, 16);
    s += cyl(cx, cy, 3.6, 34, 3.4, { tone: "mid" }, 6, 0.3);
    s += line(K.ring(cx, cy, 1.6, 37.4, P, 14), { tone: "lo" });
    put(depth(cx, cy), s);

    // release fork: an arm from the slotted post to the collar, lifting with it
    const fz = pz + 7;
    const post = (z0, z1) => solid(K.slabOf({ x: cx + 19, y: cy - 3, w: 5, d: 6, r: 0.8 }, z0, z1 - z0, P, 3, 0.3), { tone: "mid" });
    let f = `<path class="iso-halo" d="${K.slabOf({ x: cx + 18, y: cy - 4, w: 7, d: 8, r: 1 }, 0, 0.1, P).fill}" style="filter:blur(2px)"/>`;
    f += solid(K.slabOf({ x: cx + 17.5, y: cy - 4.5, w: 8, d: 9, r: 1 }, 0, 2, P, 3, 0.3), { tone: "mid" });
    f += post(2, fz);
    f += solid(K.slabOf({ x: cx + 4.4, y: cy - 2, w: 18.6, d: 4, r: 0.8 }, fz, 2.2, P, 3, 0.3), { tone: "mid" });
    f += K.dotsSvg([at([cx + 20.5, cy, fz + 2.2])], { size: 0.45 });
    f += line(K.lineOnTop([cx + 4.6, cy], [cx + 19, cy], fz + 2.2, P), { tone: "faint" });
    f += post(fz + 2.2, 36) + K.dotsSvg([at([cx + 21.5, cy, 36])], { size: 0.45 });
    put(depth(cx + 14, cy) + 0.5, f);
  }

  // ---- index carriage on its post, pointing at the gear for the phase ----
  {
    const [px, py] = GEO.POST;
    const z = S.forkZ;
    const post = (z0, z1) => solid(K.slabOf({ x: px - 2, y: py - 2.5, w: 4, d: 5, r: 0.6 }, z0, z1 - z0, P, 3, 0.2), { tone: "mid", crease: "none" });
    let s = `<path class="iso-halo" d="${K.slabOf({ x: px - 6, y: py - 6, w: 12, d: 12, r: 1.5 }, 0, 0.1, P).fill}" style="filter:blur(2px)"/>`;
    s += solid(K.slabOf({ x: px - 5, y: py - 5, w: 10, d: 10, r: 1.2 }, 0, 3, P, 3, 0.4), { tone: "mid" });
    s += K.dotsSvg([[px - 3.5, py - 3.5], [px + 3.5, py - 3.5], [px - 3.5, py + 3.5], [px + 3.5, py + 3.5]].map(([x, y]) => at([x, y, 3])), { size: 0.42 });
    s += post(3, z - 2);
    s += solid(K.slabOf({ x: px - 4, y: py - 5, w: 8, d: 10, r: 1 }, z - 2, 7, P, 3, 0.4), { tone: "mid" });
    s += K.dotsSvg([at([px + 2, py - 3, z + 5]), at([px + 2, py + 3, z + 5])], { size: 0.42 });
    s += solid(K.extrude([[px - 4, py - 2], [px - 4, py + 2], [px - 9.8, py + 0.6], [px - 9.8, py - 0.6]], z + 1.4, 1.6, P), { tone: "hi", crease: "lo" });
    const kx = px + 5.4;
    s += solid(K.slabOf({ x: px + 4, y: py - 1.2, w: 2, d: 2.4, r: 0.5 }, z + 1, 2, P, 2), { tone: "mid", crease: "none" });
    s += cyl(kx + 1.4, py, 2, z + 0.4, 3.2, { tone: "mid" }, 18);
    s += line(K.knurl(kx + 1.4, py, 2, z + 0.4, z + 3.6, 14, P, 0.25), { tone: "lo" });
    s += post(z + 5, 52) + solid(K.slabOf({ x: px - 2.6, y: py - 3.1, w: 5.2, d: 6.2, r: 0.8 }, 52, 1.6, P, 3, 0.3), { tone: "mid" });
    put(depth(px, py) + 1, s);
  }

  for (const extra of S.statics || []) put(extra.key, extra.svg);
  items.sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

// The dial needle for an effort e in 0..1: a 270 degree sweep, kit tick convention.
export function needle(K, P, D, e) {
  const a = -0.75 * Math.PI + e * 1.5 * Math.PI;
  const sx = Math.sin(a), sy = -Math.cos(a);
  return K.lineOnTop([D.x - sx * 3, D.y - sy * 3], [D.x + sx * (D.r - 3.4), D.y + sy * (D.r - 3.4)], D.top + 0.2, P);
}
