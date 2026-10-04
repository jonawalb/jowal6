// Battle orders from the map (SPEC §1.3, §8.4): what a tap on a sector does with the units or formation you
// have selected and the tool you have armed. Every order is one engine action (issue), logged for the share
// link and the review; formation orders are one logged action that the engine expands (orders.js).
import { TYPES } from '../../data/units.js';
import { ERAS } from '../../data/eras.js';
import { issue } from '../engine.js';
import { gridFor, DIRS } from '../grid.js';
import { alive, isBattery, isCompany, fighting } from '../forces.js';
import { inRange } from '../arty.js';
import { S, unitOf, say, redraw, esc, hhmm } from './store.js';

const CLOCK = '<span class="dd-clk" aria-hidden="true">◷</span>';
export const MISSION_WORD = { suppress: 'Suppress', destroy: 'Destroy', gas: 'Gas', smoke: 'Smoke', cb: 'Counter-battery', precision: 'Precision' };

/** The tool a selection arms by default. */
export function defaultTool(g, ids, fmn) {
  if (fmn) return { kind: 'move' };
  const u = ids.length === 1 && unitOf(ids[0]);
  if (!u) return ids.length === 2 ? { kind: 'move' } : ids.length ? { kind: 'move' } : null;
  if (isBattery(u)) return { kind: 'fire', m: 'suppress' };
  if (u.type === 'drone') return { kind: 'drone', m: 'recon' };
  if (u.type === 'ew') return { kind: 'jam' };
  return { kind: 'move' };
}

const when = r => (r.d ? `${CLOCK} It starts at ${hhmm(S.g.t + r.d)} (orders are running late).` : 'It starts now.');
const nm = u => `<b>${esc(u.short || u.name)}</b>`;
const place = s => { const g = S.g, n = g.sectors.name[s], G = gridFor(g.scale); return n || `sector ${String.fromCharCode(65 + (G.col[s] % 26))}${G.row[s] + 1}`; };
const why = r => (r.reason ? ` (${r.reason})` : '');

/** Sectors the armed tool can act on (map hint). */
export function toolHint(g) {
  const t = S.tool, G = gridFor(g.scale);
  if (!t) return [];
  const u = S.sel.length === 1 ? unitOf(S.sel[0]) : null;
  if (t.kind === 'lane' && u) { const out = []; for (let d = 0; d < 8; d++) { let s = u.sec; for (let k = 0; k < 3; k++) { s = G.at(s, d); if (s < 0) break; out.push(s); } } return out; }
  if (t.kind === 'riposte' && u) return G.nbrs[u.sec].filter(s => g.lodg[s]);
  if (t.kind === 'cs') return Object.keys(g.lodg).map(Number);
  if (t.kind === 'cs-pick') return t.secs || [];
  return [];
}

