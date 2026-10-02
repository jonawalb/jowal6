// Micro-battles for "Raise experimental unit" (SPEC §6.3): 40 rollouts with a card on vs off.
// Hunzeker p. 71: the first test of a sound idea failed through execution (piecemealed troops, wrong
// guns), so every test returns a result AND a cause (concept vs execution) that the assessment cell
// then has to read correctly (learning.js applies the attribution accuracy).
import { CARDS, LEARN } from '../data/campaign.js';

const byId = Object.fromEntries(CARDS.map(c => [c.id, c]));
const EXEC_FAIL = 0.15;        // NOTIONAL: chance the experimental unit is misused (p. 71)
const EXEC_PENALTY = 0.4;      // NOTIONAL: effect lost when it is
const ROLLOUT_SD = 0.6;        // NOTIONAL: per-rollout spread of the measured effect
const MICRO_HOURS = 12;        // W3: micro-battles stop after 12 hours (speed: ~100 ms a test with 10 paired games)

/** Stub test: the card's NOTIONAL true effect, sampled over 40 rollouts, with execution failure.
 * Used until the real engine is wired, and as the fallback when no engine is supplied.
 * @returns {{eff:number, sd:number, n:number, cause:'concept'|'execution'}} */
export function stubTest(cardId, L, rng) {
  const card = byId[cardId], n = LEARN.testRollouts;
  const exec = rng.u() < EXEC_FAIL;
  const mean = card.effect - (exec ? EXEC_PENALTY : 0);
  const sd = ROLLOUT_SD / Math.sqrt(n);
  const eff = Math.round((mean + sd * rng.normal()) * 100) / 100;
  const cause = exec ? 'execution' : 'concept';
  return { eff, sd: Math.round(sd * 100) / 100, n, cause };
}

// ---- Real-engine micro-battle ----
// A compact Division battle with the tested side's units all trained (card on) or none (card off),
// both sides scripted. The measured effect is the relative change in the card's metric, read from the
// same telemetry digest the campaign uses, so the evidence comes from the model itself (D-25 note).

/** Build a micro test function bound to the engine (SPEC §6.3 "Raise experimental unit").
 * engine: { newGame, applyPlan, advance }; opts: { digest, plans: { def: g => plan, att: g => plan },
 *   era, scale = 'd', hours = 12, rollouts = LEARN.testRollouts, players: () => ({ def, att }) }. Each pair of games shares a seed; in the "on" game the
 *   tested side's units know the card (half fidelity on an execution failure), in the "off" game they do not.
 * @returns {(cardId:string, L:object, rng:object) => {eff:number, sd:number, n:number, cause:string}} */
export function engineTest(engine, opts) {
  const { digest, rollouts = LEARN.testRollouts } = opts;
  return (cardId, L, rng) => {
    const card = byId[cardId], side = L.role;
    const seed0 = 1 + Math.floor(rng.u() * 900000);
    const exec = rng.u() < EXEC_FAIL;
    const effs = [];
    for (let k = 0; k < rollouts / 2; k++) {
      const on = runOnce(engine, opts, side, cardId, exec ? 0.5 : 1, seed0 + k);
      const off = runOnce(engine, opts, side, cardId, 0, seed0 + k);
      const m = metricOf(card, digest(on.tel, side), digest(off.tel, side), on.ground, off.ground, side);
      if (m != null) effs.push(m);
    }
    if (!effs.length) return stubTest(cardId, L, rng);
    const mean = effs.reduce((s, x) => s + x, 0) / effs.length;
    const sd = Math.sqrt(effs.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, effs.length - 1)) / Math.sqrt(effs.length);
    return { eff: Math.round(mean * 100) / 100, sd: Math.round(sd * 100) / 100, n: effs.length * 2, cause: exec ? 'execution' : 'concept' };
  };
}

// Card on vs off (positive = the card helps): the relative change in my side's loss-exchange ratio plus the relative
// change in ground (sectors the attacker holds in the defender's zones; W3: an army judges a method by the ground it
// takes or keeps as well as by the losses), clamped to [-1, 1].
function metricOf(card, dOn, dOff, gOn = 0, gOff = 0, side = 'att') {
  const xOn = dOn.exchange, xOff = dOff.exchange;
  if (xOn == null || xOff == null || !(xOff > 0)) return null;
  const ex = (xOn - xOff) / Math.max(xOn, xOff);
  const gd = Math.max(gOn, gOff) > 0 ? (gOn - gOff) / Math.max(gOn, gOff) * (side === 'att' ? 1 : -1) : 0;
  return Math.max(-1, Math.min(1, ex + gd));
}

/** Sectors the attacker holds in the defender's zones (outpost row and deeper). */
function groundOf(g) {
  let n = 0;
  for (let s = 0; s < g.ctrl.length; s++) if (g.ctrl[s] === 2 && Math.floor(s / g.cols) >= ATT_ZONE_ROW) n++;
  return n;
}
const ATT_ZONE_ROW = 3;   // the outpost line at every scale (data/scales.js bands.outpost[0])

/**
 * W3: what an experimental unit trained in a card does differently (Hunzeker p. 71: the test is of a method, not
 * of a badge). Profile overrides for the tested side's computer commander, card on vs off ("the old way"). Cards
 * whose effect is only in training (AT3 organic firepower, CA1 predicted fire, CA2 liaison) need no override.
 */
export const METHOD = {
  AT1: { off: { form: 'waves' } },
  AT2: { on: { infil: true }, off: { infil: false } },
  CA3: { on: { tanks: 'support' }, off: { tanks: 'lead' } },
  ED1: { off: { planAs: { base: 'forwardHeavy', lanes: 'lateral', fwdShare: 0.65, stanceAll: null } } },
  ED2: { off: { stanceAll: 'hold' } },
  ED3: { off: { cs: 'deliberate', csExtra: 2, riposte: false } },
};

function runOnce(engine, opts, side, cardId, level, seed) {
  const doctrine = { [side]: () => ({ [cardId]: level }) };
  // W3: opts.players(side, overrides) gives scripted commanders for both sides (the computer's policies), so the
  // units fight the battle instead of standing on their H-hour orders; the tested side uses the card's method
  // (METHOD) when trained. opts.plans then only fill in sides without a .plan.
  const M = METHOD[cardId] || {}, over = (level > 0 ? M.on : M.off) || {};
  const players = opts.players ? opts.players(side, over) : undefined;
  const g = engine.newGame({ seed, scale: opts.scale || 'd', era: opts.era || 'w', mode: 'campaign', doctrine, campaign: { ctx: {} }, players });
  if (g.phase === 'plan') {
    if (!g.plans.def) engine.applyPlan(g, 'def', opts.plans.def(g));
    if (!g.plans.att) engine.applyPlan(g, 'att', opts.plans.att(g));
  }
  for (let h = 0; h < (opts.hours || MICRO_HOURS) && !g.over; h++) engine.advance(g);
  return { tel: g.telemetry, ground: groundOf(g) };
}
