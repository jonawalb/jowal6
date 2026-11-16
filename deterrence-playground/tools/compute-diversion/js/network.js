// The diversion network: risk on each route, how it splits demand, what gets through, and how it adapts.
// No DOM. All parameters are notional (data/params.js).
import { P } from '../data/params.js';

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const HUB_IDS = P.hubs.map(h => h.id);

/** How far a host government cooperates with checks and pressure, from allied goodwill. */
export const coop = s => clamp(s.goodwill / 80, 0.3, 1.1);
export const inForce = (s, k) => s.pol[k] != null && s.turn >= s.pol[k] + (k === 'kyc' ? P.kycLag : P.lvLag);
export const liveShells = (s, h) => s.shells.filter(x => x.hub === h && !x.listed);

/** Interdiction risk on each route this quarter (share of attempted volume seized). */
export function risks(s) {
  const c = coop(s), pg = P.agentP * s.pol.agents, out = {};
  for (const h of HUB_IDS) {
    const hb = s.hubs[h];
    const pe = Math.min(P.eucMax, P.eucP * hb.euc * c), pp = P.hubP * hb.lvl * c;
    out[h] = (1 - (1 - pe) * (1 - pp) * (1 - pg)) * (1 - P.splitCut * s.split);
  }
  const kyc = inForce(s, 'kyc') ? P.kycCut * (1 - s.offshore) : 0;
  out.cloud = 1 - (1 - pg * 0.5) * (1 - kyc);
  return out;
}

/** Effective capacity of each route: a hub needs live shells to run, and relaxations add cover. */
export function capacities(s) {
  const out = {};
  for (const h of HUB_IDS) {
    const hb = s.hubs[h];
    const shellF = Math.min(1, liveShells(s, h).length / P.shellsPerHub);
    out[h] = hb.cap * shellF * (1 + P.relaxCap * s.relaxNow) * (1 - P.splitDrag * s.split);
  }
  out.cloud = s.cloud;
  return out;
}

/** Split demand across routes (logit on risk, capped by capacity) and compute deliveries. dice = null gives expectations. */
export function flows(s, dice) {
  const R = risks(s), C = capacities(s);
  const demand = P.demand0 + P.demandGrowth * s.turn;
  const deter = Math.min(P.deterMax, P.deterAgent * s.pol.agents + P.deterCase * s.pol.cases);
  const attempt = demand * (1 - deter);
  const routes = [...HUB_IDS, 'cloud'];
  const w = Object.fromEntries(routes.map(r => [r, C[r] * Math.exp(-P.beta * R[r])]));
  const W = routes.reduce((a, r) => a + w[r], 0) || 1;
  const lv = inForce(s, 'lv') ? P.lvCut * (1 - s.spoof) : 0;
  const f = {};
  let tried = 0, seized = 0, blocked = 0, delivered = 0, phys = 0;
  for (const r of routes) {
    const a = Math.min(C[r], attempt * w[r] / W);
    const jitter = dice ? clamp(1 + P.noise * dice.normal(), 0.7, 1.3) : 1;
    const sz = a * R[r] * (r === 'cloud' ? 1 : jitter);
    const left = a - sz;
    const bl = r === 'cloud' ? 0 : left * lv;
    const del = left - bl;
    f[r] = { attempt: a, seized: sz, blocked: bl, delivered: del, risk: R[r], cap: C[r] };
    tried += a; seized += sz; blocked += bl; delivered += del;
    if (r !== 'cloud') phys += del;
  }
  return { demand, deter, attempt, f, tried, seized, blocked, delivered, phys, unmet: Math.max(0, demand - tried) };
}

/** Hidden shells get identified: end-use checks, agents and heavy use all raise the odds. Mutates s. */
export function detect(s, fl, dice, log) {
  const c = coop(s);
  for (const x of s.shells) {
    if (x.seen || x.listed) continue;
    const per = fl.f[x.hub].attempt / Math.max(1, liveShells(s, x.hub).length);
    const p = clamp(P.detBase + P.detEuc * s.hubs[x.hub].euc * c + P.detAgent * s.pol.agents + P.detFlow * Math.min(1, per / 25), 0, 0.95);
    if (dice ? dice.u() < p : p >= 0.5) { x.seen = true; log.push({ kind: 'detect', hub: x.hub, id: x.id }); }
  }
}

function addShell(s, hub, log, why) {
  const id = 's' + s.nextShell++;
  s.shells.push({ id, hub, seen: false, listed: false, born: s.turn });
  if (s.hubs[hub].cap <= 0) s.hubs[hub].cap = 10;
  log.push({ kind: 'spawn', hub, id, why });
}

