// View models for the map (js/ui/map.js render): what to draw for the planning phase, an hour of play, or an
// hour of the review. Everything here comes from your own picture: your units and works, your sightings
// (picture(g, me, 'fog')), the attacker's air-mapped works (g.known.att). Only the review's "What was true"
// view reads the true enemy positions, from the hour's snapshot.
import { SCALES } from '../../data/scales.js';
import { TYPES } from '../../data/units.js';
import { COUNTER } from '../../data/params.js';
import { gridFor, laneCells, popcount, FWD, opp } from '../grid.js';
import { picture, objectiveStatus, raceClock } from '../engine.js';
import { alive, isCompany, isBattery } from '../forces.js';
import { barrageRows, underGuns } from '../arty.js';
import { S, other, hhmm } from './store.js';
import { matches, isIdle, isLate, letterOf, markOf, pendingOrder } from './filters.js';

const enfOf = d => (d === 2 || d === 6 ? 'enf' : d % 2 ? 'half' : 'front');
const hpOf = u => (u.str0 > 0 ? Math.max(0, u.str) / u.str0 : isBattery(u) ? (u.guns0 ? u.guns / u.guns0 : 1) : null);

/** Works layer: per-sector { trench, comm, obst, obstC, strong, dugout, dummy, own, exposed } or null. */
function works(g, me, plan) {
  const G = gridFor(g.scale), f = g.sectors.feat, out = new Array(G.n).fill(null);
  if (me === 'def') {
    for (let s = 0; s < G.n; s++) {
      const k = { trench: f.trench[s], comm: f.comm[s], obst: f.obst[s] > 0.05, obstC: f.obstC[s], strong: f.strong[s], dugout: f.dugout[s], dummy: f.dummy[s], own: true };
      if (k.dummy && !k.strong) k.strong = 1;
      if (k.trench || k.comm || k.obst || k.strong || k.dugout) out[s] = k;
    }
    for (const w of (plan && plan.works) || []) {
      const k = out[w.sec] || (out[w.sec] = { own: true });
      if (w.kind === 'trench') k.trench = w.axis === 'ns' ? 2 : 1;
      else if (w.kind === 'comm') k.comm = 1;
      else if (w.kind === 'obst' || w.kind === 'obstC') { k.obst = true; k.obstC = w.kind === 'obstC'; }
      else if (w.kind === 'strong') k.strong = Math.max(1, k.strong || 0);
      else if (w.kind === 'concrete') k.strong = 2;
      else if (w.kind === 'dugout') k.dugout = 1;
      else if (w.kind === 'dummy') { k.dummy = 1; k.strong = k.strong || 1; }
    }
    return out;
  }
  const K = g.known.att;
  for (let s = 0; s < G.n; s++) {
    const b = K[s];
    if (!b) continue;
    out[s] = { trench: b & 1 ? 1 : 0, comm: b & 2, obst: !!(b & 4) && f.obst[s] > 0.05, strong: b & 8 || b & 16 ? 1 : 0, exposed: !!(b & 16), own: false };
  }
  return out;
}

/** Coverage count per sector from a placement and lanes (planning preview; same rule as fire.js computeCover). */
function previewCover(g, side, place, lanes) {
  const G = gridFor(g.scale), m = new Uint8Array(G.n);
  for (const u of g.units) {
    if (u.side !== side || !isCompany(u) || !TYPES[u.type].fp) continue;
    const s = place[u.id] ?? u.sec;
    if (s == null || s < 0) continue;
    if (u.type === 'mg' && lanes[u.id] != null) for (const c of laneCells(G, g.sectors.elev, s, lanes[u.id])) m[c] |= 1 << opp(lanes[u.id]);
    const f = FWD[side];
    for (const d of [f, (f + 1) & 7, (f + 7) & 7]) { const c = G.at(s, d); if (c >= 0) m[c] |= 1 << opp(d); }
  }
  return m.map(popcount);
}

/** Estimated counterattack window on a lodgment, from what both sides can see (cohesion is estimated). */
export function estWindow(g, sec) {
  const L = g.lodg[sec], G = gridFor(g.scale), Sc = SCALES[g.scale];
  if (!L) return null;
  // The attackers' starting cohesion is 1 unless a scenario says otherwise (the Learn to play battle tells both
  // sides its attackers start tired: g.ctx.attCoh0, js/tutorial.js).
  const c0 = g.ctx && g.ctx.attCoh0 != null ? g.ctx.attCoh0 : 1;
  const coh = Math.max(0.3, c0 - 0.06 * Math.max(0, G.row[sec] - Sc.bands.nml[1]) - 0.04 * L.hcap);
  const outside = !underGuns(g, 'att', sec);
  const ca = Math.max(COUNTER.min, Math.min(COUNTER.max, 1 + COUNTER.coh * (1 - coh) + (outside ? COUNTER.outside : 0) - (L.cons ? COUNTER.cons : 0)));
  const badge = L.cons ? 'grey' : ca >= COUNTER.window && L.hcap <= COUNTER.windowHours ? 'green' : 'amber';
  return { sec, badge, ca, coh, outside, cons: L.cons, hcap: L.hcap };
}

