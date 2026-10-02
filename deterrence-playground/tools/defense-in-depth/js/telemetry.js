// Telemetry (SPEC §7.5): compact rows per unit per hour, plus counterattacks, a few events and an end-of-battle
// summary. Consumers: js/lessons.js digest() (W1-C), js/tldr.js and js/story.js (W1-D), the review (W2-UI).
//
// g.telemetry = {
//   meta:  { att: 'att', def: 'def', era, scale, cols, rows, hours, objRow, zones: { outpost, battle, rear }, pulverizedCol, prep, winner }
//   rows:  per fighting unit on the map per hour:
//     { t, u: unit id, s: side, ty: type, r: row, c: col,
//       po: posture ('rush' | 'bound' | 'infil' | 'hold' | 'consolidate' | 'withdraw'), or 'ow' for a leapfrog overwatch
//           element, or a static defender's position ('strong' | 'trench' | 'disp' | 'open'),
//       fm: 'waves' | 'groups', X: exposure, lost: strength lost this hour,
//       inc: { fr: frontal fire, fl: flanking/enfilade fire, ar: artillery (incl. gas, fratricide, mines, observed moves), dr: drones },
//       ct: in contact, ex: moving in the open under enemy observation, sp: suppression on the enemy in its sector (0 if none),
//       ow: had a working overwatch partner (leapfrog bounding element), bc: barrage case 'on' | 'early' | 'gap' | 'late' | null,
//       coh: cohesion, gain: rows gained toward the enemy, gtg: went to ground (pinned next hour), arty: inside its own artillery's
//       range ring, tk: 'sup' | 'uns' for tanks with / without friendly infantry, rs: on the reverse slope, yld: yielded ground,
//       road: road march, pin: pinned by fixing, imp: improvised this hour (initiative event) }
//   ca:    [{ t, s, kind: 'riposte' | 'counterstroke', caMult, coh, inWin, ok, best: [h0, h1] | null, sec }]
//   events: [{ t, kind: 'reserveMove' | 'capture' | 'bypass' | 'lodgment', s, side, ... }]
//   summary: { lossBySide: { def, att }, cover2, fr, fwdShare, corridorW, race: { lost, loser, tStar } }
// }
import { SCALES } from '../data/scales.js';
import { gridFor, popcount } from './grid.js';
import { fighting, other, isCompany } from './forces.js';
import { exposure, position } from './fire.js';
import { inContact } from './move.js';
import { underGuns } from './arty.js';

/** Empty telemetry with its meta block. */
export function newTelemetry(g) {
  const S = SCALES[g.scale];
  return {
    meta: { att: 'att', def: 'def', era: g.era, scale: g.scale, cols: g.cols, rows: g.rows, hours: g.turns, objRow: S.obj.row,
      zones: { outpost: S.bands.outpost, battle: S.bands.battle, rear: S.bands.rear }, pulverizedCol: g.ctx && g.ctx.pulverizedCol != null ? g.ctx.pulverizedCol : null,
      prep: 'none', winner: null },
    rows: [], ca: [], events: [], summary: {},
  };
}

const r2 = x => Math.round(x * 100) / 100;

/** Append this hour's rows (call after the hour's combat, before t advances). */
export function recordHour(g) {
  if (g.noTelemetry) return;
  const G = gridFor(g.scale), rows = g.telemetry.rows;
  for (const u of g.units) {
    if (!fighting(u) && !(u.lossH > 0 && isCompany(u) && u.sec >= 0)) continue;
    if (!isCompany(u)) continue;
    const foes = g.occ[u.sec] ? g.occ[u.sec].filter(v => v.side === other(u.side) && isCompany(v)) : [];
    const sp = foes.length ? foes.reduce((s, v) => s + (v.supp || 0), 0) / foes.length : 0;
    const po = u.ow ? 'ow' : u.moving || u.side === 'att' ? u.posture : position(g, u);
    const inc = u.inc || { fr: 0, fl: 0, ar: 0, dr: 0 };
    rows.push({
      t: g.t, u: u.id, s: u.side, ty: u.type, r: G.row[u.sec], c: G.col[u.sec], po, fm: u.formation, X: r2(u.X ?? exposure(g, u)),
      lost: r2(u.lossH || 0), inc: { fr: r2(inc.fr), fl: r2(inc.fl), ar: r2(inc.ar), dr: r2(inc.dr) },
      ct: inContact(g, u), ex: !!u.ex, sp: r2(sp), ow: !!u.owOk, bc: u.bc || null, coh: r2(u.coh ?? 1), gain: u.gain || 0,
      gtg: !!u.gtg, arty: underGuns(g, u.side, u.sec), tk: u.type === 'tank' ? (g.occ[u.sec].some(v => v.side === u.side && v !== u && (v.type === 'rifle' || v.type === 'storm')) ? 'sup' : 'uns') : null,
      rs: u.side === 'def' && G.row[u.sec] > G.crest && G.row[u.sec] <= G.crest + 2, yld: !!u.yld, road: u.moving && u.mode === 'road', pin: !!u.fixed, imp: !!u.imp,
    });
  }
}

/** Summary figures at H-hour (defender layout) and at the end (losses, corridor, race). */
export function layoutSummary(g) {
  const G = gridFor(g.scale), S = SCALES[g.scale], sm = g.telemetry.summary;
  let cov = 0, n = 0;
  for (let s = 0; s < G.n; s++) if (G.zone[s] === 'battle') { n++; if (popcount(g.coverDirs.def[s]) >= 2) cov++; }
  sm.cover2 = n ? r2(cov / n) : 0;
  const inf = g.units.filter(u => u.side === 'def' && fighting(u) && (u.type === 'rifle' || u.type === 'storm' || u.type === 'mg'));
  const tot = inf.reduce((s, u) => s + u.str, 0) || 1;
  sm.fr = r2(inf.filter(u => G.row[u.sec] >= S.obj.row).reduce((s, u) => s + u.str, 0) / tot);
  sm.fwdShare = r2(inf.filter(u => G.zone[u.sec] === 'outpost' || G.row[u.sec] === S.bands.battle[0]).reduce((s, u) => s + u.str, 0) / tot);
}

export function endSummary(g) {
  const sm = g.telemetry.summary, G = gridFor(g.scale);
  const loss = side => g.units.filter(u => u.side === side && u.sec >= -1).reduce((s, u) => s + (u.str0 - Math.max(0, u.str)), 0);
  sm.lossBySide = { def: r2(loss('def')), att: r2(loss('att')) };
  const cols = new Set();
  for (const k of Object.keys(g.lodgEver || {})) cols.add(G.col[+k]);
  sm.corridorW = cols.size;
  const hist = g.deepHist || [];
  let tStar = 0;
  for (let t = 1; t < hist.length; t++) if (hist[t] > hist[t - 1]) tStar = t;
  const winner = g.over ? g.over.winner : null;
  sm.race = { lost: winner === 'att', loser: winner === 'att' ? 'def' : winner ? 'att' : null, tStar };
  g.telemetry.meta.winner = winner;
}
