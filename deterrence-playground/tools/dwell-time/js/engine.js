// Dwell Time: the incident model. Pure functions over a plain state object, so a game replays exactly from
// its seed and choices, and the computer responder and the tests run the same code as the page.
//
// The attacker holds footholds (accounts, hosts, privileged access, persistence, cloud tokens, vendor agents,
// OT access). Each turn it tries its next step. Steps succeed or fail by the organization's controls and are
// seen or missed by its telemetry. The defenders see only what was detected (plus false alarms), act on what
// they see, and live with what they did not see.
import { makeRng } from './rng.js';
import { ACTIONS, actionById, slotsFor } from './actions.js';
import { sectorById } from '../data/sectors.js';
import { scenarioById } from '../data/scenarios/index.js';

export const KINDS = {
  account: 'Account', priv: 'Privileged access', host: 'Host', persist: 'Persistence', cloud: 'Cloud identity',
  vendor: 'Vendor agent', ot: 'OT access', insider: 'Insider', comms: 'Mail and chat access',
};
// Which containment action removes which kind of foothold.
export const REMOVES = {
  disable: ['account', 'priv', 'insider', 'comms'], isolate: ['host', 'persist', 'ot'], reimage: ['host', 'persist'],
  rotate: ['cloud'], vendorOff: ['vendor'],
};
const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ---------- Text ---------- */
export function fill(text, s) {
  if (typeof text !== 'string') return text;
  const sec = sectorById(s.sector);
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in sec ? sec[k] : (s.vars && k in s.vars ? s.vars[k] : m)));
}

/* ---------- Clock ---------- */
export function clockAt(scen, h) {
  const m0 = (scen.start.dow * 24 + scen.start.h) * 60 + scen.start.m;
  const m = Math.round(m0 + h * 60);
  const day = Math.floor(m / 1440), dow = ((day % 7) + 7) % 7, mm = m % 1440;
  return { day: Math.floor(h / 24) + 1, dow: DOW[dow], hm: `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}` };
}
export const clockText = (scen, h) => { const c = clockAt(scen, h); return `${c.dow} ${c.hm}`; };
/** Hours from the game start to 17:30 on the n-th business day after the day containing hour h. */
export function businessDeadline(scen, h, n) {
  const m0 = (scen.start.dow * 24 + scen.start.h) * 60 + scen.start.m;
  let day = Math.floor((m0 + h * 60) / 1440), k = 0;
  while (k < n) { day++; const d = ((day % 7) + 7) % 7; if (d !== 0 && d !== 6) k++; }
  return (day * 1440 + 17.5 * 60 - m0) / 60;
}
export const turnHours = (scen, t) => (t + 1 < scen.turns.length ? scen.turns[t + 1].h : scen.endH) - scen.turns[t].h;

/* ---------- Setup ---------- */
export function newGame({ seed = 1, scen = 'helpdesk', sector = 'hospital', posture, mode = 'solo' } = {}) {
  const sc = scenarioById(scen), sec = sectorById(sector);
  const s = {
    v: 1, seed, scen: sc.id, sector: sec.id, mode, posture: { ...posture }, t: 0, over: false,
    vars: { ...(sc.vars || {}) },
    adv: { stage: 0, fh: [], comms: false, exfil: 0, backupsHit: false, enc: 0, otHit: false, tipped: 0, quiet: 0,
      done: [], evictedT: null, reentries: 0, extorted: false },
    flags: [], nextId: 1,
    d: { declared: null, ir: null, irOn: null, oob: !!posture.oob, le: null, leIntel: false, counsel: null, insurer: null,
      hold: false, auth: null, continuity: null, offline: false, egress: false, otCut: false, vendorOff: false,
      monitor: false, intel: 0, staff: false, materialT: null, ofac: false, vectorClosed: false, imaged: 0,
      statements: [], customers: null, board: null, notified: false, restoreTries: 0, aware: null, publicT: null,
      claimSafe: null, disruptT: null, breachT: null, otT: null, paidT: null },
    ransom: null,
    biz: { ops: 100, rep: 70, cost: { response: 0, recovery: 0, downtime: 0, ransom: 0, notice: 0, fines: 0 }, opsHist: [] },
    ev: 30 + (posture.logs ? 20 : 0),
    clocks: [], feed: [], log: [], hits: {},
  };
  // What the attacker did before the game starts (already inside, unseen).
  for (const id of sc.pre || []) { const st = sc.stages.find(x => x.id === id); succeed(s, st, sc, null, true); }
  s.adv.stage = Math.max(0, sc.stages.findIndex(x => !(sc.pre || []).includes(x.id)));
  injects(s, sc, makeRng(seed, 50, 0));
  // The opening move: the attacker's first attempt happens before the defenders' first turn.
  if (sc.open) {
    const ctx = { adv: [], feed: [] }, rng = makeRng(seed, 60, 0);
    const st = sc.stages[s.adv.stage];
    if (rng.u() < stageP(s, st)) {
      const added = succeed(s, st, sc, ctx); maybeDetect(s, st, sc, rng, ctx, added);
      s.adv.stage = Math.min(sc.stages.length - 1, s.adv.stage + 1);
    } else { ctx.adv.push({ stage: st.id, ok: false }); if (st.fail && rng.u() < detectP(s, st, sc) + 0.2) signal(s, st.fail, ctx, null); }
    for (const x of ctx.feed) { x.t = 0; s.feed.push(x); }
    s.prelog = ctx.adv;
  }
  return s;
}

