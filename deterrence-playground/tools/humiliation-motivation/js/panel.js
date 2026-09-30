// Humiliation to Motivation: side panel. Equilibrium, "What changed and why", propositions as checks, readout, sliders.
import { KINDS, alpha, warH, pStar, pBar, sBar, sUnder, NL, info, entropy, lemma } from './model.js';
import { f2, f3, slider, sec, tex } from './ui.js';

export const SLIDERS = [
  { group: 'The humiliation', items: [
    { key: 's', label: 'Severity of the humiliation', math: 's', min: 0, max: 1, step: 0.005 },
    { key: 'lam', label: 'Perceived legitimacy of the status order', math: 'λ', min: 0, max: 0.95, step: 0.005 },
    { key: 'a0', label: 'Audience sensitivity', math: 'α<sub>0</sub>', min: 0.2, max: 5, step: 0.05, help: 'Scales the domestic cost of accommodating: α = α<sub>0</sub> s (1 − λ).' },
  ] },
  { group: 'The humiliated state H', items: [
    { key: 'pi', label: 'Prior that H is the capable type', math: 'π', min: 0.02, max: 0.98, step: 0.01 },
    { key: 'pH', label: 'Capable type’s chance of prevailing', math: 'p<sub>H</sub>', min: 0.05, max: 0.99, step: 0.01 },
    { key: 'pL', label: 'Weak type’s chance of prevailing', math: 'p<sub>L</sub>', min: 0.01, max: 0.95, step: 0.01, help: 'Kept below p<sub>H</sub>, and low enough that the weak type expects to lose from a challenge D resists.' },
    { key: 'v', label: 'Value of restored status', math: 'v', min: 0.2, max: 3, step: 0.05 },
    { key: 'l', label: 'Cost of losing', math: 'ℓ', min: 0.1, max: 3, step: 0.05 },
    { key: 'k', label: 'Cost of mounting a challenge', math: 'k', min: 0.02, max: 1.5, step: 0.01 },
  ] },
  { group: 'The dominant power D', items: [
    { key: 'w', label: 'D’s value of winning', math: 'w', min: 0.1, max: 3, step: 0.05 },
    { key: 'd', label: 'D’s cost of conceding', math: 'd', min: 0.1, max: 3, step: 0.05 },
    { key: 'kD', label: 'D’s cost of resisting', math: 'k<sub>D</sub>', min: 0.02, max: 2, step: 0.01 },
  ] },
];
const LABEL = Object.fromEntries(SLIDERS.flatMap(g => g.items).map(i => [i.key, i.math.replace(/<[^>]+>/g, '')]));

