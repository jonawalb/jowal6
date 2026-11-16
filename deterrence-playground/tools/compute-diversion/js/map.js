// The network map: supply on the left, hubs and their front companies in the middle, restricted end users on
// the right, rented cloud compute along the top. Line widths follow this quarter's (projected) volumes.
import { P } from '../data/params.js';
import { el } from '../../../shared/js/mapkit.js';
import { ping, burst, tracer } from '../../../shared/js/motion.js';
import { HUB_IDS, liveShells } from './network.js';

const W = 720, H = 400;
const pos = {
  src: { x: 70, y: 220 }, dst: { x: 655, y: 220 }, cloud: { x: 360, y: 42 },
  ...Object.fromEntries(P.hubs.map(h => [h.id, { x: h.x * W, y: h.y * H }])),
};
const width = v => Math.max(0, Math.min(18, Math.sqrt(Math.max(0, v)) * 1.9));
const curve = (a, b, bend = 0) => {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + bend;
  return `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`;
};
// Shells sit on the diagonals around their hub first, clear of the lines that enter and leave it.
const SLOTS = [-135, -45, 135, 45, -160, -20, 160, 20, -110, -70, 110, 70].map(d => d * Math.PI / 180);
export function shellPos(s, x) {
  const sib = s.shells.filter(z => z.hub === x.hub);
  const i = sib.indexOf(x), ring = Math.floor(i / SLOTS.length);
  const a = SLOTS[i % SLOTS.length], r = 44 + ring * 18;
  return { x: pos[x.hub].x + Math.cos(a) * r, y: pos[x.hub].y + Math.sin(a) * r };
}

/**
 * Draw the map. rec: a projected or resolved quarter record (routes with a, d, r). choice: pending actions.
 * on: { shell(id), hub(id) } click handlers. Returns nothing; the SVG is rebuilt each call.
 */