function ownChip(g, u, sel, f, live) {
  return {
    id: u.id, sec: u.sec, letter: letterOf(u), hp: hpOf(u), mark: markOf(u), sel: sel.has(u.id), bat: isBattery(u) || TYPES[u.type].cat === 'team',
    dim: live && f !== 'all' && f !== 'idle' && !matches(g, u, f), idle: live && isIdle(g, u), late: live && isLate(g, u),
    title: `${u.name} (${u.typeName || u.type}), ${Math.round((hpOf(u) ?? 1) * 100)}%`,
  };
}

/** The live view of an hour of play. hint: sectors the armed tool can act on. */
export function liveView(g, me, extra = {}) {
  const G = gridFor(g.scale), sel = new Set(S.sel), foe = other(me);
  const pic = picture(g, me, 'fog');
  const units = g.units.filter(u => u.side === me && alive(u) && u.sec >= 0).map(u => ownChip(g, u, sel, S.filter, true));
  const tracks = pic.tracks.map(t => ({ sec: t.sec, letter: TYPES[t.type] ? TYPES[t.type].letter : '?', hp: t.exact ? t.hp : null, exact: t.exact, age: t.age,
    title: `Enemy ${t.type}${t.exact ? `, ${Math.round((t.hp ?? 1) * 100)}%` : ' (type only; losses unknown)'}${t.age ? `, seen ${t.age} h ago` : ''}` }));
  const lanes = g.units.filter(u => u.side === me && u.type === 'mg' && alive(u) && u.lane != null && u.laneCells)
    .map(u => ({ from: u.sec, cells: u.laneCells, enf: enfOf(u.lane), sel: sel.has(u.id) }));
  const cover = popcountAll(g.coverDirs[me]);
  const outGuns = (S.drawLayers || S.layers).has('guns') ? Uint8Array.from({ length: G.n }, (_, s) => (underGuns(g, me, s) ? 0 : 1)) : null;
  const barrage = { now: [], next: [], sos: [], missions: [] };
  if (g.barrage && me === 'att') {
    for (const r of barrageRows(g, g.t)) for (const c of g.barrage.cols) barrage.now.push(G.idx(r, c));
    for (const r of barrageRows(g, g.t + 1)) for (const c of g.barrage.cols) barrage.next.push(G.idx(r, c));
  }
  if (me === 'def') for (const b of g.units) if (b.side === 'def' && isBattery(b) && alive(b) && b.sos) barrage.sos.push(...b.sos);
  for (const m of g.missions) if (m.side === me && !m.done && m.due >= g.t) barrage.missions.push(m.sec);
  const routes = [];
  for (const u of g.units) {
    if (u.side !== me || !alive(u) || u.sec < 0) continue;
    if (u.path && u.path.length) routes.push({ path: [u.sec, ...u.path], pending: false, sel: sel.has(u.id), cs: !!u.cs });
    const o = pendingOrder(g, u);
    if (o && o.a.to != null) routes.push({ path: [u.sec, o.a.to], pending: o.due > g.t, sel: sel.has(u.id) });
  }
  const lodg = Object.keys(g.lodg).map(k => estWindow(g, +k)).filter(Boolean)
    .map(w => ({ ...w, title: `Lodgment, ${w.hcap} h old: window ${w.badge === 'green' ? 'open' : w.badge === 'amber' ? 'closing' : 'closed (consolidated)'}` }));
  const rc = raceClock(g, me);
  const race = rc.deepest != null && rc.csHours != null ? { sec: rc.deepest, first: rc.first, text: `obj ${rc.hoursToObj} h · CS ${rc.csHours} h` } : null;
  const o = objectiveStatus(g);
  return { layers: S.drawLayers || S.layers, units, tracks, marks: pic.marks, works: works(g, me, null), lanes, cover, outGuns, barrage, routes, lodg, race,
    obj: { row: o.row, name: o.name, held: o.held }, hint: extra.hint || [], focus: extra.focus || [] };
}
const popcountAll = m => (m ? Array.from(m, popcount) : null);

