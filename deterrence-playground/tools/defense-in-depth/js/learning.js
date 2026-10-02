// Between-battle learning pipeline (SPEC §6.3), after Hunzeker's ACT theory: exploration (command
// latitude) → selection (assessment) → action (training) → mastery (pp. 22–24, 27–33, 36–37).
// Pure: every function returns a new state; randomness comes only from the rng passed in.
import { CARDS, LEARN, LATITUDE, TRAINING, TRAINING_ORDER, TECH_TRAIN_MULT, MASTERY_SHARE, ARCHETYPES,
  ASSESS_PRESETS, STATES, STATE_PHASE, DOMAINS, SEASONS, TICKS_PER_PHASE, CONSTRAINTS } from '../data/campaign.js';
import { digest } from './lessons.js';
import { stubTest } from './micro.js';
import { makeRng, STREAM } from './rng.js';

// ---- Deterministic RNG: the engine's learning stream (js/rng.js), sub-keyed by phase/army/action. ----
export function lrng(seed, ...keys) {
  return makeRng((Number(seed) || hashStr(String(seed))) >>> 0, STREAM.learning, hashStr(keys.join('|')));
}
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
export const isModern = e => e === 'm' || e === 'modern';

const clone = x => (x === undefined ? null : JSON.parse(JSON.stringify(x)));
const byId = Object.fromEntries(CARDS.map(c => [c.id, c]));
const stIdx = s => STATES.indexOf(s);

/** Cards this army can use: attacker or defender, by era (CA3 is both sides in Modern). */
export function applicable(role, era) {
  const k = role === 'att' ? 'a' : 'd';
  return CARDS.filter(c => ((isModern(era) && c.modernSides) || c.sides).includes(k)).map(c => c.id);
}
export function assessLevel(a) { return !a.cell ? 'none' : (a.indep && a.prestige && a.rigor ? 'independent' : 'conduit'); }

/** New learner (one army). arch: 'staff'|'regimental'|'republican'|'custom'.
 * custom = { lat:1–4, assess:'none'|'conduit'|'independent', train:'decentralized'|'partial'|'centralized' } */
export function newLearner({ arch = 'staff', role = 'def', era = 'ww1', custom = null } = {}) {
  const A = ARCHETYPES[arch];
  const d0 = A ? A.path[0] : { lat: custom.lat, assess: ASSESS_PRESETS[custom.assess], train: custom.train };
  const cards = {};
  for (const id of applicable(role, era)) cards[id] = { st: 'unknown', est: null, sd: null, obs: null, prog: 0, resist: 0, garbled: false, formOnly: false, falseKnown: false, redteam: false, attr: null, tests: 0 };
  const L = { arch, role, era, custom, dials: clone(d0), manual: {}, constraints: A ? [...A.constraints] : [],
    listening: 0, phase: 0, season: 0, cards, obs: [], actionsLeft: 0, penaltyNext: 0, staffForward: false,
    enemyUsed: [], captured: false, missing: { companies: 0, battalions: 0 }, timeline: [], log: [] };
  return record(L, 1);
}

// Timeline row per season: furthest pipeline phase reached in each Hunzeker domain (L15; p. 46).
function record(L, ticks) {
  const row = {};
  for (const D of DOMAINS) {
    let best = null;
    for (const [id, c] of Object.entries(L.cards)) if (byId[id].domain === D.id && STATE_PHASE[c.st]) {
      const p = STATE_PHASE[c.st];
      if (!best || 'ESAM'.indexOf(p) > 'ESAM'.indexOf(best)) best = p;
    }
    row[D.id] = best;
  }
  const tl = [...L.timeline];
  for (let i = 0; i < ticks && tl.length < SEASONS; i++) tl.push({ ...row });
  return { ...L, timeline: tl };
}

/** Effective apparent value of an observation (whitewash unless staff officers went forward; p. 127). */
export function apparentValue(L, o) { return o.ww && !L.staffForward ? o.apparent * (1 - LEARN.whitewash) : o.apparent; }

/** Turn a battle's telemetry (or its digest) into the observations this army surfaces (SPEC §6.3).
 * ctx: { learner, rng } — the learner supplies dials, card states and listening. */
