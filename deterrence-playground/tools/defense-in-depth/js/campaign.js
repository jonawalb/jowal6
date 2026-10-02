// Campaign state machine (SPEC §1.4, §6): four battles, three learning phases, both armies learn.
// State is inputs + battle digests + every learning action, so it replays exactly from a share link
// (SPEC §9.6 `c=`). The computer runs the same pipeline with a scripted chooser (SPEC §6.6).
import { SCALES } from '../data/scales.js';
import { BATTLES, ARCHETYPE_IDS, ARCHETYPES, CARDS, LEARN, SEASONS, CONSTRAINTS } from '../data/campaign.js';
import { newLearner, observe, beginPhase, applyAction, endPhase, finish, doctrineFor, scores, assessLevel,
  apparentValue, lrng, hashStr, trainedFor } from './learning.js';
import { digest } from './lessons.js';

const byId = Object.fromEntries(CARDS.map(c => [c.id, c]));
const other = r => (r === 'att' ? 'def' : 'att');

/** The computer gets one of the other two archetypes, chosen by seed (SPEC §1.4). */
export function aiArchetype(seed, mine) {
  const pool = ARCHETYPE_IDS.filter(a => a !== mine);
  return pool[hashStr('ai' + seed) % pool.length];
}

/** opts: { seed, role:'att'|'def' (player), scale, era, diff, od, arch, custom?, aiArch?, aiCustom? } */
export function newCampaign(opts) {
  const o = { scale: 'd', era: 'ww1', diff: 's', od: 5, arch: 'staff', ...opts };
  const aiArch = o.aiArch || aiArchetype(o.seed, o.arch);
  return {
    v: 1, opts: o, battle: 0, phase: 'battle', aiArch,
    me: newLearner({ arch: o.arch, role: o.role, era: o.era, custom: o.custom }),
    ai: newLearner({ arch: aiArch, role: other(o.role), era: o.era, custom: o.aiCustom }),
    results: [], digests: [], seen: [], log: [],
  };
}

/** Engine options + doctrine for the next battle. The engine reads opts.campaign (template ctx) and
 * applies doctrine via unit.trained (learning.trainedFor). */
export function battleSetup(C) {
  const B = BATTLES[C.battle], o = C.opts;
  const dMe = doctrineFor(C.me), dAi = doctrineFor(C.ai), aiRole = other(o.role);
  const byRole = { [o.role]: dMe, [aiRole]: dAi };
  // A fresh ctx per game: the engine writes into it (e.g. the pulverized column). latitude feeds the
  // engine's initiative events (SPEC §6.4).
  const ctx = { ...JSON.parse(JSON.stringify(B.ctx)), latitude: { [o.role]: C.me.dials.lat, [aiRole]: C.ai.dials.lat } };
  return {
    battle: B, index: C.battle,
    opts: { seed: (o.seed * 7 + C.battle * 104729) % 999983 + 1, scale: o.scale, era: o.era, diff: o.diff, od: o.od,
      mode: 'campaign', side: o.role, campaign: { battle: B.id, ctx },
      // Engine contract (js/engine.js newGame): doctrine[side] = unit -> trained.
      doctrine: { att: u => trainedFor(byRole.att, u.id), def: u => trainedFor(byRole.def, u.id) } },
    doctrine: { me: dMe, ai: dAi },
    profile: { me: profileFor(doctrineFor(C.me), o.role), ai: profileFor(doctrineFor(C.ai), other(o.role)) },
  };
}

/** Put a doctrine on one side of a fresh game (before planning): unit.trained per card, leader quality,
 * and the companies missing to experimental units and battalions pulled off the line (pp. 71, 74).
 * Mutates g (setup step, while g.phase === 'plan'); call engine index(g) afterwards. Returns withdrawn ids. */
export function applyDoctrine(g, side, doc) {
  const out = [];
  const line = g.units.filter(u => u.side === side && (u.type === 'rifle' || u.type === 'storm'));
  let drop = doc.missing.companies + 3 * doc.missing.battalions;
  for (let i = line.length - 1; i >= 0 && drop > 0; i--, drop--) out.push(line[i].id);   // rear-most first
  g.units = g.units.filter(u => !out.includes(u.id));
  for (const u of g.units) {
    if (u.side !== side) continue;
    u.trained = trainedFor(doc, u.id);
    if (doc.quality && (u.type === 'rifle' || u.type === 'storm')) u.q = Math.max(0.5, (u.q || 1) + doc.quality);
  }
  return out;
}

