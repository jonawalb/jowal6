// Drawing: the hub-and-spokes diagram, the tracks, the ally cards and the end-of-game fear/entrapment charts.
// Schematic only: positions are not geography.
import { ALLIES, IDS, BY } from '../data/allies.js';
import { ping, tracer, burst } from '../../../shared/js/motion.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, a, parent) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (parent) parent.appendChild(n); return n; };
export const HUB = [330, 205], RIVAL_AT = [52, 205];
export const AT = { north: [470, 78], pen: [200, 78], arch: [490, 326], south: [190, 334] };
const label = { north: 'Northern Island', pen: 'Peninsula', arch: 'Archipelago', south: 'Southern Continent' };

/** Full redraw of the diagram from state `s` and intel estimates `I` (fear and entrapment as the hub sees them). */
export function drawHub(svg, s, I) {
  svg.innerHTML = '';
  el('rect', { x: 0, y: 0, width: 640, height: 400, fill: 'var(--panel)' }, svg);
  const links = el('g', {}, svg), spokes = el('g', {}, svg), nodes = el('g', {}, svg);
  const seen = new Set();
  for (const id of IDS) for (const o of s.allies[id].links) {
    const k = [id, o].sort().join('-'); if (seen.has(k)) continue; seen.add(k);
    const [x1, y1] = AT[id], [x2, y2] = AT[o];
    el('line', { x1, y1, x2, y2, stroke: 'var(--muted)', 'stroke-width': 2.5, 'stroke-dasharray': '2 6', 'stroke-linecap': 'round' }, links);
  }
  for (const a of ALLIES) {
    const x = s.allies[a.id], [ax, ay] = AT[a.id];
    el('line', { x1: HUB[0], y1: HUB[1], x2: ax, y2: ay, stroke: a.col, 'stroke-width': (1.5 + x.A / 12).toFixed(1), 'stroke-opacity': 0.75, 'stroke-dasharray': x.hedged ? '9 6' : 'none' }, spokes);
  }
  for (const id of Object.keys(s.probes || {})) {
    const [ax, ay] = AT[id], [rx, ry] = RIVAL_AT;
    const mx = (rx + ax) / 2, my = (ry + ay) / 2 + (ay < ry ? -20 : 20);
    el('path', { d: `M${rx} ${ry}Q${mx} ${my} ${ax - 26 * Math.sign(ax - rx)} ${ay}`, fill: 'none', stroke: 'var(--prc)', 'stroke-width': 1.5 + 2 * s.probes[id], 'stroke-dasharray': '6 5', opacity: 0.85 }, spokes);
  }
  el('rect', { x: RIVAL_AT[0] - 34, y: RIVAL_AT[1] - 20, width: 68, height: 40, rx: 4, fill: 'var(--prc)' }, nodes);
  el('text', { x: RIVAL_AT[0], y: RIVAL_AT[1] + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: 'var(--panel)' }, nodes).textContent = 'Rival';
  el('circle', { cx: HUB[0], cy: HUB[1], r: 30, fill: 'var(--brand-ink)', stroke: 'var(--panel)', 'stroke-width': 3 }, nodes);
  el('text', { x: HUB[0], y: HUB[1] + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: 'var(--panel)' }, nodes).textContent = 'Hub';
  for (const a of ALLIES) {
    const x = s.allies[a.id], [ax, ay] = AT[a.id], est = I[a.id];
    if (est.fear >= 60) el('circle', { cx: ax, cy: ay, r: 31, fill: 'none', stroke: 'var(--warn)', 'stroke-width': 3, 'stroke-dasharray': '3 4' }, nodes);
    if (est.entrap >= 40) el('circle', { cx: ax, cy: ay, r: 36, fill: 'none', stroke: 'var(--bad)', 'stroke-width': 3 }, nodes);
    if (s.crisis?.ally === a.id) el('circle', { cx: ax, cy: ay, r: 42, fill: 'none', stroke: 'var(--bad)', 'stroke-width': 2, 'stroke-dasharray': '1 5' }, nodes);
    el('circle', { cx: ax, cy: ay, r: 24, fill: a.col, stroke: 'var(--panel)', 'stroke-width': 3 }, nodes);
    el('text', { x: ax, y: ay + 5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: 'var(--panel)' }, nodes).textContent = Math.round(x.coh);
    const below = ay > HUB[1];
    el('text', { x: ax, y: below ? ay + 50 : ay - 42, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: 'var(--ink)' }, nodes).textContent = label[a.id];
    const tags = [x.presence ? `${'■'.repeat(x.presence)} forces` : '', x.stake === 2 ? 'treaty' : x.stake === 1 ? 'public pledge' : ''].filter(Boolean).join(' · ');
    if (tags) el('text', { x: ax, y: below ? ay + 65 : ay - 28 - 30, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)' }, nodes).textContent = tags;
  }
}

/** Light motion on the diagram after a year resolves. */
export function animateYear(svg, s, log) {
  for (const id of Object.keys(s.probes || {})) ping(svg, AT[id][0], AT[id][1], { color: 'var(--prc)', r: 40 });
  const c = log.find(l => l.kind === 'outcome');
  if (c) {
    const [ax, ay] = AT[c.ally];
    if (c.resp !== 'out') tracer(svg, HUB[0], HUB[1], ax, ay, { color: 'var(--brand-ink)', ms: 500 });
    if (c.war) burst(svg, ax, ay, { color: 'var(--bad)', n: 16, r: 34 });
  }
}

const bar = (label, v, col, note = '', d = 0) => `<div class="hs-track" style="--tc:${col}"><div><span>${label}</span><span class="num">${note}${Math.round(v)}${d ? ` <small class="muted">${d > 0 ? '+' : ''}${d}</small>` : ''}</span></div><div class="bar"><span style="width:${Math.max(0, Math.min(100, v))}%"></span></div></div>`;

export function paintHubTracks(div, s, budget, prev) {
  const d = k => (prev ? Math.round(s[k]) - Math.round(prev[k]) : 0);
  div.innerHTML = `<div class="hs-track"><div><span>Political capital this year</span><span class="num">${budget}</span></div></div>`
    + bar('Hub credibility', s.cred, 'var(--good)', '', d('cred'))
    + bar('War risk', s.war, 'var(--bad)', '', d('war'))
    + bar('Budget strain', s.strain, 'var(--warn)', '', d('strain'))
    + `<p class="fine">Wars so far: <b class="num">${s.wars.length}</b>. Strain above 25 costs a point of capital per 25.</p>`;
}

const MOOD = { steady: 'Steady', emboldened: 'Emboldened: free-riding, taking risks', deterrent: 'Hedging: talk of its own deterrent', accommodate: 'Hedging: drifting toward the Rival' };
export function paintAllyCards(div, s, I, planned) {
  div.innerHTML = ALLIES.map(a => {
    const x = s.allies[a.id], est = I[a.id], n = planned.filter(p => p.ally === a.id).length;
    return `<article class="hs-ally" style="--c:${a.col}" aria-label="${a.name}">
      <h3>${a.short}${s.probes?.[a.id] ? ' <span class="hs-probe">probed</span>' : ''}${n ? ` <span class="hs-n">${n} planned</span>` : ''}</h3>
      <p class="fine">Exposure to the Rival: ${x.exposure >= 0.8 ? 'very high' : x.exposure >= 0.55 ? 'high' : x.exposure >= 0.4 ? 'moderate' : 'low'} · ${MOOD[x.mood || 'steady']}</p>
      ${bar('Cohesion', x.coh, a.col)}${bar('Burden share (own effort)', x.effort, 'var(--c7)')}
      ${bar('Abandonment fear', est.fear, 'var(--warn)', '~')}${bar('Entrapment risk', est.entrap, 'var(--bad)', '~')}
      <p class="fine">${x.links.length ? 'Linked with ' + x.links.map(l => BY[l].short).join(', ') : 'No direct ties to other allies'}</p>
    </article>`;
  }).join('');
}

/** End screen: one small chart of a true per-ally series (fear or entrapment) by year, with each peak marked. */
export function paintSeries(svg, s, key, title) {
  svg.innerHTML = '';
  const W = 640, H = 210, L = 40, R = 130, T = 24, B = 26, yrs = s.track.slice(1);
  const n = yrs.length, x = i => L + (n <= 1 ? 0 : (i / (n - 1)) * (W - L - R)), y = v => T + (1 - v / 100) * (H - T - B);
  el('text', { x: L, y: 14, 'font-size': 13, 'font-weight': 700, fill: 'var(--ink)' }, svg).textContent = title;
  for (const v of [0, 50, 100]) {
    el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: 'var(--rule)' }, svg);
    el('text', { x: L - 6, y: y(v) + 4, 'font-size': 11, 'text-anchor': 'end', fill: 'var(--muted)' }, svg).textContent = v;
  }
  yrs.forEach((t, i) => { el('text', { x: x(i), y: H - 8, 'font-size': 11, 'text-anchor': 'middle', fill: 'var(--muted)' }, svg).textContent = `Y${t.turn + 1}`; });
  const used = [];
  for (const a of ALLIES) {
    const pts = yrs.map(t => t.allies[a.id][key]);
    el('polyline', { points: pts.map((v, i) => `${x(i)},${y(v)}`).join(' '), fill: 'none', stroke: a.col, 'stroke-width': 2.5 }, svg);
    const k = pts.indexOf(Math.max(...pts));
    if (k >= 0) el('circle', { cx: x(k), cy: y(pts[k]), r: 5, fill: a.col, stroke: 'var(--panel)', 'stroke-width': 2 }, svg);
    let ly = Math.min(H - B - 2, y(pts[pts.length - 1] ?? 0) + 4); while (used.some(u => Math.abs(u - ly) < 13)) ly -= 13; used.push(ly);
    el('text', { x: W - R + 6, y: ly, 'font-size': 12, 'font-weight': 600, fill: a.col }, svg).textContent = a.short;
  }
}
