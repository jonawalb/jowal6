// Diversion: game parameters. EVERY value in this file is NOTIONAL game design, chosen so that the
// mechanisms the public record describes (shell companies, hub shifts, split shipments, rented cloud
// compute, slow rulemaking, allied fatigue) show up in play. None is an estimate of real volumes,
// budgets or effects. The rationale for each block is in the page's Method panel and data/SOURCES.md.
// External reference for real volumes (NOT used to calibrate anything here): CNAS working paper by Erich Grunewald and
// Tim Fist, "Countering AI Chip Smuggling Has Become a National Security Priority" (June 11, 2025), which estimates
// 10,000 to several hundred thousand AI chips smuggled to the PRC in 2024 (median around 140,000) and sets out countermeasures.
// https://www.cnas.org/publications/reports/countering-ai-chip-smuggling-has-become-a-national-security-priority
export const P = {
  lengths: [8, 10, 12],          // quarters the player can choose
  budget: 10,                    // enforcement capacity per quarter (notional units, does not carry over)
  capital0: 40, capitalRegen: 6, capitalMax: 100,
  revenue0: 100, goodwill0: 65,  // US industry revenue index and allied goodwill (0-100)

  // Restricted end users' demand for diverted compute (notional compute units, CU, per quarter)
  demand0: 100, demandGrowth: 4,

  // Network at the start. Hubs are notional and unnamed on purpose: real routes appear only on case cards.
  hubs: [
    { id: 'A', name: 'Hub A', cap: 45, x: 0.46, y: 0.31 },
    { id: 'B', name: 'Hub B', cap: 35, x: 0.46, y: 0.55 },
    { id: 'C', name: 'Hub C', cap: 30, x: 0.46, y: 0.80 },
    { id: 'D', name: 'Hub D', cap: 0, x: 0.72, y: 0.86 },   // dormant until the network moves volume there
  ],
  shellsPerHub: 2,               // shells a hub needs to run at full capacity
  cloud0: 15, cloudStep: 12, cloudStepKyc: 5, cloudMax: 80,

  // Risk and choice
  beta: 4,                       // how strongly the network routes away from risk (logit)
  eucP: 0.14, hubP: 0.10, agentP: 0.04, eucMax: 0.5,
  splitCut: 0.12, splitDrag: 0.08, splitMax: 3,
  kycCut: 0.55, kycLag: 2, offshoreStep: 0.08, offshoreMax: 0.4,
  lvCut: 0.40, lvLag: 3, spoofStep: 0.08, spoofMax: 0.5,
  relaxCap: 0.12,                // extra legitimate volume at hubs gives diverters more cover
  deterAgent: 0.04, deterCase: 0.03, deterMax: 0.35,
  noise: 0.10,

  // Detection of hidden shells
  detBase: 0.10, detEuc: 0.22, detAgent: 0.08, detFlow: 0.15,
  // Adaptation
  spawnP: 0.85, spawnAgent: 0.15, spawnElsewhere: 0.3, extraShellP: 0.25,
  shiftAt: 0.18, shiftKeep: 0.75, shiftMove: 0.8,
  cloudTrigger: 0.20,
  caseP: 0.12, caseHit: 0.85, caseCapital: 4,

  // Political and trade effects
  revFloor: 92, revDrag: 3, revMax: 108, revDrift: 1, gwDrift: 1,
  // Side effects of each lever on industry revenue (rev), allied goodwill (gw) and friction on legitimate trade (fr)
  fx: {
    list:  { rev: -0.3, gw: -0.5, fr: 0.5 },
    euc:   { gw: -0.5, fr: 0.4 },
    hub:   { rev: -0.5, gw: -3, frPerLvl: 0.6 },
    kyc:   { gwOnce: -2, revPerQ: -1.5, frPerQ: 1.5 },
    lv:    { revOnce: -6, gwOnce: -4, revPerQ: -0.5, frPerQ: 2 },
    relax: { cap: 10, rev: 4, gw: 6, fr: -1.5 },
  },
  scoreDiv: 65, scoreCost: 35, costScale: 120,
};

export const quarterLabel = t => `Quarter ${t + 1}`;
