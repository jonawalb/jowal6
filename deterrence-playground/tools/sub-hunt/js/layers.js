// Map layers for one moment of a hunt: the opening ring, your sensors (this turn's queued ones dashed),
// the ship, contacts with their stated error, attacks and, in the review, the sub's true track.
import { el } from '../../../shared/js/mapkit.js';
import { SENSORS, GAME, PATROL } from '../data/params.js';
import { P, proj, ring, boxPath, wedgePath, setHeat } from './map.js';
import { activeAt, buoyPoints } from './sensors.js';
import { step, isLand } from './geo.js';

const S = SENSORS;
const LAB_OFF = { circle: S.circle.r, helo: S.helo.r, air: S.air.half };

function drawAsset(L, a, h, queued, reveal, u) {
  const live = activeAt(a, h + 1) || activeAt(a, h), done = a.t1 <= h;
  if (done && !reveal && h - a.t1 > 4) return; // old searches fade off the map during play
  const cls = `sh-asset sh-${a.type}${queued ? ' pending' : ''}${done ? ' done' : ''}${live ? ' live' : ''}`;
  let d;
  if (a.type === 'line') d = proj.line(a.ends);
  else if (a.type === 'air') d = boxPath(a.p, S.air.half);
  else d = ring(a.p, a.type === 'circle' ? S.circle.r : S.helo.r);
  el('path', { d, class: cls }, L);
  if (a.type === 'line') {
    // A buoy that would fall on land or off the game area is drawn hollow: no sub can pass there.
    for (const q of buoyPoints(a.p, a.ang)) {
      el('circle', { cx: P(q)[0], cy: P(q)[1], r: 2.6 * u, class: `sh-buoy${done ? ' done' : ''}${isLand(q[0], q[1]) ? ' dry' : ''}` }, L);
    }
  }
  const at = a.type === 'line' ? P(a.ends[0]) : P(step(a.p, 180, LAB_OFF[a.type]));
  const left = queued ? ' · queued' : done ? '' : ` · ${a.t1 - h} h`;
  el('text', { x: at[0], y: at[1] + 13 * u, class: `sh-lab sh-mid sh-alab${done ? ' done' : ''}` }, L, `${a.name}${left}`);
}

function drawContact(L, c, h, reveal, over, u) {
  const age = h - c.h;
  const cls = `sh-contact sh-c-${c.type}${reveal ? (c.real ? ' real' : ' false') : ''}${age > 2 ? ' old' : ''}`;
  const gC = el('g', { class: cls }, L);
  if (c.type === 'ship') {
    el('path', { d: wedgePath(c.from, c.brg, S.ship.brg * 2, 70), class: 'sh-wedge' }, gC);
    const tip = P(step(c.from, c.brg, 72));
    if (age <= 2 || reveal) el('text', { x: tip[0], y: tip[1], class: 'sh-lab sh-mid' }, gC, `C${c.n}`);
    return;
  }
  const [x, y] = P(c.p), k = 6 * u;
  const err = { circle: S.circle.loc, line: S.line.loc, air: S.air.loc, helo: S.helo.loc, net: S.net.loc }[c.type] * 2;
  if (age <= 2 || reveal) el('path', { d: ring(c.p, err), class: 'sh-err' }, gC);
  if (reveal && over && !c.real) el('path', { d: `M${x - k} ${y - k}L${x + k} ${y + k}M${x + k} ${y - k}L${x - k} ${y + k}`, class: 'sh-x' }, gC);
  else el('path', { d: `M${x} ${y - k}L${x + k} ${y}L${x} ${y + k}L${x - k} ${y}Z` }, gC);
  if (age <= 2 || reveal) el('text', { x: x + 1.4 * k, y: y - k, class: 'sh-lab' }, gC, `C${c.n}`);
}

/**
 * Draw one state of a hunt.
 * @param view { hour, snap, reveal }: hour is the clock hour shown; reveal draws the true track up to it.
 */
