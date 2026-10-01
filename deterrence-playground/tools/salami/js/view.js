// Drawing: the schematic shoal, the tracks, the belief bars and the debrief timeline. Schematic only: no real places.
import { P, LEVELS, NORM } from '../data/params.js';
const NORM_WINDOW = NORM.window;
import { tracer, burst, ping } from '../../../shared/js/motion.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, a, parent) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (parent) parent.appendChild(n); return n; };
const txt = (parent, a, s) => { el('text', a, parent).textContent = s; };
export const COL = { c: 'var(--k-c)', p: 'var(--k-p)', a: 'var(--k-a)' };
const SHOAL = [430, 170], PORT = [70, 250], POWER = [610, 40], PATRON = [600, 300];

let svg, dyn;
export function drawShoal(root) {
  svg = root; svg.innerHTML = '';
  el('rect', { x: 0, y: 0, width: 640, height: 320, fill: 'var(--sea)' }, svg);
  el('path', { d: 'M0 0H120C110 60 140 110 120 160C104 200 130 250 112 320H0Z', fill: 'var(--land)', stroke: 'var(--coast)', 'stroke-width': 1.5 }, svg);
  el('ellipse', { cx: SHOAL[0], cy: SHOAL[1], rx: 70, ry: 44, fill: 'color-mix(in srgb, var(--land) 45%, var(--sea))', stroke: 'var(--coast)', 'stroke-dasharray': '3 4' }, svg);
  const ship = el('g', { transform: `translate(${SHOAL[0] - 26} ${SHOAL[1] - 8}) rotate(-12 26 8)` }, svg);
  el('path', { d: 'M0 4H52L46 16H6Z', fill: 'var(--muted)', stroke: 'var(--ink)', 'stroke-width': 1 }, ship);
  el('rect', { x: 18, y: -6, width: 14, height: 10, fill: 'var(--muted)', stroke: 'var(--ink)', 'stroke-width': 1 }, ship);
  el('circle', { cx: PORT[0], cy: PORT[1], r: 6, fill: COL.c, stroke: 'var(--panel)', 'stroke-width': 2 }, svg);
  el('path', { d: `M${PORT[0] + 8} ${PORT[1] - 4}Q 260 260 ${SHOAL[0] - 60} ${SHOAL[1] + 18}`, fill: 'none', stroke: COL.c, 'stroke-dasharray': '2 6', 'stroke-width': 2, opacity: 0.7 }, svg);
  txt(svg, { x: 16, y: 300, 'font-size': 12, fill: 'var(--muted)', 'font-style': 'italic' }, 'Coastal State');
  txt(svg, { x: SHOAL[0], y: SHOAL[1] + 64, 'font-size': 12, fill: 'var(--muted)', 'font-style': 'italic', 'text-anchor': 'middle' }, 'The shoal (not to scale)');
  dyn = el('g', {}, svg);
}

/** Cutters around the shoal (one per rung), the Patron's ships if on scene, the garrison's stock. */
export function paintShoal(s, level) {
  if (!dyn) return;
  dyn.innerHTML = '';
  const n = level === 5 ? 8 : Math.max(1, level + 1);
  for (let i = 0; i < n; i++) {
    const a = level === 5 ? (i / n) * Math.PI * 2 : -0.2 - i * 0.55, r = level === 0 ? 110 : 84 - Math.min(level, 4) * 4;
    const x = SHOAL[0] + Math.cos(a) * r * 1.25, y = SHOAL[1] + Math.sin(a) * r * 0.8;
    el('path', { d: `M${x - 9} ${y}L${x + 9} ${y}L${x + 5} ${y + 6}H${x - 6}Z`, fill: COL.p, stroke: 'var(--panel)', 'stroke-width': 1 }, dyn);
  }
  if (s.onScene > 0) for (const [dx, dy] of [[0, 0], [24, -14]]) {
    const x = PATRON[0] - 40 + dx, y = PATRON[1] - 50 + dy;
    el('path', { d: `M${x - 12} ${y}L${x + 12} ${y}L${x + 7} ${y + 8}H${x - 8}Z`, fill: COL.a, stroke: 'var(--panel)', 'stroke-width': 1 }, dyn);
  }
  const w = 60, f = Math.max(0, Math.min(1, s.supplies / P.maxSupplies));
  el('rect', { x: SHOAL[0] - w / 2, y: SHOAL[1] - 40, width: w, height: 7, rx: 3, fill: 'var(--chip)', stroke: 'var(--rule)' }, dyn);
  el('rect', { x: SHOAL[0] - w / 2, y: SHOAL[1] - 40, width: w * f, height: 7, rx: 3, fill: s.supplies < 1.5 ? 'var(--bad)' : 'var(--good)' }, dyn);
  const sea = svg.querySelector('rect');
  sea.setAttribute('fill', s.esc > 55 ? 'color-mix(in srgb, var(--bad) 12%, var(--sea))' : 'var(--sea)');
}

