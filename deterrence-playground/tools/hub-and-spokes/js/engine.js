// Hub and Spokes: the pure game engine (no DOM). A year is brief → act → (crisis → respond) → close.
// Every function returns a new state; the input is never mutated. All numbers are illustrative (see METHOD.md).
import { P } from '../data/params.js';
import { ALLIES, IDS, BY } from '../data/allies.js';
import { BY_ID, costOf } from '../data/actions.js';
import { EVENTS, EVENT_CHANCE } from '../data/events.js';
import { makeRng, STREAM } from './rng.js';

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const clone = s => JSON.parse(JSON.stringify(s));
const rng = (s, stream, dice = 0) => makeRng(s.seed, stream + s.turn, dice);

/** The assurance level at which an ally is comfortable: higher for the exposed and the fearful. */
export const target = x => 30 + 30 * x.exposure + 25 * x.fear;
/** Abandonment fear, 0–100: zero at the top of the comfort band, about 50 at its centre. */
export const fearIdx = x => clamp(2 * (target(x) - x.A + P.band));
export const budgetOf = s => Math.max(3, P.budget - Math.floor(s.strain / P.strainPerBudget) - (s.budgetCut || 0));

export function newGame({ seed }) {
  const r = makeRng(seed, STREAM.setup);
  const span = ([lo, hi]) => lo + (hi - lo) * r.u();
  const allies = {};
  for (const a of ALLIES) {
    const x = { exposure: a.exposure, base: a.effort, effort: a.effort, fear: span(a.fear), risk: span(a.risk), autonomy: span(a.autonomy),
      coh: 60, entrap: 10, presence: 0, stake: 0, links: [], hedged: null, last: [] };
    x.A = Math.round(target(x) - 4 + 8 * r.u());
    allies[a.id] = x;
  }
  const s = { seed, turn: 0, phase: 'plan', over: false, briefed: false, ...P.start, allies, event: null, probes: {},
    crisis: null, wars: [], moves: [], log: [], track: [] };
  s.track.push(snap(s));
  return s;
}

/** Per-year record for the debrief: true assurance, target, fear and entrapment for each ally. */
function snap(s) {
  return { turn: s.turn, cred: Math.round(s.cred), war: Math.round(s.war), strain: Math.round(s.strain),
    allies: Object.fromEntries(IDS.map(id => { const x = s.allies[id]; return [id, { A: Math.round(x.A), T: Math.round(target(x)), fear: Math.round(fearIdx(x)), entrap: Math.round(x.entrap), coh: Math.round(x.coh), effort: Math.round(x.effort) }]; })) };
}

/** Start of year: one domestic-politics or wider event, then the Rival chooses whom to probe. */
export function brief(s0) {
  if (s0.briefed || s0.over) return s0;
  const s = clone(s0);
  s.briefed = true; s.budgetCut = 0; s.event = null; s.probes = {}; s.lastCrisis = null;
  const r = rng(s, STREAM.event);
  if (r.u() < EVENT_CHANCE) {
    const pool = [];
    for (const e of EVENTS) {
      if (e.ally) for (const id of IDS) pool.push([e, id, e.w(s.allies[id])]);
      else pool.push([e, null, e.w(s)]);
    }
    const [e, id] = pool[r.pick(pool.map(p => p[2]))];
    e.apply(s, id ? s.allies[id] : null);
    s.event = { id: e.id, ally: id, title: e.title, text: e.text(id ? BY[id] : null) };
  }
  const rp = rng(s, STREAM.probe);
  for (const id of IDS) {
    const x = s.allies[id];
    const weak = clamp(1 - (0.5 * x.A + 0.3 * s.cred + 12 * x.presence) / 100, 0, 1);
    const p = P.probeBase * x.exposure * (0.5 + 1.5 * weak) * (x.hedged === 'accommodate' ? 0.6 : 1);
    const roll = rp.u(), size = 0.5 + 0.5 * rp.u();
    if (roll < p) { s.probes[id] = Math.round(size * 100) / 100; x.A = clamp(x.A - 5 * size); s.war = clamp(s.war + 2); }
  }
  s.budget = budgetOf(s);
  return s;
}

