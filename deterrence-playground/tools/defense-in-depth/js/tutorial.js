// The "Learn to play" battle's engine side (2026-10-04): a small real battle on the tutorial board
// (data/tutorial.js), played hour by hour by the real engine (js/engine.js advance) with every real rule: fire,
// lanes, assaults, lodgments, counterattacks and victory. Only the setting is small: seven defending companies,
// seven attacking companies and two batteries, five hours, and a scripted attacker that comes down one column.
// Real-game rules, balance, AI and links are untouched: the tutorial scale is registered under its own id ('t'),
// which is not in SCALE_IDS, so the start screen and the link reader never offer it.
import { SCALES } from '../data/scales.js';
import { ORBAT } from '../data/units.js';
import { TUTORIAL_SCALE, TUTORIAL_SEED, TUTORIAL_DEF, TUTORIAL_ATT, TUTORIAL_AXIS, TUTORIAL_FMNS, TUTORIAL_ATT_COHESION } from '../data/tutorial.js';
import { newGame, index, applyPlan } from './engine.js';
import { newTelemetry } from './telemetry.js';
import { gridFor } from './grid.js';
import { fighting, isBattery, isCompany } from './forces.js';

if (!SCALES.t) SCALES.t = TUTORIAL_SCALE;
if (!ORBAT.t) ORBAT.t = ORBAT.d;   // newGame builds a Division's forces; newTutorial keeps only the roster below

/** The scripted attacker: each hour, idle companies push on down their column; one battery shells the crowded box. */
export function tutorialAttacker(g) {
  const G = gridFor('t'), S = SCALES.t, actions = [], missions = [];
  for (const u of g.units) {
    if (u.side !== 'att' || !fighting(u) || !isCompany(u) || u.sec < 0) continue;
    if (u.path.length || g.contest[u.sec] || G.row[u.sec] >= S.obj.row) continue;
    actions.push({ kind: 'move', unit: u.id, to: G.idx(S.obj.row, G.col[u.sec]) });
  }
  const shell = G.idx(TUTORIAL_AXIS.shell[0], TUTORIAL_AXIS.shell[1]);
  const b = g.units.find(x => x.side === 'att' && isBattery(x) && x.role2 === 'call');
  if (b && g.t <= 2) missions.push({ unit: b.id, m: 'suppress', sec: shell });
  return { missions, actions };
}
export function tutorialAttPlan(g) {
  const G = gridFor('t'), att = g.units.filter(u => u.side === 'att');
  const plan = { place: {}, form: {}, posture: {}, orders: [], bats: {}, reserves: {}, objective: { type: 'breakthrough' }, ew: {} };
  const bats = att.filter(isBattery);
  for (const u of att) {
    if (isBattery(u)) continue;
    plan.form[u.id] = 'groups'; plan.posture[u.id] = 'rush';
    plan.orders.push({ unit: u.id, to: G.idx(SCALES.t.obj.row, G.col[u.sec]) });
  }
  plan.place = Object.fromEntries(att.filter(u => !isBattery(u)).map(u => [u.id, u.sec]));
  bats.forEach((b, i) => { plan.bats[b.id] = i === 0 ? 'barrage' : 'call'; });
  plan.barrage = { cols: [TUTORIAL_AXIS.col], r0: SCALES.t.bands.outpost[0], rate: 1, bats: [bats[0].id] };
  return plan;
}

/** Take the roster's units out of a Division's built forces, rename and place them. */
function pick(g, side, roster) {
  const pool = g.units.filter(u => u.side === side), used = new Set(), G = gridFor('t'), out = [];
  for (const r of roster) {
    const u = pool.find(x => x.type === r.type && !used.has(x));
    used.add(u);
    u.name = r.name; u.short = r.name.replace(/ (Coy|Bty)$/, ''); u.role = side === 'def' ? 'front' : 'wave1';
    u.sec = r.at ? G.idx(r.at[0], r.at[1]) : -1;
    if (side === 'att' && isCompany(u)) u.coh = TUTORIAL_ATT_COHESION;
    out.push(u);
  }
  return out;
}

/**
 * A new tutorial battle, already at H-hour (hour 0, phase 'battle'). The player defends; orders start at once
 * (no runner delay) so every order shows its effect the same hour. Same map and dice every time.
 */
export function newTutorial(opts = {}) {
  const seed = opts.seed || TUTORIAL_SEED;
  const g = newGame({ seed, scale: 't', era: 'w', mode: 's', diff: 's', od: 5, noDelay: true });
  g.players.att = tutorialAttacker;   // set after newGame, so it does not plan for a whole Division on this board
  const def = pick(g, 'def', TUTORIAL_DEF), att = pick(g, 'att', TUTORIAL_ATT);
  g.units = [...def, ...att];
  const fm = (id, side, name) => ({ id, kind: 'bn', name, parent: null, side, kids: [], units: [], role: side === 'def' ? 'front' : 'wave1', cs: false, div: 0 });
  g.fmns = { df0: fm('df0', 'def', TUTORIAL_FMNS.def), af0: fm('af0', 'att', TUTORIAL_FMNS.att) };
  g.tops = { def: 'df0', att: 'af0' };
  for (const u of g.units) { u.fmn = [u.side === 'def' ? 'df0' : 'af0']; g.fmns[u.fmn[0]].units.push(u.id); }
  index(g);
  g.telemetry = newTelemetry(g);
  g.tutorial = true;
  g.ctx.attCoh0 = TUTORIAL_ATT_COHESION;   // known to both sides: the window badge's estimate starts from it (js/ui/view.js)
  const place = Object.fromEntries(def.map(u => [u.id, u.sec]));
  applyPlan(g, 'def', { works: [], place, lanes: {}, stance: Object.fromEntries(def.map((u, i) => [u.id, TUTORIAL_DEF[i].stance || 'hold'])), sos: {}, cs: null, csTargets: [], cbPriority: 'none', ew: {}, drones: {}, form: {} });
  applyPlan(g, 'att', tutorialAttPlan(g));   // both plans in: the battle begins (engine.begin)
  return g;
}
