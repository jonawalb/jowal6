// The report-accuracy model and the picture it builds. Each hour every Blue sensor may detect each Red
// element in the sectors it watches (probability pd). A detection becomes a report at one of three
// levels: contact only, identified (a unit type, which may be wrong, and decoys may pass as tanks), or
// identified with a strength estimate (lognormal error). Reports reach you after a lognormal delay.
// Sensors also produce false contacts. Your staff is assumed to correlate reports to the right track.
import { SENSORS, REPORT, TYPES, REPORTABLE } from '../data/params.js';
import { NODES, NORTH, LINE } from '../data/map.js';
import { neighbours } from './graph.js';

const reportableOther = (type, r) => { const o = REPORTABLE.filter(x => x !== type); return o[Math.floor(r.u() * o.length)]; };

/** Which sectors each Blue sensor watches this hour, as [sensorKey, node, unitId]. */
export function watchers(g, drone, engaged) {
  const out = [];
  for (const u of g.units) {
    if (u.side !== 'blue' || u.broken || !u.node || u.seg || u.node === 'rear') continue;
    if (u.type === 'recon') {
      out.push(['recon', u.node, u.id]);
      for (const n of neighbours(u.node)) out.push(['reconAdj', n, u.id]);
    } else {
      out.push([engaged.has(u.node) ? 'contactE' : 'contact', u.node, u.id]);
      const li = LINE.indexOf(u.node);
      if (li >= 0) out.push(['watch', NORTH[li], u.id]);
    }
  }
  if (drone) out.push(['drone', drone, 'drone']);
  return out;
}

/** Generate this hour's reports (observed at t + 0.5). */
export function sense(g, drone, engaged, r) {
  const obsT = g.t + 0.5;
  const reds = g.units.filter(u => u.side === 'red' && !u.broken && (u.node || u.seg) && u.node !== 'off' && u.node !== 'gone');
  const at = u => u.node || (u.seg && u.seg.from);
  for (const [key, node, by] of watchers(g, drone, engaged)) {
    const S = SENSORS[key === 'contactE' ? 'contact' : key];
    const pd = key === 'contactE' ? S.pdEngaged : S.pd;
    const report = (elem, level, type, str, correct) => {
      const delay = S.delay * Math.exp(REPORT.delaySpread * r.normal());
      g.reports.push({ n: g.reports.length, obsT, arrT: obsT + delay, sensor: key === 'contactE' ? 'contact' : key, by, node, elem, level, type, str, word: S.word, correct, falseC: elem === null });
    };
    for (const e of reds) {
      if (at(e) !== node || r.u() >= pd) continue;
      if (r.u() >= S.pid) { report(e.id, 'contact', null, null, true); continue; }
      let type = e.type, correct = true;
      if (e.type === 'decoy') { if (r.u() < S.spoof) { type = 'armor'; correct = false; } }
      else if (r.u() >= S.acc) { type = reportableOther(e.type, r); correct = false; }
      let str = null;
      if (type !== 'decoy' && r.u() < S.pstr) str = Math.max(1, Math.round(TYPES[type].str * (e.type === 'decoy' ? 1 : e.str / e.str0) * Math.exp(S.sig * r.normal())));
      report(e.id, str === null ? 'id' : 'str', type, str, correct);
    }
    const nf = r.poisson(REPORT.falseRate);
    for (let i = 0; i < nf; i++) report(null, 'contact', null, null, false);
  }
}

/** Your picture at time T: tracks built from reports received by T. */
export function beliefAt(g, T) {
  const tracks = new Map();
  for (const rp of g.reports) {
    if (rp.arrT > T + 1e-9 || T - rp.obsT > REPORT.trackLife) continue;
    const key = rp.elem ?? `f${rp.n}`;
    const tr = tracks.get(key) || { key, elem: rp.elem, node: rp.node, obsT: -1, type: null, str: null, word: rp.word, falseC: rp.falseC, n: 0 };
    tr.n += 1;
    if (rp.obsT >= tr.obsT) { tr.obsT = rp.obsT; tr.node = rp.node; tr.word = rp.word; tr.sensor = rp.sensor; }
    if (rp.type) { tr.type = rp.type; tr.typeT = rp.obsT; }
    if (rp.str !== null && rp.str !== undefined) tr.str = rp.str;
    if (rp.type === 'decoy') tr.str = 0;
    tracks.set(key, tr);
  }
  const list = [...tracks.values()].map(tr => ({ ...tr, age: T - tr.obsT, est: estOf(tr) }));
  return summarise(list, 'belief');
}

const estOf = tr => tr.type === 'decoy' ? 0 : tr.str ?? (tr.type ? TYPES[tr.type].str : REPORT.unknownStr);

/** The true picture at the current hour, in the same shape as a belief. */
export function truthNow(g) {
  const list = g.units.filter(u => u.side === 'red' && !u.broken && (u.node || u.seg) && u.node !== 'off' && u.node !== 'gone')
    .map(u => ({ key: u.id, elem: u.id, name: u.name, node: u.node || u.seg.from, type: u.type, str: Math.round(u.str), est: u.str, age: 0, word: 'true', moving: !!u.seg, to: u.seg?.to }));
  return summarise(list, 'truth');
}

function summarise(list, kind) {
  const node = Object.fromEntries(NODES.map(n => [n.id, 0]));
  for (const tr of list) node[tr.node] += tr.est;
  const axis = [0, 1, 2].map(a => node[NORTH[a]] + node[LINE[a]]);
  return { kind, tracks: list, node, axis };
}