/* ---------- Footholds and flags ---------- */
const usable = (s, f) => f.on && !s.d.offline && !(f.kind === 'vendor' && s.d.vendorOff) && !(f.kind === 'ot' && s.d.otCut);
export const activeFh = s => s.adv.fh.filter(f => usable(s, f));
const hasKind = (s, kinds) => !kinds || !kinds.length || s.adv.fh.some(f => usable(s, f) && kinds.includes(f.kind));
function addFlag(s, { kind, label, real, fid = null, src = '' }) {
  if (fid && s.flags.some(x => x.fid === fid && x.st !== 'done')) return null;
  const f = { id: `x${s.nextId++}`, kind, label: fill(label, s), real, fid, st: 'new', t: s.t, src };
  s.flags.push(f); return f;
}
export const openFlags = (s, kinds) => s.flags.filter(x => (x.st === 'new' || x.st === 'confirmed') && (!kinds || kinds.includes(x.kind)));

/** Contain every open flag of these kinds. Real ones remove the foothold; false alarms cost business goodwill. */
export function contain(s, kinds, ctx, how) {
  let real = 0, fp = 0;
  for (const x of openFlags(s, kinds)) {
    x.st = 'done'; x.how = how; x.doneT = s.t;
    if (x.real) {
      const f = s.adv.fh.find(z => z.id === x.fid);
      if (f && f.on) { f.on = false; f.offT = s.t; ctx.removed.push(f); real++; }
    } else { fp++; ctx.opsHit += 1.5; }
  }
  return { real, fp };
}

/** The attacker reads mail and chat while it holds any foothold that gave it that access. */
export function syncComms(s) { s.adv.comms = s.adv.fh.some(f => f.on && (f.kind === 'comms' || f.comms)); }

