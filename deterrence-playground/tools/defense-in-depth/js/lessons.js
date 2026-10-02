// Telemetry digest + triggered lessons T1–T16 (SPEC §7.5). Pure functions over a battle's telemetry.
// `digest()` is the ONE place that knows the engine's telemetry row schema; learning.js and the
// triggers read only the digest, so a schema change touches this adapter alone.
//
// Telemetry shape consumed (W1-A, SPEC §7.5 / §10.2):
//   tel.meta  { att, def, era, cols, rows, hours, objRow, zones:{outpost:[r0,r1], battle:[r0,r1], rear:[r0,r1]},
//               pulverizedCol?, prep?:'none'|'hurricane'|'methodical', winner? }
//   tel.rows  per unit-hour: { t, u, s, ty, r, c, po, fm, X, lost, inc:{fr,fl,ar,dr}, ct, ex, sp, ow,
//               bc:null|'on'|'early'|'late', coh, gain, gtg, arty, tk:null|'sup'|'uns', rs, yld, road, pin, imp }
//   tel.ca    counterattacks: { t, s, kind:'riposte'|'counterstroke', caMult, coh, inWin, ok, best:[a,b] }
//   tel.events [{ t, kind, side, ... }]  W1-D contract (js/tldr.js) plus reserveMove / capture / bypass{firedOn}
//   tel.summary { lossBySide:{}, cover2, fr, fwdShare, corridorW, race:{lost,tStar} }
import { CARDS } from '../data/campaign.js';

const LINE = new Set(['rifle', 'storm']);
const sum = (a, f) => a.reduce((s, x) => s + (f(x) || 0), 0);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const r2 = x => Math.round(x * 100) / 100;
const sideOf = e => (e.side != null ? e.side : e.s);   // W1-D event contract uses `side`

// With-vs-without effect on a loss measure. Positive = the practice cut losses.
function contrast(rows, used, measure) {
  const w = rows.filter(used), wo = rows.filter(r => !used(r));
  if (w.length < 2 || wo.length < 2) return null;
  const mw = measure(w), mo = measure(wo);
  if (!(mo > 0)) return null;
  return { n: Math.min(w.length, wo.length), eff: r2(clamp((mo - mw) / mo, -1, 1)) };
}
// Attacker: loss per row gained (+0.5 so stalled hours count). Defender: loss per unit-hour.
const perGain = rs => sum(rs, r => r.lost) / (sum(rs, r => r.gain) + 0.5 * rs.length);
const perHour = rs => sum(rs, r => r.lost) / rs.length;
const artyPerHour = rs => sum(rs, r => r.inc && r.inc.ar) / rs.length;

// Card → (role, practice flag over rows, measure). Mirrors the metric table in SPEC §6.3.
const PRACTICE = {
  AT1: { role: 'att', pool: r => LINE.has(r.ty) && r.gain >= 0 && r.po !== 'hold', used: r => r.fm === 'groups', m: perGain },
  AT2: { role: 'att', pool: r => r.ty === 'rifle' && (r.po === 'infil' || r.po === 'rush'), used: r => r.po === 'infil', m: perGain },
  AT3: { role: 'att', pool: r => LINE.has(r.ty) && (r.po === 'bound' || r.po === 'rush'), used: r => !!r.ow, m: perGain },
  CA1: { role: 'att', pool: r => r.t <= 3 && r.ct, used: r => r.sp > 0.3, m: perGain },
  CA2: { role: 'any', pool: r => r.bc != null && r.ct, used: r => r.bc === 'on', m: perHour },
  CA3: { role: 'att', pool: r => r.tk != null, used: r => r.tk === 'sup', m: perHour },
  ED1: { role: 'def', pool: r => r.zone === 'outpost' || r.zone === 'battle', used: r => !!r.rs || r.po === 'disp', m: artyPerHour },
};

function zoneOf(meta, row) {
  const z = meta.zones || {};
  for (const k of ['outpost', 'battle', 'rear']) if (z[k] && row >= z[k][0] && row <= z[k][1]) return k;
  return null;
}

