// Timeline: tests per year as stacked bars (by state or by environment), a year cursor and milestone markers.
import { STATES, ENVS } from '../data/tests.js';
import { MILESTONES } from '../data/milestones.js';
import { Y0, Y1, STATE_COLOR, ENV_COLOR, SHORT, byYear, filtered } from './common.js';
import { chartMotion } from './fx.js';

const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};

export function createChart(host, { onYear, onMilestone }) {
  const svg = mk('svg', { role: 'img', 'aria-label': 'Nuclear explosive tests per year, 1945 to 2026, stacked by state or environment, with test-ban milestones' });
  host.appendChild(svg);
  const tip = document.createElement('div');
  tip.className = 'tooltip'; tip.hidden = true;
  host.appendChild(tip);
  let st = null, geo = null, dragging = false, mat = null;
  const motion = chartMotion(700, 'y');

  const yearAt = ev => {
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) * (geo.W / r.width);
    return Math.max(Y0, Math.min(Y1, Math.round(geo.xi(px))));
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
    const row = mat[y - Y0], names = st.by === 'env' ? ENVS : STATES.map(s => s.name);
    const colors = st.by === 'env' ? ENV_COLOR : STATE_COLOR;
    const total = row.reduce((a, b) => a + b, 0);
    tip.innerHTML = `<b>${y}</b><small>${total} test${total === 1 ? '' : 's'} shown</small>` + row.map((v, k) => v
      ? `<small><span class="sw-dot" style="background:${colors[k]}"></span> ${names[k]}: ${v}</small>` : '').join('');
    const r = host.getBoundingClientRect();
    let x = ev.clientX - r.left + 14;
    if (x > r.width - 200) x = ev.clientX - r.left - 210;
    tip.style.left = Math.max(0, x) + 'px';
    tip.style.top = Math.max(0, ev.clientY - r.top - 10) + 'px';
    tip.hidden = false;
  }

  function draw(state) {
    st = state;
    const W = Math.max(300, Math.round(host.clientWidth || 800));
    const narrow = W < 560;
    const H = narrow ? 300 : 400;
    const m = { l: narrow ? 30 : 40, r: 10, t: 16, b: 84 };
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();
    const pw = W - m.l - m.r, ph = H - m.t - m.b, n = Y1 - Y0 + 1, bw = pw / n;
    const x = y => m.l + (y - Y0 + 0.5) * bw;
    const xi = px => Y0 + (px - m.l) / bw - 0.5;
    geo = { W, xi };
    mat = byYear(filtered(state), state.by);
    const groups = state.by === 'env' ? [0, 1, 2, 3] : [...state.st].sort((a, b) => a - b);
    const colors = state.by === 'env' ? ENV_COLOR : STATE_COLOR;
    const max = Math.max(10, ...mat.map(r => r.reduce((a, b) => a + b, 0)));
    const stepT = max > 120 ? 50 : max > 50 ? 20 : max > 20 ? 10 : 5;
    const top = Math.ceil(max / stepT) * stepT;
    const y = v => m.t + ph - v / top * ph;

    const grid = mk('g', { class: 'grid' }, svg), ax = mk('g', { class: 'tsm-axis' }, svg);
    for (let v = 0; v <= top; v += stepT) {
      mk('line', { x1: m.l, x2: m.l + pw, y1: y(v), y2: y(v) }, grid);
      mk('text', { x: m.l - 5, y: y(v) + 4, 'text-anchor': 'end' }, ax).textContent = v;
    }
    for (let yr = 1950; yr <= Y1; yr += narrow ? 20 : 10) {
      mk('text', { x: x(yr), y: m.t + ph + 14, 'text-anchor': 'middle' }, ax).textContent = yr;
    }

    // Milestone guide lines behind the bars.
    const plot = mk('g', {}, svg);
    for (const ms of MILESTONES) mk('line', { class: 'ms-line', x1: x(ms.year), x2: x(ms.year), y1: m.t, y2: m.t + ph }, plot);
    const gap = bw > 6 ? 1 : 0.4;
    mat.forEach((row, i) => {
      let base = 0;
      for (const g of groups) {
        const v = row[g];
        if (!v) continue;
        const r = mk('rect', { class: 'bar', x: m.l + i * bw + gap / 2, width: Math.max(0.6, bw - gap), y: y(base + v), height: y(base) - y(base + v) }, plot);
        r.style.fill = colors[g];
        base += v;
      }
    });
    motion(plot, [state.by, [...state.env].sort(), [...state.st].sort(), [...state.yc].sort()].join('|'));
    // Dim the years after the cursor slightly so the "through year" reading is visible.
    const cx = x(state.year);
    mk('rect', { class: 'after', x: cx + bw / 2, y: m.t, width: Math.max(0, m.l + pw - cx - bw / 2), height: ph }, plot);

    // Milestone markers in two staggered rows under the axis.
    const rowY = [m.t + ph + 30, m.t + ph + 49, m.t + ph + 68];
    MILESTONES.forEach((ms, k) => {
      const mx = x(ms.year);
      const g = mk('g', { class: 'ms' + (state.ms === ms.id ? ' on' : ''), tabindex: 0, role: 'button', 'aria-label': `${ms.label}, ${ms.when}` }, svg);
      const ry = rowY[k % rowY.length], txt = narrow ? String(k + 1) : ms.short;
      const w = narrow ? 16 : txt.length * 6.2 + 10;
      const left = Math.min(Math.max(mx - w / 2, 2), W - w - 2);
      mk('rect', { x: left, y: ry - 11, width: w, height: 16, rx: 3 }, g);
      mk('text', { x: left + w / 2, y: ry + 1, 'text-anchor': 'middle' }, g).textContent = txt;
      mk('title', {}, g).textContent = `${ms.label} (${ms.when})`;
      g.addEventListener('click', () => onMilestone(ms.id));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMilestone(ms.id); } });
    });

    mk('line', { class: 'cursor', x1: cx, x2: cx, y1: m.t - 4, y2: m.t + ph }, svg);
    const right = cx > W - 70;
    mk('text', { class: 'cursor-lab', x: cx + (right ? -6 : 6), y: m.t + 8, 'text-anchor': right ? 'end' : 'start' }, svg).textContent = state.year;
    svg.setAttribute('aria-label', `Nuclear tests per year stacked by ${state.by === 'env' ? 'environment' : 'state'}; peak ${max} in one year. Shown: ${groups.map(g => state.by === 'env' ? ENVS[g] : SHORT[g]).join(', ')}.`);
  }

  return { draw };
}
