// Eye-level 360° panorama viewer (canvas, no WebGL). Images are pre-rendered from elevation data
// by scripts/panorama.py: equirectangular strip, 0 deg = north, clockwise; rows from `top` to `bottom` deg.
import { esc } from './util.js';

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export class PanoViewer {
  constructor(host, D) {
    this.D = D;
    this.el = document.createElement('div');
    this.el.className = 'pano';
    this.el.hidden = true;
    this.el.innerHTML = `<canvas aria-label="Eye-level view"></canvas>
      <div class="pano-bar"><span class="pano-title"></span><span class="pano-hint">Drag to look around · scroll or pinch to zoom · arrow keys work too</span>
      <button class="btn ghost pano-close" aria-label="Close eye-level view">Back to map</button></div>
      <div class="pano-note"></div>`;
    host.append(this.el);
    this.cv = this.el.querySelector('canvas');
    this.ctx = this.cv.getContext('2d');
    this.el.querySelector('.pano-close').addEventListener('click', () => this.close());
    this.bind();
    new ResizeObserver(() => this.draw()).observe(this.el);
  }

  async open(id, { heading, date, title, onClose } = {}) {
    this.onClose = onClose;
    this.date = date;
    const base = 'data/pano/';
    const [meta, img] = await Promise.all([
      fetch(`${base}${id}.json`).then((r) => r.json()),
      new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = `${base}${id}.webp`; }),
    ]);
    this.meta = meta; this.img = img;
    this.yaw = heading ?? meta.heading ?? 0;
    this.k = 0; // set on first draw
    this.pitch = null;
    const P = this.D.placeIndex;
    for (const l of meta.labels) { const p = P[l.id]; l.minor = !!(p?.minor || p?.small); }
    this.el.querySelector('.pano-title').textContent = title || '';
    this.el.querySelector('.pano-note').innerHTML = `Eye ${meta.eye_m - meta.ground_m} m above the ground (${Math.round(meta.ground_m)} m). Terrain from Copernicus elevation data with today's town removed; colours are schematic, not a photograph. Solid labels are in direct line of sight; hollow ones are hidden by the ground.`;
    this.el.hidden = false;
    this.cv.focus?.();
    this.draw();
  }

  close() { this.el.hidden = true; this.onClose?.(); }

  setDate(d) { this.date = d; if (!this.el.hidden) this.draw(); }

  fitK() { const r = this.cv.getBoundingClientRect(); return Math.max(r.width / this.img.width, r.height / this.img.height); }

  draw() {
    if (this.el.hidden || !this.img) return;
    const r = this.el.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const W = Math.round(r.width), H = Math.round(r.height);
    if (this.cv.width !== W * dpr || this.cv.height !== H * dpr) { this.cv.width = W * dpr; this.cv.height = H * dpr; this.cv.style.width = `${W}px`; this.cv.style.height = `${H}px`; }
    const c = this.ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const kMin = this.fitK();
    if (!this.k) this.k = Math.max(kMin, W / (40 / this.meta.degPerPx)); // open at ~40 deg wide, like a normal lens
    if (this.k < kMin) this.k = kMin;
    const k = this.k, m = this.meta, img = this.img;
    const dpp = m.degPerPx;
    // source window
    const sw = W / k, sh = H / k;
    const cx = ((this.yaw % 360) + 360) % 360 / dpp; // centre column
    const maxPitchPx = Math.max(0, (img.height - sh) / 2);
    if (this.pitch === null) this.pitch = (img.height - sh) / 2 - (((m.top + 2.5) / dpp) - sh / 2); // centre just below the horizon
    this.pitch = Math.max(-maxPitchPx, Math.min(maxPitchPx, this.pitch));
    const sy = (img.height - sh) / 2 - this.pitch;
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    let sx = cx - sw / 2;
    sx = ((sx % img.width) + img.width) % img.width;
    const first = Math.min(sw, img.width - sx);
    c.drawImage(img, sx, sy, first, sh, 0, 0, first * k, H);
    if (first < sw) c.drawImage(img, 0, sy, sw - first, sh, first * k, 0, (sw - first) * k, H);
    // helpers: angle -> screen
    const toX = (az) => { let d = az - this.yaw; d = ((d + 540) % 360) - 180; return W / 2 + (d / dpp) * k; };
    const toY = (el) => ((m.top - el) / dpp - sy) * k;
    // compass strip
    c.fillStyle = 'rgba(20,18,15,.55)'; c.fillRect(0, 0, W, 26);
    c.font = '600 12px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const stepDeg = k < 0.6 ? 10 : k < 1.5 ? 5 : 1;
    for (let a = 0; a < 360; a += stepDeg) {
      const x = toX(a); if (x < -20 || x > W + 20) continue;
      const major = a % 45 === 0;
      c.fillStyle = major ? '#fff' : 'rgba(255,255,255,.65)';
      if (major) c.fillText(COMPASS[a / 45], x, 13);
      else if (a % (stepDeg * 2) === 0) c.fillText(String(a), x, 13);
      else c.fillRect(x - 0.5, 20, 1, 6);
    }
    // labels: nearest first, declutter
    const boxes = [];
    const hit = (b) => boxes.some((o) => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
    const labs = m.labels.slice().sort((a, b) => (b.visible - a.visible) || (a.minor - b.minor) || (a.dist - b.dist));
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    for (const l of labs) {
      const x = toX(l.az), y = toY(l.el);
      if (x < -50 || x > W + 50 || y < 26 || y > H) continue;
      const lost = l.lost && this.date && l.lost <= this.date;
      const txt = `${l.name}  ${l.dist >= 1000 ? (l.dist / 1000).toFixed(1) + ' km' : l.dist + ' m'}${l.visible ? '' : ' · hidden'}`;
      c.font = `${l.minor ? 500 : 600} ${l.minor ? 11 : 12.5}px "IBM Plex Sans", sans-serif`;
      const tw = c.measureText(txt).width;
      let ly = y - 34;
      let b = { x: x - 4, y: ly - 13, w: tw + 12, h: 18 };
      let tries = 0;
      while (hit(b) && tries < 8) { ly -= 22; b = { ...b, y: ly - 13 }; tries++; }
      if (hit(b) || ly < 34) continue;
      boxes.push(b);
      const col = l.kind === 'vm_terrain' ? '#b23a2b' : lost ? '#7c2a1f' : '#1f4466';
      c.strokeStyle = l.visible ? col : 'rgba(40,40,40,.55)'; c.lineWidth = 1.5;
      c.setLineDash(l.visible ? [] : [3, 3]);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, ly + 4); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.arc(x, y, 3.5, 0, 7);
      if (l.visible) { c.fillStyle = col; c.fill(); } else { c.fillStyle = 'rgba(255,255,255,.6)'; c.fill(); c.stroke(); }
      c.fillStyle = l.visible ? 'rgba(251,248,241,.92)' : 'rgba(251,248,241,.6)';
      c.fillRect(b.x, b.y, b.w, b.h);
      c.fillStyle = l.visible ? col : '#555';
      c.fillText(txt, x + 2, ly);
      if (lost) { c.fillRect(x + 2, ly - 4, c.measureText(l.name).width, 1); }
    }
    // horizon line hint (true level)
    const y0 = toY(0);
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([2, 6]); c.beginPath(); c.moveTo(0, y0); c.lineTo(W, y0); c.stroke(); c.setLineDash([]);
  }

  bind() {
    const cv = this.cv;
    cv.tabIndex = 0;
    const pts = new Map();
    let last = null, pinch = null;
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, e); last = e; });
    cv.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, e);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        if (pinch) this.zoom(dist / pinch);
        pinch = dist; return;
      }
      if (last) {
        this.yaw -= ((e.clientX - last.clientX) / this.k) * this.meta.degPerPx;
        this.pitch += (e.clientY - last.clientY) / this.k;
        this.draw();
      }
      last = e;
    });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; last = pts.size ? [...pts.values()][0] : null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom(Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
    cv.addEventListener('keydown', (e) => {
      const s = 5 / Math.max(1, this.k);
      if (e.key === 'ArrowLeft') this.yaw -= s; else if (e.key === 'ArrowRight') this.yaw += s;
      else if (e.key === 'ArrowUp') this.pitch += 20; else if (e.key === 'ArrowDown') this.pitch -= 20;
      else if (e.key === '+' || e.key === '=') return this.zoom(1.25); else if (e.key === '-') return this.zoom(0.8);
      else if (e.key === 'Escape') return this.close(); else return;
      e.preventDefault(); this.draw();
    });
  }

  zoom(f) { this.k = Math.max(this.fitK(), Math.min(5, this.k * f)); this.draw(); }
}