/* ---------- Attacker ---------- */
function stageP(s, st) {
  let p = st.p;
  for (const [c, m] of Object.entries(st.ctl || {})) if (s.posture[c]) p *= m;
  if (st.staffCut && s.d.staff) p *= st.staffCut;
  return clamp(p, 0, 0.98);
}
function detectP(s, st, sc) {
  let p = st.det;
  for (const [c, a] of Object.entries(st.dctl || {})) if (s.posture[c]) p += a;
  if (s.d.monitor) p += 0.2;
  if (s.d.intel > 0) p += 0.15;
  if (s.d.irOn != null && s.d.irOn <= s.t) p += 0.1;
  if (s.d.leIntel && sc.leIntel) p += sc.leIntel.det || 0;
  if (s.adv.quiet > 0) p -= 0.15;
  return clamp(p, 0.02, 0.95);
}
function succeed(s, st, sc, ctx, silent = false) {
  const added = [];
  for (const a of st.adds || []) {
    const f = { id: `f${s.nextId++}`, kind: a.kind, label: fill(a.label, s), on: true, t: s.t, stage: st.id };
    s.adv.fh.push(f); added.push(f);
  }
  const e = st.eff || {};
  if (e.comms) {
    const carriers = added.length ? added : s.adv.fh.filter(f => usable(s, f) && (st.need || []).includes(f.kind));
    for (const f of carriers) f.comms = true;
    s.adv.everComms = true;
  }
  syncComms(s);
  if (e.exfil) s.adv.exfil = Math.min(1, s.adv.exfil + e.exfil * (s.d.egress && !st.cloudSide ? 0.2 : 1));
  if (e.backups && !s.posture.immut) s.adv.backupsHit = true;
  if (e.impact) { s.adv.enc = Math.max(s.adv.enc, e.impact); s.adv.encMax = Math.max(s.adv.encMax || 0, s.adv.enc); s.adv.impactT = s.adv.impactT ?? s.t; }
  if (e.ot) { s.adv.otHit = true; s.d.otT = s.d.otT ?? s.t; }
  if (e.extort) s.adv.extorted = true;
  if (!s.adv.done.includes(st.id)) s.adv.done.push(st.id);
  if (!silent && ctx) ctx.adv.push({ stage: st.id, ok: true, added: added.map(f => f.id) });
  return added;
}
/** The next step the attacker can attempt, falling back to re-acquire access it has lost. */
function nextStage(s, sc) {
  const anyAccess = s.adv.fh.some(f => f.on);
  if (!anyAccess) return s.adv.done.length ? sc.stages[0] : sc.stages[s.adv.stage] || null;
  let i = Math.min(s.adv.stage, sc.stages.length - 1);
  const seen = new Set();
  while (i >= 0 && !seen.has(i)) {
    seen.add(i);
    const st = sc.stages[i];
    if (hasKind(s, st.need)) return st;
    // It still holds that access but the defenders have cut it off (OT severed, vendor shut down): nothing to regain.
    if (s.adv.fh.some(f => f.on && st.need.includes(f.kind))) return null;
    const j = sc.stages.findIndex(x => (x.adds || []).some(a => st.need.includes(a.kind)));
    if (j < 0 || j >= i) return null;
    // Steps taken before the game began (a hire, a backdoored update, an old web shell) cannot be redone mid-incident.
    if ((sc.pre || []).includes(sc.stages[j].id)) return null;
    i = j;
  }
  return null;
}
function attackerTurn(s, sc, rng, ctx) {
  const anyOn = s.adv.fh.some(f => f.on);
  if (!anyOn && s.adv.done.length) {
    if (s.adv.evictedT == null) s.adv.evictedT = s.t;
    // Locked out. It may try the way in again if that door is still open.
    const st0 = sc.stages[0];
    if (s.d.vectorClosed || s.d.offline || !sc.reentry || s.t >= sc.turns.length - 1) return;
    if (rng.u() < sc.reentry * stageP(s, st0)) {
      const added = succeed(s, st0, sc, ctx); s.adv.reentries++; s.adv.evictedT = null;
      ctx.adv[ctx.adv.length - 1].reentry = true;
      maybeDetect(s, st0, sc, rng, ctx, added);
    }
    return;
  }
  if (s.d.offline) { ctx.adv.push({ stage: null, blocked: 'offline' }); return; }
  let moves = sc.turns[s.t].moves ?? 1;
  if (s.adv.tipped && sc.onTip === 'accelerate') moves += 2;
  if (s.adv.quiet > 0) { s.adv.quiet--; moves = Math.max(0, moves - 1); }
  for (let k = 0; k < moves; k++) {
    // Ongoing theft continues every move while the attacker still has the access it needs.
    const st = nextStage(s, sc);
    if (!st) break;
    // A finished plan is not replayed: one-time effects happen once (ongoing theft continues below).
    if (s.adv.done.includes(st.id) && sc.stages.indexOf(st) === sc.stages.length - 1) break;
    if (st.after != null && s.t < st.after) break;
    const idx = sc.stages.indexOf(st);
    // Going back to the very first step is a fresh break-in: it needs the door still open and is rarer.
    const reentry = idx === 0 && s.adv.done.includes(st.id);
    if (reentry && (s.d.vectorClosed || !sc.reentry || rng.u() >= sc.reentry)) break;
    if (rng.u() < stageP(s, st)) {
      const added = succeed(s, st, sc, ctx);
      if (reentry) { ctx.adv[ctx.adv.length - 1].reentry = true; s.adv.reentries++; }
      maybeDetect(s, st, sc, rng, ctx, added);
      if (idx >= s.adv.stage) s.adv.stage = Math.min(sc.stages.length, idx + 1);
      if (s.adv.stage >= sc.stages.length) { s.adv.stage = sc.stages.length - 1; s.adv.finished = true; }
      if (st.eff && (st.eff.impact || st.eff.ot || st.eff.extort) && s.adv.finished) break;
    } else {
      ctx.adv.push({ stage: st.id, ok: false });
      if (st.fail && rng.u() < detectP(s, st, sc) + 0.2) signal(s, st.fail, ctx, null);
    }
    if (s.adv.finished && s.adv.done.includes(sc.stages[sc.stages.length - 1].id)) break;
  }
  // Theft that keeps running once started (stages with `ongoing`).
  for (const st of sc.stages) {
    if (!st.ongoing || !s.adv.done.includes(st.id)) continue;
    if (!hasKind(s, st.need)) continue;
    const r = st.ongoing.exfil * turnHours(sc, s.t) / 24 * (s.d.egress && !st.cloudSide ? 0.15 : 1);
    s.adv.exfil = Math.min(1, s.adv.exfil + r);
  }
  // Re-encrypt restored systems if it still holds the keys.
  if (s.adv.done.some(id => sc.stages.find(x => x.id === id)?.eff?.impact) && s.adv.enc < 0.5 && hasKind(s, ['priv']) && rng.u() < 0.35) {
    s.adv.enc = Math.min(1, s.adv.enc + 0.35); s.adv.encMax = Math.max(s.adv.encMax || 0, s.adv.enc); ctx.adv.push({ stage: 'reencrypt', ok: true }); ctx.reencrypted = true;
  }
}
function maybeDetect(s, st, sc, rng, ctx, added) {
  const p = detectP(s, st, sc);
  const hit = rng.u() < p;
  const rec = ctx.adv[ctx.adv.length - 1];
  if (rec) { rec.detected = hit; rec.p = Math.round(p * 100); }
  s.hits[st.id] = s.hits[st.id] || { tries: 0, seen: 0 };
  s.hits[st.id].tries++; if (hit) s.hits[st.id].seen++;
  if (!hit) return;
  const flags = [];
  for (const f of added) flags.push(addFlag(s, { kind: f.kind, label: f.label, real: true, fid: f.id, src: st.id }));
  if (st.reveals) {
    const f = [...s.adv.fh].reverse().find(z => z.on && st.reveals.includes(z.kind) && !s.flags.some(x => x.fid === z.id && x.st !== 'done'));
    if (f) flags.push(addFlag(s, { kind: f.kind, label: f.label, real: true, fid: f.id, src: st.id }));
  }
  signal(s, st.sig, ctx, flags.filter(Boolean));
}
function signal(s, sig, ctx, flags) {
  if (!sig) return;
  ctx.feed.push({ kind: 'signal', role: sig.role || 'it', title: fill(sig.title, s), text: fill(sig.text || '', s),
    art: fill(sig.art || '', s), flags: (flags || []).map(f => f.id) });
}
function noise(s, sc, rng, ctx) {
  const n = rng.pick([0.4, 0.42, 0.18]);
  const pool = sc.noise || [];
  for (let i = 0; i < n && pool.length; i++) {
    const z = pool[Math.floor(rng.u() * pool.length)];
    const f = addFlag(s, { kind: z.kind, label: z.label, real: false, src: 'noise' });
    ctx.feed.push({ kind: 'signal', role: z.role || 'it', title: fill(z.title, s), text: fill(z.text || '', s), art: fill(z.art || '', s), flags: [f.id] });
  }
}

