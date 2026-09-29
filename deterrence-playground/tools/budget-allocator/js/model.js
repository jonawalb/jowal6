// Notional crossing model. Every coefficient here is illustrative; see the method section on the page.
import { CATS, CAT, CROSSING } from '../data/categories.js';

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/** Capability level 0..1 after spending `bn` on top of the notional baseline, with diminishing returns. */
export function capability(c, bn) {
  if (c.id === 'other') return 0;
  return 1 - (1 - c.base) * Math.exp(-bn / c.k);
}

/**
 * Evaluate an allocation.
 * shares: {catId: fraction of total}, total: NT$bn, sc: { supp: 0..0.9 PLA suppression, warn: days of warning }
 */
export function evaluate(shares, total, sc) {
  const bn = Object.fromEntries(CATS.map(c => [c.id, (shares[c.id] || 0) * total]));
  const E = Object.fromEntries(CATS.map(c => [c.id, capability(c, bn[c.id])]));
  const supp = sc.supp;
  // Survival of Taiwan's forces after the PLA's opening suppression campaign.
  const surv = {
    mobile: clamp(1 - supp * (1 - 0.55 * E.c4isr) * (1 - 0.35 * E.airdef)),
    fixed: clamp(1 - supp * (1 - 0.6 * E.airdef)),
    platform: clamp(1 - 1.1 * supp * (1 - 0.35 * E.airdef)),
  };
  // Share of the planned minefield laid before the assault: more warning, more mines in the water.
  const laid = 1 - Math.exp(-sc.warn / 3.5);
  // Can Taiwan still find and track the fleet? Resilient sensors and networks survive suppression better.
  const track = 0.55 + 0.45 * E.c4isr * (1 - 0.4 * supp);
  // Can shooters keep firing across successive waves?
  const sustain = 0.6 + 0.4 * E.ammo;

  const layers = CATS.filter(c => c.w > 0).map(c => {
    let st;
    if (c.id === 'mines') st = E.mines * laid;
    else if (c.id === 'drones') st = E.drones * surv.mobile * (0.5 + 0.5 * track) * sustain;
    else st = E[c.id] * surv[c.cls] * track * sustain;
    return { id: c.id, t: c.t, col: c.col, reach: c.reach, st, p: c.w * st, active: st >= 0.1 };
  });
  const engaged = 1 - layers.reduce((a, l) => a * (1 - l.p), 1);
  const kmh = CROSSING.knots * 1.852;
  // Hours under fire: the stretch of the crossing where the layers that reach it add up to real pressure.
  let covered = 0;
  for (let d = 0.5; d < CROSSING.km; d += 1) {
    if (layers.filter(l => l.reach >= d).reduce((a, l) => a + l.st, 0) >= 0.3) covered += 1;
  }
  const hours = CROSSING.km / kmh, fireHours = covered / kmh;
  const resilience = 100 * clamp(0.3 * E.c4isr + 0.25 * E.ammo + 0.2 * E.airdef + 0.25 * surv.mobile);
  return { bn, E, surv, laid, track, sustain, layers, engaged, hours, fireHours, covered, resilience, unscored: shares.other || 0 };
}

export function verdict(r) {
  if (r.engaged >= 0.45) return { s: 'good', b: 'Costly crossing', t: 'A large share of the crossing force comes under effective attack.' };
  if (r.engaged >= 0.28) return { s: 'warn', b: 'Contested crossing', t: 'Taiwan engages part of the force, but most of it arrives untouched.' };
  return { s: 'bad', b: 'Crossing largely unopposed', t: 'Too little of Taiwan\'s firepower survives, sees the fleet or reaches it.' };
}

/** One or two sentences naming what drives the result. */
export function explain(r) {
  const top = [...r.layers].sort((a, b) => b.p - a.p);
  const out = [];
  if (top[0].p > 0.05) out.push(`<b>${top[0].t}</b> do the most work in this plan${top[1].p > 0.05 ? `, followed by ${top[1].t.charAt(0).toLowerCase() + top[1].t.slice(1)}` : ''}.`);
  if (r.surv.mobile < 0.55) out.push(`Only ${Math.round(r.surv.mobile * 100)}% of mobile launchers survive the opening strikes; air defense and resilience spending protect them.`);
  if (r.surv.platform < 0.45 && r.E.platforms > 0.35) out.push(`Large platforms are few and easy to find, so only ${Math.round(r.surv.platform * 100)}% remain after suppression.`);
  if (r.track < 0.65) out.push('Weak sensors and networks leave shooters without good tracks on the fleet.');
  if (r.laid < 0.6 && r.E.mines > 0.3) out.push(`With short warning only ${Math.round(r.laid * 100)}% of the minefield is laid in time.`);
  if (r.unscored > 0.01) out.push(`${Math.round(r.unscored * 100)}% of the money sits in lines the model cannot score.`);
  return out.join(' ');
}

/** Hash-friendly key for a mix. */
export const mixKey = shares => CATS.map(c => Math.round((shares[c.id] || 0) * 1000)).join('.');
export { CAT };
