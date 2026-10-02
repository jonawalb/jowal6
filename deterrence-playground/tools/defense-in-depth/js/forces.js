// Order-of-battle builder (SPEC §2.5): data/units.js templates plus one function. buildForces(scale, era, side)
// returns { units, fmns }: units are plain records (the engine adds live state), fmns is the formation tree
// (Army > Corps > Division > Regiment/Group > Battalion) used by the Units pane and formation orders.
import { TYPES, DEF_DIVISION, ATT_DIVISION, DEF_CS_DIVISION, DEF_ARMY_RESERVE, ATT_ECHELON2, ATT_STORM_ARMY, ORBAT } from '../data/units.js';
import { ERAS } from '../data/eras.js';
import { BIRDS, DEF_REGIMENTS, COMPANY_LETTERS, ordinal } from '../data/names.js';

const TEMPLATES = { DEF_CS_DIVISION, DEF_ARMY_RESERVE, ATT_ECHELON2, ATT_STORM_ARMY };
const DEF_RGT_NO = [17, 21, 26, 29];
const TANK_NAMES = ['Ram', 'Bull', 'Boar', 'Stag'];

/** Expand a unit spec ([type, name, role] or { n, type, name, role, era }) into concrete unit specs. */
function expandUnit(spec, era, ctx) {
  const s = Array.isArray(spec) ? { n: 1, type: spec[0], name: spec[1], role: spec[2] } : { n: 1, ...spec };
  if (s.era && s.era !== era) return [];
  const out = [];
  for (let i = 1; i <= s.n; i++) {
    const name = fill(s.name, ctx)
      .replace('{i}', String(i)).replace('{o}', ordinal(i))
      .replace('{L}', () => COMPANY_LETTERS[ctx.letter++ % COMPANY_LETTERS.length]);
    let type = s.type;
    if (era === 'm' && type === 'heavy') type = 'rocket';   // Modern heavy batteries are rocket (precision) batteries
    out.push({ type, name, role: s.role });
  }
  return out;
}

const fill = (str, ctx) => str.replace(/\{(div|div0|divn|rgt|rgtA|rgtB|rgtC|bird|tank)\}/g, (_, k) => ctx[k] ?? '');

/**
 * Build one side's forces for a scale and era.
 * @param {'d'|'c'|'a'} scale
 * @param {'w'|'m'} era
 * @param {'def'|'att'} side
 * @returns {{ units: object[], fmns: Object<string, object>, top: string }}
 */
export function buildForces(scale, era, side) {
  const plan = ORBAT[scale][side];
  const units = [], fmns = {};
  let fk = 0, birdK = 0;
  const P = side === 'def' ? 'd' : 'a';
  const newFmn = (kind, name, parent, extra = {}) => {
    const id = `${P}f${fk++}`;
    fmns[id] = { id, kind, name, parent, side, kids: [], units: [], ...extra };
    if (parent) fmns[parent].kids.push(id);
    return id;
  };
  const addUnits = (specs, fid, ctx) => {
    for (const spec of specs || []) for (const u of expandUnit(spec, era, ctx)) {
      const T = TYPES[u.type];
      const str = era === 'm' && T.strM ? T.strM : T.str;
      units.push({ id: `${P}${units.length}`, side, type: u.type, name: u.name, short: u.name.replace(/ (Coy|Bty|Team|Section)$/, ''),
        role: u.role, fmn: [fid], str, str0: str, guns: T.guns || 0, guns0: T.guns || 0, div: ctx.divIdx });
    }
  };
  const walk = (tpl, parent, ctx) => {
    const fid = newFmn(tpl.kind, fill(tpl.name, ctx), parent, { role: tpl.role || null, cs: !!tpl.cs, div: ctx.divIdx });
    for (const k of tpl.kids || []) walk(k, fid, ctx);
    addUnits(tpl.units, fid, ctx);
    return fid;
  };
  const top = plan.top ? newFmn(plan.top.kind, plan.top.name, null, { div: -1 }) : null;
  const corpsIds = plan.top && plan.top.corps ? plan.top.corps.map(n => newFmn('corps', n, top, { div: -1 })) : [];
  const nDiv = plan.divs.length;
  plan.divs.forEach((divNo, k) => {
    const parent = corpsIds.length ? corpsIds[Math.floor(k / (nDiv / corpsIds.length))] : top;
    const ctx = {
      div: `${ordinal(divNo)}`, div0: ordinal(divNo), divn: String(divNo), letter: 0, divIdx: k,
      rgt: `${ordinal(DEF_RGT_NO[k])} ${DEF_REGIMENTS[k]}`, rgtA: `Grenadier Regiment ${112 + 10 * k}`, rgtB: `Grenadier Regiment ${114 + 10 * k}`,
      bird: BIRDS[birdK++], tank: TANK_NAMES[k],
    };
    walk(side === 'def' ? DEF_DIVISION : ATT_DIVISION, parent, ctx);
  });
  const troops = (list, parent, k0) => {
    let j = 0;
    for (const tr of list || []) {
      const ctx = { letter: 0, divIdx: -1, bird: BIRDS[birdK], rgtC: `Grenadier Regiment ${120 + 10 * (k0 + j)}` };
      if (tr.t) { if (side === 'def') birdK++; walk(TEMPLATES[tr.t], parent, ctx); j++; continue; }
      const fid = newFmn('grp', tr.name, parent, { role: 'arty', div: -1 });
      addUnits([{ n: tr.heavy, type: 'heavy', name: '{o} Heavy Bty', role: 'arty' }], fid, ctx);
    }
  };
  corpsIds.forEach((cid, k) => troops(plan.top.corpsTroops, cid, k));
  if (plan.top) troops(plan.top.troops, top, corpsIds.length || 0);
  // Every unit's fmn path from the top of the tree down to its own formation.
  const pathOf = fid => { const p = []; for (let f = fid; f; f = fmns[f].parent) p.unshift(f); return p; };
  for (const u of units) u.fmn = pathOf(u.fmn[u.fmn.length - 1]);
  for (const f of Object.values(fmns)) f.units = [];
  for (const u of units) for (const f of u.fmn) fmns[f].units.push(u.id);
  // Names in the era's words (rifle -> infantry company etc. in Modern).
  const words = ERAS[era].names;
  for (const u of units) u.typeName = words[u.type] || u.type;
  return { units, fmns, top: top || Object.keys(fmns).find(id => !fmns[id].parent) };
}

