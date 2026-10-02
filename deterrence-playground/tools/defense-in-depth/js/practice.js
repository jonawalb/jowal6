// The Practice field's engine side: a thin wrapper that builds a game state of the real shape on the 3 x 4
// practice board (data/practice.js) and plays an hour with the real engine's order delivery, fire missions and
// movement (orders.js deliver, arty.js firePhase, move.js moveAll). No enemy, no combat, no victory check, no
// share link. Real-game rules, balance, AI and links are untouched: the practice scale is registered under its
// own id ('p'), which is not in SCALE_IDS, so the start screen and the link reader never offer it.
import { SCALES } from '../data/scales.js';
import { TYPES } from '../data/units.js';
import { CARDS, COHESION } from '../data/params.js';
import { T } from '../data/terrain.js';
import { PRACTICE_SCALE, PRACTICE_GROUND, PRACTICE_FMNS, practiceRoster } from '../data/practice.js';
import { makeRng, STREAM } from './rng.js';
import { gridFor, FWD } from './grid.js';
import { emptyFeat } from './mapgen.js';
import { reindex, isBattery, other } from './forces.js';
import { computeCover, dropMovedLanes } from './fire.js';
import { firePhase } from './arty.js';
import { modernPhase, jamAreas } from './modern.js';
import { deliver } from './orders.js';
import { moveAll } from './move.js';

if (!SCALES.p) SCALES.p = PRACTICE_SCALE;

const SIDES = ['def', 'att'];
const DELAY_HOURS = 400;   // order delays are pre-set (all "start now"); the drill makes one hour late on purpose

/** The practice ground: open boxes, one wood and one village (names from data/practice.js). */
function ground(G) {
  const terrain = new Uint8Array(G.n), elev = new Uint8Array(G.n), name = new Array(G.n).fill(null);
  for (const [key, { at, name: nm }] of Object.entries(PRACTICE_GROUND)) {
    const s = G.idx(at[0], at[1]);
    terrain[s] = T[key]; name[s] = nm;
  }
  return { terrain, elev, name, feat: emptyFeat(G.n), ridge: '', stream: null };
}

/**
 * A new practice game. opts: { side = 'def', era = 'w', seed = 1 }. Returns a state g of the engine's shape
 * (js/engine.js newGame), already in its battle phase at hour 0, with the player's units placed.
 */
