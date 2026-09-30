// Scripted commanders. Each is a factory returning policy(g, side) -> { orders: [[unit, sector]], stances }.
// They read their own side's picture (fog) unless built with mode 'truth', so they can be fooled:
// the Red commander sends its second echelon where your line looks weakest and follows units that
// give ground; the Blue commander commits its reserve to the road that looks strongest and
// counterattacks enemy units that look weak. Decisions are logged as events for the review.
import { AI, FORCES } from '../data/params.js';
import { NODES, NORTH, FORWARD, MAIN, REAR, OBJ, colOf } from '../data/map.js';
import { makeRng, STREAM } from './rng.js';
import { neighbours, travelHours, hops } from './graph.js';
import { picture, eff, unit, truthFor } from './engine.js';

const alive = (g, ids) => ids.map(id => unit(g, id)).filter(u => u && !u.broken && u.node !== 'gone');
const pending = (g, id) => g.orders.some(o => o.unit === id && !o.done && !o.cancelled);
const busy = (g, u) => !!u.seg || u.route.length > 0 || pending(g, u.id);
const strOf = us => us.reduce((s, u) => s + u.str, 0);
/** Is `side` in contact at sector n (does the other side have effective units there)? */
const contact = (g, side, n) => !!n && eff(g, side === 'blue' ? 'red' : 'blue', n).length > 0;
const decide = (g, side, what, extra) => g.events.push({ t: g.t, kind: 'decision', side, what, ...extra });

/**
 * Artillery target: the sector with the most enemy strength on this side's picture, within `reach`
 * sectors of our own units. With spotting, a sector next to one of our recon troops whose contacts are
 * not yet confirmed counts 1.5 times (fire there shows exactly what is in it, and exposes decoys).
 * Never a sector our own recon is in unless the target is big (danger close). blind: no spotting.
 */
export function pickTarget(g, side, pic, { blind = false, reach = 2, confirm = 1.5 } = {}) {
  const mine = g.units.filter(u => u.side === side && !u.broken && u.str > 0 && NODES.some(n => n.id === u.node));
  const recon = mine.filter(u => u.type === 'recon');
  let best = null, bestV = 0;
  for (const n of NODES) {
    const v0 = pic.node[n.id];
    if (!(v0 > 0) || !mine.some(u => hops(u.node, n.id) <= reach)) continue;
    if (recon.some(u => u.node === n.id) && v0 < 20) continue;
    const unsure = pic.tracks.some(tr => tr.node === n.id && !tr.exact) || (pic.marks || []).some(m => m.node === n.id);
    const v = v0 * (!blind && unsure && recon.some(u => hops(u.node, n.id) === 1) ? confirm : 1);
    if (v > bestV) { bestV = v; best = n.id; }
  }
  return best;
}

// ---------------------------------------------------------------- Red

/**
 * Red's plan from the scenario seed. kind 'random': any roads; 'smart': main effort on an outer road,
 * feint on a center road (where Blue's recon start); 'mixed' (the game's commander): either, half and half.
 */
export function makePlan(seed, kind = 'random') {
  const r = makeRng(seed, STREAM.plan);
  if (kind === 'mixed') kind = r.u() < 0.5 ? 'smart' : 'random';
  if (kind === 'smart') {
    const main = r.u() < 0.5 ? 0 : 3, feint = r.u() < 0.5 ? 1 : 2;
    const probe = [0, 1, 2, 3].filter(c => c !== main && c !== feint)[r.u() < 0.5 ? 0 : 1];
    return { main, feint, probe };
  }
  const main = Math.floor(r.u() * 4);
  const rest = [0, 1, 2, 3].filter(c => c !== main);
  const feint = rest.splice(Math.floor(r.u() * 3), 1)[0];
  const probe = rest[Math.floor(r.u() * 2)];
  return { main, feint, probe };
}

const G = k => FORCES.red.filter(d => d.group === k).map(d => d.id);
const SECOND = G('second'), MAINE = G('main'), FEINT = G('feint'), DECOY = G('decoy'), PROBE = G('probe'), SPOT = G('spot');