/** Keep only legal, affordable, non-duplicate acts, in order. */
export function legalActs(s, acts) {
  let left = budgetOf(s);
  const seen = new Set(), out = [];
  for (const a of acts || []) {
    const def = BY_ID[a.id];
    if (!def || !BY[a.ally] || seen.has(a.ally + a.id)) continue;
    let f = a.f ?? null;
    if (def.follow?.partner) { if (!BY[f] || f === a.ally) continue; }
    else if (def.follow && !def.follow.opts.some(o => o.id === f)) f = def.follow.opts[0].id;
    const c = costOf(a.id, f);
    if (c > left) continue;
    left -= c; seen.add(a.ally + a.id); out.push({ ally: a.ally, id: a.id, f });
  }
  return out;
}

function applyFx(s, x, fx, k, logFx) {
  if (fx.A) x.A = clamp(x.A + fx.A * (fx.A > 0 ? k : 1));
  if (fx.entrap) x.entrap = clamp(x.entrap + fx.entrap);
  if (fx.effort) x.effort = clamp(x.effort + fx.effort);
  if (fx.coh) x.coh = clamp(x.coh + fx.coh);
  if (fx.presence) x.presence = Math.min(2, x.presence + fx.presence);
  if (fx.stake) x.stake = Math.max(x.stake, fx.stake);
  if (fx.strain) s.strain = clamp(s.strain + fx.strain);
  logFx.push(fx);
}

/** The player's (or computer's) allocation for the year, then the allies respond and a crisis may erupt. */
export function act(s0, acts0) {
  const s = clone(brief(s0));
  const acts = legalActs(s, acts0);
  const log = [];
  for (const a of acts) {
    const def = BY_ID[a.id], x = s.allies[a.ally];
    const opt = def.follow && !def.follow.partner ? def.follow.opts.find(o => o.id === a.f) : null;
    const fx = { ...def.fx, ...(opt?.fx || {}) };
    const fatigue = x.last.includes(a.id) ? 0.6 : 1;
    applyFx(s, x, fx, fatigue, []);
    if (def.follow?.partner) {
      const y = s.allies[a.f];
      const k = Math.min(x.coh, y.coh) < 35 ? 0.5 : 1;
      applyFx(s, y, { A: fx.A * k, effort: fx.effort * k, coh: fx.coh * k }, 1, []);
      if (k === 1 && !x.links.includes(a.f)) { x.links.push(a.f); y.links.push(a.ally); }
      log.push({ kind: 'act', ...a, half: k < 1 });
    } else log.push({ kind: 'act', ...a, fatigue: fatigue < 1 });
  }
  for (const id of IDS) s.allies[id].last = acts.filter(a => a.ally === id).map(a => a.id);
  respondAllies(s, log);
  s.moves.push({ acts, r: null });
  s.track.push(snap(s));
  const crisis = rollCrisis(s);
  if (crisis) { s.crisis = crisis; s.phase = 'crisis'; log.push({ kind: 'crisis', ...crisis }); s.log = log; return { state: s, log }; }
  closeYear(s);
  s.log = log;
  return { state: s, log };
}

