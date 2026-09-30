// Two SVG views: the schematic channel (routes, search passes, mines and contacts on the chosen day) and
// the risk-over-time chart with the 2026 benchmark. Mines are drawn at seeded random spots: the positions
// are illustrative, the counts and odds come from the model.
import { MODEL } from '../data/params.js';
import { rand } from './model.js';

const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs = {}, parent, text) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  if (text != null) e.textContent = text;
  return e;
};
const MAX_DOTS = 400;

export function drawStrip(svg, S, R, day) {
  const W = Math.max(320, Math.round(svg.parentElement.clientWidth || 800));
  const narrow = W < 560;
  const bandH = narrow ? 34 : 44, gap = narrow ? 16 : 20, top = 30, left = narrow ? 8 : 16, right = narrow ? 8 : 16;
  const H = top + S.routes * bandH + (S.routes - 1) * gap + 34;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const pw = W - left - right;
  const X = u => left + u * pw;
  const D = R.days[Math.min(day, R.days.length - 1)];
  const passesDone = D.frac * R.P;
  const full = Math.floor(passesDone + 1e-9), part = passesDone - full;

  mk('text', { x: left, y: 16, class: 'hm-end' }, svg, narrow ? '← Gulf of Oman' : '← Gulf of Oman (schematic, not to scale in width)');
  mk('text', { x: W - right, y: 16, class: 'hm-end', 'text-anchor': 'end' }, svg, 'Persian Gulf →');
  for (let r = 0; r < S.routes; r++) {
    const y0 = top + r * (bandH + gap);
    const g = mk('g', { class: 'hm-route' }, svg);
    mk('rect', { x: X(0), y: y0, width: pw, height: bandH, class: 'hm-band' }, g);
    for (let p = 0; p < Math.min(full, R.P); p++) mk('rect', { x: X(0), y: y0, width: pw, height: bandH, class: 'hm-pass' }, g);
    if (full < R.P && part > 0) {
      mk('rect', { x: X(0), y: y0, width: part * pw, height: bandH, class: 'hm-pass' }, g);
      mk('line', { x1: X(part), x2: X(part), y1: y0 - 3, y2: y0 + bandH + 3, class: 'hm-front' }, g);
    }
    mk('text', { x: X(0) + 4, y: y0 + bandH + 13, class: 'hm-rl' }, g, `Route ${r + 1}`);
  }
  // Km ticks every 20 nm
  for (let nm = 0; nm <= S.lengthNm; nm += 20) {
    const u = nm / S.lengthNm, y = top + S.routes * bandH + (S.routes - 1) * gap + 28;
    mk('text', { x: X(u), y, class: 'hm-tick', 'text-anchor': u === 0 ? 'start' : u > 0.97 ? 'end' : 'middle' }, svg, nm === 0 ? '0 nm' : nm);
  }
  const where = (k, off) => ({ r: k % S.routes, u: rand(k * 13 + off), v: 0.1 + 0.8 * rand(k * 29 + off + 7) });
  const passesAt = u => full + (u < part ? 1 : 0);
  const dots = mk('g', {}, svg);
  // Clutter: mine-like contacts, faded once a pass has covered them.
  const nC = Math.min(MAX_DOTS, Math.round(S.contactsPerNm2 * R.area));
  for (let k = 0; k < nC; k++) {
    const p = where(k, 11);
    const y0 = top + p.r * (bandH + gap);
    mk('circle', { cx: X(p.u), cy: y0 + p.v * bandH, r: 1.6, class: passesAt(p.u) > 0 ? 'hm-c seen' : 'hm-c' }, dots);
  }
  // Mines: laid before clearance plus any laid during it.
  const nLaid = Math.round(R.minesIn);
  const reDay = Math.min(day, R.finish ?? day);
  const nRe = S.remineWeek > 0 ? Math.floor(Math.max(0, reDay - MODEL.setupDays.v) * S.remineWeek / 7) : 0;
  const clearedShare = D.available > 0 ? D.processed / D.available : 0;
  const total = Math.min(MAX_DOTS, nLaid + nRe);
  let live = 0;
  for (let k = 0; k < total; k++) {
    const p = where(k, 3);
    const y0 = top + p.r * (bandH + gap);
    let j = passesAt(p.u);
    if (k >= nLaid) { // laid during clearance: only later passes count
      const arrive = MODEL.setupDays.v + (k - nLaid + 1) * 7 / S.remineWeek;
      const fa = R.days[Math.min(Math.round(arrive), R.days.length - 1)].frac * R.P;
      j = Math.max(0, Math.floor(passesDone - fa + (p.u < part ? 1 : 0)));
    }
    let found = false;
    for (let i = 0; i < j; i++) if (rand(k * 7 + i * 101) < R.pd) { found = true; break; }
    const cx = X(p.u), cy = y0 + p.v * bandH;
    if (found && rand(k * 53) < clearedShare) {
      mk('path', { d: `M${cx - 3},${cy - 3}L${cx + 3},${cy + 3}M${cx - 3},${cy + 3}L${cx + 3},${cy - 3}`, class: 'hm-m done', 'data-k': k, 'data-x': cx, 'data-y': cy }, dots);
    } else if (found) {
      mk('circle', { cx, cy, r: 4, class: 'hm-m found', 'data-k': k }, dots);
    } else {
      live++;
      mk('circle', { cx, cy, r: 3.4, class: 'hm-m live', 'data-k': k }, dots);
    }
  }
  return { live, drawn: total, capped: nLaid + nRe > MAX_DOTS };
}

