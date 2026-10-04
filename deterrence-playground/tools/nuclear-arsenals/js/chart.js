// Timeline chart: stacked areas or lines of national stockpiles, the global total, a year cursor and
// arms-control milestone markers. Pure SVG, redrawn at the container's pixel width.
import { COUNTRIES, WORLD, Y0, Y1 } from '../data/stockpiles.js';
import { MILESTONES } from '../data/milestones.js';
import { COLOR, fmt } from './common.js';
import { chartMotion } from './fx.js';

const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};

/** Round "nice" tick values for a linear axis. */
function niceTicks(max, n = 5) {
  const raw = max / n, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p;
  const step = (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  const out = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(v);
  return out;
}

export function createChart(host, { onYear, onMilestone }) {
  const svg = mk('svg', { role: 'img', 'aria-label': 'Estimated nuclear warhead stockpiles by country, 1945 to 2026, with arms-control milestones' });
  host.appendChild(svg);
  const tip = document.createElement('div');
  tip.className = 'tooltip'; tip.hidden = true;
  host.appendChild(tip);
  let st = null, geo = null, dragging = false;
  const motion = chartMotion();

  const yearAt = ev => {
    const r = svg.getBoundingClientRect();
    const x = (ev.clientX - r.left) * (geo.W / r.width);
    return Math.max(Y0, Math.min(Y1, Math.round(geo.xi(x))));
  };
  svg.addEventListener('pointerdown', ev => {
    if (ev.target.closest('.ms')) return;
    dragging = true; svg.setPointerCapture(ev.pointerId); onYear(yearAt(ev));
  });
  svg.addEventListener('pointermove', ev => {
    if (!geo) return;
    if (dragging) onYear(yearAt(ev));
    if (ev.pointerType === 'mouse' && !ev.target.closest('.ms')) showTip(yearAt(ev), ev);
  });
  const end = () => { dragging = false; };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('pointerleave', () => { tip.hidden = true; });

  function showTip(y, ev) {
    const i = y - Y0;
    const rows = COUNTRIES.filter(c => st.on.has(c.iso) && c.v[i] > 0).sort((a, b) => b.v[i] - a.v[i]);
    tip.innerHTML = `<b>${y}</b>` + rows.map(c => `<small><span class="sw-dot" style="background:${COLOR[c.iso]}"></span> ${c.name}: ${fmt(c.v[i])}</small>`).join('')
      + `<small>Global total incl. retired: ${fmt(WORLD[i])}</small>`;
    const r = host.getBoundingClientRect();
    let x = ev.clientX - r.left + 14;
    if (x > r.width - 220) x = ev.clientX - r.left - 230;
    tip.style.left = Math.max(0, x) + 'px';
    tip.style.top = Math.max(0, ev.clientY - r.top - 10) + 'px';
    tip.hidden = false;
  }

  function draw(state) {
    st = state;
    const W = Math.max(300, Math.round(host.clientWidth || 800));
    const narrow = W < 560;
    const H = narrow ? 330 : 430;
    const m = { l: narrow ? 44 : 58, r: narrow ? 10 : 70, t: 14, b: 62 };
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const refocus = document.activeElement?.closest?.('.ms')?.dataset.id; // keep keyboard focus across the redraw
    svg.replaceChildren();
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const x = y => m.l + (y - Y0) / (Y1 - Y0) * pw;
    const xi = px => Y0 + (px - m.l) / pw * (Y1 - Y0);
    const on = COUNTRIES.filter(c => state.on.has(c.iso));
    const n = Y1 - Y0 + 1;

    // Y scale
    let y, ticks;
    if (state.view === 'lines' && state.log) {
      const top = 10 ** Math.ceil(Math.log10(Math.max(10, ...on.flatMap(c => c.v), state.world ? Math.max(...WORLD) : 0)));
      y = v => m.t + ph - Math.log10(Math.max(1, v)) / Math.log10(top) * ph;
      ticks = []; for (let v = 1; v <= top; v *= 10) ticks.push(v);
    } else {
      const sums = Array.from({ length: n }, (_, i) => state.view === 'stack' ? on.reduce((s, c) => s + c.v[i], 0) : Math.max(0, ...on.map(c => c.v[i])));
      const mx = Math.max(10, ...sums, state.world ? Math.max(...WORLD) : 0);
      ticks = niceTicks(mx * 1.04);
      const top = ticks[ticks.length - 1];
      y = v => m.t + ph - v / top * ph;
    }
    geo = { W, xi };

    const grid = mk('g', { class: 'grid' }, svg);
    const ax = mk('g', { class: 'tsm-axis' }, svg);
    for (const t of ticks) {
      mk('line', { x1: m.l, x2: m.l + pw, y1: y(t), y2: y(t) }, grid);
      const lab = mk('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end' }, ax);
      lab.textContent = t >= 1000 ? (t / 1000) + 'k' : t;
    }
    const step = narrow ? 20 : 10;
    for (let yr = 1950; yr <= Y1; yr += step) {
      const lab = mk('text', { x: x(yr), y: m.t + ph + 14, 'text-anchor': 'middle' }, ax);
      lab.textContent = yr;
    }

    const plot = mk('g', {}, svg);
    if (state.view === 'stack') {
      const base = new Array(n).fill(0);
      // Largest arsenals at the bottom so small ones stay readable on top.
      for (const c of on) {
        const top = c.v.map((v, i) => base[i] + v);
        const pts = top.map((v, i) => `${x(Y0 + i).toFixed(1)},${y(v).toFixed(1)}`);
        const low = base.map((v, i) => `${x(Y0 + i).toFixed(1)},${y(v).toFixed(1)}`).reverse();
        const p = mk('path', { class: 'area', d: `M${pts.join('L')}L${low.join('L')}Z` }, plot);
        p.style.fill = COLOR[c.iso];
        top.forEach((v, i) => { base[i] = v; });
      }
    } else {
      for (const c of on) {
        const first = c.v.findIndex(v => v > 0);
        if (first < 0) continue;
        const pts = c.v.slice(first).map((v, i) => `${x(Y0 + first + i).toFixed(1)},${y(v).toFixed(1)}`);
        const p = mk('path', { class: 'line', d: `M${pts.join('L')}` }, plot);
        p.style.stroke = COLOR[c.iso];
      }
    }
    if (state.world) {
      mk('path', { class: 'world', d: 'M' + WORLD.map((v, i) => `${x(Y0 + i).toFixed(1)},${y(v).toFixed(1)}`).join('L') }, plot);
    }
    // Direct labels at the right edge for the largest few (desktop only).
    if (!narrow) {
      const last = n - 1, lab = [];
      if (state.view === 'stack') {
        let b = 0;
        for (const c of on) { const v = c.v[last]; if (v >= 500) lab.push([c.name, b + v / 2]); b += v; }
      } else {
        for (const c of on) if (c.v[last] > 0) lab.push([c.name, c.v[last]]);
      }
      let prevY = -99;
      lab.map(([t, v]) => [t, y(v)]).sort((a, b) => b[1] - a[1]).forEach(([t, py]) => {
        if (Math.abs(py - prevY) < 12) return;
        const e = mk('text', { class: 'dlab', x: m.l + pw + 5, y: py + 4 }, plot);
        e.textContent = t.replace('United States', 'U.S.').replace('United Kingdom', 'UK');
        prevY = py;
      });
    }

    // Milestones: dotted guide lines plus labelled markers in two staggered rows under the axis.
    if (state.ms) {
      const rowY = [m.t + ph + 26, m.t + ph + 46];
      MILESTONES.forEach((ms, k) => {
        const mx = x(ms.year);
        mk('line', { class: 'ms-line', x1: mx, x2: mx, y1: m.t, y2: m.t + ph }, plot);
        const g = mk('g', { class: 'ms' + (state.msId === ms.id ? ' on' : ''), tabindex: 0, role: 'button', 'aria-label': `${ms.label}, ${ms.when}`, 'data-id': ms.id }, svg);
        const ry = rowY[k % 2];
        const txt = narrow ? String(k + 1) : ms.short;
        const w = narrow ? 18 : txt.length * 6.4 + 10;
        const left = Math.min(Math.max(mx - w / 2, 2), W - w - 2);
        mk('rect', { x: left, y: ry - 11, width: w, height: 16, rx: 3 }, g);
        mk('text', { x: left + w / 2, y: ry + 1, 'text-anchor': 'middle' }, g).textContent = txt;
        mk('title', {}, g).textContent = `${ms.label} (${ms.when})`;
        g.addEventListener('click', () => onMilestone(ms.id));
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMilestone(ms.id); } });
        if (refocus === ms.id) g.focus({ preventScroll: true });
      });
    }

    motion(plot, [state.view, state.log, [...state.on].join(), state.world].join('|'));

    // Year cursor
    const cx = x(state.year);
    mk('line', { class: 'cursor', x1: cx, x2: cx, y1: m.t, y2: m.t + ph }, svg);
    const cl = mk('text', { class: 'cursor-lab', x: cx + (cx > W - 60 ? -6 : 6), y: m.t + 12, 'text-anchor': cx > W - 60 ? 'end' : 'start' }, svg);
    cl.textContent = state.year;
  }

  return { draw };
}