/** The month's encounter: the boat sails, stops short if it fails; sparks for collisions; a ring for the Patron. */
export async function animateMonth(h) {
  if (!svg) return;
  const sea = ['civ', 'cg', 'press', 'patron'].includes(h.c.method);
  const [x2, y2] = [SHOAL[0] - 30, SHOAL[1] + 10];
  if (h.c.method === 'air') await tracer(svg, PORT[0], PORT[1] - 60, x2, y2 - 20, { color: COL.c, ms: 500 });
  else if (sea) {
    const k = h.delivered > 0 ? 1 : 0.62;
    await tracer(svg, PORT[0], PORT[1], PORT[0] + (x2 - PORT[0]) * k, PORT[1] + (y2 - PORT[1]) * k, { color: COL.c, ms: 600 });
  }
  if (h.injury || h.seized) burst(svg, x2 - 20, y2, { color: 'var(--bad)' });
  if (h.p.level >= 2 && h.enc) ping(svg, SHOAL[0], SHOAL[1], { color: COL.p, r: 60 });
  if (h.resp === 'warning' || h.resp === 'intervene') {
    await tracer(svg, PATRON[0], PATRON[1], SHOAL[0] + 50, SHOAL[1] + 30, { color: COL.a, ms: 500 });
    ping(svg, SHOAL[0], SHOAL[1], { color: COL.a, r: h.resp === 'intervene' ? 110 : 70, width: 3 });
  }
}

const TRACKS = [
  ['supplies', 'Garrison supplies', COL.c, s => (100 * s.supplies) / P.maxSupplies, s => s.supplies.toFixed(1) + ' mo'],
  ['sympathy', 'International sympathy for the Coastal State', 'var(--good)'],
  ['esc', 'Escalation risk', 'var(--bad)'],
  ['cred', 'Patron credibility', COL.a],
  ['domC', 'Home pressure: Coastal State', COL.c],
  ['domP', 'Home pressure: Power', COL.p],
];
export function paintTracks(div, s, prev) {
  div.innerHTML = TRACKS.map(([k, label, c, pct, fmt]) => {
    const v = s[k], d = prev ? v - prev[k] : 0, w = pct ? pct(s) : v;
    const dd = Math.abs(d) >= (k === 'supplies' ? 0.05 : 0.5) ? ` <small class="muted">${d > 0 ? '+' : ''}${k === 'supplies' ? d.toFixed(1) : Math.round(d)}</small>` : '';
    return `<div class="sl-track" style="--tc:${c}"><div><span>${label}</span><span class="num">${fmt ? fmt(s) : Math.round(v)}${dd}</span></div><div class="bar"><span style="width:${Math.max(0, Math.min(100, w))}%"></span></div></div>`;
  }).join('');
}

/**
 * Belief bars over a threshold. prior/post: arrays; labels per value; mark = index of the value your choice reaches
 * (drawn as a dashed line); truth = index revealed at the end.
 */
export function paintBelief(root, { prior, post, labels, mark = null, truth = null, color }) {
  root.innerHTML = '';
  const W = 320, H = 150, L = 10, B = 34, bw = (W - 2 * L) / post.length, top = 26;
  const ymax = Math.max(0.5, ...post, ...prior), y = v => H - B - (v / ymax) * (H - B - top);
  el('line', { x1: L, x2: W - L, y1: y(0), y2: y(0), stroke: 'var(--rule)' }, root);
  post.forEach((v, i) => {
    const x = L + i * bw;
    el('rect', { x: x + 6, y: y(v), width: bw - 12, height: Math.max(0, y(0) - y(v)), fill: color, opacity: truth === null || truth === i ? 0.85 : 0.35, rx: 2, class: 'sl-bel' }, root);
    el('rect', { x: x + 6, y: y(prior[i]), width: bw - 12, height: Math.max(0, y(0) - y(prior[i])), fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '3 3' }, root);
    txt(root, { x: x + bw / 2, y: y(v) - 4, 'font-size': 11, 'text-anchor': 'middle', fill: 'var(--ink)' }, `${Math.round(v * 100)}%`);
    txt(root, { x: x + bw / 2, y: H - B + 14, 'font-size': 11, 'text-anchor': 'middle', fill: truth === i ? 'var(--ink)' : 'var(--muted)', 'font-weight': truth === i ? 700 : 400 }, labels[i]);
    if (truth === i) txt(root, { x: x + bw / 2, y: H - B + 28, 'font-size': 10.5, 'text-anchor': 'middle', fill: 'var(--ink)', 'font-weight': 700 }, 'TRUE');
  });
  if (mark !== null) {
    const x = L + Math.max(0, Math.min(post.length, mark)) * bw;
    el('line', { x1: x, x2: x, y1: top - 6, y2: y(0) + 4, stroke: 'var(--accent)', 'stroke-width': 2.5, 'stroke-dasharray': '5 3' }, root);
    txt(root, { x: Math.min(W - 4, Math.max(4, x)), y: top - 2, 'font-size': 10.5, 'text-anchor': mark <= 0 ? 'start' : mark >= post.length ? 'end' : 'middle', fill: 'var(--accent)', 'font-weight': 700 }, 'YOU');
  }
}

