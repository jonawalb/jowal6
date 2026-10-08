// The 3D view: a textured Earth, the orbital layers drawn around it, and one or more dots per system.
// Earth radius = 1 scene unit; the equatorial plane is x–z (y is north).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LAYER, COUNTRY, radius, fmtKm, homeLayers } from './common.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LEO_SECONDS = 40;            // one ~95-minute LEO orbit plays in 40 s; everything else keeps Kepler's ratios
const DAY_SECONDS = LEO_SECONDS * 1440 / 95;
const MOLNIYA = { peri: 600, apo: 39700, inc: 63.4 };
// HEO is a family of orbits, not one track: Molniya-type (12 h) and Tundra-type (24 h) with varied heights and tilts.
const HEO_FAMILIES = [
  { peri: [500, 1500], apo: [38000, 40500], inc: [62, 65], period: 0.5 },     // Molniya-type
  { peri: [18000, 25000], apo: [46000, 53000], inc: [57, 64], period: 1 },   // Tundra-type
];
const TILT = 0.42;                 // camera elevation above the equator, radians

// Fit radius per layer (scene units) under each scale, used when the camera zooms to a layer.
const FIT = {
  compressed: { all: 3.3, ground: 1.25, spectrum: 1.25, vleo: 1.45, leo: 1.95, meo: 2.75, geo: 2.85, heo: 2.95, cislunar: 3.9 },
  true: { all: 7.4, ground: 1.15, spectrum: 1.15, vleo: 1.08, leo: 1.36, meo: 6.8, geo: 6.9, heo: 7.4, cislunar: 63 },
};

const deg = Math.PI / 180;
const latLon = (lat, lon, r) => new THREE.Vector3(
  r * Math.cos(lat * deg) * Math.cos(lon * deg), r * Math.sin(lat * deg), -r * Math.cos(lat * deg) * Math.sin(lon * deg));

// Small deterministic random so the layout is stable across reloads.
function rng(seed) { let s = 0; for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

// True altitude along a Molniya orbit at eccentric anomaly E.
function molniyaAlt(E, o = MOLNIYA) {
  const rp = 6371 + o.peri, ra = 6371 + o.apo, a = (rp + ra) / 2, e = (ra - rp) / (ra + rp);
  const r = a * (1 - e * Math.cos(E));
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  return { alt: r - 6371, nu };
}

function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.beginPath(); g.arc(32, 32, 26, 0, 7); g.fillStyle = '#fff'; g.fill();
  g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.55)'; g.stroke();
  return new THREE.CanvasTexture(c);
}