export function observe(tel, side, ctx) {
  const L = ctx.learner, rng = ctx.rng;
  const d = tel && tel.samples ? tel : digest(tel, side);
  const lat = L.dials.lat, lvl = assessLevel(L.dials.assess);
  const pool = [];
  for (const [id, s] of Object.entries(d.samples || {})) {
    const c = L.cards[id];
    if (!c || stIdx(c.st) >= stIdx('codified') || byId[id].false) continue;
    pool.push({ card: id, raw: s.eff, n: s.n, sigma: LEARN.sigma, context: false });
  }
  // False lessons from unrepresentative success (Nivelle trap, Hunzeker p. 147).
  const fl = d.role === 'att' ? (d.ctx && d.ctx.fastWinInDegraded ? 'FL1' : null) : (d.ctx && d.ctx.forwardHeldVsPoor ? 'FL2' : null);
  if (fl && L.cards[fl] && stIdx(L.cards[fl].st) < stIdx('codified')) pool.push({ card: fl, raw: byId[fl].apparent, n: 99, sigma: LEARN.sigmaContext, context: true });
  for (const p of pool) p.key = p.n + rng.u();          // best-evidenced first, seeded tie-break
  pool.sort((a, b) => b.key - a.key);
  const nSurf = Math.round(LEARN.obsBase * LATITUDE[lat].mult + 1e-9);
  const cap = LEARN.capacity + (lvl === 'independent' ? 1 : 0);
  const loss = L.listening >= 2 ? LEARN.overloadLossListening : LEARN.overloadLoss;
  const out = [];
  pool.slice(0, nSurf).forEach((p, i) => {
    if (lat === 4 && i >= cap && rng.u() < loss) return;            // overload (p. 28)
    out.push({ card: p.card, raw: p.raw, n: p.n, sigma: p.sigma, context: p.context,
      apparent: Math.round((p.raw + p.sigma * rng.normal()) * 100) / 100, ww: lat === 1 });
  });
  return out;
}

/** Start a learning phase after a battle: drift dials, set actions, file observations. */
export function beginPhase(L0, obs, info = {}) {
  let L = clone(L0);
  L.phase += 1;
  const A = ARCHETYPES[L.arch];
  if (A) { const p = A.path[Math.min(L.phase, 3)]; for (const k of ['lat', 'assess', 'train', 'techTrain']) if (!L.manual[k]) L.dials[k] = clone(p[k]); }
  if (L.dials.lat === 3) L.listening += 1;                           // juniors become seniors (p. 28)
  const lvl = assessLevel(L.dials.assess);
  L.actionsLeft = (lvl === 'independent' ? LEARN.actionsIndependent : LEARN.actions) - L.penaltyNext;
  L.penaltyNext = 0; L.staffForward = false; L.missing = { companies: 0, battalions: 0 };
  L.enemyUsed = info.enemyUsed || []; L.captured = !!info.captured;
  L.obs = obs;
  for (const o of obs) {
    const c = L.cards[o.card];
    if (c.st === 'unknown') c.st = 'observed';
    // The cell pools evidence across battles, weighted by sample size (NOTIONAL; W1-C decision).
    c.obs = c.obs && !o.context && !c.obs.context ? pool(c.obs, o) : o;
    c.fresh = true;
    if (lvl === 'conduit' && stIdx(c.st) <= stIdx('candidate')) {  // pamphlet flood: everything circulates (p. 126)
      c.st = 'candidate'; c.est = apparentValue(L, o); c.sd = o.sigma;
    }
  }
  L.log.push({ phase: L.phase, kind: 'observe', cards: obs.map(o => o.card) });
  return L;
}

function pool(a, b) {
  const n = a.n + b.n, w = x => x.n / n;
  return { ...b, n, raw: r2(a.raw * w(a) + b.raw * w(b)), apparent: r2(a.apparent * w(a) + b.apparent * w(b)),
    sigma: Math.sqrt((a.sigma * w(a)) ** 2 + (b.sigma * w(b)) ** 2) };
}
const r2 = x => Math.round(x * 100) / 100;

const fail = (L, why) => ({ state: L, result: { ok: false, why } });

/** Apply one learning action. env.micro(cardId, L, rng) runs a test; default is the stub model.
 * @returns {{state:object, result:object}} */
