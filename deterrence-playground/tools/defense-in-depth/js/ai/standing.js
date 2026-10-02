// Standing orders (W3, DECISIONS "W3: standing orders"): what a human side's units do on their own when the player
// gives no order, so a newcomer who plans with Auto-plan and then watches still fights a sensible battle. They are
// the Standard commander's hourly reactions for that side, read from the side's own fogged picture one hour late,
// limited to the categories the player leaves switched on, and they never touch a unit or formation the player
// has ordered in the last few hours (the player's order always wins). Deterministic, so replays reproduce them.
//   Attacker: advance (rush behind the barrage, leapfrog against live fire, pair up, take and consolidate the
//             objective), reserves (follow-on waves go in behind success, flank guards, tanks follow the infantry),
//             fires (batteries not on the barrage suppress what the side can see ahead of its leading companies).
//   Defender: counterstroke (the Counterstroke formation moves behind the threatened sector and attacks a
//             lodgment inside its window), reserves (idle companies block the penetration and garrison the
//             objective line), fires (batteries answer what the side can see).
import { resolve } from './profiles.js';
import { attackerPolicy } from './attacker.js';
import { defenderPolicy } from './defender.js';
import { CS_ROLES } from '../counter.js';
import { isBattery } from '../forces.js';

/** The standing orders each side can switch on or off, in display order, with their on-screen names. */
export const STANDING = {
  att: [
    { key: 'advance', label: 'Advance', text: 'Leading companies rush behind the barrage, leapfrog in pairs against live fire and consolidate on the objective.' },
    { key: 'reserves', label: 'Follow-on waves', text: 'Second-wave companies go in behind the deepest success, guard the flanks, and tanks stay with the infantry.' },
    { key: 'fires', label: 'Supporting fire', text: 'Batteries not firing the barrage suppress the defenders you can see ahead of your leading companies.' },
  ],
  def: [
    { key: 'counterstroke', label: 'Counterstroke', text: 'The Counterstroke formation moves behind the threatened sector and attacks a lodgment while its window is open.' },
    { key: 'reserves', label: 'Reserves', text: 'Idle companies away from the fighting block the penetration and keep the objective line garrisoned.' },
    { key: 'fires', label: 'Defensive fire', text: 'Batteries fire on the attackers you can see and answer his batteries once they are located.' },
  ],
};

/** Reaction latency of standing orders (hours): last hour's picture, like the Standard computer (defender: 2, below). */
export const STANDING_LATENCY = 1;
/**
 * What standing orders leave to the commander (the player): the attacker's never shift the main effort, and only
 * the batteries in direct support of a battalion answer on their own (the rest fire counter-battery or wait for
 * you); the defender's react two hours late. NOTIONAL, set so an idle Auto-plan player wins roughly a third of
 * battles against the Standard computer (DECISIONS W3).
 */
export const STANDING_PROFILE = { att: { shiftEvery: 0 }, def: { latency: 2 } };
/** A unit or formation the player ordered within this many hours is left alone. */
export const OVERRIDE_HOURS = 3;

/** Default switches for a human side: every standing order on. */
export const standingDefaults = side => Object.fromEntries(STANDING[side].map(s => [s.key, true]));

/** Units (and formations) the player has ordered recently, from the action log. */
function touched(g, side) {
  const ids = new Set(), fmns = new Set();
  for (let i = g.log.length - 1; i >= 0; i--) {
    const a = g.log[i];
    if (a.t < g.t - OVERRIDE_HOURS) break;
    if (a.kind === 'standing') continue;
    for (const k of ['unit', 'unit2']) if (a[k] != null) { const u = g.units[g.ix[a[k]]]; if (u && u.side === side) ids.add(a[k]); }
    if (a.fmn != null && g.fmns[a.fmn] && g.fmns[a.fmn].side === side) { fmns.add(a.fmn); for (const id of g.fmns[a.fmn].units) ids.add(id); }
  }
  return { ids, fmns };
}

/** Which standing order an AI action belongs to. */
function category(g, side, a) {
  const u = a.unit != null ? g.units[g.ix[a.unit]] : null;
  if (a.kind === 'fire' || a.kind === 'barrage' || a.kind === 'drone' || a.kind === 'jam' || a.kind === 'air' || (u && isBattery(u))) return 'fires';
  if (side === 'def') {
    if (a.kind === 'counterstroke' || a.kind === 'fmn' || a.kind === 'riposte' || (u && CS_ROLES.has(u.role))) return 'counterstroke';
    return 'reserves';
  }
  if (a.kind === 'fmn') return 'reserves';
  if (u && (u.type === 'tank' || g._ai && g._ai.att && g._ai.att.roles && ['res', 'guard', 'tank'].includes(g._ai.att.roles[u.id]) && u.sec >= 0 && !u.path.length)) return 'reserves';
  return 'advance';
}

/** This hour's standing-order actions for a human side ([] if all are off). */
export function standingOrders(g, side) {
  const on = g.standing && g.standing[side];
  if (!on || !Object.values(on).some(Boolean)) return [];
  const P = resolve({ base: side === 'def' ? 'elasticDepth' : 'modernSystem', latency: STANDING_LATENCY, ...STANDING_PROFILE[side] }, side, 's');
  const res = side === 'def' ? defenderPolicy(g, P) : attackerPolicy(g, P);
  const { ids, fmns } = touched(g, side);
  const out = [];
  for (const a of [...(res.missions || []).map(m => ({ kind: 'fire', ...m })), ...(res.actions || [])]) {
    const cat = category(g, side, a);
    if (!on[cat]) continue;
    if (cat === 'fires' && side === 'att' && a.kind === 'fire') { const b = g.units[g.ix[a.unit]]; if (!b || !b.ds && a.m !== 'cb') continue; }   // direct-support batteries answer on their own; the rest only fire counter-battery
    if ((a.unit != null && ids.has(a.unit)) || (a.unit2 != null && ids.has(a.unit2)) || (a.fmn != null && fmns.has(a.fmn))) continue;
    out.push(a);
  }
  return out;
}
