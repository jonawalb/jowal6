// Drawing: the schematic theatre, the ladder and tracks, the capitals table, intel bars and the end-of-game
// belief chart. Schematic only: no real positions, bases or targets.
import { P } from '../data/params.js';
import { COUNTRIES, IDS } from '../data/countries.js';
import { BY_ID, TO } from '../data/actions.js';
import { ISLAND, AREA_SHORT, AREA_LABEL } from '../data/theater.js';
import { tracer, burst, ping } from '../../../shared/js/motion.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, a, parent) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (parent) parent.appendChild(n); return n; };
export const COL = { us: 'var(--k-us)', tw: 'var(--k-tw)', cn: 'var(--k-cn)', jp: 'var(--k-jp)' };
export const AT = { cn: [118, 108], tw: [352, 250], jp: [532, 92], us: [596, 330] };


let svg, layer, rings, zones;
// Theater areas on the schematic (centre of each zone).
export const ZONE = { north: [372, 120], strait: [262, 250], south: [372, 352], east: [492, 250] };
export function drawTheatre(root) {
  svg = root; svg.innerHTML = '';
  el('rect', { x: -700, y: -200, width: 2040, height: 800, fill: 'var(--sea, #dfe9f1)', id: 'k4-sea' }, svg);
  el('path', { d: 'M-700 -200H250V0C262 40 250 80 262 120C272 160 300 190 296 230C292 270 262 300 250 340C240 370 230 390 226 400L210 600H-700Z', fill: 'var(--land, #eef0ea)', stroke: 'var(--coast, #9aa59a)', 'stroke-width': 1.5 }, svg);
  el('path', { d: 'M350 214C362 222 368 246 362 270C358 286 350 294 343 288C336 270 336 238 342 220Z', fill: 'var(--land, #eef0ea)', stroke: 'var(--coast, #9aa59a)', 'stroke-width': 1.5 }, svg);
  el('path', { d: 'M470 150C496 128 512 112 520 96C534 74 556 62 584 46C600 38 612 26 620 12L628 18C616 40 598 58 576 72C556 86 546 104 532 118C516 134 498 150 478 160Z', fill: 'var(--land, #eef0ea)', stroke: 'var(--coast, #9aa59a)', 'stroke-width': 1.5 }, svg);
  for (const [x, y] of [[452, 170], [432, 184], [412, 196], [392, 206]]) el('circle', { cx: x, cy: y, r: 3, fill: 'var(--land, #eef0ea)', stroke: 'var(--coast, #9aa59a)' }, svg);
  el('text', { x: 300, y: 330, 'font-size': 12, fill: 'var(--muted)', 'font-style': 'italic' }, svg).textContent = 'Taiwan Strait';
  el('text', { x: 470, y: 380, 'font-size': 12, fill: 'var(--muted)', 'font-style': 'italic' }, svg).textContent = 'Pacific (not to scale)';
  zones = el('g', {}, svg);
  rings = el('g', {}, svg);
  for (const id of IDS) {
    const [x, y] = AT[id];
    const g = el('g', { class: 'cap' }, svg);
    el('circle', { cx: x, cy: y, r: 9, fill: COL[id], stroke: 'var(--panel)', 'stroke-width': 2.5 }, g);
    const t = el('text', { x: id === 'us' ? x - 14 : x + 14, y: y + 4, 'font-size': 14, 'font-weight': 700, fill: COL[id], 'text-anchor': id === 'us' ? 'end' : 'start' }, g);
    t.textContent = COUNTRIES[id].capital;
  }
  layer = el('g', {}, svg);
}

