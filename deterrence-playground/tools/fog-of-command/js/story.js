// Key moments for the after-action review: the enemy commander's decisions (with what it believed and
// what was true), bait taken, flank attacks, decoys exposed, and units broken. Plain sentences.
import { COLS } from '../data/map.js';
import { NAME, DEF, hhmm, foeOf } from './panel.js';

const shortList = ids => ids.map(id => DEF[id].short).join(', ');

/** Sentence describing the hidden Red plan (defend mode) or Blue's reserve moves (attack mode). */
export function planLine(g, me) {
  if (me === 'blue' && g.plan) {
    const p = g.plan;
    return `Red's plan: main effort down the ${COLS[p.main]} road, a feint with the decoy on the ${COLS[p.feint]} road, recon on the ${COLS[p.probe]} road; the second echelon chose its road at 10:00.`;
  }
  const res = g.events.filter(e => e.kind === 'decision' && e.side === 'blue' && (e.what === 'reserve' || e.what === 'recommit'));
  return res.length ? `Blue's reserve (Tank Bn and Weapons Coy) went to the ${res.map(e => `${COLS[e.col]} road at ${hhmm(e.t)}`).join(', then the ')}.` : 'Blue never committed its reserve (Tank Bn and Weapons Coy).';
}

/** Fights at a sector from hour t0 for up to 3 hours: total losses each side. */
function after(g, node, t0) {
  const fs = g.fights.filter(f => f.node === node && f.t >= t0 && f.t <= t0 + 3);
  return fs.length ? { lb: fs.reduce((s, f) => s + f.lb, 0), lr: fs.reduce((s, f) => s + f.lr, 0) } : null;
}

export function moments(g, me) {
  const foe = foeOf(me), out = [];
  const lossWords = (x, meSide) => { const [m, f] = meSide === 'blue' ? [x.lb, x.lr] : [x.lr, x.lb]; return `you lost ${m.toFixed(1)}, the enemy ${f.toFixed(1)}`; };
  for (const e of g.events) {
    if (e.kind !== 'decision') continue;
    if (e.side === 'red' && e.what === 'second' && me === 'blue') {
      const fooled = e.truth - e.believed;
      out.push({ t: e.t, tone: fooled >= 8 ? 'good' : fooled <= -8 ? 'bad' : '', text: `Red sent its second echelon (${shortList(e.units)}) down the <b>${COLS[e.col]}</b> road, where it saw ${e.believed} of your strength. You had ${e.truth} there${fooled >= 8 ? ': it took the bait' : ''}.` });
    }
    if (e.side === 'red' && e.what === 'chase' && me === 'blue') {
      const x = after(g, e.node, e.t);
      out.push({ t: e.t, tone: x && x.lr > x.lb ? 'good' : '', text: `Red followed a unit that gave ground into <b>${NAME[e.node]}</b>${x ? `; in the fighting there ${lossWords(x, 'blue')}` : ''}.` });
    }
    if (e.side === 'blue' && (e.what === 'reserve' || e.what === 'recommit') && me === 'red') {
      const decoy = firstSeen(g, 'blue', 'r8');
      const fooled = e.believed - e.truth;
      out.push({ t: e.t, tone: fooled >= 8 ? 'good' : '', text: `Blue ${e.what === 'recommit' ? 'switched' : 'sent'} its reserve to the <b>${COLS[e.col]}</b> road, believing ${e.believed} of your strength was there. You had ${e.truth}${decoy !== null && decoy <= e.t ? `; your decoy had been in view since ${hhmm(decoy)}` : ''}.` });
    }
    if (e.side === 'blue' && e.what === 'guard' && me === 'red') out.push({ t: e.t, tone: '', text: `Blue pulled its reserve back to Tarn Crossing after seeing you at ${NAME[e.node]}.` });
    if (e.side === 'blue' && e.what === 'counter' && me === 'red') {
      const took = g.snaps.slice(e.t + 1, e.t + 5).some(s => s && s.units.some(u => u.side === 'red' && u.node === e.from && !u.broken));
      out.push({ t: e.t, tone: took ? 'good' : '', text: `Blue's ${DEF[e.unit].short} left ${NAME[e.from]} to attack what looked like ${e.believed} of your strength at ${NAME[e.node]}${took ? `, and you got into ${NAME[e.from]} behind it` : ''}.` });
    }
  }
  // Decoys exposed.
  const dMine = firstExposed(g, 'blue', 'r8');   // the decoy is always Red's
  if (dMine) out.push({ t: dMine.t, tone: me === 'red' ? 'bad' : 'good', text: me === 'red' ? `Blue exposed your decoy at ${NAME[dMine.node]}${dMine.fire ? ' with spotted artillery fire' : ''}.` : `You exposed Red's decoy group at ${NAME[dMine.node]}${dMine.fire ? ' with spotted artillery fire' : ''}.` });
  // Flank attacks (first per sector).
  const seenFlank = new Set();
  for (const f of g.fights) {
    if (f.kind !== 'flank' || seenFlank.has(f.node)) continue;
    seenFlank.add(f.node);
    const mineAtt = f.def !== me;
    out.push({ t: f.t, tone: mineAtt ? 'good' : 'bad', text: mineAtt ? `Your flank attack at <b>${NAME[f.node]}</b>: the enemy defense there counted for nothing.` : `The enemy hit <b>${NAME[f.node]}</b> from a second direction: your defense there counted for nothing.` });
  }
  // Spotted fire on a large target.
  const big = g.fires.filter(f => f.side === me && f.spotter).sort((a, b) => b.total - a.total)[0];
  if (big && big.total >= 2) out.push({ t: big.t, tone: 'good', text: `Your best fire mission: ${NAME[big.node]}, ${big.total.toFixed(1)} points of damage, watched by ${DEF[big.spotter].short}.` });
  for (const f of g.fires.filter(x => x.side === me && x.friendly.length)) out.push({ t: f.t, tone: 'bad', text: `Danger close at ${NAME[f.node]}: your own fire hit ${shortList(f.friendly.map(x => x.unit))}.` });
  // Breaks.
  const br = side => g.events.filter(e => e.kind === 'break' && e.side === side);
  const mb = br(me), fb = br(foe);
  if (mb.length) out.push({ t: mb[0].t, tone: 'bad', text: `${mb.length} of your units broke: ${mb.map(e => `${DEF[e.unit].short} at ${NAME[e.node] || 'the front'} (${hhmm(e.t)})`).join(', ')}.` });
  if (fb.length) out.push({ t: fb[0].t, tone: 'good', text: `${fb.length} enemy unit${fb.length > 1 ? 's' : ''} broke, the first at ${hhmm(fb[0].t)}.` });
  return out.sort((a, b) => a.t - b.t).slice(0, 12);
}

function firstSeen(g, side, id) {
  const s = g.seen[side].find(x => x.elem === id);
  return s ? s.obsT : null;
}
function firstExposed(g, side, id) {
  const s = g.seen[side].find(x => x.elem === id && x.type === 'decoy');
  return s ? { t: s.obsT, node: s.node, fire: !!s.byFire } : null;
}
