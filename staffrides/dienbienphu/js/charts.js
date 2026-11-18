// Small inline-SVG charts with a hover tooltip and a "today" cursor.
import { parse, fmtDate, esc, fmtNum } from './util.js';

const W = 380;

function frame(el, { title, sub, h }) {
  el.classList.add('chart');
  el.innerHTML = `${title ? `<div class="ttl">${esc(title)}</div>` : ''}${sub ? `<div class="sub">${sub}</div>` : ''}
    <svg viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(title || 'chart')}"></svg><div class="tip"></div>`;
  return { svg: el.querySelector('svg'), tip: el.querySelector('.tip') };
}

function axisX(x0, x1, h, pad) {
  // month ticks
  let out = '';
  const a = new Date(x0), b = new Date(x1);
  const d = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 1, 1));
  for (; d <= b; d.setUTCMonth(d.getUTCMonth() + 1)) {
    const t = d.getTime();
    out += `<text x="${pad.sx(t)}" y="${h - 2}" font-size="10" fill="var(--muted)" text-anchor="middle">${fmtDate(d.toISOString(), { short: true }).split(' ')[1]}</text>`;
  }
  return out;
}

function hover(el, svg, tip, points, sx, render) {
  svg.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    let best = null, bd = Infinity;
    for (const p of points) { const dd = Math.abs(sx(p.t) - x); if (dd < bd) { bd = dd; best = p; } }
    if (!best || bd > 18) { tip.style.opacity = 0; return; }
    tip.innerHTML = render(best);
    tip.style.left = `${(sx(best.t) / W) * r.width}px`;
    tip.style.top = `${e.clientY - r.top}px`;
    tip.style.opacity = 1;
  });
  svg.addEventListener('pointerleave', () => { tip.style.opacity = 0; });
}

/**
 * Bar chart over dates. rows: [{d, total, parts?:{cat:v}, note?}], cats: [{key,label,color}]
 */
export function barChart(el, { title, sub, rows, cats, cursor, domain, unit = '', onPick, h = 120 }) {
  const { svg, tip } = frame(el, { title, sub, h });
  const pad = { l: 30, r: 6, t: 6, b: 16 };
  const x0 = parse(domain[0]).getTime(), x1 = parse(domain[1]).getTime();
  const sx = (t) => pad.l + ((t - x0) / (x1 - x0)) * (W - pad.l - pad.r);
  pad.sx = sx;
  const max = Math.max(...rows.map((r) => r.total)) || 1;
  const nice = Math.ceil(max / 50) * 50;
  const sy = (v) => h - pad.b - (v / nice) * (h - pad.t - pad.b);
  const bw = Math.max(2, (W - pad.l - pad.r) / ((x1 - x0) / 864e5) - 1.2);
  let g = '';
  for (const v of [0, nice / 2, nice]) {
    g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--rule)" stroke-width="1"/>`;
    g += `<text x="${pad.l - 4}" y="${sy(v) + 3}" font-size="10" fill="var(--muted)" text-anchor="end">${v}</text>`;
  }
  const pts = [];
  for (const r of rows) {
    const t = parse(r.d).getTime();
    const x = sx(t) - bw / 2;
    pts.push({ ...r, t });
    if (cats && r.parts) {
      let acc = 0;
      cats.forEach((c, i) => {
        const v = Number(r.parts[c.key] || 0);
        if (!v) return;
        const y0 = sy(acc), y1 = sy(acc + v);
        const gap = acc > 0 ? 1 : 0;
        g += `<rect x="${x}" y="${y1}" width="${bw}" height="${Math.max(0, y0 - y1 - gap)}" fill="${c.color}"/>`;
        acc += v;
      });
      const rest = r.total - acc;
      if (rest > 0.5) g += `<rect x="${x}" y="${sy(r.total)}" width="${bw}" height="${Math.max(0, sy(acc) - sy(r.total) - 1)}" fill="var(--muted)" opacity=".5"/>`;
    } else {
      g += `<rect x="${x}" y="${sy(r.total)}" width="${bw}" height="${sy(0) - sy(r.total)}" rx="1" fill="${cats?.[0]?.color || 'var(--accent)'}"/>`;
    }
  }
  if (cursor) {
    const t = parse(cursor).getTime();
    if (t >= x0 && t <= x1) g += `<line x1="${sx(t)}" x2="${sx(t)}" y1="${pad.t}" y2="${h - pad.b}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="3 2"/>`;
  }
  g += axisX(x0, x1, h, pad);
  svg.innerHTML = g;
  hover(el, svg, tip, pts, sx, (p) => {
    let s = `<b>${fmtDate(p.d)}</b>: ${fmtNum(Math.round(p.total))} ${unit}`;
    if (cats && p.parts) s += '<br>' + cats.filter((c) => p.parts[c.key]).map((c) => `${c.label} ${fmtNum(p.parts[c.key])}`).join(' · ');
    if (p.misdrop) s += `<br>misdropped ${fmtNum(p.misdrop)} ${unit}`;
    return s;
  });
  if (onPick) svg.addEventListener('click', (e) => {
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const t = x0 + ((x - pad.l) / (W - pad.l - pad.r)) * (x1 - x0);
    onPick(new Date(Math.min(x1, Math.max(x0, t))).toISOString().slice(0, 10));
  });
}