export function drawChart(svg, S, R, day, bench, onDay) {
  const W = Math.max(300, Math.round(svg.parentElement.clientWidth || 800));
  const narrow = W < 560;
  const H = narrow ? 220 : 240;
  const m = { l: narrow ? 40 : 48, r: 12, t: 16, b: 30 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const last = Math.max(R.days.length - 1, bench + 20, 60);
  const x = d => m.l + d / last * pw;
  const yMax = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.4, 0.5, 0.8, 1].find(v => v >= R.riskStart * 1.05) || 1;
  const y = v => m.t + ph - Math.min(v, yMax) / yMax * ph;
  const ax = mk('g', { class: 'tsm-axis' }, svg);
  for (let k = 0; k <= 4; k++) {
    const v = yMax * k / 4;
    mk('line', { x1: m.l, x2: m.l + pw, y1: y(v), y2: y(v), class: 'hm-grid' }, svg);
    mk('text', { x: m.l - 5, y: y(v) + 4, 'text-anchor': 'end' }, ax, `${Math.round(v * 1000) / 10}%`);
  }
  const step = last > 200 ? 60 : last > 100 ? 30 : 14;
  for (let d = 0; d <= last; d += step) mk('text', { x: x(d), y: H - 10, 'text-anchor': 'middle' }, ax, d === 0 ? 'day 0' : d);
  // 2026 benchmark
  mk('line', { x1: x(bench), x2: x(bench), y1: m.t, y2: m.t + ph, class: 'hm-bench' }, svg);
  mk('text', { x: x(bench) - 4, y: m.t + 10, 'text-anchor': 'end', class: 'hm-bench-t' }, svg, narrow ? '2026' : `Hormuz 2026: ${bench} days`);
  if (R.finish != null) {
    mk('line', { x1: x(R.finish), x2: x(R.finish), y1: m.t, y2: m.t + ph, class: 'hm-fin' }, svg);
    mk('text', { x: x(R.finish) + 4, y: m.t + 24, class: 'hm-fin-t' }, svg, narrow ? `${R.finish} d` : `Model: ${R.finish} days`);
  }
  const pts = R.days.map(p => `${x(p.d).toFixed(1)},${y(p.risk).toFixed(1)}`);
  if (R.finish != null) pts.push(`${x(last).toFixed(1)},${y(R.days.at(-1).risk).toFixed(1)}`); // flat after clearance
  mk('path', { class: 'hm-risk', d: 'M' + pts.join('L') }, svg);
  const cx = x(Math.min(day, last));
  mk('line', { x1: cx, x2: cx, y1: m.t, y2: m.t + ph, class: 'hm-cursor' }, svg);
  const D = R.days[Math.min(day, R.days.length - 1)];
  mk('circle', { cx, cy: y(D.risk), r: 4.5, class: 'hm-dot' }, svg);
  svg.onpointerdown = ev => {
    const pick = e => { const r = svg.getBoundingClientRect(); onDay(Math.max(0, Math.min(last, Math.round(((e.clientX - r.left) * W / r.width - m.l) / pw * last)))); };
    pick(ev); svg.setPointerCapture(ev.pointerId);
    svg.onpointermove = pick;
    svg.onpointerup = () => { svg.onpointermove = null; };
  };
  return last;
}
