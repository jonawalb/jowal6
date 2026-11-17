// Where Is the Chip? Map rendering with d3 (global, loaded from cdn.jsdelivr.net in index.html).
// Draws countries, city dots, landmark disks, the feasible region (exact intersection via nested clip paths),
// the overlap with the country to rule out, the proxy route and the draggable chip.
import { R_EARTH } from './geo.js';

const d3 = window.d3;
const W = 1000;
let H = 600;
const DEG = 180 / Math.PI;
const VIEWS = {
  world: null,
  asia: [[68, -12], [150, 55]],
  europe: [[-12, 12], [62, 66]],
  americas: [[-128, -40], [-34, 58]],
};

export function createMap(svgEl, { countries, borders, cities, onChip, onCity }) {
  H = (svgEl.parentElement?.clientWidth || 1000) < 640 ? 950 : 600;   // taller map on phones
  const svg = d3.select(svgEl).attr('viewBox', `0 0 ${W} ${H}`);
  const proj = d3.geoNaturalEarth1();
  const path = d3.geoPath(proj);
  const defs = svg.append('defs');
  const gBase = svg.append('g').attr('class', 'base');
  const gTint = svg.append('g').attr('class', 'tint');
  const gRegion = svg.append('g').attr('class', 'region');
  const gCirc = svg.append('g').attr('class', 'circles');
  const gCity = svg.append('g').attr('class', 'cities');
  const gLinks = svg.append('g').attr('class', 'links');
  const gMarks = svg.append('g').attr('class', 'marks');
  let last = null, viewName = 'asia';
  // Map units per CSS pixel. On a phone the 1000-unit map is ~350 px wide, so tap targets and labels scale up.
  const unit = () => Math.max(1, W / (svgEl.clientWidth || W));

  function fit(name, bbox) {
    viewName = name;
    if (name === 'world' || (!bbox && !VIEWS[name])) proj.fitExtent([[6, 6], [W - 6, H - 6]], { type: 'Sphere' });
    else {
      const [[x0, y0], [x1, y1]] = bbox || VIEWS[name];
      const pts = [];
      for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) pts.push([x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * j / 8]);
      proj.fitExtent([[10, 10], [W - 10, H - 10]], { type: 'MultiPoint', coordinates: pts });
    }
    drawBase();
    if (last) render(...last);
  }

  function drawBase() {
    gBase.selectAll('*').remove();
    gBase.append('path').attr('class', 'sphere').attr('d', path({ type: 'Sphere' }));
    gBase.append('path').attr('class', 'grat').attr('d', path(d3.geoGraticule10()));
    gBase.append('path').attr('class', 'land').attr('d', path({ type: 'FeatureCollection', features: countries }));
    gBase.append('path').attr('class', 'border').attr('d', path(borders));
    gCity.selectAll('*').remove();
    const vis = cities.map((c, i) => ({ c, i, p: proj([c[3], c[2]]) }))
      .filter(o => o.p && o.p[0] > -5 && o.p[0] < W + 5 && o.p[1] > -5 && o.p[1] < H + 5 && onScreen([o.c[3], o.c[2]]));
    const g = gCity.selectAll('g').data(vis).join('g').attr('class', 'city')
      .attr('transform', o => `translate(${o.p[0]},${o.p[1]})`)
      .on('click', (e, o) => onCity(o.i));
    g.append('circle').attr('class', 'hit').attr('r', unit() > 1.5 ? 22 * unit() : 7);   // 22 CSS px radius (44 px tap target) on phones
    g.append('circle').attr('class', 'dot').attr('r', 2);
    g.append('title').text(o => `${o.c[0]}, ${o.c[1]}: click to add or remove a landmark`);
  }

  // Natural Earth projection shows the whole globe, but a point can still be on the far side of a clipped view.
  function onScreen(p) { const q = proj(p); return q && Number.isFinite(q[0]); }

  const circle = (pos, km) => {
    const deg = Math.min(179.5, (km / R_EARTH) * DEG);
    return path(d3.geoCircle().center(pos).radius(Math.max(deg, 0.02)).precision(deg > 20 ? 2 : 0.5)());
  };

  function render(S, meas, reg, fx) {
    last = [S, meas, reg, fx];
    // Country tints
    gTint.selectAll('*').remove();
    if (fx.ruleFeat) gTint.append('path').attr('class', 'rule').attr('d', path(fx.ruleFeat));
    if (fx.claimFeat && S.mode === 'attack') gTint.append('path').attr('class', 'claim').attr('d', path(fx.claimFeat));

    // Feasible region as nested clip paths, one per disk
    defs.selectAll('clipPath').remove();
    gRegion.selectAll('*').remove();
    if (meas.length) {
      let host = gRegion;
      meas.forEach((m, i) => {
        defs.append('clipPath').attr('id', `cg-cp-${i}`).append('path').attr('d', circle(m.pos, m.bound));
        host = host.append('g').attr('clip-path', `url(#cg-cp-${i})`);
      });
      host.append('path').attr('class', 'feas').attr('d', path({ type: 'Sphere' }));
      if (fx.ruleFeat) host.append('path').attr('class', 'over').attr('d', path(fx.ruleFeat));
    }

    // Disks
    gCirc.selectAll('*').remove();
    gCirc.selectAll('path').data(meas).join('path').attr('class', 'disk').attr('d', m => circle(m.pos, m.bound));

    // City dots: mark landmark cities
    const lmSet = new Set(S.lms.map(l => l.ci));
    gCity.selectAll('g.city').classed('is-lm', o => lmSet.has(o.i));

    // Proxy route
    gLinks.selectAll('*').remove();
    if (S.mode === 'attack' && fx.proxyPos) {
      gLinks.append('path').attr('class', 'relay').attr('d', path({ type: 'LineString', coordinates: [fx.proxyPos, S.chip] }));
      S.lms.forEach(l => gLinks.append('path').attr('class', 'relay faint').attr('d', path({ type: 'LineString', coordinates: [l.pos, fx.proxyPos] })));
    }

    // Marks: landmarks, proxy, chip
    gMarks.selectAll('*').remove();
    // Simple label placement: try four offsets and keep the first that clears earlier labels and the chip.
    // Labels stay at least ~10 CSS px tall on a phone: scale font, marks, boxes and offsets together.
    const fs = Math.max(11.5, 10 * unit()), k = fs / 11.5;
    const boxes = [];
    const cpt = proj(S.chip);
    if (cpt) boxes.push([cpt[0] - 16 * k, cpt[1] - 16 * k, cpt[0] + 16 * k, cpt[1] + 16 * k]);
    const place = (p, text) => {
      const w = (text.length * 6.6 + 4) * k, h = 14 * k;
      const tries = [[10, -8, 'start'], [10, 16, 'start'], [-10, -8, 'end'], [-10, 16, 'end'], [20, -20, 'start'], [-20, -20, 'end'], [20, 30, 'start'], [-20, 30, 'end']].map(([dx, dy, an]) => [dx * k, dy * k, an]);
      for (const [dx, dy, an] of tries) {
        const x0 = an === 'start' ? p[0] + dx : p[0] + dx - w, y0 = p[1] + dy - 11 * k;
        const b = [x0, y0, x0 + w, y0 + h];
        if (!boxes.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) { boxes.push(b); return { dx, dy, an }; }
      }
      return null;
    };
    S.lms.forEach((l, i) => {
      const p = proj(l.pos); if (!p) return;
      const g = gMarks.append('g').attr('class', 'lm').attr('transform', `translate(${p[0]},${p[1]})`);
      g.append('rect').attr('x', -6 * k).attr('y', -6 * k).attr('width', 12 * k).attr('height', 12 * k).attr('transform', 'rotate(45)');
      const full = `${i + 1} ${l.name}`;
      let txt = full, at = place(p, full);
      if (!at) { txt = String(i + 1); at = place(p, txt); }
      if (at) g.append('text').attr('class', 'lbl').style('font-size', fs + 'px').attr('x', at.dx).attr('y', at.dy).attr('text-anchor', at.an).text(txt);
    });
    if (S.mode === 'attack' && fx.proxyPos) {
      const p = proj(fx.proxyPos);
      if (p) {
        const g = gMarks.append('g').attr('class', 'proxy').attr('transform', `translate(${p[0]},${p[1]})`);
        g.append('rect').attr('x', -6 * k).attr('y', -6 * k).attr('width', 12 * k).attr('height', 12 * k);
        const at = place(p, 'Proxy');
        if (at) g.append('text').attr('class', 'lbl').style('font-size', fs + 'px').attr('x', at.dx).attr('y', at.dy).attr('text-anchor', at.an).text('Proxy');
      }
    }
    const cp = proj(S.chip);
    if (cp) {
      const g = gMarks.append('g').attr('class', 'chip').attr('transform', `translate(${cp[0]},${cp[1]}) scale(${k})`)
        .attr('tabindex', 0).attr('role', 'button')
        .attr('aria-label', `Chip at ${S.chip[1].toFixed(1)}°, ${S.chip[0].toFixed(1)}°. Arrow keys move it; hold Shift for larger steps.`);
      g.append('circle').attr('class', 'halo').attr('r', 16);
      g.append('rect').attr('class', 'body').attr('x', -8).attr('y', -8).attr('width', 16).attr('height', 16).attr('rx', 2);
      for (const k of [-4, 0, 4]) {
        g.append('line').attr('x1', k).attr('x2', k).attr('y1', -12).attr('y2', -8);
        g.append('line').attr('x1', k).attr('x2', k).attr('y1', 8).attr('y2', 12);
        g.append('line').attr('y1', k).attr('y2', k).attr('x1', -12).attr('x2', -8);
        g.append('line').attr('y1', k).attr('y2', k).attr('x1', 8).attr('x2', 12);
      }
      g.append('text').attr('class', 'lbl chip-lbl').attr('x', 14).attr('y', 18).text(fx.chipLabel || 'Chip');
      bindChip(g);
    }
  }

  // Dragging and keyboard for the chip
  let dragging = false;
  function bindChip(g) {
    g.on('pointerdown', e => { dragging = true; svgEl.setPointerCapture(e.pointerId); e.preventDefault(); });
    g.on('keydown', e => {
      const st = e.shiftKey ? 2 : 0.5;
      const mv = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, st], ArrowDown: [0, -st] }[e.key];
      if (!mv) return;
      e.preventDefault();
      const [lon, lat] = last[0].chip;
      onChip([lon + mv[0], Math.max(-85, Math.min(85, lat + mv[1]))], { key: true });
      requestAnimationFrame(() => svgEl.querySelector('.chip')?.focus());
    });
  }
  svgEl.addEventListener('pointermove', e => {
    if (!dragging) return;
    const pt = svgEl.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svgEl.getScreenCTM().inverse());
    const ll = proj.invert([q.x, q.y]);
    if (ll && Number.isFinite(ll[0]) && Math.abs(ll[1]) <= 85) onChip(ll, { drag: true });
  });
  const end = () => { if (dragging) { dragging = false; onChip(last[0].chip, { end: true }); } };
  svgEl.addEventListener('pointerup', end);
  svgEl.addEventListener('pointercancel', end);

  return {
    fit, render,
    get view() { return viewName; },
    isDragging: () => dragging,
  };
}