/**
 * Red commander. variant: 'feint' (main effort, a feint with the decoy, a probe, and a second echelon
 * sent to the road that looks weakest), 'mass' (everything on one road, no feint) or 'broad' (every
 * unit straight down its own road at once). plan: 'random' | 'smart' | a plan object.
 */
export function redAI({ mode = 'fog', variant = 'feint', plan = 'mixed', arty = 'spot' } = {}) {
  const R = AI.red;
  let P = null, groups = null;
  const st = { feintDone: false };
  return (g, side, phase) => {
    if (phase === 'fire') return arty === 'none' ? null : pickTarget(g, side, picture(g, side, mode), { blind: arty === 'blind', confirm: 1 });
    const out = { orders: [], stances: [] };
    if (!P) {
      P = typeof plan === 'object' ? plan : makePlan(g.seed, plan);
      g.plan = { ...P, variant };
      groups = setup(P, variant, out);
    }
    const pic = picture(g, side, mode);
    if (g.t === R.secondDecide && variant !== 'broad') second(g, pic, out);
    for (const grp of groups) {
      if (grp.role === 'spot') spot(g, grp, out);
      else if (grp.role === 'probe') probe(g, grp, pic, out);
      else if (grp.role === 'feint') feint(g, grp, pic, out, st);
      else if (grp.role === 'decoy') decoy(g, grp, out);
      else push(g, grp, pic, out, mode);
    }
    return out;
  };

  function setup(P, variant, out) {
    const ent = (ids, c) => ids.forEach(id => out.orders.push([id, NORTH[c]]));
    if (variant === 'broad') {
      // Spread across all four roads, every unit straight down its own road.
      const real = FORCES.red.filter(d => d.type !== 'arty').map(d => d.id).filter(id => !DECOY.includes(id));
      real.forEach((id, i) => ent([id], i % 4));
      ent(DECOY, 0);
      return real.map(id => ({ role: 'main', ids: [id], startAt: 0, broad: true })).concat([{ role: 'decoy', ids: [...DECOY], col: 0 }]);
    }
    ent(PROBE, P.probe);
    ent(SPOT, P.main);
    const spotter = { role: 'spot', ids: [...SPOT], follow: null };
    if (variant === 'mass') {
      ent([...FEINT, ...MAINE, ...DECOY, ...SECOND], P.main);
      const main = { role: 'main', ids: [...FEINT, ...MAINE], startAt: R.assembleUntil };
      spotter.follow = main.ids;
      return [spotter, { role: 'probe', ids: [...PROBE], col: P.probe }, main,
        { role: 'decoy', ids: [...DECOY], col: P.main }, { role: 'main', ids: [...SECOND], startAt: 0 }];
    }
    ent([...FEINT, ...DECOY], P.feint);
    ent([...MAINE, ...SECOND], P.main);   // the second echelon's road is decided at AI.red.secondDecide
    const main = { role: 'main', ids: [...MAINE], startAt: R.assembleUntil };
    spotter.follow = main.ids;
    return [spotter, { role: 'probe', ids: [...PROBE], col: P.probe }, { role: 'feint', ids: [...FEINT], col: P.feint },
      { role: 'decoy', ids: [...DECOY], col: P.feint }, main, { role: 'main', ids: [...SECOND], startAt: 0 }];
  }

  /** Second echelon: "reinforce success" by Red's own picture, which is where it can be baited. */
  function second(g, pic, out) {
    const score = [0, 1, 2, 3].map(c => {
      const mine = g.units.filter(u => u.side === 'red' && !u.broken && u.node && u.node !== 'off' && u.node !== 'gone' && u.type !== 'decoy' && colOf(u.node) === c).reduce((s, u) => s + u.str, 0);
      const seen = pic.node[FORWARD[c]] + pic.node[MAIN[c]];
      return (mine + 10) / (seen + 4);
    });
    const c = variant === 'mass' ? P.main : score.indexOf(Math.max(...score));
    for (const u of alive(g, SECOND)) out.orders.push([u.id, NORTH[c]]);
    const tru = truthFor(g, 'red');
    decide(g, 'red', 'second', { col: c, believed: Math.round(pic.node[FORWARD[c]] + pic.node[MAIN[c]]), truth: Math.round(tru.node[FORWARD[c]] + tru.node[MAIN[c]]), units: SECOND });
  }

  /** Spotting recon: stays with the main effort (next to what it attacks) and gives ground if hit. */
  function spot(g, grp, out) {
    const [u] = alive(g, grp.ids);
    if (!u || u.node === 'off' || busy(g, u)) return;
    const lead = alive(g, grp.follow).find(x => x.node && x.node !== 'off' && !x.seg);
    if (!lead) return;
    const n = contact(g, 'red', lead.node) ? lead.from : lead.node;
    if (n && n !== 'edge' && n !== u.node && !contact(g, 'red', n) && !eff(g, 'blue', n).length) out.orders.push([u.id, n]);
  }

  function probe(g, grp, pic, out) {
    const [u] = alive(g, grp.ids);
    if (!u || u.node === 'off' || busy(g, u)) return;
    const f = FORWARD[grp.col];
    if (u.node === NORTH[grp.col] && pic.node[f] === 0) out.orders.push([u.id, f]);
  }

  function decoy(g, grp, out) {
    const [u] = alive(g, grp.ids);
    if (!u || u.node === 'off' || busy(g, u)) return;
    const f = FORWARD[grp.col];
    if (u.node === NORTH[grp.col] && !contact(g, 'red', f) && !eff(g, 'blue', f).length) out.orders.push([u.id, f]);
  }

  // The feint seeks contact but avoids decisive engagement (FM 3-90 para. 5-160): it shows itself in
  // the forward zone next to Blue's line with the decoy, hits anything weak, and pulls back after
  // losing a quarter of its strength.
  function feint(g, grp, pic, out, st) {
    const [u] = alive(g, grp.ids);
    if (!u || u.node === 'off' || busy(g, u)) return;
    if (g.t >= R.feintUntil && !contact(g, 'red', u.node)) {
      // Job done: join the main effort so it attacks with them.
      const main = groups.find(x => x.role === 'main');
      if (main && alive(g, main.ids).length) { main.ids.push(...grp.ids); grp.role = 'done'; return; }
    }
    const f = FORWARD[grp.col], m = MAIN[grp.col];
    if (contact(g, 'red', u.node)) {
      if (u.str < R.feintBreak * u.str0) { out.orders.push([u.id, NORTH[grp.col]]); st.feintDone = true; }
      return;
    }
    if (u.node === NORTH[grp.col] && !st.feintDone) { out.orders.push([u.id, f]); return; }
    if (u.node === f && !st.feintDone && g.t >= R.assembleUntil && pic.node[m] > 0 && u.str >= R.attackRatio * pic.node[m]) out.orders.push([u.id, m]);
  }

  /** Main effort and second echelon: advance on the crossing where Red's odds look good. */
  function push(g, grp, pic, out, mode) {
    const us = alive(g, grp.ids);
    if (!us.length || us.some(u => u.node === 'off') || g.t < (grp.startAt ?? 0)) return;
    if (us.some(u => busy(g, u))) return;
    const nodes = [...new Set(us.map(u => u.node))];
    if (nodes.length > 1) {
      const lead = nodes.reduce((a, b) => (travelHours(b, OBJ) < travelHours(a, OBJ) ? b : a));
      for (const u of us) if (u.node !== lead) out.orders.push([u.id, lead]);
      return;
    }
    const N = nodes[0];
    if (N === OBJ || contact(g, 'red', N)) return;
    const mine = strOf(us), d0 = travelHours(N, OBJ);
    const late = g.t >= R.lateHour;
    const chased = g.events.find(e => e.kind === 'give' && e.side === 'blue' && e.from === N && e.t >= g.t - 1);
    const redAt = m => eff(g, 'red', m).reduce((s, u) => s + u.str, 0);
    const bar = m => (grp.broad ? 1 : chased && chased.to === m ? R.chaseRatio : late ? R.lateRatio : R.attackRatio);
    const ok = m => {
      const seen = pic.node[m];
      if (seen <= 0) return true;
      if (contact(g, 'blue', m) && eff(g, 'blue', m).length) return (mine + redAt(m)) / seen >= R.lateRatio;  // join a fight
      return mine / seen >= bar(m);
    };
    if (neighbours(N).includes(OBJ) && !grp.broad) { assault(g, pic, out); return; }
    const cand = neighbours(N).filter(m => !NORTH.includes(m) && travelHours(m, OBJ) <= d0);
    const fwd = cand.filter(m => travelHours(m, OBJ) < d0).sort((a, b) => pic.node[a] - pic.node[b] || travelHours(a, OBJ) - travelHours(b, OBJ));
    const own = fwd.find(m => colOf(m) === colOf(N)) || fwd[0];
    let go = grp.broad ? (own && ok(own) ? own : null) : fwd.find(ok);
    if (!go && !grp.broad) {
      // Look sideways for a weaker spot (a flank).
      const best = fwd.length ? pic.node[fwd[0]] : Infinity;
      go = cand.filter(m => travelHours(m, OBJ) === d0 && pic.node[m] < best && ok(m)).sort((a, b) => pic.node[a] - pic.node[b])[0];
    }
    if (go) {
      for (const u of us) out.orders.push([u.id, go]);
      if (chased && chased.to === go) decide(g, 'red', 'chase', { node: go, from: N, units: us.map(u => u.id), believed: Math.round(pic.node[go]) });
    }
  }

  /** Assault on the crossing: every idle Red force next to it goes in together, from as many sides as possible. */
  function assault(g, pic, out) {
    const ready = [];
    for (const n of neighbours(OBJ)) {
      if (contact(g, 'red', n)) continue;
      const us = eff(g, 'red', n).filter(u => u.type !== 'recon' && u.type !== 'weapons' && !busy(g, u));
      if (us.length) ready.push([n, us]);
    }
    const tot = ready.reduce((s, [, us]) => s + strOf(us), 0);
    const seen = pic.node[OBJ];
    const flank = ready.length >= 2;
    const need = seen <= 0 ? 0 : (flank ? R.lateRatio : g.t >= R.lateHour ? R.lateRatio : R.attackRatio) * seen;
    if (tot >= need) for (const [, us] of ready) for (const u of us) if (!out.orders.some(o => o[0] === u.id)) out.orders.push([u.id, OBJ]);
  }
}

