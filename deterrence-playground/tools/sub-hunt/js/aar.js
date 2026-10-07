// After-action review text: what the sub was doing, and where you nearly had it, in plain words.
// Everything is computed from the hunt's own record (true track, your sensors, contacts, attacks).
import { GAME, SENSORS, BEHAVIOURS, SUB, PATROL } from '../data/params.js';
import { pDetect } from './sensors.js';
import { dist, bearing, offset, distToSegment } from './geo.js';
import { routeName, dirOf, pct } from './panel.js';

const S = SENSORS;
const WHO = { circle: 'buoy circle', line: 'buoy line', air: 'aircraft box', helo: 'helicopter dip' };
const state = t => ({ lon: t.p[0], lat: t.p[1], plon: t.prev[0], plat: t.prev[1], sprint: t.sprint, speed: t.speed, mode: t.mode, out: false });
const span = (a, b) => (a === b ? `hour ${a}` : `hours ${a}–${b}`);

/** How far the sub was outside an asset's footprint at hour h (0 if inside). */
function gap(a, q) {
  if (a.type === 'circle') return Math.max(0, dist(q, a.p) - S.circle.r);
  if (a.type === 'helo') return Math.max(0, dist(q, a.p) - S.helo.r);
  if (a.type === 'air') { const [x, y] = offset(a.p, q); return Math.hypot(Math.max(0, Math.abs(x) - S.air.half), Math.max(0, Math.abs(y) - S.air.half)); }
  return distToSegment(q, a.ends[0], a.ends[1]);
}

/** The sub's story: which behaviour, which gap, and the telling moments of it. */
export function story(g) {
  const s = g.sub, tr = g.subTrack.slice(1);
  const n = m => tr.filter(t => t.mode === m).length;
  if (s.beh === 'loiter') {
    const r = Math.round(dist(PATROL[s.home].p, g.subTrack[g.subTrack.length - 1].p));
    return `It was a loiterer. It went to patrol point ${PATROL[s.home].k} and circled it about ${r} nm out, quiet the whole time.`;
  }
  const to = `heading for the ${routeName(s.route)} gap`;
  if (s.beh === 'sprinter') {
    const hrs = tr.map((t, i) => (t.mode === 'sprint' ? i + 1 : 0)).filter(Boolean);
    const heard = g.contacts.filter(c => c.type === 'net' && c.real).length;
    return `It was a sprint-and-drift sub ${to}. It sprinted in ${hrs.length ? `hours ${hrs.join(', ')}` : 'no hour'}; the listening network heard ${heard} of those sprints. Each sprint was followed by 3 slow, quiet hours: the time to pounce.`;
  }
  if (s.beh === 'zigzag') return `It was a zig-zagger ${to}, turning ${SUB.zigzag.angle}° one way and then the other every ${SUB.zigzag.leg} hours at ${SUB.zigzag.speed} kt. A buoy line across that course would have caught it crossing.`;
  const hid = n('hide');
  return `It was a shy sub ${to}. ${hid ? `It hid for ${hid} hours after your ship or a helicopter dip came within ${SUB.shy.hearR} nm, crawling at ${SUB.shy.quiet} kt and much harder to hear.` : 'Your ship and helicopter never came close enough to scare it.'} Buoys and aircraft do not scare it.`;
}

/** Up to five plain bullets on where you nearly had it. */
export function nearMisses(g) {
  const out = [], tr = g.subTrack;
  const lastH = g.over ? g.over.h : tr.length - 1;
  // Sensors that had a real chance but heard nothing, and sensors the sub slipped just past.
  const unlucky = [], close = [];
  for (const a of g.assets) {
    let miss = 1, best = { d: Infinity, h: 0 };
    for (let h = a.t0; h <= Math.min(a.t1, lastH); h++) {
      const t = tr[h];
      if (!t) break;
      miss *= 1 - pDetect(a, state(t));
      const d = gap(a, t.p);
      if (d < best.d) best = { d, h, brg: bearing(a.p, t.p) };
    }
    const heard = g.contacts.some(c => c.asset === a.id && c.real);
    if (!heard && 1 - miss >= 0.25) unlucky.push({ a, p: 1 - miss });
    else if (!heard && best.d > 0 && best.d <= 12) close.push({ a, ...best });
  }
  unlucky.sort((x, y) => y.p - x.p).slice(0, 2).forEach(({ a, p }) =>
    out.push(`Bad luck: your ${WHO[a.type]} ${a.name} (${span(a.t0, Math.min(a.t1, lastH))}) ${a.type === 'line' ? 'had the sub cross it' : 'had the sub inside it'}, a ${pct(p)} chance of hearing it in all, and heard nothing. Right place, unlucky dice.`));
  close.sort((x, y) => x.d - y.d).slice(0, 2).forEach(c => {
    const where = c.a.type === 'line' ? `slipped past the line without crossing it, ${c.d < 1 ? 'less than 1' : c.d.toFixed(0)} nm from it` : `passed ${c.d.toFixed(0)} nm outside it, to the ${dirOf(c.brg)}`;
    out.push(`So close: at hour ${c.h} the sub ${where} (${WHO[c.a.type]} ${c.a.name}).`);
  });
  // Lines laid too late or expired before the sub crossed where they were.
  g.assets.filter(a => a.type === 'line').forEach(a => {
    for (let h = 1; h < tr.length; h++) {
      if (h >= a.t0 && h <= a.t1) continue;
      const st = state(tr[h]);
      if (pDetect({ ...a, type: 'line' }, st) > 0) {
        out.push(`Timing: the sub crossed where line ${a.name} ${h < a.t0 ? 'was later laid' : 'had been'}, at hour ${h}, while it ${h < a.t0 ? 'was not yet in the water' : 'was already silent'}.`);
        break;
      }
    }
  });
  // Only attacks that came close (under 15 nm) count as near misses; wide misses are not "nearly had it".
  g.attacks.filter(a => !a.hit && a.d < 15).forEach(a => {
    const t = tr[a.h];
    out.push(`Your attack at hour ${a.h} missed by ${a.d.toFixed(0)} nm; the sub was to the ${dirOf(bearing(a.p, t.p))}. Your map gave that ring ${pct(a.pBelief)}.`);
  });
  const peak = g.snaps.reduce((m, s, i) => (s.near > m.v ? { v: s.near, h: s.h } : m), { v: 0, h: 0 });
  if (!g.over || g.over.kind !== 'found') {
    if (peak.v >= 0.3) out.push(`Your map was sharpest at hour ${peak.h}: it put ${pct(peak.v)} within 20 nm of the sub. That was the moment to pounce.`);
    else out.push(`Your map never put more than ${pct(peak.v)} within 20 nm of the sub. More wide search early, or a line across its course, would have given it something to work with.`);
  }
  if (!out.length) out.push('A clean hunt: nothing came close to going wrong.');
  return out.slice(0, 5);
}

export function outcome(g) {
  const o = g.over, beh = BEHAVIOURS[g.sub.beh].label.toLowerCase();
  if (o.kind === 'found') return ['good', `Found it at hour ${o.h}`, `Your attack landed ${o.d.toFixed(1)} nm from the sub (${beh}). Your map gave that ring ${pct(o.pBelief)}.`];
  if (o.kind === 'escaped') return ['bad', `Slipped out through the ${routeName(g.sub.route)} gap at hour ${o.h}`, `The sub (${beh}) reached the exit before you hit it.`];
  return ['bad', 'Time ran out', `After ${GAME.turns * GAME.turnHours} hours the sub (${beh}) was still out there.`];
}