export function applyAction(L0, action, rng, env = {}) {
  if (L0.actionsLeft <= 0) return fail(L0, 'No actions left this phase.');
  const L = clone(L0), id = action.card, c = id ? L.cards[id] : null, card = id ? byId[id] : null;
  if (id && !c) return fail(L0, 'Your army cannot use that card.');
  const lvl = assessLevel(L.dials.assess);
  let result = { ok: true };
  switch (action.kind) {
    case 'analyze': {
      if (!c.obs || stIdx(c.st) > stIdx('candidate') || (c.st === 'candidate' && !c.fresh)) return fail(L0, 'Nothing new to analyze.');
      const sd = c.obs.sigma * LEARN.analyzeSigma[lvl];
      c.est = Math.round(apparentValue(L, { ...c.obs, apparent: c.obs.raw + sd * rng.normal() }) * 100) / 100; c.sd = sd;
      c.st = 'candidate'; c.fresh = false;
      if (card.false && lvl === 'independent' && rng.u() < LEARN.falseReveal) c.falseKnown = true;
      result = { ok: true, est: c.est, sd, falseKnown: c.falseKnown };
      break;
    }
    case 'test': {
      if (stIdx(c.st) < stIdx('candidate') || stIdx(c.st) > stIdx('tested')) return fail(L0, 'Test a candidate lesson.');
      const r = (env.micro || stubTest)(id, L, rng);
      const rigor = L.dials.assess.rigor;
      const right = rng.u() < (rigor ? LEARN.attribution.rigor : LEARN.attribution.plain);
      const signal = right ? r.cause : (r.cause === 'concept' ? 'execution' : 'concept');
      c.est = r.eff; c.sd = r.sd; c.st = 'tested'; c.tests += 1; c.attr = signal;
      L.missing.companies += 1;                                    // the experimental unit (p. 71)
      result = { ok: true, eff: r.eff, sd: r.sd, attribution: signal, rollouts: r.n };
      break;
    }
    case 'codify': {
      const okSt = c.st === 'tested' || (lvl === 'conduit' && c.st === 'candidate');
      if (!okSt) return fail(L0, lvl === 'conduit' ? 'Codify needs a candidate.' : 'Codify needs a tested lesson.');
      const blocked = L.constraints.find(k => CONSTRAINTS[k].blocks.includes(id));
      if (blocked) return fail(L0, CONSTRAINTS[blocked].text);
      if (lvl === 'none' && rng.u() < LEARN.garbleNone) c.garbled = true;
      c.st = 'codified'; result = { ok: true, garbled: c.garbled };
      break;
    }
    case 'train': {
      if (c.st !== 'codified') return fail(L0, 'Train needs a codified card.');
      c.st = 'training'; c.resist = TRAINING[trainSys(L, card)].resist;
      break;
    }
    case 'study': {
      if (!L.enemyUsed.includes(id) || stIdx(c.st) >= stIdx('codified')) return fail(L0, 'The enemy did not show that doctrine.');
      const a = L.dials.assess, S = LEARN.study;
      const full = rng.u() < S.base + S.rigor * (a.rigor ? 1 : 0) + S.captured * (L.captured ? 1 : 0);
      c.st = 'codified'; c.formOnly = !full; c.est = card.effect * (full ? 1 : 0.5);
      result = { ok: true, full };                                 // form without rules (p. 117)
      break;
    }
    case 'redteam': {
      if (stIdx(c.st) < stIdx('candidate') || stIdx(c.st) > stIdx('codified')) return fail(L0, 'Red-team a candidate.');
      c.redteam = true; if (card.false) c.falseKnown = true;
      result = { ok: true, falseKnown: c.falseKnown };
      break;
    }
    case 'staffForward': {
      L.staffForward = true; if (rng.u() < LEARN.staffForwardRisk) L.penaltyNext = 1;
      result = { ok: true, casualty: L.penaltyNext === 1 };
      break;
    }
    case 'pullBattalion': {
      for (const k of Object.values(L.cards)) if (k.st === 'codified' || k.st === 'training') k.prog = Math.min(1, k.prog + LEARN.pullBattalionShare);
      L.missing.battalions += 1;                                   // trained off the line (p. 74)
      break;
    }
    case 'dial': {
      const r = dialStep(L, action.dial, action.dir || 1);
      if (!r) return fail(L0, 'That dial is at its limit.');
      break;
    }
    default: return fail(L0, 'Unknown action.');
  }
  L.actionsLeft -= 1;
  L.log.push({ phase: L.phase, ...action, result });
  return { state: L, result };
}

function trainSys(L, card) { return card.tech && L.dials.techTrain ? L.dials.techTrain : L.dials.train; }