/* ---------- Scripted injects ---------- */
function injects(s, sc, rng) {
  const out = [];
  for (const inj of sc.injects || []) {
    if (inj.t != null && inj.t !== s.t) continue;
    if (inj.when && !inj.when(s)) continue;
    if (inj.once && s.feed.some(x => x.inj === inj.id)) continue;
    if (inj.do) inj.do(s, rng);
    if (inj.flag) for (const f of s.adv.fh) if (f.on && f.stage === inj.flag) addFlag(s, { kind: f.kind, label: f.label, real: true, fid: f.id, src: inj.flag });
    out.push({ kind: 'inject', inj: inj.id, role: inj.role || 'all', title: fill(inj.title, s), text: fill(inj.text, s), art: fill(inj.art || '', s), t: s.t });
  }
  for (const x of out) s.feed.push(x);
}

/* ---------- Turn ---------- */
/** Can this action be taken now? Returns null if yes, or the reason it cannot. */
export function blocked(s, a, chosen = []) {
  const sc = scenarioById(s.scen);
  if (a.scen && !a.scen.includes(s.scen)) return 'Not part of this scenario.';
  if (a.once && a.done && a.done(s)) return 'Already done.';
  if (a.req) { const r = a.req(s, sc, chosen); if (r) return r; }
  return null;
}
/** The picks that are allowed this turn, judged (as the page judges them) against the state at the start of the
 * turn: no duplicates, each one's requirements met given the others, and within every seat's action slots. */
