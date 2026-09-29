// Attack types, their presets, and the default state (also used by the walkthrough).
export const KINDS = {
  fear: { t: 'Fear', s: 'Overweight threatening news (λ > 1)', x: [1, 4, 0.05], preset: { mu0: 0, theta: 0, x: 2.5 }, lab: 'Gain on threatening news', sym: 'λ' },
  trust: { t: 'Distrust of reassurance', s: 'Underweight reassuring news (λ < 1)', x: [0.05, 1, 0.01], preset: { mu0: 1.5, theta: 0, x: 0.15 }, lab: 'Gain on reassuring news', sym: 'λ' },
  anger: { t: 'Anger', s: 'Inflate certainty (κ > 1)', x: [1, 3, 0.05], preset: { mu0: 1, theta: 0, x: 1.8 }, lab: 'Certainty multiplier', sym: 'κ' },
  fab: { t: 'Fabrication', s: 'Bias the signals instead (b)', x: [0, 1.5, 0.05], preset: { mu0: 0, theta: 0, x: 0.6 }, lab: 'Bias added to every signal', sym: 'b' },
};
export const DEFAULTS = { kind: 'fear', mu0: 0, theta: 0, rho0: 1, rhoS: 1, x: 2.5, rhoE: 0, T: 20, c: 0, seed: 4, rho: 0.1, tau: 5, dT: 20, dE: 0, lg: 0.2, b: 5, peak: 1, def: 'd' };
