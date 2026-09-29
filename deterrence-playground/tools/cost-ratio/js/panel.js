// Cost Ratio Bargaining: side panel. Outcome, "What changed and why", the four propositions as checks, readout, sliders.
import { solve, regime, kappaIndex, cMax } from './model.js';
import { f2, f3, slider, sec, tex } from './ui.js';

const L10 = Math.log10;
const LOGK = { fmt: v => f2(10 ** v) };
export const SLIDERS = [
  { group: 'The dyad', items: [
    { key: 'p', label: 'W’s chance of winning a war', math: 'p', min: 0.05, max: 0.95, step: 0.01 },
    { key: 'C', label: 'Total cost of war, both sides', math: 'C', min: 0.02, max: 0.6, step: 0.01, help: 'Held fixed when κ moves. Kept at or below both p and 1 − p so the whole bargaining range stays inside [0, 1].' },
    { key: 'k', log: true, label: 'Cost-exchange ratio', math: 'κ = c<sub>S</sub>/c<sub>W</sub>', min: -1, max: 1, step: 0.005, help: 'Log scale from 0.1 to 10. Above 1, S pays more of the war’s cost than W.', ...LOGK },
  ] },
  { group: 'Proposition 4: strategic type', items: [
    { key: 'kD', log: true, label: 'κ when W fights a denial war', math: 'κ<sub>D</sub>', min: -1, max: 1, step: 0.005, ...LOGK },
    { key: 'kV', log: true, label: 'κ when W fights a survival war', math: 'κ<sub>V</sub>', min: -1, max: 1, step: 0.005, help: 'The paper supposes κ<sub>D</sub> &gt; 1 &gt; κ<sub>V</sub>.', ...LOGK },
  ] },
  { group: 'Section 5: the κ index', items: [
    { key: 'off', label: 'Offensive cost asymmetry', min: 0, max: 1, step: 0.01, help: 'Value of the target W destroys over the cost of what W expends. 0 = none; 1 = 100 to 1 or more.' },
    { key: 'def', label: 'Defensive cost burden', min: 0, max: 1, step: 0.01, help: 'S’s interceptor cost over W’s threat cost, per engagement. 1 = 100 to 1 or more.' },
    { key: 'exp', label: 'Target exposure, coded inversely', min: 0, max: 1, step: 0.01, help: 'High = W’s leadership and command nodes are hard to find and strike.' },
  ] },
];

const NAMES = { p: 'p', C: 'C', k: 'κ', kD: 'κ_D', kV: 'κ_V', off: 'offensive asymmetry', def: 'defensive burden', exp: 'target exposure' };