function dialStep(L, dial, dir) {
  L.manual[dial === 'lat' || dial === 'train' ? dial : 'assess'] = true;
  if (dial === 'lat') { const v = L.dials.lat + dir; if (v < 1 || v > 4) return false; L.dials.lat = v; return true; }
  if (dial === 'train') { const i = TRAINING_ORDER.indexOf(L.dials.train) + dir; if (i < 0 || i > 2) return false; L.dials.train = TRAINING_ORDER[i]; L.manual.techTrain = true; L.dials.techTrain = null; return true; }
  if (['cell', 'indep', 'prestige', 'rigor'].includes(dial)) {
    const v = dir > 0; if (L.dials.assess[dial] === v) return false;
    L.dials.assess = { ...L.dials.assess, [dial]: v };
    if (dial !== 'cell' && v) L.dials.assess.cell = true;
    return true;
  }
  return false;
}

/** Close a learning phase: training ticks, mastery, events, timeline (SPEC §6.3). */
export function endPhase(L0, rng) {
  let L = clone(L0);
  for (let t = 0; t < TICKS_PER_PHASE; t++) {
    for (const [id, c] of Object.entries(L.cards)) {
      if (c.st !== 'training') continue;
      const card = byId[id], sys = trainSys(L, card);
      c.prog = Math.min(1, c.prog + TRAINING[sys].rate * (card.tech ? TECH_TRAIN_MULT : 1));
      if (mastery(c) >= MASTERY_SHARE) c.st = 'mastered';
    }
    L = record(L, 1);
  }
  const events = [];
  if (rng.u() < LEARN.commanderReplaced) {                         // doctrinal whiplash (p. 164)
    events.push('commanderReplaced');
    if (assessLevel(L.dials.assess) !== 'independent') {
      for (const c of Object.values(L.cards)) {
        const i = stIdx(c.st);
        if (i >= stIdx('candidate') && i < stIdx('mastered')) c.st = STATES[i - 1];
      }
    }
  }
  L.log.push({ phase: L.phase, kind: 'endPhase', events });
  L.obs = []; L.actionsLeft = 0;
  return L;
}

/** Fidelity-weighted share of units trained: resisters train at half fidelity (pp. 31–33). */
export function mastery(c) { return c.prog * (1 - 0.5 * c.resist); }

/** Close the campaign timeline (season 7). */
export function finish(L) { return record(L, SEASONS - L.timeline.length); }

/** Doctrine for the next battle: per card share trained, fidelity, mastered flag (SPEC §6.3). */
export function doctrineFor(L) {
  const cards = {};
  for (const [id, c] of Object.entries(L.cards)) {
    const used = c.st === 'training' || c.st === 'mastered';
    const fid = (c.garbled || c.formOnly ? 0.5 : 1);
    cards[id] = { mastered: c.st === 'mastered', share: used ? Math.min(1, c.prog) : 0, resist: c.resist, fidelity: fid, adopted: stIdx(c.st) >= stIdx('codified') };
  }
  const quality = L.dials.assess.prestige ? LEARN.prestigeQuality : 0;
  return { cards, quality, missing: { ...L.missing }, lat: L.dials.lat };
}

/** Single battles: all nine true cards mastered (SPEC §6.5, D-25). */
export function fullDoctrine() {
  const cards = {};
  for (const c of CARDS) cards[c.id] = { mastered: !c.false, share: c.false ? 0 : 1, resist: 0, fidelity: 1, adopted: !c.false };
  return { cards, quality: 0, missing: { companies: 0, battalions: 0 }, lat: 3 };
}

/** Per-unit training: unit.trained[card] ∈ {0, 0.5, 1}, deterministic by unit id (pp. 74, 107). */
export function trainedFor(doc, unitId) {
  const out = {};
  for (const [id, d] of Object.entries(doc.cards)) {
    const h1 = hashStr(unitId + '|' + id) / 4294967296, h2 = hashStr(id + '#' + unitId) / 4294967296;
    out[id] = h1 < d.share ? (h2 < d.resist ? 0.5 : 1) * d.fidelity : 0;
  }
  return out;
}

/** Learned (codified + mastered + true + faithful) vs changed (any adopted card; Hunzeker p. 36). */
export function scores(L) {
  const learned = [], changed = [], falseAdopted = [];
  for (const [id, c] of Object.entries(L.cards)) {
    if (stIdx(c.st) < stIdx('codified')) continue;
    changed.push(id);
    if (byId[id].false) falseAdopted.push(id);
    else if (c.st === 'mastered' && !c.garbled && !c.formOnly) learned.push(id);
  }
  return { learned, changed, falseAdopted };
}