/** Reduce a battle's telemetry to the metrics learning and lessons use.
 * @param {object} tel  telemetry (schema above)
 * @param {string} side my side key
 * @returns {object} digest
 */
export function digest(tel, side) {
  const meta = tel.meta || {};
  const role = side === meta.att ? 'att' : 'def';
  const enemy = role === 'att' ? meta.def : meta.att;
  const all = (tel.rows || []).map(r => ({ ...r, zone: zoneOf(meta, r.r) }));
  const mine = all.filter(r => r.s === side), theirs = all.filter(r => r.s === enemy);
  const ev = tel.events || [], sm = tel.summary || {};
  // Counterattacks: tel.ca rows, or W1-D's `counter` events (contract in js/tldr.js).
  const ca = tel.ca && tel.ca.length ? tel.ca : ev.filter(e => e.kind === 'counter').map(e => ({ t: e.t, s: e.side, kind: e.how, caMult: e.ca,
    inWin: !!(e.window && e.t >= e.window[0] && e.t <= e.window[1]), ok: !!e.won, best: e.window || null, sec: e.sec }));
  const liftEv = ev.filter(e => e.kind === 'lift' && e.side === side);

  const samples = {}, enemyUsed = [];
  for (const [id, p] of Object.entries(PRACTICE)) {
    if (p.role === role || p.role === 'any') {
      const c = contrast(mine.filter(p.pool), p.used, p.m);
      if (c) samples[id] = c;
    }
    const er = theirs.filter(p.pool).filter(p.used);
    if ((p.role === 'any' || p.role !== role) && er.length >= 3) enemyUsed.push(id);
  }
  // ED2 within each yielding unit: loss per hour in the two hours after a yield vs the yield hour and the one
  // before (a cross-unit contrast is confounded: units yield because they are hit hardest). NOTIONAL metric.
  if (role === 'def') {
    const pre = [], post = [];
    const byU = new Map(); for (const r of mine) { if (!byU.has(r.u)) byU.set(r.u, []); byU.get(r.u).push(r); }
    for (const rs of byU.values()) for (const y of rs.filter(r => r.yld)) {
      for (const r of rs) { if (r.t === y.t || r.t === y.t - 1) pre.push(r); else if (r.t > y.t && r.t <= y.t + 2) post.push(r); }
    }
    const a = pre.length ? perHour(pre) : 0;
    if (pre.length >= 2 && post.length >= 2 && a > 0) samples.ED2 = { n: Math.min(pre.length, post.length), eff: r2(clamp((a - perHour(post)) / a, -1, 1)) };
  }
  // ED3 from the counterattack list: success in window vs out of window.
  const myCa = ca.filter(x => x.s === side && x.kind === 'riposte');
  if (role === 'def' && myCa.length >= 2 && myCa.some(x => x.inWin) && myCa.some(x => !x.inWin)) {
    const inW = myCa.filter(x => x.inWin), out = myCa.filter(x => !x.inWin);
    const rate = a => a.length ? sum(a, x => x.ok ? 1 : 0) / a.length : null;
    const a = rate(inW), b = rate(out);
    if (a != null && b != null) samples.ED3 = { n: Math.min(inW.length, out.length), eff: r2(clamp(a - b, -1, 1)) };
  }
  // No contrast (e.g. only improvised ripostes): success rate against a NOTIONAL 0.3 baseline retake rate.
  if (role === 'def' && !samples.ED3 && myCa.length >= 1) samples.ED3 = { n: myCa.length, eff: r2(clamp(sum(myCa, x => x.ok ? 1 : 0) / myCa.length - 0.3, -1, 1)) };
  if (role === 'att' && ca.some(x => x.s === enemy && x.kind === 'riposte' && x.t != null)) enemyUsed.push('ED3');

  // Context flags that seed false lessons (SPEC §6.3; Hunzeker p. 147).
  const lossMine = sum(mine, r => r.lost), lossEnemy = sum(theirs, r => r.lost);
  const won = meta.winner != null ? meta.winner === side : null;
  let fastWinInDegraded = false;
  if (role === 'att' && meta.pulverizedCol != null) {
    const pc = mine.filter(r => r.c === meta.pulverizedCol && r.po === 'rush');
    fastWinInDegraded = sum(pc, r => r.gain) >= 4;
  }
  const enemyLifts = theirs.filter(r => r.bc === 'early' || r.bc === 'late').length;
  const enemyWaves = theirs.filter(r => r.fm === 'waves').length / Math.max(1, theirs.filter(r => r.fm).length);
  const forwardHeldVsPoor = role === 'def' && won === true && (sm.fwdShare || 0) > 0.5 && (enemyLifts >= 2 || enemyWaves > 0.5);

  // Trigger metrics (SPEC §7.5).
  const open = mine.filter(r => r.ex && r.X >= 0.5 && r.po !== 'hold');
  const lifts = liftEv.length
    ? { early: liftEv.filter(e => e.case === 'early' || e.case === 'gap').length, late: liftEv.filter(e => e.case === 'late').length }
    : { early: mine.filter(r => r.bc === 'early').length, late: mine.filter(r => r.bc === 'late').length };
  const assaults = mine.filter(r => r.ct && r.gain > 0);
  const sup = assaults.filter(r => r.sp > 0.3), uns = assaults.filter(r => !(r.sp > 0.3));
  const unsuppRatio = sup.length >= 2 && uns.length >= 2 && perGain(sup) > 0 ? perGain(uns) / perGain(sup) : null;
  const inc = k => sum(mine, r => r.inc && r.inc[k]);
  const fwd = mine.filter(r => r.zone === 'outpost' || (meta.zones && meta.zones.battle && r.r === meta.zones.battle[0]));
  const yieldedRows = mine.filter(r => r.yld);
  const firstReserveMove = ev.filter(e => e.kind === 'reserveMove' && sideOf(e) === enemy).map(e => e.t).sort((a, b) => a - b)[0];
  const trig = {
    role, openUnitHours: open.length, openLossShare: lossMine > 0 ? sum(open, r => r.lost) / lossMine : 0,
    unsuppRatio, early: lifts.early, late: lifts.late, prep: meta.prep || 'none',
    reserveMoveT: firstReserveMove != null ? firstReserveMove : null,
    tankUnsuppHours: new Set(mine.filter(r => r.tk === 'uns').map(r => r.t)).size,
    cover2: sm.cover2 != null ? sm.cover2 : null,
    flankShare: role === 'att' && lossMine > 0 ? inc('fl') / lossMine : 0,
    corridorW: sm.corridorW != null ? sm.corridorW : null,
    raceLost: !!(sm.race && (sm.race.loser ? sm.race.loser === side : sm.race.lost)), tStar: sm.race ? sm.race.tStar : null,
    fr: sm.fr != null ? sm.fr : null, pinnedByFix: new Set(mine.filter(r => r.pin).map(r => r.u)).size,
    offWindow: ca.filter(x => x.s === side && !x.inWin).map(x => ({ t: x.t, coh: x.coh, best: x.best })),
    fwdShare: sm.fwdShare != null ? sm.fwdShare : null,
    bombardShare: lossMine > 0 ? sum(fwd, r => r.inc && r.inc.ar) / lossMine : 0,
    // Yielded sectors never counterattacked by this side (Hunzeker pp. 61–62, 82).
    yieldNoCA: yieldedRows.some(r => !ca.some(x => x.s === side && (x.sec == null || x.sec === r.r * (meta.cols || 1) + r.c))),
    outranHours: Math.max(0, ...countBy(mine.filter(r => r.arty === false), r => r.u)),
    gtg: mine.filter(r => r.gtg).length,
    unmopped: ev.filter(e => e.kind === 'bypass' && sideOf(e) === side && e.firedOn).length,
    roadLoss: (() => { const rm = mine.filter(r => r.road); const s = sum(rm, r => r.lost); return lossMine > 0 && rm.length ? s / lossMine : 0; })(),
    era: meta.era === 'm' || meta.era === 'modern' ? 'modern' : 'ww1',
  };
  return {
    role, side, won, lossMine: r2(lossMine), lossEnemy: r2(lossEnemy),
    exchange: lossMine > 0 ? r2(lossEnemy / lossMine) : null,
    samples, enemyUsed: [...new Set(enemyUsed)], improvised: mine.filter(r => r.imp).length,
    ctx: { pulverized: meta.pulverizedCol != null, fastWinInDegraded, forwardHeldVsPoor },
    captured: ev.some(e => e.kind === 'capture' && sideOf(e) === side), trig,
  };
}

