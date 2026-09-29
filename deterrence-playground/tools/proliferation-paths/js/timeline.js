// Timeline: one row per state, bars coloured by the stage each dataset codes, triangles where a dataset codes a
// step down. In "compare" mode every row splits into three lanes, one per dataset. Drag to set the year.
import { STATES, COVER, FIRST } from '../data/codings.js';
import { esc, stageAt, reversals, T0, T1, DATASETS, DS_SHORT, STAGE_LABEL, STAGE_COLOR } from './common.js';

const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};

function runs(ds, id) {
  const out = [];
  let cur = null;
  for (let y = FIRST[ds]; y <= COVER[ds]; y++) {
    const s = stageAt(ds, id, y);
    if (cur && cur.s === s) cur.y1 = y;
    else { if (cur && cur.s !== 'none') out.push(cur); cur = { s, y0: y, y1: y }; }
  }
  if (cur && cur.s !== 'none') out.push(cur);
  return out;
}

export function createTimeline(host, { onYear, onSelect }) {
  const svg = mk('svg', { role: 'group', 'aria-label': 'Timeline of explore, pursue and acquire codings by state' });
  host.appendChild(svg);
  const tip = document.createElement('div');
  tip.className = 'tooltip'; tip.hidden = true;
  host.appendChild(tip);
  let geo = null, drag = false;
  const yearAt = ev => {
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) * (geo.W / r.width);
    return Math.max(T0, Math.min(T1, Math.floor(geo.xi(px))));
  };
  svg.addEventListener('pointerdown', ev => { if (ev.target.closest('.lab')) return; drag = true; svg.setPointerCapture(ev.pointerId); onYear(yearAt(ev)); });
  svg.addEventListener('pointermove', ev => { if (drag) onYear(yearAt(ev)); });
  svg.addEventListener('pointerup', () => { drag = false; });
  svg.addEventListener('pointercancel', () => { drag = false; });
  const showTip = (ev, html) => {
    tip.innerHTML = html;
    const r = host.getBoundingClientRect();
    let px = ev.clientX - r.left + 12; if (px > r.width - 230) px = ev.clientX - r.left - 240;
    tip.style.left = Math.max(0, px) + 'px'; tip.style.top = Math.max(0, ev.clientY - r.top - 8) + 'px'; tip.hidden = false;
  };

  function draw(state, order) {
    const W = Math.max(320, Math.round(host.clientWidth || 900)), narrow = W < 600;
    const lanes = state.ds === 'any' ? DATASETS : [state.ds];
    const laneH = lanes.length > 1 ? (narrow ? 6 : 7) : (narrow ? 11 : 13);
    const rowH = lanes.length * laneH + (narrow ? 9 : 11);
    const m = { l: narrow ? 74 : 150, r: 10, t: 24, b: 24 };
    const rows = order.filter(id => state.visible.has(id));
    const H = m.t + m.b + rowH * Math.max(1, rows.length);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();
    const pw = W - m.l - m.r;
    const x = y => m.l + (y - T0) / (T1 + 1 - T0) * pw;
    geo = { W, xi: px => T0 + (px - m.l) / pw * (T1 + 1 - T0) };
    const ax = mk('g', { class: 'tsm-axis' }, svg);
    for (let y = 1940; y <= T1; y += narrow ? 20 : 10) {
      mk('line', { class: 'gl', x1: x(y), x2: x(y), y1: m.t - 6, y2: H - m.b }, svg);
      mk('text', { x: x(y), y: H - 7, 'text-anchor': 'middle' }, ax).textContent = y;
    }
    rows.forEach((id, i) => {
      const s = STATES.find(k => k.id === id);
      const top = m.t + rowH * i + 4;
      if (i % 2 === 0) mk('rect', { class: 'band', x: 0, y: top - 4, width: W, height: rowH }, svg);
      const lab = mk('g', { class: 'lab' + (state.sel === id ? ' on' : ''), tabindex: 0, role: 'button', 'aria-label': `Open the card for ${s.name}` }, svg);
      mk('text', { x: m.l - 8, y: top + lanes.length * laneH / 2 + 4, 'text-anchor': 'end' }, lab).textContent = narrow ? s.short : s.name;
      lab.addEventListener('click', () => onSelect(id));
      lab.addEventListener('keydown', k => { if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); onSelect(id); } });
      lanes.forEach((ds, j) => {
        const y0 = top + j * laneH;
        if (FIRST[ds] > T0) mk('rect', { class: 'nocov', x: x(T0), y: y0, width: x(FIRST[ds]) - x(T0), height: laneH - 1 }, svg);
        if (COVER[ds] < T1) mk('rect', { class: 'nocov', x: x(COVER[ds] + 1), y: y0, width: x(T1 + 1) - x(COVER[ds] + 1), height: laneH - 1 }, svg);
        for (const r of runs(ds, id)) {
          const b = mk('rect', { class: 'bar', x: x(r.y0), y: y0, width: Math.max(1.5, x(r.y1 + 1) - x(r.y0)), height: laneH - 1 }, svg);
          b.style.fill = STAGE_COLOR[r.s];
          const open = r.y1 === COVER[ds] && stageAt(ds, id, COVER[ds]) === r.s;
          b.addEventListener('pointerenter', ev => showTip(ev, `<b>${esc(s.name)}: ${esc(STAGE_LABEL[r.s].toLowerCase())}</b><small>${esc(DS_SHORT[ds])}: ${r.y0}–${open ? `${r.y1}, still coded at the dataset's last year` : r.y1}</small>`));
          b.addEventListener('pointerleave', () => { tip.hidden = true; });
        }
        for (const rv of reversals(ds, id)) {
          const cx = x(rv.year), cy = y0 + (laneH - 1) / 2, h = Math.min(6, laneH / 2 + 2);
          const t = mk('path', { class: 'rev ' + rv.kind, d: `M${cx - h} ${cy - h}L${cx + h} ${cy - h}L${cx} ${cy + h}Z` }, svg);
          t.addEventListener('pointerenter', ev => showTip(ev, `<b>${esc(s.name)}: ${rv.kind === 'stop' ? 'back to no activity' : 'steps down to ' + esc(STAGE_LABEL[rv.to].toLowerCase())}</b><small>${esc(DS_SHORT[ds])}: first year at the lower level, ${rv.year}</small>`));
          t.addEventListener('pointerleave', () => { tip.hidden = true; });
        }
      });
    });
    if (!rows.length) mk('text', { class: 'rl', x: W / 2, y: m.t + 18, 'text-anchor': 'middle' }, svg).textContent = 'No states match the filters.';
    const cx = x(state.year + 0.5);
    mk('line', { class: 'cursor', x1: cx, x2: cx, y1: m.t - 10, y2: H - m.b }, svg);
    const right = cx > W - 60;
    mk('text', { class: 'cursor-lab', x: cx + (right ? -5 : 5), y: m.t - 10, 'text-anchor': right ? 'end' : 'start' }, svg).textContent = state.year;
  }
  return { draw };
}