export function buildPanel(panel, P, onChange) {
  const st = sec(panel, 'Equilibrium');
  st.insertAdjacentHTML('beforeend', `<div class="status" id="cb-status" aria-live="polite"><b></b><span></span></div><p class="why" id="cb-why"></p>`);
  const ch = sec(panel, 'What changed and why', 'chg');
  ch.insertAdjacentHTML('beforeend', `<div class="chg-body" id="cb-chg" aria-live="polite"><p class="fine">Move a slider, drag a figure or load a case, and this box explains what the change did.</p></div>`);
  const pc = sec(panel, 'The paper’s propositions, checked at these values');
  pc.insertAdjacentHTML('beforeend', `<ul class="checks" id="cb-checks"></ul>`);
  const ro = sec(panel, 'Readout');
  ro.insertAdjacentHTML('beforeend', `<dl class="readout" id="cb-read"></dl>`);
  const sl = {};
  for (const grp of SLIDERS) {
    const s = sec(panel, grp.group);
    for (const it of grp.items) {
      const val = it.log ? L10(P[it.key]) : P[it.key];
      sl[it.key] = slider(s, it, val, v => onChange({ [it.key]: it.log ? +(10 ** v).toFixed(4) : v }));
    }
  }
  panel.lastElementChild.insertAdjacentHTML('beforeend', `<p class="fine">All values are abstract shares of a good worth 1 and are <span class="notional">notional</span>. The paper holds p and C fixed and moves κ; it does not estimate any of them for a real conflict.</p>
    <button type="button" class="btn" id="cb-reset">Reset to the default example</button>`);
  panel.querySelector('#cb-reset').addEventListener('click', () => onChange('reset'));

  function render() {
    sl.C.setMax(cMax(P.p));
    for (const it of SLIDERS.flatMap(g => g.items)) sl[it.key].set(it.log ? L10(P[it.key]) : P[it.key]);
    const s = solve(P), r = regime(P.k);
    const box = panel.querySelector('#cb-status');
    box.dataset.s = r.s;
    box.querySelector('b').textContent = `W gets ${f2(s.x)}, S keeps ${f2(s.sShare)}`;
    box.querySelector('span').textContent = `${r.label}. S offers x* = p − c_W and W accepts; no war.`;
    const rel = r.key === 'sym' ? 'exactly at' : r.key === 'W' ? `${f2(s.above)} above` : `${f2(-s.above)} below`;
    panel.querySelector('#cb-why').innerHTML = `S offers the smallest share W will take rather than fight, which is W’s war payoff p − c<sub>W</sub>. W pays c<sub>W</sub> = ${f2(s.cW)} of the total cost C = ${f2(P.C)}, so W settles for ${f2(s.x)}, ${rel} the symmetric-cost benchmark p − C/2 = ${f2(s.bench)}.`;
    checks(panel.querySelector('#cb-checks'), P, s);
    const K = kappaIndex(P);
    panel.querySelector('#cb-read').innerHTML = [
      ['c_W, W’s war cost', f3(s.cW)], ['c_S, S’s war cost', f3(s.cS)],
      ['W’s war payoff p − c_W', f3(s.warW)], ['S’s war payoff 1 − p − c_S', f3(s.warS)],
      ['Range [p − c_W, p + c_S]', `[${f2(s.lo)}, ${f2(s.hi)}]`], ['∂x*/∂κ here', f3(s.dx)],
      ['κ index (Section 5)', `${f2(K.v)}, ${K.regime === 'high' ? 'high-κ regime' : K.regime === 'low' ? 'low-κ regime' : 'on the line'}`],
    ].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
  }
  return { render, explain: (prev, how) => explain(panel.querySelector('#cb-chg'), prev, P, how) };
}

function checks(node, P, s) {
  const rows = [
    ['P1', true, 'Proposition 1 · Bargaining range', `\\mathcal B(\\kappa)=[${f2(s.lo)},\\,${f2(s.hi)}],\\quad |\\mathcal B|=${f3(s.width)}=C`, 'The width equals C whatever κ is.'],
    ['P2', true, 'Proposition 2 · Equilibrium concession', `x^*=p-\\tfrac{C}{1+\\kappa}=${f2(P.p)}-\\tfrac{${f2(P.C)}}{${f2(1 + P.k)}}=${f3(s.x)}`, 'W accepts; S keeps the whole surplus.'],
    ['P3', true, 'Proposition 3 · Comparative static in κ', `\\tfrac{\\partial x^*}{\\partial\\kappa}=\\tfrac{C}{(1+\\kappa)^2}=${f3(s.dx)}>0`,
      P.k > 1.0001 ? `κ &gt; 1, so W gets more than the benchmark p − C/2 = ${f2(s.bench)}.` : P.k < 0.9999 ? `κ &lt; 1, so W gets less than the benchmark p − C/2 = ${f2(s.bench)}.` : 'κ = 1: W gets exactly the benchmark p − C/2.'],
    ['P4', s.premise4, 'Proposition 4 · Scope-conditional cost ratio', `x^*_D-x^*_V=\\tfrac{C(\\kappa_D-\\kappa_V)}{(1+\\kappa_D)(1+\\kappa_V)}=${f3(s.gapFormula)}`,
      s.premise4 ? `The premise κ<sub>D</sub> &gt; 1 &gt; κ<sub>V</sub> holds, so W does better in the denial war.` :
        `The premise κ<sub>D</sub> &gt; 1 &gt; κ<sub>V</sub> does not hold at these values. x* still rises with κ, so the sign of the gap follows κ<sub>D</sub> − κ<sub>V</sub>.`],
  ];
  node.innerHTML = rows.map(([k, ok, tag, , note]) => `<li data-ok="${ok}"><span class="ck">${ok ? 'holds' : 'premise off'}</span><b>${tag}</b><div class="tx" data-k="${k}"></div><p class="fine">${note}</p></li>`).join('');
  rows.forEach(([k, , , src]) => tex(node.querySelector(`.tx[data-k="${k}"]`), src));
}