export function newPractice(opts = {}) {
  const side = opts.side === 'att' ? 'att' : 'def', era = opts.era === 'm' ? 'm' : 'w', seed = Math.max(1, Math.round(opts.seed || 1));
  const G = gridFor('p'), S = SCALES.p;
  const mk = () => ({ def: new Uint8Array(G.n), att: new Uint8Array(G.n) });
  const mkI = () => ({ def: new Int16Array(G.n).fill(-99), att: new Int16Array(G.n).fill(-99) });
  const P = side === 'def' ? 'd' : 'a';
  const fmns = {}, top = `${P}f0`;
  const fmn = (id, kind, name, parent) => { fmns[id] = { id, kind, name, parent, side, kids: [], units: [], role: null, cs: false, div: 0 }; if (parent) fmns[parent].kids.push(id); };
  fmn(top, 'grp', PRACTICE_FMNS.top, null);
  fmn(`${P}f1`, 'bn', PRACTICE_FMNS.bn, top);
  fmn(`${P}f2`, 'grp', PRACTICE_FMNS.support, top);
  const units = practiceRoster(era).map((r, i) => {
    const Ty = TYPES[r.type], str = era === 'm' && Ty.strM ? Ty.strM : Ty.str, bat = Ty.cat === 'bat';
    const row = side === 'def' ? r.at[0] : G.rows - 1 - r.at[0];
    const u = {
      id: `${P}${i}`, side, type: r.type, name: r.name, short: r.name.replace(/ (Coy|Bty|Team|Section)$/, ''), typeName: r.typeName,
      role: 'practice', fmn: [top, r.fmn === 'bn' ? `${P}f1` : `${P}f2`], str: bat ? 0 : str, str0: bat ? 0 : str, guns: Ty.guns || 0, guns0: Ty.guns || 0, div: 0,
      // Attacking batteries stand on the gun line off the map, as in the real game (SPEC §2.7).
      sec: bat && side === 'att' ? -1 : G.idx(row, r.at[1]),
      q: 1, posture: side === 'att' ? 'rush' : 'hold', formation: 'waves', stance: side === 'att' ? 'elastic' : 'hold', facing: FWD[side],
      coh: COHESION.start, supp: 0, _ps: 1, pair: null, lane: null, laneCells: null, prog: 0, path: [], dest: null, mode: 'normal',
      broken: false, staticH: 0, gain: 0, lossH: 0, inc: { fr: 0, fl: 0, ar: 0, dr: 0 }, arrive: null, X: 0,
      trained: Object.fromEntries(CARDS.map(c => [c, 1])),
    };
    for (const f of u.fmn) fmns[f].units.push(u.id);
    return u;
  });
  const g = {
    v: 1, seed, dice: 0, scale: 'p', era, mode: 's', diff: 's', od: 5, practice: true,
    t: 0, turns: S.turns, over: null, phase: 'battle', cols: G.cols, rows: G.rows, att: 'att', def: 'def', ctx: {},
    players: { def: null, att: null }, sectors: ground(G), units, fmns, tops: { [side]: top, [other(side)]: null }, ix: {},
    ctrl: new Int8Array(G.n).fill(side === 'def' ? 1 : 2), contest: {}, lodg: {}, lodgEver: {}, taken: {}, known: { att: new Uint8Array(G.n) },
    scouted: new Uint8Array(G.n), dummyWatch: {}, coverDirs: mk(), laneHit: mk(), obs: mk(), spot: mk(),
    beliefSec: { def: new Float32Array(G.n), att: new Float32Array(G.n) }, exactNow: { def: new Set(), att: new Set() },
    droneSeen: mkI(), droneRecon: mkI(), airSeen: mkI(), airUp: {}, airCount: { def: {}, att: {} }, jammed: mk(),
    gas: new Uint8Array(G.n), gasAge: new Uint8Array(G.n), smokeNow: new Uint8Array(G.n), destroyRun: {},
    missions: [], orders: [], cstrokes: [], sorties: [], log: [], events: [], snaps: [], seen: { def: [], att: [] },
    ammo: { ...S.ammo[era] }, precision: { def: 8, att: 8 }, barrage: null, barHist: {}, deepHist: [], plans: {},
    noDelay: false, noTelemetry: true, dark: [], standing: { def: null, att: null },
    telemetry: { events: [], meta: {} },
    _delay: { def: new Array(DELAY_HOURS).fill(0), att: new Array(DELAY_HOURS).fill(0) },
    pos: [],   // pos[t]: every unit's box at the start of hour t (the drill reads how far an order sends a unit)
  };
  g.ui = { me: side, ammo0: { ...g.ammo } };
  g.rng = Object.fromEntries(['fire', 'move', 'modern'].map(k => [k, makeRng(seed, STREAM[k])]));
  g.units.forEach((u, i) => { g.ix[u.id] = i; });
  reindex(g);
  covers(g);
  g.pos[0] = Int16Array.from(g.units, u => u.sec);
  return g;
}

function covers(g) {
  for (const s of SIDES) computeCover(g, s);
  g.coverDirty = false;
}

/** Make the player's orders this hour start an hour late (the drill shows a dashed, late order). */
export function delayThisHour(g, hours = 1) { g._delay[g.ui.me][g.t] = hours; }

/**
 * Play one practice hour: fire missions, orders due, movement; then the clock moves on. Nothing can be lost.
 * Returns { t, moved: [{ id, from, to, steps }], waiting: [ids whose order starts later], fired: [battery ids] }.
 */
export function practiceHour(g) {
  const t = g.t, from = Int16Array.from(g.units, u => u.sec);
  for (const u of g.units) {
    u._ps = 1; u.lossH = 0; u.inc = { fr: 0, fl: 0, ar: 0, dr: 0 }; u.moving = false; u.held = false; u.gain = 0; u.fired = false; u.steps = 0;
  }
  g.smokeNow.fill(0);
  reindex(g);
  firePhase(g, g.rng.fire);
  modernPhase(g, g.rng.modern);
  deliver(g);
  if (g.coverDirty) covers(g);
  moveAll(g, g.rng.move);
  for (const u of g.units) { u.supp = 0; u.located = false; }   // no enemy: nobody is suppressed or located
  dropMovedLanes(g);   // as in the real game: an MG that moved has lost its lane and must lay it again
  reindex(g);
  covers(g);
  const fired = g.units.filter(b => isBattery(b) && b.firedAt === t).map(b => b.id);
  g.events = g.events.filter(e => e.kind !== 'located');
  g.t += 1;
  g.airUp = {};
  jamAreas(g);
  g.pos[g.t] = Int16Array.from(g.units, u => u.sec);
  const moved = [], waiting = [];
  g.units.forEach((u, i) => {
    if (u.sec !== from[i] && u.sec >= 0) moved.push({ id: u.id, from: from[i], to: u.sec, steps: gridFor('p').dist(from[i], u.sec) });
    else if (g.orders.some(o => o.unit === u.id && !o.done && !o.cancelled && o.due >= g.t)) waiting.push(u.id);
  });
  return { t, moved, waiting, fired };
}