/** Step chart: points [{d, v, note}], value holds until the next point. */
export function stepChart(el, { title, sub, points, cursor, domain, color = 'var(--fr)', unit = '', h = 100, yMin = 0 }) {
  const { svg, tip } = frame(el, { title, sub, h });
  const pad = { l: 40, r: 8, t: 8, b: 16 };
  const x0 = parse(domain[0]).getTime(), x1 = parse(domain[1]).getTime();
  const sx = (t) => pad.l + ((Math.min(Math.max(t, x0), x1) - x0) / (x1 - x0)) * (W - pad.l - pad.r);
  pad.sx = sx;
  const vals = points.map((p) => Number(p.v));
  const max = Math.max(...vals), min = Math.min(yMin, ...vals);
  const sy = (v) => h - pad.b - ((v - min) / (max - min || 1)) * (h - pad.t - pad.b);
  const pts = points.map((p) => ({ ...p, t: parse(p.d).getTime() }));
  let path = '';
  pts.forEach((p, i) => {
    const x = sx(p.t), y = sy(Number(p.v));
    path += i === 0 ? `M${x},${y}` : `H${x}V${y}`;
  });
  path += `H${sx(x1)}`;
  let g = '';
  for (const v of [min, max]) {
    g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--rule)"/>`;
    g += `<text x="${pad.l - 4}" y="${sy(v) + 3}" font-size="10" fill="var(--muted)" text-anchor="end">${fmtNum(Math.round(v))}</text>`;
  }
  g += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;
  for (const p of pts) g += `<circle cx="${sx(p.t)}" cy="${sy(Number(p.v))}" r="3.2" fill="${color}" stroke="var(--surface)" stroke-width="1.5"/>`;
  if (cursor) {
    const t = parse(cursor).getTime();
    g += `<line x1="${sx(t)}" x2="${sx(t)}" y1="${pad.t}" y2="${h - pad.b}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="3 2"/>`;
  }
  g += axisX(x0, x1, h, pad);
  svg.innerHTML = g;
  hover(el, svg, tip, pts, sx, (p) => `<b>${fmtDate(p.d)}</b>: ${fmtNum(p.v)} ${unit}${p.note ? `<br>${esc(p.note).slice(0, 90)}` : ''}`);
}

/** Value of a step series at date d (last point on or before d). */
export function stepAt(points, d) {
  let v = null;
  for (const p of points) if (p.d <= d) v = p; else break;
  return v;
}