/** The network's move after the quarter: replace listed shells, shift away from hot hubs, split shipments, rent cloud. */
export function adapt(s, fl, dice, log) {
  const tags = new Set();
  // 1. Replace lost shells (deterred by standing enforcement)
  const sp = clamp(P.spawnP - P.spawnAgent * s.pol.agents, 0.2, 0.95);
  // Hubs ranked by how safe they look to the network: current risk plus a memory of shells lost there
  const burned = h => s.shells.filter(x => x.hub === h && x.listed).length;
  const order = [...HUB_IDS].sort((a, b) => (fl.f[a].risk + 0.03 * burned(a)) - (fl.f[b].risk + 0.03 * burned(b)));
  for (const h of HUB_IDS) {
    if (s.hubs[h].cap <= 0) continue;
    const need = P.shellsPerHub - liveShells(s, h).length;
    for (let i = 0; i < need; i++) {
      if (dice.u() >= sp) continue;
      const where = dice.u() < P.spawnElsewhere ? order[0] : h;
      addShell(s, where, log, 'replace'); tags.add('shell');
    }
  }
  if (dice.u() < P.extraShellP) { addShell(s, order[0], log, 'extra'); tags.add('shell'); }

  // 2. Shift volume off hubs that got too hot, toward the coolest hub (waking a dormant one if it is coolest)
  for (const h of HUB_IDS) {
    const hb = s.hubs[h];
    if (hb.cap <= 0 || fl.f[h].risk < P.shiftAt) continue;
    const cool = order.filter(o => o !== h && fl.f[o].risk < P.shiftAt * 0.7);
    const to = cool.length ? cool[Math.floor(dice.u() * cool.length)] : order.find(o => o !== h);
    const moved = hb.cap * (1 - P.shiftKeep);
    hb.cap *= P.shiftKeep;
    const wake = s.hubs[to].cap <= 0;
    s.hubs[to].cap = Math.max(0, s.hubs[to].cap) + moved * P.shiftMove;
    if (wake || liveShells(s, to).length === 0) addShell(s, to, log, 'new-hub');
    log.push({ kind: 'shift', from: h, to, amount: moved }); tags.add('transship');
  }

  // 3. Split shipments when end-use checks bite; relax when they stop
  const checks = HUB_IDS.reduce((a, h) => a + s.hubs[h].euc, 0) * coop(s);
  if (checks >= 1.5 && s.split < P.splitMax) { s.split++; log.push({ kind: 'split', level: s.split }); tags.add('split'); }
  else if (checks === 0 && s.split > 0 && s.quietChecks >= 1) { s.split--; log.push({ kind: 'unsplit', level: s.split }); }
  s.quietChecks = checks === 0 ? s.quietChecks + 1 : 0;

  // 4. Rent more cloud compute when physical routes get harder
  const physRisk = HUB_IDS.reduce((a, h) => a + fl.f[h].attempt * fl.f[h].risk, 0) / Math.max(1, fl.tried - fl.f.cloud.attempt);
  const drop = s.lastPhys > 0 ? 1 - fl.phys / s.lastPhys : 0;
  if ((drop > P.cloudTrigger || physRisk > 0.25) && s.cloud < P.cloudMax) {
    const step = inForce(s, 'kyc') ? P.cloudStepKyc : P.cloudStep;
    s.cloud = Math.min(P.cloudMax, s.cloud + step);
    log.push({ kind: 'cloud', cap: s.cloud }); tags.add('cloud');
  }
  // 5. Offshore cloud and spoofing erode the rules once they bite
  if (inForce(s, 'kyc') && s.offshore < P.offshoreMax) { s.offshore = Math.min(P.offshoreMax, s.offshore + P.offshoreStep); tags.add('offshore'); }
  if (inForce(s, 'lv') && s.spoof < P.spoofMax) { s.spoof = Math.min(P.spoofMax, s.spoof + P.spoofStep); tags.add('spoof'); }
  return [...tags];
}

/** A prosecution lands: it exposes every hidden shell at the busiest hub and cuts that hub's capacity. */
export function prosecute(s, fl, dice, log) {
  if (s.pol.agents < 1 || s.agentsSince == null || s.turn - s.agentsSince < 2) return false;
  if (dice.u() >= P.caseP * s.pol.agents) return false;
  const h = [...HUB_IDS].filter(x => s.hubs[x].cap > 0).sort((a, b) => fl.f[b].delivered - fl.f[a].delivered)[0];
  if (!h) return false;
  let n = 0;
  for (const x of s.shells) if (x.hub === h && !x.seen && !x.listed) { x.seen = true; n++; }
  s.hubs[h].cap *= P.caseHit;
  s.pol.cases++;
  log.push({ kind: 'case', hub: h, exposed: n });
  return true;
}