/** Unit counts per side for a scale and era (data.test.mjs checks them against SPEC §2.2). */
export const countForces = (scale, era) => ({ def: buildForces(scale, era, 'def').units.length, att: buildForces(scale, era, 'att').units.length });

// ---- Live-unit helpers shared by every engine module (no engine imports, so no cycles) ----

export const other = side => (side === 'def' ? 'att' : 'def');
export const isBattery = u => TYPES[u.type].cat === 'bat';
export const isTeam = u => TYPES[u.type].cat === 'team';
/** Companies count for stacking and hold ground (infantry and vehicles). */
export const isCompany = u => { const c = TYPES[u.type].cat; return c === 'inf' || c === 'veh'; };
export const isVehicle = u => TYPES[u.type].cat === 'veh';
/** Still in the fight: batteries with guns left (attacker guns sit off the map, sec -1); others on the map with strength left. */
export const alive = u => !u.broken && (isBattery(u) ? u.guns > 0 : u.sec >= 0 && u.str > 0);
/** Can hold or take ground (a company still fighting). */
export const fighting = u => alive(u) && isCompany(u);
/** Hidden from the enemy: an undetected infiltrator. */
export const hidden = (g, u) => u.posture === 'infil' && u.stealth && !(u.detected > g.t);

/** Rebuild the per-sector occupancy index g.occ (arrays of live units). Call after anything moves. */
export function reindex(g) {
  const occ = g.occ || (g.occ = []);
  for (let i = 0; i < g.cols * g.rows; i++) { if (occ[i]) occ[i].length = 0; else occ[i] = []; }
  for (const u of g.units) if (alive(u) && u.sec >= 0) occ[u.sec].push(u);
  return occ;
}
/** Live fighting units of a side in a sector (from the index). */
export const inSec = (g, sec, side) => (sec >= 0 && g.occ[sec] ? g.occ[sec].filter(u => u.side === side && isCompany(u) && !u.broken && u.str > 0) : []);
export const hasSide = (g, sec, side) => sec >= 0 && !!g.occ[sec] && g.occ[sec].some(u => u.side === side && isCompany(u));
export const companies = (g, sec, side) => (sec >= 0 && g.occ[sec] ? g.occ[sec].reduce((s, u) => s + (u.side === side && isCompany(u) ? 1 : 0), 0) : 0);
export const unitById = (g, id) => g.units[g.ix[id]];
/** Has this unit mastered (or been trained in) a doctrine card? Trained >= 0.5 counts (SPEC §6.3). */
export const knows = (u, card) => (u.trained && u.trained[card] != null ? u.trained[card] >= 0.5 : false);