/** The planning view: your plan on the map. */
export function planView(g, me, plan, extra = {}) {
  const G = gridFor(g.scale), sel = new Set(S.sel), place = plan.place || {};
  const units = g.units.filter(u => u.side === me && !(me === 'att' && isBattery(u))).map(u => ({ ...u, sec: place[u.id] ?? u.sec }))
    .filter(u => u.sec >= 0).map(u => ownChip(g, u, sel, 'all', false));
  const lanes = me === 'def' || plan.lanes ? Object.entries(plan.lanes || {}).map(([id, d]) => {
    const s = place[id]; return s == null ? null : { from: s, cells: laneCells(G, g.sectors.elev, s, d), enf: enfOf(d), sel: sel.has(id) };
  }).filter(Boolean) : [];
  const marks = [], paths = [], barrage = { now: [], next: [], sos: [], missions: [] };
  for (const [, secs] of Object.entries(plan.sos || {})) for (const s of secs) barrage.sos.push(s);
  for (const s of plan.csTargets || []) marks.push({ sec: s, text: 'CS', cls: 'cs' });
  for (const s of Object.values(plan.drones || {})) marks.push({ sec: s, text: 'drone', cls: 'drone' });
  for (const s of Object.values(plan.ew || {})) marks.push({ sec: s, text: 'EW', cls: 'ew' });
  for (const s of plan.prepTargets || []) marks.push({ sec: s, text: 'prep', cls: 'prep' });
  for (const [, s] of Object.entries(plan.engineers || {})) marks.push({ sec: s, text: 'breach', cls: 'breach' });
  if (me === 'att') {
    for (const o of plan.orders || []) { const s = place[o.unit]; if (s != null && o.to != null) paths.push({ path: [s, o.to], cls: o.unit2 ? 'pair' : '' }); }
    for (const [id, r] of Object.entries(plan.routes || {})) if (r.length && place[id] != null) paths.push({ path: [place[id], ...r], cls: 'infil' });
    const b = plan.barrage;
    if (b && b.cols) { for (const c of b.cols) { barrage.now.push(G.idx(b.r0, c)); const r1 = b.r0 + Math.floor(b.rate); if (r1 !== b.r0) barrage.next.push(G.idx(r1, c)); } }
  }
  const Sc = SCALES[g.scale], fix = me === 'att' ? Object.entries(plan.fix || {}).filter(([, v]) => v === 'fix').map(([c]) => +c) : [];
  return {
    layers: S.drawLayers || S.layers, units, tracks: me === 'att' ? [] : [], marks: [], works: works(g, me, me === 'def' ? plan : null), lanes,
    cover: me === 'def' ? previewCover(g, 'def', place, plan.lanes || {}) : null, outGuns: null, barrage, routes: [], lodg: [], race: null,
    obj: { row: Sc.obj.row, name: Sc.obj.name, held: [] }, plan: { mainCols: plan.mainCols, fixCols: fix, marks, paths },
    hint: extra.hint || [], focus: extra.focus || [],
  };
}

/** The review view of hour h: what you saw (your sightings then) or what was true (the snapshot). */
export function reviewView(g, me, h, mode) {
  const s = g.snaps[h];
  if (!s) return null;
  const units = [], tracks = [];
  g.units.forEach((u, i) => {
    const sec = s.sec[i], broken = s.flags[i] & 1;
    if (sec < 0 || broken || (isBattery(u) && u.side !== me)) return;
    const hp = u.str0 > 0 ? Math.max(0, s.str[i]) / u.str0 : null;
    if (u.side === me) units.push({ id: u.id, sec, letter: letterOf(u), hp, mark: '', bat: isBattery(u) || TYPES[u.type].cat === 'team', title: u.name });
    else if (mode === 'truth' && isCompany(u)) tracks.push({ sec, letter: letterOf(u), hp, exact: true, truth: true, title: `${u.name}: ${Math.round((hp ?? 1) * 100)}%${s.flags[i] & 16 ? ' (infiltrating unseen)' : ''}` });
  });
  let marks = [];
  if (mode !== 'truth') {
    const pic = picture(g, me, 'fog', h);
    for (const t of pic.tracks) tracks.push({ sec: t.sec, letter: TYPES[t.type] ? TYPES[t.type].letter : '?', hp: t.exact ? t.hp : null, exact: t.exact, age: t.age, title: `Seen at ${hhmm(h)}` });
    marks = pic.marks;
  }
  const G = gridFor(g.scale), o = SCALES[g.scale].obj;
  const held = Array.from({ length: G.cols }, (_, c) => { const sec = G.idx(o.row, c); return s.ctrl[sec] === 2; });
  return { layers: S.drawLayers || S.layers, units, tracks, marks, works: works(g, me, null), lanes: [], cover: null, outGuns: null, barrage: null, routes: [],
    lodg: s.lodg.map(sec => ({ sec, badge: 'grey', title: 'Lodgment' })), race: null, obj: { row: o.row, name: o.name, held }, hint: [], focus: [] };
}