/** Zones with each side's strength. see(who, area) returns null, { exact, v } or a range { lo, hi } (js/fog-panel.js). */
export function paintZones(s, see) {
  if (!zones) return;
  zones.innerHTML = '';
  const fill = { red: 'var(--k-cn)', blue: 'var(--k-us)', contested: 'var(--warn)', empty: 'transparent' };
  const label = r => (r.exact ? String(r.v < 1 ? +r.v.toFixed(1) : Math.round(r.v)) : `${r.lo}–${r.hi}`);
  for (const [a, [x, y]] of Object.entries(ZONE)) {
    const c = s.ctrl[a];
    el('ellipse', { cx: x, cy: y, rx: 58, ry: 34, fill: fill[c], 'fill-opacity': c === 'empty' ? 0 : 0.1, stroke: c === 'contested' ? 'var(--warn)' : fill[c] === 'transparent' ? 'var(--muted)' : fill[c], 'stroke-dasharray': '5 4', 'stroke-opacity': 0.8 }, zones);
    el('text', { x, y: y - 12, 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle', fill: 'var(--ink)', 'letter-spacing': '.08em' }, zones).textContent = { north: 'NORTH', strait: 'STRAIT', south: 'SOUTH', east: 'EAST' }[a];
    // Exact strengths as discs; ranges (fog of war) as dashed pills.
    const parts = [['cn', 'var(--k-cn)'], ['us', 'var(--k-us)'], ['jp', 'var(--k-jp)'], ['tw', 'var(--k-tw)']].map(([w, col]) => [w, col, see(w, a)]).filter(([, , r]) => r);
    const wd = parts.map(([, , r]) => (r.exact ? 26 : 8 + 6.4 * label(r).length));
    let dx = x - (wd.reduce((t, v) => t + v, 0) + 3 * (parts.length - 1)) / 2;
    parts.forEach(([w, col, r], i) => {
      const cx = dx + wd[i] / 2;
      if (r.exact) el('circle', { cx, cy: y + 8, r: 13, fill: col, stroke: 'var(--panel)', 'stroke-width': 1.5 }, zones);
      else el('rect', { x: dx, y: y - 4, width: wd[i], height: 24, rx: 12, fill: col, 'fill-opacity': 0.72, stroke: 'var(--panel)', 'stroke-width': 1.5, 'stroke-dasharray': '3 2' }, zones);
      el('text', { x: cx, y: y + 12, 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle', fill: '#fff' }, zones).textContent = label(r);
      dx += wd[i] + 3;
    });
    el('text', { x, y: y + 33, 'font-size': 10, 'text-anchor': 'middle', fill: 'var(--muted)' }, zones).textContent = c === 'red' ? 'China holds' : c === 'blue' ? 'Coalition holds' : c === 'contested' ? 'Contested' : '';
  }
  const [tx, ty] = AT.tw;
  // Taiwan's coast: four landing sectors and the inland reserve, with the strength you can see in each.
  const tv = a => see('tw', a) || { exact: true, v: 0 };
  const t = el('text', { x: tx, y: ty + 58, 'font-size': 10.5, fill: 'var(--k-tw)', 'font-weight': 600, 'text-anchor': 'middle' }, zones);
  t.textContent = ISLAND.map(a => `${AREA_SHORT[a]} ${label(tv(a))}`).join(' · ');
  const tt = el('title', {}, t); tt.textContent = ISLAND.map(a => `${AREA_LABEL[a]}: ${label(tv(a))}`).join('; ');
  for (const [a, dx, dy] of [['nw', -14, -26], ['cw', -16, 0], ['sw', -10, 28], ['ec', 14, 6]]) {
    const r = tv(a), v = r.exact ? r.v : (r.lo + r.hi) / 2;
    el('circle', { cx: tx + dx, cy: ty + dy, r: 3 + Math.min(4, v * 1.5), fill: 'var(--k-tw)', 'fill-opacity': v > 0 ? 0.75 : 0.15, stroke: 'var(--panel)', 'stroke-width': 1, ...(r.exact ? {} : { 'stroke-dasharray': '2 1.5' }) }, zones);
  }
}

export function paintTheatre(s) {
  if (!svg) return;
  rings.innerHTML = '';
  const [x, y] = AT.tw;
  if (s.blockade) el('circle', { cx: x, cy: y, r: 62, fill: 'none', stroke: COL.cn, 'stroke-width': 3, 'stroke-dasharray': '10 6', opacity: 0.8 }, rings);
  else if (s.rung >= 1) el('circle', { cx: x, cy: y, r: 48, fill: 'none', stroke: COL.cn, 'stroke-width': 2, 'stroke-dasharray': '2 6', opacity: 0.7 }, rings);
  if (s.basing === 'open') el('text', { x: 520, y: 128, 'font-size': 11, fill: COL.jp }, rings).textContent = 'bases open to U.S.';
  if (s.basing === 'limited') el('text', { x: 520, y: 128, 'font-size': 11, fill: COL.jp }, rings).textContent = 'base use limited';
  const sea = svg.querySelector('#k4-sea');
  sea.setAttribute('fill', s.rung >= 3 ? 'color-mix(in srgb, var(--bad) 10%, var(--sea, #dfe9f1))' : 'var(--sea, #dfe9f1)');
}

/** Arrows for one capital's revealed moves; resolves when drawn. */
export async function animateMoves(who, actions, log) {
  if (!svg) return;
  for (const id of actions) {
    const to = TO[id] || who, [x1, y1] = AT[who], [x2, y2] = AT[to];
    const res = log.find(l => l.who === who && l.id === id);
    if (to === who) ping(svg, x1, y1, { color: COL[who], r: 30 });
    else await Promise.race([tracer(svg, x1, y1, x2, y2, { color: COL[who], ms: 380 }), new Promise(r => setTimeout(r, 700))]);
    if (res && res.status === 'success' && BY_ID[id].line === 'M' && BY_ID[id].tags.includes('esc')) burst(svg, x2, y2, { color: COL[who] });
  }
}

export function paintLadder(ol, s) {
  // Rungs 0–1 are the gray zone: coercion below military action (coast guard, militia, cables, cyber).
  ol.innerHTML = P.ladder.map((l, i) => `<li class="${i === s.rung ? 'on' : i <= s.maxRung ? 'past' : ''}" style="--r:${i}"><i>${i}</i>${i === 0 ? 'Pressure' : l}${i <= 1 ? ' <small class="k4-gz">gray zone</small>' : ''}</li>`).join('');
}

const TRACKS = [
  ['tw', 'Taiwan’s position', 'var(--k-tw)'], ['coal', 'Coalition cohesion', 'var(--k-us)'],
  ['shock', 'Global economic shock', 'var(--warn)'], ['nuke', 'Nuclear shadow', 'var(--bad)'],
];
export function paintTracks(div, s, prev) {
  div.innerHTML = TRACKS.map(([k, label, c]) => {
    const v = Math.round(s[k]), d = prev ? v - Math.round(prev[k]) : 0;
    return `<div class="k4-track" style="--tc:${c}"><div><span>${label}</span><span class="num">${v}${d ? ` <small class="muted">${d > 0 ? '+' : ''}${d}</small>` : ''}</span></div><div class="bar"><span style="width:${v}%"></span></div></div>`;
  }).join('');
}

export function paintCaps(table, s, player) {
  table.innerHTML = `<tr><th></th><th>Home</th><th>Econ</th><th>Mil</th></tr>` + IDS.map(id => {
    const c = s.c[id];
    return `<tr><td style="--c:${COL[id]}"><b>${COUNTRIES[id].short}</b>${id === player ? ' (you)' : ''}</td><td class="num">${Math.round(c.support)}</td><td class="num">${Math.round(c.economy)}</td><td class="num">${Math.round(c.military)}</td></tr>`;
  }).join('');
}

const stack = v => P.types.map(t => `<span class="${t}" style="width:${(v[t] * 100).toFixed(1)}%" title="${P.typeLabel[t]} ${Math.round(v[t] * 100)}%"></span>`).join('');
const best = v => P.types.reduce((a, t) => (v[t] > v[a] ? t : a));
export function paintIntel(div, views, theirs, player) {
  const rivals = IDS.filter(id => id !== player);
  div.innerHTML = `<h3>Your read of them</h3>` + rivals.map(id => `<div class="k4-tb" style="--c:${COL[id]}"><span class="who">${COUNTRIES[id].short}</span> looks ${P.typeLabel[best(views[id])].toLowerCase()} (${Math.round(views[id][best(views[id])] * 100)}%)<div class="stack">${stack(views[id])}</div></div>`).join('')
    + `<h3>What they seem to think of you</h3>` + rivals.map(id => `<div class="k4-tb" style="--c:${COL[id]}"><span class="who">${COUNTRIES[id].short}</span> reads you as ${P.typeLabel[best(theirs[id])].toLowerCase()}<div class="stack">${stack(theirs[id])}</div></div>`).join('')
    + `<p class="k4-key"><span><i style="background:var(--bad)"></i>Resolute</span><span><i style="background:var(--good)"></i>Cautious</span><span><i style="background:var(--warn)"></i>Opportunist</span><span>Estimates are noisy.</span></p>`;
}

/** End screen: each rival's probability that the player is their true type, by month. */
export function paintBeliefChart(root, series, player, trueType, months) {
  root.innerHTML = '';
  const W = 640, H = 220, L = 40, R = 16, T = 12, B = 30, n = months.length;
  const x = i => L + (n <= 1 ? 0 : (i / (n - 1)) * (W - L - R)), y = v => T + (1 - v) * (H - T - B);
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: 'var(--rule)' }, root);
    el('text', { x: L - 6, y: y(v) + 4, 'font-size': 11, 'text-anchor': 'end', fill: 'var(--muted)' }, root).textContent = `${v * 100}%`;
  }
  months.forEach((m, i) => { el('text', { x: x(i), y: H - 10, 'font-size': 11, 'text-anchor': 'middle', fill: 'var(--muted)' }, root).textContent = m; });
  const used = [];
  const labelY = v => { while (used.some(u => Math.abs(u - v) < 13)) v += 13; used.push(v); return v; };
  for (const id of IDS.filter(w => w !== player)) {
    const pts = series.map(b => b[id][player][trueType]);
    el('polyline', { points: pts.map((v, i) => `${x(i)},${y(v)}`).join(' '), fill: 'none', stroke: COL[id], 'stroke-width': 2.5 }, root);
    let k = 1, big = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i] - pts[i - 1]) > big) { big = Math.abs(pts[i] - pts[i - 1]); k = i; }
    if (pts.length > 1) el('circle', { cx: x(k), cy: y(pts[k]), r: 5, fill: COL[id], stroke: 'var(--panel)', 'stroke-width': 2 }, root);
    const ly = labelY(y(pts[pts.length - 1]) - 6);
    el('text', { x: W - R, y: ly, 'font-size': 12, 'font-weight': 700, 'text-anchor': 'end', fill: COL[id] }, root).textContent = COUNTRIES[id].short;
  }
}