function countBy(rows, key) {
  const m = new Map();
  for (const r of rows) m.set(key(r), (m.get(key(r)) || 0) + 1);
  return m.size ? [...m.values()] : [0];
}

const pct = x => Math.round(x * 100) + '%';
const times = n => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
const hh = t => String(5 + t).padStart(2, '0') + ':00';

// T1–T16 (SPEC §7.5). Each: id, test(trig, ctx) → data | null, text(data), cite, diagram (Lessons id).
export const TRIGGERS = [
  { id: 'T1', diagram: 'L7', cite: 'Biddle pp. 35–39, 53',
    test: t => t.openLossShare >= 0.25 && t.openUnitHours > 0 ? { x: t.openUnitHours, y: t.openLossShare } : null,
    text: d => `${d.x} unit-hours in the open; ${pct(d.y)} of your losses came then.` },
  { id: 'T2', diagram: 'L7', cite: 'Biddle pp. 31, 36–38; Hunzeker p. 52',
    test: t => t.unsuppRatio != null && t.unsuppRatio >= 2 ? { n: t.unsuppRatio } : null,
    text: d => `Unsuppressed assaults lost ${d.n.toFixed(1)}× more per sector.` },
  { id: 'T3', diagram: 'L5', cite: 'Biddle pp. 31, 38; Hunzeker pp. 52, 110',
    test: t => t.early + t.late > 0 ? { k: t.early, j: t.late } : null,
    text: d => `Your barrage lifted ${[d.k ? `early ${times(d.k)}` : '', d.j ? `late ${times(d.j)}` : ''].filter(Boolean).join(' and ')}.` },
  { id: 'T4', diagram: 'L6', cite: 'Biddle pp. 32–33, 46; Hunzeker pp. 52–53',
    test: t => t.role === 'att' && t.prep === 'methodical' ? { h: t.reserveMoveT } : null,
    text: d => `Your 6-hour preparation revealed the point of attack; enemy reserves moved at ${d.h != null ? hh(d.h) : 'H−3'}.` },
  { id: 'T5', diagram: 'L16', cite: 'Biddle pp. 61, 121, 129–130',
    test: t => t.tankUnsuppHours >= 2 ? { n: t.tankUnsuppHours } : null,
    text: d => `Armor advanced without infantry for ${d.n} h; anti-tank losses were concentrated there.` },
  { id: 'T6', diagram: 'L2', cite: 'Biddle pp. 44, 120; Hunzeker p. 54',
    test: t => t.role === 'def' ? (t.cover2 != null && t.cover2 < 0.4 ? { p: t.cover2 } : null)
      : (t.flankShare >= 0.3 ? { w: t.corridorW, f: t.flankShare } : null),
    text: d => d.p != null ? `Your positions covered ${pct(d.p)} from two or more directions; attackers found cover in the rest.`
      : `Your corridor was ${d.w != null ? d.w : 'a few'} sectors wide and swept from both shoulders (${pct(d.f)} of your losses were flank fire).` },
  { id: 'T7', diagram: 'L10', cite: 'Biddle A.17, p. 214; p. 101',
    test: t => t.raceLost ? { t: t.tStar } : null,
    text: d => `The race: you lost it${d.t != null ? `; t* = ${hh(d.t)}` : ''}.` },
  { id: 'T8', diagram: 'L11', cite: 'Biddle pp. 47, 97–99, 224 (Fig. A.6)',
    test: t => t.role === 'def' && t.fr != null && (t.fr < 0.25 || t.fr > 0.6) ? { fr: t.fr, n: t.pinnedByFix } : null,
    text: d => `f_r = ${d.fr.toFixed(2)}: ${d.n} forward units were pinned by fixing attacks.` },
  { id: 'T9', diagram: 'L9', cite: 'Biddle pp. 47–48; Hunzeker pp. 62, 79, 82',
    test: t => t.offWindow.length ? t.offWindow[0] : null,
    text: d => `You struck at cohesion ${d.coh != null ? d.coh.toFixed(2) : '?'}; the best window was ${d.best ? hh(d.best[0]) + '–' + hh(d.best[1]) : 'earlier'}.` },
  { id: 'T10', diagram: 'L3', cite: 'Hunzeker pp. 55, 80; Biddle pp. 32–33',
    test: t => t.role === 'def' && (t.fwdShare || 0) > 0.5 && t.bombardShare >= 0.25 ? { s: t.fwdShare } : null,
    text: () => 'Dense front lines die to bombardment.' },
  { id: 'T11', diagram: 'L9', cite: 'Hunzeker pp. 61–62, 82',
    test: t => t.role === 'def' && t.yieldNoCA ? {} : null,
    text: () => 'Yielding without counterattack is just retreat.' },
  { id: 'T12', diagram: 'L16', cite: 'Biddle pp. 43, 121; Hunzeker pp. 53, 62',
    test: t => t.role === 'att' && t.outranHours >= 3 ? { n: t.outranHours } : null,
    text: () => 'You outran your guns.' },
  { id: 'T13', diagram: 'L7', cite: 'Biddle p. 31; Hunzeker p. 57',
    test: t => t.gtg >= 3 ? { n: t.gtg } : null,
    text: () => 'Units that went to ground were destroyed by artillery.' },
  { id: 'T14', diagram: 'L8', cite: 'Hunzeker pp. 71–72; Biddle p. 33',
    test: t => t.role === 'att' && t.unmopped > 0 ? { n: t.unmopped } : null,
    text: () => 'Bypassed posts fired into your second wave.' },
  { id: 'T15', diagram: 'L13', cite: 'Biddle pp. 57–58, 232–234',
    test: t => t.era === 'modern' && t.roadLoss > 0 ? { z: t.roadLoss } : null,
    text: d => `Road moves under drones cost ${pct(d.z)}.` },
  { id: 'T16', diagram: 'L12', cite: 'Biddle pp. 73, 234',
    test: (t, ctx) => ctx && ctx.eraCompare ? ctx.eraCompare : null,
    text: d => `The same plan in the other era ${d.other > d.mine ? 'did better' : 'did worse'}: ${pct(d.other)} wins vs your era's ${pct(d.mine)}.` },
];

/** Evaluate every trigger for one side. ctx.eraCompare = {mine, other} win rates from the review replays.
 * @returns {{id:string,text:string,cite:string,diagram:string,data:object}[]} in T-order */
export function evalTriggers(tel, side, ctx = {}) {
  const d = tel && tel.trig ? tel : digest(tel, side);
  const out = [];
  for (const T of TRIGGERS) {
    const data = T.test(d.trig, ctx);
    if (data) out.push({ id: T.id, text: T.text(data), cite: T.cite, diagram: T.diagram, data });
  }
  return out;
}

/** The 2–5 lesson cards for the review (SPEC §7.4 item 7): first-fired, capped at `max`. */
export function lessonCards(tel, side, ctx = {}, max = 5) {
  return evalTriggers(tel, side, ctx).slice(0, max);
}

/** Card lookup helper for UI text. */
export const cardById = id => CARDS.find(c => c.id === id);