export function buildPanel(panel, P, onChange, onPick) {
  const st = sec(panel, 'Equilibrium');
  st.insertAdjacentHTML('beforeend', `<div class="status" id="hm-status" aria-live="polite"><b></b><span></span></div><p class="why" id="hm-why"></p><div id="hm-eqs" class="eqs"></div>`);
  const ch = sec(panel, 'What changed and why', 'chg');
  ch.insertAdjacentHTML('beforeend', `<div class="chg-body" id="hm-chg" aria-live="polite"><p class="fine">Move a slider, drag on the map or load a case, and this box explains what the change did.</p></div>`);
  const pc = sec(panel, 'The paper’s propositions, checked at these values');
  pc.insertAdjacentHTML('beforeend', `<ul class="checks" id="hm-checks"></ul>`);
  const ro = sec(panel, 'Readout');
  ro.insertAdjacentHTML('beforeend', `<dl class="readout" id="hm-read"></dl>`);
  const sl = {};
  for (const grp of SLIDERS) {
    const s = sec(panel, grp.group);
    for (const it of grp.items) sl[it.key] = slider(s, it, P[it.key], v => onChange({ [it.key]: v }, null, it.key));
  }
  panel.lastElementChild.insertAdjacentHTML('beforeend', `<p class="fine">Payoffs are abstract utilities from the paper’s model. Every value is <span class="notional">notional</span>: the paper does not estimate them for any state.</p>
    <button type="button" class="btn" id="hm-reset">Reset to the default example</button>`);
  panel.querySelector('#hm-reset').addEventListener('click', () => onChange('reset'));

  function render(all, idx) {
    for (const key of Object.keys(sl)) sl[key].set(P[key]);
    const eq = all[idx], kind = eq ? eq.kind : 'none', K = KINDS[kind];
    const box = panel.querySelector('#hm-status');
    box.dataset.s = K.s;
    box.querySelector('b').textContent = K.label + (K.prop ? ` (${K.prop})` : '');
    box.querySelector('span').textContent = K.short;
    panel.querySelector('#hm-why').innerHTML = why(P, kind);
    const eqs = panel.querySelector('#hm-eqs');
    eqs.innerHTML = all.length > 1 ? `<p class="fine">${all.length} pure-strategy equilibria exist here. Show:</p>` + all.map((e, i) =>
      `<button type="button" class="btn sm" data-i="${i}" aria-pressed="${i === idx}">${KINDS[e.kind].label}</button>`).join('') : '';
    eqs.querySelectorAll('button').forEach(b => b.addEventListener('click', () => onPick(+b.dataset.i)));
    checks(panel.querySelector('#hm-checks'), P);
    const iv = info(P, kind);
    panel.querySelector('#hm-read').innerHTML = [
      ['α(s, λ), cost of accommodating', f3(alpha(P))],
      ['Capable type’s resisted-challenge payoff', f3(warH(P, P.pH))],
      ['Weak type’s resisted-challenge payoff', f3(warH(P, P.pL))],
      ['s̲, accommodation ends', f3(sUnder(P))], ['s̄, status trap begins', f3(sBar(P))],
      ['p*, D’s resistance threshold', f3(pStar(P))], ['p̄(π), prior-weighted win chance', f3(pBar(P, P.pi))],
      ['Information in a challenge', iv === null ? '–' : `${f2(iv)} bits`],
    ].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
  }
  return { render, explain: (prev, prevKind, kind, how, key) => explain(panel.querySelector('#hm-chg'), prev, P, prevKind, kind, how, key) };
}

function why(P, kind) {
  const a = alpha(P);
  if (kind === 'sep') return `The domestic cost of accommodating, α = ${f2(a)}, is larger than what a resisted challenge costs the capable type (${f2(-warH(P, P.pH))}) but smaller than what it costs the weak type (${f2(-warH(P, P.pL))}). Only the capable type challenges, so a challenge tells D exactly who it faces. D still resists because p<sub>H</sub> = ${f2(P.pH)} ≤ p* = ${f2(pStar(P))}.`;
  if (kind === 'trap') return `Severity s = ${f2(P.s)} is past the threshold s̄ = ${f2(sBar(P))}. Accommodating costs α = ${f2(a)}, more than even the weak type loses in a resisted challenge (${f2(-warH(P, P.pL))}), so both types challenge. D sees a mixed pool and resists, since p̄(π) = ${f2(pBar(P, P.pi))} ≤ p* = ${f2(pStar(P))}.`;
  if (kind === 'poolK') return `D’s expected odds against the full population, p̄(π) = ${f2(pBar(P, P.pi))}, exceed its resistance threshold p* = ${f2(pStar(P))}. D concedes to any challenge, so both types challenge at any severity. The paper sets this case aside in a footnote to Proposition 2.`;
  if (kind === 'acc') return `Severity s = ${f2(P.s)} is below s̲ = ${f2(sUnder(P))}. Accommodating costs only α = ${f2(a)}, less than even the capable type loses in a resisted challenge (${f2(-warH(P, P.pH))}), so both types accept the diminished status. An unexpected challenge would be met with resistance.`;
  return `None of the paper’s three equilibria holds here. D would concede to the capable type (p<sub>H</sub> = ${f2(P.pH)} &gt; p* = ${f2(pStar(P))}) but resists the pool, so neither separation nor pooling is stable in pure strategies. The paper does not characterize this case, and the tool does not compute mixed strategies.`;
}

