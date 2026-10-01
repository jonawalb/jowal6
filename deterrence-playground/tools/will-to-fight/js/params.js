// Parameter registry: defaults, ranges, short URL keys, and link encoding. Pure, no DOM.
// Symbols follow Will_to_Fight_Theory_Memo, Section 2 (Table 1).

/** key: [short, min, max, step, default, group, label, symbol, help] */
export const SPEC = {
  theta0: ['t0', -2, 2, 0.05, 0, 'mu', 'Baseline attachment', 'θ₀', 'Identity and legitimacy: how much the average fighter values the state absent any news.'],
  ell: ['l', 0, 1, 0.01, 0.5, 'mu', 'Leadership commitment', 'ℓ', 'Public signal that leaders stay and fight (0 = flee or order retreat, 1 = visibly stay).'],
  pi: ['p', 0, 1, 0.01, 0.5, 'mu', 'Believed external support', 'π', 'What fighters believe about the reliability of outside help.'],
  r: ['r', -1, 2, 0.05, 0.25, 'mu', 'Rally effect', 'r', 'Change in commitment when the country is attacked. Can be negative.'],
  A: ['a', 0, 1, 1, 1, 'mu', 'Under attack', 'A', ''],
  alpha: ['al', 0.2, 20, 0.1, 3, 'info', 'Public precision', 'α', 'How sharp and common the public information is (1/variance of the prior).'],
  beta: ['be', 0.5, 40, 0.5, 8, 'info', 'Private precision', 'β', 'How much each fighter learns privately about the force (1/variance of the noise).'],
  b: ['b', 0, 3, 0.05, 1, 'pay', 'Complementarity', 'b', 'How much a fighter gains when others fight too.'],
  k: ['k', 0, 3, 0.05, 1.25, 'pay', 'Private cost of fighting', 'k', 'Risk, hardship and the outside option of not fighting.'],
  shock: ['z', -3, 3, 0.1, 0, 'pay', 'Realized shock', 'z', 'Realized θ = μ + z/√α: where the force really stands, in prior s.d.'],
  lamL: ['ll', 0, 2, 0.05, 0.5, 'adv', 'Weight on leadership', 'λℓ', ''],
  lamP: ['lp', 0, 2, 0.05, 0.5, 'adv', 'Weight on external support', 'λπ', ''],
  sExt: ['s', 0, 1, 0.01, 0.5, 'gov', 'Material external support', 'sₑₓₜ', 'Arms, money and intelligence actually flowing.'],
  F: ['f', 0, 3, 0.05, 1.5, 'gov', 'Adversary force advantage', 'F', ''],
  L: ['cl', 0, 4, 0.05, 1.5, 'gov', 'Cost of conceding', 'L', 'What the government loses by conceding now.'],
  v: ['v', 0, 3, 0.05, 1, 'gov2', 'Value of prevailing', 'v', ''],
  D: ['dd', 0, 5, 0.05, 2, 'gov2', 'Cost of defeat', 'D', ''],
  c: ['c', 0, 1, 0.01, 0.2, 'gov2', 'Per-period cost of war', 'c', ''],
  delta: ['de', 0, 0.99, 0.01, 0.9, 'gov2', 'Discount factor', 'δ', ''],
  rho: ['rh', 0, 0.95, 0.01, 0.8, 'gov2', 'Chance the war goes on', 'ρ', 'Per period; 1/(1−ρ) is the expected number of periods.'],
  a0: ['a0', -3, 3, 0.05, -1, 'gov2', 'Intercept', 'a₀', ''],
  aW: ['aw', 0.05, 6, 0.05, 3, 'gov2', 'Weight on cohesion', 'a_W', ''],
  aS: ['as', 0, 4, 0.05, 1.5, 'gov2', 'Weight on support', 'a_s', ''],
  aF: ['af', 0, 4, 0.05, 1, 'gov2', 'Weight on force gap', 'a_F', ''],
  kappa: ['ka', 0, 1, 0.05, 0, 'opp', 'Rally anticipated', 'κ', 'Share of the rally effect the adversary builds into its estimate.'],
  eta: ['et', -2, 2, 0.05, 0, 'opp', 'Other bias', 'η', 'Any other error in the adversary’s estimate of μ.'],
  wc: ['wc', 0.05, 0.95, 0.05, 0.5, 'opp', 'Collapse line', 'w_c', 'Cohesion below which the defence is said to collapse quickly.'],
  G: ['g', 0.1, 4, 0.05, 1, 'opp', 'Gain from quick victory', 'G', ''],
  K: ['kk', 0.1, 4, 0.05, 1, 'opp', 'Cost of a long war', 'K', ''],
};

export const DEFAULTS = Object.fromEntries(Object.entries(SPEC).map(([k, s]) => [k, s[4]]));
export const MODES = ['follow', 'high', 'low'];

const roundTo = (v, step) => { const n = Math.round(v / step) * step; return +n.toFixed(6); };

/** Clamp and snap one value to its slider grid. */
export function clean(key, v) {
  const s = SPEC[key];
  if (!s || !Number.isFinite(v)) return s ? s[4] : v;
  return roundTo(Math.min(s[2], Math.max(s[1], v)), s[3]);
}

/** Encode a full state as a URL hash string (every parameter, the selection mode and the case). */
export function encode(state) {
  const q = new URLSearchParams();
  for (const [k, s] of Object.entries(SPEC)) q.set(s[0], String(state.p[k]));
  q.set('sel', state.mode);
  if (state.caseId) q.set('case', state.caseId);
  return q.toString();
}

/** Decode a hash string; unknown or bad values fall back to defaults. */
export function decode(hash) {
  const q = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const p = { ...DEFAULTS };
  for (const [k, s] of Object.entries(SPEC)) if (q.has(s[0])) p[k] = clean(k, Number(q.get(s[0])));
  const mode = MODES.includes(q.get('sel')) ? q.get('sel') : 'follow';
  return { p, mode, caseId: q.get('case') || '' };
}