export function legalPicks(s, ids) {
  const uniq = [...new Set(ids)].filter(id => actionById(id));
  const left = slotsFor(s), out = [];
  for (const id of uniq) {
    const a = actionById(id);
    if (blocked(s, a, uniq.filter(x => x !== id))) continue;
    const c = a.slots || { [a.role]: 1 };
    if (Object.entries(c).some(([r, n]) => (left[r] || 0) < n)) continue;
    for (const [r, n] of Object.entries(c)) left[r] -= n;
    out.push(id);
  }
  return out;
}
export function available(s) {
  return ACTIONS.filter(a => !a.scen || a.scen.includes(s.scen)).map(a => ({ a, why: blocked(s, a) }));
}

/** Play one turn. moves = { acts: [actionId...], note }. Returns { state, events }. Never mutates its input. */
export function step(s0, moves = {}) {
  const s = structuredClone(s0);
  if (s.over) return { state: s, events: [] };
  const sc = scenarioById(s.scen), sec = sectorById(s.sector);
  const rng = makeRng(s.seed, 100 + s.t, 0), nrng = makeRng(s.seed, 200 + s.t, 0), irng = makeRng(s.seed, 300 + s.t, 0);
  const ctx = { removed: [], opsHit: 0, adv: [], feed: [], notes: [], noisy: false, cost: 0, sc, sec };
  const H = turnHours(sc, s.t);
  s.d.monitor = false;
  if (s.d.intel > 0) s.d.intel--;
  const acts = legalPicks(s, moves.acts || []).map(actionById).sort((a, b) => (a.order || 50) - (b.order || 50));
  const chosen = [];
  for (const a of acts) { a.apply(s, ctx, rng); chosen.push(a.id); }
  syncComms(s);
  // A partial eviction warns an attacker that still has a way in. Planning on a channel it reads does too.
  const stillIn = s.adv.fh.some(f => f.on);
  let tip = 0;
  if (ctx.removed.length && stillIn) tip = 0.65;
  if (ctx.noisy && s.adv.comms && !s.d.oob && stillIn) tip = Math.max(tip, 0.45);
  if (ctx.blockTip && stillIn) tip = Math.max(tip, 0.3);
  if (tip && !s.adv.tipped && rng.u() < tip) {
    s.adv.tipped = s.t + 1;
    ctx.tipped = true;
    if (sc.onTip === 'burrow' && sc.burrow?.length) {
      const b = sc.burrow[(s.adv.reentries + s.t) % sc.burrow.length];
      s.adv.fh.push({ id: `f${s.nextId++}`, kind: b.kind, label: fill(b.label, s), on: true, t: s.t, stage: 'burrow' });
      s.adv.quiet = 2;
      ctx.adv.push({ stage: 'burrow', ok: true, label: fill(b.label, s) });
    }
    if (sc.onTip === 'extort') {
      s.adv.exfil = Math.min(1, s.adv.exfil + 0.4); s.adv.extorted = true;
      ctx.adv.push({ stage: 'smash', ok: true });
    }
  }
  attackerTurn(s, sc, rng, ctx);
  noise(s, sc, nrng, ctx);

  // Business.
  const soft = s.d.continuity != null ? 0.75 : 1;
  let hit = ctx.opsHit;
  if (s.d.offline) hit += sec.offlineHit * soft;
  if (s.d.egress) hit += 3;
  if (s.d.otCut) hit += 4 * soft;
  if (s.d.vendorOff) hit += (sc.vendorHit || 6) * soft;
  hit += sec.encryptHit * s.adv.enc * soft;
  if (s.adv.otHit) hit += sec.otHit * soft;
  s.biz.ops = Math.round(clamp(100 - hit, 3, 100));
  s.biz.opsHist.push({ t: s.t, ops: s.biz.ops, h: H });
  s.biz.cost.downtime += sec.revPerHour * (100 - s.biz.ops) / 100 * H;
  if (s.d.irOn != null && s.d.irOn <= s.t) s.biz.cost.response += s.posture.retainer ? 60 : 80;
  if (s.d.counsel != null) s.biz.cost.response += 20;
  if (s.d.continuity != null) s.biz.cost.recovery += 20;
  if (s.biz.ops < 60 && s.d.disruptT == null) s.d.disruptT = s.t;

  // What the organization knows.
  if (s.d.aware == null && (s.d.declared != null || s.flags.some(x => x.real && (x.st === 'confirmed' || x.st === 'done')))) s.d.aware = s.t;
  const leaked = s.ransom && s.ransom.leaked;
  const exfilKnown = s.adv.exfil > 0.05 && (leaked || s.adv.extorted || s.flags.some(x => x.real && x.src && sc.stages.find(st => st.id === x.src)?.eff?.exfil) ||
    ctx.adv.some(a => a.detected && sc.stages.find(st => st.id === a.stage)?.eff?.exfil) || s.d.scopedExfil);
  if (exfilKnown && s.d.breachT == null) s.d.breachT = s.t;
  if (s.d.publicT == null && (s.biz.ops < 75 || leaked || sc.publicAt?.(s))) s.d.publicT = s.t;

  // Reputation.
  if (s.d.publicT != null && s.d.publicT < s.t && !s.d.statements.length) s.biz.rep -= 6;
  if (s.biz.ops < 50) s.biz.rep -= 2;
  s.biz.rep = clamp(s.biz.rep);

  // Clocks.
  updateClocks(s, sc, sec);
  // Close the turn.
  s.log.push({ t: s.t, h: sc.turns[s.t].h, acts: chosen, adv: ctx.adv, removed: ctx.removed.map(f => f.id), tipped: !!ctx.tipped,
    note: moves.note || '', ops: s.biz.ops, exfil: +s.adv.exfil.toFixed(3), enc: +s.adv.enc.toFixed(2), reencrypted: !!ctx.reencrypted });
  for (const x of ctx.feed) { x.t = s.t; s.feed.push(x); }
  if (ctx.tipped) s.feed.push({ kind: 'hidden', t: s.t, title: 'The attacker noticed' });
  s.t++;
  if (s.t >= sc.turns.length) { s.over = true; finalize(s, sc, sec); }
  else {
    ransomTick(s, sc, sec, irng);
    injects(s, sc, irng);
    s.feed.push({ kind: 'result', t: s.t - 1, title: 'Turn report', text: ctx.notes.join(' ') });
  }
  return { state: s, events: ctx };
}

