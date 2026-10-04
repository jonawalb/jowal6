// Kharg Island game engine: one seeded game, turn by turn, with every die roll logged.
import { SECTORS, CRT, CRT_COLS, RESULTS, TURN_HOURS, ESC_EVENTS, MAJOR_INDEX } from '../data/params.js';

/** Mulberry32: a small seeded generator so every game and every Monte Carlo batch can be replayed. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r2 = v => Math.round(v * 100) / 100;
const cap = (v, hi = 0.95) => Math.max(0, Math.min(hi, v));
const pl = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

function rollMany(R, n, p) {
  const rolls = [];
  let hits = 0;
  for (let i = 0; i < n; i++) { const x = R(); rolls.push(x); if (x < p) hits++; }
  return { hits, rolls };
}

export const crtColumn = ratio => CRT_COLS.findIndex(c => ratio < c.max);

/**
 * Play one game.
 * cfg: { us: {obj, meu, abn, cvw, ddg, mcm, helo, sof, bases, sector, strikes},
 *        ir: {ascm, drones, fac, garrison, reinf, srbm, mines, escal}, turns }
 * P: parameter table (PROB_DEF with user edits). log=false skips the text log for Monte Carlo speed.
 */
export function playGame(cfg, P, seed, log = true) {
  const R = rng(seed);
  const { us, ir } = cfg;
  const obj = us.obj, land = obj !== 'blockade';
  const sec = SECTORS[us.sector];
  const landT = us.strikes + 1;
  const wings = us.cvw + (us.bases ? P.baseSorties : 0);
  const S = {
    asc: Array.from({ length: ir.ascm }, () => 2), drones: ir.drones, fac: ir.fac, srbm: ir.srbm,
    amph: us.meu * 3, ddg: us.ddg, groups: us.meu * 3,
    garrison: ir.garrison, ashore: 0, peak: 0, progress: 0, airstrip: 'ir',
    mineEff: ir.mines ? 1 : 0, esc: 0, ev: { hormuz: 0, gulf: 0, regional: 0 },
    share: 1, offline: 0, lostMb: 0, price: P.brent, cost: 0,
    shipsHit: 0, usLost: 0, phase: land ? 'pre' : 'blockade', shares: [], withdraw: null,
  };
  const groupPts = P.meuPts / 3;
  const turns = [];
  let outcome = null, endAt = null;

  const row = (T, ph, ev, p, rolls, res, tone = '') => { if (log) T.rows.push({ ph, ev, p, rolls, res, tone }); };

  for (let t = 1; t <= cfg.turns && !endAt; t++) {
    S.lastReinf = null;
    const T = { t, rows: [], crt: null, label: `Hours ${(t - 1) * TURN_HOURS}–${t * TURN_HOURS}` };
    if (land && t === landT) S.phase = 'land';
    else if (land && t > landT && S.phase === 'land') S.phase = 'ashore';
    T.phase = { pre: 'Suppression strikes', land: 'Landing', ashore: S.progress >= sec.steps ? 'Holding' : 'Fight ashore', out: 'Withdrawal', blockade: 'Blockade' }[S.phase];
    strikes(T, t);
    if (S.mineEff > 0 && us.mcm > 0) {
      const b = S.mineEff; S.mineEff = Math.max(0, S.mineEff * (1 - P.mcmRate * us.mcm));
      row(T, 'Mine clearing', `${pl(us.mcm, 'MCM group')} ${us.mcm === 1 ? 'sweeps' : 'sweep'} the approaches`, null, [], `mine threat ${Math.round(b * 100)}% → ${Math.round(S.mineEff * 100)}%`);
    }
    const ashoreNow = S.ashore > 0.05;
    atSea(T, ashoreNow);
    if (S.phase === 'land') landing(T);
    if (land && S.phase !== 'out' && S.ashore > 0.05 && S.garrison > 0.05 && S.progress < sec.steps) combat(T);
    if (land && S.ashore > 0.05) mainlandFires(T);
    reinforce(T, t);
    if (S.phase === 'out') withdraw(T, t);
    else if (obj === 'raid' && S.progress >= 1 && S.phase === 'ashore' && S.ashore > 0.05) S.phase = 'out';
    exportsTurn(T, t);
    escalation(T);
    S.price = P.brent + P.elast * S.offline + (S.ev.hormuz ? P.premHormuz : 0) + (S.ev.gulf ? P.premGulf : 0);
    S.cost = Math.min(100, P.costShip * S.shipsHit + P.costPt * S.usLost + P.costOil * Math.max(0, S.price - P.brent) + (us.bases ? P.costBases * t : 0));
    if (land && (S.phase === 'land' || S.phase === 'ashore') && S.ashore < 0.05 && S.groups === 0) { S.phase = 'done'; endAt = t; }
    T.state = snapshot();
    turns.push(T);
  }

  function strikes(T, t) {
    if (wings <= 0) return;
    const hit = (n, p, what, many) => {
      const pp = cap(1 - Math.pow(1 - p, wings));
      const r = rollMany(R, n, pp);
      if (n) row(T, 'Strikes', `${pl(n, what, many)} targeted`, pp, r.rolls, r.hits ? `${r.hits} destroyed` : 'all survive', r.hits ? 'us' : 'ir');
      return r;
    };
    const alive = S.asc.map((s, i) => i).filter(i => S.asc[i] !== null);
    const a = hit(alive.length, P.pStrikeAscm, 'missile battery', 'missile batteries');
    a.rolls.forEach((x, j) => { if (x < cap(1 - Math.pow(1 - P.pStrikeAscm, wings))) S.asc[alive[j]] = null; });
    S.drones -= hit(S.drones, P.pStrikeDrone, 'drone team').hits;
    S.fac -= hit(S.fac, P.pStrikeFac, 'FAC squadron').hits;
    if (land && t < landT && S.garrison > 0) {
      const b = S.garrison; S.garrison *= Math.max(0, 1 - P.pStrikeIsland * wings);
      row(T, 'Strikes', 'Strikes on military positions on the island', null, [], `garrison ${r2(b)} → ${r2(S.garrison)} pts`, 'us');
    }
  }

  function ships() { return S.amph + S.ddg; }
  function damage(T, hits, why) {
    for (let i = 0; i < hits && ships() > 0; i++) {
      const pa = S.amph / ships(), x = R(), amph = x < pa;
      if (amph) { S.amph--; if (S.phase === 'pre' || S.phase === 'land') S.groups = Math.min(S.groups, S.amph); } else S.ddg--;
      S.shipsHit++;
      row(T, 'Damage', `${why}: which ship is hit?`, pa, [x], amph ? 'an amphibious ship is out of action' : 'a destroyer is out of action', 'ir');
    }
  }

  function atSea(T, ashoreNow) {
    if (ships() === 0 || S.phase === 'done' || S.phase === 'pre') return; // ships stand off out of range during prep strikes
    const expo = land ? sec.expo : 1;
    const shield = Math.pow(1 - P.pIntercept, S.ddg);
    const batteries = S.asc.map((s, i) => i).filter(i => S.asc[i] > 0);
    if (batteries.length) {
      const p = cap(P.pAscm * expo * shield * P.pShipHit);
      batteries.forEach(i => S.asc[i]--);
      const r = rollMany(R, batteries.length, p);
      row(T, 'Missile salvos', `${pl(batteries.length, 'salvo')} vs ${pl(S.ddg, 'escort')}`, p, r.rolls, r.hits ? `${pl(r.hits, 'hit')}` : 'all defeated', r.hits ? 'ir' : 'us');
      damage(T, r.hits, 'Missile hit');
    }
    if (S.drones > 0 && !ashoreNow && ships() > 0) {
      const p = cap(P.pDroneShip * expo * Math.pow(1 - P.pIntercept, S.ddg) * P.pShipHit);
      const r = rollMany(R, S.drones, p);
      row(T, 'Drone waves', `${pl(S.drones, 'drone team')} launch at the ships`, p, r.rolls, r.hits ? `${pl(r.hits, 'hit')}` : 'all defeated', r.hits ? 'ir' : 'us');
      damage(T, r.hits, 'Drone hit');
    }
    if (S.fac > 0 && ships() > 0) {
      const stop = cap(1 - Math.pow(1 - P.pFacStop, us.helo) * Math.pow(1 - P.pFacDdg, S.ddg), 0.99);
      const a = rollMany(R, S.fac, stop);
      S.fac -= a.hits;
      row(T, 'FAC swarms', `${pl(a.rolls.length, 'squadron')} attack; helicopters and escorts respond`, stop, a.rolls, `${a.hits} broken up and lost`, a.hits ? 'us' : 'ir');
      const through = a.rolls.length - a.hits;
      if (through > 0) {
        const h = rollMany(R, through, cap(P.pFacHit * expo));
        row(T, 'FAC swarms', `${pl(through, 'swarm')} ${through === 1 ? 'gets' : 'get'} through`, cap(P.pFacHit * expo), h.rolls, h.hits ? `${pl(h.hits, 'hit')}` : 'no hits', h.hits ? 'ir' : '');
        damage(T, h.hits, 'Swarm hit');
      }
    }
    if (!land && S.mineEff > 0 && ships() > 0) {
      const p = cap(P.pMine * (ir.mines === 1 ? 0.5 : 1) * S.mineEff * P.blockMine);
      const r = rollMany(R, ships(), p);
      row(T, 'Mines', `${pl(ships(), 'ship')} on station in mined water`, p, r.rolls, `${r.hits} mined`, r.hits ? 'ir' : '');
      damage(T, r.hits, 'Mine');
    }
  }

  function landing(T) {
    const pAd = P.pIslandAd;
    if (us.sof) {
      const x = R(), down = x < pAd;
      if (!down) S.ashore += P.sofPts * P.sofEff; else S.usLost += P.sofPts;
      row(T, 'Air lift', 'Special operations force flies in ahead', pAd, [x], down ? 'lift downed' : `+${r2(P.sofPts * P.sofEff)} pts (×${P.sofEff} for skill)`, down ? 'ir' : 'us');
    }
    if (us.abn > 0) {
      const v = rollMany(R, us.abn, pAd);
      const pts = (us.abn - v.hits) * P.abnPts * P.abnEff;
      S.ashore += pts; S.usLost += v.hits * P.abnPts;
      row(T, 'Air lift', `${pl(us.abn, 'airborne battalion')} vs island air defense`, pAd, v.rolls, `${v.hits} downed, +${r2(pts)} pts`, v.hits ? 'ir' : 'us');
    }
    if (S.groups > 0) {
      let n = S.groups;
      if (S.mineEff > 0) {
        const p = cap(P.pMine * (ir.mines === 1 ? 0.5 : 1) * S.mineEff);
        const m = rollMany(R, n, p);
        row(T, 'Mines', `${pl(n, 'landing group')} cross the approaches`, p, m.rolls, `${m.hits} stopped`, m.hits ? 'ir' : '');
        n -= m.hits; S.usLost += m.hits * groupPts; S.shipsHit += m.hits;
      }
      S.ashore += n * groupPts; S.groups = 0;
      row(T, 'Ashore', `${pl(n, 'landing group')} land on the ${sec.t.toLowerCase()}`, null, [], `+${r2(n * groupPts)} pts`, n ? 'us' : 'ir');
    } else if (us.meu > 0) row(T, 'Ashore', 'No amphibious ships left to land Marines', null, [], 'no sea landing', 'ir');
    S.peak = Math.max(S.peak, S.ashore);
  }

  function combat(T) {
    const support = 1 + P.cas * wings;
    const att = S.ashore * support, def = S.garrison * P.defMult;
    const ratio = def > 0 ? att / def : Infinity;
    const col = crtColumn(ratio), roll = 1 + Math.floor(R() * 6);
    const code = CRT[roll - 1][col], res = RESULTS[code];
    const ul = S.ashore * res.us, il = S.garrison * res.ir;
    S.ashore -= ul; S.garrison -= il; S.usLost += ul;
    const from = S.progress;
    S.progress = S.garrison < 0.1 ? sec.steps : Math.min(sec.steps, S.progress + res.adv);
    if (S.garrison < 0.1) S.garrison = 0;
    T.crt = { ratio, col, roll, code };
    row(T, 'Ground', `U.S. ${r2(S.ashore + ul)} × ${r2(support)} air support vs Iran ${r2(S.garrison + il)} × ${P.defMult} terrain`, null, [], `die ${roll}, ${CRT_COLS[col].t}: ${res.t}. U.S. −${r2(ul)}, Iran −${r2(il)}`, res.adv ? 'us' : code === 'EX' ? '' : 'ir');
    if (from < 1 && S.progress >= 1) {
      const x = R(), wreck = x < P.pCrater;
      S.airstrip = wreck ? 'wrecked' : 'us';
      row(T, 'Airstrip', 'The airstrip area falls: is the runway wrecked first?', P.pCrater, [x], wreck ? 'runway wrecked' : 'usable: troops can fly in', wreck ? 'ir' : 'us');
    }
    if (S.progress >= sec.steps && from < sec.steps) row(T, 'Ground', 'Organized resistance on the island ends', null, [], 'island secured', 'us');
  }

  function mainlandFires(T) {
    if (S.airstrip === 'us' && S.phase !== 'out') {
      S.ashore += P.airBonus;
      row(T, 'Air landing', 'Transports use the airstrip', null, [], `+${P.airBonus} pts`, 'us');
    }
    if (S.drones > 0) {
      const d = rollMany(R, S.drones, P.pDroneShore);
      const dmg = Math.min(S.ashore, d.hits * P.droneDmg);
      S.ashore -= dmg; S.usLost += dmg;
      row(T, 'Mainland fire', `${pl(S.drones, 'drone team')} ${S.drones === 1 ? 'strikes' : 'strike'} U.S. troops on the island`, P.pDroneShore, d.rolls, d.hits ? `−${r2(dmg)} pts` : 'no hits', d.hits ? 'ir' : '');
    }
    S.peak = Math.max(S.peak, S.ashore);
  }

  function reinforce(T, t) {
    if (!land || ir.reinf <= 0 || S.phase === 'out' || S.phase === 'done') return;
    const p = cap(P.pReinf * Math.pow(1 - P.interdict, wings + us.helo), 1);
    const x = R(), ok = x < p;
    S.lastReinf = ok;
    if (ok) {
      S.garrison += ir.reinf;
      if (S.progress >= sec.steps) S.progress = sec.steps - 1;
    }
    row(T, 'Reinforcement', `Iran ferries ${ir.reinf} pts from the mainland past interdiction`, p, [x], ok ? `garrison +${ir.reinf}${S.progress === sec.steps - 1 && t > landT ? ', island contested again' : ''}` : 'turned back', ok ? 'ir' : 'us');
  }

  function withdraw(T, t) {
    const p = cap(P.pExtract * (1 + 0.2 * (S.drones + S.fac)));
    const x = R(), bad = x < p;
    const lost = S.ashore * (bad ? P.extractLoss : 0.05);
    S.ashore -= lost; S.usLost += lost;
    S.withdraw = bad ? 'bad' : 'clean';
    row(T, 'Withdrawal', 'The raid force pulls out under fire', p, [x], bad ? `costly: −${r2(lost)} pts` : `clean: −${r2(lost)} pts`, bad ? 'ir' : 'us');
    S.phase = 'done'; endAt = t;
  }

  function exportsTurn(T) {
    let share;
    if (!land) {
      const st = ships();
      const p = cap(1 - Math.pow(1 - P.pStation, st), 0.99);
      const r = rollMany(R, P.tankers, p);
      share = (P.tankers - r.hits) / P.tankers * (1 - P.warRisk);
      row(T, 'Blockade', `${pl(P.tankers, 'tanker attempt')} vs ${pl(st, 'ship')} on station`, p, r.rolls, `${r.hits} turned back; loadings at ${Math.round(share * 100)}%`, r.hits ? 'us' : 'ir');
    } else if (S.phase === 'pre') share = 1 - P.warRisk;
    else if (S.phase === 'done' && obj === 'raid') share = 1 - P.warRisk;
    else share = 0;
    S.share = share; S.shares.push(share);
    S.offline = P.iranExp * P.khargShare * (1 - share);
    S.lostMb += S.offline * TURN_HOURS / 24;
  }

  function escalation(T) {
    const inten = { pre: 1, land: 1.4, ashore: S.progress >= sec.steps ? 1.2 : 1.4, out: 1, done: 0.6, blockade: 1.1 }[S.phase];
    const mult = ir.escal * inten * (1 + S.esc / 100);
    const tryEv = (k, base, extra = 1, once = true) => {
      if (once && S.ev[k]) return;
      const p = cap(base * mult * extra);
      const x = R(), yes = x < p;
      if (yes) { S.ev[k]++; S.esc = Math.min(100, S.esc + ESC_EVENTS[k].add); }
      row(T, 'Escalation', ESC_EVENTS[k].t + '?', p, [x], yes ? `yes: escalation +${ESC_EVENTS[k].add}` : 'no', yes ? 'ir' : '');
    };
    tryEv('hormuz', P.pHormuz);
    tryEv('gulf', P.pGulf, us.bases ? P.basesEsc : 1);
    if (S.srbm > 0) { const before = S.ev.regional; tryEv('regional', P.pRegional, 1, false); if (S.ev.regional > before) S.srbm--; }
  }

  function snapshot() {
    return {
      ascm: S.asc.filter(s => s !== null).length, salvos: S.asc.reduce((a, s) => a + (s || 0), 0),
      drones: S.drones, fac: S.fac, srbm: S.srbm, amph: S.amph, ddg: S.ddg, groups: S.groups,
      garrison: r2(S.garrison), ashore: r2(S.ashore), progress: S.progress, airstrip: S.airstrip, mineEff: S.mineEff,
      esc: S.esc, ev: { ...S.ev }, share: S.share, offline: r2(S.offline), lostMb: r2(S.lostMb), price: r2(S.price),
      cost: Math.round(S.cost), phase: S.phase, withdraw: S.withdraw, lastReinf: S.lastReinf,
    };
  }

  // Outcome
  if (obj === 'blockade') {
    const avg = S.shares.reduce((a, b) => a + b, 0) / Math.max(1, S.shares.length);
    outcome = avg <= 0.25 ? 'win' : avg >= 0.6 ? 'fail' : 'mixed';
  } else if (obj === 'raid') {
    outcome = S.withdraw === 'clean' ? 'win' : S.withdraw === 'bad' ? 'mixed' : 'fail';
  } else {
    const held = S.progress >= sec.steps && S.ashore > 0.3;
    const beaten = S.ashore < 0.3 || (S.progress === 0 && S.ashore / Math.max(0.01, S.garrison * P.defMult) < 0.5);
    outcome = held ? 'win' : beaten ? 'fail' : 'mixed';
  }
  const major = S.ev.gulf > 0 || S.esc >= MAJOR_INDEX;
  return {
    turns, outcome, major, endAt, steps: sec.steps, landT,
    stats: { shipsHit: S.shipsHit, usLost: S.usLost, lostMb: S.lostMb, price: S.price, cost: S.cost, esc: S.esc,
      hormuz: S.ev.hormuz > 0, gulf: S.ev.gulf > 0, regional: S.ev.regional },
  };
}