export function createGlobe(host, { onPick, onHover }) {
  const W = () => host.clientWidth, H = () => host.clientHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W(), H());
  host.appendChild(renderer.domElement);
  const labels = document.createElement('div'); labels.className = 'sl-labels'; labels.setAttribute('aria-hidden', 'true');
  host.appendChild(labels);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05080d');
  const camera = new THREE.PerspectiveCamera(40, W() / H(), 0.01, 2000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !REDUCED; controls.dampingFactor = 0.08; controls.enablePan = false; controls.minDistance = 1.15;
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); camera.add(sun); sun.position.set(-3, 2, 1); scene.add(camera);

  // Stars
  { const g = new THREE.BufferGeometry(), p = [], r = rng('stars');
    for (let i = 0; i < 1400; i++) { const v = new THREE.Vector3(r() - .5, r() - .5, r() - .5).normalize().multiplyScalar(900); p.push(v.x, v.y, v.z); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8a96a8, size: 1.3, sizeAttenuation: false }))); }

  // Earth (rotates; ground dots and GEO dots ride on it)
  const earth = new THREE.Group(); scene.add(earth);
  const tex = new THREE.TextureLoader().load('img/earth.jpg', () => render());
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshPhongMaterial({ map: tex, shininess: 12, specular: 0x222233 }));
  earth.add(globe);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.025, 64, 48), new THREE.MeshBasicMaterial({ color: 0x5aa0ff, transparent: true, opacity: 0.08, side: THREE.BackSide })));

  const shells = new THREE.Group(); scene.add(shells);
  const items = new THREE.Group(); scene.add(items);
  const arcs = new THREE.Group(); scene.add(arcs);
  const sprite = dotTexture();

  let scale = 'compressed', focus = 'all', threatLayers = new Set(), dots = [], selected = null, labelEls = [];
  let pts = null, selPts = null, colorOf = () => '#ffffff', list = [];

  const ringMat = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
  const lineMat = (color, opacity) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  function circle(r, color, opacity, n = 192) {
    const p = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; p.push(new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a))); }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), lineMat(color, opacity));
  }
  function molniyaPoint(E, s = scale, o = MOLNIYA) {
    const { alt, nu } = molniyaAlt(E, o), r = radius(alt, s), w = o.w ?? Math.PI / 2;   // apogee over the north
    const v = new THREE.Vector3(r * Math.cos(nu + w), 0, r * Math.sin(nu + w));
    return v.applyAxisAngle(new THREE.Vector3(1, 0, 0), o.inc * deg);
  }

  // Layer shells, rebuilt when the scale changes.
  function buildShells() {
    shells.clear(); labelEls.forEach(e => e.el.remove()); labelEls = [];
    const add = (id, obj) => { obj.userData.layer = id; shells.add(obj); return obj; };
    const band = (id, lo, hi, op) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(radius(lo, scale), radius(hi, scale), 160, 1), ringMat(0x6fa8ff, op));
      m.rotation.x = -Math.PI / 2; m.userData.baseOpacity = op; add(id, m);
      add(id, circle(radius(hi, scale), 0x9fc3ff, 0.35)).userData.baseOpacity = 0.35;
    };
    band('vleo', 160, 450, 0.10); band('leo', 450, 2000, 0.07); band('meo', 2000, 35586, 0.035);
    add('meo', circle(radius(20200, scale), 0x9fc3ff, 0.25)).userData.baseOpacity = 0.25;
    const g = add('geo', circle(radius(35786, scale), 0xffd27a, 0.8)); g.userData.baseOpacity = 0.8;
    { const m = new THREE.Mesh(new THREE.RingGeometry(radius(35486, scale), radius(36086, scale), 200, 1), ringMat(0xffd27a, 0.12));
      m.rotation.x = -Math.PI / 2; m.userData.baseOpacity = 0.12; add('geo', m); }
    // HEO zone: a spread of representative tracks, one brighter Molniya and one brighter Tundra.
    { const r = rng('heo-tracks');
      for (let k = 0; k < 10; k++) {
        const f = HEO_FAMILIES[k % 2], j = (lo, hi) => lo + r() * (hi - lo);
        const o = { peri: j(...f.peri), apo: j(...f.apo), inc: j(...f.inc), w: Math.PI / 2 + (r() - .5) * 0.5 };
        const p = []; for (let i = 0; i <= 200; i++) p.push(molniyaPoint(i / 200 * Math.PI * 2, scale, o).applyAxisAngle(new THREE.Vector3(0, 1, 0), k * 0.63));
        const op = k < 2 ? 0.6 : 0.16;
        add('heo', new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), lineMat(0xd99cff, op))).userData.baseOpacity = op;
      } }
    const rm = radius(384400, scale);
    add('cislunar', circle(rm, 0xc9d1dc, 0.4, 360)).userData.baseOpacity = 0.4;
    const moon = add('cislunar', new THREE.Mesh(new THREE.SphereGeometry(scale === 'true' ? 0.273 : 0.12, 32, 24), new THREE.MeshPhongMaterial({ color: 0xb9bcc2 })));
    moon.position.set(-rm, 0, 0); moon.userData.baseOpacity = 1;

    // Distance labels on the right of the view, layer names on the left.
    const dist = [[450, 'vleo'], [2000, 'leo'], [20200, 'meo', 'GPS · 20,200 km'], [35786, 'geo'], [384400, 'cislunar', 'Moon · 384,400 km']];
    // Labels sit at fixed points on their rings, so they turn with the globe: names on one side, distances on the other.
    dist.forEach(([km, id, txt], i) => labelEls.push(mkLabel('d', id, radius(km, scale), txt || fmtKm(km), -20 + i * 9)));
    for (const [id, km, a] of [['vleo', 300, 122], ['leo', 1150, 140], ['meo', 9000, 160], ['geo', 35786, 178]])
      labelEls.push(mkLabel('n ln-' + id, id, radius(km, scale), LAYER[id].short, a));
    labelEls.push({ el: mkEl('n ln-heo', 'HEO'), id: 'heo', pos: () => molniyaPoint(Math.PI) });
  }
  function mkEl(cls, txt) { const el = document.createElement('span'); el.className = 'sl-lab ' + cls.split(' ').map((c, i) => i ? c : 'sl-lab-' + c).join(' '); el.textContent = txt; labels.appendChild(el); return el; }
  function mkLabel(cls, id, r, txt, angleDeg) {
    const p = new THREE.Vector3(r * Math.cos(angleDeg * deg), 0, r * Math.sin(angleDeg * deg));
    return { el: mkEl(cls, txt), id, pos: () => p };
  }

  // One dot per satellite group; ground systems sit at their country's centroid (country level only).
  function buildDots() {
    dots = [];
    for (const it of list) {
      const r = rng(it.id);
      for (const L of homeLayers(it)) {
        const c = COUNTRY[it.country];
        if (L === 'ground' || L === 'spectrum') {
          const lat = c?.lat ?? (r() * 100 - 50), lon = c?.lon ?? (r() * 360 - 180);
          dots.push({ it, layer: L, ground: true, base: latLon(lat + (r() - .5) * 7, lon + (r() - .5) * 9, 1.012) });
          continue;
        }
        const n = it.dots ?? (it.kind === 'enabler' ? 3 : 1);
        for (let k = 0; k < n; k++) {
          const d = { it, layer: L, phase: r() * Math.PI * 2 };
          if (L === 'geo') {
            const lon = (c?.lon ?? r() * 360) + (k - (n - 1) / 2) * 22 + (r() - .5) * 10;
            Object.assign(d, { geo: true, base: latLon((r() - .5) * 8, lon, 1) });
          } else if (L === 'heo') {
            const f = HEO_FAMILIES[r() < 0.7 ? 0 : 1], j = (lo, hi) => lo + r() * (hi - lo);
            Object.assign(d, { heo: true, raan: r() * Math.PI * 2, period: f.period,
              orbit: { peri: j(...f.peri), apo: j(...f.apo), inc: j(...f.inc), w: Math.PI / 2 + (r() - .5) * 0.5 } });
          } else {
            const lay = LAYER[L], alt = L === 'meo' ? 19100 + r() * 4100 : L === 'cislunar' ? 300000 + r() * 84400 : lay.lo + r() * (lay.hi - lay.lo);
            Object.assign(d, { alt, inc: (L === 'cislunar' ? 5 : 30 + r() * 68) * deg, raan: r() * Math.PI * 2,
              period: LEO_SECONDS * Math.pow((6371 + alt) / 6871, 1.5) });
          }
          dots.push(d);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(dots.length * 3), 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(dots.length * 3), 3));
    items.clear();
    pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 9 * renderer.getPixelRatio(), sizeAttenuation: false, vertexColors: true, map: sprite, alphaTest: 0.4, transparent: true }));
    items.add(pts);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(dots.length * 3), 3));
    selPts = new THREE.Points(sg, new THREE.PointsMaterial({ size: 17 * renderer.getPixelRatio(), sizeAttenuation: false, color: 0xffffff, map: sprite, alphaTest: 0.4, transparent: true, opacity: 0.9 }));
    selPts.renderOrder = -1; items.add(selPts);
    paint(); place(0);
  }

  // ---- Background population: every catalogued satellite / debris object, drawn small. ----
  // Orbit shape and tilt come from the catalog; orientation and position along the orbit are random.
  let pop = null, popPts = null, popVis = [];
  function setPopulation(P) {
    const S5 = 5, n = P.length / S5, r = rng('population');
    pop = { n, peri: new Float32Array(n), apo: new Float32Array(n), e: new Float32Array(n), a: new Float32Array(n),
      ci: new Float32Array(n), si: new Float32Array(n), co: new Float32Array(n), so: new Float32Array(n),
      w: new Float32Array(n), m0: new Float32Array(n), per: new Float32Array(n), c: new Int8Array(n), m: new Int8Array(n), layer: [] };
    for (let i = 0; i < n; i++) {
      const pe = P[i * S5], ap = P[i * S5 + 1], inc = P[i * S5 + 2] / 10 * deg, raan = r() * Math.PI * 2;
      const a = 6371 + (pe + ap) / 2;
      pop.peri[i] = pe; pop.apo[i] = ap; pop.a[i] = a; pop.e[i] = (ap - pe) / (ap + pe + 2 * 6371);
      pop.ci[i] = Math.cos(inc); pop.si[i] = Math.sin(inc); pop.co[i] = Math.cos(raan); pop.so[i] = Math.sin(raan);
      pop.w[i] = r() * Math.PI * 2; pop.m0[i] = r() * Math.PI * 2; pop.per[i] = LEO_SECONDS * Math.pow(a / 6871, 1.5);
      pop.c[i] = P[i * S5 + 3]; pop.m[i] = P[i * S5 + 4];
      const mean = (pe + ap) / 2;
      pop.layer.push(ap - pe > 10000 ? 'heo' : mean < 450 ? 'vleo' : mean < 2000 ? 'leo' : mean < 34000 ? 'meo' : mean < 38500 ? 'geo' : 'far');
    }
  }
  // keep(i, country, layer, mission) decides which objects show; color(i) gives a CSS color string.
  function filterPopulation(keep, color) {
    if (!pop) return;
    popVis = []; for (let i = 0; i < pop.n; i++) if (keep(i, pop.c[i], pop.layer[i], pop.m[i])) popVis.push(i);
    if (popPts) { scene.remove(popPts); popPts.geometry.dispose(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(popVis.length * 3), 3));
    const col = new Float32Array(popVis.length * 3), c = new THREE.Color(), cache = {};
    popVis.forEach((i, k) => { const key = pop.c[i]; c.set(cache[key] ??= color(key)); col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; });
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    popPts = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2 * renderer.getPixelRatio(), sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false }));
    popPts.renderOrder = -2; scene.add(popPts);
    placePop(simT); render();
  }
  function placePop(t) {
    if (!popPts) return;
    const pos = popPts.geometry.attributes.position.array;
    for (let k = 0; k < popVis.length; k++) {
      const i = popVis[k], e = pop.e[i], M = pop.m0[i] + t / pop.per[i] * 2 * Math.PI;
      let nu, rk;
      if (e < 0.01) { nu = M; rk = pop.a[i]; }
      else { let E = M; for (let j = 0; j < 5; j++) E = M + e * Math.sin(E);
        rk = pop.a[i] * (1 - e * Math.cos(E)); nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2)); }
      const R = radius(rk - 6371, scale), u = pop.w[i] + nu;
      const x0 = R * Math.cos(u), z0 = R * Math.sin(u), y1 = -z0 * pop.si[i], z1 = z0 * pop.ci[i];
      pos[k * 3] = x0 * pop.co[i] + z1 * pop.so[i]; pos[k * 3 + 1] = y1; pos[k * 3 + 2] = -x0 * pop.so[i] + z1 * pop.co[i];
    }
    popPts.geometry.attributes.position.needsUpdate = true;
    popPts.geometry.computeBoundingSphere();
  }

  function paint() {
    if (!pts) return;
    const col = pts.geometry.attributes.color, c = new THREE.Color();
    dots.forEach((d, i) => { c.set(colorOf(d.it)); col.setXYZ(i, c.r, c.g, c.b); });
    col.needsUpdate = true;
  }

  const tmp = new THREE.Vector3();
  function dotPos(d, t, out) {
    if (d.ground || d.geo) {
      const rr = d.geo ? radius(35786, scale) : 1;
      return out.copy(d.base).multiplyScalar(d.geo ? rr : 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), earth.rotation.y);
    }
    if (d.heo) {
      const o = d.orbit, e = (o.apo - o.peri) / (o.apo + o.peri + 2 * 6371);
      const M = d.phase + t / (DAY_SECONDS * d.period) * 2 * Math.PI;   // mean anomaly; Molniya 12 h, Tundra 24 h
      let E = M; for (let k = 0; k < 6; k++) E = M + e * Math.sin(E);
      return out.copy(molniyaPoint(E, scale, o)).applyAxisAngle(new THREE.Vector3(0, 1, 0), d.raan);
    }
    const u = d.phase + t / d.period * 2 * Math.PI, r = radius(d.alt, scale);
    out.set(r * Math.cos(u), 0, r * Math.sin(u));
    out.applyAxisAngle(new THREE.Vector3(1, 0, 0), d.inc).applyAxisAngle(new THREE.Vector3(0, 1, 0), d.raan);
    return out;
  }

  function place(t) {
    if (!pts) return;
    earth.rotation.y = t / DAY_SECONDS * 2 * Math.PI;
    const pos = pts.geometry.attributes.position, sp = selPts.geometry.attributes.position;
    let j = 0;
    dots.forEach((d, i) => {
      dotPos(d, t, tmp); pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
      if (selected && d.it === selected) sp.setXYZ(j++, tmp.x, tmp.y, tmp.z);
    });
    selPts.geometry.setDrawRange(0, j);
    pos.needsUpdate = true; sp.needsUpdate = true;
    pts.geometry.computeBoundingSphere();
  }

  // Reach arc for a selected weapon: from its country up to the highest layer it can attack.
  function drawReach() {
    arcs.clear();
    if (!selected?.reach?.length) return;
    const c = COUNTRY[selected.country]; if (!c?.lat) return;
    const top = Math.max(...selected.reach.map(l => l === 'geo' ? 35786 : l === 'cislunar' ? 384400 : LAYER[l]?.hi ?? 0));
    const start = latLon(c.lat, c.lon, 1.01).applyAxisAngle(new THREE.Vector3(0, 1, 0), earth.rotation.y);
    const end = start.clone().normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.5).multiplyScalar(radius(top, scale));
    const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(radius(top, scale) * 1.08);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    arcs.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(64)), lineMat(0xff6b5e, 0.95)));
    const ring = circle(radius(top, scale), 0xff6b5e, 0.5); arcs.add(ring);
  }

  function shellStyle() {
    shells.children.forEach(o => {
      const id = o.userData.layer, on = focus === 'all' || focus === id || (focus === 'heo' && id === 'heo');
      const base = o.userData.baseOpacity ?? 0.3;
      o.material.opacity = on ? base * (threatLayers.has(id) ? 2.2 : 1) : base * 0.18;
      if (o.material.color && o.isMesh && o.geometry.type === 'RingGeometry') o.material.color.set(threatLayers.has(id) ? 0xff6b5e : 0x6fa8ff);
    });
    labelEls.forEach(l => l.el.classList.toggle('dim', !(focus === 'all' || focus === l.id)));
  }

  let camTween = null;
  function fit(id, instant) {
    const R = FIT[scale][id] ?? FIT[scale].all, dist = R / Math.tan(20 * deg) * 1.08;
    const dir = camera.position.clone().normalize();
    if (!camera.position.lengthSq()) dir.set(0.55, Math.sin(TILT), 0.8).normalize();
    dir.y = Math.max(dir.y, 0.2); dir.normalize();
    const to = dir.multiplyScalar(Math.max(dist, 1.3));
    controls.maxDistance = FIT[scale].cislunar / Math.tan(20 * deg) * 1.4;
    if (instant || REDUCED) { camera.position.copy(to); camTween = null; }
    else camTween = { from: camera.position.clone(), to, t0: performance.now() };
  }

  function project(v) {
    const p = v.clone().project(camera);
    return { x: (p.x + 1) / 2 * W(), y: (1 - p.y) / 2 * H(), front: p.z < 1 };
  }
  const occluded = v => {   // hidden behind the Earth?
    const c = camera.position, d = v.clone().sub(c), L = d.length(); d.normalize();
    const tc = -c.dot(d); if (tc < 0 || tc > L) return false;
    return c.clone().add(d.multiplyScalar(tc)).length() < 0.99;
  };

  function updateLabels() {
    for (const l of labelEls) {
      const wp = l.pos(), s = project(wp);
      l.el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
      l.el.style.visibility = s.front && !occluded(wp) && s.x > -40 && s.x < W() + 40 && s.y > -20 && s.y < H() + 20 ? 'visible' : 'hidden';
    }
  }

  function pick(ev) {
    const rect = renderer.domElement.getBoundingClientRect(), x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    const pos = pts?.geometry.attributes.position; if (!pos) return null;
    let best = null, bd = 14 * 14;
    for (let i = 0; i < dots.length; i++) {
      tmp.fromBufferAttribute(pos, i);
      if (occluded(tmp)) continue;
      const s = project(tmp); const dd = (s.x - x) ** 2 + (s.y - y) ** 2;
      if (dd < bd && s.front) { bd = dd; best = dots[i].it; }
    }
    return best;
  }
  let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) onPick(pick(e));
    down = null;
  });
  renderer.domElement.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && !e.buttons) onHover(pick(e), e); });
  renderer.domElement.addEventListener('pointerleave', () => onHover(null));

  const clock = new THREE.Clock(); let simT = 0, needs = true;
  controls.addEventListener('change', () => { needs = true; });
  function render() { needs = true; }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!REDUCED) { simT += clock.getDelta(); needs = true; }
    if (camTween) {
      const k = Math.min(1, (now - camTween.t0) / 900), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      camera.position.lerpVectors(camTween.from, camTween.to, e); if (k >= 1) camTween = null; needs = true;
    }
    if (!needs) return;
    controls.update(); place(simT); placePop(simT); if (selected?.reach) drawReach(); updateLabels();
    renderer.render(scene, camera); needs = false;
  }
  new ResizeObserver(() => { camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H()); render(); }).observe(host);

  buildShells(); fit('all', true); requestAnimationFrame(frame);

  return {
    setPopulation, filterPopulation,
    setItems(next, colorFn) { list = next; colorOf = colorFn; buildDots(); render(); },
    recolor(colorFn) { colorOf = colorFn; paint(); render(); },
    setScale(s) { scale = s; buildShells(); shellStyle(); fit(focus, false); render(); },
    focusLayer(id) { focus = id; shellStyle(); fit(id, false); render(); },
    setThreatLayers(set) { threatLayers = set; shellStyle(); render(); },
    select(it) { selected = it; drawReach(); place(simT); render(); },
  };
}