/** AI profile key from doctrine (SPEC §6.6): no ED2+ED3 → Forward-heavy; FL2 → Forward-heavy; etc. */
export function profileFor(doc, role) {
  const m = id => doc.cards[id] && doc.cards[id].mastered;
  const adopted = id => doc.cards[id] && doc.cards[id].adopted;
  if (role === 'def') return adopted('FL2') ? 'forwardHeavy' : (m('ED2') && m('ED3') ? 'elastic' : 'forwardHeavy');
  if (adopted('FL1')) return 'quickRupture';
  return m('AT1') && m('CA2') ? 'modernAssault' : 'massedWaves';
}

/** Stand-in for W2-AI profiles: bend a default plan to the doctrine's profile key (SPEC §5.2, §6.6).
 * forwardHeavy: hold, front/depth companies pulled forward; massedWaves: waves + rush; quickRupture (FL1): waves + rush
 * behind a 2 rows/h creeper; elastic / modernAssault: the default plan unchanged. Returns a new plan. */
export function tweakPlan(plan, profile, g = null) {
  const p = JSON.parse(JSON.stringify(plan));
  // Hold at all costs (outposts may still delay): Forward-heavy (Biddle pp. 96–99; Hunzeker p. 117).
  if (profile === 'forwardHeavy') for (const k of Object.keys(p.stance || {})) if (['elastic', 'riposte'].includes(p.stance[k])) p.stance[k] = 'hold';
  // Dense forward layout: Forward-heavy, or a battle template that fixes it (B1 70%, B2 60% forward; SPEC §6.1).
  const fwd = profile === 'forwardHeavy' || (g && g.ctx && g.ctx.defForwardShare >= 0.6);
  if (fwd) {
    if (g && p.place) {
      const row0 = SCALES[g.scale].bands.battle[0];
      for (const u of g.units) if (u.side === 'def' && (u.role === 'front' || u.role === 'depth') && p.place[u.id] != null)
        p.place[u.id] = row0 * g.cols + (p.place[u.id] % g.cols);
    }
  }
  if (profile === 'massedWaves' || profile === 'quickRupture') {
    for (const k of Object.keys(p.form || {})) p.form[k] = 'waves';
    for (const k of Object.keys(p.posture || {})) if (p.posture[k] !== 'infil') p.posture[k] = 'rush';
    if (p.pairs) p.pairs = [];
  }
  if (profile === 'quickRupture' && p.barrage) p.barrage.rate = 2;
  return p;
}

/** File a finished battle. `res` = { tel } (engine telemetry; sides from res.sides) or
 * { digests: { me, ai } } (precomputed, e.g. the stub model). Opens a learning phase unless it was B4. */
export function recordBattle(C0, res) {
  const C = { ...C0, results: [...C0.results], digests: [...C0.digests], seen: [...C0.seen] };
  const dMe = res.digests ? res.digests.me : digest(res.tel, res.sides.me);
  const dAi = res.digests ? res.digests.ai : digest(res.tel, res.sides.ai);
  C.digests.push({ me: compact(dMe), ai: compact(dAi) });
  C.results.push({ battle: BATTLES[C.battle].id, won: dMe.won, exchange: dMe.exchange, lossMine: dMe.lossMine, lossEnemy: dMe.lossEnemy });
  C.seen.push(visibleChanges(C0, dMe));
  if (C.battle >= BATTLES.length - 1) {
    return { ...C, phase: 'done', me: finish(C.me), ai: finish(C.ai) };
  }
  const k = C.battle + 1, s = C.opts.seed;
  const obsMe = observe(dMe, null, { learner: C.me, rng: lrng(s, 'obs', 'me', k) });
  const obsAi = observe(dAi, null, { learner: C.ai, rng: lrng(s, 'obs', 'ai', k) });
  C.me = beginPhase(C.me, obsMe, { enemyUsed: dMe.enemyUsed, captured: dMe.captured });
  C.ai = beginPhase(C.ai, obsAi, { enemyUsed: dAi.enemyUsed, captured: dAi.captured });
  C.phase = 'learn';
  return C;
}

// What the digest keeps for replay (hash) and learning; drops per-row detail.
function compact(d) {
  return { role: d.role, won: d.won, exchange: d.exchange, lossMine: d.lossMine, lossEnemy: d.lossEnemy,
    samples: d.samples, enemyUsed: d.enemyUsed, ctx: d.ctx, captured: d.captured };
}

/** The player's learning action. env.micro overrides the test runner (real engine). */
export function playerAction(C, action, env = {}) {
  const n = C.log.filter(x => x.battle === C.battle).length;
  const { state, result } = applyAction(C.me, action, lrng(C.opts.seed, 'act', 'me', C.battle, n), env);
  if (!result.ok) return { campaign: C, result };
  return { campaign: { ...C, me: state, log: [...C.log, { battle: C.battle, ...action }] }, result };
}