/** Stolen data is published: reputation falls, the breach is known and the incident is public. */
export function leak(s) {
  if (!s.ransom || s.ransom.leaked) return;
  s.ransom.leaked = true; s.biz.rep = clamp(s.biz.rep - 12); s.d.breachT = s.d.breachT ?? s.t; s.d.publicT = s.d.publicT ?? s.t;
}
function ransomTick(s, sc, sec, rng) {
  if (!s.ransom && (s.adv.enc > 0 || s.adv.extorted) && sc.ransom) {
    s.ransom = { demand: Math.round(sc.ransom.demand * (sec.ransomScale || 1)), noteT: s.t, deadline: s.t + (sc.ransom.days || 2),
      negotiated: false, paid: null, refused: false, leaked: false, decryptor: false };
  }
  const r = s.ransom;
  if (!r || r.paid != null || r.leaked) return;
  if (s.t >= r.deadline && s.adv.exfil > 0.1) {
    leak(s);
    s.feed.push({ kind: 'inject', role: 'comms', t: s.t, title: 'Your data is on the leak site',
      text: fill(sc.ransom.leakText || 'The attackers posted a sample of stolen {data} on their leak site and named you. Reporters are calling.', s) });
  }
}

export function updateClocks(s, sc, sec) {
  const startH = { aware: s.d.aware, material: s.d.materialT, disrupt: s.d.disruptT, breach: s.d.breachT, paid: s.d.paidT, ot: s.d.otT, encrypt: s.adv.impactT };
  for (const c of sec.clocks) {
    if (s.clocks.some(x => x.id === c.id)) continue;
    // A clock may have several triggers (any of them starts it); it starts at the earliest.
    const trig = [].concat(c.trigger).filter(k => startH[k] != null).sort((a, b) => startH[a] - startH[b])[0];
    if (!trig) continue;
    const t0 = startH[trig];
    const h0 = sc.turns[t0].h + (trig === 'material' || trig === 'paid' ? 0 : turnHours(sc, t0));
    const due = c.bdays ? businessDeadline(sc, h0, c.bdays) : h0 + c.hours;
    s.clocks.push({ id: c.id, label: c.label, who: c.who, via: c.via, src: c.src, startH: h0, dueH: due, filedH: null, t0 });
  }
}