export function render(m, g, view, color) {
  const { layers: L } = m, h = view.hour, u = m.u || 1;
  Object.values(L).forEach(n => { if (n !== L.cursor) n.replaceChildren(); });
  setHeat(m, view.snap.heat, color);
  el('path', { d: ring(g.datum, GAME.datumR), class: 'sh-datum' }, L.datum);
  const [dx, dy] = P(step(g.datum, 0, GAME.datumR));
  const rep = (h === 0 || view.reveal) ? el('text', { x: dx, y: dy - 5 * u, class: 'sh-lab sh-mid' }, L.datum, `Report, ${GAME.reportAge} h before hour 0`) : null;
  PATROL.forEach(pt => {
    const [x, y] = P(pt.p), k = 7 * u;
    el('path', { d: `M${x - k} ${y}H${x + k}M${x} ${y - k}V${y + k}`, class: 'sh-patrol' }, L.datum);
    // A patrol point inside the opening ring gets its label just outside the ring, clear of the dashes and the report
    // label at the top, with a thin leader back to the cross.
    const [cx, cy] = P(g.datum), rp = Math.abs(dy - cy);
    if (Math.hypot(x - cx, y - cy) < rp + 12 * u) {
      let a = Math.atan2(y - cy, x - cx || 1e-6);
      const up = -Math.PI / 2, off = a - up;
      if (Math.abs(off) < 0.7) a = up + (off < 0 ? -0.7 : 0.7);
      const lx = cx + Math.cos(a) * (rp + 8 * u), ly = cy + Math.sin(a) * (rp + 8 * u);
      el('path', { d: `M${x} ${y}L${lx} ${ly}`, class: 'sh-patrol sh-leader' }, L.datum);
      el('text', { x: lx + (Math.cos(a) >= 0 ? 3 : -3) * u, y: ly + 4 * u, class: `sh-exitlab ${Math.cos(a) >= 0 ? '' : 'sh-end'}` }, L.datum, pt.k);
    } else {
      const t = el('text', { x: x + 1.3 * k, y: y - k, class: 'sh-exitlab' }, L.datum, pt.k);
      // Outside the ring the label can still run into the report label above it: drop it below the cross instead.
      if (rep) {
        const a = t.getBBox(), b = rep.getBBox();
        if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) t.setAttribute('y', y + 2.4 * k);
      }
    }
  });

  const nowH = g.turn * GAME.turnHours;
  for (const a of g.assets) {
    if (a.t0 - 1 > h) continue;
    drawAsset(L.assets, a, h, !view.reveal && a.t0 - 1 === nowH && h === nowH, view.reveal, u);
  }

  const trk = g.ship.track.slice(0, h + 1);
  el('path', { d: proj.line(trk), class: 'sh-shiptrack' }, L.ship);
  const sp = trk[trk.length - 1];
  if (view.order && !view.reveal) el('path', { d: proj.line([sp, view.order.dest]), class: `sh-shipplan${view.order.k === 'd' ? ' dash' : ''}` }, L.ship);
  const [sx, sy] = P(sp);
  el('path', { d: `M${sx} ${sy - 8 * u}L${sx + 6 * u} ${sy + 6 * u}L${sx - 6 * u} ${sy + 6 * u}Z`, class: 'sh-shipicon' }, L.ship);
  el('text', { x: sx + 9 * u, y: sy + 4 * u, class: 'sh-lab' }, L.ship, 'Ship');

  if (view.reveal) {
    const tr = g.subTrack.slice(0, h + 1);
    for (let i = 1; i < tr.length; i++) {
      el('path', { d: proj.line([tr[i - 1].p, tr[i].p]), class: `sh-truth${tr[i].sprint ? ' sprint' : ''}${tr[i].mode === 'hide' ? ' hide' : ''}` }, L.truth);
    }
    tr.forEach((s, i) => el('circle', { cx: P(s.p)[0], cy: P(s.p)[1], r: (i === tr.length - 1 ? 6 : 2.2) * u, class: i === tr.length - 1 ? 'sh-truthnow' : 'sh-truthdot' }, L.truth));
  }

  for (const c of g.contacts.filter(c => c.h <= h)) drawContact(L.contacts, c, h, view.reveal, !!g.over, u);

  for (const a of g.attacks.filter(x => x.h <= h)) el('path', { d: ring(a.p, GAME.prosR), class: `sh-pros ${a.hit ? 'found' : 'missed'}` }, L.contacts);
  if (!view.reveal) {
    for (const e of g.log.filter(x => x.t === g.turn && x.k === 'x')) el('path', { d: ring(e.p, GAME.prosR), class: 'sh-pros queued' }, L.contacts);
  }
}