/** End the learning phase: the computer chooses and acts, both armies train, next battle. */
export function endLearning(C, env = {}) {
  const s = C.opts.seed, k = C.battle + 1;
  const ai = runChooser(C.ai, lrng(s, 'choose', 'ai', k), env);
  return { ...C, ai: endPhase(ai, lrng(s, 'end', 'ai', k)), me: endPhase(C.me, lrng(s, 'end', 'me', k)), battle: k, phase: 'battle' };
}

/** Scripted chooser (SPEC §6.6): analyze the strongest observations, test, codify, train.
 * Also the player proxy in campaign-sim. Greedy; recomputes after every action. */
export function chooseAction(L) {
  const lvl = assessLevel(L.dials.assess);
  const cs = Object.entries(L.cards);
  const est = c => (c.est != null ? c.est : (c.obs ? apparentValue(L, c.obs) : -1));
  const good = c => !c.falseKnown && est(c) > LEARN.codifyThreshold;
  const best = list => list.sort((a, b) => est(b[1]) - est(a[1]))[0];
  const blocked = id => L.constraints.some(k => CONSTRAINTS[k].blocks.includes(id));
  let x;
  if ((x = cs.find(([, c]) => c.st === 'codified'))) return { kind: 'train', card: x[0] };
  if ((x = best(cs.filter(([id, c]) => c.st === 'tested' && good(c) && !blocked(id))))) return { kind: 'codify', card: x[0] };
  if (lvl === 'conduit' && (x = best(cs.filter(([id, c]) => c.st === 'candidate' && good(c) && !blocked(id))))) return { kind: 'codify', card: x[0] };
  if (L.dials.lat === 1 && !L.staffForward && L.obs.length && L.actionsLeft >= 2) return { kind: 'staffForward' };
  if ((x = best(cs.filter(([, c]) => c.st === 'candidate' && good(c) && c.tests === 0)))) return { kind: 'test', card: x[0] };
  // Re-test once when the cell blames execution for a poor result (p. 71).
  if ((x = cs.find(([, c]) => c.st === 'tested' && c.attr === 'execution' && c.tests === 1 && !good(c)))) return { kind: 'test', card: x[0] };
  if ((x = best(cs.filter(([, c]) => c.st === 'observed' || (c.st === 'candidate' && c.fresh))))) return { kind: 'analyze', card: x[0] };
  if ((x = cs.find(([id, c]) => L.enemyUsed.includes(id) && ['unknown', 'observed', 'candidate'].includes(c.st)))) return { kind: 'study', card: x[0] };
  if (cs.some(([, c]) => c.st === 'training')) return { kind: 'pullBattalion' };
  return null;
}

export function runChooser(L0, rng, env = {}) {
  let L = L0;
  for (let guard = 0; guard < 10 && L.actionsLeft > 0; guard++) {
    const a = chooseAction(L);
    if (!a) break;
    const r = applyAction(L, a, rng, env);
    if (!r.result.ok) break;
    L = r.state;
  }
  return L;
}

/** What the player can see of the opponent's changes: only effects shown in battle (SPEC §6.6). */
export function visibleChanges(C, dMe) {
  const before = new Set(C.digests.length ? C.digests[C.digests.length - 1].me.enemyUsed : []);
  return (dMe.enemyUsed || []).filter(id => !before.has(id)).map(id => byId[id].seen);
}

/** Campaign review figures (SPEC §6.7). */
export function campaignScores(C) {
  const me = scores(C.me), ai = scores(C.ai);
  return {
    battles: C.results,
    me: { ...me, wins: C.results.filter(r => r.won).length },
    ai: { ...ai, wins: C.results.filter(r => r.won === false).length },
    timeline: { me: C.me.timeline, ai: C.ai.timeline, seasons: SEASONS },
  };
}

// ---- Share-link token (SPEC §9.6 `c=`): inputs + digests + action log; rebuilt by replay. ----
export function encodeCampaign(C) {
  return JSON.stringify({ v: 1, o: C.opts, a: C.aiArch, d: C.digests, l: C.log, b: C.battle, p: C.phase });
}

/** Rebuild a campaign from its token. Returns null on an unknown version (caller shows the friendly message). */
export function decodeCampaign(token, env = {}) {
  let t;
  try { t = JSON.parse(token); } catch { return null; }
  if (!t || t.v !== 1) return null;
  let C = newCampaign({ ...t.o, aiArch: t.a });
  for (let b = 0; b < t.d.length; b++) {
    C = recordBattle(C, { digests: t.d[b] });
    for (const a of t.l.filter(x => x.battle === b)) { const { battle, ...act } = a; C = playerAction(C, act, env).campaign; }
    if (C.phase === 'learn' && (b < t.d.length - 1 || t.b > b)) C = endLearning(C, env);
  }
  return C;
}

export { ARCHETYPES };