/* ---------- End of game ---------- */
function finalize(s, sc, sec) {
  const endH = sc.endH;
  for (const c of s.clocks) c.status = c.filedH != null ? (c.filedH <= c.dueH ? 'on time' : 'late') : (c.dueH <= endH ? 'missed' : 'open');
  for (const c of s.clocks) if (c.status === 'late' || c.status === 'missed') { s.biz.cost.fines += 250; s.biz.rep = clamp(s.biz.rep - 5); }
  if (s.d.claimSafe != null && s.adv.exfil > 0.05) { s.biz.rep = clamp(s.biz.rep - 22); s.claimBroken = true; }
  // Notification and litigation follow a breach whether or not the game saw it.
  if (s.adv.exfil > 0.05) s.biz.cost.notice += Math.round((sec.notifyCost || 500) * Math.min(1, s.adv.exfil * 1.5));
  s.biz.cost.litigation = Math.round((sec.litigation || 3000) * s.adv.exfil * (s.d.counsel != null ? 0.75 : 1));
  const c = s.biz.cost, gross = c.response + c.recovery + c.downtime + c.ransom + c.notice + c.fines + c.litigation;
  let covered = 0;
  if (s.posture.insured) {
    const ontime = s.d.insurer != null && (s.d.aware == null || s.d.insurer <= s.d.aware + 2);
    const ransomOk = s.ransom?.paid != null && s.ransom.consent;
    const base = 0.7 * (c.response + c.recovery + c.notice + c.litigation + (ransomOk ? c.ransom : 0)) + 0.5 * c.downtime;
    covered = Math.min(10000, Math.max(0, base - 500)) * (s.d.insurer == null ? 0 : ontime ? 1 : 0.5);
  }
  s.money = { gross: Math.round(gross), covered: Math.round(covered), net: Math.round(gross - covered) };
  s.remaining = s.adv.fh.filter(f => f.on).map(f => ({ ...f }));
}

/* ---------- Encoding (URL hash) ---------- */
export function encode(s, history) {
  const p = Object.entries(s.posture).filter(([, v]) => v).map(([k]) => k).join('.');
  const h = history.map(m => (m.acts || []).join('.')).join('~');
  const notes = history.map(m => m.note || '');
  return [1, s.seed, s.scen, s.sector, s.mode, p, h, notes.some(Boolean) ? encodeURIComponent(JSON.stringify(notes)) : ''].join('|');
}
export function decode(str) {
  const [v, seed, scen, sector, mode, p, h, n] = String(str).split('|');
  if (v !== '1' || !(+seed > 0)) return null;
  const posture = {}; for (const k of (p || '').split('.').filter(Boolean)) posture[k] = true;
  let notes = []; try { notes = n ? JSON.parse(decodeURIComponent(n)) : []; } catch { notes = []; }
  const history = h ? h.split('~').map((x, i) => ({ acts: x ? x.split('.') : [], note: typeof notes[i] === 'string' ? notes[i] : '' })) : [];
  return { setup: { seed: +seed, scen, sector, mode, posture }, history };
}
export function replay(setup, history) {
  let s = newGame(setup);
  for (const m of history) { if (s.over) break; s = step(s, m).state; }
  return s;
}

export { slotsFor };