function checks(node, P) {
  const a = alpha(P), ps = pStar(P), pb = pBar(P, P.pi), sb = sBar(P), su = sUnder(P), wL = warH(P, P.pL), wH = warH(P, P.pH), L = lemma(P);
  const p1 = wL + a < 0 && 0 < wH + a && P.pH <= ps, p2 = P.s > sb && pb <= ps, p3 = P.s < su && P.pL <= ps;
  const rows = [
    ['P1', p1, 'Proposition 1 · Separating equilibrium', `${f2(wL + a)}<0<${f2(wH + a)},\\quad p_H=${f2(P.pH)}\\le p^*=${f2(ps)}`,
      'Weak type’s challenge payoff plus α below zero, capable type’s above it, and D resists a known capable type.'],
    ['P2', p2, 'Proposition 2 · Status trap', `s=${f2(P.s)}>\\bar s=\\tfrac{k+(1-p_L)\\ell-p_Lv}{\\alpha_0(1-\\lambda)}=${f2(sb)},\\quad \\bar p(\\pi)=${f2(pb)}\\le p^*`,
      'Past s̄ both types challenge and D resists the pool.'],
    ['P3', p3, 'Proposition 3 · Accommodation', `s=${f2(P.s)}<\\underline s=\\tfrac{k+(1-p_H)\\ell-p_Hv}{\\alpha_0(1-\\lambda)}=${f2(su)},\\quad p_L=${f2(P.pL)}\\le p^*`,
      'Below s̲ both types accommodate; a belief that makes D resist an unexpected challenge exists when p<sub>L</sub> ≤ p*.'],
    ['L1', true, 'Lemma 1 · How s̄ moves', `\\tfrac{\\partial\\bar s}{\\partial k}=${f2(L.k)},\\ \\tfrac{\\partial\\bar s}{\\partial\\ell}=${f2(L.l)},\\ \\tfrac{\\partial\\bar s}{\\partial v}=${f2(L.v)},\\ \\tfrac{\\partial\\bar s}{\\partial p_L}=${f2(L.pL)},\\ \\tfrac{\\partial\\bar s}{\\partial\\lambda}=${f2(L.lam)}`,
      'Signs as the lemma states: up with k, ℓ and λ; down with v and p<sub>L</sub>.'],
    ['P4', true, 'Proposition 4 · Legitimacy moderation', `\\bar s\\big|_{\\lambda=0}=\\tfrac{${f2(NL(P))}}{\\alpha_0}=${f2(NL(P) / P.a0)},\\quad \\bar s\\big|_{\\lambda=${f2(P.lam)}}=${f2(sb)},\\quad \\bar s\\to\\infty\\ \\text{as}\\ \\lambda\\to1`,
      'A more legitimate order needs a more severe humiliation to spring the trap.'],
    ['P5', true, 'Proposition 5 · Non-monotonic information', `I(s)=${info(P) === null ? '\\text{undefined here}' : f2(info(P))}\\ \\text{bits};\\quad H(\\pi)=${f2(entropy(P))}`,
      'Zero below s̲, H(π) between s̲ and s̄, zero again above s̄.'],
  ];
  node.innerHTML = rows.map(([k, ok, tag, , note]) => `<li data-ok="${ok}"><span class="ck">${k.startsWith('P') && k <= 'P3' ? (ok ? 'holds' : 'not here') : 'value'}</span><b>${tag}</b><div class="tx" data-k="${k}"></div><p class="fine">${note}</p></li>`).join('');
  rows.forEach(([k, , , src]) => tex(node.querySelector(`.tx[data-k="${k}"]`), src));
}