/** How each ally reacts to how assured it feels: hedge when under-reassured, free-ride or take risks when over. */
function respondAllies(s, log) {
  for (const id of IDS) {
    const x = s.allies[id];
    x.A = clamp(x.A - P.assuranceDecay + P.credPull * (s.cred - x.A) + 3 * x.presence);
    x.effort = clamp(x.effort - 1.5 * x.presence + 1 * x.links.length);
    s.strain = clamp(s.strain + 3 * x.presence);
    const gap = x.A - target(x);
    let mood = 'steady';
    if (gap < -P.band) {
      const f = Math.min(1, (-gap - P.band) / 25);
      x.coh = clamp(x.coh - 7 * f);
      if (x.autonomy > 0.55) { x.effort = clamp(x.effort + 4 * f); x.entrap = clamp(x.entrap + 4 * f); mood = 'deterrent'; }
      else { x.coh = clamp(x.coh - 4 * f); x.effort = clamp(x.effort - 2 * f); mood = 'accommodate'; }
      if (f > 0.5 && x.hedged !== mood) { x.hedged = mood; s.cred = clamp(s.cred - 3); log.push({ kind: 'hedge', ally: id, mood }); }
    } else if (gap > P.band) {
      const m = Math.min(1, (gap - P.band) / 25);
      x.effort = clamp(x.effort - 5 * m);
      x.entrap = clamp(x.entrap + (5 + 14 * x.risk) * m);
      mood = 'emboldened';
      if (m > 0.5) log.push({ kind: 'bold', ally: id });
    } else {
      x.coh = clamp(x.coh + 2.5);
      x.effort = clamp(x.effort + (x.base - x.effort) * 0.1);
      if (x.hedged && gap > -P.band / 2) x.hedged = null;
    }
    x.coh = clamp(x.coh + (x.A - 50) * 0.05);
    x.mood = mood;
  }
}

function rollCrisis(s) {
  const r = rng(s, STREAM.crisis);
  let best = null;
  for (const id of IDS) {
    const x = s.allies[id];
    const prov = 0.005 * x.entrap * (0.5 + x.risk), probe = s.probes[id] ? 0.2 * s.probes[id] : 0;
    const p = P.crisisBase * x.exposure + prov + probe + s.war / 1000;
    const roll = r.u(), kindRoll = r.u();
    if (roll < p && (!best || p - roll > best.margin)) best = { ally: id, kind: kindRoll * (prov + probe + 1e-9) < prov ? 'provoked' : 'probe', margin: p - roll };
  }
  if (!best) return null;
  const a = BY[best.ally];
  const text = best.kind === 'provoked'
    ? `${cap(a.name)} has pushed its luck: ships sent to a disputed feature, a strike threatened. The Rival answers. They expect you behind them.`
    : `The Rival leans on ${a.name}: an incursion, a blockade drill, a seized boat. Everyone wants to see what you do.`;
  return { ally: best.ally, kind: best.kind, title: best.kind === 'provoked' ? 'A crisis your ally started' : 'The Rival tests your commitment', text };
}
const cap = t => t[0].toUpperCase() + t.slice(1);

/** War odds for each response, given what the player can see (used for the decision screen too). */
export function warOdds(s, c, resp) {
  const x = s.allies[c.ally], weak = 1 - s.cred / 100;
  const t = c.kind === 'probe'
    ? { full: 0.03 + 0.12 * weak, restrain: 0.05 + 0.16 * weak, out: 0.12 }
    : { full: 0.1 + 0.3 * x.risk, restrain: 0.04 + 0.08 * x.risk, out: 0.05 + 0.1 * x.risk };
  return Math.min(0.9, t[resp] + s.war / 600);
}