/** Debrief: effective level against the Patron's line, provocation against the Power's threshold, month by month. */
export function paintTimeline(root, s, rows, showT = true) {
  root.innerHTML = '';
  const W = 640, PH = 120, L = 36, R = 12, n = P.turns, x = i => L + (i + 0.5) * ((W - L - R) / n);
  const panel = (y0, max, line, label, vals, tone, lineLabel) => {
    const y = v => y0 + PH - (v / max) * (PH - 16);
    for (let v = 0; v <= max; v += 2) { el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: 'var(--rule)' }, root); txt(root, { x: L - 6, y: y(v) + 4, 'font-size': 10.5, 'text-anchor': 'end', fill: 'var(--muted)' }, v); }
    txt(root, { x: L, y: y0 + 8, 'font-size': 11.5, 'font-weight': 700, fill: 'var(--ink)' }, label);
    if (line !== null) {
      el('line', { x1: L, x2: W - R, y1: y(line), y2: y(line), stroke: 'var(--bad)', 'stroke-width': 2, 'stroke-dasharray': '7 4' }, root);
      txt(root, { x: W - R, y: y(line) - 4, 'font-size': 10.5, 'text-anchor': 'end', fill: 'var(--bad)', 'font-weight': 700 }, lineLabel);
    }
    vals.forEach((v, i) => { if (v === null) return; el('circle', { cx: x(i), cy: y(v), r: 6, fill: tone(i), stroke: 'var(--panel)', 'stroke-width': 1.5 }, root); });
  };
  const respTone = { none: 'var(--muted)', silence: 'var(--muted)', concern: 'var(--k-a)', warning: 'var(--warn)', intervene: 'var(--bad)' };
  panel(4, 8, s.R, 'What the Patron saw (effective rung)', rows.map(r => r.E), i => respTone[rows[i].resp], `Patron’s line: ${s.R}`);
  { // the normalized baseline creeping up (or held), drawn as a step line on the same rung scale
    const y = v => 4 + PH - (v / 8) * (PH - 16), pts = rows.map((r, i) => `${x(i) - 14},${y(r.base)} ${x(i) + 14},${y(r.base)}`).join(' ');
    el('polyline', { points: pts, fill: 'none', stroke: 'var(--k-p)', 'stroke-width': 3, opacity: 0.75 }, root);
    txt(root, { x: L + 4, y: y(Math.max(...rows.map(r => r.base), 0)) - 5, 'font-size': 10.5, fill: 'var(--k-p)', 'font-weight': 700 }, 'normal baseline');
  }
  panel(PH + 30, 6, showT ? s.T : null, 'Coastal provocation', rows.map(r => r.P), i => (rows[i + 1] && s.history[i].p.level <= 3 && s.history[i + 1].p.level >= s.history[i].p.level + 2 ? 'var(--bad)' : 'var(--k-c)'), `Power’s threshold: ${s.T}`);
  rows.forEach((r, i) => { if (r.smash) txt(root, { x: x(i), y: 4 + PH - 20, 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle', fill: 'var(--bad)' }, 'SMASH'); });
  rows.forEach((r, i) => txt(root, { x: x(i), y: 2 * PH + 46, 'font-size': 10.5, 'text-anchor': 'middle', fill: 'var(--muted)' }, P.months[i].slice(0, 3)));
}
export const levelLabel = i => (i >= LEVELS.length ? 'Beyond' : LEVELS[i].label);

/** The normal at the shoal: every rung's status and counter, the same for both sides. */
export function paintNormal(div, s, cs, base) {
  const W = NORM_WINDOW;
  div.innerHTML = `<h3>The normal at the shoal</h3>
    <ol class="sl-norm" aria-label="Status of each rung">${LEVELS.map((lv, i) => {
      const c = cs.find(x => x.r === i);
      const st = !c ? (i === 0 ? 'base' : 'never') : c.normal ? 'normal' : c.count ? 'tipping' : 'contested';
      const tag = !c ? (i === 0 ? 'always normal' : 'never normal') : c.normal ? 'normal' : c.count ? `${c.count} of 2` : 'contested';
      return `<li class="${st}${i === base ? ' top' : ''}"><b>${lv.label}</b><span>${tag}</span>${i === base ? '<i>baseline</i>' : ''}</li>`;
    }).join('')}</ol>
    <ul class="sl-normx">${cs.map(c => `<li>${c.normal
      ? `<b>${c.label}</b>: normal. Answer 3 of its last 4 uses, or draw a Patron warning, to push it back (now ${c.answeredOfLast} of the last ${c.lastUses} answered).`
      : c.count ? `<b>${c.label}</b>: ${c.count} unanswered use in the last ${W} months. One more and it becomes normal.`
      : `<b>${c.label}</b>: contested.`}</li>`).join('')}</ul>
    <p class="fine">Any use of a rung, or a higher one, that meets a mission counts. It is <b>answered</b> if the Coastal State protests or goes to court, sails with journalists or Patron observers, or pushes through with an escort. Answers cost escalation risk and anger the Power, and protests wear thin if repeated month after month.</p>`;
}
