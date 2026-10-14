// Maneuver Trainer core: scoring. Owner's order: objective first, then friendly losses, then time.
// Tier (1 secured / 2 partly / 3 failed) dominates; inside a tier fewer friendly casualties rank
// higher; time breaks ties (for a delay, time HELD counts instead). Shown as a grade A–F plus the
// three numbers, e.g. "Objective secured · 2 vs 6 down · 4:35". Pure.

const TIER_BASE = { 1: 1000, 2: 600, 3: 200 };
const TIER_TEXT = { 1: "Objective secured", 2: "Partly accomplished", 3: "Mission failed" };
const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export function scoreRun(S, api) {
  const d = S.done || { tier: 3, reason: "not finished", t: S.t };
  const fDown = api.down("f"), hDown = api.down("h"), cap = api.captured("h");
  const lossFrac = S.totalF ? fDown / S.totalF : 0;
  const limit = S.scen.timeLimit;
  const tFrac = S.scen.scoreTime === "held" ? 1 - Math.min(1, d.t / limit) : Math.min(1, d.t / limit);
  const score = Math.round(TIER_BASE[d.tier] - 400 * lossFrac - 4 * tFrac); // time only breaks ties
  const grade = score >= 900 ? "A" : score >= 820 ? "B" : score >= 700 ? "C" : score >= 450 ? "D" : "F";
  const tierText = S.scen.tierText?.[d.tier] || TIER_TEXT[d.tier];
  return {
    tier: d.tier, tierText, reason: d.reason, score, grade, friendlyDown: fDown, enemyDown: hDown, enemyCaptured: cap,
    friendlyTotal: S.totalF, enemyTotal: S.totalH, time: d.t, clock: clock(d.t),
    line: `${tierText} · ${fDown} vs ${hDown} down${cap ? ` (+${cap} captured)` : ""} · ${clock(d.t)}`,
    notional: true,
  };
}