export function drawMap(svg, s, rec, choice, on) {
  svg.textContent = '';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const defs = el('defs', {}, svg);
  const mk = el('marker', { id: 'cd-arr', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defs);
  el('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'var(--bad)' }, mk);

  const g = el('g', { class: 'cd-edges' }, svg);
  const R = rec?.routes || {};
  for (const h of HUB_IDS) {
    if (s.hubs[h].cap <= 0 && !(R[h]?.a > 0)) continue;
    const r = R[h] || { a: 0, d: 0, r: 0 };
    el('path', { d: curve(pos.src, pos[h], 0), class: 'cd-in', 'stroke-width': Math.max(1, width(r.a)) }, g);
    const out = el('path', { d: curve(pos[h], pos.dst, 0), class: 'cd-out', 'stroke-width': Math.max(1, width(r.d)) }, g);
    if (r.d < 0.5) out.classList.add('dead');
    const mid = { x: (pos[h].x + pos.dst.x) / 2, y: (pos[h].y + pos.dst.y) / 2 - 6 };
    el('text', { x: mid.x, y: mid.y, class: 'cd-flow' }, g, Math.round(r.d));
  }
  const rc = R.cloud || { a: 0, d: 0 };
  el('path', { d: curve(pos.src, pos.cloud, -20), class: 'cd-in cloud', 'stroke-width': Math.max(1, width(rc.a)) }, g);
  el('path', { d: curve(pos.cloud, pos.dst, -20), class: 'cd-out cloud', 'stroke-width': Math.max(1, width(rc.d)) }, g);
  el('text', { x: (pos.cloud.x + pos.dst.x) / 2 + 18, y: (pos.cloud.y + pos.dst.y) / 2 - 18, class: 'cd-flow' }, g, Math.round(rc.d));

  // End nodes
  const node = (p, label, sub, cls) => {
    const n = el('g', { class: 'cd-end ' + cls }, svg);
    el('rect', { x: p.x - 54, y: p.y - 30, width: 108, height: 60, rx: 6 }, n);
    el('text', { x: p.x, y: p.y - 6, class: 'cd-lbl' }, n, label);
    el('text', { x: p.x, y: p.y + 13, class: 'cd-sub' }, n, sub);
  };
  node(pos.src, 'US and allied', 'chip supply', 'src');
  node(pos.dst, 'Restricted', 'end users', 'dst');
  const cn = el('g', { class: 'cd-cloud' + (s.pol.kyc != null ? ' ruled' : '') }, svg);
  el('rect', { x: pos.cloud.x - 70, y: pos.cloud.y - 20, width: 140, height: 40, rx: 20 }, cn);
  el('text', { x: pos.cloud.x, y: pos.cloud.y - 1, class: 'cd-lbl' }, cn, 'Rented cloud');
  el('text', { x: pos.cloud.x, y: pos.cloud.y + 13, class: 'cd-sub' }, cn, `capacity ${Math.round(s.cloud)}`);

  // Hubs with risk rings and shells
  const euc = {}, press = {}, listing = new Set();
  for (const a of choice || []) {
    if (a.k === 'euc') euc[a.t] = (euc[a.t] || 0) + 1;
    if (a.k === 'hub') press[a.t] = 1;
    if (a.k === 'list') listing.add(a.t);
  }
  for (const h of HUB_IDS) {
    const hb = s.hubs[h], p = pos[h], live = hb.cap > 0;
    const risk = R[h]?.r || 0;
    const n = el('g', { class: 'cd-hub' + (live ? '' : ' dormant'), tabindex: live ? 0 : -1, role: 'button', 'data-hub': h,
      'aria-label': live ? `${h === 'D' ? 'Hub D' : 'Hub ' + h}: capacity ${Math.round(hb.cap)}, risk ${Math.round(risk * 100)} percent, ${liveShells(s, h).length} live shells. Press to add an end-use check here.` : `Hub ${h}: dormant` }, svg);
    const r = 15 + Math.sqrt(Math.max(0, hb.cap)) * 1.6;
    el('circle', { cx: p.x, cy: p.y, r, class: 'cd-hubc' }, n);
    if (live && risk > 0.005) {
      const C = 2 * Math.PI * (r + 4);
      el('circle', { cx: p.x, cy: p.y, r: r + 4, class: 'cd-risk', 'stroke-dasharray': `${C * Math.min(1, risk)} ${C}`, transform: `rotate(-90 ${p.x} ${p.y})` }, n);
    }
    el('text', { x: p.x, y: p.y + 5, class: 'cd-hubl' }, n, h);
    if (euc[h]) el('text', { x: p.x + r - 2, y: p.y - r + 4, class: 'cd-badge' }, n, `✓${euc[h] > 1 ? euc[h] : ''}`);
    if (hb.lvl || press[h]) el('text', { x: p.x - r + 2, y: p.y - r + 4, class: 'cd-badge press' }, n, '◆'.repeat(hb.lvl + (press[h] ? 1 : 0)));
    if (!live) el('text', { x: p.x, y: p.y + r + 14, class: 'cd-sub' }, n, 'dormant');
    if (live && on?.hub) {
      n.addEventListener('click', () => on.hub(h));
      n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); on.hub(h); } });
    }
  }
  for (const x of s.shells) {
    const q = shellPos(s, x);
    const st = x.listed ? 'listed' : x.seen ? (listing.has(x.id) ? 'seen picked' : 'seen') : 'hidden';
    const label = x.listed ? `Shell ${x.id.slice(1)} at Hub ${x.hub}, on the Entity List` : x.seen ? `Shell ${x.id.slice(1)} at Hub ${x.hub}, identified. Press to ${listing.has(x.id) ? 'cancel the listing' : 'add it to the Entity List'}.` : `Unidentified front company at Hub ${x.hub}`;
    const n = el('g', { class: 'cd-shell ' + st, 'data-shell': x.id, ...(x.seen && !x.listed ? { tabindex: 0, role: 'button', 'aria-pressed': String(listing.has(x.id)) } : {}), 'aria-label': label }, svg);
    el('rect', { x: q.x - 9, y: q.y - 9, width: 18, height: 18, transform: `rotate(45 ${q.x} ${q.y})` }, n);
    el('text', { x: q.x, y: q.y + 4, class: 'cd-sh' }, n, x.listed ? '×' : x.seen ? x.id.slice(1) : '?');
    el('title', {}, n, label);
    if (x.seen && !x.listed && on?.shell) {
      n.addEventListener('click', () => on.shell(x.id));
      n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); on.shell(x.id); } });
    }
  }
}

/** After a quarter resolves: sparks on listed shells, rings on new and exposed ones, streaks for hub shifts. */
export function animateLog(svg, s, rec) {
  for (const a of rec.actions) if (a.k === 'list') { const x = s.shells.find(z => z.id === a.t); if (x) { const q = shellPos(s, x); burst(svg, q.x, q.y, { color: 'var(--bad)' }); } }
  for (const l of rec.log) {
    if (l.kind === 'spawn' || l.kind === 'detect') { const x = s.shells.find(z => z.id === l.id); if (x) { const q = shellPos(s, x); ping(svg, q.x, q.y, { color: l.kind === 'spawn' ? 'var(--warn)' : 'var(--c1)', r: 22 }); } }
    if (l.kind === 'shift') tracer(svg, pos[l.from].x, pos[l.from].y, pos[l.to].x, pos[l.to].y, { color: 'var(--warn)', ms: 900, width: 3 });
    if (l.kind === 'cloud') ping(svg, pos.cloud.x, pos.cloud.y, { color: 'var(--warn)', r: 50 });
    if (l.kind === 'case') ping(svg, pos[l.hub].x, pos[l.hub].y, { color: 'var(--good)', r: 60, width: 3 });
  }
}