/** A tap on sector `sec` in battle with the current selection and tool. Returns true if it did something. */
export function battleTap(sec) {
  const g = S.g, t = S.tool;
  if (!g || g.over || !t) return false;
  const G = gridFor(g.scale);
  const units = S.sel.map(unitOf).filter(u => u && alive(u));
  const one = units.length === 1 ? units[0] : null;
  let msg = '';
  const go = a => { const r = issue(g, a); return r; };
  switch (t.kind) {
    case 'move': {
      if (S.selFmn) {
        const r = go({ kind: 'fmn', fmn: S.selFmn, order: { kind: 'move', to: sec } });
        msg = r.ok ? `Order sent: <b>${esc(g.fmns[S.selFmn].name)}</b> (${r.n} units) to ${place(sec)}, keeping its layout.` : `No order: ${esc(r.reason)}.`;
        break;
      }
      const movers = units.filter(u => isCompany(u) || u.type === 'drone' || u.type === 'ew');
      if (!movers.length) { msg = 'Batteries do not move; pick a mission, or Displace.'; break; }
      const res = movers.map(u => [u, go({ kind: 'move', unit: u.id, to: sec })]);
      const okk = res.filter(([, r]) => r.ok);
      msg = okk.length ? `Order sent: ${okk.length === 1 ? nm(okk[0][0]) : `${okk.length} units`} to ${place(sec)}. ${when(okk[0][1])}` : `No order${why(res[0][1])}.`;
      break;
    }
    case 'attack': {
      const r = go({ kind: 'fmn', fmn: S.selFmn, order: { kind: 'attack', to: sec, width: t.width ?? 1 } });
      msg = r.ok ? `Attack on axis: <b>${esc(g.fmns[S.selFmn].name)}</b> toward ${place(sec)}, companies paired to leapfrog within each battalion.` : `No order${why(r)}.`;
      break;
    }
    case 'hold': {
      const b = Object.values(G.S.bands).find(x => x && G.row[sec] >= x[0] && G.row[sec] <= x[1]) || [G.row[sec], G.row[sec]];
      const rect = { r0: b[0], r1: b[1], c0: Math.max(0, G.col[sec] - 1), c1: Math.min(G.cols - 1, G.col[sec] + 1) };
      const r = go({ kind: 'fmn', fmn: S.selFmn, order: { kind: 'hold', rect } });
      msg = r.ok ? `Hold zone: <b>${esc(g.fmns[S.selFmn].name)}</b> spreads over rows ${rect.r0 + 1}–${rect.r1 + 1}, three columns wide.` : `No order${why(r)}.`;
      break;
    }
    case 'leapfrog': {
      if (units.length !== 2) { msg = 'Leapfrog needs two units selected: Shift-click the second, or press Select several and tap it.'; break; }
      const r = go({ kind: 'leapfrog', unit: units[0].id, unit2: units[1].id, to: sec, bound: t.bound || 'short' });
      msg = r.ok ? `Leapfrog: ${nm(units[0])} bounds while ${nm(units[1])} overwatches, then they swap, to ${place(sec)}. ${when(r)}` : `No order${why(r)}.`;
      break;
    }
    case 'lane': {
      if (!one || one.type !== 'mg') { msg = 'Only MG companies lay fire lanes.'; break; }
      const d = G.dirTo(one.sec, sec);
      if (d < 0) { msg = 'Tap a sector up to three away in a straight line or diagonal.'; break; }
      const r = go({ kind: 'lane', unit: one.id, dir: d });
      msg = r.ok ? `Fire lane: ${nm(one)} will fire ${DIRS[d].k === 'E' || DIRS[d].k === 'W' ? `across the front, along the ${one.side === 'att' ? 'defenders’' : 'attackers’'} lines (enfilade)` : 'along that line'}. ${when(r)}${one.path.length ? ' It is laid where it stops moving.' : ''} If it moves later, the lane is lost: lay it again.` : `No order${why(r)}.`;
      if (r.ok) S.tool = null;   // 2026-10-04: one-shot (an armed Lane turned the next tap on a unit into another lane)
      break;
    }
    case 'fire': {
      const bats = units.filter(u => isBattery(u));
      if (!bats.length) { msg = 'Pick a battery first.'; break; }
      const res = bats.map(b => [b, inRange(g, b, sec) ? go({ kind: 'fire', unit: b.id, m: t.m, sec }) : { ok: false, reason: 'out of range' }]);
      const okk = res.filter(([, r]) => r.ok);
      msg = okk.length ? `${MISSION_WORD[t.m]} on ${place(sec)}: ${okk.length === 1 ? nm(okk[0][0]) : `${okk.length} batteries`}${okk[0][1].d ? `, landing at ${hhmm(g.t + okk[0][1].d)} (call for fire delay)` : ', this hour'}.`
        : `No fire${why(res[0][1])}.`;
      break;
    }
    case 'riposte': {
      if (!one) break;
      const r = go({ kind: 'riposte', unit: one.id, sec });
      msg = r.ok ? `Local counterattack: ${nm(one)} strikes ${place(sec)} ${r.d ? `at ${hhmm(g.t + r.d)}` : 'this hour'}.` : `No local counterattack${why(r)}: tap a fresh lodgment next to it.`;
      if (r.ok) S.tool = null;   // 2026-10-04: one-shot, so the next tap on a unit selects it instead of ordering another strike
      break;
    }
    case 'cs': case 'cs-pick': {
      if (!g.lodg[sec]) { msg = 'Tap a sector the enemy has just taken (a lodgment, with a clock badge).'; break; }
      const secs = new Set(t.secs || []);
      if (secs.has(sec)) secs.delete(sec); else secs.add(sec);
      S.tool = { kind: 'cs-pick', secs: [...secs] };
      msg = `${secs.size} target${secs.size === 1 ? '' : 's'} picked for the deliberate counterattack. Press <b>Launch counterattack</b> in the panel.`;
      break;
    }
    case 'breach': {
      if (!one) break;
      const r1 = go({ kind: 'move', unit: one.id, to: sec }), r2 = go({ kind: 'breach', unit: one.id, sec });
      msg = r1.ok && r2.ok ? `${nm(one)} moves to ${place(sec)} to clear a lane through the obstacle (2 hours there). ${when(r1)}` : `No order${why(r1.ok ? r2 : r1)}.`;
      break;
    }
    case 'displace': {
      if (!one) break;
      const r = go({ kind: 'displace', unit: one.id, sec });
      msg = r.ok ? `${nm(one)} displaces: no fire for ${ERAS[g.era].displaceHours} h; located flags clear.` : `No order${why(r)}.`;
      break;
    }
    case 'drone': {
      if (!one) break;
      const r = go({ kind: 'drone', unit: one.id, m: t.m, sec });
      msg = r.ok ? `Drone ${t.m === 'recon' ? 'recon (3 × 3 block, exact sightings)' : 'strike'} on ${place(sec)}.` : `No sortie${why(r)}.`;
      break;
    }
    case 'jam': {
      if (!one) break;
      const r = go({ kind: 'jam', unit: one.id, sec });
      msg = r.ok ? `${nm(one)} jams the 5 × 5 area around ${place(sec)} from next hour.` : `No order${why(r)}.`;
      break;
    }
    case 'air': {
      const r = go({ kind: 'air', side: S.me, sec });
      msg = r.ok ? `Air observation over the 3 × 3 block around ${place(sec)} this hour.` : 'No sortie left this hour.';
      S.tool = null;
      break;
    }
    case 'row': {
      const r = go({ kind: 'fmn', fmn: S.selFmn, order: { kind: 'plan', plan: 'consolidateRow', v: G.row[sec] } });
      msg = r.ok ? `Units will consolidate on reaching row ${G.row[sec] + 1}.` : `No order${why(r)}.`;
      S.tool = null;
      break;
    }
    default: return false;
  }
  if (msg) say(msg);
  S.ui.saved && S.ui.saved();
  redraw();
  return true;
}