const MECH = {
  s: up => `${up ? 'Higher' : 'Lower'} severity ${up ? 'raises' : 'lowers'} the domestic cost of accommodating, α = α<sub>0</sub>s(1 − λ). The thresholds s̲ and s̄ stay put; the state moves across them.`,
  lam: up => `Legitimacy ${up ? 'lowers' : 'raises'} the cost of accommodating and ${up ? 'raises' : 'lowers'} both thresholds (Lemma 1, item 5, and Proposition 4). ${up ? 'A citizenry that sees the order as fair tolerates backing down.' : 'An order seen as a diktat makes backing down costly.'}`,
  a0: up => `Audience sensitivity scales the cost of accommodating. ${up ? 'Raising' : 'Lowering'} it ${up ? 'lowers' : 'raises'} both thresholds, the channel the paper uses for Russia under Putin.`,
  k: () => 'The cost of challenging lowers both types’ challenge payoffs, so s̄ and s̲ rise (Lemma 1, item 1).',
  l: () => 'The cost of losing lowers both types’ challenge payoffs, more for the weak type, so s̄ rises (Lemma 1, item 2).',
  v: () => 'The value of restored status raises both types’ challenge payoffs, so s̄ falls (Lemma 1, item 3).',
  pL: () => 'A stronger weak type does better in a fight, so the trap is easier to spring: s̄ falls (Lemma 1, item 4).',
  pH: () => 'p<sub>H</sub> sets s̲ and whether D would resist a known capable challenger (p<sub>H</sub> ≤ p*).',
  pi: () => 'The prior sets D’s odds against a mixed pool, p̄(π), and the information a separating challenge carries, H(π).',
  w: () => 'D’s stakes set its resistance threshold p* = 1 − k<sub>D</sub>/(w + d). A higher threshold means D resists more often.',
  d: () => 'D’s cost of conceding enters p* = 1 − k<sub>D</sub>/(w + d); a larger d makes resistance more attractive.',
  kD: () => 'D’s cost of resisting lowers p* = 1 − k<sub>D</sub>/(w + d), so D concedes more often.',
};

function explain(node, prev, P, prevKind, kind, how, key) {
  const moved = Object.keys(P).filter(k => Math.abs(P[k] - prev[k]) > 1e-9);
  if (!moved.length && prevKind === kind) return;
  let h = how ? `<p class="chg-what">${how}</p>` : `<p class="chg-what">${moved.slice(0, 3).map(k => `<b>${LABEL[k]}</b> ${f2(prev[k])} → ${f2(P[k])}`).join('; ')}</p>`;
  if (prevKind !== kind) h += `<p><b>Equilibrium:</b> ${KINDS[prevKind].label} → <b>${KINDS[kind].label}</b></p>`;
  const d = [['α', alpha(prev), alpha(P)], ['s̲', sUnder(prev), sUnder(P)], ['s̄', sBar(prev), sBar(P)], ['p*', pStar(prev), pStar(P)], ['p̄(π)', pBar(prev, prev.pi), pBar(P, P.pi)]]
    .filter(([, u, v]) => Math.abs(u - v) > 5e-4).map(([n, u, v]) => `<li>${n}: ${f2(u)} → ${f2(v)}</li>`);
  if (d.length) h += `<ul class="diffs">${d.join('')}</ul>`;
  const k = key || (moved.length === 1 ? moved[0] : null);
  if (k && MECH[k]) h += `<p class="eff">${MECH[k](P[k] > prev[k])}</p>`;
  else if (moved.length === 2 && moved.includes('s') && moved.includes('lam')) h += `<p class="eff">Moving on the map changes severity and legitimacy together. The state is now ${P.s > sBar(P) ? 'past s̄' : P.s < sUnder(P) ? 'below s̲' : 'between s̲ and s̄'}.</p>`;
  node.innerHTML = h;
}