const MECH = {
  k: (a, b) => `Raising κ shifts war cost from W to S while C stays fixed. W’s cost fell by ${f2(a.cW - b.cW)}, so W’s war payoff rose by the same amount and S must offer that much more to keep the peace. The range slides toward W; its width stays C (Propositions 1 and 3).`,
  kDown: (a, b) => `Lowering κ shifts war cost from S to W while C stays fixed. W’s cost rose by ${f2(b.cW - a.cW)}, so W’s war payoff fell by the same amount and S can offer that much less. The range slides toward S; its width stays C (Propositions 1 and 3).`,
  p: () => 'A change in p moves W’s war payoff, both ends of the range and the offer one for one. It changes who would win the war; κ changes who pays for it.',
  C: (a, b, P) => `A costlier war widens the range by the added cost. W bears the share 1/(1 + κ) = ${f2(1 / (1 + P.k))} of it, so W’s offer moves by ${f2(b.x - a.x)} and S gains the same amount.`,
  kD: () => 'This changes κ in the denial war only. The gap in Proposition 4 grows as κ<sub>D</sub> and κ<sub>V</sub> move apart.',
  kV: () => 'This changes κ in the survival war only. The gap in Proposition 4 grows as κ<sub>D</sub> and κ<sub>V</sub> move apart.',
  idx: () => 'The index is the plain average of its three parts. The paper uses it to order conflict phases on κ, not to measure κ itself, so it does not move the bargaining figures.',
};

function explain(node, prev, P, how) {
  const a = solve(prev), b = solve(P);
  const moved = Object.keys(P).filter(k => Math.abs(P[k] - prev[k]) > 1e-9);
  if (!moved.length) return;
  let h = how ? `<p class="chg-what">${how}</p>` : `<p class="chg-what">${moved.slice(0, 3).map(k => `<b>${NAMES[k]}</b> ${f2(prev[k])} → ${f2(P[k])}`).join('; ')}</p>`;
  const d = [['x* (W’s share)', a.x, b.x], ['1 − x* (S’s share)', a.sShare, b.sShare], ['c_W', a.cW, b.cW], ['c_S', a.cS, b.cS], ['Range width', a.width, b.width], ['Denial − survival gap', a.gapDirect, b.gapDirect]]
    .filter(([, u, v]) => Math.abs(u - v) > 5e-4).map(([n, u, v]) => `<li>${n}: ${f2(u)} → ${f2(v)}</li>`);
  if (d.length) h += `<ul class="diffs">${d.join('')}</ul>`;
  if (regime(prev.k).key !== regime(P.k).key) h += `<p><b>Regime:</b> ${regime(prev.k).label} → <b>${regime(P.k).label}</b></p>`;
  const key = moved.length === 1 ? moved[0] : moved.includes('k') ? 'k' : null;
  let m = '';
  if (key === 'k') m = P.k > prev.k ? MECH.k(a, b) : MECH.kDown(a, b);
  else if (key && MECH[key]) m = MECH[key](a, b, P);
  else if (key && ['off', 'def', 'exp'].includes(key)) m = MECH.idx();
  if (m) h += `<p class="eff">${m}</p>`;
  node.innerHTML = h;
}
