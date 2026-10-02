// Pan and zoom for the map (SPEC §8.2): one transform on <g id="world">, never a re-render. Drag to pan, wheel
// or pinch to zoom, + / − / Fit buttons and keys (+ − 0, Shift+arrows). A drag of more than 6 px is not a
// click, so panning never sends an order. The minimap (Corps and Army) shows the viewport and pans on tap.

const MIN_K = 0.15, MAX_K = 4;

export function createView(svg, world, onChange) {
  const v = { k: 1, x: 0, y: 0, W: 1, H: 1 };
  let drag = null, moved = false, pinch = null;
  const pts = new Map();
  const size = () => { const r = svg.getBoundingClientRect(); return [Math.max(1, r.width), Math.max(1, r.height)]; };
  function clamp() {
    const [vw, vh] = size(), w = v.W * v.k, h = v.H * v.k, pad = 40;
    v.x = w <= vw ? (vw - w) / 2 : Math.min(pad, Math.max(vw - w - pad, v.x));
    v.y = h <= vh ? (vh - h) / 2 : Math.min(pad, Math.max(vh - h - pad, v.y));
  }
  function apply() {
    clamp();
    svg.setAttribute('viewBox', `0 0 ${size().join(' ')}`);
    world.setAttribute('transform', `translate(${v.x.toFixed(1)} ${v.y.toFixed(1)}) scale(${v.k.toFixed(4)})`);
    onChange && onChange(v);
    v.mini && v.mini();
  }
  /** Zoom by factor f about screen point (cx, cy). */
  function zoom(f, cx, cy) {
    const [vw, vh] = size();
    cx ??= vw / 2; cy ??= vh / 2;
    const k = Math.max(MIN_K, Math.min(MAX_K, v.k * f));
    v.x = cx - (cx - v.x) * k / v.k; v.y = cy - (cy - v.y) * k / v.k; v.k = k;
    apply();
  }
  /** Fit the map's width to the view and show one end: 'top' or 'bottom' (the front is there). */
  function fit(edge = v.edge || 'top') {
    const [vw, vh] = size();
    if (edge === 'all') { v.k = Math.max(MIN_K, Math.min(vw / v.W, vh / v.H)); v.x = (vw - v.W * v.k) / 2; v.y = (vh - v.H * v.k) / 2; apply(); return; }
    v.edge = edge;
    v.k = Math.max(MIN_K, Math.min(MAX_K, vw / v.W));
    v.x = 0; v.y = edge === 'bottom' ? vh - v.H * v.k - 8 : 8;
    apply();
  }
  svg.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k: v.k }; drag = null; return; }
    drag = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y }; moved = false;
  });
  svg.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), r = svg.getBoundingClientRect();
      zoom(pinch.k * d / pinch.d / v.k, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
      moved = true; return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) < 6) return;
    if (!moved) svg.setPointerCapture?.(e.pointerId);
    moved = true;
    v.x = drag.vx + dx; v.y = drag.vy + dy; apply();
  });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) drag = null; };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  // Ctrl/Cmd + wheel (and trackpad pinch) zooms about the pointer; a plain wheel pans the map, and lets the page
  // scroll once the map is at its edge so the wheel never traps the page.
  svg.addEventListener('wheel', e => {
    const r = svg.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoom(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top); return; }
    const x0 = v.x, y0 = v.y;
    v.x -= e.deltaX; v.y -= e.deltaY; apply();
    if (v.x !== x0 || v.y !== y0) e.preventDefault();
  }, { passive: false });
  addEventListener('resize', () => apply());

  Object.assign(v, {
    zoom, fit, apply,
    setWorld(W, H, edge = 'top') { v.W = W; v.H = H; fit(edge); },
    pan(dx, dy) { v.x += dx; v.y += dy; apply(); },
    /** Was the last pointer gesture a drag (so the click that follows is not an order)? */
    dragged() { const d = moved; moved = false; return d; },
    /** Pan so that the world box (x, y, size) is on screen. */
    ensure(x, y, s) {
      const [vw, vh] = size(), sx = v.x + x * v.k, sy = v.y + y * v.k, ss = s * v.k;
      if (sx < 0 || sx + ss > vw) v.x += sx < 0 ? -sx + 20 : vw - (sx + ss) - 20;
      if (sy < 0 || sy + ss > vh) v.y += sy < 0 ? -sy + 20 : vh - (sy + ss) - 20;
      apply();
    },
    /** Centre the world point (x, y). */
    center(x, y) { const [vw, vh] = size(); v.x = vw / 2 - x * v.k; v.y = vh / 2 - y * v.k; apply(); },
    size,
  });
  return v;
}

/** The minimap: a small copy of the grid outline, the zone bands and the viewport; a tap pans there. */
export function createMinimap(box, m) {
  const cv = document.createElement('canvas');
  cv.className = 'dd-mini'; cv.setAttribute('aria-label', 'Minimap: tap to move the view'); cv.setAttribute('role', 'img');
  box.appendChild(cv);
  const draw = () => {
    if (!m.G || cv.hidden) return;
    const G = m.G, w = 96, h = Math.round(w * G.rows / G.cols), dpr = devicePixelRatio || 1;
    cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px';
    const c = cv.getContext('2d'), cs = getComputedStyle(document.documentElement);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = cs.getPropertyValue('--land').trim() || '#ddd'; c.fillRect(0, 0, w, h);
    const sy = h / G.rows, obj = G.S.obj.row;
    c.fillStyle = cs.getPropertyValue('--rule').trim() || '#999';
    for (const r of [G.S.bands.outpost[0], G.S.bands.battle[0]]) c.fillRect(0, (m.flip ? G.rows - r : r) * sy, w, 1);
    c.fillStyle = cs.getPropertyValue('--accent').trim() || '#c80'; c.fillRect(0, (m.flip ? G.rows - 1 - obj : obj) * sy, w, 2);
    const [vw, vh] = m.mv.size(), k = m.mv.k, s = w / (G.cols * 60);
    c.strokeStyle = cs.getPropertyValue('--focus').trim() || '#06f'; c.lineWidth = 1.5;
    c.strokeRect(-m.mv.x / k * s, -m.mv.y / k * s, vw / k * s, vh / k * s);
  };
  cv.addEventListener('click', e => {
    const r = cv.getBoundingClientRect(), s = (m.G.cols * 60) / r.width;
    m.mv.center((e.clientX - r.left) * s, (e.clientY - r.top) * s);
  });
  m.mv.mini = draw;
  return { el: cv, draw, show(on) { cv.hidden = !on; draw(); } };
}