/** Launch the counterstroke at the picked lodgments. */
export function launchCounterstroke() {
  const g = S.g, t = S.tool;
  const fmn = S.selFmn || (S.sel.length && unitOf(S.sel[0]) && Object.values(g.fmns).find(f => f.cs && f.units.includes(S.sel[0]))?.id);
  if (!fmn || !t || !t.secs || !t.secs.length) { say('Pick the counterattack force, then tap one or more lodgments.'); return; }
  const r = issue(g, { kind: 'counterstroke', fmn, secs: t.secs, h: g.t });
  say(r.ok ? `Deliberate counterattack ordered: <b>${esc(g.fmns[fmn].name)}</b> strikes at ${hhmm(r.h)} after its planning time, with its own supporting fire.` : `No deliberate counterattack${why(r)}.`);
  S.tool = null;
  S.ui.saved && S.ui.saved();
  redraw();
}

/** Set posture / formation / stance / mode for the selection (one formation action, or one per unit). */
export function setAll(kind, v) {
  const g = S.g;
  if (!g || g.over) return;
  let n = 0;
  if (S.selFmn) { const r = issue(g, { kind: 'fmn', fmn: S.selFmn, order: { kind, v } }); n = r.ok ? r.n : 0; }
  else for (const id of S.sel) { const u = unitOf(id); if (u && fighting(u) && issue(g, { kind, unit: id, v }).ok) n++; }
  return n;
}

/** A standing formation plan: riposte authority, or none. */
export const fmnPlan = (plan, v) => issue(S.g, { kind: 'fmn', fmn: S.selFmn, order: { kind: 'plan', plan, v } });

/** Mission types a battery can fire in this era. */
export function missionsFor(g, u) {
  const out = ['suppress', 'destroy', 'smoke', 'cb'];
  if (ERAS[g.era].gas) out.splice(2, 0, 'gas');
  if (TYPES[u.type].precision) out.push('precision');
  return out;
}