// ---------------------------------------------------------------- Blue

const LINE = { b1: 'm0', b2: 'm1', b3: 'm2', b4: 'm3' };
const RESERVE = ['b5', 'b6'];

/**
 * Blue commander. commit: send the reserve to the road that looks strongest (and back to the crossing
 * if Red gets onto the main line elsewhere); counter: attack enemy units next door that look weak;
 * react: commit to the first road where anything is seen; give: set the main line to give ground.
 */
export function blueAI({ mode = 'fog', commit = true, counter = true, react = false, give = false, arty = 'spot', shift = false, bait = false } = {}) {
  const B = AI.blue;
  const st = { commits: 0, col: null, counters: {}, guarded: false, home: { ...LINE } };
  return (g, side, phase) => {
    if (phase === 'fire') {
      if (arty === 'none') return null;
      const pic = picture(g, side, mode);
      // Confirm before committing: fire on the biggest unconfirmed contact a recon troop can watch.
      if (arty === 'spot' && !g.rules.blind[side] && st.commits <= B.recommits) {
        const top = pic.near.indexOf(Math.max(...pic.near));
        const n = pic.near[top] >= B.commitMin && top !== st.col ? confirmTarget(g, side, pic, top) : null;
        if (n) return n;
      }
      return pickTarget(g, side, pic, { blind: arty === 'blind' });
    }
    const out = { orders: [], stances: [] };
    if (g.t === 0 && give) for (const id of Object.keys(LINE)) out.stances.push([id, 'give']);
    if (g.t === 0 && bait) {
      // Bait: empty Brook Hill so the Center-west road looks open, and wait one sector behind it at
      // Wren Cross with the 2nd Mech and the whole reserve, in a prepared position.
      out.orders.push(['b2', 's1'], ['b6', 's1']);
      st.commits = 99; st.col = 1; st.home.b2 = 's1';
      decide(g, 'blue', 'bait', { node: 'm1', behind: 's1', units: ['b2', 'b5', 'b6'] });
    }
    const pic = picture(g, side, mode);
    const res = alive(g, RESERVE);
    const resFree = res.length && !res.some(u => contact(g, 'blue', u.node));
    if (resFree && (commit || react)) {
      const col = pic.near;
      let c = null;
      if (react) { const hit = pic.tracks.find(tr => colOf(tr.node) !== null); if (hit && st.commits === 0) c = colOf(hit.node); }
      else if (st.commits <= B.recommits) {
        const top = col.indexOf(Math.max(...col));
        const second = Math.max(...col.filter((_, i) => i !== top));
        const lead = st.col === null ? second : col[st.col];
        if (top !== st.col && col[top] >= B.commitMin && col[top] - lead >= B.commitMargin) c = top;
      }
      if (c !== null) {
        st.commits += 1; st.col = c;
        for (const u of res) out.orders.push([u.id, MAIN[c]]);
        // Thin a quiet column next door: its line battalion joins the threatened one.
        if (shift && !react && st.commits === 1) {
          const quiet = [c - 1, c + 1].filter(k => k >= 0 && k < 4 && col[k] === 0).sort((a, b) => col[a] - col[b])[0];
          const mover = quiet !== undefined && Object.keys(LINE).find(id => LINE[id] === MAIN[quiet]);
          const mu = mover && unit(g, mover);
          if (mu && !mu.broken && mu.node === MAIN[quiet] && !contact(g, 'blue', mu.node)) { out.orders.push([mover, MAIN[c]]); st.shifted = mover; }
        }
        const tru = truthFor(g, 'blue');
        decide(g, 'blue', st.commits > 1 ? 'recommit' : 'reserve', { col: c, believed: Math.round(col[c]), truth: Math.round(tru.col[c]), units: RESERVE });
      } else if (commit && st.col !== null && !st.guarded) {
        // Red on the main line where the reserve is not: fall back to guard the crossing.
        const breach = [...MAIN, ...REAR].find(m => m !== MAIN[st.col] && !eff(g, 'blue', m).length && pic.tracks.some(tr => tr.node === m && tr.est > 0));
        if (breach && res.some(u => u.node !== OBJ)) {
          st.guarded = true;
          for (const u of res) out.orders.push([u.id, OBJ]);
          decide(g, 'blue', 'guard', { node: breach, units: RESERVE });
        }
      }
    }
    if (counter) {
      for (const [id, home] of Object.entries(st.home)) {
        const u = unit(g, id);
        if (!u || u.broken || u.node === 'gone' || busy(g, u)) continue;
        if (st.counters[id] && u.node !== home) {
          if (!contact(g, 'blue', u.node)) { out.orders.push([id, home]); delete st.counters[id]; }
          continue;
        }
        if (u.node !== home || contact(g, 'blue', home)) continue;
        const near = neighbours(home).filter(m => m !== OBJ);
        const threat = m => pic.tracks.filter(tr => tr.node === m).reduce((s, tr) => s + tr.est, 0);
        const marks = m => pic.marks.some(k => k.node === m);
        const target = near.find(m => {
          const s = threat(m);
          if (!(s > 0) || u.str < B.counterRatio * s || eff(g, 'blue', m).length) return false;
          return near.filter(n => n !== m).every(n => threat(n) === 0 && !marks(n));
        });
        if (target) {
          st.counters[id] = { home, target };
          out.orders.push([id, target]);
          const tru = truthFor(g, 'blue');
          decide(g, 'blue', 'counter', { unit: id, node: target, from: home, believed: Math.round(threat(target)), truth: Math.round(tru.node[target]) });
        }
      }
    }
    return out;
  };
}

/** The sector on road c holding the biggest unconfirmed contact that a recon troop could spot, or null. */
function confirmTarget(g, side, pic, c) {
  const recon = g.units.filter(u => u.side === side && u.type === 'recon' && !u.broken && u.str > 0 && u.node && NODES.some(n => n.id === u.node));
  let best = null, bv = 0;
  for (const n of [NORTH[c], FORWARD[c], MAIN[c], REAR[c]]) {
    const v = pic.tracks.filter(tr => tr.node === n && !tr.exact).reduce((s, tr) => s + tr.est, 0);
    if (v > bv && recon.some(u => hops(u.node, n) === 1)) { bv = v; best = n; }
  }
  return best;
}

/** Static commander: never moves anything. */
export const holdFast = () => (g, side, phase) => (phase === 'fire' ? null : {});