/** The player's answer to the year's crisis. */
export function respond(s0, resp) {
  if (!s0.crisis) return { state: s0, log: [] };
  if (!['full', 'restrain', 'out'].includes(resp)) resp = 'restrain';
  const s = clone(s0), c = s.crisis, x = s.allies[c.ally], probe = c.kind === 'probe';
  const stakeK = 1 + 0.5 * x.stake, log = [];
  const others = IDS.filter(id => id !== c.ally).map(id => s.allies[id]);
  const damp = y => 1 - 0.25 * Math.min(2, y.links.length);
  if (resp === 'full') {
    x.A = clamp(x.A + 15); x.coh = clamp(x.coh + 8);
    s.cred = clamp(s.cred + (probe ? 10 : 2));
    for (const y of others) { y.A = clamp(y.A + 4); y.entrap = clamp(y.entrap + 5 * (0.5 + y.risk)); }
    s.war = clamp(s.war + (probe ? 5 : 12)); s.strain = clamp(s.strain + 8);
  } else if (resp === 'restrain') {
    x.A = clamp(x.A + 4); x.entrap = clamp(x.entrap - 15);
    s.cred = clamp(s.cred + (probe ? 3 : 4));
    for (const y of others) y.A = clamp(y.A + 1);
    s.war = clamp(s.war + 3); s.strain = clamp(s.strain + 4);
  } else {
    x.A = clamp(x.A - 18 * stakeK); x.coh = clamp(x.coh - 12); x.entrap = clamp(x.entrap - 20);
    s.cred = clamp(s.cred - (probe ? 10 : 3) * stakeK);
    for (const y of others) y.A = clamp(y.A - (probe ? 7 : 2) * stakeK * y.exposure * damp(y));
    s.war = clamp(s.war - 2);
  }
  const p = warOdds(s0, c, resp);
  const roll = makeRng(s.seed, STREAM.war + s.turn).u();
  const war = roll < p;
  if (war) {
    s.wars.push({ turn: s.turn, ally: c.ally, kind: c.kind, resp });
    s.war = clamp(s.war + 20);
    if (resp === 'out') { x.coh = clamp(x.coh - 15); s.cred = clamp(s.cred - 5); } else s.strain = clamp(s.strain + 15);
  }
  log.push({ kind: 'outcome', ally: c.ally, crisis: c.kind, resp, p, roll, war, stake: x.stake });
  s.moves[s.moves.length - 1].r = resp;
  s.lastCrisis = { ...c, resp, war, p };
  s.track[s.track.length - 1] = snap(s);
  closeYear(s);
  s.log = [...(s0.log || []).filter(l => l.kind !== 'crisis'), ...log];
  return { state: s, log };
}

function closeYear(s) {
  s.strain = clamp(s.strain * P.strainDecay);
  s.war = clamp(s.war * P.warDecay);
  for (const id of IDS) s.allies[id].entrap = clamp(s.allies[id].entrap * P.entrapDecay);
  s.crisis = null; s.briefed = false; s.phase = 'plan';
  s.turn += 1;
  if (s.turn >= P.turns) { s.over = true; s.phase = 'over'; }
}

/* ---------- Copy link: seed + every year's choices ---------- */
const ACT_IDS = Object.keys(BY_ID);
const b64 = str => (typeof btoa === 'function' ? btoa(str) : Buffer.from(str, 'binary').toString('base64')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = str => { const t = str.replace(/-/g, '+').replace(/_/g, '/'); return typeof atob === 'function' ? atob(t) : Buffer.from(t, 'base64').toString('binary'); };
export function encode(s) {
  const mv = s.moves.map(m => [m.acts.map(a => [IDS.indexOf(a.ally), ACT_IDS.indexOf(a.id), a.f ?? 0]), m.r ? m.r[0] : 0]);
  return `h1.${s.seed}${mv.length ? '.' + b64(JSON.stringify(mv)) : ''}`;
}
export function decode(str) {
  const [v, seed, mv] = String(str).split('.');
  if (v !== 'h1' || !/^\d+$/.test(seed || '')) return null;
  let moves = [];
  try {
    moves = mv ? JSON.parse(unb64(mv)).map(([acts, r]) => ({
      acts: (acts || []).map(([i, j, f]) => ({ ally: IDS[i], id: ACT_IDS[j], f: f === 0 ? null : f })).filter(a => a.ally && a.id),
      r: { f: 'full', r: 'restrain', o: 'out' }[r] || null })) : [];
  } catch { moves = []; }
  return { seed: +seed, moves };
}

/** Replay a decoded link (or any list of moves) from the start. Stops at the first unanswered crisis. */
export function replay(seed, moves) {
  let s = newGame({ seed });
  for (const m of moves) {
    if (s.over) break;
    s = act(s, m.acts).state;
    if (s.crisis) { if (!m.r) break; s = respond(s, m.r).state; }
  }
  return brief(s);
}
